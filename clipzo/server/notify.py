"""E-mails to creators: the shorts of an automatic import are ready, or why it failed (standard library SMTP)."""

from __future__ import annotations

import logging
import re
import smtplib
import ssl
import threading
from email.message import EmailMessage
from email.utils import formatdate, make_msgid, parseaddr
from html import escape
from typing import Callable

from . import config

log = logging.getLogger("clipzo.notify")

SMTP_TIMEOUT = 20
ACCENT = "#ff3b5c"
_ADDRESS_RE = re.compile(r"^[^@\s,;<>\"]{1,64}@[^@\s,;<>\"]{1,255}$")  # one address, nothing that adds another


def smtp_configured() -> bool:
    return bool(config.SMTP_HOST and config.SMTP_FROM)


def _header(value: str) -> str:
    """One line: a CR/LF in a header value would let it add other headers."""
    return " ".join(str(value or "").replace("\r", " ").replace("\n", " ").split())


def _mask(address: str) -> str:
    local, _, domain = address.partition("@")
    return f"{local[:1]}***@{domain}"


def _redact(exc: Exception, address: str) -> str:
    """The error for the log: never the password, the recipient masked."""
    text = f"{type(exc).__name__}: {exc}".replace(address, _mask(address))
    if config.SMTP_PASSWORD:
        text = text.replace(config.SMTP_PASSWORD, "***")
    return text[:300]


def build_message(to: str, subject: str, text: str, html: str | None = None) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = _header(config.SMTP_FROM)
    msg["To"] = _header(to)
    msg["Subject"] = _header(subject)
    msg["Date"] = formatdate(usegmt=True)
    domain = parseaddr(str(msg["From"]))[1].rpartition("@")[2] or "clipzo.local"
    msg["Message-ID"] = make_msgid(domain=_header(domain))  # no DNS lookup of the local host name
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")
    return msg


def send(to: str, subject: str, text: str, html: str | None = None) -> bool:
    """Send one e-mail. Never raises: False when SMTP isn't configured or the server refused it."""
    if not smtp_configured():
        return False
    address = _header(to)
    if not _ADDRESS_RE.match(address):
        log.warning("e-mail not sent: invalid recipient address")
        return False
    security = (config.SMTP_SECURITY or "starttls").strip().lower()
    sent = False
    try:
        msg = build_message(address, subject, text, html)
        if security == "ssl":
            server = smtplib.SMTP_SSL(config.SMTP_HOST, config.SMTP_PORT, timeout=SMTP_TIMEOUT,
                                      context=ssl.create_default_context())
        else:
            server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=SMTP_TIMEOUT)
        with server:
            if security not in ("none", "ssl"):  # an unknown value means STARTTLS: no password in clear
                server.starttls(context=ssl.create_default_context())
            if config.SMTP_USER:
                server.login(config.SMTP_USER, config.SMTP_PASSWORD)
            server.send_message(msg, to_addrs=[address])
            sent = True
    except Exception as exc:  # noqa: BLE001 - an e-mail is never worth failing for
        if sent:
            return True  # only the goodbye (QUIT) failed
        log.warning("e-mail to %s not sent: %s", _mask(address), _redact(exc, address))
        return False
    return True


def send_async(fn: Callable[..., bool], *args) -> threading.Thread:
    """Run shorts_ready / job_failed in the background: an SMTP server can take seconds to answer."""
    def run() -> None:
        try:
            fn(*args)
        except Exception:  # noqa: BLE001
            log.exception("background e-mail failed")

    thread = threading.Thread(target=run, daemon=True, name="clipzo-mail")
    thread.start()
    return thread


# ---------------------------------------------------------------- the e-mails

def shorts_ready(to: str, title: str, count: int, url: str) -> bool:
    title = _title(title)
    many = count > 1
    subject = f"Tes {count} shorts sont prêts : {title}" if many else f"Ton short est prêt : {title}"
    lines = [
        f"Ta vidéo « {title} » est découpée : "
        + (f"{count} shorts t'attendent dans ton studio Clipzo." if many else "ton short t'attend dans ton studio Clipzo."),
        f"Regarde-{'les' if many else 'le'} et télécharge-{'les' if many else 'le'} sans tarder : "
        f"{'ils restent' if many else 'il reste'} disponible{'s' if many else ''} {_hours(config.JOB_TTL_HOURS)}.",
    ]
    button = "Voir mes shorts" if many else "Voir mon short"
    return send(to, subject, _text(lines, url), _html("Tes shorts sont prêts" if many else "Ton short est prêt",
                                                       lines, button, url))


def job_failed(to: str, title: str, reason: str, url: str) -> bool:
    title = _title(title)
    subject = f"Ta vidéo « {title} » n'a pas pu être découpée"
    lines = [
        f"On n'a pas réussi à découper ta vidéo « {title} ».",
        f"La raison : {(reason or 'erreur inconnue').strip()[:300]}",
        "Seuls les shorts livrés sont décomptés de ton forfait. Tu peux relancer l'analyse depuis ton studio.",
    ]
    return send(to, subject, _text(lines, url), _html("L'import n'a pas marché", lines, "Ouvrir mon studio", url))


def _title(title: str) -> str:
    title = _header(title) or "sans titre"
    return title if len(title) <= 80 else title[:79].rstrip() + "…"


def _hours(hours: float) -> str:
    return f"{max(1, round(hours))} h" if hours < 48 else f"{int(hours // 24)} jours"


def _text(lines: list[str], url: str) -> str:
    return "Salut,\n\n" + "\n\n".join(lines) + f"\n\n{url}\n\nÀ très vite,\nL'équipe Clipzo\n"


def _html(heading: str, lines: list[str], button: str, url: str) -> str:
    link = escape(url, quote=True)
    body = "".join(f'<p style="margin:0 0 14px;line-height:1.5">{escape(line)}</p>' for line in lines)
    return (
        '<!doctype html><html lang="fr"><body style="margin:0;padding:24px;background:#f4f4f5;'
        'font-family:Arial,Helvetica,sans-serif;color:#18181b">'
        '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">'
        f'<h1 style="margin:0 0 16px;font-size:20px">{escape(heading)}</h1>'
        '<p style="margin:0 0 14px">Salut,</p>'
        f'{body}'
        f'<p style="margin:22px 0"><a href="{link}" style="display:inline-block;background:{ACCENT};color:#ffffff;'
        f'font-weight:bold;font-size:16px;text-decoration:none;padding:12px 22px;border-radius:999px">{escape(button)}</a></p>'
        '<p style="margin:0;font-size:13px;color:#71717a">Ou copie ce lien : '
        f'<a href="{link}" style="color:#71717a">{link}</a></p>'
        '<p style="margin:18px 0 0">À très vite,<br>L\'équipe Clipzo</p>'
        '</div></body></html>'
    )
