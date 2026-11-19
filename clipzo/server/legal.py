"""The legal pages (mentions légales, CGV, politique de confidentialité), filled from the settings.

The texts live in clipzo/legal/*.html. They quote the real prices, quotas and retention times from
config.py, so they can't drift from what the software does. `{{ key }}` inserts a value (escaped),
`{{#if flag}}…{{else}}…{{/if}}` keeps a part only when a feature is on. A legal detail the operator
hasn't filled in yet (CLIPZO_LEGAL_*) is shown as "à compléter" and listed by missing().
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from datetime import time as day_start
from html import escape
from urllib.parse import urlsplit

from . import config, notify, twitch

LEGAL_DIR = config.ROOT / "legal"
PAGES = {
    "mentions-legales": "Mentions légales",
    "cgv": "Conditions générales",
    "confidentialite": "Confidentialité",
}
# what each CLIPZO_LEGAL_* setting is, for the "à compléter" marks and the start-up warning
FIELDS = {
    "name": "nom ou raison sociale",
    "status": "statut (micro-entreprise, SAS…)",
    "address": "adresse",
    "siren": "SIREN ou SIRET",
    "vat": "n° de TVA ou « franchise »",
    "email": "e-mail de contact",
    "phone": "téléphone",
    "director": "directeur de la publication",
    "host_name": "nom de l'hébergeur",
    "host_address": "adresse de l'hébergeur",
    "host_phone": "téléphone de l'hébergeur",
    "mediator_name": "médiateur de la consommation",
    "mediator_url": "site du médiateur",
}
OPTIONAL = {"director"}  # defaults to the name
MONTHS = ("janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre",
          "novembre", "décembre")

_IF_RE = re.compile(r"\{\{#if (\w+)\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{/if\}\}", re.DOTALL)
_VALUE_RE = re.compile(r"\{\{\s*([\w.]+)\s*\}\}")


def env_name(field: str) -> str:
    return f"CLIPZO_LEGAL_{field.upper()}"


def value(field: str) -> str:
    raw = (config.LEGAL.get(field) or "").strip()
    if not raw and field == "director":
        raw = (config.LEGAL.get("name") or "").strip()
    return raw


def missing() -> list[str]:
    """The CLIPZO_LEGAL_* settings still empty (the site shouldn't sell anything until they're filled)."""
    return [env_name(f) for f in FIELDS if f not in OPTIONAL and not value(f)]


def euros(cents: int) -> str:
    whole, rest = divmod(int(cents), 100)
    return f"{whole} €" if rest == 0 else f"{whole},{rest:02d} €"


def french_date(iso: str) -> str:
    d = date.fromisoformat(iso)
    return f"{d.day if d.day > 1 else '1er'} {MONTHS[d.month - 1]} {d.year}"


def paris():
    try:
        from zoneinfo import ZoneInfo

        return ZoneInfo("Europe/Paris")
    except Exception:  # noqa: BLE001 - no time zone database (Windows without tzdata): winter time
        return timezone(timedelta(hours=1))


def french_day(ts: float) -> str:
    return french_date(datetime.fromtimestamp(ts, paris()).date().isoformat())


def _easter(year: int) -> date:
    """Easter Sunday (Gregorian calendar, Meeus/Jones/Butcher algorithm)."""
    a, b, c = year % 19, year // 100, year % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    lw = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * lw) // 451
    n = h + lw - 7 * m + 114
    return date(year, n // 31, n % 31 + 1)


def public_holidays(year: int) -> set[date]:
    """French public holidays (art. L3133-1 du Code du travail)."""
    easter = _easter(year)
    fixed = {date(year, m, d) for m, d in ((1, 1), (5, 1), (5, 8), (7, 14), (8, 15), (11, 1), (11, 11), (12, 25))}
    return fixed | {easter + timedelta(days=n) for n in (1, 39, 50)}  # lundi de Pâques, Ascension, Pentecôte


def withdrawal_deadline(started_at: float) -> float:
    """The moment the withdrawal period is over: the end of the 14th day after the day of subscription,
    pushed to the next working day when that's a Saturday, a Sunday or a public holiday (art. L221-19)."""
    tz = paris()
    day = datetime.fromtimestamp(started_at, tz).date() + timedelta(days=config.WITHDRAWAL_DAYS)
    while day.weekday() >= 5 or day in public_holidays(day.year):
        day += timedelta(days=1)
    return datetime.combine(day + timedelta(days=1), day_start(0), tz).timestamp()


def duration(hours: float) -> str:
    if hours < 48:
        h = max(1, round(hours))
        return f"{h} heure{'s' if h > 1 else ''}"
    days = int(hours // 24)
    return f"{days} jours"


def _todo(field: str) -> str:
    return (f'<mark class="todo" title="À renseigner avec {env_name(field)}">'
            f"[{escape(FIELDS[field])} à compléter]</mark>")


def _values() -> dict[str, str]:
    """Every `{{ key }}` of the templates, as HTML."""
    v: dict[str, str] = {}
    for field in FIELDS:
        raw = value(field)
        v[f"legal.{field}"] = escape(raw) if raw else _todo(field)
    email = value("email")
    if email:
        v["legal.email"] = f'<a href="mailto:{escape(email, quote=True)}">{escape(email)}</a>'
    url = value("mediator_url")
    if url.startswith(("https://", "http://")):
        v["legal.mediator_url"] = f'<a href="{escape(url, quote=True)}" rel="noopener">{escape(url)}</a>'
    vat = value("vat")
    if vat.lower() == "franchise":
        v["vat_line"] = "TVA non applicable, article 293 B du Code général des impôts"
        v["price_tax"] = "TVA non applicable (article 293 B du Code général des impôts)"
    elif vat:
        v["vat_line"] = f"N° de TVA intracommunautaire : {escape(vat)}"
        v["price_tax"] = "toutes taxes comprises (TTC)"
    else:
        v["vat_line"] = f"TVA : {_todo('vat')}"
        v["price_tax"] = "toutes taxes comprises (TTC)"

    public = config.PUBLIC_URL
    v["site"] = escape(urlsplit(public).hostname or public) if public else "Clipzo"
    v["terms_date"] = french_date(config.TERMS_VERSION)
    v["withdrawal_days"] = str(config.WITHDRAWAL_DAYS)
    v["keep_source"] = duration(config.KEEP_SOURCE_HOURS) if config.KEEP_SOURCE_HOURS > 0 else "0 heure"
    v["job_ttl"] = duration(config.JOB_TTL_HOURS)
    v["session_days"] = str(config.SESSION_DAYS)
    v["refunds"] = str(config.REFUNDS_PER_MONTH)
    v["max_jobs"] = str(config.MAX_ACTIVE_JOBS_PER_CLIENT)
    v["smtp_host"] = escape(config.SMTP_HOST)
    for key, plan in config.PLANS.items():
        v[f"plan.{key}.label"] = escape(plan.label)
        v[f"plan.{key}.quota"] = "illimités" if plan.monthly_quota is None else str(plan.monthly_quota)
        v[f"plan.{key}.max_clips"] = str(plan.max_clips)
        v[f"plan.{key}.hours"] = duration(plan.max_source_minutes / 60)
        v[f"plan.{key}.width"] = "1080p" if plan.out_width >= 1080 else f"{plan.out_width}p"
    for (key, interval), cents in config.PRICES_CENTS.items():
        v[f"price.{key}.{interval}"] = euros(cents)
    # the worked example of a withdrawal: a Créateur monthly plan left on its 3rd day (30-day month)
    paid = config.PRICES_CENTS[("creator", "month")]
    kept = round(paid * 3 / 30)
    v["example.paid"], v["example.kept"], v["example.back"] = euros(paid), euros(kept), euros(paid - kept)

    v["flag.llm"] = "1" if config.llm_configured() else ""
    v["flag.smtp"] = "1" if notify.smtp_configured() else ""
    v["flag.twitch"] = "1" if twitch.helix_configured() else ""  # the automatic import (keys set)
    v["flag.complete"] = "" if missing() else "1"
    return v


def render(page: str) -> str:
    """The full HTML of one legal page. KeyError for an unknown page."""
    title = PAGES[page]
    v = _values()
    body = (LEGAL_DIR / f"{page}.html").read_text(encoding="utf-8")
    layout = (LEGAL_DIR / "layout.html").read_text(encoding="utf-8")
    current = ' aria-current="page"'
    nav = "".join(f'<a href="/{key}"{current if key == page else ""}>{escape(label)}</a>'
                  for key, label in PAGES.items())
    html = layout.replace("{{ content }}", body).replace("{{ nav }}", nav).replace("{{ title }}", escape(title))

    def keep(m: re.Match) -> str:
        on = bool(v.get(f"flag.{m.group(1)}"))
        return m.group(2) if on else (m.group(3) or "")

    html = _IF_RE.sub(keep, html)

    def fill(m: re.Match) -> str:
        return v[m.group(1)]  # KeyError on a typo in a template: caught by the tests

    return _VALUE_RE.sub(fill, html)
