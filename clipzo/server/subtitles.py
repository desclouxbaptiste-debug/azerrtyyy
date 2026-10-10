"""Burned-in subtitles as an ASS file (rendered by ffmpeg's libass)."""

from __future__ import annotations

from dataclasses import dataclass

from . import styles
from .styles import Style
from .transcribe import Transcript, Word

FONT = "DejaVu Sans"  # bundled in server/fonts (loaded through fontsdir), any sans font as fallback
HIGHLIGHT = "&H004AE2FF"  # ASS colours are &HAABBGGRR: this is #FFE24A (yellow)
WHITE = "&H00FFFFFF"
BLACK = "&H00000000"
SHADOW = "&H64000000"  # 60 % opaque black
POP = "\\fscx112\\fscy112\\t(0,90,\\fscx100\\fscy100)"  # the word being spoken pops in
UNPOP = "\\fscx100\\fscy100"
STYLE_FORMAT = ("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
                "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
                "Alignment, MarginL, MarginR, MarginV, Encoding")


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


GAP_HOLD = 0.4  # pauses shorter than this keep the previous words on screen
NBSP = "\u00a0"  # no-break space: libass never wraps there
_TIGHT = ":;!?»"  # French typography: a space before them, but never a line break
_CLOSING = _TIGHT + ".,…)”"


def _glue(text: str) -> str:
    for p in _TIGHT:
        text = text.replace(" " + p, NBSP + p)
    return text.replace("« ", "«" + NBSP)


def clip_words(transcript: Transcript, start: float, end: float) -> list[Word]:
    out: list[Word] = []
    for w in transcript.words:
        if w.end <= start or w.start >= end:
            continue
        text = _glue(_clean(w.text))
        if not text:
            continue
        a, b = max(0.0, w.start - start), min(end, w.end) - start
        if out and all(c in _CLOSING for c in text):
            # A lone ":" or "!" stays with the word before it (never alone at the start of a line or a group).
            prev = out[-1]
            sep = NBSP if text[0] in _TIGHT else ""
            out[-1] = Word(start=prev.start, end=max(prev.end, b), text=prev.text + sep + text)
            continue
        if out and out[-1].text in ("«", "“", "("):
            prev = out.pop()
            a, text = prev.start, prev.text + (NBSP if prev.text == "«" else "") + text
        out.append(Word(start=a, end=b, text=text))
    return out


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


@dataclass
class _Layer:
    """One drawing pass of every caption (neon = glow + text, word box = box + text)."""
    style: str  # its line in [V4+ Styles]
    prefix: str = ""  # override tags at the start of each event
    on: str = ""  # before the word being spoken (animated subtitles)
    off: str = ""  # right after it


@dataclass
class _Look:
    # name, PrimaryColour, OutlineColour, BackColour, BorderStyle, Outline, Shadow
    styles: list[tuple[str, str, str, str, int, float, float]]
    layers: list[_Layer]
    pad: float = 0.0  # how far the look reaches outside the text (box padding, glow), in pixels
    extra_space: int = 0  # pixels added to each space between words


def _num(x: float) -> str:
    return f"{x:.1f}".rstrip("0").rstrip(".")


def _box_tags(fs: int, x: float, y: float) -> str:
    # BorderStyle 3 box padding: \xbord / \ybord around the line box (which already spans ascent to descent).
    return f"\\xbord{_num(max(2.0, fs * x))}\\ybord{_num(fs * y)}\\blur{_num(max(0.6, fs * 0.012))}"


def _look(shape: str, fs: int, animated: bool, accent: str) -> _Look:
    """Styles and layers of a shape. `accent` is the "#RRGGBB" colour of the spoken word, glow or box.

    libass draws a BorderStyle 3 box in OutlineColour, `Outline` pixels around each line, its shadow in
    BackColour. Every style or colour change starts a new box, and overlapping translucent boxes add up:
    boxes therefore get their own layer, drawn from uniform text."""
    hi = styles.ass_colour(accent)
    pop_on, pop_off = f"\\c{hi}&{POP}", f"\\c{WHITE}&{UNPOP}"
    if shape == "boite":
        box = styles.ass_colour("#000000", 0x66)  # 60 % opaque
        return _Look(
            [("Box", styles.ass_colour("#000000", 0xFF), box, box, 3, round(fs * 0.2), 0),
             ("Default", WHITE, BLACK, BLACK, 1, 0, 0)],
            [_Layer("Box", prefix=_box_tags(fs, 0.2, 0.03)), _Layer("Default", on=pop_on, off=pop_off)],
            fs * 0.2)
    if shape == "ombre":
        # Thin dark edge and a big soft drop shadow (\blur softens the edge and the shadow, not the letters).
        edge, shadow, blur = max(1, round(fs / 30)), max(2, round(fs * 0.08)), _num(max(1.0, fs * 0.07))
        return _Look([("Default", WHITE, styles.ass_colour("#000000", 0x50), styles.ass_colour("#000000", 0x48),
                       1, edge, shadow)],
                     [_Layer("Default", prefix=f"\\blur{blur}", on=pop_on, off=pop_off)], shadow + fs * 0.15)
    if shape == "neon":
        # A dark halo (so it reads on bright footage), a soft glow in the accent colour, white letters with a
        # glowing rim. In word-by-word mode the words not spoken yet glow less.
        halo, glow, rim = round(fs * 0.14), round(fs * 0.07), max(1, round(fs * 0.025))
        # A white glow would swallow the white letters: softer, and a dark rim keeps them apart.
        light = styles.luminance(accent) > 0.9
        lit = "\\1a&H90&\\3a&H50&" if light else "\\1a&H40&\\3a&H00&"
        rim_colour = styles.ass_colour("#000000", 0x60) if light else hi
        dim = "\\1a&HE0&\\3a&HB0&" if animated else ""
        return _Look(
            [("Halo", styles.ass_colour("#000000", 0x90), styles.ass_colour("#000000", 0x90), BLACK, 1, halo, 0),
             ("Glow", styles.ass_colour(accent, 0xA0 if light else 0x40),
              styles.ass_colour(accent, 0x70 if light else 0x20), BLACK, 1, glow, 0),
             ("Default", WHITE, rim_colour, BLACK, 1, rim, 0)],
            [_Layer("Halo", prefix=f"\\blur{_num(fs * 0.3)}", on=POP, off=UNPOP),
             _Layer("Glow", prefix=f"\\blur{_num(fs * 0.12)}{dim}", on=lit + POP, off=dim + UNPOP),
             _Layer("Default", prefix="\\blur0.8", on=POP, off=UNPOP)],
            halo + fs * 0.3)
    if shape == "bandeau":
        ink = styles.ass_colour(styles.text_on(accent))
        if not animated:  # the whole caption on an accent box
            return _Look([("Default", ink, hi, hi, 3, round(fs * 0.18), 0)],
                         [_Layer("Default", prefix=_box_tags(fs, 0.18, 0.0))], fs * 0.18)
        # Word by word: the word being spoken sits on an accent box, the others keep the outlined look
        # (wider spaces, so the box never touches the next word's outline).
        border, shadow = max(3, fs // 12), 2
        hidden = styles.ass_colour(accent, 0xFF)
        return _Look(
            [("Box", hidden, hidden, BLACK, 3, round(fs * 0.1), 0),
             ("Default", WHITE, BLACK, SHADOW, 1, border, shadow)],
            [_Layer("Box", prefix=_box_tags(fs, 0.1, 0.02), on=f"\\3a&H00&{POP}", off=f"\\3a&HFF&{UNPOP}"),
             _Layer("Default", on=f"\\c{ink}&\\bord0\\shad0{POP}",
                    off=f"\\c{WHITE}&\\bord{border}\\shad{shadow}{UNPOP}")],
            fs * 0.1, extra_space=round(fs * 0.1))
    # contour (default): white letters, thick black outline, slight shadow
    border = max(3, fs // 12)
    return _Look([("Default", WHITE, BLACK, SHADOW, 1, border, 2 if animated else 1)],
                 [_Layer("Default", on=pop_on, off=pop_off)], border)


def _family(font_family: str | None) -> str:
    # The family ends up in a comma-separated Style line: keep only safe characters.
    name = "".join(c for c in (font_family or "") if c.isalnum() or c in " -_'").strip()
    return name or FONT


def _width(text: str, font: styles.FontInfo, size: float) -> float:
    """Estimated advance of a text in pixels (mean letter widths, on the safe side)."""
    w = 0.0
    for c in text:
        if c.isupper() or c.isdigit():
            w += font.upper_width
        elif c.isalpha():
            w += font.lower_width
        else:  # spaces and punctuation
            w += font.lower_width * 0.55
    return w * size


def _break_lines(widths: list[float], space: float, max_width: float, grow: float = 1.0) -> list[int]:
    """Index of the first word of each line: the least overflow, then the fewest lines, then the most even.

    `grow`: how much the word being spoken is enlarged when it pops in."""
    n = len(widths)
    best: tuple | None = None
    for mask in range(1 << (n - 1)):  # bit i: a line break after word i
        starts = [0] + [i + 1 for i in range(n - 1) if mask >> i & 1]
        bounds = starts + [n]
        line_w = [sum(widths[a:b]) + space * (b - a - 1) + (grow - 1) * max(widths[a:b])
                  for a, b in zip(bounds, bounds[1:])]
        key = (max(0.0, max(line_w) - max_width), len(starts), max(line_w), -line_w[-1])
        if best is None or key < best[0]:
            best = (key, starts)
    return best[1] if best else [0]


@dataclass
class _Caption:
    """One group of words on screen: its text, size and line breaks, shared by every layer."""
    texts: list[str]
    starts: list[int]  # first word of each line
    tags: str  # override tags of every event (size, position)


def _event_text(cap: _Caption, active: int | None, layer: _Layer, space: str) -> str:
    out = ""
    for j, txt in enumerate(cap.texts):
        if j:
            out += "\\N" if j in cap.starts else space
        out += "{" + layer.on + "}" + txt + "{" + layer.off + "}" if j == active and layer.on else txt
    tags = cap.tags + layer.prefix
    return ("{" + tags + "}" if tags else "") + out


def build_ass(transcript: Transcript, start: float, end: float, width: int, height: int,
              animated: bool, style: Style | None = None, seam_y: int | None = None,
              font_family: str | None = None) -> str | None:
    """ASS subtitles for the clip [start, end] (times relative to the clip). None if nothing is said.

    `font_family` is what styles.install_font returned (None: the default font). `seam_y` is the border
    between the facecam and the game in the streamer layout: automatic placement centres captions on it."""
    words = clip_words(transcript, start, end)
    if not words:
        return None
    style = styles.parse_style(style)
    font = styles.FONTS[style.font] if font_family else styles.FONTS["classique"]
    upper = (animated if style.caps is None else style.caps) and not font.caps_only
    base = min(width, height)  # sized from the short side: right on 9:16 and on a kept landscape frame
    font_size = int(base * (0.075 if animated else 0.062) * font.scale * styles.SIZES[style.size])
    look = _look(style.shape, font_size, animated, styles.COLORS[style.color])
    portrait = height > width
    margin_h = int(width * 0.07)
    centre_y = None
    if style.position == "milieu":
        align, margin_v = 5, 0
    elif style.position == "haut":
        align, margin_v = 8, int(height * (0.12 if portrait else 0.08))
    elif style.position == "auto" and seam_y is not None:
        align, margin_v, centre_y = 5, 0, seam_y
    else:
        # 9:16: lower third, above the TikTok / Shorts buttons. Landscape: near the bottom like TV subtitles.
        align, margin_v = 2, int(height * (0.27 if portrait else 0.08))
    style_lines = "\n".join(
        f"Style: {name},{_family(font_family)},{font_size},{primary},{primary},{outline},{back},"
        f"{-1 if font.bold else 0},0,0,0,100,100,0,0,{bs},{_num(bord)},{_num(shad)},{align},"
        f"{margin_h},{margin_h},{margin_v},1"
        for name, primary, outline, back, bs, bord, shad in look.styles
    )
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
{STYLE_FORMAT}
{style_lines}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    # Usable width, minus what the look draws around the text (and room for the word that pops in).
    avail = width - 2 * margin_h - 2 * look.pad
    grow = 1.12 if animated else 1.0
    space = " " if not look.extra_space else f"{{\\fsp{look.extra_space}}} {{\\fsp0}}"

    def caption(chunk: list[Word]) -> _Caption:
        texts = [w.text.upper() if upper else w.text for w in chunk]
        # libass cannot split a word: shrink a group whose longest word would not fit.
        longest = max(_width(t, font, font_size) for t in texts) * grow
        size = font_size if longest <= avail else max(8, int(font_size * avail / longest))
        # Break lines here rather than in libass, so every layer (glow, box, text) wraps the same way
        # even while a word pops in. libass still wraps a line that would not fit, as a safety net.
        widths = [_width(t, font, size) for t in texts]
        starts = _break_lines(widths, _width(" ", font, size) + look.extra_space, avail, grow)
        tags = f"\\fs{size}" if size != font_size else ""
        if centre_y is not None:
            # On the seam, but the whole block (lines, box, glow) stays inside the frame.
            half = len(starts) * size / 2 + look.pad
            y = min(max(float(centre_y), half + height * 0.03), height - half - height * 0.03)
            tags += f"\\pos({width // 2},{int(y)})"
        return _Caption(texts, starts, tags)

    lines: list[str] = []
    clip_len = end - start

    def add(a: float, b: float, cap: _Caption, active: int | None) -> None:
        for n, layer in enumerate(look.layers):
            text = _event_text(cap, active, layer, space)
            lines.append(f"Dialogue: {n},{_ts(a)},{_ts(b)},{layer.style},,0,0,0,,{text}")

    if animated:
        # Pro: 3 words at a time, in capitals, the word being spoken pops in the accent colour.
        chunks = chunk_words(words, max_words=3, max_chars=22)
        for k, chunk in enumerate(chunks):
            next_start = chunks[k + 1][0].start if k + 1 < len(chunks) else clip_len
            cap = caption(chunk)
            for i, w in enumerate(chunk):
                a = w.start
                b = chunk[i + 1].start if i + 1 < len(chunk) else max(w.end, a + 0.25)
                if i + 1 == len(chunk) and next_start - b < GAP_HOLD:
                    b = next_start  # a short breath: the words stay, no flicker
                b = min(b, clip_len, next_start)  # never overlap the next group of words
                if b <= a:
                    continue
                add(a, b, cap, i)
    else:
        # Créateur: classic two-line captions.
        chunks = chunk_words(words, max_words=7, max_chars=38)
        for k, chunk in enumerate(chunks):
            next_start = chunks[k + 1][0].start if k + 1 < len(chunks) else clip_len
            a = chunk[0].start
            b = max(chunk[-1].end, a + 0.6)
            if next_start - b < GAP_HOLD:
                b = next_start  # a short breath: the caption stays, no flicker
            b = min(clip_len, next_start, b)
            if b <= a:
                continue
            add(a, b, caption(chunk), None)
    if not lines:
        return None
    return header + "\n".join(lines) + "\n"
