"""Legal pages, the 14-day withdrawal (droit de rétractation) with its prorated refund, account deletion."""

import sqlite3
import time
from datetime import date, datetime
from types import SimpleNamespace

import pytest
import stripe
from fastapi.testclient import TestClient

from server import accounts, billing, config, jobs, legal, notify, twitch
from server import app as app_module

PASSWORD = "motdepasse123"
DAY = 86400
FILLED = {
    "name": "Camille <Dupont>", "status": "Entrepreneur individuel (micro-entreprise)",
    "address": "12 rue des Lilas, 69001 Lyon", "siren": "123 456 789 00012", "vat": "franchise",
    "email": "contact@clipzo.fr", "phone": "+33 6 12 34 56 78", "director": "",
    "host_name": "Hébergeur SAS", "host_address": "1 avenue du Cloud, 75001 Paris", "host_phone": "+33 1 23 45 67 89",
    "mediator_name": "Médiateur Exemple", "mediator_url": "https://mediateur.example",
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app_module.app) as c:
        yield c


def signup(client, email):
    client.cookies.clear()
    r = client.post("/api/auth/signup", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return accounts.get_user_by_email(email)


# ------------------------------------------------------------------------------ pages

def test_pages_show_what_is_still_to_fill_in(client, monkeypatch):
    monkeypatch.setattr(config, "LEGAL", {k: "" for k in FILLED})
    for path in ("/mentions-legales", "/cgv", "/confidentialite"):
        r = client.get(path)
        assert r.status_code == 200 and r.headers["content-type"].startswith("text/html")
        assert "{{" not in r.text and "}}" not in r.text, path
        assert "Page incomplète" in r.text and 'class="todo"' in r.text
    assert "CLIPZO_LEGAL_NAME" in legal.missing() and "CLIPZO_LEGAL_DIRECTOR" not in legal.missing()
    assert client.get("/api/health").json()["features"]["legal_notices"] is False
    r = client.get("/cgu", follow_redirects=False)
    assert r.status_code == 301 and r.headers["location"] == "/cgv"


def test_pages_filled_in_from_the_settings(client, monkeypatch):
    monkeypatch.setattr(config, "LEGAL", dict(FILLED))
    assert legal.missing() == []
    notice = client.get("/mentions-legales").text
    assert "Page incomplète" not in notice and 'class="todo"' not in notice
    assert "Camille &lt;Dupont&gt;" in notice and "<Dupont>" not in notice  # escaped
    assert 'href="mailto:contact@clipzo.fr"' in notice
    assert "TVA non applicable, article 293 B" in notice
    assert notice.count("Camille &lt;Dupont&gt;") == 2  # the publication director defaults to the name

    cgv = client.get("/cgv").text
    # prices, quotas and durations come from the settings, not from the text
    for cents in config.PRICES_CENTS.values():
        assert legal.euros(cents) in cgv
    assert f"{config.PLANS['creator'].monthly_quota} shorts par mois" in cgv
    assert f"{config.WITHDRAWAL_DAYS} jours</strong>" in cgv
    assert 'id="formulaire-retractation"' in cgv and 'href="https://mediateur.example"' in cgv
    assert "0,50 €" in cgv and "4,50 €" in cgv  # the worked example: 5 € a month, left on the 3rd day
    privacy = client.get("/confidentialite").text
    assert "clipzo_session" in privacy and "CNIL" in privacy
    assert "Anthropic" not in privacy  # Claude is off in the tests: not listed among the recipients


def test_privacy_policy_lists_claude_when_it_is_on(monkeypatch):
    monkeypatch.setattr(config, "llm_configured", lambda: True)
    assert "Anthropic PBC" in legal.render("confidentialite")


def test_euros_and_dates():
    assert legal.euros(500) == "5 €" and legal.euros(4950) == "49,50 €" and legal.euros(7) == "0,07 €"
    assert legal.french_date("2026-11-01") == "1er novembre 2026" and legal.french_date("2026-03-19") == "19 mars 2026"


def _paris(y, m, d, h=12):
    return datetime(y, m, d, h, 0, tzinfo=legal.paris()).timestamp()


def test_withdrawal_deadline_counts_14_days_and_skips_weekends_and_holidays():
    # Wednesday 4 Nov 2026 → the period ends with Wednesday 18 Nov
    assert legal.withdrawal_deadline(_paris(2026, 11, 4)) == _paris(2026, 11, 19, 0)
    # Saturday 7 Nov → Saturday 21 Nov is pushed to Monday 23 Nov
    assert legal.withdrawal_deadline(_paris(2026, 11, 7)) == _paris(2026, 11, 24, 0)
    # Friday 11 Dec → Christmas, then the weekend: Monday 28 Dec
    assert legal.withdrawal_deadline(_paris(2026, 12, 11)) == _paris(2026, 12, 29, 0)
    # just before midnight still counts as the day of subscription
    assert legal.withdrawal_deadline(_paris(2026, 11, 4, 23) + 3500) == _paris(2026, 11, 19, 0)
    assert legal._easter(2026) == date(2026, 4, 5) and legal._easter(2027) == date(2027, 3, 28)
    assert {date(2026, 4, 6), date(2026, 5, 14), date(2026, 5, 25)} <= legal.public_holidays(2026)


# ------------------------------------------------------------------------------ withdrawal

class FakeStripe:
    """The few Stripe calls a withdrawal makes, with the newer API shape (payments listed apart)."""

    def __init__(self, start, amount=1000, period_days=30, refund_fails=False):
        self.sub = {"id": "sub_w", "start_date": start, "status": "active",
                    "items": {"data": [{"current_period_end": start + period_days * DAY}]}}
        self.invoices = [{"id": "in_1", "amount_paid": amount, "created": start}]
        self.cancelled, self.refunds, self.refund_fails = [], [], refund_fails
        v1 = SimpleNamespace(
            subscriptions=SimpleNamespace(retrieve=lambda sid: self.sub, cancel=self.cancelled.append),
            invoices=SimpleNamespace(list=lambda params: {"data": self.invoices}),
            invoice_payments=SimpleNamespace(list=lambda params: {"data": [
                {"payment": {"type": "payment_intent", "payment_intent": "pi_1"}}] if params["invoice"] == "in_1" else []}),
            refunds=SimpleNamespace(create=self.refund),
        )
        self.v1 = v1

    def refund(self, params, options):
        if self.refund_fails:
            raise stripe.InvalidRequestError("charge already refunded", param=None)
        self.refunds.append((params, options))
        return {"id": "re_1"}


@pytest.fixture
def subscribed(client, monkeypatch):
    def make(email, days_ago, **fake_kwargs):
        user = signup(client, email)
        start = time.time() - days_ago * DAY
        accounts.update_billing(user.id, plan="creator", status="active", customer_id=f"cus_legal_{user.id}",
                                subscription_id="sub_w", period_end=start + 30 * DAY, cancel_at_period_end=False,
                                event_time=time.time() - 5, started_at=start)
        fake = FakeStripe(start, **fake_kwargs)
        monkeypatch.setattr(config, "STRIPE_SECRET_KEY", "sk_test_123")
        monkeypatch.setattr(billing, "_client", lambda: fake)
        return accounts.get_user(user.id), fake
    return make


def test_withdrawal_refunds_all_but_the_days_begun(client, subscribed, monkeypatch):
    sent = []
    monkeypatch.setattr(notify, "smtp_configured", lambda: True)
    monkeypatch.setattr(notify, "send_async", lambda fn, *args: sent.append((fn, args)))
    user, fake = subscribed("retract@example.com", days_ago=2.5)  # 3rd day of a 30-day month at 10 €
    me = client.get("/api/me").json()["user"]
    assert me["billing"]["withdrawal_until"] == legal.withdrawal_deadline(user.subscription_started_at)

    r = client.post("/api/billing/withdraw")
    assert r.status_code == 200, r.text
    assert r.json()["withdrawal"] == {"paid_cents": 1000, "kept_cents": 100, "refunded_cents": 900, "days_used": 3,
                                      "refund_pending_cents": 0}
    assert fake.cancelled == ["sub_w"]
    params, options = fake.refunds[0]
    assert params["payment_intent"] == "pi_1" and params["amount"] == 900 and params["reason"] == "requested_by_customer"
    assert options == {"idempotency_key": "clipzo-withdrawal-sub_w-in_1"}
    me = r.json()["user"]
    assert me["plan"] == "free" and me["billing"]["withdrawal_until"] is None
    proof = accounts.consents(user.id, "withdrawal")[0]["details"]
    assert proof["refunded_cents"] == 900 and proof["refund_error"] is None
    fn, args = sent[0]
    assert fn is notify.withdrawal_confirmed and args[0] == "retract@example.com" and args[3:] == (1000, 100, 900, 3)

    # nothing left to withdraw from
    assert client.post("/api/billing/withdraw").status_code == 400
    assert len(fake.refunds) == 1


def test_withdrawal_after_14_days_is_refused(client, subscribed):
    _, fake = subscribed("late@example.com", days_ago=20)
    assert client.get("/api/me").json()["user"]["billing"]["withdrawal_until"] is None
    r = client.post("/api/billing/withdraw")
    assert r.status_code == 400 and "délai de rétractation" in r.json()["detail"] and "résilier" in r.json()["detail"]
    assert fake.cancelled == [] and fake.refunds == []


def test_withdrawal_of_a_yearly_plan_with_an_old_api_invoice(client, subscribed):
    _, fake = subscribed("yearly@example.com", days_ago=0.2, amount=9600, period_days=365)
    fake.invoices[0]["payment_intent"] = "pi_old"  # API versions before 2025-03-31
    body = client.post("/api/billing/withdraw").json()["withdrawal"]
    assert body["kept_cents"] == round(9600 / 365) and body["refunded_cents"] == 9600 - round(9600 / 365)
    assert fake.refunds[0][0]["payment_intent"] == "pi_old"


def test_failed_refund_still_stops_the_subscription_and_says_what_happens(client, subscribed, monkeypatch):
    monkeypatch.setattr(config, "LEGAL", {**FILLED})
    user, fake = subscribed("refundfail@example.com", days_ago=1, refund_fails=True)
    r = client.post("/api/billing/withdraw")
    assert r.status_code == 502 and "à la main sous 14 jours" in r.json()["detail"] and "contact@clipzo.fr" in r.json()["detail"]
    assert fake.cancelled == ["sub_w"] and accounts.get_user(user.id).plan == "free"
    proof = accounts.consents(user.id, "withdrawal")[0]["details"]
    assert proof["refunded_cents"] == 0 and proof["refund_error"]


def test_withdrawal_needs_an_account_and_stripe(client):
    client.cookies.clear()
    assert client.post("/api/billing/withdraw").status_code == 401
    signup(client, "nostripe@example.com")
    assert client.post("/api/billing/withdraw").status_code == 503


def test_subscription_and_cancellation_are_confirmed_by_email(client, monkeypatch):
    sent = []
    monkeypatch.setattr(notify, "smtp_configured", lambda: True)
    monkeypatch.setattr(notify, "send_async", lambda fn, *args: sent.append((fn, args)))
    user = signup(client, "confirm@example.com")
    start = time.time() - 60
    sub = {"id": "sub_c", "customer": "cus_legal_c", "status": "active", "start_date": start, "cancel_at_period_end": False,
           "metadata": {"user_id": str(user.id), "plan": "creator"},
           "items": {"data": [{"current_period_end": start + 30 * DAY,
                               "price": {"id": "price_x", "unit_amount": 500, "recurring": {"interval": "month"}}}]}}
    billing._apply_subscription(sub, time.time())
    billing._apply_subscription(sub, time.time() + 1)  # the same subscription again: no second e-mail
    assert [s[0] for s in sent] == [notify.subscription_confirmed]
    args = sent[0][1]
    assert args[:4] == ("confirm@example.com", "Créateur", "5 € par mois", start)
    assert args[4] == legal.withdrawal_deadline(start)
    assert accounts.get_user(user.id).subscription_started_at == start

    billing._apply_subscription({**sub, "cancel_at_period_end": True}, time.time() + 2)
    billing._apply_subscription({**sub, "cancel_at_period_end": True}, time.time() + 3)
    assert [s[0] for s in sent] == [notify.subscription_confirmed, notify.subscription_cancelled]
    assert sent[1][1] == ("confirm@example.com", "Créateur", start + 30 * DAY)


def test_confirmation_email_carries_the_accepted_terms(monkeypatch):
    monkeypatch.setattr(config, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(config, "SMTP_FROM", "Clipzo <bonjour@clipzo.fr>")
    captured = {}
    monkeypatch.setattr(notify, "send", lambda to, subject, text, html=None, attachments=None: captured.update(
        to=to, subject=subject, text=text, attachments=attachments) or True)
    start = _paris(2026, 11, 4)
    assert notify.subscription_confirmed("a@example.com", "Pro", "10 € par mois", start, legal.withdrawal_deadline(start))
    assert captured["subject"] == "Ton abonnement Clipzo Pro est actif"
    assert "jusqu'au 18 novembre 2026 inclus" in captured["text"]
    (name, html), = captured["attachments"]
    assert name == "conditions-generales-clipzo.html" and "Droit de rétractation" in html
    msg = notify.build_message("a@example.com", "s", "t", None, captured["attachments"])
    assert [p.get_filename() for p in msg.iter_attachments()] == ["conditions-generales-clipzo.html"]


# ------------------------------------------------------------------------------ account deletion

def test_delete_account_erases_everything_but_the_proofs(client, monkeypatch):
    user = signup(client, "bye@example.com")
    accounts.record_consent(user, "subscribe", {"plan": "creator"})
    twitch.save_link(user.id, "gotaga", "42", True, {}, None)
    job = app_module.store.create(f"user:{user.id}", jobs.JobRequest(
        url="https://youtu.be/x", filename=None, duration=60, count=1, plan="free", options={}, user_id=user.id), user)
    job.status = "done"
    other = signup(client, "stay@example.com")
    client.cookies.set("clipzo_session", accounts.create_session(user.id))

    assert client.post("/api/me/delete", json={"password": "pas le bon"}).status_code == 403
    job.status = "running"
    assert client.post("/api/me/delete", json={"password": PASSWORD}).status_code == 409
    job.status = "done"
    r = client.post("/api/me/delete", json={"password": PASSWORD})
    assert r.status_code == 200 and r.json() == {"ok": True}
    assert accounts.get_user(user.id) is None and accounts.get_user(other.id) is not None
    assert client.get("/api/me").json() == {"user": None}
    assert app_module.store.get(job.id) is None and not (config.JOBS_DIR / job.id).exists()
    assert twitch.get_link(user.id) is None
    assert [c["kind"] for c in accounts.consents(user.id)] == ["subscribe"]  # kept as proof


def test_delete_account_stops_the_subscription_first(client, monkeypatch):
    user = signup(client, "byepaid@example.com")
    accounts.update_billing(user.id, plan="pro", status="active", customer_id="cus_legal_bp", subscription_id="sub_bp",
                            period_end=None, cancel_at_period_end=False, event_time=time.time())
    cancelled = []
    monkeypatch.setattr(billing, "_client", lambda: SimpleNamespace(v1=SimpleNamespace(
        subscriptions=SimpleNamespace(cancel=cancelled.append))))
    r = client.post("/api/me/delete", json={"password": PASSWORD})
    assert r.status_code == 503 and accounts.get_user(user.id) is not None  # Stripe off: kept, nothing lost
    monkeypatch.setattr(config, "STRIPE_SECRET_KEY", "sk_test_123")
    assert client.post("/api/me/delete", json={"password": PASSWORD}).status_code == 200
    assert cancelled == ["sub_bp"] and accounts.get_user(user.id) is None


def test_old_proofs_are_purged_unless_the_subscription_still_runs(client):
    gone = signup(client, "purge1@example.com")
    running = signup(client, "purge2@example.com")
    old = time.time() - (accounts.CONSENT_YEARS + 1) * 365 * DAY
    accounts.record_consent(gone, "subscribe", at=old)
    accounts.record_consent(gone, "subscribe")
    accounts.record_consent(running, "subscribe", at=old)
    accounts.update_billing(running.id, plan="pro", status="active", customer_id="cus_legal_p2", subscription_id="sub_p2",
                            period_end=None, cancel_at_period_end=False, event_time=time.time())
    accounts.purge_old_consents()
    assert len(accounts.consents(gone.id)) == 1 and len(accounts.consents(running.id)) == 1


def test_older_databases_get_the_new_column(tmp_path, monkeypatch):
    path = tmp_path / "old.db"
    with sqlite3.connect(path) as conn:
        conn.execute("""CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL, created_at REAL NOT NULL, plan TEXT NOT NULL DEFAULT 'free', billing_status TEXT,
            stripe_customer_id TEXT UNIQUE, stripe_subscription_id TEXT, current_period_end REAL,
            cancel_at_period_end INTEGER NOT NULL DEFAULT 0, billing_updated_at REAL NOT NULL DEFAULT 0)""")
        conn.execute("INSERT INTO users (email, password_hash, created_at) VALUES ('old@example.com', 'x', 0)")
    accounts.reset_for_tests()
    monkeypatch.setattr(config, "DB_PATH", path)
    try:
        user = accounts.get_user_by_email("old@example.com")
        assert user is not None and user.subscription_started_at is None
    finally:
        accounts.reset_for_tests()


def test_admin_lists_the_proofs_of_a_customer(client, capsys):
    from server import admin

    user = signup(client, "proof@example.com")
    accounts.record_consent(user, "subscribe", {"plan": "pro", "start_now": True})
    accounts.delete_user(user.id)
    assert admin.main(["proofs", "PROOF@example.com"]) == 0
    out = capsys.readouterr().out
    assert "subscribe" in out and f"CGV du {config.TERMS_VERSION}" in out and '"start_now": true' in out
    assert "1 preuve(s)" in out
