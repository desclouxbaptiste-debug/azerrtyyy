"""User accounts, login sessions and the monthly shorts quota (SQLite, standard library only)."""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import sqlite3
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at REAL NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    billing_status TEXT,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    current_period_end REAL,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
    billing_updated_at REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at REAL NOT NULL,
    expires_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS usage (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, month)
);
CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    received_at REAL NOT NULL
);
"""

EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$")
MIN_PASSWORD = 8
MAX_PASSWORD = 200
# scrypt: ~16 MB and ~50 ms per hash, slow enough to make guessing stolen hashes expensive
SCRYPT_N, SCRYPT_R, SCRYPT_P = 2 ** 14, 8, 1
LOGIN_WINDOW = 15 * 60
LOGIN_MAX_FAILURES = 8


class AccountError(ValueError):
    """Shown to the user as is. `status` is the HTTP status to answer with."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


@dataclass
class User:
    id: int
    email: str
    plan: str
    billing_status: str | None
    stripe_customer_id: str | None
    stripe_subscription_id: str | None
    current_period_end: float | None
    cancel_at_period_end: bool
    billing_updated_at: float

    @property
    def plan_obj(self) -> config.Plan:
        return config.PLANS.get(self.plan, config.PLANS["free"])


_conn: sqlite3.Connection | None = None
_lock = threading.RLock()
_failures: dict[str, list[float]] = {}


def db() -> sqlite3.Connection:
    global _conn
    with _lock:
        if _conn is None:
            config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            conn = sqlite3.connect(config.DB_PATH, check_same_thread=False, isolation_level=None, timeout=30)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA foreign_keys=ON")
            conn.executescript(SCHEMA)
            _conn = conn
        return _conn


def execute(sql: str, params: tuple = ()) -> sqlite3.Cursor:
    with _lock:
        return db().execute(sql, params)


def one(sql: str, params: tuple = ()) -> sqlite3.Row | None:
    """Run a query and fetch its first row while holding the connection lock."""
    with _lock:
        return db().execute(sql, params).fetchone()


def reset_for_tests() -> None:
    global _conn
    with _lock:
        if _conn is not None:
            _conn.close()
        _conn = None
        _failures.clear()
        _signups.clear()


def month_key(ts: float | None = None) -> str:
    return datetime.fromtimestamp(ts if ts is not None else time.time(), tz=timezone.utc).strftime("%Y-%m")


# ------------------------------------------------------------------------------ passwords

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=32)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, n, r, p, salt, digest = stored.split("$")
        if algo != "scrypt":
            return False
        test = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p),
                              dklen=len(digest) // 2)
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(test.hex(), digest)


_DUMMY_HASH = hash_password(secrets.token_hex(8))  # so a wrong e-mail costs as much time as a wrong password


# ------------------------------------------------------------------------------ users

def _row_to_user(row: sqlite3.Row | None) -> User | None:
    if row is None:
        return None
    return User(
        id=row["id"], email=row["email"], plan=row["plan"] if row["plan"] in config.PLANS else "free",
        billing_status=row["billing_status"], stripe_customer_id=row["stripe_customer_id"],
        stripe_subscription_id=row["stripe_subscription_id"], current_period_end=row["current_period_end"],
        cancel_at_period_end=bool(row["cancel_at_period_end"]), billing_updated_at=row["billing_updated_at"] or 0,
    )


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


_signups: dict[str, list[float]] = {}


def check_signup_rate(client: str) -> None:
    """A few free accounts per connection and per hour: enough for a household, not for a bot."""
    now = time.time()
    with _lock:
        recent = [t for t in _signups.get(client, []) if now - t < 3600]
        if len(recent) >= config.MAX_SIGNUPS_PER_IP_HOUR:
            _signups[client] = recent
            raise AccountError("Trop de comptes créés depuis ta connexion : réessaie dans une heure.", 429)
        recent.append(now)
        _signups[client] = recent


def create_user(email: str, password: str) -> User:
    email = normalize_email(email)
    if len(email) > 254 or not email.isprintable() or not EMAIL_RE.match(email):
        raise AccountError("Adresse e-mail invalide.")
    if not isinstance(password, str) or len(password) < MIN_PASSWORD:
        raise AccountError(f"Le mot de passe doit faire au moins {MIN_PASSWORD} caractères.")
    if len(password) > MAX_PASSWORD:
        raise AccountError("Mot de passe trop long.")
    try:
        cur = execute("INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
                      (email, hash_password(password), time.time()))
    except sqlite3.IntegrityError as exc:
        raise AccountError("Un compte existe déjà avec cet e-mail : connecte-toi.", 409) from exc
    return get_user(cur.lastrowid)


def get_user(user_id: int) -> User | None:
    return _row_to_user(one("SELECT * FROM users WHERE id = ?", (user_id,)))


def get_user_by_email(email: str) -> User | None:
    return _row_to_user(one("SELECT * FROM users WHERE email = ?", (normalize_email(email),)))


def get_user_by_customer(customer_id: str) -> User | None:
    return _row_to_user(one("SELECT * FROM users WHERE stripe_customer_id = ?", (customer_id,)))


def authenticate(email: str, password: str, client: str) -> User:
    """Check a login. Raises AccountError (401, or 429 after too many failures)."""
    email = normalize_email(email)
    key = f"{client}|{email}"
    now = time.time()
    with _lock:
        recent = [t for t in _failures.get(key, []) if now - t < LOGIN_WINDOW]
        _failures[key] = recent
        if len(recent) >= LOGIN_MAX_FAILURES:
            raise AccountError("Trop de tentatives : réessaie dans quelques minutes.", 429)
        # Counted as a failure before checking: parallel guesses can't all slip in before the first is recorded
        recent.append(now)
    row = one("SELECT * FROM users WHERE email = ?", (email,))
    ok = verify_password(password or "", row["password_hash"] if row else _DUMMY_HASH)
    if not row or not ok:
        raise AccountError("E-mail ou mot de passe incorrect.", 401)
    with _lock:
        _failures.pop(key, None)
    return _row_to_user(row)


def set_plan(user_id: int, plan: str) -> None:
    if plan not in config.PLANS:
        raise AccountError("Forfait inconnu.")
    execute("UPDATE users SET plan = ? WHERE id = ?", (plan, user_id))


def update_billing(user_id: int, *, plan: str, status: str | None, customer_id: str | None,
                   subscription_id: str | None, period_end: float | None, cancel_at_period_end: bool,
                   event_time: float) -> bool:
    """Apply a Stripe subscription state. Events older than the last one applied are ignored."""
    with _lock:
        row = one("SELECT billing_updated_at FROM users WHERE id = ?", (user_id,))
        if row is None or event_time < (row["billing_updated_at"] or 0):
            return False
        execute(
            """UPDATE users SET plan = ?, billing_status = ?, stripe_customer_id = COALESCE(?, stripe_customer_id),
               stripe_subscription_id = ?, current_period_end = ?, cancel_at_period_end = ?, billing_updated_at = ?
               WHERE id = ?""",
            (plan if plan in config.PLANS else "free", status, customer_id, subscription_id, period_end,
             int(cancel_at_period_end), event_time, user_id),
        )
    return True


def link_customer(user_id: int, customer_id: str) -> None:
    execute("UPDATE users SET stripe_customer_id = ? WHERE id = ? AND (stripe_customer_id IS NULL OR stripe_customer_id = ?)",
            (customer_id, user_id, customer_id))


# ------------------------------------------------------------------------------ sessions

def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    now = time.time()
    execute("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (_token_hash(token), user_id, now, now + config.SESSION_DAYS * 86400))
    execute("DELETE FROM sessions WHERE expires_at < ?", (now,))
    return token


def user_from_session(token: str | None) -> User | None:
    if not token or len(token) > 200:
        return None
    row = one(
        "SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id "
        "WHERE sessions.token_hash = ? AND sessions.expires_at > ?",
        (_token_hash(token), time.time()),
    )
    return _row_to_user(row)


def delete_session(token: str | None) -> None:
    if token:
        execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(token),))


# ------------------------------------------------------------------------------ quota

def used_this_month(user_id: int, month: str | None = None) -> int:
    row = one("SELECT used FROM usage WHERE user_id = ? AND month = ?", (user_id, month or month_key()))
    return int(row["used"]) if row else 0


def add_usage(user_id: int, shorts: int, month: str | None = None) -> None:
    if shorts <= 0:
        return
    execute(
        "INSERT INTO usage (user_id, month, used) VALUES (?, ?, ?) "
        "ON CONFLICT(user_id, month) DO UPDATE SET used = used + excluded.used",
        (user_id, month or month_key(), shorts),
    )


def mark_event(event_id: str) -> bool:
    """Remember a Stripe event id. False if it was already processed (Stripe retries deliveries)."""
    try:
        execute("INSERT INTO stripe_events (id, received_at) VALUES (?, ?)", (event_id, time.time()))
    except sqlite3.IntegrityError:
        return False
    return True


def public_user(user: User, reserved: int = 0) -> dict:
    plan = user.plan_obj
    used = used_this_month(user.id)
    limit = plan.monthly_quota
    return {
        "email": user.email,
        "plan": plan.key,
        "plan_label": plan.label,
        "quota": {
            "limit": limit,
            "used": used,
            "reserved": reserved,
            "remaining": None if limit is None else max(0, limit - used - reserved),
            "month": month_key(),
        },
        "billing": {
            "status": user.billing_status,
            "renews_at": user.current_period_end,
            "cancel_at_period_end": user.cancel_at_period_end,
            "can_manage": bool(user.stripe_customer_id) and bool(config.STRIPE_SECRET_KEY),
        },
    }
