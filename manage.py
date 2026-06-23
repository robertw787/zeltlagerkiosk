"""
manage.py
─────────────────────────────────────────────────────────────────────────────
Kleine Verwaltungs-Kommandos für die Einrichtung.

  python manage.py init        legt Tabellen an + ersten Admin (mit Einladungscode)
  python manage.py seed-demo   füllt ein paar Beispiel-Kinder und -Produkte ein
  python manage.py reset        löscht die Datenbank (Vorsicht!)
"""

import secrets
import string
import sys
import os

from app.database import Base, engine, SessionLocal
from app import models


def _code(n=8):
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(n))


def init():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Mitarbeiter).filter(models.Mitarbeiter.rolle == "admin").first():
            print("Es existiert bereits ein Admin – nichts zu tun.")
            return
        code = _code()
        admin = models.Mitarbeiter(
            name="Admin", rolle="admin", einladungscode=code,
            passwort_gesetzt=False, guthaben=0.0, start_guthaben=0.0)
        db.add(admin)
        db.commit()
        print("\n  Datenbank eingerichtet.")
        print("  ───────────────────────────────────────────")
        print(f"  Einladungscode für den Admin:  {code}")
        print("  Damit in der App die Erstanmeldung machen")
        print("  (Benutzername + Passwort selbst festlegen).")
        print("  ───────────────────────────────────────────\n")
    finally:
        db.close()


def seed_demo():
    db = SessionLocal()
    try:
        if db.query(models.Kind).first():
            print("Es gibt schon Daten – seed-demo übersprungen.")
            return
        kinder = [("Anna L.", 15), ("Ben K.", 10), ("Clara M.", 10),
                  ("David S.", 20), ("Emma T.", 6)]
        for name, g in kinder:
            db.add(models.Kind(name=name, guthaben=g, start_guthaben=g))
        produkte = [
            ("Gummibärchen", 0.5, 40, "Süßes", "🐻"),
            ("Schokoriegel", 1.0, 25, "Süßes", "🍫"),
            ("Lutscher", 0.3, 60, "Süßes", "🍭"),
            ("Apfelsaft", 0.8, 30, "Getränke", "🧃"),
            ("Wasser", 0.4, 50, "Getränke", "💧"),
            ("Brezel", 0.9, 18, "Snacks", "🥨"),
        ]
        for name, preis, bestand, kat, emoji in produkte:
            db.add(models.Produkt(name=name, preis=preis, bestand=bestand,
                                  kategorie=kat, emoji=emoji, aktiv=True))
        db.commit()
        print("Demo-Daten eingefügt (5 Kinder, 6 Produkte).")
    finally:
        db.close()


def reset():
    pfad = os.path.join(os.path.dirname(__file__), "kiosk.db")
    if os.path.exists(pfad):
        os.remove(pfad)
        print("Datenbank gelöscht.")
    else:
        print("Keine Datenbank vorhanden.")


if __name__ == "__main__":
    befehl = sys.argv[1] if len(sys.argv) > 1 else ""
    if befehl == "init":
        init()
    elif befehl == "seed-demo":
        seed_demo()
    elif befehl == "reset":
        reset()
    else:
        print("Benutzung: python manage.py [init | seed-demo | reset]")
