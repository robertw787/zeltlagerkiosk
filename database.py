"""
app/database.py
─────────────────────────────────────────────────────────────────────────────
Datenbank-Anbindung (SQLite über SQLAlchemy).

SQLite ist eine einzelne Datei (kiosk.db) – perfekt für ein Zeltlager:
kein separater Datenbankserver, Backup = Datei kopieren.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Pfad zur Datenbankdatei – liegt im Projektordner neben app/
BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PFAD = os.path.join(BASIS, "kiosk.db")

engine = create_engine(
    f"sqlite:///{DB_PFAD}",
    connect_args={"check_same_thread": False},  # für FastAPI nötig
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Liefert pro Anfrage eine Datenbank-Sitzung und schließt sie danach."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
