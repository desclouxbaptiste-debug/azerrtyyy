"""The full analysis: source → audio → transcript → scenes → viral moments → rendered shorts."""

from __future__ import annotations

import logging
import math
from pathlib import Path

import numpy as np

from . import config, llm, media, reframe, render, sources, transcribe, virality
from .jobs import Job, JobCancelled, job_dir
from .sources import PLATFORM_NAMES, Source, SourceError

log = logging.getLogger("clipzo.pipeline")

OPTION_LABELS = {
    "subs": "Sous-titres automatiques",
    "nowm": "Sans filigrane",
    "hooks": "Titres & hashtags IA",
    "animsubs": "Sous-titres animés",
}


def effective_options(plan: config.Plan, options: dict[str, bool]) -> tuple[dict[str, bool], list[str]]:
    """What the plan really allows, plus a warning for each requested option it doesn't include."""
    allowed = {
        "subs": plan.subtitles,
        "nowm": not plan.watermark_required,
        "hooks": plan.ai_titles,
        "animsubs": plan.animated_subtitles,
    }
    warnings = [
        f"« {OPTION_LABELS[k]} » n'est pas inclus dans le forfait {plan.label} : option ignorée."
        for k, ok in allowed.items() if options.get(k) and not ok
    ]
    eff = {k: bool(options.get(k)) and ok for k, ok in allowed.items()}
    eff["reframe"] = bool(options.get("reframe", True))
    if eff["animsubs"]:
        eff["subs"] = True
    return eff, warnings


def run(job: Job) -> None:
    req = job.request
    plan = config.PLANS[req.plan]
    work = job_dir(job.id)
    opts, option_warnings = effective_options(plan, req.options)
    for w in option_warnings:
        job.warn(w)
    raw_audio = work / "audio.s16le"
    source: Source | None = None
    try:
        # 1. Get the video -------------------------------------------------------------
        job.set_step("download", "Récupération de la vidéo…")
        if req.url:
            source = sources.download(req.url, work, plan, lambda f, msg: job.update(f, msg))
        else:
            path = Path(job.upload_path or "")
            source = Source(path=path, platform="upload", title=job.source["title"] if job.source else "Ma vidéo",
                            probe=media.probe(path))
        info = source.probe
        job.source = {
            "title": source.title,
            "platform": source.platform,
            "platform_name": PLATFORM_NAMES.get(source.platform, source.platform),
            "duration": round(info.duration, 2),
            "thumbnail": source.thumbnail if (source.thumbnail or "").startswith("https://") else None,
            "width": info.width,
            "height": info.height,
        }
        job.update(1.0, f"Vidéo récupérée : {source.title}")
        n = max(1, int(math.ceil(info.duration)))

        # 2. Audio ---------------------------------------------------------------------
        job.set_step("audio", "Analyse du son…")
        pcm = np.zeros(0, dtype=np.int16)
        if info.has_audio:
            media.extract_audio(source.path, raw_audio, info.duration, lambda f: job.update(f * 0.8))
            pcm = media.load_pcm(raw_audio)[: (n + 1) * media.AUDIO_RATE]
            loud_mean, loud_peak = media.loudness_per_second(pcm, n)
        else:
            loud_mean = loud_peak = np.full(n, -90.0, dtype=np.float32)
            job.warn("Cette vidéo n'a pas de son : l'analyse se base uniquement sur l'image.")
        job.update(1.0)

        # 3. Transcript ----------------------------------------------------------------
        job.set_step("transcribe", "Transcription de la parole…")
        transcript = None
        if len(pcm) and transcribe.available():
            try:
                transcript = transcribe.transcribe(
                    pcm, info.duration,
                    lambda f: job.update(f, f"Transcription de la parole… {int(f * 100)} %"),
                )
            except transcribe.TranscriptionUnavailable as exc:
                job.warn(f"Transcription indisponible ({exc}) : pas de sous-titres, analyse sans les paroles.")
        elif len(pcm):
            job.warn("Transcription désactivée sur ce serveur : pas de sous-titres, analyse sans les paroles.")
        if transcript is not None:
            job.signals["transcript"] = bool(transcript.segments)
            if not transcript.segments:
                job.warn("Aucune parole détectée dans la vidéo.")
        if opts["subs"] and not (transcript and transcript.segments):
            opts["subs"] = opts["animsubs"] = False
        job.update(1.0)

        # 4. Visual changes ------------------------------------------------------------
        job.set_step("scenes", "Détection des changements de plan…")
        try:
            scenes = media.scene_scores_per_second(source.path, info.duration, work, lambda f: job.update(f))
        except media.MediaError as exc:
            log.warning("scene detection failed for %s: %s", job.id, exc)
            scenes = None

        # 5. Viral moments -------------------------------------------------------------
        job.set_step("score", "Calcul du score de viralité…")
        use_llm = config.llm_configured() and transcript is not None and bool(transcript.segments)
        pool = min(req.count * 3, 30) if use_llm else req.count
        analysis = virality.analyse(
            duration=info.duration, loud_mean=loud_mean, loud_peak=loud_peak, scenes=scenes,
            transcript=transcript, heatmap=source.heatmap, chat=source.chat,
            clip_seconds=req.duration, count=pool, platform=source.platform,
        )
        job.curve = analysis.curve
        used = set(analysis.signals_used)
        job.signals.update({
            "audio": "energy" in used, "scenes": "visual" in used,
            "heatmap": "heatmap" in used, "chat": "chat" in used,
        })
        job.update(0.5)

        picks = _picks_from_algorithm(analysis.candidates[: req.count])
        if use_llm and transcript is not None:
            job.update(0.6, "Claude analyse les meilleurs moments…")
            try:
                choices = llm.rank(source.title, PLATFORM_NAMES.get(source.platform, source.platform), transcript,
                                   analysis.candidates, req.duration, req.count, info.duration)
                picks = _picks_from_llm(choices, ai_text=opts["hooks"])
                job.signals["llm"] = True
            except llm.LLMUnavailable as exc:
                job.warn(f"Analyse IA indisponible ({exc}) : classement par l'algorithme seul.")
            except Exception:  # noqa: BLE001 - Claude is a bonus, never fail the job for it
                log.exception("Claude ranking failed for %s", job.id)
                job.warn("Analyse IA indisponible : classement par l'algorithme seul.")
        if opts["hooks"] and not job.signals["llm"]:
            why = ("pas de paroles à analyser" if config.llm_configured()
                   else "Claude n'est pas configuré sur ce serveur")
            job.warn(f"Titres IA indisponibles ({why}) : titres tirés de la vidéo.")
        if not opts["hooks"]:
            for p in picks:
                p["hashtags"] = []
        picks.sort(key=lambda p: p["score"], reverse=True)
        if len(picks) < req.count:
            job.warn(f"Cette vidéo n'a la place que pour {len(picks)} short{'s' if len(picks) > 1 else ''} "
                     f"distinct{'s' if len(picks) > 1 else ''} de cette durée (tu en demandais {req.count}). "
                     "Seuls les shorts livrés sont décomptés.")
        job.update(1.0)

        # 6. Render --------------------------------------------------------------------
        render_opts = render.RenderOptions(
            reframe=opts["reframe"], subtitles=opts["subs"],
            animated_subtitles=opts["animsubs"], watermark=not opts["nowm"],
        )
        clip_dir = work / "clips"
        total = len(picks)
        job.set_step("render", f"Découpage du short 1/{total}…")
        for i, p in enumerate(picks):
            def prog(f: float, i: int = i) -> None:
                job.update((i + f) / total, f"Découpage du short {i + 1}/{total}… {int(f * 100)} %")

            face_x = None
            if opts["reframe"] and plan.face_tracking and not info.is_vertical:
                job.update(i / total, f"Recherche du visage pour le short {i + 1}/{total}…")
                try:
                    face_x = reframe.face_center(source.path, p["start"], p["end"] - p["start"])
                except Exception as exc:  # noqa: BLE001 - optional, fall back to the blurred layout
                    log.warning("face tracking failed: %s", exc)
            try:
                result = render.render_clip(
                    source.path, info, p["start"], p["end"], clip_dir, i, plan, render_opts,
                    transcript, face_x, p["peak"], prog,
                )
            except media.MediaError:
                log.warning("render of short %d failed for %s", i + 1, job.id)
                job.warn(f"Le short n°{i + 1} n'a pas pu être découpé : il a été ignoré.")
                continue
            if result.layout == "face":
                job.signals["faces"] = True
            job.add_clip({
                "index": i,
                "start": round(p["start"], 2),
                "end": round(p["start"] + result.duration, 2),
                "duration": round(result.duration, 2),
                "score": int(p["score"]),
                "title": p["title"],
                "hook": p["hook"],
                "hashtags": p["hashtags"],
                "reasons": p["reasons"],
                "transcript": p["transcript"][:800],
                "video_url": f"/api/jobs/{job.id}/clips/{i}.mp4",
                "thumb_url": f"/api/jobs/{job.id}/clips/{i}.jpg",
                "width": result.width,
                "height": result.height,
                "layout": result.layout,
                "subtitles": result.has_subtitles,
            })
        if not job.clips:
            raise media.MediaError("Aucun short n'a pu être découpé dans cette vidéo.")
        job.finish()
    except JobCancelled:
        job.fail("Analyse annulée.")
    except (SourceError, media.MediaError) as exc:
        job.fail("Analyse annulée." if job.cancel_requested else str(exc))
    except Exception:  # noqa: BLE001 - never leave a job stuck in "running"
        if job.cancel_requested:
            job.fail("Analyse annulée.")
        else:
            log.exception("job %s failed", job.id)
            job.fail("Erreur inattendue pendant le traitement. Réessaie, ou envoie directement le fichier vidéo.")
    finally:
        # Keep the shorts, drop the heavy intermediate files.
        raw_audio.unlink(missing_ok=True)
        if source is not None:
            source.path.unlink(missing_ok=True)
        for leftover in work.glob("source.*"):
            leftover.unlink(missing_ok=True)


def _picks_from_algorithm(cands: list[virality.Candidate]) -> list[dict]:
    return [{
        "start": c.start, "end": c.end, "peak": c.peak_time, "score": c.score, "title": c.title,
        "hook": c.hook, "hashtags": list(c.hashtags), "reasons": list(c.reasons), "transcript": c.transcript,
    } for c in cands]


def _picks_from_llm(choices: list[llm.LLMChoice], ai_text: bool) -> list[dict]:
    """Claude's ranking for every plan; its titles, hooks and hashtags only when the plan includes them."""
    picks = []
    for ch in choices:
        c = ch.candidate
        reasons = list(ch.why)
        for r in c.reasons:
            if len(reasons) >= 4:
                break
            if r not in reasons:
                reasons.append(r)
        picks.append({
            "start": ch.start, "end": ch.end,
            "peak": c.peak_time if ch.start <= c.peak_time <= ch.end else (ch.start + ch.end) / 2,
            "score": round(0.6 * ch.virality + 0.4 * c.score),
            "title": (ch.title or c.title) if ai_text else c.title,
            "hook": (ch.hook or c.hook) if ai_text else c.hook,
            "hashtags": (ch.hashtags or list(c.hashtags)) if ai_text else [],
            "reasons": reasons,
            "transcript": c.transcript,
        })
    return picks
