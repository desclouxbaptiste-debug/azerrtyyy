"""Linking a Twitch channel from the account, and what happens when the importer finds a new VOD."""

import pytest
from fastapi.testclient import TestClient

from server import accounts, config, jobs, notify, pipeline, twitch
from server import app as app_module
from test_api import as_user

SETTINGS = {"duration": 75, "count": 20, "options": {"subs": True, "layout": "streamer", "style": {"font": "anton"}}}


class FakeHelix:
    def __init__(self):
        self.latest = {"id": "2000", "url": "https://www.twitch.tv/videos/2000", "title": "Gros live",
                       "created_at": 0.0, "duration": 3600.0}

    def get_user(self, login):
        return {"id": "42", "login": login.lower(), "display_name": login} if login.lower() != "personne" else None


@pytest.fixture(scope="module")
def client():
    with TestClient(app_module.app) as c:
        yield c


@pytest.fixture
def helix(monkeypatch):
    fake = FakeHelix()
    monkeypatch.setattr(twitch, "helix_configured", lambda: True)
    monkeypatch.setattr(twitch, "helix", lambda: fake)
    monkeypatch.setattr(twitch, "current_latest_vod_id", lambda broadcaster_id: "1999")
    return fake


def test_link_needs_an_account_pro_and_twitch_keys(client, monkeypatch):
    client.cookies.clear()
    assert client.get("/api/me/twitch").status_code == 401
    as_user(client, "creator")
    r = client.post("/api/me/twitch", json={"login": "gotaga", "enabled": True})
    assert r.status_code == 403 and "Pro" in r.json()["detail"]
    as_user(client, "pro")
    monkeypatch.setattr(twitch, "helix_configured", lambda: False)
    assert client.get("/api/me/twitch").json() == {"available": False, "link": None}
    assert client.post("/api/me/twitch", json={"login": "gotaga", "enabled": True}).status_code == 503
    assert client.get("/api/health").json()["features"]["twitch_auto"] is False


def test_link_a_channel_then_turn_it_off(client, helix):
    user = as_user(client, "pro")
    r = client.post("/api/me/twitch", json={"login": "https://www.twitch.tv/Gotaga", "enabled": True,
                                            "settings": SETTINGS})
    assert r.status_code == 200, r.text
    assert r.json()["link"] == {"login": "gotaga", "enabled": True, "last_vod_id": "1999", "last_error": None,
                                "updated_at": r.json()["link"]["updated_at"]}
    stored = twitch.get_link(user.id)
    assert stored["settings"]["count"] == config.PLANS["pro"].max_clips  # clamped to the plan
    assert stored["settings"]["duration"] == 75 and stored["settings"]["options"]["layout"] == "streamer"

    assert client.post("/api/me/twitch", json={"login": "personne", "enabled": True}).status_code == 404
    assert client.post("/api/me/twitch", json={"login": "a b", "enabled": True}).status_code == 400
    r = client.post("/api/me/twitch", json={"login": "gotaga", "enabled": False, "settings": SETTINGS})
    assert r.json()["link"]["enabled"] is False and r.json()["link"]["last_vod_id"] == "1999"
    assert client.post("/api/me/twitch", json={"login": "", "enabled": False}).json() == {"link": None}
    assert twitch.get_link(user.id) is None


def test_a_new_vod_starts_an_analysis_that_emails_the_creator(client, helix, monkeypatch):
    user = as_user(client, "pro")
    started = []
    monkeypatch.setattr(app_module.store, "enqueue", lambda job: started.append(job))
    app_module._start_twitch_import(user.id, {**SETTINGS, "count": 3}, helix.latest)
    job = started[0]
    req = job.request
    assert req.url == "https://www.twitch.tv/videos/2000" and req.count == 3 and req.duration == 75
    assert req.notify is True and req.auto == {"kind": "twitch", "vod_id": "2000", "title": "Gros live"}
    assert req.options["layout"] == "streamer" and req.user_id == user.id

    # at the end of the analysis: an e-mail with a link to the shorts
    sent = []
    monkeypatch.setattr(notify, "smtp_configured", lambda: True)
    monkeypatch.setattr(notify, "send_async", lambda fn, *args: sent.append((fn, args)))
    job.status, job.clips = "done", [{"index": 0}, {"index": 1}]
    pipeline._after_auto_import(job)
    fn, args = sent[0]
    assert fn is notify.shorts_ready and args[0] == user.email and args[2] == 2 and args[3].endswith(f"/?job={job.id}")

    # a failed analysis is remembered on the link and the creator is told why
    twitch.save_link(user.id, "gotaga", "42", True, SETTINGS, "2000")
    job.status, job.error = "error", "Vidéo introuvable ou indisponible dans ton pays."
    pipeline._after_auto_import(job)
    assert sent[1][0] is notify.job_failed
    assert twitch.get_link(user.id)["last_error"] == job.error
    app_module.store.discard(job)  # never ran: don't leave it in the queue of the other tests


def test_import_refused_for_accounts_no_longer_pro(client, helix):
    user = as_user(client, "creator")
    with pytest.raises(RuntimeError, match="Pro"):
        app_module._start_twitch_import(user.id, SETTINGS, helix.latest)


def test_import_respects_the_queue_and_quota(client, helix, monkeypatch):
    user = as_user(client, "pro")
    monkeypatch.setattr(config, "MAX_QUEUED_JOBS", 0)
    with pytest.raises(jobs.QueueFull):
        app_module._start_twitch_import(user.id, SETTINGS, helix.latest)
    assert accounts.used_this_month(user.id) == 0
