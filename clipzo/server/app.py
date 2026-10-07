"""HTTP API + static site. Run with `python -m server` from the clipzo/ folder."""

from __future__ import annotations

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

from . import accounts, billing, config, jobs, reframe, sources, transcribe

logging.basicConfig(level=os.environ.get("CLIPZO_LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("clipzo")

store = jobs.JobStore()


@asynccontextmanager
async def lifespan(_: FastAPI):
    accounts.db()  # create the database file and tables
    store.start()
    log.info("Clipzo ready — data in %s, %d worker(s), Claude: %s, Whisper: %s",
             config.DATA_DIR, config.WORKERS, "on" if config.llm_configured() else "off",
             config.WHISPER_MODEL if transcribe.available() else "off")
    yield
    store.stop()


app = FastAPI(title="Clipzo", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
if config.CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["GET", "POST"],
                       allow_headers=["Content-Type"], allow_credentials=True)

SESSION_COOKIE = "clipzo_session"


@app.middleware("http")
async def same_origin_writes(request: Request, call_next):
    """Refuse POSTs sent by another website (CSRF). The Stripe webhook is signed, it is exempt."""
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


class JobIn(BaseModel):
    url: str = Field(min_length=4, max_length=2048)
    duration: int = Field(ge=config.MIN_CLIP_SECONDS, le=config.MAX_CLIP_SECONDS)
    count: int = Field(ge=1, le=12)
    plan: Literal["free", "creator", "pro"] | None = None  # ignored: the account's plan applies
    options: Options = Options()


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
    return {
        "ok": True,
        "version": "1.0",
        "features": {
            "download": True,
            "transcription": transcribe.available(),
            "llm": config.llm_configured(),
            "face_tracking": reframe.available(),
            "accounts": True,
            "billing": billing.configured(),
        },
        "limits": {"max_upload_mb": config.MAX_UPLOAD_MB},
        "plans": {k: p.public() for k, p in config.PLANS.items()},
    }


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


@app.get("/api/jobs/{job_id}/clips/{name}")
def get_clip_file(job_id: str, name: str):
    if not re.fullmatch(jobs.JOB_ID_RE, job_id) or not re.fullmatch(r"\d{1,2}\.(mp4|jpg)", name):
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
