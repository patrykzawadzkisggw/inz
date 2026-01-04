# Docker: uruchomienie projektu

## Struktura usług
- mariadb – baza danych (port domyślny hosta: 3306)
- backend – FastAPI (port hosta: 8000)
- frontend – Next.js (port hosta: 3000)
- chronos-api / morai-api / timesfm-api – serwisy modeli (porty hosta: 8001/8002/8003)
- frontend-migrate – jednorazowe uruchomienie `prisma migrate deploy` przed startem frontendu

## Szybki start
1. Skopiuj pliki konfiguracyjne:
   - `docker/backend.pst` → `docker/backend.env`
   - `docker/frontend.pst` → `docker/frontend.env`
   - `backend/.env.pst` → `backend/.env`
   - `frontend/.env.pst` → `frontend/.env`
2. Zamień wszystkie wartości w `<>` na własne sekrety/hasła/hosty (DB, Clerk, SMTP, itp.).
3. Zbuduj i uruchom kontenery:
   ```
   docker compose up --build
   ```
4. Frontend będzie dostępny na http://localhost:3000, backend na http://localhost:8000, baza na porcie 3306 (lub nadpisanym przez `DB_PORT`).

## Zmienne kluczowe
- `DATABASE_URL` wskazuje na usługę `mariadb` (mysql://abc:password@mariadb:3306/inz).
- `API_URL` w frontendzie kieruje na usługę `backend` (http://backend:8000).
- Hasła/sekrety (`MARIADB_ROOT_PASSWORD`, `CLERK_SECRET_KEY`, dane SMTP) wymagają podmiany na wartości produkcyjne.

### Skąd wziąć klucze Clerk
- Utwórz projekt w Clerk (https://clerk.com), przejdź do **API Keys** i skopiuj: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (public) oraz `CLERK_SECRET_KEY` (secret). Wklej je w pliki `.env` / `.pst` zamiast placeholderów w `<>`.

### Skąd wziąć dane SMTP
- Użyj dostawcy SMTP (np. MailerSend, Mailgun, SendGrid, SES). W panelu dostawcy pobierz host, port, login/hasło (czasem klucz API jako hasło) i wpisz w pola SMTP w plikach `.env` / `.pst` zamiast wartości w `<>`.
