"""Cut, reframe to 9:16, burn subtitles / watermark and encode one short with ffmpeg."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from . import config, styles
from .media import FONT_NAME, MediaError, ProbeInfo, install_font, probe, run_ffmpeg
from .styles import Style
from .subtitles import build_ass
from .transcribe import Transcript

STREAMER_TOP = 0.34  # streamer layout: share of the height for the facecam, the game gets the rest
LAYOUTS = ("auto", "streamer", "face", "full")

ProgressFn = Callable[[float], None]


@dataclass
class RenderOptions:
    reframe: bool
    subtitles: bool
    animated_subtitles: bool
    watermark: bool


@dataclass
class RenderResult:
    video: Path
    thumb: Path
    width: int
    height: int
    layout: str
    duration: float
    has_subtitles: bool


def _even(x: float) -> int:
    return max(2, int(round(x / 2.0)) * 2)


def output_size(info: ProbeInfo, plan: config.Plan, reframe: bool) -> tuple[int, int]:
    if not reframe:
        long_side = 1920 if plan.out_width >= 1080 else 1280
        if plan.allow_4k and max(info.width, info.height) >= 3840:
            long_side = 3840
        scale = min(1.0, long_side / max(info.width, info.height))  # never upscale
        return _even(info.width * scale), _even(info.height * scale)
    width = plan.out_width
    if plan.allow_4k and min(info.width, info.height) >= 2160:
        width = 2160
    return width, width * 16 // 9


def seam_y(out_h: int) -> int:
    """y of the border between the facecam and the game in the streamer layout."""
    return _even(out_h * STREAMER_TOP)


def _streamer(info: ProbeInfo, out_w: int, out_h: int, facecam: tuple[float, float, float, float]) -> str:
    """Facecam on top, the middle of the game below. Pixel values on the frame after the SAR fix."""
    W = _even(info.width * info.sar) if info.sar != 1.0 else info.width
    H = info.height
    top_h = seam_y(out_h)
    bottom_h = out_h - top_h
    fx, fy, fw, fh = facecam
    # webcam: the detected box, its height adapted to the panel's shape (face kept where it was)
    cw = min(W, max(16, _even(fw * W)))
    ch = min(H, max(16, _even(cw * top_h / out_w)))
    cx = int(min(max(0, fx * W + (fw * W - cw) / 2), W - cw)) // 2 * 2
    cy = int(min(max(0, fy * H + (fh * H - ch) * 0.45), H - ch)) // 2 * 2
    # game: the centre of the frame with the panel's shape, kept clear of a webcam sitting in the middle
    gy0, gy1 = 0, H
    cam_x0, cam_x1, cam_y0, cam_y1 = fx * W, (fx + fw) * W, fy * H, (fy + fh) * H
    gw_full = H * out_w / bottom_h
    if cam_x0 < (W + gw_full) / 2 and cam_x1 > (W - gw_full) / 2:  # the webcam is in the game panel
        if cam_y0 > H / 2:
            gy1 = int(cam_y0)
        else:
            gy0 = int(cam_y1)
    gh = max(16, _even(gy1 - gy0))
    gw = min(W, max(16, _even(gh * out_w / bottom_h)))
    gh = min(gh, max(16, _even(gw * bottom_h / out_w)))
    gx = (W - gw) // 4 * 2
    return (
        f"[0:v]split=2[camsrc][gamesrc];"
        f"[camsrc]crop={cw}:{ch}:{cx}:{cy},scale={out_w}:{top_h}:flags=lanczos,setsar=1[cam];"
        f"[gamesrc]crop={gw}:{gh}:{gx}:{gy0},scale={out_w}:{bottom_h}:flags=lanczos,setsar=1[game];"
        f"[cam][game]vstack=inputs=2,drawbox=x=0:y={top_h - 2}:w={out_w}:h=4:color=black@0.55:t=fill,"
        f"setsar=1[base]"
    )


def build_filter(info: ProbeInfo, out_w: int, out_h: int, reframe: bool, face_x: float | None,
                 facecam: tuple[float, float, float, float] | None = None, layout: str = "auto") -> tuple[str, str]:
    """Return (filter_complex prefix ending in [base], layout name).

    `layout` is the creator's choice: auto, streamer (facecam on top, game below), face, full (whole frame)."""
    if not reframe:
        return f"[0:v]scale={out_w}:{out_h}:flags=lanczos,setsar=1[base]", "original"
    if info.height / info.width >= 1.6:  # already vertical: fill the frame
        return (
            f"[0:v]scale={out_w}:{out_h}:force_original_aspect_ratio=increase:flags=lanczos,"
            f"crop={out_w}:{out_h},setsar=1[base]"
        ), "vertical"
    if layout in ("auto", "streamer") and facecam is not None and info.width > info.height:
        return _streamer(info, out_w, out_h, facecam), "streamer"
    scaled_w = _even(info.width * out_h / info.height)
    if layout != "full" and face_x is not None and scaled_w >= out_w:
        x = int(min(max(face_x * scaled_w - out_w / 2, 0), scaled_w - out_w)) // 2 * 2
        return (
            f"[0:v]scale={scaled_w}:{out_h}:flags=lanczos,crop={out_w}:{out_h}:{x}:0,setsar=1[base]"
        ), "face"
    # No face (gameplay, screen, landscape scenery): show the whole frame on a blurred copy of itself.
    bw, bh = _even(out_w / 8), _even(out_h / 8)
    return (
        f"[0:v]split=2[bgsrc][fgsrc];"
        f"[bgsrc]scale={bw}:{bh}:force_original_aspect_ratio=increase,crop={bw}:{bh},"
        f"boxblur=8:2,scale={out_w}:{out_h}:flags=bicubic,eq=brightness=-0.12:saturation=1.1[bg];"
        f"[fgsrc]scale={out_w}:{out_h}:force_original_aspect_ratio=decrease:flags=lanczos[fg];"
        f"[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[base]"
    ), "blur"


def render_clip(src: Path, info: ProbeInfo, start: float, end: float, out_dir: Path, index: int,
                plan: config.Plan, opts: RenderOptions, transcript: Transcript | None,
                face_x: float | None, peak_time: float, progress: ProgressFn | None = None,
                facecam: tuple[float, float, float, float] | None = None, layout: str = "auto",
                style: Style | None = None) -> RenderResult:
    out_dir.mkdir(parents=True, exist_ok=True)
    start = max(0.0, start)
    end = min(info.duration, end)
    duration = end - start
    if duration <= 0.5:
        raise MediaError("Extrait vide.")

    out_w, out_h = output_size(info, plan, opts.reframe)
    graph, layout = build_filter(info, out_w, out_h, opts.reframe, face_x, facecam, layout)
    # Before any reframing: deinterlace (only frames flagged interlaced) and square the pixels.
    pre = "bwdif=mode=send_frame:deint=interlaced,"
    if info.sar != 1.0:
        pre += "scale=trunc(iw*sar/2)*2:ih,setsar=1,"
    graph = graph.replace("[0:v]", "[0:v]" + pre, 1)

    chain = []
    has_subs = False
    has_font = install_font(out_dir)
    if opts.subtitles and transcript is not None:
        # the chosen subtitle font sits next to the watermark's, libass finds it by its family name
        family = styles.install_font(out_dir, style) if style is not None else None
        ass = build_ass(transcript, start, end, out_w, out_h, animated=opts.animated_subtitles, style=style,
                        seam_y=seam_y(out_h) if layout == "streamer" else None, font_family=family)
        if ass:
            (out_dir / f"{index}.ass").write_text(ass, encoding="utf-8")
            # relative paths: ffmpeg runs inside out_dir, so no drive letters or backslashes to escape
            chain.append(f"ass={index}.ass:fontsdir=." if has_font or family else f"ass={index}.ass")
            has_subs = True
    if opts.watermark:
        size = max(18, int(min(out_w, out_h) * 0.045))
        font = f"fontfile={FONT_NAME}:" if has_font else ""
        chain.append(
            f"drawtext={font}text=clipzo:fontcolor=white@0.72:fontsize={size}:"
            f"x=w-tw-{int(out_w * 0.05)}:y={int(out_h * 0.05)}:shadowcolor=black@0.45:shadowx=2:shadowy=2"
        )
    chain.append("format=yuv420p")
    graph += ";[base]" + ",".join(chain) + "[v]"

    video = out_dir / f"{index}.mp4"
    tmp = out_dir / f"{index}.part.mp4"
    fps = info.fps if 10 <= info.fps <= 60 else 30.0
    args = [
        "-ss", f"{start:.3f}", "-i", str(src), "-t", f"{duration:.3f}",
        "-filter_complex", graph, "-map", "[v]",
    ]
    if info.has_audio:
        args += ["-map", "0:a:0?", "-af", _loudnorm_filter(src, start, duration),
                 "-c:a", "aac", "-b:a", "160k", "-ar", "48000"]
    else:
        args += ["-an"]
    args += [
        "-r", f"{fps:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
        "-profile:v", "high", "-movflags", "+faststart", "-max_muxing_queue_size", "4096",
        "-f", "mp4", tmp.name,
    ]
    run_ffmpeg(args, duration=duration, progress=progress, cwd=out_dir, timeout=max(600, duration * 30))
    tmp.replace(video)
    (out_dir / f"{index}.ass").unlink(missing_ok=True)

    rendered = probe(video)
    thumb = out_dir / f"{index}.jpg"
    # Most representative frame of the 4 s around the peak (skips flashes and blurry transition frames).
    at = min(max(0.0, peak_time - start - 2.0), max(0.0, rendered.duration - 4.0))
    run_ffmpeg(["-ss", f"{at:.3f}", "-t", "4", "-i", video.name, "-vf", "fps=12,thumbnail=n=48,scale=540:-2",
                "-frames:v", "1", "-q:v", "4", thumb.name], cwd=out_dir, timeout=120)
    if not thumb.exists():  # e.g. a window past the last video frame: take the first frame instead
        run_ffmpeg(["-i", video.name, "-vf", "scale=540:-2", "-frames:v", "1", "-q:v", "4", thumb.name],
                   cwd=out_dir, timeout=120)
    return RenderResult(video=video, thumb=thumb, width=rendered.width, height=rendered.height,
                        layout=layout, duration=rendered.duration, has_subtitles=has_subs)


TARGET_LUFS = -14.0  # what TikTok / Shorts / Reels normalise to


def _loudnorm_filter(src: Path, start: float, duration: float) -> str:
    """Two-pass loudness normalisation: measure the clip's audio, then correct it linearly."""
    base = f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=11"
    try:
        err = run_ffmpeg(["-ss", f"{start:.3f}", "-i", str(src), "-t", f"{duration:.3f}", "-map", "0:a:0", "-vn",
                          "-af", base + ":print_format=json", "-f", "null", "-"], timeout=max(120, duration * 4))
        m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", err)
        data = json.loads(m.group(0)) if m else {}
        vals = {k: float(data[k]) for k in ("input_i", "input_tp", "input_lra", "input_thresh", "target_offset")}
    except (MediaError, ValueError, KeyError, TypeError):
        return base
    if vals["input_i"] < -70:  # silence: nothing to normalise
        return base
    return (f"{base}:measured_I={vals['input_i']}:measured_TP={vals['input_tp']}:"
            f"measured_LRA={vals['input_lra']}:measured_thresh={vals['input_thresh']}:"
            f"offset={vals['target_offset']}:linear=true")
