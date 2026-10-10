"""Re-editing the shorts after the analysis: retouche, autre moment, satisfait ou recrédité."""

import json
import time

import pytest
from fastapi.testclient import TestClient

from conftest import make_sample_video, needs_ffmpeg
from server import accounts, config, transcribe
from server import app as app_module
from test_api import FakeWhisper, as_user, wait_for


@pytest.fixture(scope="module")
def client():
    with TestClient(app_module.app) as c:
        yield c


@pytest.fixture(scope="module")
def long_video(tmp_path_factory):
    # 5 min with one loud moment: room for several distinct 60 s shorts (spare moments for "autre moment")
    return make_sample_video(tmp_path_factory.mktemp("edit") / "long.mp4", seconds=300, hype_at=150)


def upload(client, path, plan, count=1, duration=60, options=None):
    with path.open("rb") as fh:
        r = client.post("/api/jobs/upload", files={"file": ("ma video.mp4", fh, "video/mp4")},
                        data={"duration": str(duration), "count": str(count), "plan": plan,
                              "options": json.dumps(options or {})})
    assert r.status_code == 202, r.text
    return wait_for(client, r.json()["id"])


def wait_ready(client, job_id, index, timeout=180):
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = client.get(f"/api/jobs/{job_id}").json()
        clip = next((c for c in job["clips"] if c["index"] == index), None)
        if clip is None or clip["status"] != "rendering":
            return job, clip
        time.sleep(0.5)
    raise AssertionError("edit did not finish")


@needs_ffmpeg
def test_recut_a_short_word_by_word(client, sample_video, monkeypatch):
    monkeypatch.setattr(transcribe, "available", lambda: True)
    monkeypatch.setattr(transcribe, "_get_model", lambda: FakeWhisper())
    user = as_user(client, "creator")
    job = upload(client, sample_video, "creator", options={"subs": True})
    assert job["status"] == "done", job
    assert job["edit"]["available"] is True
    clip = job["clips"][0]
    jid, idx = job["id"], clip["index"]
    first_url = clip["video_url"]
    source_files = list((config.JOBS_DIR / jid).glob("upload.*"))
    assert source_files, "the source is kept for re-editing"

    words = client.get(f"/api/jobs/{jid}/clips/{idx}/words").json()
    assert words["words"] and words["min"] <= clip["start"] and words["max"] >= clip["end"]
    # new edges on word boundaries, a bit later than the original start
    later = next(w for w in words["words"] if w[0] > clip["start"] + 3)
    end = min(words["max"], later[0] + 40)
    r = client.post(f"/api/jobs/{jid}/clips/{idx}/recut", json={"start": later[0], "end": end})
    assert r.status_code == 202, r.text
    job, clip = wait_ready(client, jid, idx)
    assert clip["edit_error"] is None and clip["version"] == 1
    assert abs(clip["start"] - later[0]) < 0.05 and 38 <= clip["duration"] <= 41
    assert clip["video_url"] != first_url and clip["video_url"].endswith("-v1.mp4")
    assert clip["recuts_left"] == config.MAX_RECUTS_PER_CLIP - 1
    assert clip["subtitles"] is True
    assert client.get(clip["video_url"], headers={"Range": "bytes=0-99"}).status_code == 206
    assert client.get(first_url).status_code == 404  # the previous version is deleted
    # free: the quota is untouched
    assert accounts.used_this_month(user.id) == 1


@needs_ffmpeg
def test_recut_rules(client, sample_video):
    owner = as_user(client, "creator")
    job = upload(client, sample_video, "creator")
    jid, clip = job["id"], job["clips"][0]
    idx, s, e = clip["index"], clip["start"], clip["end"]
    url = f"/api/jobs/{jid}/clips/{idx}/recut"

    too_far = client.post(url, json={"start": max(0, s - config.EDIT_MARGIN_SECONDS - 5), "end": e})
    too_short = client.post(url, json={"start": s, "end": s + config.MIN_EDIT_SECONDS - 1})
    same = client.post(url, json={"start": s, "end": e})
    assert too_far.status_code == 400 and "30 s" in too_far.json()["detail"]
    assert too_short.status_code == 400 and too_short.json()["detail"].startswith("Un short doit durer")
    assert same.status_code == 400
    assert client.post(f"/api/jobs/{jid}/clips/99/recut", json={"start": s, "end": e - 5}).status_code == 404

    as_user(client, "creator")  # somebody else
    assert client.post(url, json={"start": s, "end": e - 5}).status_code == 403
    assert client.post(f"/api/jobs/{jid}/clips/{idx}/replace").status_code == 403
    client.cookies.clear()
    assert client.post(url, json={"start": s, "end": e - 5}).status_code == 401

    # once the source is no longer kept, re-editing is refused clearly
    client.cookies.set("clipzo_session", accounts.create_session(owner.id))
    real = app_module.store.get(jid)
    real.editable_until = time.time() - 1
    gone = client.post(url, json={"start": s, "end": e - 5})
    assert gone.status_code == 410 and "relance l'analyse" in gone.json()["detail"]
    assert client.get(f"/api/jobs/{jid}").json()["edit"]["available"] is False
    app_module.store._cleanup()
    assert not list((config.JOBS_DIR / jid).glob("upload.*")) and real.source_file is None
    assert client.get(clip["video_url"], headers={"Range": "bytes=0-99"}).status_code == 206  # the short stays


@needs_ffmpeg
def test_replace_with_another_moment(client, long_video):
    user = as_user(client, "creator")
    job = upload(client, long_video, "creator", count=1)
    jid, clip = job["id"], job["clips"][0]
    assert job["edit"]["replaces_left"] == config.MAX_REPLACES_PER_JOB
    r = client.post(f"/api/jobs/{jid}/clips/{clip['index']}/replace")
    assert r.status_code == 202, r.text
    job, new = wait_ready(client, jid, clip["index"])
    assert new["edit_error"] is None and new["version"] == 1
    assert abs(new["start"] - clip["start"]) > 20  # a different moment
    assert job["edit"]["replaces_left"] == config.MAX_REPLACES_PER_JOB - 1
    assert accounts.used_this_month(user.id) == 1  # still one short of the quota


@needs_ffmpeg
def test_satisfait_ou_recredite(client, sample_video, monkeypatch):
    user = as_user(client, "free")
    job = upload(client, sample_video, "free", count=2)
    assert job["edit"]["refundable"] is True
    assert accounts.used_this_month(user.id) == len(job["clips"]) == 2
    jid, first, second = job["id"], job["clips"][0], job["clips"][1]

    r = client.post(f"/api/jobs/{jid}/clips/{first['index']}/refund")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["refunds_left"] == config.REFUNDS_PER_MONTH - 1
    assert body["user"]["quota"]["used"] == 1 and body["user"]["refunds"]["left"] == config.REFUNDS_PER_MONTH - 1
    assert [c["index"] for c in body["job"]["clips"]] == [second["index"]]  # gone from the results
    assert client.get(first["video_url"]).status_code == 404  # and from the disk
    assert client.post(f"/api/jobs/{jid}/clips/{first['index']}/refund").status_code == 404

    monkeypatch.setattr(config, "REFUNDS_PER_MONTH", 1)  # allowance used up
    r = client.post(f"/api/jobs/{jid}/clips/{second['index']}/refund")
    assert r.status_code == 429 and accounts.used_this_month(user.id) == 1


@needs_ffmpeg
def test_unlimited_plans_have_nothing_to_refund(client, sample_video):
    as_user(client, "pro")
    job = upload(client, sample_video, "pro")
    assert job["edit"]["refundable"] is False
    r = client.post(f"/api/jobs/{job['id']}/clips/{job['clips'][0]['index']}/refund")
    assert r.status_code == 400 and "illimité" in r.json()["detail"]


def test_refund_allowance_is_shown_for_quota_plans(client):
    as_user(client, "free")
    me = client.get("/api/me").json()["user"]
    assert me["refunds"] == {"limit": config.REFUNDS_PER_MONTH, "left": config.REFUNDS_PER_MONTH}
    as_user(client, "pro")
    assert client.get("/api/me").json()["user"]["refunds"] is None
