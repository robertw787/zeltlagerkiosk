"""
app/schemas.py
─────────────────────────────────────────────────────────────────────────────
Pydantic-Modelle: definieren, wie Daten rein- und rausgehen.
"""

from pydantic import BaseModel, Field


# ─── Auth ───────────────────────────────────────────────────────────────────
class LoginDaten(BaseModel):
    benutzername: str
    passwort: str


class ErstanmeldungDaten(BaseModel):
    einladungscode: str
    benutzername: str
    passwort: str = Field(min_length=4)


# ─── Kinder ─────────────────────────────────────────────────────────────────
class KindNeu(BaseModel):
    name: str = Field(min_length=1)
    start_guthaben: float = 0.0


# ─── Produkte ───────────────────────────────────────────────────────────────
class ProduktNeu(BaseModel):
    name: str = Field(min_length=1)
    preis: float = 0.0
    bestand: int = 0
    kategorie: str = "Süßes"
    emoji: str = "🍬"


# ─── Guthaben ───────────────────────────────────────────────────────────────
class GuthabenAnpassung(BaseModel):
    betrag: float            # positiv = aufladen, negativ = abziehen
    grund: str = "manuell"


# ─── Bestellungen ───────────────────────────────────────────────────────────
class BestellPosition(BaseModel):
    produkt_id: int
    menge: int = Field(gt=0)


class BestellungNeu(BaseModel):
    kaeufer_typ: str         # "kind" | "mitarbeiter"
    kaeufer_id: int
    positionen: list[BestellPosition]
