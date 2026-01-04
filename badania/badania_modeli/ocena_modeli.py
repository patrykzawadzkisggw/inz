import glob
import json
import os
import time
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import requests

# --- KONFIGURACJA ---
CSV_PATTERN = "dane_do_*.csv"
PLIK_RZECZYWISTY = "dane.csv"
KOLUMNA_DATY = "Data"
KOLUMNA_WARTOSCI = "Zamkniecie"
KOLUMNA_PREDYKCJI = "median"
OKNO_PROGNOZY = 12
REQUEST_TIMEOUT = 60

MODEL_ENDPOINTS = {
	"chronos": os.environ.get("URL_CHRONOS", "http://127.0.0.1:8080/predict"),
	"moirai": os.environ.get("URL_MOIRAI", "http://127.0.0.1:8081/predict"),
	"timesfm": os.environ.get("URL_TIMESFM", "http://127.0.0.1:8082/predict"),
}


def build_payload(csv_content: str) -> Dict:
	return {
		"csv_content": csv_content,
		"context": KOLUMNA_WARTOSCI,
		"date_column": KOLUMNA_DATY,
		"prediction_length": OKNO_PROGNOZY,
		"frequency": "B",
		"missing_strategy": "interpolate",
		"holiday_country": "PL",
		"holiday_treatment": "none",
	}


def send_request(url: str, file_path: str) -> Tuple[Dict, List[Dict]]:
	try:
		with open(file_path, "r", encoding="utf-8") as f:
			csv_content = f.read()
	except Exception as exc:
		return {
			"ok": False,
			"elapsed": None,
			"status": None,
			"error": f"Błąd odczytu pliku: {exc}",
		}, []

	payload = build_payload(csv_content)
	start = time.perf_counter()
	try:
		response = requests.post(url, json=payload, timeout=REQUEST_TIMEOUT)
		elapsed = time.perf_counter() - start
		if response.status_code != 200:
			try:
				details = json.dumps(response.json(), ensure_ascii=False)
			except Exception:
				details = response.text
			return {
				"ok": False,
				"elapsed": elapsed,
				"status": response.status_code,
				"error": f"Błąd serwera: {details}",
			}, []

		wynik = response.json()
		predictions = wynik.get("predictions", [])
		if not predictions:
			return {
				"ok": False,
				"elapsed": elapsed,
				"status": response.status_code,
				"error": "Pusta lista prognoz",
			}, []

		return {
			"ok": True,
			"elapsed": elapsed,
			"status": response.status_code,
			"error": None,
		}, predictions
	except requests.exceptions.RequestException as exc:
		elapsed = time.perf_counter() - start
		return {
			"ok": False,
			"elapsed": elapsed,
			"status": None,
			"error": f"Błąd połączenia: {exc}",
		}, []


def ensure_dirs(model_names: List[str]) -> None:
	for name in model_names:
		os.makedirs(name, exist_ok=True)


def save_predictions(model: str, src_file: str, predictions: List[Dict]) -> str:
	base = os.path.basename(src_file)
	if base.lower().startswith("dane_do_"):
		out_name = base[len("dane_do_") :]
	else:
		out_name = base
	out_path = os.path.join(model, out_name)
	df_pred = pd.DataFrame(predictions)
	df_pred.to_csv(out_path, index=False)
	return out_path


def formatuj_raport_modelu(model: str, results: List[Dict]) -> List[str]:
	lines: List[str] = [f"{model}:"]
	for r in results:
		fname = os.path.basename(r["file"])
		status_info = f"OK ({r['elapsed']:.3f} s)" if r["ok"] else "BŁĄD"
		lines.append(f"Testuję {fname}...")
		lines.append(f"  wynik: {status_info}")
		if r["error"]:
			lines.append(f"  szczegóły: {r['error']}")
	successes = [r for r in results if r["ok"] and r["elapsed"] is not None]
	if successes:
		avg_time = sum(r["elapsed"] for r in successes) / len(successes)
		lines.append("")
		lines.append(f"Średni czas odpowiedzi (tylko udane zapytania): {avg_time:.3f} s")
	else:
		lines.append("")
		lines.append("Brak udanych zapytań – nie można policzyć średniej.")
	return lines + ["", ""]


def oblicz_mape(y_true: pd.Series, y_pred: pd.Series) -> float:
	y_true, y_pred = np.array(y_true), np.array(y_pred)
	mask = y_true != 0
	if not mask.any():
		return float("nan")
	return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def wczytaj_rzeczywiste(sciezka: str) -> pd.Series:
	if not os.path.exists(sciezka):
		raise FileNotFoundError(f"BŁĄD: Brak pliku {sciezka}")
	df = pd.read_csv(sciezka)
	df.columns = [c.strip() for c in df.columns]
	df[KOLUMNA_DATY] = pd.to_datetime(df[KOLUMNA_DATY])
	return df.set_index(KOLUMNA_DATY)[KOLUMNA_WARTOSCI]


def ocen_jakosc() -> None:
	real_series = wczytaj_rzeczywiste(PLIK_RZECZYWISTY)
	wyniki = []
	for model_name in MODEL_ENDPOINTS.keys():
		pliki_csv = glob.glob(os.path.join(model_name, "*.csv"))
		if not pliki_csv:
			print(f"[INFO] Brak plików w folderze {model_name}")
			continue

		for sciezka_pliku in pliki_csv:
			nazwa_pliku = os.path.basename(sciezka_pliku)
			try:
				df_pred = pd.read_csv(sciezka_pliku)
			except Exception:
				continue

			if "date" in df_pred.columns:
				df_pred["date"] = pd.to_datetime(df_pred["date"]).dt.normalize()
			else:
				print(f"Brak kolumny 'date' w {sciezka_pliku}")
				continue

			merged = pd.merge(
				df_pred[["date", KOLUMNA_PREDYKCJI]],
				real_series,
				left_on="date",
				right_index=True,
				how="inner",
			)

			if merged.empty:
				print(f"[WARN] Brak pokrywających się dat dla {model_name}/{nazwa_pliku}")
				continue

			mape_total = oblicz_mape(
				merged[KOLUMNA_WARTOSCI], merged[KOLUMNA_PREDYKCJI]
			)
			short_term = merged.head(4)
			mape_short = oblicz_mape(
				short_term[KOLUMNA_WARTOSCI], short_term[KOLUMNA_PREDYKCJI]
			)
			if len(merged) >= 9:
				long_term = merged.iloc[8:12]
				mape_long = oblicz_mape(
					long_term[KOLUMNA_WARTOSCI], long_term[KOLUMNA_PREDYKCJI]
				)
			else:
				mape_long = float("nan")

			wyniki.append(
				{
					"Model": model_name,
					"Plik_Baza": nazwa_pliku,
					"MAPE_Caly": mape_total,
					"MAPE_Krotki": mape_short,
					"MAPE_Dlugi": mape_long,
					"Liczba_Dni": len(merged),
				}
			)

	if not wyniki:
		print("Nie udało się obliczyć żadnych wyników.")
		return

	df_wyniki = pd.DataFrame(wyniki)

	print("=" * 80)
	print("RAPORT JAKOŚCI MODELI (MAPE, im mniej tym lepiej)")
	print("=" * 80)

	ranking_ogolny = df_wyniki.groupby("Model")[
		["MAPE_Caly", "MAPE_Krotki", "MAPE_Dlugi"]
	].mean()
	print(
		"\n--- 1. ŚREDNIA DOKŁADNOŚĆ MODELI (Całość / Krótki termin / Długi termin) ---"
	)
	print(ranking_ogolny.sort_values("MAPE_Caly").round(2).to_string())

	best_short = ranking_ogolny["MAPE_Krotki"].idxmin()
	best_long = ranking_ogolny["MAPE_Dlugi"].idxmin()
	print(f"\n>> WNIOSEK: Najlepszy na krótki termin (1-4 dni): {best_short.upper()}")
	print(f">> WNIOSEK: Najlepszy na długi termin (9-12 dni): {best_long.upper()}")

	print("\n--- 2. NAJLEPSZY MODEL DLA DANEJ DATY (PLIKU) ---")
	for plik in sorted(df_wyniki["Plik_Baza"].unique()):
		subset = df_wyniki[df_wyniki["Plik_Baza"] == plik]
		best_row = subset.loc[subset["MAPE_Caly"].idxmin()]
		print(
			f"Plik {plik}: WYGRYWA -> {best_row['Model'].upper()} "
			f"(Błąd: {best_row['MAPE_Caly']:.2f}%)"
		)
		reszta = subset[subset["Model"] != best_row["Model"]]
		reszta_txt = ", ".join(
			[f"{r['Model']} ({r['MAPE_Caly']:.2f}%)" for _, r in reszta.iterrows()]
		)
		if reszta_txt:
			print(f"    (Pozostałe: {reszta_txt})")

	print("\n--- 3. SZCZEGÓŁOWA TABELA WYNIKÓW ---")
	print(df_wyniki.sort_values(["Plik_Baza", "MAPE_Caly"]).round(2).to_string(index=False))


def main() -> None:
	model_names = list(MODEL_ENDPOINTS.keys())
	ensure_dirs(model_names)
	csv_files = sorted(glob.glob(CSV_PATTERN))
	if not csv_files:
		print(f"Nie znaleziono plików pasujących do wzorca {CSV_PATTERN}.")
		return

	raport_lines: List[str] = []

	for model, url in MODEL_ENDPOINTS.items():
		print(f"\n=== Model: {model} ({url}) ===")
		model_results: List[Dict] = []
		for file_path in csv_files:
			result, preds = send_request(url, file_path)
			model_results.append({**result, "file": file_path})
			status_info = (
				f"OK ({result['elapsed']:.3f} s)" if result["ok"] else "BŁĄD"
			)
			print(f"Testuję {os.path.basename(file_path)}... {status_info}")
			if result["ok"] and preds:
				out_path = save_predictions(model, file_path, preds)
				print(f"  zapisano: {out_path}")
			if result["error"]:
				print(f"  szczegóły: {result['error']}")

		raport_lines.extend(formatuj_raport_modelu(model, model_results))

	with open("wyniki", "w", encoding="utf-8") as f:
		f.write("\n".join(raport_lines).rstrip() + "\n")

	print("\nZapisywanie raportu wydajności do pliku 'wyniki' zakończone.")

	print("\nObliczam metryki jakości (MAPE)...")
	ocen_jakosc()


if __name__ == "__main__":
	main()
