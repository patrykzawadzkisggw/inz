## Przegląd repozytorium
- backend/ — FastAPI + logika harmonogramów, raportów i transpiler (testy w backend/tests/; uruchomienie: `uvicorn api:app --host 0.0.0.0 --port 8000` po `pip install -r requirements.txt`).
- frontend/ — Next.js + Prisma (testy w frontend/tests/; uruchomienie: `npm install --legacy-peer-deps && npm run dev`).
- chronos/, morai/, timesfm/ — serwisy modeli (FastAPI). Uruchomienie: `pip install -r requirements.txt && uvicorn api:app --host 0.0.0.0 --port 8000`. Testy w `*/tests/` każdego serwisu.
- docker/ — pliki Compose + env template do szybkiego startu całego stosu.
- docker-compose (skrócony start) — patrz niżej w sekcji „Szybki start (Docker)”.

## Szybki start (Docker)
1) Skopiuj szablony env: `docker/*.pst -> docker/*.env`, `backend/.env.pst -> backend/.env`, `frontend/.env.pst -> frontend/.env` i uzupełnij wartości w `<>`.
2) Zbuduj i uruchom całość: `cd docker && docker compose up --build`.
3) Dostępy: frontend http://localhost:3000, backend http://localhost:8000, MariaDB na porcie 3306 (jeśli nie nadpisano `DB_PORT`).

### Skąd wziąć klucze Clerk
- Załóż projekt w Clerk (https://clerk.com), w sekcji **API Keys** skopiuj `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (public) i `CLERK_SECRET_KEY` (secret) i wstaw w pliki `.env` w miejsce placeholderów `<>`.

### Skąd wziąć dane SMTP
- Od dostawcy SMTP (MailerSend/Mailgun/SendGrid/SES itp.): w panelu pobierz host, port, login i hasło (często klucz API jako hasło) i wypełnij pola SMTP w plikach `.env`.

## Backend (backend/)
- Wymagania: Python 3.11+, `pip install -r requirements.txt`.
- Uruchomienie dev: `uvicorn api:app --host 0.0.0.0 --port 8000`.
- Testy: `pytest` w katalogu backend/ (testy w backend/tests/).
- Coverage: `py -m pytest --cov=.`

## Frontend (frontend/)
- Wymagania: Node.js 20+, npm. Instalacja: `npm install --legacy-peer-deps`.
- Dev: `npm run dev` (domyślnie port 3000).
- Build/start produkcyjny: `npm run build && npm start`.
- Testy: `npm test` (Jest) w frontend/ (testy w frontend/tests/).
- Coverage: `npx jest --coverage --coverageReporters="text-summary"`

## Lokalne uruchomienie (bez Dockera)
Poniżej szybkie kroki, żeby uruchomić wszystko lokalnie bez użycia Dockera.

- Utwórz i aktywuj wirtualne środowisko Pythona (Windows):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # PowerShell
# lub: .\.venv\Scripts\activate.bat  # cmd.exe
```

- Lub (Linux / macOS):

```bash
python3 -m venv .venv
source .venv/bin/activate
```

- Zainstaluj zależności backendu i uruchom serwer:

```bash
cd backend
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000
```

- W osobnym terminalu uruchom frontend:

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

- Uruchom testy lokalnie:

```bash
# backend
cd backend
pytest

# frontend
cd frontend
npm test
```

Uwaga: przed uruchomieniem lokalnym skopiuj/twórz pliki `.env` z szablonów `.env.pst` i uzupełnij wartości w `<>` (DB, Clerk, SMTP). Jeśli uruchamiasz lokalnie bez Dockera, skonfiguruj `DATABASE_URL` (np. `mysql://user:pass@localhost:3306/inz`) i uruchom lokalną instancję MariaDB/MySQL lub zmień konfigurację na inny DB.

## Serwisy modeli
- Lokalny start (każdy z: chronos/, morai/, timesfm/):
	- `pip install -r requirements.txt`
	- `uvicorn api:app --host 0.0.0.0 --port 8000`
- Testy: `pytest` w odpowiadającym katalogu `*/tests/`.
- Coverage: `py -m pytest --cov=.`

## Notatki środowiskowe
- Pliki `.env.pst` w backend/ i frontend/ zawierają placeholdery `<>`; podmień na własne wartości (hasła DB, klucze Clerk, SMTP).
- Pliki `docker/*.pst` służą jako szablony dla uruchomienia kontenerowego; uzupełnij przed `docker compose up`.

## Badania (badania/)
- `badania_modeli/` — dane i wyniki porównawcze modeli (chronos, moirai, timesfm). Podkatalogi z datami zawierają CSV z wynikami; `wyniki/` trzyma zebrane rezultaty.
- `przygotowanie_danych.py` — przygotowanie zbiorów wejściowych (`dane*.csv`). Następnie uzasadnia wybrane dane.
- `ocena_modeli.py` — skrypt oceny modeli na przygotowanych danych; zapisuje wyniki do podkatalogów modeli oczywiście bada MAPE i szybkość odpowiedzi modelu. Statystki MAPE wyświetla w terminalu.
- `wyniki` — ocena szybkosci modeli 

Uruchomienie:
```bash
cd badania/badania_modeli
python przygotowanie_danych.py
python ocena_modeli.py
```

## Testy gramatyki (test_gramatyki/)
- Zawiera testy dla gramatyki `EconLang.g4` i przykładowy `input.txt`.
- Do przebudowy gramatyki potrzebny jest JAR ANTLR (np. `antlr-4.X-complete.jar`). Umieść go lokalnie i wskaż w komendzie.

Uruchomienie:
```bash
cd badania/test_gramatyki
build.bat
```
Plik `build.bat` można dostosować, podając właściwą ścieżkę do JAR.
