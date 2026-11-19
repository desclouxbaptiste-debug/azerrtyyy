"""E-mails to creators (standard library SMTP): the shorts of an automatic import are ready or why it failed,
and the confirmations of a subscription, its cancellation or a withdrawal."""

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


def build_message(to: str, subject: str, text: str, html: str | None = None,
                  attachments: list[tuple[str, str]] | None = None) -> EmailMessage:
    """`attachments`: (file name, HTML) pairs, e.g. the CGV the customer just accepted."""
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
    for name, content in attachments or []:
        msg.add_attachment(content.encode("utf-8"), maintype="text", subtype="html", filename=name)
    return msg


def send(to: str, subject: str, text: str, html: str | None = None,
         attachments: list[tuple[str, str]] | None = None) -> bool:
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
        msg = build_message(address, subject, text, html, attachments)
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


# Subscription e-mails: the "support durable" the Code de la consommation asks for (art. L221-13, L221-21,
# L215-1-1). They are sent to the account's address from the Stripe webhooks and the withdrawal endpoint.

def _account_url() -> str:
    return f"{config.site_url()}/#compte"


def subscription_confirmed(to: str, plan_label: str, price: str, started_at: float, withdrawal_until: float) -> bool:
    from . import legal

    lines = [
        f"Merci ! Ton abonnement Clipzo {plan_label} ({price}) a commencé le {legal.french_day(started_at)}.",
        f"Tu as accepté les conditions générales du {legal.french_date(config.TERMS_VERSION)}, jointes à cet e-mail, "
        "et demandé que ton abonnement démarre tout de suite.",
        f"Droit de rétractation : tu peux te rétracter jusqu'au {legal.french_day(withdrawal_until - 1)} inclus, "
        "avec le bouton « Me rétracter » de ton compte ou le formulaire des conditions générales. "
        "On te rembourse tout, sauf les jours déjà commencés.",
        "Tu peux résilier quand tu veux avec le bouton « Résilier mon abonnement » de ton compte : "
        "ton forfait reste actif jusqu'à la fin de la période payée.",
    ]
    cgv = [("conditions-generales-clipzo.html", legal.render("cgv"))]
    return send(to, f"Ton abonnement Clipzo {plan_label} est actif", _text(lines, _account_url()),
                _html("Ton abonnement est actif", lines, "Ouvrir mon compte", _account_url()), cgv)


def subscription_cancelled(to: str, plan_label: str, ends_at: float | None) -> bool:
    from . import legal

    until = f"jusqu'au {legal.french_day(ends_at)}" if ends_at else "jusqu'à la fin de la période payée"
    lines = [
        f"Nous avons bien reçu la résiliation de ton abonnement Clipzo {plan_label}.",
        f"Tu gardes ton forfait {until}. Ensuite, ton compte repasse au forfait Gratuit et plus rien n'est prélevé.",
        "Tu as changé d'avis ? Tu peux reprendre ton abonnement depuis ton compte avant cette date.",
    ]
    return send(to, "Ta résiliation est enregistrée", _text(lines, _account_url()),
                _html("Ta résiliation est enregistrée", lines, "Ouvrir mon compte", _account_url()))


def withdrawal_confirmed(to: str, plan_label: str, at: float, paid_cents: int, kept_cents: int,
                         refunded_cents: int, days_used: int) -> bool:
    from . import legal

    lines = [
        f"Nous avons bien reçu ta rétractation de l'abonnement Clipzo {plan_label}, le {legal.french_day(at)}. "
        "Ton abonnement est arrêté et ton compte est repassé au forfait Gratuit.",
    ]
    owed = paid_cents - kept_cents
    if refunded_cents >= owed:
        lines.append(
            f"Remboursement : {legal.euros(refunded_cents)} sur {legal.euros(paid_cents)} payés "
            f"({legal.euros(kept_cents)} pour {days_used} jour{'s' if days_used > 1 else ''} utilisé"
            f"{'s' if days_used > 1 else ''}). Il part sur le moyen de paiement utilisé et arrive en général "
            "sous 5 à 10 jours.")
    else:
        lines.append(
            f"Le remboursement de {legal.euros(owed - refunded_cents)} n'a pas pu partir automatiquement : "
            "nous le faisons à la main, au plus tard 14 jours après ta rétractation.")
    lines.append("Les shorts déjà produits restent à toi.")
    return send(to, "Ta rétractation est enregistrée", _text(lines, _account_url()),
                _html("Ta rétractation est enregistrée", lines, "Ouvrir mon compte", _account_url()))


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
