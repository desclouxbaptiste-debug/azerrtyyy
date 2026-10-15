"""Changing a short after the analysis: re-cut it (retouche), swap it for another moment, give its credit back."""

from __future__ import annotations

import logging
import math
import shutil

from . import accounts, config, media
from .jobs import Job, job_dir

log = logging.getLogger("clipzo.edits")


class EditError(RuntimeError):
    """Shown to the user as is. `status` is the HTTP status to answer with."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def _ready_clip(job: Job, index: int) -> dict:
    if not job.editable:
        raise EditError("La vidéo d'origine n'est plus gardée sur le serveur : relance l'analyse pour retoucher "
                        "ce short.", 410)
    clip = job.clip(index)
    if clip is None:
        raise EditError("Short introuvable.", 404)
    if clip.get("status") == "rendering":
        raise EditError("Ce short est déjà en cours de modification : attends quelques secondes.", 409)
    return clip


def recut(job: Job, index: int, start: float, end: float, submit) -> dict:
    """Validate a new cut of short `index` and queue its render (free: same short, new edges)."""
    clip = _ready_clip(job, index)
    if not (math.isfinite(start) and math.isfinite(end)):
        raise EditError("Début ou fin invalide.")
    start, end = round(max(0.0, start), 2), round(end, 2)
    duration = float((job.source or {}).get("duration") or 0)
    lo = max(0.0, float(clip["orig_start"]) - config.EDIT_MARGIN_SECONDS)
    hi = float(clip["orig_end"]) + config.EDIT_MARGIN_SECONDS
    if duration:
        hi = min(hi, duration)
    if start < lo - 0.01 or end > hi + 0.01:
        raise EditError(f"Une retouche peut décaler le début et la fin de {config.EDIT_MARGIN_SECONDS} s au plus "
                        "autour du short d'origine.")
    if end - start < config.MIN_EDIT_SECONDS:
        raise EditError(f"Un short doit durer au moins {config.MIN_EDIT_SECONDS} s.")
    if end - start > config.MAX_CLIP_SECONDS + 0.01:
        raise EditError(f"Un short dure au plus {config.MAX_CLIP_SECONDS // 60} min.")
    if abs(start - float(clip["start"])) < 0.05 and abs(end - float(clip["end"])) < 0.05:
        raise EditError("Ce sont déjà le début et la fin de ce short.")
    if int(clip.get("recuts", 0)) >= config.MAX_RECUTS_PER_CLIP:
        raise EditError(f"Ce short a déjà été retouché {config.MAX_RECUTS_PER_CLIP} fois.", 429)
    peak = float(clip.get("peak", (start + end) / 2))
    pick = {"start": start, "end": end, "peak": peak if start <= peak <= end else (start + end) / 2}
    job.update_clip(index, status="rendering", recuts=int(clip.get("recuts", 0)) + 1, edit_error=None)
    submit(_render_edit, job, index, pick, False)
    return job.clip(index) or clip


def replace(job: Job, index: int, submit) -> dict:
    """Swap short `index` for the best unused moment (free: it stays the same short of the quota)."""
    _ready_clip(job, index)
    if job.replaces >= config.MAX_REPLACES_PER_JOB:
        raise EditError(f"Tu as déjà remplacé {config.MAX_REPLACES_PER_JOB} shorts de cette vidéo.", 429)
    others = [c for c in job.clips if not c.get("removed") and c.get("index") != index]
    pick = None
    with job._lock:
        for k, alt in enumerate(job.alternatives):
            if not any(_overlap(alt["start"], alt["end"], c["start"], c["end"]) > 0.3 for c in others):
                pick = job.alternatives.pop(k)
                break
    if pick is None:
        raise EditError("Plus d'autre moment fort dans cette vidéo : retouche ce short ou analyse une autre vidéo.", 409)
    job.replaces += 1
    job.update_clip(index, status="rendering", edit_error=None)
    submit(_render_edit, job, index, pick, True)
    return job.clip(index) or {}


def refund(job: Job, index: int, user: accounts.User) -> int:
    """"Satisfait ou recrédité": delete the short and give its credit back. Returns the refunds left this month."""
    if not job._public_edit()["refundable"]:
        if config.PLANS[job.request.plan].monthly_quota is None:
            raise EditError("Ton forfait est illimité : il n'y a pas de crédit à récupérer.")
        raise EditError("Ce short date d'un mois précédent : il ne peut plus être recrédité.", 409)
    clip = job.clip(index)
    if clip is None:
        raise EditError("Short introuvable.", 404)
    if clip.get("status") == "rendering":
        raise EditError("Ce short est en cours de modification : attends quelques secondes.", 409)
    try:
        left = accounts.refund_short(user.id, job.request.month)
    except accounts.AccountError as exc:
        raise EditError(str(exc), exc.status) from exc
    job.update_clip(index, removed=True)
    for name in (clip.get("video_url"), clip.get("thumb_url")):
        _delete_clip_file(job, name)
    return left


def words(job: Job, index: int) -> dict:
    """Transcript words around a short, to pick its new edges word by word."""
    from .pipeline import load_transcript

    clip = job.clip(index)
    if clip is None:
        raise EditError("Short introuvable.", 404)
    pub = job._public_clip(clip)
    lo, hi = pub["edit_min"], pub["edit_max"]
    transcript = load_transcript(job_dir(job.id))
    found = []
    if transcript is not None:
        found = [[round(w.start, 2), round(w.end, 2), w.text] for w in transcript.words if w.end > lo and w.start < hi]
    return {"min": lo, "max": hi, "start": clip["start"], "end": clip["end"], "words": found[:4000]}


# ------------------------------------------------------------------------------ rendering (edit worker)

def _render_edit(job: Job, index: int, pick: dict, replacing: bool) -> None:
    from .pipeline import load_transcript, render_pick
    from .virality import _shorten

    clip = job.clip(index) or {}
    version = int(clip.get("version", 0)) + 1
    work = job_dir(job.id)
    tmp = work / "edits" / f"{index}-v{version}"
    try:
        src = job.source_path()
        if src is None or not src.is_file():
            raise media.MediaError("La vidéo d'origine n'est plus disponible.")
        info = media.probe(src)
        transcript = load_transcript(work)
        result = render_pick(job, src, info, transcript, pick, tmp, index)
        clips_dir = work / "clips"
        video = clips_dir / f"{index}-v{version}.mp4"
        thumb = clips_dir / f"{index}-v{version}.jpg"
        result.video.replace(video)
        result.thumb.replace(thumb)
        changes = {
            "start": round(pick["start"], 2),
            "end": round(pick["start"] + result.duration, 2),
            "duration": round(result.duration, 2),
            "video_url": f"/api/jobs/{job.id}/clips/{video.name}",
            "thumb_url": f"/api/jobs/{job.id}/clips/{thumb.name}",
            "width": result.width, "height": result.height,
            "layout": result.layout, "subtitles": result.has_subtitles,
            "version": version, "status": "ready", "edit_error": None,
        }
        if transcript is not None and transcript.segments:
            changes["transcript"] = transcript.text_between(pick["start"], pick["end"])[:800]
        if replacing:
            first = next((s for s in (transcript.segments if transcript else []) if s.start >= pick["start"] - 0.5), None)
            changes.update({
                "orig_start": round(pick["start"], 2), "orig_end": round(pick["end"], 2), "peak": pick["peak"],
                "recuts": 0, "score": int(pick.get("score", 0)), "title": pick.get("title") or "Moment fort",
                "hook": pick.get("hook") or (_shorten(first.text, 110) if first else ""),
                "hashtags": pick.get("hashtags") or [], "reasons": pick.get("reasons") or [],
                "transcript": (pick.get("transcript") or changes.get("transcript") or "")[:800],
            })
        old = (clip.get("video_url"), clip.get("thumb_url"))
        job.update_clip(index, **changes)
        for name in old:
            _delete_clip_file(job, name)
    except Exception as exc:  # noqa: BLE001 - the previous version of the short stays as it was
        log.warning("edit of short %d failed for %s: %s", index, job.id, exc)
        undo = {"status": "ready", "edit_error": "La modification a échoué : le short précédent est conservé."}
        if replacing:
            with job._lock:
                job.alternatives.insert(0, pick)
            job.replaces = max(0, job.replaces - 1)
        else:
            undo["recuts"] = max(0, int(clip.get("recuts", 1)) - 1) if clip else 0
        job.update_clip(index, **undo)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def _delete_clip_file(job: Job, url: str | None) -> None:
    if not url:
        return
    name = url.rsplit("/", 1)[-1].split("?", 1)[0]
    try:
        (job_dir(job.id) / "clips" / name).unlink(missing_ok=True)
    except OSError as exc:  # still being streamed (Windows): removed with the job
        log.info("could not delete %s yet: %s", name, exc)


def _overlap(a0: float, a1: float, b0: float, b1: float) -> float:
    inter = min(a1, b1) - max(a0, b0)
    return max(0.0, inter) / max(1e-6, min(a1 - a0, b1 - b0))
