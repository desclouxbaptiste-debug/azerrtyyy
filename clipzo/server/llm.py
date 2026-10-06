"""Claude re-ranks the candidate moments and writes titles, hooks and hashtags.

The signal-based algorithm (virality.py) finds where something happens; Claude reads what is
said there and judges whether it works as a standalone short: does it hook in the first
seconds, is there a payoff, does it need context from earlier in the video?
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from . import config
from .transcribe import Transcript
from .virality import Candidate

log = logging.getLogger("clipzo.llm")

FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"}
CONTEXT_PAD = 15.0  # seconds of transcript shown around each candidate so Claude can move the edges

SYSTEM_PROMPT = """You are the clip editor of a tool that turns long videos (YouTube videos, Twitch streams, \
podcasts, TikToks) into vertical shorts for TikTok, YouTube Shorts and Instagram Reels.

A signal-based algorithm already found candidate moments (audio peaks, laughter, chat activity, \
most-replayed parts). For each candidate you get its timestamped transcript and the signals that fired. \
Your job is to pick the candidates most likely to perform as standalone shorts, and to set their exact \
start and end.

What performs on short-form platforms:
- A hook in the first 2-3 seconds: a surprising statement, a question, a strong emotion, or action already \
under way. Never start on filler ("so", "euh", "anyway"), a greeting, or mid-sentence.
- A clear payoff before the end: the punchline, the reveal, the reaction, the answer. Never cut it off.
- Understandable without the rest of the video. Avoid moments that depend on earlier context.
- Strong emotion (laughter, surprise, anger, awe), a bold opinion, a story with tension, or a useful, \
concrete tip.
- Skip sponsor reads, intros/outros, "subscribe" requests, technical issues and dead air.

Rules for start/end: stay within the transcript shown for that candidate, start at the beginning of a \
sentence and end at the end of one. Keep the duration close to the requested length (the allowed range \
is given). Clips must not overlap each other.

Write the title, hook and hashtags in the language spoken in the video. The title is what would be \
written on the short (max 70 characters, no clickbait lies, no emojis spam). The hook is the on-screen \
text for the first seconds (max 90 characters). Give 3 to 6 relevant hashtags with the # sign. \
Write the "why" items in French, short (max 12 words each): they explain to the creator why this \
moment can go viral."""

RESULT_SCHEMA = {
    "type": "object",
    "properties": {
        "clips": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "candidate_id": {"type": "integer"},
                    "virality": {"type": "integer", "description": "0-100 estimated chance to perform"},
                    "start": {"type": "number"},
                    "end": {"type": "number"},
                    "title": {"type": "string"},
                    "hook": {"type": "string"},
                    "hashtags": {"type": "array", "items": {"type": "string"}},
                    "why": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["candidate_id", "virality", "start", "end", "title", "hook", "hashtags", "why"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["clips"],
    "additionalProperties": False,
}


class LLMUnavailable(RuntimeError):
    """Claude could not be used for this job; the caller keeps the algorithm's ranking."""


@dataclass
class LLMChoice:
    candidate: Candidate
    virality: int
    start: float
    end: float
    title: str
    hook: str
    hashtags: list[str]
    why: list[str]


def _fmt(t: float) -> str:
    t = max(0.0, t)
    h, rem = divmod(int(t), 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def build_prompt(title: str, platform: str, transcript: Transcript, candidates: list[Candidate],
                 clip_seconds: int, count: int) -> str:
    lo, hi = config.clip_bounds(clip_seconds)
    parts = [
        f"Video title: {title}",
        f"Platform: {platform}",
        f"Spoken language (detected): {transcript.language}",
        f"Requested short length: {clip_seconds} s (allowed range {lo}-{hi} s)",
        f"Pick the best {count} candidates (fewer only if the others would clearly flop), best first.",
        "",
    ]
    for i, c in enumerate(candidates):
        a, b = max(0.0, c.start - CONTEXT_PAD), c.end + CONTEXT_PAD
        lines = [
            f"[{s.start:.1f}-{s.end:.1f}] {s.text}"
            for s in transcript.segments if s.end > a and s.start < b
        ]
        parts += [
            f"<candidate id=\"{i}\" start=\"{c.start:.1f}\" end=\"{c.end:.1f}\" "
            f"position=\"{_fmt(c.start)}\" algorithm_score=\"{c.score}\">",
            "Signals: " + ("; ".join(c.reasons) if c.reasons else "none"),
            "Transcript (seconds from the start of the video):",
            *(lines or ["(no speech)"]),
            "</candidate>",
            "",
        ]
    return "\n".join(parts)


def rank(title: str, platform: str, transcript: Transcript, candidates: list[Candidate],
         clip_seconds: int, count: int, duration: float) -> list[LLMChoice]:
    """Ask Claude to choose and trim the best candidates. Raises LLMUnavailable on any failure."""
    if not config.llm_configured():
        raise LLMUnavailable("Claude n'est pas configuré (ANTHROPIC_API_KEY manquante).")
    if not candidates or not transcript.segments:
        raise LLMUnavailable("Pas de transcription : l'analyse IA du discours est impossible.")
    try:
        import anthropic
    except ImportError as exc:
        raise LLMUnavailable("Le module anthropic n'est pas installé.") from exc

    client = anthropic.Anthropic(max_retries=2, timeout=300.0)
    request: dict = {
        "model": config.CLAUDE_MODEL,
        "max_tokens": 16000,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": build_prompt(title, platform, transcript, candidates, clip_seconds, count)}],
        "output_config": {
            "effort": config.CLAUDE_EFFORT,
            "format": {"type": "json_schema", "schema": RESULT_SCHEMA},
        },
    }
    if config.CLAUDE_MODEL in FALLBACK_MODELS:
        # If a safety classifier declines, the API retries on Anthropic's recommended fallback model.
        request["betas"] = ["server-side-fallback-2026-07-01"]
        request["fallbacks"] = "default"
    try:
        if "betas" in request:
            response = client.beta.messages.create(**request)
        else:
            response = client.messages.create(**request)
    except anthropic.AuthenticationError as exc:
        raise LLMUnavailable("Clé API Anthropic invalide.") from exc
    except anthropic.RateLimitError as exc:
        raise LLMUnavailable("Limite de requêtes Claude atteinte, réessaie plus tard.") from exc
    except anthropic.APIStatusError as exc:
        log.warning("Claude API error %s: %s", exc.status_code, exc.message)
        raise LLMUnavailable(f"Erreur de l'API Claude ({exc.status_code}).") from exc
    except anthropic.APIConnectionError as exc:
        raise LLMUnavailable("Impossible de joindre l'API Claude.") from exc

    if response.stop_reason == "refusal":
        raise LLMUnavailable("Claude a refusé d'analyser ce contenu.")
    if response.stop_reason == "max_tokens":
        raise LLMUnavailable("Réponse de Claude incomplète.")
    text = next((b.text for b in response.content if getattr(b, "type", "") == "text"), "")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LLMUnavailable("Réponse de Claude illisible.") from exc
    return parse_choices(data, candidates, clip_seconds, count, duration)


def parse_choices(data: dict, candidates: list[Candidate], clip_seconds: int, count: int,
                  duration: float) -> list[LLMChoice]:
    """Validate Claude's answer and clamp every value to what the renderer accepts."""
    lo, hi = config.clip_bounds(clip_seconds)
    if duration < lo:
        lo = hi = duration
    choices: list[LLMChoice] = []
    used: set[int] = set()
    for item in data.get("clips") or []:
        try:
            cid = int(item["candidate_id"])
        except (KeyError, TypeError, ValueError):
            continue
        if cid in used or not 0 <= cid < len(candidates):
            continue
        cand = candidates[cid]
        try:
            start, end = float(item.get("start", cand.start)), float(item.get("end", cand.end))
        except (TypeError, ValueError):
            start, end = cand.start, cand.end
        # Claude may only move the edges inside the transcript it was shown.
        start = min(max(start, cand.start - CONTEXT_PAD, 0.0), cand.end)
        end = max(min(end, cand.end + CONTEXT_PAD, duration), start)
        if end - start < lo:
            end = min(duration, start + lo)
            start = max(0.0, end - lo)
        if end - start > hi:
            end = start + hi
        if any(start < c.end and end > c.start for c in choices):
            start, end = cand.start, cand.end
            if any(start < c.end and end > c.start for c in choices):
                continue
        used.add(cid)
        tags = []
        for t in item.get("hashtags") or []:
            t = str(t).strip().replace(" ", "")
            if t:
                tags.append(t if t.startswith("#") else "#" + t)
        choices.append(LLMChoice(
            candidate=cand,
            virality=max(0, min(100, int(item.get("virality", cand.score) or 0))),
            start=round(start, 2),
            end=round(end, 2),
            title=str(item.get("title") or cand.title)[:90].strip(),
            hook=str(item.get("hook") or cand.hook)[:120].strip(),
            hashtags=tags[:6],
            why=[str(w)[:120].strip() for w in (item.get("why") or []) if str(w).strip()][:3],
        ))
        if len(choices) >= count:
            break
    if not choices:
        raise LLMUnavailable("Claude n'a retenu aucun moment.")
    return choices
