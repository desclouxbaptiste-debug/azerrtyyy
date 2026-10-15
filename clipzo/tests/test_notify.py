import logging
import smtplib

import pytest

from server import config, notify

PASSWORD = "s3cret-mdp"


class FakeSMTP:
    """Records what the code does with the SMTP connection."""

    instances: list = []
    fail: dict = {}

    def __init__(self, host, port, timeout=None, context=None):
        self.host, self.port, self.timeout, self.context = host, port, timeout, context
        self.ssl = False
        self.steps = []
        self.sent = None
        FakeSMTP.instances.append(self)
        self._maybe_fail("connect")

    def _maybe_fail(self, step):
        if step in FakeSMTP.fail:
            raise FakeSMTP.fail[step]

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.steps.append("quit")
        self._maybe_fail("quit")
        return False

    def starttls(self, context=None):
        assert context is not None, "certificates are checked"
        self.steps.append("starttls")
        self._maybe_fail("starttls")

    def login(self, user, password):
        self.steps.append(("login", user, password))
        self._maybe_fail("login")

    def send_message(self, msg, to_addrs=None):
        self.steps.append("send")
        self._maybe_fail("send")
        self.sent = (msg, to_addrs)


class FakeSMTPSSL(FakeSMTP):
    def __init__(self, host, port, timeout=None, context=None):
        super().__init__(host, port, timeout, context)
        assert context is not None
        self.ssl = True


@pytest.fixture(autouse=True)
def smtp(monkeypatch):
    FakeSMTP.instances, FakeSMTP.fail = [], {}
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    monkeypatch.setattr(smtplib, "SMTP_SSL", FakeSMTPSSL)
    for name, value in {"SMTP_HOST": "smtp.example.com", "SMTP_PORT": 587, "SMTP_USER": "clipzo",
                        "SMTP_PASSWORD": PASSWORD, "SMTP_FROM": "Clipzo <bonjour@clipzo.example>",
                        "SMTP_SECURITY": "starttls"}.items():
        monkeypatch.setattr(config, name, value)
    return FakeSMTP


def last():
    assert len(FakeSMTP.instances) == 1
    return FakeSMTP.instances[0]


def test_not_configured_sends_nothing(monkeypatch):
    monkeypatch.setattr(config, "SMTP_HOST", "")
    assert not notify.smtp_configured()
    assert notify.send("alice@example.com", "Sujet", "Texte") is False
    monkeypatch.setattr(config, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(config, "SMTP_FROM", "")
    assert notify.send("alice@example.com", "Sujet", "Texte") is False
    assert not FakeSMTP.instances


def test_shorts_ready_message_starttls_and_login():
    url = "https://clipzo.example/?job=abc&x=1"
    assert notify.shorts_ready("alice@example.com", "Mon live de ouf <3", 4, url) is True
    s = last()
    assert (s.host, s.port, s.timeout, s.ssl) == ("smtp.example.com", 587, 20, False)
    assert s.steps == ["starttls", ("login", "clipzo", PASSWORD), "send", "quit"]
    msg, to_addrs = s.sent
    assert to_addrs == ["alice@example.com"]
    assert msg["To"] == "alice@example.com" and msg["From"] == "Clipzo <bonjour@clipzo.example>"
    assert msg["Subject"] == "Tes 4 shorts sont prêts : Mon live de ouf <3"
    assert msg["Date"] and msg["Message-ID"].endswith("@clipzo.example>")
    text = msg.get_body(("plain",)).get_content()
    assert "« Mon live de ouf <3 »" in text and "4 shorts t'attendent" in text and url in text
    html = msg.get_body(("html",)).get_content()
    assert "Mon live de ouf &lt;3" in html and 'href="https://clipzo.example/?job=abc&amp;x=1"' in html
    assert "<3" not in html.replace("&lt;3", "")


def test_singular_and_failure_mail():
    assert notify.shorts_ready("bob@example.com", "Live", 1, "https://clipzo.example/") is True
    msg = FakeSMTP.instances[-1].sent[0]
    assert msg["Subject"] == "Ton short est prêt : Live"
    assert "ton short t'attend" in msg.get_body(("plain",)).get_content()

    assert notify.job_failed("bob@example.com", "Live", "Cette vidéo dure 300 min.", "https://clipzo.example/") is True
    msg = FakeSMTP.instances[-1].sent[0]
    assert msg["Subject"] == "Ta vidéo « Live » n'a pas pu être découpée"
    text = msg.get_body(("plain",)).get_content()
    assert "Cette vidéo dure 300 min." in text and "https://clipzo.example/" in text and "relancer" in text


@pytest.mark.parametrize("step,exc", [
    ("connect", ConnectionRefusedError("refused")),
    ("starttls", smtplib.SMTPNotSupportedError("STARTTLS extension not supported by server.")),
    ("login", smtplib.SMTPAuthenticationError(535, f"5.7.8 bad credentials for {PASSWORD}".encode())),
    ("send", smtplib.SMTPRecipientsRefused({"alice@example.com": (550, b"no such user")})),
])
def test_failure_returns_false_and_never_logs_the_password(step, exc, caplog):
    FakeSMTP.fail = {step: exc}
    with caplog.at_level(logging.DEBUG, logger="clipzo.notify"):
        assert notify.send("alice@example.com", "Sujet", "Texte") is False
    assert caplog.records, "the failure is logged"
    assert PASSWORD not in caplog.text and "alice@example.com" not in caplog.text


def test_quit_failing_after_sending_still_counts_as_sent():
    FakeSMTP.fail = {"quit": smtplib.SMTPServerDisconnected("gone")}
    assert notify.send("alice@example.com", "Sujet", "Texte") is True


def test_cr_lf_are_stripped_from_headers():
    assert notify.send("alice@example.com", "Salut\r\nBcc: victim@example.com", "Texte") is True
    msg = last().sent[0]
    assert msg["Subject"] == "Salut Bcc: victim@example.com"
    assert msg["Bcc"] is None and "\n" not in msg["Subject"] and "\r" not in msg["Subject"]
    raw = msg.as_string()
    assert "\nBcc:" not in raw

    FakeSMTP.instances.clear()
    assert notify.shorts_ready("alice@example.com", "Live\nBcc: victim@example.com", 2, "https://x.example/") is True
    assert last().sent[0]["Bcc"] is None


@pytest.mark.parametrize("to", ["alice@example.com\r\nBcc: victim@example.com", "a@example.com, b@example.com",
                                "pas-une-adresse", "", "Alice <alice@example.com>"])
def test_only_one_plain_recipient(to):
    assert notify.send(to, "Sujet", "Texte") is False
    assert not FakeSMTP.instances


def test_ssl_mode(monkeypatch):
    monkeypatch.setattr(config, "SMTP_SECURITY", "ssl")
    monkeypatch.setattr(config, "SMTP_PORT", 465)
    assert notify.send("alice@example.com", "Sujet", "Texte", "<p>Texte</p>") is True
    s = last()
    assert s.ssl and s.port == 465 and s.timeout == 20
    assert s.steps == [("login", "clipzo", PASSWORD), "send", "quit"], "no STARTTLS inside SSL"
    assert s.sent[0].get_body(("html",)).get_content().strip() == "<p>Texte</p>"


def test_none_mode_without_user(monkeypatch):
    monkeypatch.setattr(config, "SMTP_SECURITY", "none")
    monkeypatch.setattr(config, "SMTP_USER", "")
    assert notify.send("alice@example.com", "Sujet", "Texte") is True
    assert last().steps == ["send", "quit"] and not last().ssl


def test_unknown_security_falls_back_to_starttls(monkeypatch):
    monkeypatch.setattr(config, "SMTP_SECURITY", "tls?")
    assert notify.send("alice@example.com", "Sujet", "Texte") is True
    assert last().steps[0] == "starttls"


def test_send_async_runs_in_a_daemon_thread():
    thread = notify.send_async(notify.shorts_ready, "alice@example.com", "Live", 2, "https://clipzo.example/")
    assert thread.daemon
    thread.join(5)
    assert not thread.is_alive() and last().sent is not None

    def boom(*args):
        raise RuntimeError("bug")
    notify.send_async(boom, 1).join(5)  # logged, never raised
