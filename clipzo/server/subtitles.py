"""Burned-in subtitles as an ASS file (rendered by ffmpeg's libass)."""

from __future__ import annotations

from .transcribe import Transcript, Word

FONT = "DejaVu Sans"  # bundled in server/fonts (loaded through fontsdir), any sans font as fallback
HIGHLIGHT = "&H004AE2FF"  # ASS colours are &HAABBGGRR: this is #FFE24A (yellow)
WHITE = "&H00FFFFFF"


def _ts(t: float) -> str:
    t = max(0.0, t)
    cs = int(round(t * 100))
    h, rem = divmod(cs, 360000)
    m, rem = divmod(rem, 6000)
    s, cs = divmod(rem, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _clean(text: str) -> str:
    # Braces start ASS override blocks and backslashes start tags: neutralise both.
    return text.replace("\\", "/").replace("{", "(").replace("}", ")").replace("\n", " ").strip()


def clip_words(transcript: Transcript, start: float, end: float) -> list[Word]:
    out = []
    for w in transcript.words:
        if w.end <= start or w.start >= end:
            continue
        out.append(Word(start=max(0.0, w.start - start), end=min(end, w.end) - start, text=_clean(w.text)))
    return [w for w in out if w.text]


def chunk_words(words: list[Word], max_words: int, max_chars: int, max_gap: float = 0.7) -> list[list[Word]]:
    chunks: list[list[Word]] = []
    cur: list[Word] = []
    for w in words:
        if cur:
            too_long = len(cur) >= max_words or len(" ".join(x.text for x in cur)) + 1 + len(w.text) > max_chars
            gap = w.start - cur[-1].end > max_gap
            sentence_end = cur[-1].text[-1:] in ".!?…"
            if too_long or gap or sentence_end:
                chunks.append(cur)
                cur = []
        cur.append(w)
    if cur:
        chunks.append(cur)
    return chunks


def build_ass(transcript: Transcript, start: float, end: float, width: int, height: int,
              animated: bool) -> str | None:
    """ASS subtitles for the clip [start, end] (times relative to the clip). None if nothing is said."""
    words = clip_words(transcript, start, end)
    if not words:
        return None
    base = min(width, height)  # sized from the short side: right on 9:16 and on a kept landscape frame
    font_size = int(base * (0.075 if animated else 0.062))
    # 9:16: lower third, above the TikTok / Shorts buttons. Landscape: near the bottom like TV subtitles.
    margin_v = int(height * (0.27 if height > width else 0.08))
    margin_h = int(width * 0.07)
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{FONT},{font_size},{WHITE},{WHITE},&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,{max(3, font_size // 12)},{2 if animated else 1},2,{margin_h},{margin_h},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines: list[str] = []
    clip_len = end - start
    if animated:
        # Pro: 3 words at a time, in capitals, the word being spoken pops in yellow.
        chunks = chunk_words(words, max_words=3, max_chars=22)
        for k, chunk in enumerate(chunks):
            next_start = chunks[k + 1][0].start if k + 1 < len(chunks) else clip_len
            for i, w in enumerate(chunk):
                a = w.start
                b = chunk[i + 1].start if i + 1 < len(chunk) else max(w.end, a + 0.25)
                b = min(b, clip_len, next_start)  # never overlap the next group of words
                if b <= a:
                    continue
                parts = []
                for j, x in enumerate(chunk):
                    txt = x.text.upper()
                    if j == i:
                        parts.append(
                            "{\\c" + HIGHLIGHT + "&\\fscx112\\fscy112\\t(0,90,\\fscx100\\fscy100)}"
                            + txt + "{\\c" + WHITE + "&\\fscx100\\fscy100}"
                        )
                    else:
                        parts.append(txt)
                lines.append(f"Dialogue: 0,{_ts(a)},{_ts(b)},Default,,0,0,0,,{' '.join(parts)}")
    else:
        # Créateur: classic two-line captions.
        chunks = chunk_words(words, max_words=7, max_chars=38)
        for k, chunk in enumerate(chunks):
            next_start = chunks[k + 1][0].start if k + 1 < len(chunks) else clip_len
            a = chunk[0].start
            b = min(clip_len, next_start, max(chunk[-1].end, a + 0.6))
            if b <= a:
                continue
            text = " ".join(w.text for w in chunk)
            lines.append(f"Dialogue: 0,{_ts(a)},{_ts(b)},Default,,0,0,0,,{text}")
    if not lines:
        return None
    return header + "\n".join(lines) + "\n"
