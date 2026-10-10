"""HTTP API + static site. Run with `python -m server` from the clipzo/ folder."""

from __future__ import annotations

import ipaddress
import json
import logging
import os
import re
from contextlib import asynccontextmanager
from typing import Literal

from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.datastructures import UploadFile

from . import accounts, billing, config, edits, jobs, media, notify, reframe, sources, transcribe, twitch

logging.basicConfig(level=os.environ.get("CLIPZO_LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("clipzo")

store = jobs.JobStore()
importer: twitch.AutoImporter | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    accounts.db()  # create the database file and tables
    if not media.ffmpeg_available():
        log.error("=" * 70)
        log.error("ffmpeg est introuvable : aucune vidéo ne pourra être analysée.")
        log.error("Windows : winget install Gyan.FFmpeg   (puis ferme et rouvre ce terminal)")
        log.error("Mac : brew install ffmpeg   |   Linux : sudo apt install ffmpeg")
        log.error("Ou indique son dossier : CLIPZO_FFMPEG_DIR=C:\\chemin\\vers\\ffmpeg\\bin")
        log.error("=" * 70)
    if not billing.configured():
        log.info("Paiement Stripe non configuré : les forfaits payants ne peuvent pas être achetés (README, "
                 "« Brancher Stripe »). Pour tester un forfait : %s set-plan ton@email pro", config.ADMIN_COMMAND)
    store.start()
    global importer
    importer = twitch.AutoImporter(start_job=_start_twitch_import)
    importer.start()
    if not twitch.helix_configured():
        log.info("Twitch : chat des VOD actif ; clips des viewers et import automatique désactivés "
                 "(TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET, voir README)")
    log.info("Clipzo ready — data in %s, %d worker(s), Claude: %s, Whisper: %s",
             config.DATA_DIR, config.WORKERS, "on" if config.llm_configured() else "off",
             config.WHISPER_MODEL if transcribe.available() else "off")
    yield
    importer.stop()
    store.stop()


app = FastAPI(title="Clipzo", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
if config.CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type"], allow_credentials=True)

SESSION_COOKIE = "clipzo_session"


MAX_SMALL_BODY = 1024 * 1024  # every POST except the video upload: JSON forms and the Stripe webhook


def _host_allowed(host: str) -> bool:
    """Names this server answers to. An IP address is always fine: a DNS-rebinding page (a site whose
    name suddenly points to 127.0.0.1 to drive the server on the owner's computer) always uses a name."""
    if not host:
        return True
    try:
        name = (urlsplit("//" + host).hostname or "").rstrip(".").lower()
    except ValueError:
        return False
    try:
        ipaddress.ip_address(name)
        return True
    except ValueError:
        pass
    return "*" in config.ALLOWED_HOSTS or name in config.ALLOWED_HOSTS


class BodyLimit:
    """Cap the body of every POST except the video upload (it has its own limit). The webhook and the forms
    are read before any signature or session is checked: without a cap, one request could fill the memory.
    Counted as the bytes arrive, so a body sent without Content-Length (chunked, HTTP/2 via a proxy) is capped too."""

    def __init__(self, app, limit: int):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] != "POST" or scope["path"] == "/api/jobs/upload":
            return await self.app(scope, receive, send)
        length = dict(scope["headers"]).get(b"content-length")
        if length is not None and (not length.isdigit() or int(length) > self.limit):
            return await JSONResponse({"detail": "Requête trop volumineuse."}, status_code=413)(scope, receive, send)
        received = 0

        async def limited():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.limit:
                    raise HTTPException(413, "Requête trop volumineuse.")
            return message

        await self.app(scope, limited, send)


app.add_middleware(BodyLimit, limit=MAX_SMALL_BODY)


@app.middleware("http")
async def same_origin_writes(request: Request, call_next):
    """Refuse unknown host names, oversized bodies and POSTs sent by another website (CSRF).
    The Stripe webhook is signed, it is exempt from the origin check."""
    if not _host_allowed(request.headers.get("host", "")):
        return JSONResponse({"detail": "Adresse du site non reconnue (voir CLIPZO_ALLOWED_HOSTS)."}, status_code=400)
    if request.method == "POST" and request.url.path != "/api/billing/webhook":
        origin = request.headers.get("origin")
        if origin and origin != "null":
            allowed = {o.rstrip("/") for o in config.CORS_ORIGINS}
            if config.PUBLIC_URL:
                allowed.add(config.PUBLIC_URL)
            same_host = urlsplit(origin).netloc == request.headers.get("host", "")
            if not same_host and origin.rstrip("/") not in allowed:
                return JSONResponse({"detail": "Requête refusée."}, status_code=403)
    return await call_next(request)


class Options(BaseModel):
    reframe: bool = True
    subs: bool = False
    nowm: bool = False
    hooks: bool = False
    animsubs: bool = False
    layout: Literal["auto", "streamer", "face", "full"] = "auto"
    style: dict | None = None  # subtitle look, filtered by styles.parse_style


class JobIn(BaseModel):
    url: str = Field(min_length=4, max_length=2048)
    duration: int = Field(ge=config.MIN_CLIP_SECONDS, le=config.MAX_CLIP_SECONDS)
    count: int = Field(ge=1, le=12)
    plan: Literal["free", "creator", "pro"] | None = None  # ignored: the account's plan applies
    options: Options = Options()


class TwitchIn(BaseModel):
    login: str = Field(default="", max_length=200)
    enabled: bool = False
    settings: dict = Field(default_factory=dict)


class RecutIn(BaseModel):
    start: float = Field(ge=0, le=36_000)
    end: float = Field(ge=0, le=36_000)


class Credentials(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=accounts.MAX_PASSWORD)


class CheckoutIn(BaseModel):
    plan: Literal["creator", "pro"]
    interval: Literal["month", "year"] = "month"


def _client_id(request: Request) -> str:
    """Who is asking, for the per-person job limit.

    Behind a reverse proxy (CLIPZO_TRUST_PROXY=1) the real address is the LAST entry of
    X-Forwarded-For: that's the one our proxy appended. Earlier entries are sent by the client
    and can be anything.
    """
    if os.environ.get("CLIPZO_TRUST_PROXY") == "1":
        fwd = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
        if fwd:
            return fwd[-1]
    return request.client.host if request.client else "unknown"


# ------------------------------------------------------------------------------ accounts

def _current_user(request: Request) -> accounts.User | None:
    return accounts.user_from_session(request.cookies.get(SESSION_COOKIE))


def _require_user(request: Request) -> accounts.User:
    user = _current_user(request)
    if user is None:
        raise HTTPException(401, "Connecte-toi pour lancer une analyse.")
    if not media.ffmpeg_available():
        raise HTTPException(503, media.FFMPEG_MISSING)
    return user


def _is_https(request: Request) -> bool:
    if config.COOKIE_SECURE or request.url.scheme == "https":
        return True
    return os.environ.get("CLIPZO_TRUST_PROXY") == "1" and request.headers.get("x-forwarded-proto") == "https"


def _set_session(response: Response, request: Request, token: str) -> None:
    response.set_cookie(SESSION_COOKIE, token, max_age=config.SESSION_DAYS * 86400, httponly=True,
                        samesite="lax", secure=_is_https(request), path="/")


def _base_url(request: Request) -> str:
    if config.PUBLIC_URL:
        return config.PUBLIC_URL
    scheme = "https" if _is_https(request) else "http"
    return f"{scheme}://{request.headers.get('host', 'localhost')}"


def _me(user: accounts.User) -> dict:
    return accounts.public_user(user, reserved=store.reserved_for(user.id))


def _check_plan(plan: config.Plan, count: int) -> None:
    if count > plan.max_clips:
        raise HTTPException(400, f"Ton forfait {plan.label} permet jusqu'à {plan.max_clips} shorts par vidéo.")


def _check_capacity(request: Request, user: accounts.User, count: int) -> None:
    """Refuse early (before reading a large upload) when the queue or this person's quota is full."""
    try:
        store.check_capacity(f"user:{user.id}", user, count, ip=_client_id(request))
    except jobs.QueueFull as exc:
        raise HTTPException(429, str(exc)) from exc
    except jobs.QuotaExceeded as exc:
        raise HTTPException(402, str(exc)) from exc


def _create(request: Request, user: accounts.User, req: jobs.JobRequest) -> jobs.Job:
    try:
        return store.create(f"user:{user.id}", req, user, ip=_client_id(request))
    except jobs.QueueFull as exc:
        raise HTTPException(429, str(exc)) from exc
    except jobs.QuotaExceeded as exc:
        raise HTTPException(402, str(exc)) from exc


@app.post("/api/auth/signup")
def signup(body: Credentials, request: Request, response: Response) -> dict:
    try:
        accounts.check_signup_rate(_client_id(request))
        user = accounts.create_user(body.email, body.password)
    except accounts.AccountError as exc:
        raise HTTPException(exc.status, str(exc)) from exc
    _set_session(response, request, accounts.create_session(user.id))
    return {"user": _me(user)}


@app.post("/api/auth/login")
def login(body: Credentials, request: Request, response: Response) -> dict:
    try:
        user = accounts.authenticate(body.email, body.password, _client_id(request))
    except accounts.AccountError as exc:
        raise HTTPException(exc.status, str(exc)) from exc
    _set_session(response, request, accounts.create_session(user.id))
    return {"user": _me(user)}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response) -> dict:
    accounts.delete_session(request.cookies.get(SESSION_COOKIE))
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@app.get("/api/me")
def me(request: Request) -> dict:
    user = _current_user(request)
    return {"user": _me(user) if user else None}


# ------------------------------------------------------------------------------- billing

@app.post("/api/billing/checkout")
def billing_checkout(body: CheckoutIn, request: Request) -> dict:
    user = _current_user(request)
    if user is None:
        raise HTTPException(401, "Connecte-toi pour t'abonner.")
    try:
        return billing.checkout(user, body.plan, body.interval, _base_url(request))
    except billing.BillingError as exc:
        raise HTTPException(exc.status, str(exc)) from exc


@app.post("/api/billing/portal")
def billing_portal(request: Request) -> dict:
    user = _current_user(request)
    if user is None:
        raise HTTPException(401, "Connecte-toi pour gérer ton abonnement.")
    try:
        return billing.portal(user, _base_url(request))
    except billing.BillingError as exc:
        raise HTTPException(exc.status, str(exc)) from exc


@app.post("/api/billing/webhook")
async def billing_webhook(request: Request) -> dict:
    payload = await request.body()
    try:
        result = await run_in_threadpool(billing.handle_webhook, payload, request.headers.get("stripe-signature"))
    except billing.BillingError as exc:
        raise HTTPException(exc.status, str(exc)) from exc
    return {"received": True, "result": result}


# ------------------------------------------------------------------------------ API

@app.get("/api/health")
def health() -> dict:
    data = {
        "ok": True,
        "version": "1.0",
        "features": {
            "download": True,
            "transcription": transcribe.available(),
            "llm": config.llm_configured(),
            "face_tracking": reframe.available(),
            "accounts": True,
            "billing": billing.configured(),
            "ffmpeg": media.ffmpeg_available(),
            "twitch_auto": twitch.helix_configured(),
            "email": notify.smtp_configured(),
        },
        "limits": {"max_upload_mb": config.MAX_UPLOAD_MB},
        "plans": {k: p.public() for k, p in config.PLANS.items()},
    }
    if not billing.configured():
        # Shown to the owner on their own computer: how to give a plan by hand while Stripe is off
        data["admin_command"] = config.ADMIN_COMMAND
    return data


@app.post("/api/jobs", status_code=202)
def create_job(body: JobIn, request: Request) -> dict:
    user = _require_user(request)
    try:
        sources.detect_platform(body.url)
    except sources.SourceError as exc:
        raise HTTPException(400, str(exc)) from exc
    plan = user.plan_obj
    _check_plan(plan, body.count)
    job = _create(request, user, jobs.JobRequest(
        url=body.url.strip(), filename=None, duration=body.duration, count=body.count,
        plan=plan.key, options=body.options.model_dump(), user_id=user.id, month=accounts.month_key(),
    ))
    store.enqueue(job)
    return {"id": job.id, "status": job.status}


@app.post("/api/jobs/upload", status_code=202)
async def create_upload_job(request: Request) -> dict:
    limit = config.MAX_UPLOAD_MB * 1024 * 1024
    length = request.headers.get("content-length", "")
    # The body is buffered to a temp file while it is parsed, so its size must be known first:
    # browsers always send Content-Length for a file upload, a chunked body is refused.
    if not length.isdigit():
        raise HTTPException(411, "Envoi refusé : taille du fichier inconnue.")
    if int(length) > limit + 1024 * 1024:
        raise HTTPException(413, f"Fichier trop lourd (maximum {config.MAX_UPLOAD_MB} Mo).")
    user = _require_user(request)
    _check_capacity(request, user, 1)
    try:
        form = await request.form(max_files=1, max_fields=10)
    except Exception as exc:  # noqa: BLE001 - malformed multipart bodies
        raise HTTPException(400, "Envoi du fichier invalide.") from exc
    upload = form.get("file")
    if not isinstance(upload, UploadFile):
        raise HTTPException(400, "Aucun fichier vidéo reçu.")
    try:
        options = Options(**json.loads(str(form.get("options") or "{}")))
        body = JobIn(
            url="upload://local", duration=int(str(form.get("duration") or 90)),
            count=int(str(form.get("count") or 3)), options=options,
        )
    except (ValueError, TypeError) as exc:
        raise HTTPException(400, "Paramètres invalides : durée entre 60 et 180 s, 1 à 12 shorts.") from exc
    plan = user.plan_obj
    _check_plan(plan, body.count)
    filename = os.path.basename(upload.filename or "video.mp4")[:200]
    job = _create(request, user, jobs.JobRequest(
        url=None, filename=filename, duration=body.duration, count=body.count,
        plan=plan.key, options=body.options.model_dump(), user_id=user.id, month=accounts.month_key(),
    ))
    try:
        source = await run_in_threadpool(sources.save_upload, upload.file, filename, jobs.job_dir(job.id), plan)
    except sources.SourceError as exc:
        store.discard(job)
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # disk full, ffprobe missing...: never leave a job stuck in "queued"
        store.discard(job)
        log.exception("upload failed")
        raise HTTPException(500, "L'envoi du fichier a échoué côté serveur. Réessaie dans un instant.") from exc
    finally:
        await upload.close()
    job.upload_path = str(source.path)
    job.source = {"title": source.title, "platform": "upload", "platform_name": "Fichier",
                  "duration": round(source.probe.duration, 2), "thumbnail": None,
                  "width": source.probe.width, "height": source.probe.height}
    job.save(force=True)
    store.enqueue(job)
    return {"id": job.id, "status": job.status}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict:
    if not re.fullmatch(jobs.JOB_ID_RE, job_id):
        raise HTTPException(404, "Analyse introuvable.")
    job = store.get(job_id)
    if job is None:
        raise HTTPException(404, "Analyse introuvable ou expirée : relance-la.")
    return job.public(store.queue_position(job_id))


@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: str, request: Request) -> dict:
    if not re.fullmatch(jobs.JOB_ID_RE, job_id):
        raise HTTPException(404, "Analyse introuvable.")
    job = store.get(job_id)
    if job is None:
        raise HTTPException(404, "Analyse introuvable ou expirée.")
    user = _current_user(request)
    if job.request.user_id is not None and (user is None or user.id != job.request.user_id):
        raise HTTPException(403, "Seul l'auteur de l'analyse peut l'annuler.")
    if job.status in ("queued", "running"):
        store.cancel(job)
    return {"id": job.id, "status": job.status}


# ------------------------------------------------------------------- automatic Twitch import

AUTO_IMPORT_PLAN = "pro"


def _import_settings(raw: dict, plan: config.Plan) -> dict:
    """The studio settings saved with the link, checked like a manual analysis (and clamped to the plan)."""
    try:
        duration = int(raw.get("duration") or 90)
        count = int(raw.get("count") or 3)
        options = Options(**(raw.get("options") or {})).model_dump()
    except (TypeError, ValueError) as exc:
        raise HTTPException(400, "Réglages du Studio invalides : vérifie-les puis réessaie.") from exc
    return {
        "duration": min(config.MAX_CLIP_SECONDS, max(config.MIN_CLIP_SECONDS, duration)),
        "count": min(plan.max_clips, max(1, count)),
        "options": options,
    }


def _public_link(link: dict | None) -> dict | None:
    if not link:
        return None
    return {"login": link["login"], "enabled": bool(link["enabled"]), "last_vod_id": link.get("last_vod_id"),
            "last_error": link.get("last_error"), "updated_at": link.get("updated_at")}


def _start_twitch_import(user_id: int, settings: dict, vod: dict) -> None:
    """Called by the importer when a creator's live has ended: analyse its VOD like a manual job."""
    user = accounts.get_user(user_id)
    if user is None:
        raise RuntimeError("Compte introuvable.")
    if user.plan != AUTO_IMPORT_PLAN:
        raise RuntimeError("L'import automatique est réservé au forfait Pro.")
    if not media.ffmpeg_available():
        raise RuntimeError(media.FFMPEG_MISSING)
    s = _import_settings(settings, user.plan_obj)
    job = store.create(f"user:{user.id}", jobs.JobRequest(
        url=vod["url"], filename=None, duration=s["duration"], count=s["count"], plan=user.plan,
        options=s["options"], user_id=user.id, month=accounts.month_key(), notify=True,
        auto={"kind": "twitch", "vod_id": vod["id"], "title": str(vod.get("title") or "")[:200]},
    ), user, ip="twitch-auto")
    store.enqueue(job)
    log.info("automatic Twitch import of VOD %s for account %s: job %s", vod["id"], user.id, job.id)


@app.get("/api/me/twitch")
def get_twitch_link(request: Request) -> dict:
    user = _current_user(request)
    if user is None:
        raise HTTPException(401, "Connecte-toi pour relier ta chaîne Twitch.")
    return {"available": twitch.helix_configured(), "link": _public_link(twitch.get_link(user.id))}


@app.post("/api/me/twitch")
def save_twitch_link(body: TwitchIn, request: Request) -> dict:
    user = _current_user(request)
    if user is None:
        raise HTTPException(401, "Connecte-toi pour relier ta chaîne Twitch.")
    if user.plan != AUTO_IMPORT_PLAN:
        raise HTTPException(403, "L'import automatique est réservé au forfait Pro.")
    if not twitch.helix_configured():
        raise HTTPException(503, "Import automatique indisponible : il manque les clés Twitch sur ce serveur (README).")
    existing = twitch.get_link(user.id)
    if not body.login.strip():
        if body.enabled:
            raise HTTPException(400, "Indique le nom de ta chaîne Twitch.")
        twitch.delete_link(user.id)
        return {"link": None}
    login = twitch.normalize_login(body.login)
    if not login:
        raise HTTPException(400, "Ce nom de chaîne Twitch n'est pas valide : c'est ce qui suit twitch.tv/.")
    tw_user = twitch.helix().get_user(login)
    if tw_user is None:
        raise HTTPException(404, "Chaîne Twitch introuvable : vérifie son nom (ou réessaie dans un instant).")
    settings = _import_settings(body.settings, user.plan_obj)
    same_channel = bool(existing) and existing["broadcaster_id"] == tw_user["id"]
    last = existing.get("last_vod_id") if same_channel else None
    if body.enabled and not (same_channel and existing["enabled"]):
        # from now on: the VODs already online are not imported
        last = twitch.current_latest_vod_id(tw_user["id"]) or last
    twitch.save_link(user.id, tw_user["login"], tw_user["id"], body.enabled, settings, last)
    return {"link": _public_link(twitch.get_link(user.id))}


# ------------------------------------------------------------------------- re-editing

def _owned_job(job_id: str, request: Request) -> tuple[jobs.Job, accounts.User]:
    if not re.fullmatch(jobs.JOB_ID_RE, job_id):
        raise HTTPException(404, "Analyse introuvable.")
    job = store.get(job_id)
    if job is None:
        raise HTTPException(404, "Analyse introuvable ou expirée.")
    user = _current_user(request)
    if user is None:
        raise HTTPException(401, "Connecte-toi pour modifier tes shorts.")
    if job.request.user_id != user.id:
        raise HTTPException(403, "Seul l'auteur de l'analyse peut modifier ses shorts.")
    return job, user


def _edit_call(fn, *args):
    try:
        return fn(*args)
    except edits.EditError as exc:
        raise HTTPException(exc.status, str(exc)) from exc


@app.get("/api/jobs/{job_id}/clips/{index}/words")
def clip_words(job_id: str, index: int, request: Request) -> dict:
    job, _ = _owned_job(job_id, request)
    return _edit_call(edits.words, job, index)


@app.post("/api/jobs/{job_id}/clips/{index}/recut", status_code=202)
def recut_clip(job_id: str, index: int, body: RecutIn, request: Request) -> dict:
    job, _ = _owned_job(job_id, request)
    _edit_call(edits.recut, job, index, body.start, body.end, store.submit_edit)
    return job.public()


@app.post("/api/jobs/{job_id}/clips/{index}/replace", status_code=202)
def replace_clip(job_id: str, index: int, request: Request) -> dict:
    job, _ = _owned_job(job_id, request)
    _edit_call(edits.replace, job, index, store.submit_edit)
    return job.public()


@app.post("/api/jobs/{job_id}/clips/{index}/refund")
def refund_clip(job_id: str, index: int, request: Request) -> dict:
    job, user = _owned_job(job_id, request)
    left = _edit_call(edits.refund, job, index, user)
    return {"job": job.public(), "refunds_left": left, "user": _me(accounts.get_user(user.id) or user)}


@app.get("/api/jobs/{job_id}/clips/{name}")
def get_clip_file(job_id: str, name: str):
    if not re.fullmatch(jobs.JOB_ID_RE, job_id) or not re.fullmatch(r"\d{1,2}(-v\d{1,3})?\.(mp4|jpg)", name):
        raise HTTPException(404, "Fichier introuvable.")
    if store.get(job_id) is None:
        raise HTTPException(404, "Fichier introuvable.")
    path = jobs.job_dir(job_id) / "clips" / name
    if not path.is_file():
        raise HTTPException(404, "Fichier introuvable.")
    media_type = "video/mp4" if name.endswith(".mp4") else "image/jpeg"
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "private, max-age=3600"})


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=getattr(exc, "headers", None))


# --------------------------------------------------------------------------- website
# Only the public files are served: never the server code or the data folder.

def _site_file(name: str, media_type: str) -> FileResponse:
    return FileResponse(config.ROOT / name, media_type=media_type, headers={"Cache-Control": "no-cache"})


@app.get("/", include_in_schema=False)
def index():
    return _site_file("index.html", "text/html; charset=utf-8")


@app.get("/styles.css", include_in_schema=False)
def styles():
    return _site_file("styles.css", "text/css; charset=utf-8")


@app.get("/main.js", include_in_schema=False)
def script():
    return _site_file("main.js", "text/javascript; charset=utf-8")


app.mount("/assets", StaticFiles(directory=config.ROOT / "assets"), name="assets")
app.mount("/fonts", StaticFiles(directory=config.ROOT / "fonts"), name="fonts")
