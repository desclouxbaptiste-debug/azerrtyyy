import json
import time
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from conftest import needs_ffmpeg
from server import accounts, app as app_module
from server import config, transcribe

_seq = iter(range(1, 10_000))


def as_user(client, plan="free"):
    """Log the test client in as a brand new account on `plan`."""
    client.cookies.clear()
    email = f"user{next(_seq)}@example.com"
    r = client.post("/api/auth/signup", json={"email": email, "password": "motdepasse123"})
    assert r.status_code == 200, r.text
    user = accounts.get_user_by_email(email)
    accounts.set_plan(user.id, plan)
    return user


@pytest.fixture(scope="module")
def client():
    with TestClient(app_module.app) as c:
        yield c


def wait_for(client, job_id, timeout=300):
    deadline = time.time() + timeout
    while time.time() < deadline:
        data = client.get(f"/api/jobs/{job_id}").json()
        if data["status"] in ("done", "error"):
            return data
        time.sleep(0.5)
    raise AssertionError("job did not finish")


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True and set(body["plans"]) == {"free", "creator", "pro"}
    assert body["features"]["llm"] is False


def test_site_is_served_but_not_the_code(client):
    assert client.get("/").status_code == 200
    assert "text/html" in client.get("/").headers["content-type"]
    assert client.get("/main.js").status_code == 200
    assert client.get("/assets/logo.webp").status_code == 200
    for path in ["/server/app.py", "/server/config.py", "/data/jobs", "/requirements.txt",
                 "/assets/../server/app.py", "/assets/%2e%2e/server/app.py", "/README.md"]:
        assert client.get(path).status_code == 404, path


@pytest.mark.parametrize("payload,status,needle", [
    ({"url": "https://evil.example/video", "duration": 90, "count": 3, "plan": "free"}, 400, "YouTube"),
    ({"url": "https://youtu.be/abc", "duration": 90, "count": 8, "plan": "free"}, 400, "Gratuit"),
    ({"url": "https://youtu.be/abc", "duration": 30, "count": 3, "plan": "free"}, 422, None),
    ({"url": "https://youtu.be/abc", "duration": 90, "count": 3, "plan": "gold"}, 422, None),
])
def test_job_validation(client, payload, status, needle):
    as_user(client, "free")
    r = client.post("/api/jobs", json=payload)
    assert r.status_code == status
    if needle:
        assert needle in r.json()["detail"]


def test_unknown_job_and_bad_file_names(client):
    assert client.get("/api/jobs/" + "0" * 32).status_code == 404
    assert client.get("/api/jobs/../../etc").status_code == 404
    assert client.get("/api/jobs/" + "0" * 32 + "/clips/0.mp4").status_code == 404
    assert client.get("/api/jobs/" + "0" * 32 + "/clips/job.json").status_code == 404


def test_upload_rejects_non_video(client):
    as_user(client, "free")
    r = client.post("/api/jobs/upload", files={"file": ("x.mp4", b"not a video at all", "video/mp4")},
                    data={"duration": "60", "count": "1", "plan": "free", "options": "{}"})
    assert r.status_code == 400
    assert "vidéo" in r.json()["detail"]


def test_upload_without_file(client):
    as_user(client, "free")
    r = client.post("/api/jobs/upload", data={"duration": "60", "count": "1", "plan": "free"})
    assert r.status_code == 400


class FakeWhisper:
    """Stands in for faster-whisper: one French sentence every 6 s, hype words around 90-102 s."""

    def transcribe(self, audio, **kwargs):
        seconds = len(audio) / 16000
        segs = []
        for t in range(0, int(seconds) - 5, 6):
            hype = 88 <= t <= 102
            text = "Oh mon dieu c'est incroyable !" if hype else "On continue tranquillement la partie."
            words, x = [], float(t)
            for w in text.split():
                words.append(SimpleNamespace(start=x, end=x + 0.4, word=" " + w))
                x += 0.5
            segs.append(SimpleNamespace(start=float(t), end=x, text=" " + text, words=words))
        return iter(segs), SimpleNamespace(language="fr")


@needs_ffmpeg
def test_full_pipeline_with_upload(client, sample_video, monkeypatch):
    import anthropic

    monkeypatch.setattr(transcribe, "available", lambda: True)
    monkeypatch.setattr(transcribe, "_get_model", lambda: FakeWhisper())
    monkeypatch.setattr(config, "LLM_MODE", "on")
    requests = []

    def fake_create(**kw):
        requests.append(kw)
        prompt = kw["messages"][0]["content"]
        first_id = int(prompt.split('<candidate id="')[1].split('"')[0])
        payload = {"clips": [{"candidate_id": first_id, "virality": 91, "start": 0, "end": 99999,
                              "title": "Il n'en revient pas", "hook": "Attends la fin…",
                              "hashtags": ["#gaming", "clutch"], "why": ["Réaction très forte"]}]}
        return SimpleNamespace(stop_reason="end_turn", content=[SimpleNamespace(type="text", text=json.dumps(payload))])

    from test_llm import FakeStream

    def fake_stream(**kw):
        return FakeStream(fake_create(**kw))

    monkeypatch.setattr(anthropic, "Anthropic", lambda **kw: SimpleNamespace(
        beta=SimpleNamespace(messages=SimpleNamespace(stream=fake_stream)),
        messages=SimpleNamespace(stream=fake_stream)))

    options = {"reframe": True, "subs": True, "nowm": True, "hooks": True, "animsubs": True}
    as_user(client, "pro")
    with sample_video.open("rb") as fh:
        r = client.post("/api/jobs/upload", files={"file": ("ma video.mp4", fh, "video/mp4")},
                        data={"duration": "60", "count": "2", "plan": "pro", "options": json.dumps(options)})
    assert r.status_code == 202, r.text
    job = wait_for(client, r.json()["id"])
    assert job["status"] == "done", job
    assert job["signals"]["transcript"] and job["signals"]["llm"]
    assert job["source"]["title"] == "ma video" and job["source"]["platform"] == "upload"
    assert len(job["curve"]) == 150 or len(job["curve"]) == 240
    assert len(requests) == 1 and requests[0]["fallbacks"] == "default"

    clips = job["clips"]
    assert len(clips) >= 1
    top = clips[0]
    assert top["title"] == "Il n'en revient pas" and top["hashtags"] == ["#gaming", "#clutch"]
    assert top["start"] <= 95 <= top["end"]
    assert top["subtitles"] is True and top["layout"] == "blur"
    assert (top["width"], top["height"]) == (1080, 1920)
    assert 50 <= top["duration"] <= 70
    assert "Réaction très forte" in top["reasons"]

    video = client.get(top["video_url"], headers={"Range": "bytes=0-1023"})
    assert video.status_code == 206 and len(video.content) == 1024
    thumb = client.get(top["thumb_url"])
    assert thumb.status_code == 200 and thumb.content[:2] == b"\xff\xd8"

    # The heavy intermediates are deleted, the shorts stay.
    job_dir = config.JOBS_DIR / job["id"]
    assert not list(job_dir.glob("upload.*")) and not (job_dir / "audio.s16le").exists()


@needs_ffmpeg
def test_free_plan_gets_watermark_and_no_paid_options(client, sample_video):
    user = as_user(client, "free")
    with sample_video.open("rb") as fh:
        r = client.post("/api/jobs/upload", files={"file": ("clip.mp4", fh, "video/mp4")},
                        data={"duration": "60", "count": "1", "plan": "free",
                              "options": json.dumps({"subs": True, "nowm": True, "hooks": True})})
    assert r.status_code == 202, r.text
    job = wait_for(client, r.json()["id"])
    assert job["status"] == "done", job
    assert any("Sans filigrane" in w for w in job["warnings"])
    clip = job["clips"][0]
    assert (clip["width"], clip["height"]) == (720, 1280)
    assert clip["hashtags"] == [] and clip["subtitles"] is False
    # the delivered short is charged once the job is over
    assert accounts.used_this_month(user.id) == len(job["clips"])
    me = client.get("/api/me").json()["user"]
    assert me["quota"]["used"] == len(job["clips"]) and me["quota"]["reserved"] == 0


def test_client_id_uses_the_address_our_proxy_appended(monkeypatch):
    from starlette.requests import Request

    monkeypatch.setenv("CLIPZO_TRUST_PROXY", "1")
    scope = {"type": "http", "headers": [(b"x-forwarded-for", b"10.0.0.7, 203.0.113.9")], "client": ("127.0.0.1", 1)}
    assert app_module._client_id(Request(scope)) == "203.0.113.9"
    monkeypatch.delenv("CLIPZO_TRUST_PROXY")
    assert app_module._client_id(Request(scope)) == "127.0.0.1"


def test_upload_without_length_is_refused(client):
    def body():
        yield b"--x\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.mp4\"\r\n\r\n"
        yield b"0" * 1000
        yield b"\r\n--x--\r\n"

    r = client.post("/api/jobs/upload", content=body(),
                    headers={"content-type": "multipart/form-data; boundary=x"})
    assert r.status_code == 411


def test_cancel_unknown_job(client):
    assert client.post("/api/jobs/" + "0" * 32 + "/cancel").status_code == 404


@needs_ffmpeg
def test_cancel_stops_a_running_job(client, sample_video):
    user = as_user(client, "creator")
    with sample_video.open("rb") as fh:
        r = client.post("/api/jobs/upload", files={"file": ("c.mp4", fh, "video/mp4")},
                        data={"duration": "60", "count": "1", "plan": "free", "options": "{}"})
    job_id = r.json()["id"]
    deadline = time.time() + 30
    while client.get(f"/api/jobs/{job_id}").json()["status"] == "queued" and time.time() < deadline:
        time.sleep(0.1)
    assert client.post(f"/api/jobs/{job_id}/cancel").status_code == 200
    data = wait_for(client, job_id, timeout=60)
    assert data["status"] == "error" and data["error"] == "Analyse annulée."
    assert data["clips"] == []
    assert accounts.used_this_month(user.id) == 0  # a cancelled analysis costs nothing
