"""
Helpers for the invite-link / forgot-password token flow.
"""
import datetime
import hashlib
import secrets

from sqlalchemy.orm import Session

from app import models
from app.config import settings


def generate_raw_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def create_token(
    db: Session,
    restaurant_id,
    purpose: "models.TokenPurpose",
    expire_hours: int,
) -> str:
    raw_token = generate_raw_token()
    record = models.PasswordResetToken(
        restaurant_id=restaurant_id,
        token_hash=hash_token(raw_token),
        purpose=purpose.value,
        expires_at=datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(hours=expire_hours),
    )
    db.add(record)
    db.commit()
    return raw_token


def consume_token(db: Session, raw_token: str, purpose: "models.TokenPurpose"):
    record = (
        db.query(models.PasswordResetToken)
        .filter(models.PasswordResetToken.token_hash == hash_token(raw_token))
        .first()
    )
    if not record or record.purpose != purpose.value:
        return None
    if record.used_at is not None:
        return None
    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=datetime.timezone.utc)
    if expires_at < now:
        return None

    restaurant = db.query(models.Restaurant).filter(
        models.Restaurant.id == record.restaurant_id
    ).first()
    if not restaurant:
        return None

    record.used_at = now
    db.commit()
    return restaurant