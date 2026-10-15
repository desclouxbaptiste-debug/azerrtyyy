"""Getting the source video: link validation, yt-dlp download, uploads, audience signals."""

from __future__ import annotations

import ipaddress
import json
import re
import shutil
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable
from urllib.parse import urlsplit, urlunsplit

from . import config
from .media import MediaError, ProbeInfo, probe

ProgressFn = Callable[[float, str], None]

# host suffix -> platform id. A host matches when it IS the domain or a subdomain of it.
PLATFORM_DOMAINS: dict[str, str] = {
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "twitch.tv": "twitch",
    "tiktok.com": "tiktok",
    "twitter.com": "x",
    "x.com": "x",
    "kick.com": "kick",
    "instagram.com": "instagram",
}

PLATFORM_NAMES = {
    "youtube": "YouTube", "twitch": "Twitch", "tiktok": "TikTok", "x": "X",
    "kick": "Kick", "instagram": "Instagram", "upload": "Fichier",
}

# Only single-video extractors: no playlists, channels, searches or the generic
# extractor (which would fetch arbitrary URLs from the server).
ALLOWED_EXTRACTORS = [
    "youtube", "youtube:clip",
    "twitch:vod", "twitch:clips",
    "tiktok", "vm.tiktok",
    "twitter", "twitter:card", "twitter:broadcast",
    "kick:vod", "kick:clips",
    "instagram", "instagramios",
]

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v", ".flv", ".ts", ".mpg", ".mpeg", ".3gp", ".wmv"}


class SourceError(RuntimeError):
    """The source cannot be used. The message is shown to the user."""


@dataclass
class Source:
    path: Path
    platform: str
    title: str
    probe: ProbeInfo
    thumbnail: str | None = None
    webpage_url: str | None = None
    # Audience signals, when the platform exposes them
    heatmap: list[dict] | None = None  # YouTube "most replayed": [{start_time, end_time, value}]
    chat: list[tuple[float, str]] = field(default_factory=list)  # (seconds, message)
    clips: list[dict] = field(default_factory=list)  # Twitch viewers' clips: {offset, duration, views, title}


_HOST_RE = re.compile(r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")


def detect_platform(url: str) -> str:
    """Return the platform id for a supported public video link, or raise SourceError."""
    return canonical(url)[0]


def canonical(url: str) -> tuple[str, str]:
    """Validate a link and rebuild it from its parsed parts: (platform, clean https URL).

    The downloader only ever sees the rebuilt URL, so it reads exactly the host we checked."""
    raw = (url or "").strip()
    if len(raw) > 2048:
        raise SourceError("Ce lien est trop long.")
    if not re.match(r"^https?://", raw, re.I):
        raw = "https://" + raw
    try:
        parts = urlsplit(raw)
        port = parts.port
    except ValueError as exc:
        raise SourceError("Ce lien n'est pas valide.") from exc
    if parts.scheme.lower() not in ("http", "https") or parts.username or parts.password:
        raise SourceError("Ce lien n'est pas valide.")
    if port not in (None, 80, 443):
        raise SourceError("Ce lien n'est pas valide.")
    host = (parts.hostname or "").lower().rstrip(".")
    try:
        ipaddress.ip_address(host)
        raise SourceError("Colle un lien YouTube, Twitch, TikTok, X, Kick ou Instagram.")
    except ValueError:
        pass
    if not _HOST_RE.match(host):
        raise SourceError("Ce lien n'est pas valide.")
    for domain, platform in PLATFORM_DOMAINS.items():
        if host == domain or host.endswith("." + domain):
            clean = urlunsplit(("https", host, parts.path or "/", parts.query, ""))
            return platform, clean
    raise SourceError("Colle un lien YouTube, Twitch, TikTok, X, Kick ou Instagram.")


def download(url: str, job_dir: Path, plan: config.Plan, progress: ProgressFn) -> Source:
    """Download one public video with yt-dlp, after checking its length against the plan."""
    import yt_dlp
    from yt_dlp.utils import DownloadError

    platform, url = canonical(url)
    max_height = 2160 if plan.allow_4k else 1080
    max_seconds = plan.max_source_minutes * 60

    def hook(d: dict) -> None:
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            done = d.get("downloaded_bytes") or 0
            if total:
                frac = min(1.0, done / total)
                progress(frac, f"Téléchargement… {int(frac * 100)} %")
        elif d.get("status") == "finished":
            progress(1.0, "Téléchargement terminé, préparation…")

    opts = {
        "outtmpl": str(job_dir / "source.%(ext)s"),
        "format": f"bv*[height<={max_height}]+ba/b[height<={max_height}]/bv*+ba/b",
        "merge_output_format": "mp4",
        "noplaylist": True,
        "allowed_extractors": [f"^{re.escape(name)}$" for name in ALLOWED_EXTRACTORS],
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "progress_hooks": [hook],
        "max_filesize": config.MAX_DOWNLOAD_MB * 1024 * 1024,
        "restrictfilenames": True,
        "socket_timeout": 30,
        "retries": 3,
        "fragment_retries": 3,
        "concurrent_fragment_downloads": 4,
        "writesubtitles": False,
        "writethumbnail": False,
        # YouTube needs a JavaScript runtime: Deno (installed by yt-dlp[deno]) or Node 22+.
        "js_runtimes": {"deno": {}, "node": {}},
    }
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        opts["ffmpeg_location"] = str(Path(ffmpeg).parent)
    progress(0.0, "Lecture des infos de la vidéo…")
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info is None:
                raise SourceError("Vidéo introuvable.")
            if info.get("_type") in ("playlist", "multi_video"):
                entries = [e for e in (info.get("entries") or []) if e]
                if not entries:
                    raise SourceError("Ce lien ne contient pas de vidéo.")
                info = entries[0]
            if info.get("is_live") or info.get("live_status") in ("is_live", "is_upcoming"):
                raise SourceError("Les lives en cours ne sont pas pris en charge : attends la rediffusion (VOD).")
            duration = info.get("duration")
            if duration and duration > max_seconds:
                raise SourceError(
                    f"Cette vidéo dure {int(duration // 60)} min. Ton forfait {plan.label} accepte "
                    f"jusqu'à {plan.max_source_minutes} min : passe à un forfait supérieur."
                )
            info = ydl.process_ie_result(info, download=True)
    except DownloadError as exc:
        raise SourceError(_friendly_download_error(str(exc))) from exc

    path = _downloaded_file(info, job_dir)
    try:
        probe_info = probe(path)
    except MediaError as exc:
        raise SourceError(str(exc)) from exc
    if probe_info.duration > max_seconds + 5:
        raise SourceError(
            f"Cette vidéo dépasse la durée maximale de ton forfait ({plan.max_source_minutes} min)."
        )

    source = Source(
        path=path,
        platform=platform,
        title=(info.get("title") or "Vidéo").strip()[:200],
        probe=probe_info,
        thumbnail=info.get("thumbnail"),
        webpage_url=info.get("webpage_url") or url,
        heatmap=info.get("heatmap") or None,
    )
    if platform == "youtube" and "live_chat" in (info.get("subtitles") or {}):
        source.chat = _youtube_chat_replay(url, job_dir, progress)
    if platform == "twitch":
        _twitch_audience(source, url, info, progress)
    return source


def _twitch_audience(source: Source, url: str, info: dict, progress: ProgressFn) -> None:
    """Best effort: the chat replay of a VOD (no keys needed) and the clips its viewers made (Twitch API keys)."""
    from . import twitch

    vod_id = twitch.vod_id_from_url(url)
    if not vod_id:
        return
    length = source.probe.duration
    if config.TWITCH_CHAT:
        progress(1.0, "Récupération du chat du live…")
        source.chat = twitch.fetch_chat(
            vod_id, length, progress=lambda f: progress(1.0, f"Récupération du chat du live… {int(f * 100)} %"))
    if twitch.helix_configured():
        progress(1.0, "Récupération des clips des viewers…")
        user = twitch.helix().get_user(str(info.get("uploader_id") or ""))
        if user:
            started = float(info.get("timestamp") or time.time() - length)
            source.clips = twitch.helix().vod_clips(user["id"], vod_id, started, started + length + 3600)


def save_upload(fileobj, filename: str, job_dir: Path, plan: config.Plan) -> Source:
    """Copy an uploaded file into the job folder (size-capped) and validate it with ffprobe."""
    ext = Path(filename or "").suffix.lower()
    if ext not in VIDEO_EXTENSIONS:
        ext = ".mp4"
    dest = job_dir / f"upload{ext}"
    limit = config.MAX_UPLOAD_MB * 1024 * 1024
    written = 0
    with dest.open("wb") as out:
        while True:
            chunk = fileobj.read(1024 * 1024)
            if not chunk:
                break
            written += len(chunk)
            if written > limit:
                out.close()
                dest.unlink(missing_ok=True)
                raise SourceError(f"Fichier trop lourd (maximum {config.MAX_UPLOAD_MB} Mo).")
            out.write(chunk)
    if written == 0:
        dest.unlink(missing_ok=True)
        raise SourceError("Le fichier envoyé est vide.")
    try:
        probe_info = probe(dest)
    except MediaError as exc:
        dest.unlink(missing_ok=True)
        raise SourceError(str(exc)) from exc
    if probe_info.duration > plan.max_source_minutes * 60 + 5:
        dest.unlink(missing_ok=True)
        raise SourceError(
            f"Cette vidéo dure {int(probe_info.duration // 60)} min. Ton forfait {plan.label} accepte "
            f"jusqu'à {plan.max_source_minutes} min : passe à un forfait supérieur."
        )
    title = Path(filename or "Ma vidéo").stem.replace("_", " ").strip()[:200] or "Ma vidéo"
    return Source(path=dest, platform="upload", title=title, probe=probe_info)


def _downloaded_file(info: dict, job_dir: Path) -> Path:
    for item in info.get("requested_downloads") or []:
        p = item.get("filepath")
        if p and Path(p).exists():
            return Path(p)
    candidates = sorted(
        (p for p in job_dir.glob("source.*") if p.suffix.lower() in VIDEO_EXTENSIONS),
        key=lambda p: p.stat().st_size, reverse=True,
    )
    if not candidates:
        raise SourceError("Le téléchargement n'a produit aucun fichier vidéo.")
    return candidates[0]


def _youtube_chat_replay(url: str, job_dir: Path, progress: ProgressFn) -> list[tuple[float, str]]:
    """Best effort: the chat replay of a past YouTube live is a great "hype" signal."""
    import yt_dlp

    progress(1.0, "Récupération du chat du live…")
    chat_dir = job_dir / "chat"
    chat_dir.mkdir(exist_ok=True)
    opts = {
        "skip_download": True,
        "writesubtitles": True,
        "subtitleslangs": ["live_chat"],
        "outtmpl": str(chat_dir / "chat.%(ext)s"),
        "noplaylist": True,
        "allowed_extractors": [f"^{re.escape(n)}$" for n in ALLOWED_EXTRACTORS],
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "socket_timeout": 30,
        "js_runtimes": {"deno": {}, "node": {}},
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception:  # noqa: BLE001 - optional signal, never fail the job for it
        return []
    messages: list[tuple[float, str]] = []
    for f in chat_dir.glob("*.json*"):
        messages.extend(parse_youtube_chat(f))
    shutil.rmtree(chat_dir, ignore_errors=True)
    messages.sort(key=lambda m: m[0])
    return messages


def parse_youtube_chat(path: Path) -> list[tuple[float, str]]:
    """Parse yt-dlp's live_chat JSON-lines file into (seconds, text)."""
    out: list[tuple[float, str]] = []
    with path.open(encoding="utf-8", errors="ignore") as fh:
        for line in fh:
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            replay = obj.get("replayChatItemAction") or {}
            try:
                t = int(replay.get("videoOffsetTimeMsec", "0")) / 1000.0
            except (TypeError, ValueError):
                continue
            for action in replay.get("actions") or []:
                item = (action.get("addChatItemAction") or {}).get("item") or {}
                renderer = item.get("liveChatTextMessageRenderer") or item.get("liveChatPaidMessageRenderer")
                if not renderer:
                    continue
                runs = (renderer.get("message") or {}).get("runs") or []
                text = "".join(
                    r.get("text") or (r.get("emoji") or {}).get("shortcuts", [""])[0] for r in runs
                )
                out.append((t, text[:300]))
    return out


def _friendly_download_error(message: str) -> str:
    m = message.lower()
    if "ffmpeg" in m and ("not installed" in m or "not found" in m):
        from .media import FFMPEG_MISSING

        return FFMPEG_MISSING
    if "private" in m or "privée" in m:
        return "Cette vidéo est privée : impossible de la récupérer."
    if "sign in" in m or "login" in m or "age" in m and "restricted" in m or "cookies" in m:
        return "Cette vidéo demande une connexion (âge ou accès restreint). Télécharge-la et envoie le fichier."
    if "unavailable" in m or "not available" in m or "404" in m or "does not exist" in m:
        return "Vidéo introuvable ou indisponible dans ton pays."
    if "unsupported url" in m or "no suitable" in m:
        return "Ce lien ne pointe pas vers une vidéo prise en charge."
    if "file is larger" in m or "max_filesize" in m:
        return "Vidéo trop lourde pour être téléchargée."
    if "copyright" in m:
        return "Cette vidéo a été retirée pour droits d'auteur."
    if "unable to connect" in m or "timed out" in m or "connection" in m or "proxy" in m:
        return "Impossible de joindre la plateforme pour le moment : réessaie dans quelques minutes."
    return "Impossible de télécharger cette vidéo. Vérifie le lien, ou télécharge-la et envoie le fichier."
