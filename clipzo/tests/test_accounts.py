import hashlib
import hmac
import json
import time
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from server import accounts, billing, config
from server import app as app_module

PASSWORD = "motdepasse123"


@pytest.fixture(scope="module")
def client():
    with TestClient(app_module.app) as c:
        yield c


def signup(client, email):
    client.cookies.clear()
    r = client.post("/api/auth/signup", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["user"]


# ------------------------------------------------------------------------------ accounts

def test_signup_login_logout_me(client):
    user = signup(client, "Alice@Example.com ")
    assert user["email"] == "alice@example.com" and user["plan"] == "free"
    assert user["quota"] == {"limit": 3, "used": 0, "reserved": 0, "remaining": 3, "month": accounts.month_key()}
    assert "clipzo_session" in client.cookies
    assert client.get("/api/me").json()["user"]["email"] == "alice@example.com"

    assert client.post("/api/auth/logout").json() == {"ok": True}
    client.cookies.clear()
    assert client.get("/api/me").json() == {"user": None}

    r = client.post("/api/auth/login", json={"email": "ALICE@example.com", "password": PASSWORD})
    assert r.status_code == 200 and r.json()["user"]["email"] == "alice@example.com"


def test_signup_errors(client):
    signup(client, "bob@example.com")
    client.cookies.clear()
    dup = client.post("/api/auth/signup", json={"email": "BOB@example.com", "password": PASSWORD})
    assert dup.status_code == 409 and "existe déjà" in dup.json()["detail"]
    assert client.post("/api/auth/signup", json={"email": "pas-un-email", "password": PASSWORD}).status_code == 400
    short = client.post("/api/auth/signup", json={"email": "c@example.com", "password": "court"})
    assert short.status_code == 400 and "8 caractères" in short.json()["detail"]


def test_wrong_password_and_throttling(client):
    signup(client, "carol@example.com")
    client.cookies.clear()
    for _ in range(accounts.LOGIN_MAX_FAILURES):
        r = client.post("/api/auth/login", json={"email": "carol@example.com", "password": "mauvais-mdp"})
        assert r.status_code == 401 and r.json()["detail"] == "E-mail ou mot de passe incorrect."
    r = client.post("/api/auth/login", json={"email": "carol@example.com", "password": PASSWORD})
    assert r.status_code == 429  # even the right password waits once the limit is hit
    unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": PASSWORD})
    assert unknown.status_code == 401  # same answer as a wrong password


def test_password_storage_is_salted_scrypt():
    h1, h2 = accounts.hash_password("secret-123"), accounts.hash_password("secret-123")
    assert h1 != h2 and h1.startswith("scrypt$")
    assert accounts.verify_password("secret-123", h1) and not accounts.verify_password("secret-124", h1)
    assert not accounts.verify_password("x", "garbage")


def test_expired_or_forged_session_is_rejected(client):
    signup(client, "dave@example.com")
    client.cookies.set("clipzo_session", "forged-token")
    assert client.get("/api/me").json() == {"user": None}
    token = accounts.create_session(accounts.get_user_by_email("dave@example.com").id)
    accounts.execute("UPDATE sessions SET expires_at = ?", (time.time() - 1,))
    client.cookies.set("clipzo_session", token)
    assert client.get("/api/me").json() == {"user": None}


def test_jobs_need_an_account(client):
    client.cookies.clear()
    r = client.post("/api/jobs", json={"url": "https://youtu.be/abc", "duration": 90, "count": 1})
    assert r.status_code == 401 and "Connecte-toi" in r.json()["detail"]
    r = client.post("/api/jobs/upload", files={"file": ("a.mp4", b"x", "video/mp4")}, data={"duration": "60", "count": "1"})
    assert r.status_code == 401


def test_cross_site_posts_are_refused(client):
    signup(client, "erin@example.com")
    r = client.post("/api/jobs", json={"url": "https://youtu.be/abc", "duration": 90, "count": 1},
                    headers={"Origin": "https://evil.example"})
    assert r.status_code == 403
    r = client.post("/api/auth/logout", headers={"Origin": "http://testserver"})
    assert r.status_code == 200


# --------------------------------------------------------------------------------- quota

def test_server_side_quota_counts_running_jobs(client, monkeypatch):
    monkeypatch.setattr(app_module.store, "enqueue", lambda job: None)  # keep jobs "queued"
    signup(client, "frank@example.com")
    user = accounts.get_user_by_email("frank@example.com")
    accounts.add_usage(user.id, 1)
    body = {"url": "https://youtu.be/abc", "duration": 90, "count": 3, "plan": "pro"}  # plan from the browser is ignored
    r = client.post("/api/jobs", json=body)
    assert r.status_code == 402 and "Il te reste 2 shorts" in r.json()["detail"]
    assert client.post("/api/jobs", json={**body, "count": 2}).status_code == 202
    me = client.get("/api/me").json()["user"]["quota"]
    assert (me["used"], me["reserved"], me["remaining"]) == (1, 2, 0)
    r = client.post("/api/jobs", json={**body, "count": 1})
    assert r.status_code == 402 and "utilisé tes 3 shorts" in r.json()["detail"]
    for job in list(app_module.store.jobs.values()):
        if job.request.user_id == user.id:
            job.fail("test")


def test_pro_has_no_monthly_limit_but_a_per_video_one(client, monkeypatch):
    monkeypatch.setattr(app_module.store, "enqueue", lambda job: None)
    signup(client, "gina@example.com")
    user = accounts.get_user_by_email("gina@example.com")
    accounts.set_plan(user.id, "pro")
    accounts.add_usage(user.id, 500)
    body = {"url": "https://youtu.be/abc", "duration": 90, "count": 12}
    assert client.post("/api/jobs", json=body).status_code == 202
    assert client.get("/api/me").json()["user"]["quota"]["remaining"] is None
    assert client.post("/api/jobs", json={**body, "count": 13}).status_code == 422
    accounts.set_plan(user.id, "creator")
    r = client.post("/api/jobs", json={**body, "count": 9})
    assert r.status_code == 400 and "8 shorts" in r.json()["detail"]
    for job in list(app_module.store.jobs.values()):
        if job.request.user_id == user.id:
            job.fail("test")


# ------------------------------------------------------------------------------- billing

WEBHOOK_SECRET = "whsec_test_secret"


@pytest.fixture
def stripe_mock(monkeypatch):
    calls = {"checkout": [], "portal": [], "subscriptions": {}}

    def create_checkout(params):
        calls["checkout"].append(params)
        return SimpleNamespace(url="https://checkout.stripe.com/c/pay/test")

    def create_portal(params):
        calls["portal"].append(params)
        return SimpleNamespace(url="https://billing.stripe.com/p/session/test")

    fake = SimpleNamespace(v1=SimpleNamespace(
        checkout=SimpleNamespace(sessions=SimpleNamespace(create=create_checkout)),
        billing_portal=SimpleNamespace(sessions=SimpleNamespace(create=create_portal)),
        subscriptions=SimpleNamespace(retrieve=lambda sid: calls["subscriptions"][sid]),
    ))
    monkeypatch.setattr(config, "STRIPE_SECRET_KEY", "sk_test_123")
    monkeypatch.setattr(config, "STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET)
    monkeypatch.setattr(billing, "_client", lambda: fake)
    return calls


def send_event(client, event, secret=WEBHOOK_SECRET):
    payload = json.dumps(event)
    t = int(time.time())
    sig = hmac.new(secret.encode(), f"{t}.{payload}".encode(), hashlib.sha256).hexdigest()
    return client.post("/api/billing/webhook", content=payload,
                       headers={"Stripe-Signature": f"t={t},v1={sig}", "Content-Type": "application/json"})


def subscription(sub_id, user_id, plan, status="active", customer="cus_1", period_end=1_800_000_000):
    return {"id": sub_id, "object": "subscription", "customer": customer, "status": status,
            "metadata": {"user_id": str(user_id), "plan": plan}, "cancel_at_period_end": False,
            "items": {"data": [{"current_period_end": period_end, "price": {"id": "price_x", "unit_amount": 1000}}]}}


def test_billing_without_stripe_is_clearly_refused(client):
    signup(client, "hugo@example.com")
    r = client.post("/api/billing/checkout", json={"plan": "pro", "interval": "month"})
    assert r.status_code == 503 and "pas encore activé" in r.json()["detail"]
    assert client.get("/api/health").json()["features"]["billing"] is False


def test_checkout_then_webhooks_drive_the_plan(client, stripe_mock):
    signup(client, "ines@example.com")
    user = accounts.get_user_by_email("ines@example.com")
    r = client.post("/api/billing/checkout", json={"plan": "pro", "interval": "year"})
    assert r.status_code == 200 and r.json() == {"url": "https://checkout.stripe.com/c/pay/test"}
    params = stripe_mock["checkout"][0]
    assert params["mode"] == "subscription" and params["customer_email"] == "ines@example.com"
    assert params["client_reference_id"] == str(user.id)
    assert params["subscription_data"]["metadata"] == {"user_id": str(user.id), "plan": "pro"}
    assert params["line_items"][0]["price_data"]["unit_amount"] == 9600
    assert params["line_items"][0]["price_data"]["recurring"] == {"interval": "year"}
    assert params["success_url"] == "http://testserver/?billing=success"

    # Stripe calls the webhook once paid
    stripe_mock["subscriptions"]["sub_1"] = subscription("sub_1", user.id, "pro")
    now = int(time.time())
    event = {"id": "evt_1", "type": "checkout.session.completed", "created": now,
             "data": {"object": {"id": "cs_1", "object": "checkout.session", "client_reference_id": str(user.id),
                                 "customer": "cus_1", "subscription": "sub_1", "payment_status": "paid",
                                 "metadata": {"user_id": str(user.id), "plan": "pro"}}}}
    assert send_event(client, event).json()["result"] == "applied"
    me = client.get("/api/me").json()["user"]
    assert me["plan"] == "pro" and me["quota"]["limit"] is None
    assert me["billing"]["renews_at"] == 1_800_000_000 and me["billing"]["can_manage"] is True

    # the same event delivered twice is applied once
    assert send_event(client, event).json()["result"] == "duplicate"
    # an older event arriving late doesn't undo the newer state
    old = {"id": "evt_0", "type": "customer.subscription.updated", "created": now - 100,
           "data": {"object": subscription("sub_1", user.id, "pro", status="incomplete")}}
    send_event(client, old)
    assert client.get("/api/me").json()["user"]["plan"] == "pro"

    # already subscribed: "checkout" sends to the portal instead of a second subscription
    r = client.post("/api/billing/checkout", json={"plan": "creator", "interval": "month"})
    assert r.json() == {"url": "https://billing.stripe.com/p/session/test", "portal": True}
    assert stripe_mock["portal"][0]["customer"] == "cus_1"

    # cancellation at the end of the period → back to free
    gone = {"id": "evt_2", "type": "customer.subscription.deleted", "created": now + 10,
            "data": {"object": subscription("sub_1", user.id, "pro", status="canceled")}}
    send_event(client, gone)
    me = client.get("/api/me").json()["user"]
    assert me["plan"] == "free" and me["billing"]["status"] == "canceled"


def test_webhook_rejects_bad_signatures(client, stripe_mock):
    event = {"id": "evt_x", "type": "customer.subscription.updated", "created": int(time.time()),
             "data": {"object": subscription("sub_9", 1, "pro")}}
    assert send_event(client, event, secret="whsec_wrong").status_code == 400
    r = client.post("/api/billing/webhook", content=json.dumps(event), headers={"Content-Type": "application/json"})
    assert r.status_code == 400


def test_past_due_keeps_access_unpaid_removes_it(client, stripe_mock):
    signup(client, "jade@example.com")
    user = accounts.get_user_by_email("jade@example.com")
    now = int(time.time())
    send_event(client, {"id": "evt_a", "type": "customer.subscription.created", "created": now,
                        "data": {"object": subscription("sub_j", user.id, "creator", customer="cus_j")}})
    assert accounts.get_user(user.id).plan == "creator"
    send_event(client, {"id": "evt_b", "type": "customer.subscription.updated", "created": now + 1,
                        "data": {"object": subscription("sub_j", user.id, "creator", status="past_due", customer="cus_j")}})
    assert accounts.get_user(user.id).plan == "creator"
    send_event(client, {"id": "evt_c", "type": "customer.subscription.updated", "created": now + 2,
                        "data": {"object": subscription("sub_j", user.id, "creator", status="unpaid", customer="cus_j")}})
    assert accounts.get_user(user.id).plan == "free"


def test_signups_are_limited_per_connection(client, monkeypatch):
    monkeypatch.setattr(config, "MAX_SIGNUPS_PER_IP_HOUR", 2)
    accounts._signups.clear()
    client.cookies.clear()
    codes = [client.post("/api/auth/signup", json={"email": f"bot{i}@example.com", "password": PASSWORD}).status_code
             for i in range(3)]
    assert codes == [200, 200, 429]
    accounts._signups.clear()
