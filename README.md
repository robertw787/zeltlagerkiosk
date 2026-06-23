# Zeltlager-Kiosk – Backend

FastAPI + SQLite. Passt zum Frontend-Prototyp (`kiosk-prototype.jsx`).

## Inhalt
```
app/
  main.py        – alle Endpunkte (Login, Kinder, Produkte, Bestellungen, Guthaben)
  models.py      – Datenbank-Tabellen
  database.py    – SQLite-Anbindung
  auth.py        – Login, Passwörter (gehasht), JWT, Rollenprüfung
  schemas.py     – Datenformate
  export.py      – Excel-Export mit 3 Tabellenblättern (Kinder, Mitarbeiter, Bestellungen)
  verwaltung.py  – Anlegen/Löschen; Rolle "einkauf" (nur Einkauf, kein Zugang)
manage.py        – Einrichtung (init / seed-demo / reset)
requirements.txt – Paketliste
.env.example     – Vorlage für den geheimen Schlüssel
```

## Schnellstart (auf dem Server, im Projektordner)
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# SECRET_KEY erzeugen und in .env eintragen:
python -c "import secrets; print(secrets.token_urlsafe(48))"
nano .env

python manage.py init        # legt DB + Admin an, zeigt Einladungscode
python manage.py seed-demo   # optional: Beispiel-Kinder/-Produkte
uvicorn app.main:app --host 127.0.0.1 --port 8000   # Test, dann Strg+C
```

Die interaktive API-Doku läuft unter `/docs` (z. B. http://127.0.0.1:8000/docs).

## Rollen
- **admin** – darf alles (anlegen, löschen, Guthaben, Berichte, Export). Zugang per Login.
- **verkauf** – Bestellungen, Nachschlagen. Zugang per Login.
- **einkauf** – kauft nur ein, **kein** App-Zugang, **kein** Einladungscode.
