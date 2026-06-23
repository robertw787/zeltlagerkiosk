"""
app/auth.py
─────────────────────────────────────────────────────────────────────────────
Anmeldung, Passwörter und Rollenprüfung.

- Passwörter werden gehasht gespeichert (passlib/bcrypt), nie im Klartext.
- Nach dem Login bekommt der Browser ein JWT-Token, das er bei jeder Anfrage
  mitschickt.
- Rollen mit App-Zugang: admin, verkauf.  "einkauf" kann sich NICHT anmelden.
"""

import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .database import get_db
from . import models

SECRET_KEY = os.getenv("SECRET_KEY", "bitte-aendern-in-.env")
ALGORITHM = "HS256"
TOKEN_GUELTIG_MINUTEN = 60 * 12  # 12 Stunden

ROLLEN_MIT_ZUGANG = {"admin", "verkauf"}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def passwort_hashen(passwort: str) -> str:
    return pwd_context.hash(passwort)


def passwort_pruefen(klartext: str, gehasht: str) -> bool:
    return pwd_context.verify(klartext, gehasht)


def token_erzeugen(mitarbeiter_id: int) -> str:
    ablauf = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_GUELTIG_MINUTEN)
    daten = {"sub": str(mitarbeiter_id), "exp": ablauf}
    return jwt.encode(daten, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.Mitarbeiter:
    fehler = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nicht angemeldet oder Sitzung abgelaufen.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        daten = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        mid = int(daten.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise fehler

    m = db.get(models.Mitarbeiter, mid)
    if not m:
        raise fehler
    return m


def require_admin(
    user: models.Mitarbeiter = Depends(get_current_user),
) -> models.Mitarbeiter:
    if user.rolle != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Nur für Admins erlaubt.")
    return user
