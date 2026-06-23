"""
app/models.py
─────────────────────────────────────────────────────────────────────────────
Datenmodell (Tabellen) – passend zum Frontend-Prototyp.

Käufer sind entweder Kinder oder Mitarbeiter. Bestellungen speichern Name und
Preise als "Snapshot", damit spätere Änderungen oder Löschungen die Abrechnung
nicht verfälschen.
"""

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer, String, func,
)
from sqlalchemy.orm import relationship

from .database import Base


class Kind(Base):
    __tablename__ = "kinder"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    guthaben = Column(Float, default=0.0)
    start_guthaben = Column(Float, default=0.0)


class Mitarbeiter(Base):
    __tablename__ = "mitarbeiter"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    benutzername = Column(String, unique=True, nullable=True)
    # "admin" | "verkauf" | "einkauf"  – nur admin/verkauf haben App-Zugang
    rolle = Column(String, default="verkauf")
    guthaben = Column(Float, default=0.0)              # eigenes Kauf-Guthaben
    start_guthaben = Column(Float, default=0.0)
    einladungscode = Column(String, nullable=True)     # Einmal-Code für Erstanmeldung
    passwort_hash = Column(String, nullable=True)
    passwort_gesetzt = Column(Boolean, default=False)
    erstellt_am = Column(DateTime, server_default=func.now())


class Produkt(Base):
    __tablename__ = "produkte"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    preis = Column(Float, default=0.0)
    bestand = Column(Integer, default=0)
    kategorie = Column(String, default="Süßes")
    emoji = Column(String, default="🍬")
    aktiv = Column(Boolean, default=True)


class Bestellung(Base):
    __tablename__ = "bestellungen"
    id = Column(Integer, primary_key=True)
    kaeufer_typ = Column(String, nullable=False)       # "kind" | "mitarbeiter"
    kaeufer_id = Column(Integer, nullable=False)
    kaeufer_name = Column(String, nullable=False)      # Snapshot
    summe = Column(Float, default=0.0)
    status = Column(String, default="aktiv")           # "aktiv" | "storniert"
    verkauft_von = Column(String, nullable=True)       # Name des Verkäufers
    zeitstempel = Column(DateTime, server_default=func.now())

    positionen = relationship(
        "Bestellposition", back_populates="bestellung",
        cascade="all, delete-orphan",
    )


class Bestellposition(Base):
    __tablename__ = "bestellpositionen"
    id = Column(Integer, primary_key=True)
    bestellung_id = Column(Integer, ForeignKey("bestellungen.id"))
    produkt_id = Column(Integer, nullable=True)        # darf gelöscht werden
    produkt_name = Column(String, nullable=False)      # Snapshot
    menge = Column(Integer, default=1)
    einzelpreis = Column(Float, default=0.0)           # Snapshot

    bestellung = relationship("Bestellung", back_populates="positionen")


class Guthabenbewegung(Base):
    """Lückenloser Log jeder Guthaben-Änderung (Aufladung, Korrektur, Bestellung)."""
    __tablename__ = "guthabenbewegungen"
    id = Column(Integer, primary_key=True)
    kaeufer_typ = Column(String, nullable=False)
    kaeufer_id = Column(Integer, nullable=False)
    kaeufer_name = Column(String, nullable=False)
    betrag = Column(Float, nullable=False)
    grund = Column(String, default="")
    mitarbeiter_name = Column(String, nullable=True)
    zeitstempel = Column(DateTime, server_default=func.now())
