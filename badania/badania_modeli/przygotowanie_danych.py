"""Analiza scenariuszy i generacja plików dane_do_*.csv na podstawie wyników."""

import os
from typing import Dict, List, Tuple

import pandas as pd

PLIK_DANYCH = "dane.csv"
DATA_GRANICZNA = pd.Timestamp("2025-12-12")
OKNO_DNI = 12


def pokaz_tabele_weryfikacyjna(df_slice: pd.DataFrame, tytul: str) -> None:
	print(f"\n>>> WERYFIKACJA DLA: {tytul}")
	print("    Oto 12 dni, na podstawie których dokonano wyboru:")
	print("-" * 65)
	print(df_slice[["Data", "Otwarcie", "Zamkniecie", "Wolumen"]].to_string(index=False))
	print("-" * 65)

	ceny = df_slice["Zamkniecie"].values
	zmiana = ((ceny[-1] - ceny[0]) / ceny[0]) * 100
	odchylenie = df_slice["Zamkniecie"].std()

	print(f"     Cena start (dzień 1): {ceny[0]:.4f}")
	print(f"     Cena koniec (dzień 12): {ceny[-1]:.4f}")
	print(f"     Zmiana w tym oknie: {zmiana:.2f}%")
	print(f"     Odchylenie standardowe: {odchylenie:.4f}\n")


def wczytaj_dane() -> pd.DataFrame:
	try:
		df = pd.read_csv(PLIK_DANYCH)
	except FileNotFoundError:
		raise FileNotFoundError(f"BŁĄD: Brak pliku {PLIK_DANYCH}.")

	df.columns = [c.strip() for c in df.columns]

	try:
		df["Data"] = pd.to_datetime(df["Data"])
	except Exception as exc:
		raise ValueError(f"BŁĄD: Problem z formatem daty w pliku CSV. {exc}")

	return df.sort_values("Data").reset_index(drop=True)


def policz_wskazniki(df: pd.DataFrame) -> pd.DataFrame:
	kandydaci: List[Dict] = []

	for i in range(len(df)):
		data_bazowa = df.loc[i, "Data"]

		if data_bazowa.year != 2025:
			continue
		if data_bazowa > DATA_GRANICZNA:
			continue
		if i + OKNO_DNI >= len(df):
			continue

		okno = df.iloc[i + 1 : i + 1 + OKNO_DNI]
		ceny = okno["Zamkniecie"].values

		start_price = ceny[0]
		end_price = ceny[-1]
		zwrot = (end_price - start_price) / start_price
		odchylenie = okno["Zamkniecie"].std()

		kandydaci.append(
			{
				"Indeks_Bazowy": i,
				"Data_Wskazania": data_bazowa,
				"Zwrot": zwrot,
				"Odchylenie": odchylenie,
			}
		)

	return pd.DataFrame(kandydaci)


def wybierz_scenariusze(df_wyniki: pd.DataFrame) -> List[Tuple[pd.Series, str]]:
	if df_wyniki.empty:
		raise ValueError(
			"BŁĄD: Nie znaleziono w pliku danych z 2025 roku (do 12 grudnia). "
			"Upewnij się, że dane.csv zawiera poprawne daty z roku 2025."
		)

	wzrost = df_wyniki.loc[df_wyniki["Zwrot"].idxmax()]
	spadek = df_wyniki.loc[df_wyniki["Zwrot"].idxmin()]
	stabilna = df_wyniki.loc[df_wyniki["Odchylenie"].idxmin()]
	chaotyczna = df_wyniki.loc[df_wyniki["Odchylenie"].idxmax()]

	return [
		(wzrost, "SYTUACJA WZROSTOWA (Max zysk w 12 dni)"),
		(spadek, "SYTUACJA SPADKOWA (Max strata w 12 dni)"),
		(stabilna, "SYTUACJA STABILNA (Min odchylenie std)"),
		(chaotyczna, "SYTUACJA CHAOTYCZNA (Max odchylenie std)"),
	]


def generuj_pliki(df: pd.DataFrame, daty: List[pd.Timestamp]) -> None:
	for data_ts in daty:
		limit = pd.Timestamp(data_ts)
		subset = df[df["Data"] <= limit]

		if subset.empty:
			print(f"[OSTRZEŻENIE] Brak danych starszych niż {limit.date()}. Plik pominięty.")
			continue

		nazwa_pliku = f"dane_do_{limit.date()}.csv"
		subset.to_csv(nazwa_pliku, index=False)

		ostatnia_data = subset.iloc[-1]["Data"].strftime("%Y-%m-%d")
		liczba_wierszy = len(subset)

		print(f"Utworzono plik: {nazwa_pliku}")
		print(f"   -> Zakres: od początku do {ostatnia_data}")
		print(f"   -> Liczba wierszy: {liczba_wierszy}")
		print("-" * 50)


def main() -> None:
	df = wczytaj_dane()

	print(f"Rozpoczynam analizę pliku {PLIK_DANYCH}...")
	df_wyniki = policz_wskazniki(df)
	scenariusze = wybierz_scenariusze(df_wyniki)

	print(f"Przeanalizowano {len(df_wyniki)} potencjalnych dat z roku 2025.")

	daty_graniczne: List[pd.Timestamp] = []
	for wynik, nazwa in scenariusze:
		idx = wynik["Indeks_Bazowy"]
		okno_weryfikacyjne = df.iloc[idx + 1 : idx + 1 + OKNO_DNI].copy()
		okno_weryfikacyjne["Data"] = okno_weryfikacyjne["Data"].dt.strftime("%Y-%m-%d")

		print("\n" + "=" * 80)
		print(f"DATA WSKAZANIA PRZEZ PROGRAM: {wynik['Data_Wskazania'].strftime('%Y-%m-%d')}")
		print(f"SCENARIUSZ: {nazwa}")
		print("=" * 80)

		pokaz_tabele_weryfikacyjna(okno_weryfikacyjne, nazwa)
		daty_graniczne.append(wynik["Data_Wskazania"])

	seen = set()
	daty_unikalne = []
	for d in daty_graniczne:
		if d not in seen:
			seen.add(d)
			daty_unikalne.append(d)

	print("\nGeneruję pliki dane_do_*.csv na podstawie dat wytypowanych w analizie...")
	generuj_pliki(df, daty_unikalne)
	print("Gotowe.")


if __name__ == "__main__":
	try:
		main()
	except Exception as exc:
		print(exc)
