import dataclasses
import json
import subprocess
from pathlib import Path

import numpy as np
import pytest

from conftest import needs_ffmpeg
from server import styles, subtitles
from server.media import FONT_FILE, FONT_NAME
from server.styles import Style
from server.transcribe import Segment, Transcript, Word

SENTENCE = ["Ça,", "c’est", "INCROYABLE", ":", "déjà", "3", "clutchs", "à", "l’été", "!"]


def sentence(start: float = 0.0) -> Transcript:
    words = [Word(start + i * 0.4, start + i * 0.4 + 0.35, t) for i, t in enumerate(SENTENCE)]
    return Transcript("fr", [Segment(words[0].start, words[-1].end, " ".join(SENTENCE), words)])


# --- parse_style / style_dict ----------------------------------------------------------------------

def test_defaults():
    assert styles.parse_style(None) == Style()
    assert Style() == Style(font="classique", shape="contour", color="jaune", position="auto", size="m", caps=None)


def test_parse_style_keeps_valid_values():
    data = {"font": "anton", "shape": "neon", "color": "rose", "position": "haut", "size": "l", "caps": False}
    assert styles.parse_style(data) == Style(**data)
    assert styles.parse_style({"font": " Bebas ", "color": "CYAN"}) == Style(font="bebas", color="cyan")


@pytest.mark.parametrize("data", [
    "anton", 42, ["anton"], b"x", object(),
    {"font": "comic-sans", "shape": 3, "color": "#FF0000", "position": None, "size": "xl", "caps": "yes"},
    {"font": ["anton"], "shape": {"a": 1}, "color": None, "caps": 1},
    {"font": "anton,Evil", "color": "&H00FF00&", "position": "bas\n[Events]", "unknown": True},
])
def test_parse_style_is_lenient(data):
    assert styles.parse_style(data) == Style()


def test_parse_style_checks_each_field_on_its_own():
    style = styles.parse_style({"font": "marker", "shape": "nope", "color": "vert", "size": 1.2, "caps": True})
    assert style == Style(font="marker", color="vert", caps=True)
    assert styles.parse_style({"caps": 0}).caps is None  # booleans only


def test_parse_style_rechecks_a_style():
    assert styles.parse_style(Style(font="anton", shape="boite")) == Style(font="anton", shape="boite")
    assert styles.parse_style(Style(font="x,y", color="{\\b1}")) == Style()


def test_style_dict_round_trip():
    style = Style(font="luckiest", shape="bandeau", color="rouge", position="milieu", size="s", caps=True)
    data = json.loads(json.dumps(styles.style_dict(style)))
    assert data == {"font": "luckiest", "shape": "bandeau", "color": "rouge", "position": "milieu", "size": "s",
                    "caps": True}
    assert styles.parse_style(data) == style
    assert styles.style_dict(None) == styles.style_dict(Style())


# --- colours ---------------------------------------------------------------------------------------

def test_ass_colour():
    assert styles.ass_colour("#FFE24A") == subtitles.HIGHLIGHT == "&H004AE2FF"
    assert styles.ass_colour("#000000", 0x66) == "&H66000000"
    assert styles.ass_colour("#ff4fd8", 255) == "&HFFD84FFF"
    assert styles.ass_colour("33E1FF") == "&H00FFE133"
    assert styles.ass_colour("#FFFFFF", 999) == "&HFFFFFFFF"
    for bad in ("#FFF", "#GGGGGG", ""):
        with pytest.raises(ValueError):
            styles.ass_colour(bad)


def test_text_on_accent_colours_reads_well():
    assert styles.text_on("#FFE24A") == "#000000"
    assert styles.text_on("#1D3557") == "#FFFFFF"
    for hex_rgb in styles.COLORS.values():
        assert styles.text_on(hex_rgb) in ("#000000", "#FFFFFF")


# --- catalog and font files ------------------------------------------------------------------------

def test_catalog():
    assert set(styles.FONTS) == {"classique", "montserrat", "anton", "bebas", "poppins", "bangers", "luckiest", "marker"}
    assert styles.SHAPES == {"contour": "Contour", "boite": "Boîte", "ombre": "Ombre", "neon": "Néon",
                             "bandeau": "Bandeau"}
    assert styles.COLORS["jaune"] == "#FFE24A" and set(styles.COLORS) == {"jaune", "vert", "rose", "cyan", "rouge",
                                                                         "blanc"}
    assert styles.POSITIONS == ("auto", "bas", "milieu", "haut")
    assert styles.SIZES == {"s": 0.85, "m": 1.0, "l": 1.2}
    assert styles.FONTS["classique"].file == FONT_FILE
    for key, font in styles.FONTS.items():
        assert font.label and font.family and 0.8 <= font.scale <= 2.0
        assert font.file.read_bytes()[:4] == b"\x00\x01\x00\x00", key  # TrueType
        if key != "classique":
            assert font.file == styles.SUBS_FONTS_DIR / f"{key}.ttf"


def test_font_licences_are_shipped():
    folder = styles.SUBS_FONTS_DIR
    index = (folder / "LICENSES.md").read_text(encoding="utf-8")
    for key in styles.FONTS:
        if key != "classique":
            assert f"`{key}.ttf`" in index
    assert "SIL OPEN FONT LICENSE Version 1.1" in (folder / "OFL.txt").read_text(encoding="utf-8")
    assert "Apache License" in (folder / "Apache-2.0.txt").read_text(encoding="utf-8")


# --- install_font ----------------------------------------------------------------------------------

def test_install_font_copies_the_style_font(tmp_path):
    (tmp_path / FONT_NAME).write_bytes(b"watermark font")
    assert styles.install_font(tmp_path, Style(font="anton")) == "Anton"
    assert (tmp_path / styles.FONT_NAME).read_bytes() == styles.FONTS["anton"].file.read_bytes()
    assert styles.install_font(tmp_path, Style(font="montserrat")) == "Montserrat ExtraBold"  # replaced
    assert (tmp_path / styles.FONT_NAME).read_bytes() == styles.FONTS["montserrat"].file.read_bytes()
    assert styles.install_font(tmp_path, None) == "DejaVu Sans"
    assert (tmp_path / styles.FONT_NAME).read_bytes() == FONT_FILE.read_bytes()
    assert (tmp_path / FONT_NAME).read_bytes() == b"watermark font"  # the watermark's font is left alone
    assert styles.install_font(tmp_path / "new" / "dir", Style(font="bebas")) == "Bebas Neue"


def test_install_font_failure_returns_none(tmp_path, monkeypatch):
    missing = dataclasses.replace(styles.FONTS["anton"], file=tmp_path / "missing.ttf")
    monkeypatch.setitem(styles.FONTS, "anton", missing)
    assert styles.install_font(tmp_path, Style(font="anton")) is None
    blocker = tmp_path / "file"
    blocker.write_text("x")
    assert styles.install_font(blocker, Style(font="bebas")) is None  # out_dir is not a folder


# --- real renders with libass ----------------------------------------------------------------------

def render(folder: Path, ass: str, width: int = 1080, height: int = 1920) -> np.ndarray:
    """The frame libass draws over a plain background (BGR)."""
    import cv2

    (folder / "sub.ass").write_text(ass, encoding="utf-8")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi",
                    "-i", f"color=c=0x335577:s={width}x{height}:d=1", "-vf", "ass=sub.ass:fontsdir=.",
                    "-frames:v", "1", "out.png"], cwd=folder, check=True, timeout=60)
    frame = cv2.imread(str(folder / "out.png"))
    assert frame is not None and frame.shape == (height, width, 3)
    return frame


def ink(frame: np.ndarray, tol: int = 8) -> np.ndarray:
    """Pixels the subtitles changed (the background colour is read in a corner)."""
    return np.abs(frame.astype(int) - frame[0, 0].astype(int)).max(axis=2) > tol


def assert_inside(frame: np.ndarray, margin: float = 0.01) -> None:
    ys, xs = np.nonzero(ink(frame))
    assert len(xs) > 0, "nothing drawn"
    h, w, _ = frame.shape
    assert xs.min() >= w * margin and xs.max() <= w * (1 - margin), (xs.min(), xs.max(), w)
    assert ys.min() >= h * margin and ys.max() <= h * (1 - margin), (ys.min(), ys.max(), h)


@needs_ffmpeg
@pytest.mark.parametrize("font", list(styles.FONTS))
@pytest.mark.parametrize("shape", list(styles.SHAPES))
def test_every_font_and_shape_renders(tmp_path, font, shape):
    style = Style(font=font, shape=shape)
    family = styles.install_font(tmp_path, style)
    assert family == styles.FONTS[font].family
    ass = subtitles.build_ass(sentence(), 0.0, 10.0, 1080, 1920, animated=False, style=style, font_family=family)
    frame = render(tmp_path, ass)
    assert (np.abs(frame.astype(int) - frame[0, 0].astype(int)).max(axis=2) > 60).sum() > 5000  # text is drawn
    assert_inside(frame)


@needs_ffmpeg
@pytest.mark.parametrize("shape", list(styles.SHAPES))
def test_animated_shapes_render(tmp_path, shape):
    style = Style(font="montserrat", shape=shape, color="rose", size="l")
    family = styles.install_font(tmp_path, style)
    ass = subtitles.build_ass(sentence(), 0.0, 10.0, 1080, 1920, animated=True, style=style, font_family=family)
    frame = render(tmp_path, ass)
    assert ink(frame, 60).sum() > 3000
    assert_inside(frame)


@needs_ffmpeg
@pytest.mark.parametrize("font", [k for k in styles.FONTS if k != "classique"])
def test_libass_finds_each_family(tmp_path, font):
    # Same file, same metrics: only the family name differs. An unknown name falls back to a system font.
    style = Style(font=font)
    family = styles.install_font(tmp_path, style)
    tr = Transcript("fr", [Segment(0.0, 1.0, "INCROYABLE", [Word(0.0, 1.0, "INCROYABLE")])])
    good = render(tmp_path, subtitles.build_ass(tr, 0.0, 2.0, 1080, 1920, False, style=style, font_family=family))
    bad = render(tmp_path, subtitles.build_ass(tr, 0.0, 2.0, 1080, 1920, False, style=style,
                                               font_family="NoSuchFamilyZZ"))
    assert (np.abs(good.astype(int) - bad.astype(int)).max(axis=2) > 60).sum() > 2000


@needs_ffmpeg
def test_no_fake_bold_on_single_weight_fonts(tmp_path):
    # Bold=-1 on a regular-only font makes libass embolden it: the catalog must not ask for it.
    style = Style(font="anton")
    family = styles.install_font(tmp_path, style)
    tr = Transcript("fr", [Segment(0.0, 1.0, "INCROYABLE", [Word(0.0, 1.0, "INCROYABLE")])])
    ass = subtitles.build_ass(tr, 0.0, 2.0, 1080, 1920, False, style=style, font_family=family)
    assert ",Anton," in ass and ",0,0,0,0,100,100," in ass  # Bold off

    def white(frame):  # the letters themselves, without the black outline
        return (frame.min(axis=2) > 200).sum()

    thin = white(render(tmp_path, ass))
    bold = white(render(tmp_path, ass.replace(",0,0,0,0,100,100,", ",-1,0,0,0,100,100,")))
    assert bold > thin * 1.05
