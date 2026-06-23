"""
app/verwaltung.py
─────────────────────────────────────────────────────────────────────────────
Verwaltungs-Endpunkte passend zum Frontend:

  • Mitarbeiter anlegen – inkl. neuer Rolle "einkauf" (kauft nur ein, KEIN Zugang)
  • Löschen von Produkten, Kindern und Mitarbeitern (mit Schutzregeln)

Einbinden in app/main.py:
    from .verwaltung import router as verwaltung_router
    app.include_router(verwaltung_router)

Voraussetzung im Modell (app/models.py), Mitarbeiter-Tabelle:
    rolle           = Column(String, default="verkauf")   # "admin" | "verkauf" | "einkauf"
    guthaben        = Column(Float, default=0.0)
    start_guthaben  = Column(Float, default=0.0)
    einladungscode  = Column(String, nullable=True)
    passwort_hash   = Column(String, nullable=True)
    passwort_gesetzt= Column(Boolean, default=False)
"""

import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .database import get_db
from .auth import require_admin
from . import models

router = APIRouter(prefix="/api", tags=["verwaltung"])

# Rollen, die einen App-Zugang (Login) haben. "einkauf" ist bewusst NICHT dabei.
ROLLEN_MIT_ZUGANG = {"admin", "verkauf"}
ERLAUBTE_ROLLEN = ROLLEN_MIT_ZUGANG | {"einkauf"}


def _neuer_code(laenge: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(laenge))


# ─── Mitarbeiter anlegen ────────────────────────────────────────────────────
class MitarbeiterNeu(BaseModel):
    name: str = Field(min_length=1)
    rolle: str = "verkauf"               # "admin" | "verkauf" | "einkauf"
    start_guthaben: float = 0.0


@router.post("/mitarbeiter", status_code=status.HTTP_201_CREATED)
def mitarbeiter_anlegen(
    daten: MitarbeiterNeu,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    if daten.rolle not in ERLAUBTE_ROLLEN:
        raise HTTPException(422, f"Unbekannte Rolle: {daten.rolle}")

    hat_zugang = daten.rolle in ROLLEN_MIT_ZUGANG
    m = models.Mitarbeiter(
        name=daten.name.strip(),
        rolle=daten.rolle,
        guthaben=daten.start_guthaben,
        start_guthaben=daten.start_guthaben,
        # Nur Rollen mit Zugang bekommen einen Einladungscode für die Erstanmeldung.
        # "einkauf" hat keinen Code und kann sich nicht anmelden.
        einladungscode=_neuer_code() if hat_zugang else None,
        passwort_hash=None,
        passwort_gesetzt=False,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {
        "id": m.id,
        "name": m.name,
        "rolle": m.rolle,
        "guthaben": m.guthaben,
        "hat_zugang": hat_zugang,
        "einladungscode": m.einladungscode,   # bei "einkauf" = None
    }


# ─── Löschen: Produkt ───────────────────────────────────────────────────────
@router.delete("/produkte/{produkt_id}", status_code=status.HTTP_204_NO_CONTENT)
def produkt_loeschen(produkt_id: int, db: Session = Depends(get_db),
                     _admin=Depends(require_admin)):
    p = db.get(models.Produkt, produkt_id)
    if not p:
        raise HTTPException(404, "Produkt nicht gefunden")
    # Bestellpositionen speichern Name + Preis als Snapshot ⇒ Löschen ist sicher.
    db.delete(p)
    db.commit()


# ─── Löschen: Kind ──────────────────────────────────────────────────────────
@router.delete("/kinder/{kind_id}", status_code=status.HTTP_204_NO_CONTENT)
def kind_loeschen(kind_id: int, db: Session = Depends(get_db),
                  _admin=Depends(require_admin)):
    k = db.get(models.Kind, kind_id)
    if not k:
        raise HTTPException(404, "Kind nicht gefunden")
    db.delete(k)
    db.commit()


# ─── Löschen: Mitarbeiter (mit Schutzregeln) ────────────────────────────────
@router.delete("/mitarbeiter/{mitarbeiter_id}", status_code=status.HTTP_204_NO_CONTENT)
def mitarbeiter_loeschen(mitarbeiter_id: int, db: Session = Depends(get_db),
                         admin=Depends(require_admin)):
    m = db.get(models.Mitarbeiter, mitarbeiter_id)
    if not m:
        raise HTTPException(404, "Mitarbeiter nicht gefunden")

    # Regel 1: nicht sich selbst löschen
    if m.id == admin.id:
        raise HTTPException(400, "Du kannst dich nicht selbst löschen.")

    # Regel 2: nicht den letzten Admin löschen
    if m.rolle == "admin":
        admins = db.query(models.Mitarbeiter).filter(
            models.Mitarbeiter.rolle == "admin"
        ).count()
        if admins <= 1:
            raise HTTPException(400, "Der letzte Admin kann nicht gelöscht werden.")

    db.delete(m)
    db.commit()
