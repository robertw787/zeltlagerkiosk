"""
app/main.py
─────────────────────────────────────────────────────────────────────────────
FastAPI-Anwendung: bindet alle Endpunkte ein.

Endpunkte (Auszug):
  POST /api/auth/login           – anmelden, liefert Token
  POST /api/auth/erstanmeldung   – mit Einladungscode Passwort setzen
  GET  /api/me                   – wer bin ich?
  GET  /api/kinder               – Liste / POST anlegen
  GET  /api/mitarbeiter          – Liste
  GET  /api/produkte             – Liste / POST anlegen / PATCH umschalten
  POST /api/bestellungen         – Bestellung aufgeben
  GET  /api/bestellungen         – Liste (mit Datumsfilter)
  POST /api/guthaben/...         – Guthaben manuell anpassen
  GET  /api/export/excel         – Excel mit 3 Tabellenblättern  (aus export.py)
  POST /api/mitarbeiter usw.     – anlegen/löschen               (aus verwaltung.py)
"""

from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from . import models, schemas, auth
from .export import router as export_router
from .verwaltung import router as verwaltung_router

# Tabellen anlegen, falls noch nicht vorhanden
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zeltlager-Kiosk")

# Im selben Server liefert Nginx das Frontend aus → CORS unkritisch, aber offen lassen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(export_router)
app.include_router(verwaltung_router)


def _ausgaben(db: Session, typ: str, kid: int) -> float:
    rows = db.query(models.Bestellung).filter(
        models.Bestellung.kaeufer_typ == typ,
        models.Bestellung.kaeufer_id == kid,
        models.Bestellung.status == "aktiv",
    )
    return round(sum(b.summe for b in rows), 2)


# ─── Auth ───────────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
def login(daten: schemas.LoginDaten, db: Session = Depends(get_db)):
    m = db.query(models.Mitarbeiter).filter(
        models.Mitarbeiter.benutzername == daten.benutzername
    ).first()
    if not m or not m.passwort_hash or not auth.passwort_pruefen(daten.passwort, m.passwort_hash):
        raise HTTPException(401, "Benutzername oder Passwort falsch.")
    if m.rolle not in auth.ROLLEN_MIT_ZUGANG:
        raise HTTPException(403, "Diese Rolle hat keinen App-Zugang.")
    return {
        "access_token": auth.token_erzeugen(m.id),
        "token_type": "bearer",
        "mitarbeiter": {"id": m.id, "name": m.name, "rolle": m.rolle},
    }


@app.post("/api/auth/erstanmeldung")
def erstanmeldung(daten: schemas.ErstanmeldungDaten, db: Session = Depends(get_db)):
    m = db.query(models.Mitarbeiter).filter(
        models.Mitarbeiter.einladungscode == daten.einladungscode
    ).first()
    if not m:
        raise HTTPException(400, "Einladungscode ungültig.")
    if m.rolle not in auth.ROLLEN_MIT_ZUGANG:
        raise HTTPException(403, "Diese Rolle braucht keinen Zugang.")
    m.benutzername = daten.benutzername
    m.passwort_hash = auth.passwort_hashen(daten.passwort)
    m.passwort_gesetzt = True
    m.einladungscode = None  # Code verbraucht
    db.commit()
    return {"access_token": auth.token_erzeugen(m.id), "token_type": "bearer",
            "mitarbeiter": {"id": m.id, "name": m.name, "rolle": m.rolle}}


@app.get("/api/me")
def me(user: models.Mitarbeiter = Depends(auth.get_current_user)):
    return {"id": user.id, "name": user.name, "rolle": user.rolle, "guthaben": user.guthaben}


# ─── Kinder ─────────────────────────────────────────────────────────────────
@app.get("/api/kinder")
def kinder_liste(db: Session = Depends(get_db),
                 user: models.Mitarbeiter = Depends(auth.get_current_user)):
    return [
        {"id": k.id, "name": k.name, "guthaben": round(k.guthaben, 2),
         "startGuthaben": round(k.start_guthaben, 2)}
        for k in db.query(models.Kind).order_by(models.Kind.name).all()
    ]


@app.post("/api/kinder", status_code=201)
def kind_anlegen(daten: schemas.KindNeu, db: Session = Depends(get_db),
                 _admin=Depends(auth.require_admin)):
    k = models.Kind(name=daten.name.strip(), guthaben=daten.start_guthaben,
                    start_guthaben=daten.start_guthaben)
    db.add(k); db.commit(); db.refresh(k)
    return {"id": k.id, "name": k.name, "guthaben": k.guthaben, "startGuthaben": k.start_guthaben}


# ─── Mitarbeiter (Liste; Anlegen/Löschen über verwaltung.py) ────────────────
@app.get("/api/mitarbeiter")
def mitarbeiter_liste(db: Session = Depends(get_db),
                      user: models.Mitarbeiter = Depends(auth.get_current_user)):
    leute = db.query(models.Mitarbeiter).order_by(models.Mitarbeiter.name).all()
    return [
        {"id": m.id, "name": m.name, "rolle": m.rolle,
         "guthaben": round(m.guthaben, 2), "startGuthaben": round(m.start_guthaben, 2),
         # Einladungscode sieht nur der Admin
         "code": m.einladungscode if user.rolle == "admin" else None}
        for m in leute
    ]


# ─── Produkte ───────────────────────────────────────────────────────────────
@app.get("/api/produkte")
def produkte_liste(db: Session = Depends(get_db),
                   user: models.Mitarbeiter = Depends(auth.get_current_user)):
    return [
        {"id": p.id, "name": p.name, "preis": p.preis, "bestand": p.bestand,
         "kategorie": p.kategorie, "emoji": p.emoji, "aktiv": p.aktiv}
        for p in db.query(models.Produkt).order_by(models.Produkt.name).all()
    ]


@app.post("/api/produkte", status_code=201)
def produkt_anlegen(daten: schemas.ProduktNeu, db: Session = Depends(get_db),
                    _admin=Depends(auth.require_admin)):
    p = models.Produkt(name=daten.name.strip(), preis=daten.preis, bestand=daten.bestand,
                       kategorie=daten.kategorie, emoji=daten.emoji, aktiv=True)
    db.add(p); db.commit(); db.refresh(p)
    return {"id": p.id, "name": p.name}


@app.patch("/api/produkte/{produkt_id}/umschalten")
def produkt_umschalten(produkt_id: int, db: Session = Depends(get_db),
                       _admin=Depends(auth.require_admin)):
    p = db.get(models.Produkt, produkt_id)
    if not p:
        raise HTTPException(404, "Produkt nicht gefunden")
    p.aktiv = not p.aktiv
    db.commit()
    return {"id": p.id, "aktiv": p.aktiv}


# ─── Guthaben manuell anpassen ──────────────────────────────────────────────
@app.post("/api/guthaben/{kaeufer_typ}/{kaeufer_id}")
def guthaben_anpassen(kaeufer_typ: str, kaeufer_id: int,
                      daten: schemas.GuthabenAnpassung,
                      db: Session = Depends(get_db),
                      admin=Depends(auth.require_admin)):
    modell = models.Kind if kaeufer_typ == "kind" else models.Mitarbeiter
    person = db.get(modell, kaeufer_id)
    if not person:
        raise HTTPException(404, "Käufer nicht gefunden")
    person.guthaben = round(person.guthaben + daten.betrag, 2)
    if daten.betrag > 0:
        person.start_guthaben = round(person.start_guthaben + daten.betrag, 2)
    db.add(models.Guthabenbewegung(
        kaeufer_typ=kaeufer_typ, kaeufer_id=kaeufer_id, kaeufer_name=person.name,
        betrag=daten.betrag, grund=daten.grund, mitarbeiter_name=admin.name))
    db.commit()
    return {"id": person.id, "guthaben": person.guthaben}


# ─── Bestellungen ───────────────────────────────────────────────────────────
@app.post("/api/bestellungen", status_code=201)
def bestellung_aufgeben(daten: schemas.BestellungNeu, db: Session = Depends(get_db),
                        user: models.Mitarbeiter = Depends(auth.get_current_user)):
    modell = models.Kind if daten.kaeufer_typ == "kind" else models.Mitarbeiter
    kaeufer = db.get(modell, daten.kaeufer_id)
    if not kaeufer:
        raise HTTPException(404, "Käufer nicht gefunden")

    positionen, summe = [], 0.0
    for pos in daten.positionen:
        p = db.get(models.Produkt, pos.produkt_id)
        if not p:
            raise HTTPException(404, f"Produkt {pos.produkt_id} nicht gefunden")
        summe += p.preis * pos.menge
        p.bestand = max(0, p.bestand - pos.menge)
        positionen.append(models.Bestellposition(
            produkt_id=p.id, produkt_name=p.name, menge=pos.menge, einzelpreis=p.preis))

    summe = round(summe, 2)
    ueberzogen = (kaeufer.guthaben - summe) < 0
    kaeufer.guthaben = round(kaeufer.guthaben - summe, 2)

    bestellung = models.Bestellung(
        kaeufer_typ=daten.kaeufer_typ, kaeufer_id=kaeufer.id, kaeufer_name=kaeufer.name,
        summe=summe, status="aktiv", verkauft_von=user.name, positionen=positionen)
    db.add(bestellung)
    db.add(models.Guthabenbewegung(
        kaeufer_typ=daten.kaeufer_typ, kaeufer_id=kaeufer.id, kaeufer_name=kaeufer.name,
        betrag=-summe, grund="Bestellung", mitarbeiter_name=user.name))
    db.commit(); db.refresh(bestellung)
    return {"id": bestellung.id, "summe": summe, "neues_guthaben": kaeufer.guthaben,
            "ueberzogen": ueberzogen}


@app.get("/api/bestellungen")
def bestellungen_liste(von: str | None = None, bis: str | None = None,
                       db: Session = Depends(get_db),
                       user: models.Mitarbeiter = Depends(auth.get_current_user)):
    q = db.query(models.Bestellung)
    if von:
        q = q.filter(models.Bestellung.zeitstempel >= datetime.fromisoformat(von))
    if bis:
        q = q.filter(models.Bestellung.zeitstempel <= datetime.fromisoformat(bis + "T23:59:59"))
    out = []
    for b in q.order_by(models.Bestellung.zeitstempel.desc()).all():
        out.append({
            "id": b.id, "kaeuferTyp": b.kaeufer_typ, "kaeuferName": b.kaeufer_name,
            "summe": b.summe, "status": b.status, "verkauftVon": b.verkauft_von,
            "zeitstempel": b.zeitstempel.isoformat() if b.zeitstempel else None,
            "positionen": [{"name": p.produkt_name, "menge": p.menge,
                            "einzelpreis": p.einzelpreis} for p in b.positionen],
        })
    return out


@app.patch("/api/bestellungen/{bestellung_id}/stornieren")
def bestellung_stornieren(bestellung_id: int, db: Session = Depends(get_db),
                          _admin=Depends(auth.require_admin)):
    b = db.get(models.Bestellung, bestellung_id)
    if not b:
        raise HTTPException(404, "Bestellung nicht gefunden")
    if b.status == "storniert":
        return {"id": b.id, "status": b.status}
    # Guthaben zurückbuchen
    modell = models.Kind if b.kaeufer_typ == "kind" else models.Mitarbeiter
    person = db.get(modell, b.kaeufer_id)
    if person:
        person.guthaben = round(person.guthaben + b.summe, 2)
    b.status = "storniert"
    db.add(models.Guthabenbewegung(
        kaeufer_typ=b.kaeufer_typ, kaeufer_id=b.kaeufer_id, kaeufer_name=b.kaeufer_name,
        betrag=b.summe, grund="Storno", mitarbeiter_name=_admin.name))
    db.commit()
    return {"id": b.id, "status": b.status}


@app.get("/api/health")
def health():
    return {"status": "ok"}
