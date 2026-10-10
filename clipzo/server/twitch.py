"""Twitch: chat replay of a VOD, viewers' clips, and the automatic import after each live.

The chat replay uses Twitch's public GraphQL endpoint (no key needed). Viewers' clips and the
live / VOD lookups use the official Helix API, which needs a (free) developer application
(config.TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET). Network helpers never raise: they log and
return what they have, so an analysis never fails because of Twitch.
"""

from __future__ import annotations

import json
import logging
import math
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Callable

from . import accounts, config

log = logging.getLogger("clipzo.twitch")

GQL_URL = "https://gql.twitch.tv/gql"
GQL_COMMENTS_HASH = "b70a3591ff0f4e0313d126c6a1502d79a1c02baebb288227c582044aa76adf6a"
TOKEN_URL = "https://id.twitch.tv/oauth2/token"
HELIX_URL = "https://api.twitch.tv/helix"

HTTP_TIMEOUT = 15.0
MAX_RESPONSE_BYTES = 8 * 1024 * 1024
CHAT_MAX_REQUESTS = 3000
CHAT_MAX_FAILURES = 3  # in a row
CHAT_MAX_RETRY_AFTER = 5.0
MESSAGE_MAX_CHARS = 300
CLIPS_MAX_PAGES = 10
HELIX_MAX_IDS = 100  # per /streams call
TOKEN_MARGIN = 60.0  # the app token is renewed this long before it expires
IMPORT_MAX_AGE = 48 * 3600  # older VODs are never imported automatically
# A VOD must have stopped growing for a few minutes: a stream that drops and resumes keeps the same VOD.
IMPORT_SETTLE = 5 * 60
START_DELAY = 30.0  # first poll after start(): let the server finish starting

LOGIN_RE = re.compile(r"^[A-Za-z0-9_]{3,25}$")
_VOD_HOSTS = {"twitch.tv", "www.twitch.tv", "m.twitch.tv"}
_VOD_PATH_RE = re.compile(r"^/(?:videos|[A-Za-z0-9_]{3,25}/v(?:ideo)?)/(\d{1,20})/?$")
_NOT_CHANNELS = {"videos", "directory", "settings", "search", "downloads", "subscriptions", "inventory", "wallet"}
_DURATION_RE = re.compile(r"^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$")

# Indirections so tests can drive time without waiting.
_clock = time.monotonic
_sleep = time.sleep


# ---------------------------------------------------------------- small helpers

def vod_id_from_url(url: str) -> str | None:
    """'https://www.twitch.tv/videos/123456789?t=1h2m' -> '123456789'. None for clips, channels, other sites."""
    raw = (url or "").strip()
    if len(raw) > 2048:
        return None
    if not re.match(r"^https?://", raw, re.I):
        raw = "https://" + raw
    try:
        parts = urllib.parse.urlsplit(raw)
        host = (parts.hostname or "").lower().rstrip(".")
    except ValueError:
        return None
    if host not in _VOD_HOSTS:
        return None
    m = _VOD_PATH_RE.match(parts.path)
    return m.group(1) if m else None


def normalize_login(text: str) -> str | None:
    """What a creator types ('Gotaga', '@gotaga', 'twitch.tv/gotaga') -> 'gotaga', or None if it isn't a channel."""
    raw = (text or "").strip()
    if "/" in raw:
        try:
            parts = urllib.parse.urlsplit(raw if re.match(r"^https?://", raw, re.I) else "https://" + raw)
            host = (parts.hostname or "").lower()
        except ValueError:
            return None
        if host not in _VOD_HOSTS:
            return None
        raw = parts.path.strip("/").split("/")[0]
        if raw.lower() in _NOT_CHANNELS:
            return None
    raw = raw.lstrip("@").lower()
    return raw if LOGIN_RE.match(raw) else None


def parse_duration(text: str | None) -> float:
    """Helix video length '3h2m1s' -> 10921.0 seconds (0.0 when unreadable)."""
    m = _DURATION_RE.match(str(text or "").strip())
    if not m or not any(m.groups()):
        return 0.0
    h, mi, s = m.groups()
    return int(h or 0) * 3600 + int(mi or 0) * 60 + float(s or 0)


def parse_time(text: str | None) -> float | None:
    """RFC 3339 '2026-10-09T18:00:00Z' -> epoch seconds, None when unreadable."""
    try:
        dt = datetime.fromisoformat(str(text or "").strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


def rfc3339(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _read_json(req: urllib.request.Request, timeout: float = HTTP_TIMEOUT):
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read(MAX_RESPONSE_BYTES + 1)
    if len(body) > MAX_RESPONSE_BYTES:
        raise ValueError("answer too large")
    return json.loads(body.decode("utf-8"))


# ---------------------------------------------------------------- chat replay (no key needed)

def fetch_chat(vod_id: str, duration: float, progress: Callable[[float], None] | None = None,
               deadline: float = 150.0) -> list[tuple[float, str]]:
    """Chat replay of a VOD as (seconds, message), sorted by time. Best effort: never raises.

    Pages by offset (cursor paging trips Twitch's integrity check from the 2nd request). Stops at the
    end of the VOD, when Twitch has no more pages or refuses, after `deadline` seconds, CHAT_MAX_REQUESTS
    requests or CHAT_MAX_FAILURES failures in a row. `progress(fraction of the VOD covered)`: if it
    raises (e.g. the job was cancelled), the download just stops."""
    messages: list[tuple[float, str]] = []
    vod_id = str(vod_id or "")
    if not re.fullmatch(r"\d{1,20}", vod_id):
        log.warning("chat replay: invalid VOD id %r", vod_id)
        return messages
    try:
        _collect_chat(vod_id, float(duration or 0), progress, float(deadline), messages)
    except Exception as exc:  # noqa: BLE001 - optional signal, never fail the job for it
        log.warning("chat replay of VOD %s stopped: %s", vod_id, exc)
    messages.sort(key=lambda m: m[0])
    return messages


def _collect_chat(vod_id: str, duration: float, progress: Callable[[float], None] | None,
                  deadline: float, out: list[tuple[float, str]]) -> None:
    seen: set = set()
    started = _clock()
    offset, failures = 0, 0
    for _ in range(CHAT_MAX_REQUESTS):
        if duration and offset >= duration:
            return
        left = deadline - (_clock() - started)
        if left <= 0:
            log.warning("chat replay of VOD %s: time limit reached at %d s", vod_id, offset)
            return
        try:
            page = _comments_page(vod_id, offset, timeout=min(HTTP_TIMEOUT, max(1.0, left)))
        except Exception as exc:  # noqa: BLE001 - network, HTTP or invalid JSON: retry a little
            failures += 1
            if failures >= CHAT_MAX_FAILURES:
                log.warning("chat replay of VOD %s: %d failures in a row (%s)", vod_id, failures, exc)
                return
            _sleep(min(_retry_delay(exc, failures), max(0.0, deadline - (_clock() - started))))
            continue
        failures = 0
        if page is None:
            return
        comments, has_next = page
        newest = offset
        for key, t, text in comments:
            newest = max(newest, int(t))
            if key in seen or (duration and t > duration + 1):
                continue
            seen.add(key)
            out.append((t, text))
        done = not has_next or not comments
        # Next page starts at the last message received; +1 when it didn't move (dedupe covers the overlap).
        offset = newest if newest > offset else offset + 1
        if progress is not None and duration > 0:
            try:
                progress(1.0 if done else min(1.0, offset / duration))
            except Exception:  # noqa: BLE001 - the caller wants us to stop (cancelled job)
                log.info("chat replay of VOD %s stopped by the caller", vod_id)
                return
        if done:
            return
    log.warning("chat replay of VOD %s: request limit reached at %d s", vod_id, offset)


def _retry_delay(exc: Exception, failures: int) -> float:
    if isinstance(exc, urllib.error.HTTPError) and exc.code == 429:
        try:
            wait = float((exc.headers or {}).get("Retry-After") or "")
            return min(CHAT_MAX_RETRY_AFTER, max(0.0, wait))
        except (TypeError, ValueError):
            pass
    return 0.5 * 2 ** (failures - 1)


def _comments_page(vod_id: str, offset: int, timeout: float = HTTP_TIMEOUT):
    """([(dedupe key, seconds, text)], has_next_page), or None when Twitch refuses (stop there)."""
    body = [{
        "operationName": "VideoCommentsByOffsetOrCursor",
        "variables": {"videoID": vod_id, "contentOffsetSeconds": int(offset)},
        "extensions": {"persistedQuery": {"version": 1, "sha256Hash": GQL_COMMENTS_HASH}},
    }]
    req = urllib.request.Request(GQL_URL, data=json.dumps(body).encode(), method="POST", headers={
        "Client-Id": config.TWITCH_GQL_CLIENT_ID, "Content-Type": "application/json"})
    data = _read_json(req, timeout)
    item = data[0] if isinstance(data, list) and data else data
    if not isinstance(item, dict):
        raise ValueError("unexpected answer")
    if item.get("errors"):
        errors = [str((e or {}).get("message") if isinstance(e, dict) else e)[:80] for e in item["errors"]][:3]
        log.warning("chat replay of VOD %s refused by Twitch: %s", vod_id, ", ".join(errors))
        return None
    video = (item.get("data") or {}).get("video")
    if not isinstance(video, dict):
        log.warning("chat replay of VOD %s: no video in the answer (integrity check or deleted VOD)", vod_id)
        return None
    comments = video.get("comments")
    comments = comments if isinstance(comments, dict) else {}  # null: a VOD without chat
    out = []
    for edge in _list(comments.get("edges")):
        node = edge.get("node") if isinstance(edge, dict) else None
        if not isinstance(node, dict):
            continue
        try:
            t = float(node["contentOffsetSeconds"])
        except (KeyError, TypeError, ValueError):
            continue
        if not math.isfinite(t) or t < 0:
            continue
        message = node.get("message")
        fragments = _list(message.get("fragments")) if isinstance(message, dict) else []
        text = "".join(str(f.get("text") or "") for f in fragments if isinstance(f, dict)).strip()
        text = text[:MESSAGE_MAX_CHARS]
        # The comment id when Twitch gives it: 50 viewers spamming KEKW in the same second count 50 times.
        key = ("id", str(node["id"])) if node.get("id") else (t, text)
        out.append((key, t, text))
    page_info = comments.get("pageInfo")
    return out, isinstance(page_info, dict) and bool(page_info.get("hasNextPage"))


def _list(value) -> list:
    return value if isinstance(value, list) else []


# ---------------------------------------------------------------- Helix (official API, needs keys)

def helix_configured() -> bool:
    return bool(config.TWITCH_CLIENT_ID and config.TWITCH_CLIENT_SECRET)


class Helix:
    """Twitch API with an app access token (client credentials). Methods never raise."""

    def __init__(self, client_id: str | None = None, client_secret: str | None = None,
                 clock: Callable[[], float] = time.time):
        self._client_id, self._client_secret = client_id, client_secret
        self._clock = clock
        self._token: str | None = None
        self._token_expires = 0.0
        self._lock = threading.Lock()

    @property
    def client_id(self) -> str:
        return config.TWITCH_CLIENT_ID if self._client_id is None else self._client_id

    @property
    def client_secret(self) -> str:
        return config.TWITCH_CLIENT_SECRET if self._client_secret is None else self._client_secret

    def _app_token(self, refresh: bool = False) -> str:
        with self._lock:
            if refresh or not self._token or self._clock() >= self._token_expires - TOKEN_MARGIN:
                self._token = None
                form = urllib.parse.urlencode({
                    "client_id": self.client_id, "client_secret": self.client_secret,
                    "grant_type": "client_credentials",
                }).encode()
                req = urllib.request.Request(TOKEN_URL, data=form, method="POST",
                                             headers={"Content-Type": "application/x-www-form-urlencoded"})
                data = _read_json(req)
                token = str(data["access_token"])
                self._token_expires = self._clock() + float(data.get("expires_in") or 3600)
                self._token = token
            return self._token

    def _get(self, path: str, params: list[tuple[str, str]]) -> dict | None:
        """GET /helix/<path>. A 401 (token revoked or expired early) renews the token once."""
        if not (self.client_id and self.client_secret):
            return None
        url = f"{HELIX_URL}/{path}?{urllib.parse.urlencode(params)}"
        for attempt in range(2):
            try:
                token = self._app_token(refresh=attempt > 0)
                req = urllib.request.Request(url, headers={
                    "Authorization": f"Bearer {token}", "Client-Id": self.client_id})
                data = _read_json(req)
            except urllib.error.HTTPError as exc:
                if exc.code == 401 and attempt == 0:
                    continue
                log.warning("Twitch API /%s failed: HTTP %s", path, exc.code)
                return None
            except Exception as exc:  # noqa: BLE001 - network, invalid JSON, missing token
                log.warning("Twitch API /%s failed: %s", path, exc)
                return None
            return data if isinstance(data, dict) else None
        return None

    def get_user(self, login: str) -> dict | None:
        """{"id", "login", "display_name"} of a channel, None if it doesn't exist (or on error)."""
        login = (login or "").strip().lstrip("@").lower()
        if not LOGIN_RE.match(login):
            return None
        rows = _rows(self._get("users", [("login", login)]))
        if not rows or not rows[0].get("id"):
            return None
        u = rows[0]
        name = str(u.get("login") or login)
        return {"id": str(u["id"]), "login": name, "display_name": str(u.get("display_name") or name)}

    def _archives(self, user_id: str, first: int = 1) -> list[dict] | None:
        data = self._get("videos", [("user_id", str(user_id)), ("type", "archive"), ("first", str(first))])
        return None if data is None else _rows(data)

    def latest_archive(self, user_id: str) -> dict | None:
        """Newest past broadcast: {"id", "url", "title", "created_at": epoch, "duration": seconds}."""
        rows = self._archives(user_id)
        return _video(rows[0]) if rows else None

    def live_streams(self, user_ids: list[str]) -> dict[str, str] | None:
        """{user_id: stream_id} of the channels live right now. None when Twitch couldn't be asked."""
        ids = list(dict.fromkeys(str(i) for i in user_ids if str(i).isdigit()))
        live: dict[str, str] = {}
        for k in range(0, len(ids), HELIX_MAX_IDS):
            batch = ids[k:k + HELIX_MAX_IDS]
            data = self._get("streams", [("user_id", i) for i in batch] + [("type", "live"), ("first", "100")])
            if data is None:
                return None
            for row in _rows(data):
                if row.get("user_id") and row.get("type", "live") == "live":
                    live[str(row["user_id"])] = str(row.get("id") or "")
        return live

    def live_user_ids(self, user_ids: list[str]) -> set[str]:
        return set(self.live_streams(user_ids) or {})

    def vod_clips(self, broadcaster_id: str, vod_id: str, started_at: float, ended_at: float) -> list[dict]:
        """Viewers' clips of one VOD: [{"offset", "duration", "views", "title"}] (seconds into the VOD).

        `started_at` / `ended_at` bound when the clips were created (VOD start -> now covers them all)."""
        params = [("broadcaster_id", str(broadcaster_id)), ("started_at", rfc3339(started_at)),
                  ("ended_at", rfc3339(max(ended_at, started_at + 1))), ("first", "100")]
        out: list[dict] = []
        cursor = None
        for _ in range(CLIPS_MAX_PAGES):
            data = self._get("clips", params + ([("after", cursor)] if cursor else []))
            if data is None:
                break
            for row in _rows(data):
                if str(row.get("video_id") or "") != str(vod_id) or row.get("vod_offset") is None:
                    continue  # another VOD, or Twitch hasn't placed the clip in the VOD yet
                try:
                    out.append({"offset": float(row["vod_offset"]), "duration": float(row.get("duration") or 0),
                                "views": int(row.get("view_count") or 0), "title": str(row.get("title") or "")[:200]})
                except (TypeError, ValueError):
                    continue
            pagination = data.get("pagination")
            cursor = pagination.get("cursor") if isinstance(pagination, dict) else None
            if not cursor:
                break
        return out


def _rows(data: dict | None) -> list[dict]:
    rows = (data or {}).get("data")
    return [r for r in rows if isinstance(r, dict)] if isinstance(rows, list) else []


def _video(row: dict) -> dict | None:
    vid = str(row.get("id") or "")
    created = parse_time(row.get("created_at"))
    if not vid.isdigit() or created is None:
        return None
    return {
        "id": vid,
        "url": f"https://www.twitch.tv/videos/{vid}",  # rebuilt: only ever a twitch.tv VOD link
        "title": str(row.get("title") or "").strip()[:200],
        "created_at": created,
        "duration": parse_duration(row.get("duration")),
    }


_helix: Helix | None = None
_helix_lock = threading.Lock()


def helix() -> Helix:
    """The shared client (one app token for the whole server)."""
    global _helix
    with _helix_lock:
        if _helix is None:
            _helix = Helix()
        return _helix


def current_latest_vod_id(broadcaster_id: str) -> str | None:
    """Newest finished VOD of a channel, to store when a creator turns the import on (older VODs are
    never imported). The VOD of a live in progress doesn't count: it is imported when the live ends."""
    api = helix()
    rows = api._archives(broadcaster_id, first=2) or []
    live = api.live_streams([broadcaster_id]) or {}
    stream_id = live.get(str(broadcaster_id))
    for row in rows:
        if stream_id and str(row.get("stream_id") or "") == stream_id:
            continue
        return str(row.get("id") or "") or None
    return None


# ---------------------------------------------------------------- linked channels (SQLite)

_SCHEMA = """CREATE TABLE IF NOT EXISTS twitch_links (
    user_id INTEGER PRIMARY KEY,
    login TEXT NOT NULL,
    broadcaster_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    settings TEXT NOT NULL DEFAULT '{}',
    last_vod_id TEXT,
    last_error TEXT,
    updated_at REAL
)"""


def ensure_schema() -> None:
    accounts.execute(_SCHEMA)


def _link(row) -> dict | None:
    if row is None:
        return None
    try:
        settings = json.loads(row["settings"] or "{}")
    except (TypeError, ValueError):
        settings = {}
    return {
        "user_id": row["user_id"], "login": row["login"], "broadcaster_id": row["broadcaster_id"],
        "enabled": bool(row["enabled"]), "settings": settings if isinstance(settings, dict) else {},
        "last_vod_id": row["last_vod_id"], "last_error": row["last_error"], "updated_at": row["updated_at"],
    }


def get_link(user_id: int) -> dict | None:
    ensure_schema()
    return _link(accounts.one("SELECT * FROM twitch_links WHERE user_id = ?", (user_id,)))


def save_link(user_id: int, login: str, broadcaster_id: str, enabled: bool, settings: dict,
              last_vod_id: str | None) -> None:
    """Create or replace a user's link. The last error is kept unless the channel changes."""
    ensure_schema()
    accounts.execute(
        """INSERT INTO twitch_links (user_id, login, broadcaster_id, enabled, settings, last_vod_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET login = excluded.login, broadcaster_id = excluded.broadcaster_id,
               enabled = excluded.enabled, settings = excluded.settings, last_vod_id = excluded.last_vod_id,
               last_error = CASE WHEN twitch_links.broadcaster_id = excluded.broadcaster_id
                                 THEN twitch_links.last_error END,
               updated_at = excluded.updated_at""",
        (user_id, (login or "").lower(), str(broadcaster_id), int(bool(enabled)),
         json.dumps(settings or {}, ensure_ascii=False), last_vod_id, time.time()),
    )


def delete_link(user_id: int) -> None:
    ensure_schema()
    accounts.execute("DELETE FROM twitch_links WHERE user_id = ?", (user_id,))


def enabled_links() -> list[dict]:
    ensure_schema()
    with accounts._lock:
        rows = accounts.execute("SELECT * FROM twitch_links WHERE enabled = 1 ORDER BY user_id").fetchall()
    return [_link(r) for r in rows]


def mark_vod(user_id: int, vod_id: str, error: str | None = None) -> None:
    """Remember the last VOD handled for this user (and why it failed, if it did)."""
    ensure_schema()
    accounts.execute("UPDATE twitch_links SET last_vod_id = ?, last_error = ?, updated_at = ? WHERE user_id = ?",
                     (vod_id, error, time.time(), user_id))


# ---------------------------------------------------------------- automatic import after each live

class AutoImporter:
    """Watches the linked channels and starts an analysis of each new VOD once the live is over.

    `start_job(user_id, settings, vod)` gets the settings saved with the link and latest_archive()'s dict."""

    def __init__(self, start_job: Callable[[int, dict, dict], None], interval_s: float | None = None,
                 clock: Callable[[], float] = time.time):
        self.start_job = start_job
        self.interval_s = float(interval_s if interval_s is not None else config.TWITCH_POLL_MINUTES * 60)
        self.clock = clock
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._poll_lock = threading.Lock()  # never two polls at once (same VOD started twice)

    def start(self) -> None:
        if self._thread is not None and self._thread.is_alive():
            return
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, args=(self._stop,), daemon=True, name="clipzo-twitch")
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        thread, self._thread = self._thread, None
        if thread is not None and thread is not threading.current_thread():
            thread.join(timeout=2)

    def _run(self, stop: threading.Event) -> None:
        delay = min(self.interval_s, START_DELAY)
        while not stop.wait(delay):
            try:
                self.poll_once()
            except Exception:  # noqa: BLE001 - the watcher must survive anything
                log.exception("Twitch auto-import: poll failed")
            delay = self.interval_s

    def poll_once(self) -> int:
        """One pass over the enabled links. Returns how many imports were started."""
        if not helix_configured():
            return 0
        with self._poll_lock:
            links = enabled_links()
            api = helix()
            now = self.clock()
            started = 0
            for k in range(0, len(links), HELIX_MAX_IDS):
                batch = links[k:k + HELIX_MAX_IDS]
                live = api.live_streams([link["broadcaster_id"] for link in batch])
                if live is None:
                    continue  # unknown: a channel may be live, look again next time
                for link in batch:
                    if link["broadcaster_id"] in live:
                        continue  # its VOD is still growing
                    try:
                        started += self._import_new_vod(api, link, now)
                    except Exception:  # noqa: BLE001 - one bad link never blocks the others
                        log.exception("Twitch auto-import failed for user %s", link["user_id"])
            return started

    def _import_new_vod(self, api: Helix, link: dict, now: float) -> int:
        v = api.latest_archive(link["broadcaster_id"])
        if not v or v["id"] == link["last_vod_id"] or v["created_at"] <= now - IMPORT_MAX_AGE:
            return 0
        if v["created_at"] + v["duration"] > now - IMPORT_SETTLE:
            return 0  # ended a moment ago: the live may resume in the same VOD
        mark_vod(link["user_id"], v["id"])  # first: a failing VOD must never be retried in a loop
        try:
            self.start_job(link["user_id"], dict(link["settings"]), v)
        except Exception as exc:  # noqa: BLE001 - recorded for the creator, the watcher goes on
            log.warning("Twitch auto-import of VOD %s for user %s failed: %s", v["id"], link["user_id"], exc)
            mark_vod(link["user_id"], v["id"], error=str(exc)[:300])
            return 0
        log.info("Twitch auto-import: VOD %s started for user %s", v["id"], link["user_id"])
        return 1
