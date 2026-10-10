import json
import os
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import pytest

from server import accounts, config, twitch

NOW = 1_800_000_000.0  # fixed "now" for the auto-import tests
HOUR = 3600.0


class FakeResponse:
    def __init__(self, payload):
        self.body = payload if isinstance(payload, bytes) else json.dumps(payload).encode()

    def read(self, n=-1):
        return self.body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeNet:
    """Replaces urllib.request.urlopen: hands every request to `handler` and records it."""

    def __init__(self, handler):
        self.handler = handler
        self.calls = []

    def __call__(self, req, timeout=None):
        assert timeout is not None and 0 < timeout <= 30, "every request needs a timeout"
        call = SimpleNamespace(url=req.full_url, method=req.get_method(), body=req.data, timeout=timeout,
                               headers={k.lower(): v for k, v in req.header_items()})
        self.calls.append(call)
        result = self.handler(call)
        if isinstance(result, Exception):
            raise result
        return FakeResponse(result)


@pytest.fixture
def net(monkeypatch):
    def install(handler):
        fake = FakeNet(handler)
        monkeypatch.setattr(urllib.request, "urlopen", fake)
        return fake
    return install


@pytest.fixture(autouse=True)
def no_wait(monkeypatch):
    sleeps = []
    monkeypatch.setattr(twitch, "_sleep", sleeps.append)
    return sleeps


def http_error(code, headers=None):
    return urllib.error.HTTPError("https://example.invalid", code, "error", headers or {}, None)


# ------------------------------------------------------------------------------ links

@pytest.mark.parametrize("url,vod", [
    ("https://www.twitch.tv/videos/123456789", "123456789"),
    ("https://twitch.tv/videos/123456789?t=1h2m3s", "123456789"),
    ("https://m.twitch.tv/videos/123456789/", "123456789"),
    ("www.twitch.tv/videos/42?filter=archives&sort=time", "42"),
    ("HTTPS://WWW.TWITCH.TV/videos/77", "77"),
    ("https://www.twitch.tv/gotaga/v/555", "555"),
    ("https://clips.twitch.tv/SomeClipSlug", None),
    ("https://www.twitch.tv/gotaga/clip/SomeClipSlug", None),
    ("https://www.twitch.tv/gotaga", None),
    ("https://www.twitch.tv/videos/abc", None),
    ("https://evil.example/videos/123", None),
    ("https://twitch.tv.evil.example/videos/123", None),
    ("", None),
])
def test_vod_id_from_url(url, vod):
    assert twitch.vod_id_from_url(url) == vod


@pytest.mark.parametrize("text,login", [
    ("Gotaga", "gotaga"), ("@gotaga", "gotaga"), (" twitch.tv/Gotaga ", "gotaga"),
    ("https://www.twitch.tv/gotaga/videos", "gotaga"), ("https://www.twitch.tv/videos/123", None),
    ("ab", None), ("pas un pseudo", None), ("https://evil.example/gotaga", None),
])
def test_normalize_login(text, login):
    assert twitch.normalize_login(text) == login


@pytest.mark.parametrize("text,seconds", [
    ("3h2m1s", 10921.0), ("45m", 2700.0), ("59s", 59.0), ("1h", 3600.0), ("1h0m5s", 3605.0),
    ("", 0.0), (None, 0.0), ("abc", 0.0), ("3h2x", 0.0),
])
def test_parse_duration(text, seconds):
    assert twitch.parse_duration(text) == seconds


def test_time_helpers():
    ts = datetime(2026, 10, 9, 18, 0, tzinfo=timezone.utc).timestamp()
    assert twitch.parse_time("2026-10-09T18:00:00Z") == ts
    assert twitch.parse_time("2026-10-09T18:00:00.523Z") == ts + 0.523
    assert twitch.parse_time("hier") is None and twitch.parse_time(None) is None
    assert twitch.rfc3339(ts) == "2026-10-09T18:00:00Z"


# ------------------------------------------------------------------------------ chat replay

def chat_server(comments, page_size=20, with_ids=True):
    """GraphQL endpoint over `comments` [(offset, text)]: answers from the requested offset onwards."""
    comments = sorted(comments, key=lambda c: c[0])

    def handler(call):
        assert call.url == twitch.GQL_URL and call.method == "POST"
        ops = json.loads(call.body)
        assert isinstance(ops, list) and len(ops) == 1
        op = ops[0]
        assert op["operationName"] == "VideoCommentsByOffsetOrCursor"
        assert op["extensions"] == {"persistedQuery": {"version": 1, "sha256Hash": twitch.GQL_COMMENTS_HASH}}
        assert set(op["variables"]) == {"videoID", "contentOffsetSeconds"}, "offset paging only, never a cursor"
        offset = op["variables"]["contentOffsetSeconds"]
        assert isinstance(offset, int)
        rest = [(i, c) for i, c in enumerate(comments) if c[0] >= offset]
        page = rest[:page_size]
        edges = []
        for i, (t, text) in page:
            node = {"contentOffsetSeconds": t, "message": {"fragments": [{"text": w} for w in text.split("|")]}}
            if with_ids:
                node["id"] = f"c{i}"
            edges.append({"cursor": f"cur{i}", "node": node})
        has_next = len(rest) > page_size
        return [{"data": {"video": {"id": op["variables"]["videoID"],
                                    "comments": {"edges": edges, "pageInfo": {"hasNextPage": has_next}}}}}]
    return handler


def test_chat_pages_by_offset_and_dedupes(net):
    # 2 messages per second for 300 s, plus 30 identical "KEKW" from different viewers in the same second
    comments = [(t, f"msg {t} {k}") for t in range(300) for k in range(2)] + [(150, "KEKW") for _ in range(30)]
    fake = net(chat_server(comments, page_size=40))
    fractions = []
    out = twitch.fetch_chat("123456789", 300.0, progress=fractions.append)

    assert len(out) == len(comments), "overlapping pages are deduplicated, distinct viewers are not"
    assert out == sorted(out, key=lambda m: m[0])
    assert sum(1 for _, text in out if text == "KEKW") == 30
    offsets = [json.loads(c.body)[0]["variables"]["contentOffsetSeconds"] for c in fake.calls]
    assert offsets[0] == 0 and offsets == sorted(offsets) and len(set(offsets)) == len(offsets)
    first = fake.calls[0]
    assert first.headers["client-id"] == config.TWITCH_GQL_CLIENT_ID
    assert first.headers["content-type"] == "application/json"
    assert json.loads(first.body)[0]["variables"]["videoID"] == "123456789"
    assert fractions == sorted(fractions) and fractions[-1] == 1.0


def test_chat_dedupes_by_offset_and_text_without_ids(net):
    comments = [(t, f"salut {t}") for t in range(0, 100)]
    net(chat_server(comments, page_size=7, with_ids=False))
    out = twitch.fetch_chat("1", 100)
    assert out == [(float(t), f"salut {t}") for t in range(100)]


def test_chat_moves_on_when_a_second_is_fuller_than_a_page(net):
    comments = [(10, f"spam {k}") for k in range(50)] + [(11, "après"), (40, "fin")]
    fake = net(chat_server(comments, page_size=20))
    out = twitch.fetch_chat("1", 60)
    assert (11.0, "après") in out and (40.0, "fin") in out
    offsets = [json.loads(c.body)[0]["variables"]["contentOffsetSeconds"] for c in fake.calls]
    assert offsets[:3] == [0, 10, 11], "+1 when the offset did not advance"


def test_chat_stops_at_the_end_of_the_vod_and_caps_messages(net):
    comments = [(t, "x" * 500 if t == 5 else "ok") for t in range(0, 1000, 2)]
    fake = net(chat_server(comments, page_size=10))
    out = twitch.fetch_chat("1", 100.0)
    assert max(t for t, _ in out) <= 101
    assert all(json.loads(c.body)[0]["variables"]["contentOffsetSeconds"] < 100 for c in fake.calls)
    assert all(len(text) <= twitch.MESSAGE_MAX_CHARS for _, text in out)


@pytest.mark.parametrize("refusal", [
    [{"errors": [{"message": "PersistedQueryNotFound"}]}],
    [{"data": {"video": None}}],
    [{"data": {}, "extensions": {"challenge": "integrity"}}],
])
def test_chat_stops_when_twitch_refuses(net, refusal):
    good = chat_server([(t, "hello") for t in range(200)], page_size=10)
    seen = []

    def handler(call):
        seen.append(call)
        return good(call) if len(seen) == 1 else refusal
    net(handler)
    out = twitch.fetch_chat("1", 200)
    assert len(out) == 10, "what was gathered before the refusal is kept"
    assert len(seen) == 2, "no retry after a refusal"


def test_chat_deadline(net, monkeypatch):
    now = [0.0]
    monkeypatch.setattr(twitch, "_clock", lambda: now[0])
    good = chat_server([(t, "hello") for t in range(3000)], page_size=5)

    def handler(call):
        now[0] += 40.0  # every request takes 40 s
        return good(call)
    fake = net(handler)
    out = twitch.fetch_chat("1", 3000, deadline=100.0)
    assert len(fake.calls) == 3, "40 s, 80 s, 120 s: no 4th request after the 100 s deadline"
    assert out == [(float(t), "hello") for t in range(13)], "pages overlap by their last second"


def test_chat_honours_retry_after_and_stops_after_three_failures(net, no_wait):
    good = chat_server([(t, "hello") for t in range(10)], page_size=50)
    answers = iter([http_error(429, {"Retry-After": "2"}), http_error(429, {"Retry-After": "60"})])

    def handler(call):
        return next(answers, None) or good(call)
    net(handler)
    assert len(twitch.fetch_chat("1", 10)) == 10
    assert no_wait == [2.0, twitch.CHAT_MAX_RETRY_AFTER], "Retry-After honoured, capped at ~5 s"

    no_wait.clear()
    fake = net(lambda call: urllib.error.URLError("connection reset"))
    assert twitch.fetch_chat("1", 10) == []
    assert len(fake.calls) == twitch.CHAT_MAX_FAILURES and len(no_wait) == 2 and all(0 < s <= 5 for s in no_wait)


def test_chat_never_raises(net):
    fake = net(lambda call: b"<html>not json</html>")
    assert twitch.fetch_chat("1", 100) == []
    assert len(fake.calls) == twitch.CHAT_MAX_FAILURES

    fake = net(lambda call: [{"data": {"video": {"comments": None}}}])
    assert twitch.fetch_chat("1", 100) == [], "a VOD without chat"

    net(chat_server([(t, "hello") for t in range(100)], page_size=10))

    def cancelled(fraction):
        raise RuntimeError("job cancelled")
    assert len(twitch.fetch_chat("1", 100, progress=cancelled)) == 10, "a raising progress just stops"

    fake = net(lambda call: pytest.fail("no request for an invalid id"))
    assert twitch.fetch_chat("../etc", 100) == []


# ------------------------------------------------------------------------------ Helix

class FakeHelix:
    """The Twitch API: token endpoint, users, videos, streams and clips."""

    def __init__(self):
        self.tokens = []
        self.users = {"gotaga": {"id": "111", "login": "gotaga", "display_name": "Gotaga"}}
        self.videos = {}  # user_id -> rows, newest first
        self.live = {}  # user_id -> stream id
        self.clip_pages = [{"data": []}]
        self.down = set()  # paths answering 500
        self.reject_tokens = False  # every API call answers 401
        self.requests = []

    def video(self, user_id, vid, created_at, duration="3h0m0s", stream_id=None):
        row = {"id": vid, "user_id": user_id, "title": f"Live {vid}", "type": "archive", "duration": duration,
               "created_at": datetime.fromtimestamp(created_at, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
               "url": f"https://www.twitch.tv/videos/{vid}", "stream_id": stream_id}
        self.videos.setdefault(user_id, []).insert(0, row)

    def __call__(self, call):
        if call.url == twitch.TOKEN_URL:
            assert call.method == "POST"
            assert parse_qs(call.body.decode()) == {
                "client_id": ["cid"], "client_secret": ["secret"], "grant_type": ["client_credentials"]}
            self.tokens.append(f"tok{len(self.tokens) + 1}")
            return {"access_token": self.tokens[-1], "expires_in": 3600, "token_type": "bearer"}
        parts = urlsplit(call.url)
        assert parts.scheme == "https" and parts.netloc == "api.twitch.tv" and call.method == "GET"
        assert call.headers["client-id"] == "cid"
        if self.reject_tokens or not self.tokens or call.headers["authorization"] != f"Bearer {self.tokens[-1]}":
            return http_error(401)
        path, q = parts.path.removeprefix("/helix/"), parse_qs(parts.query)
        self.requests.append((path, q))
        if path in self.down:
            return http_error(500)
        if path == "users":
            user = self.users.get(q["login"][0])
            return {"data": [user] if user else []}
        if path == "videos":
            assert q["type"] == ["archive"]
            return {"data": self.videos.get(q["user_id"][0], [])[: int(q["first"][0])], "pagination": {}}
        if path == "streams":
            assert q["type"] == ["live"] and len(q["user_id"]) <= 100
            return {"data": [{"id": self.live[u], "user_id": u, "type": "live"} for u in q["user_id"] if u in self.live]}
        if path == "clips":
            page = int(q["after"][0].removeprefix("p")) if "after" in q else 0
            return self.clip_pages[page]
        raise AssertionError(path)


@pytest.fixture
def api(net, monkeypatch):
    monkeypatch.setattr(config, "TWITCH_CLIENT_ID", "cid")
    monkeypatch.setattr(config, "TWITCH_CLIENT_SECRET", "secret")
    monkeypatch.setattr(twitch, "_helix", None)
    fake = FakeHelix()
    fake.net = net(fake)
    return fake


def test_helix_configured(monkeypatch):
    monkeypatch.setattr(config, "TWITCH_CLIENT_ID", "")
    monkeypatch.setattr(config, "TWITCH_CLIENT_SECRET", "secret")
    assert not twitch.helix_configured()
    monkeypatch.setattr(config, "TWITCH_CLIENT_ID", "cid")
    assert twitch.helix_configured()
    assert twitch.helix() is twitch.helix()


def test_token_is_cached_until_shortly_before_expiry(api):
    now = [1000.0]
    h = twitch.Helix(clock=lambda: now[0])
    assert h.get_user("Gotaga") == {"id": "111", "login": "gotaga", "display_name": "Gotaga"}
    assert h.get_user("@gotaga")["id"] == "111"
    assert len(api.tokens) == 1
    now[0] += 3600 - 61
    h.get_user("gotaga")
    assert len(api.tokens) == 1
    now[0] += 2  # less than 60 s left: renewed
    h.get_user("gotaga")
    assert len(api.tokens) == 2


def test_token_is_renewed_once_on_401(api):
    h = twitch.Helix()
    h.get_user("gotaga")
    api.tokens.append("revoked-elsewhere")  # Twitch now only accepts a token we don't have
    assert h.get_user("gotaga")["id"] == "111"
    assert len(api.tokens) == 3, "one new token after the 401"

    calls = len(api.net.calls)
    api.reject_tokens = True
    assert h.get_user("gotaga") is None
    assert len(api.net.calls) - calls == 3, "API, new token, API again: then give up"


def test_get_user_unknown_or_invalid(api):
    h = twitch.Helix()
    assert h.get_user("inconnu") is None
    calls = len(api.net.calls)
    assert h.get_user("pas valide!") is None
    assert len(api.net.calls) == calls, "an invalid login never reaches Twitch"


def test_latest_archive(api):
    created = datetime(2026, 10, 9, 18, 0, tzinfo=timezone.utc).timestamp()
    api.video("111", "900", created - 86400)
    api.video("111", "987", created, duration="3h2m1s")
    assert twitch.helix().latest_archive("111") == {
        "id": "987", "url": "https://www.twitch.tv/videos/987", "title": "Live 987",
        "created_at": created, "duration": 10921.0,
    }
    path, q = api.requests[-1]
    assert path == "videos" and q == {"user_id": ["111"], "type": ["archive"], "first": ["1"]}
    assert twitch.helix().latest_archive("222") is None


def test_live_user_ids_in_batches_of_100(api):
    ids = [str(1000 + i) for i in range(250)]
    api.live = {"1005": "s1", "1180": "s2"}
    assert twitch.helix().live_user_ids(ids) == {"1005", "1180"}
    batches = [q["user_id"] for path, q in api.requests if path == "streams"]
    assert [len(b) for b in batches] == [100, 100, 50]
    assert twitch.helix().live_user_ids([]) == set()


def clip(vod, offset, views=10, duration=30.0):
    return {"id": f"clip{offset}", "video_id": vod, "vod_offset": offset, "duration": duration,
            "view_count": views, "title": f"clip à {offset}"}


def test_vod_clips_filtered_by_video_and_paginated(api):
    api.clip_pages = [
        {"data": [clip("987", 600, 5000), clip("555", 100), clip("987", None), clip("", 50)],
         "pagination": {"cursor": "p1"}},
        {"data": [clip("987", 1200.5, 7, 25.4)], "pagination": {}},
    ]
    started = datetime(2026, 10, 9, 18, 0, tzinfo=timezone.utc).timestamp()
    out = twitch.helix().vod_clips("111", "987", started, started + 6 * HOUR)
    assert out == [
        {"offset": 600.0, "duration": 30.0, "views": 5000, "title": "clip à 600"},
        {"offset": 1200.5, "duration": 25.4, "views": 7, "title": "clip à 1200.5"},
    ]
    (p1, q1), (p2, q2) = [r for r in api.requests if r[0] == "clips"]
    assert q1 == {"broadcaster_id": ["111"], "started_at": ["2026-10-09T18:00:00Z"],
                  "ended_at": ["2026-10-10T00:00:00Z"], "first": ["100"]}
    assert q2["after"] == ["p1"]


def test_vod_clips_stops_after_ten_pages(api):
    api.clip_pages = [{"data": [clip("987", i * 60)], "pagination": {"cursor": f"p{i + 1}"}} for i in range(20)]
    out = twitch.helix().vod_clips("111", "987", NOW - HOUR, NOW)
    assert len(out) == twitch.CLIPS_MAX_PAGES
    assert sum(1 for r in api.requests if r[0] == "clips") == twitch.CLIPS_MAX_PAGES


def test_helix_errors_never_raise(api):
    api.down = {"users", "videos", "streams", "clips"}
    h = twitch.helix()
    assert h.get_user("gotaga") is None
    assert h.latest_archive("111") is None
    assert h.live_user_ids(["111"]) == set() and h.live_streams(["111"]) is None
    assert h.vod_clips("111", "987", NOW - HOUR, NOW) == []
    api.net.handler = lambda call: urllib.error.URLError("no route to host")
    assert twitch.Helix().get_user("gotaga") is None


def test_helix_not_configured_makes_no_request(net, monkeypatch):
    monkeypatch.setattr(config, "TWITCH_CLIENT_ID", "")
    fake = net(lambda call: pytest.fail("no request without keys"))
    assert twitch.Helix().get_user("gotaga") is None
    assert twitch.Helix().vod_clips("1", "2", NOW - HOUR, NOW) == []
    assert not fake.calls


# ------------------------------------------------------------------------------ storage

@pytest.fixture
def db():
    data_dir = os.path.realpath(os.environ["CLIPZO_DATA_DIR"])
    assert os.path.realpath(config.DB_PATH).startswith(data_dir), "tests must use the test data folder"
    twitch.ensure_schema()
    accounts.execute("DELETE FROM twitch_links")
    yield
    accounts.execute("DELETE FROM twitch_links")


def test_storage_round_trip(db):
    assert twitch.get_link(7) is None
    twitch.save_link(7, "Gotaga", "111", True, {"duration": 60, "count": 3, "note": "réglé"}, "900")
    link = twitch.get_link(7)
    assert link["login"] == "gotaga" and link["broadcaster_id"] == "111" and link["enabled"] is True
    assert link["settings"] == {"duration": 60, "count": 3, "note": "réglé"}
    assert link["last_vod_id"] == "900" and link["last_error"] is None and link["updated_at"]

    twitch.mark_vod(7, "987", error="Vidéo trop longue")
    assert twitch.get_link(7)["last_vod_id"] == "987" and twitch.get_link(7)["last_error"] == "Vidéo trop longue"
    twitch.save_link(7, "gotaga", "111", False, {"count": 5}, "987")
    link = twitch.get_link(7)
    assert link["enabled"] is False and link["settings"] == {"count": 5}
    assert link["last_error"] == "Vidéo trop longue", "same channel: the last error stays visible"
    twitch.save_link(7, "autre", "222", True, {}, None)
    assert twitch.get_link(7)["last_error"] is None, "another channel starts clean"

    twitch.save_link(8, "zerator", "333", False, {}, None)
    assert [link["user_id"] for link in twitch.enabled_links()] == [7]
    twitch.delete_link(7)
    assert twitch.get_link(7) is None and twitch.enabled_links() == []
    accounts.execute("UPDATE twitch_links SET settings = 'pas du json' WHERE user_id = 8")
    assert twitch.get_link(8)["settings"] == {}


def test_storage_creates_its_table_lazily(db):
    accounts.execute("DROP TABLE twitch_links")
    assert twitch.enabled_links() == []
    twitch.save_link(9, "gotaga", "111", True, {}, None)
    assert twitch.get_link(9)["enabled"] is True


# ------------------------------------------------------------------------------ automatic import

@pytest.fixture
def watcher(api, db):
    started = []

    def start_job(user_id, settings, vod):
        started.append((user_id, settings, vod))
        if settings.get("explode"):
            raise RuntimeError("quota dépassé " + "x" * 400)

    imp = twitch.AutoImporter(start_job, interval_s=60, clock=lambda: NOW)
    return SimpleNamespace(api=api, imp=imp, started=started)


def test_new_vod_is_imported_once_with_the_settings(watcher):
    settings = {"duration": 60, "count": 3, "options": {"subs": True}}
    twitch.save_link(1, "gotaga", "111", True, settings, "900")
    watcher.api.video("111", "987", NOW - 5 * HOUR, duration="3h0m0s")

    assert watcher.imp.poll_once() == 1
    assert len(watcher.started) == 1
    user_id, got_settings, vod = watcher.started[0]
    assert user_id == 1 and got_settings == settings
    assert vod["id"] == "987" and vod["url"] == "https://www.twitch.tv/videos/987" and vod["duration"] == 3 * HOUR
    assert twitch.get_link(1)["last_vod_id"] == "987" and twitch.get_link(1)["last_error"] is None

    assert watcher.imp.poll_once() == 0
    assert len(watcher.started) == 1, "never imported twice"


def test_live_channel_is_skipped_until_the_live_ends(watcher):
    twitch.save_link(1, "gotaga", "111", True, {}, "900")
    watcher.api.video("111", "987", NOW - 2 * HOUR, duration="2h0m0s", stream_id="s9")
    watcher.api.live = {"111": "s9"}
    assert watcher.imp.poll_once() == 0 and not watcher.started
    assert twitch.get_link(1)["last_vod_id"] == "900"

    watcher.api.live = {}
    watcher.imp.clock = lambda: NOW + 10 * 60
    assert watcher.imp.poll_once() == 1 and watcher.started[0][2]["id"] == "987"


def test_vod_that_just_stopped_waits_a_little(watcher):
    twitch.save_link(1, "gotaga", "111", True, {}, None)
    watcher.api.video("111", "987", NOW - 2 * HOUR, duration="1h59m0s")  # ended a minute ago
    assert watcher.imp.poll_once() == 0
    watcher.imp.clock = lambda: NOW + twitch.IMPORT_SETTLE
    assert watcher.imp.poll_once() == 1


def test_already_processed_old_or_disabled_is_skipped(watcher):
    watcher.api.video("111", "987", NOW - 5 * HOUR)
    watcher.api.video("222", "654", NOW - 49 * HOUR)
    watcher.api.video("333", "321", NOW - 5 * HOUR)
    twitch.save_link(1, "gotaga", "111", True, {}, "987")  # already done
    twitch.save_link(2, "zerator", "222", True, {}, None)  # older than 48 h
    twitch.save_link(3, "squeezie", "333", False, {}, None)  # import turned off
    twitch.save_link(4, "nouveau", "444", True, {}, None)  # no VOD at all
    assert watcher.imp.poll_once() == 0 and not watcher.started


def test_failing_start_job_is_recorded_and_not_retried(watcher):
    twitch.save_link(1, "gotaga", "111", True, {"explode": True}, None)
    twitch.save_link(2, "zerator", "222", True, {}, None)
    watcher.api.video("111", "987", NOW - 5 * HOUR)
    watcher.api.video("222", "654", NOW - 5 * HOUR)

    assert watcher.imp.poll_once() == 1, "the other channel is still imported"
    link = twitch.get_link(1)
    assert link["last_vod_id"] == "987"
    assert link["last_error"].startswith("quota dépassé") and len(link["last_error"]) == 300
    assert watcher.imp.poll_once() == 0
    assert [s[0] for s in watcher.started] == [1, 2], "the failing VOD is not retried"


def test_unknown_live_status_imports_nothing(watcher):
    twitch.save_link(1, "gotaga", "111", True, {}, None)
    watcher.api.video("111", "987", NOW - 5 * HOUR)
    watcher.api.down = {"streams"}
    assert watcher.imp.poll_once() == 0 and not watcher.started


def test_helix_not_configured_does_nothing(watcher, monkeypatch):
    twitch.save_link(1, "gotaga", "111", True, {}, None)
    watcher.api.video("111", "987", NOW - 5 * HOUR)
    monkeypatch.setattr(config, "TWITCH_CLIENT_SECRET", "")
    calls = len(watcher.api.net.calls)
    assert watcher.imp.poll_once() == 0 and not watcher.started
    assert len(watcher.api.net.calls) == calls


def test_watcher_thread_starts_polls_and_stops(watcher):
    twitch.save_link(1, "gotaga", "111", True, {}, None)
    watcher.api.video("111", "987", NOW - 5 * HOUR)
    imp = twitch.AutoImporter(lambda *a: watcher.started.append(a), interval_s=0.01, clock=lambda: NOW)
    imp.start()
    try:
        deadline = time.monotonic() + 5
        while not watcher.started and time.monotonic() < deadline:
            time.sleep(0.01)
    finally:
        imp.stop()
    assert len(watcher.started) == 1
    assert not any(t.name == "clipzo-twitch" and t.is_alive() for t in threading.enumerate())


def test_watcher_survives_errors(watcher, monkeypatch):
    monkeypatch.setattr(twitch, "enabled_links", lambda: 1 / 0)
    imp = twitch.AutoImporter(lambda *a: None, interval_s=0.01, clock=lambda: NOW)
    polls = []
    real = imp.poll_once

    def poll():
        polls.append(1)
        return real()
    imp.poll_once = poll
    imp.start()
    try:
        deadline = time.monotonic() + 5
        while len(polls) < 3 and time.monotonic() < deadline:
            time.sleep(0.01)
    finally:
        imp.stop()
    assert len(polls) >= 3, "the thread keeps polling after an exception"


def test_default_interval_comes_from_config():
    assert twitch.AutoImporter(lambda *a: None).interval_s == config.TWITCH_POLL_MINUTES * 60


def test_current_latest_vod_id(api):
    assert twitch.current_latest_vod_id("111") is None
    api.video("111", "900", NOW - 30 * HOUR, stream_id="s1")
    assert twitch.current_latest_vod_id("111") == "900"
    api.video("111", "987", NOW - HOUR, stream_id="s2")
    assert twitch.current_latest_vod_id("111") == "987"
    api.live = {"111": "s2"}  # 987 is the live in progress: it will be imported when the live ends
    assert twitch.current_latest_vod_id("111") == "900"
