"""Subtitle looks the creator picks (font, shape, accent colour, position, size, case), like CapCut / Submagic."""

from __future__ import annotations

import filecmp
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path

from .media import FONT_FILE

SUBS_FONTS_DIR = Path(__file__).resolve().parent.parent / "fonts" / "subs"  # also served at /fonts/subs/
FONT_NAME = "clipzo-subs.ttf"  # copied next to each render (the watermark keeps media.FONT_NAME)


@dataclass(frozen=True)
class FontInfo:
    label: str  # shown to users
    file: Path
    family: str  # ASS Fontname: the font's family name (name ID 1), the one libass matches
    bold: bool  # ASS Bold flag: off for single-weight fonts, or libass draws a fake bold
    scale: float  # so every font looks about the same size: condensed fonts are drawn bigger
    caps_only: bool  # the font only has capitals: the text is kept as spoken
    # Mean advance of a capital / a lowercase letter, as a fraction of the ASS font size (measured from the
    # font files): lets the subtitles break lines themselves and keep long words inside the frame.
    upper_width: float = 0.6
    lower_width: float = 0.5


_D = SUBS_FONTS_DIR
FONTS: dict[str, FontInfo] = {
    # key: label, file, ASS family, bold, scale, caps_only, upper_width, lower_width
    "classique": FontInfo("Classique", FONT_FILE, "DejaVu Sans", True, 1.0, False, 0.65, 0.55),
    "montserrat": FontInfo("Montserrat", _D / "montserrat.ttf", "Montserrat ExtraBold", False, 1.35, False, 0.48, 0.40),
    "anton": FontInfo("Anton", _D / "anton.ttf", "Anton", False, 1.65, False, 0.28, 0.27),
    "bebas": FontInfo("Bebas Neue", _D / "bebas.ttf", "Bebas Neue", False, 1.55, True, 0.30, 0.30),
    "poppins": FontInfo("Poppins", _D / "poppins.ttf", "Poppins", True, 1.5, False, 0.39, 0.34),
    "bangers": FontInfo("Bangers", _D / "bangers.ttf", "Bangers", False, 1.85, True, 0.24, 0.24),
    "luckiest": FontInfo("Luckiest Guy", _D / "luckiest.ttf", "Luckiest Guy", False, 1.15, False, 0.49, 0.49),
    "marker": FontInfo("Permanent Marker", _D / "marker.ttf", "Permanent Marker", False, 1.2, False, 0.48, 0.39),
}
SHAPES = {"contour": "Contour", "boite": "Boîte", "ombre": "Ombre", "neon": "Néon", "bandeau": "Bandeau"}
COLORS = {"jaune": "#FFE24A", "vert": "#3DFF7A", "rose": "#FF4FD8", "cyan": "#33E1FF", "rouge": "#FF3B5C",
          "blanc": "#FFFFFF"}
POSITIONS = ("auto", "bas", "milieu", "haut")
SIZES = {"s": 0.85, "m": 1.0, "l": 1.2}


@dataclass(frozen=True)
class Style:
    font: str = "classique"
    shape: str = "contour"
    color: str = "jaune"
    position: str = "auto"
    size: str = "m"
    caps: bool | None = None  # None: capitals for word-by-word animated subtitles


_CHOICES = {"font": FONTS, "shape": SHAPES, "color": COLORS, "position": POSITIONS, "size": SIZES}


def parse_style(data) -> Style:
    """Style from a dict (e.g. a request body), a Style or None. Never raises: bad values get the default."""
    if isinstance(data, Style):
        data = asdict(data)  # still checked: a Style can be built with any value
    if not isinstance(data, dict):
        return Style()
    default = Style()
    values: dict = {}
    for name, choices in _CHOICES.items():
        value = data.get(name)
        value = value.strip().lower() if isinstance(value, str) else None
        values[name] = value if value in choices else getattr(default, name)
    caps = data.get("caps")
    values["caps"] = caps if isinstance(caps, bool) else None
    return Style(**values)


def style_dict(style: Style | None) -> dict:
    """JSON-friendly copy of a style, to save with the job."""
    return asdict(parse_style(style))


def install_font(out_dir: Path, style: Style | None) -> str | None:
    """Copy the style's font next to a render as FONT_NAME and return its ASS family name.

    None if it could not be copied: the subtitles then use the default font."""
    font = FONTS[parse_style(style).font]
    dest = out_dir / FONT_NAME
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        if not (dest.is_file() and filecmp.cmp(font.file, dest, shallow=False)):
            shutil.copyfile(font.file, dest)
    except OSError:
        return None
    return font.family


def ass_colour(hex_rgb: str, alpha: int = 0) -> str:
    """"#RRGGBB" -> ASS "&HAABBGGRR" (alpha 0 = opaque, 255 = invisible)."""
    h = hex_rgb.lstrip("#")
    if len(h) != 6:
        raise ValueError(f"not a #RRGGBB colour: {hex_rgb!r}")
    int(h, 16)  # ValueError if not hexadecimal
    return f"&H{max(0, min(255, alpha)):02X}{h[4:6]}{h[2:4]}{h[0:2]}".upper()


def luminance(hex_rgb: str) -> float:
    """Relative luminance of a "#RRGGBB" colour (0 = black, 1 = white)."""
    def channel(c: str) -> float:
        v = int(c, 16) / 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    h = hex_rgb.lstrip("#")
    return 0.2126 * channel(h[0:2]) + 0.7152 * channel(h[2:4]) + 0.0722 * channel(h[4:6])


def text_on(hex_rgb: str) -> str:
    """Black or white, whichever reads best on that background colour (WCAG contrast)."""
    lum = luminance(hex_rgb)
    return "#000000" if (lum + 0.05) / 0.05 >= 1.05 / (lum + 0.05) else "#FFFFFF"
