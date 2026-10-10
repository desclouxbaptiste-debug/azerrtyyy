"""The full analysis: source → audio → transcript → scenes → viral moments → rendered shorts."""

from __future__ import annotations

import json
import logging
import math
import time
from pathlib import Path

import numpy as np

from . import accounts, config, llm, media, reframe, render, sources, styles, transcribe, virality
from .jobs import Job, JobCancelled, drop_inputs, job_dir
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
            except JobCancelled:
                raise
            except Exception:  # noqa: BLE001 - e.g. a GPU library missing: the video can still be cut
                log.exception("transcription failed for %s", job.id)
                transcript = None
                job.warn("Transcription indisponible : pas de sous-titres, analyse sans les paroles.")
        elif len(pcm):
            job.warn("Transcription désactivée sur ce serveur : pas de sous-titres, analyse sans les paroles.")
        if transcript is not None:
            job.signals["transcript"] = bool(transcript.segments)
            if not transcript.segments:
                job.warn("Aucune parole détectée dans la vidéo.")
        if opts["subs"] and not (transcript and transcript.segments):
            opts["subs"] = opts["animsubs"] = False
        if transcript is not None and transcript.segments:
            _save_transcript(work, transcript)  # for re-editing the shorts later (subtitles, word-level trimming)
        job.update(1.0)

        pcm = None  # release the memory-mapped audio: Windows can't delete a file that is still mapped
        _remove(raw_audio)

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
        # More candidates than shorts: Claude picks among them, and the rest are spares for "autre moment"
        pool = min(req.count * 3, 30)
        analysis = virality.analyse(
            duration=info.duration, loud_mean=loud_mean, loud_peak=loud_peak, scenes=scenes,
            transcript=transcript, heatmap=source.heatmap, chat=source.chat,
            clip_seconds=req.duration, count=pool, platform=source.platform, clips=source.clips,
        )
        job.curve = analysis.curve
        used = set(analysis.signals_used)
        job.signals.update({
            "audio": "energy" in used, "scenes": "visual" in used,
            "heatmap": "heatmap" in used, "chat": "chat" in used, "clips": "clips" in used,
        })
        job.update(0.5)

        picks = _picks_from_algorithm(analysis.candidates[: req.count])
        if use_llm and transcript is not None:
            job.update(0.6, "Claude analyse les meilleurs moments…")
            try:
                choices = llm.rank(source.title, PLATFORM_NAMES.get(source.platform, source.platform), transcript,
                                   analysis.candidates, req.duration, req.count, info.duration,
                                   check_cancel=job.check_cancel)
                picks = _picks_from_llm(choices, ai_text=opts["hooks"], transcript=transcript)
                job.signals["llm"] = True
            except llm.LLMUnavailable as exc:
                job.warn(f"Analyse IA indisponible ({exc}) : classement par l'algorithme seul.")
            except JobCancelled:
                raise
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
        job.alternatives = _alternatives(analysis.candidates, picks, opts["hooks"])
        if len(picks) < req.count:
            job.warn(f"Cette vidéo n'a la place que pour {len(picks)} short{'s' if len(picks) > 1 else ''} "
                     f"distinct{'s' if len(picks) > 1 else ''} de cette durée (tu en demandais {req.count}). "
                     "Seuls les shorts livrés sont décomptés.")
        job.update(1.0)

        # 6. Render --------------------------------------------------------------------
        job.render_info = {"opts": opts, "layout": _layout(req.options, plan, job),
                           "style": styles.style_dict(req.options.get("style")) if opts["subs"] else None}
        clip_dir = work / "clips"
        total = len(picks)
        job.set_step("render", f"Découpage du short 1/{total}…")
        for i, p in enumerate(picks):
            def prog(f: float, i: int = i) -> None:
                job.update((i + f) / total, f"Découpage du short {i + 1}/{total}… {int(f * 100)} %")

            def looking(i: int = i) -> None:
                job.update(i / total, f"Recherche du visage pour le short {i + 1}/{total}…")

            try:
                result = render_pick(job, source.path, info, transcript, p, clip_dir, i, prog, looking)
            except media.MediaError:
                log.warning("render of short %d failed for %s", i + 1, job.id)
                job.warn(f"Le short n°{i + 1} n'a pas pu être découpé : il a été ignoré.")
                continue
            if result.layout in ("face", "streamer"):
                job.signals["faces"] = True
            job.check_cancel()  # rendered after a cancel: neither charged nor published
            # Charged before it is published: the quota check never sees the short without its charge
            _charge(job, 1)
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
                "peak": p["peak"],
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
        # Keep the shorts, drop the heavy intermediate files. The source stays a while when the shorts
        # can be re-edited (retouche, autre moment).
        pcm = None
        _remove(raw_audio)
        keep = None
        if source is not None:
            if job.status == "done" and config.KEEP_SOURCE_HOURS > 0 and source.path.is_file():
                keep = source.path.name
                job.source_file = keep
                job.editable_until = time.time() + config.KEEP_SOURCE_HOURS * 3600
                job.save(force=True)
            else:
                _remove(source.path)
        drop_inputs(job.id, keep=keep)
        try:
            _after_auto_import(job)
        except Exception:  # noqa: BLE001 - an e-mail problem never touches the shorts
            log.exception("after-import hook failed for %s", job.id)


def _after_auto_import(job: Job) -> None:
    """Automatic import after a live: e-mail the creator, remember a failure on the Twitch link."""
    req = job.request
    if req.auto and req.auto.get("kind") == "twitch" and job.status == "error" and req.user_id is not None:
        from . import twitch

        twitch.mark_vod(req.user_id, str(req.auto.get("vod_id") or ""), error=(job.error or "")[:300])
    if not req.notify or req.user_id is None:
        return
    from . import notify

    user = accounts.get_user(req.user_id)
    if user is None or not notify.smtp_configured():
        return
    title = (job.source or {}).get("title") or (req.auto or {}).get("title") or "ta vidéo"
    base = config.PUBLIC_URL or f"http://localhost:{config.PORT}"
    url = f"{base}/?job={job.id}"
    if job.status == "done":
        notify.send_async(notify.shorts_ready, user.email, title, len(job.clips), url)
    else:
        notify.send_async(notify.job_failed, user.email, title, job.error or "Erreur inconnue.", url)


def render_pick(job: Job, src: Path, info: media.ProbeInfo, transcript: transcribe.Transcript | None, pick: dict,
                out_dir: Path, index: int, progress=None, looking=None) -> render.RenderResult:
    """Render one short with the job's settings (used by the analysis and by re-edits)."""
    plan = config.PLANS[job.request.plan]
    opts = job.render_info.get("opts") or effective_options(plan, job.request.options)[0]
    render_opts = render.RenderOptions(
        reframe=opts["reframe"], subtitles=opts["subs"] and transcript is not None,
        animated_subtitles=opts["animsubs"], watermark=not opts["nowm"],
    )
    layout = job.render_info.get("layout") or "auto"
    style = job.render_info.get("style")
    faces = reframe.FaceInfo()
    if opts["reframe"] and plan.face_tracking and not info.is_vertical and layout != "full":
        if looking:
            looking()
        faces = reframe.analyse_faces(src, pick["start"], pick["end"] - pick["start"])  # never raises
    return render.render_clip(src, info, pick["start"], pick["end"], out_dir, index, plan, render_opts,
                              transcript, faces.face_x, pick["peak"], progress, facecam=faces.facecam,
                              layout=layout, style=styles.parse_style(style) if style is not None else None)


def _layout(options: dict, plan: config.Plan, job: Job) -> str:
    """Layout chosen in the studio, if the plan includes it."""
    layout = options.get("layout") if options.get("layout") in render.LAYOUTS else "auto"
    if layout in ("streamer", "face") and not plan.face_tracking:
        name = "Streamer" if layout == "streamer" else "Visage"
        job.warn(f"La mise en page « {name} » est incluse à partir du forfait Créateur : mise en page automatique.")
        return "auto"
    return layout


def _save_transcript(work: Path, transcript: transcribe.Transcript) -> None:
    try:
        (work / "transcript.json").write_text(json.dumps(transcript.to_dict(), ensure_ascii=False), encoding="utf-8")
    except OSError as exc:
        log.warning("could not save the transcript: %s", exc)


def load_transcript(work: Path) -> transcribe.Transcript | None:
    try:
        return transcribe.Transcript.from_dict(json.loads((work / "transcript.json").read_text(encoding="utf-8")))
    except (OSError, ValueError, KeyError, TypeError):
        return None


def _overlap(a0: float, a1: float, b0: float, b1: float) -> float:
    """Share of the shorter window covered by the other one."""
    inter = min(a1, b1) - max(a0, b0)
    return max(0.0, inter) / max(1e-6, min(a1 - a0, b1 - b0))


def _alternatives(cands: list[virality.Candidate], picks: list[dict], ai_text: bool, limit: int = 12) -> list[dict]:
    """Good moments that were not used, best first, none overlapping a delivered short much."""
    out: list[dict] = []
    for p in _picks_from_algorithm(sorted(cands, key=lambda c: c.score, reverse=True)):
        if any(_overlap(p["start"], p["end"], q["start"], q["end"]) > 0.3 for q in picks + out):
            continue
        if not ai_text:
            p["hashtags"] = []
        out.append(p)
        if len(out) >= limit:
            break
    return out


def _remove(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError as exc:  # e.g. still open on Windows: the cleanup thread retries later
        log.warning("could not delete %s: %s", path, exc)


def _charge(job: Job, shorts: int) -> None:
    """Only delivered shorts count against the monthly quota (cancelled / failed analyses are free)."""
    if job.request.user_id is None:
        return
    try:
        accounts.add_usage(job.request.user_id, shorts, job.request.month)
    except Exception:  # noqa: BLE001 - never lose a short because of the counter
        log.exception("could not record usage for job %s", job.id)


def _picks_from_algorithm(cands: list[virality.Candidate]) -> list[dict]:
    return [{
        "start": c.start, "end": c.end, "peak": c.peak_time, "score": c.score, "title": c.title,
        "hook": c.hook, "hashtags": list(c.hashtags), "reasons": list(c.reasons), "transcript": c.transcript,
    } for c in cands]


def _picks_from_llm(choices: list[llm.LLMChoice], ai_text: bool,
                    transcript: transcribe.Transcript | None = None) -> list[dict]:
    """Claude's ranking for every plan; its titles, hooks and hashtags only when the plan includes them."""
    picks = []
    for ch in choices:
        c = ch.candidate
        # Claude may have moved the edges: text shown to the creator must match the final cut.
        text, first = c.transcript, c.hook
        if transcript is not None and transcript.segments:
            text = transcript.text_between(ch.start, ch.end) or c.transcript
            seg = next((s for s in transcript.segments if s.start >= ch.start - 0.5 and s.start < ch.end), None)
            first = virality._shorten(seg.text, 110) if seg else c.hook
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
            "hook": (ch.hook or first) if ai_text else first,
            "hashtags": (ch.hashtags or list(c.hashtags)) if ai_text else [],
            "reasons": reasons,
            "transcript": text,
        })
    return picks
