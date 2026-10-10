import re

import pytest

from conftest import needs_ffmpeg
from server import styles, subtitles
from server.styles import Style
from server.transcribe import Segment, Transcript, Word


def transcript():
    words = [Word(10.0, 10.4, "Salut"), Word(10.5, 10.9, "{\\b1}tout"), Word(11.0, 11.3, "le"),
             Word(11.4, 11.9, "monde!"), Word(14.0, 14.5, "Regarde"), Word(14.6, 15.0, "ça")]
    return Transcript("fr", [Segment(10.0, 11.9, "Salut tout le monde!", words[:4]),
                             Segment(14.0, 15.0, "Regarde ça", words[4:])])


def test_override_tags_are_neutralised():
    ass = subtitles.build_ass(transcript(), 9.0, 20.0, 1080, 1920, animated=False)
    assert ass is not None
    assert "{\\b1}" not in ass and "(/b1)tout" in ass


def test_times_are_relative_to_the_clip_and_chunks_split_on_sentences():
    ass = subtitles.build_ass(transcript(), 9.0, 20.0, 1080, 1920, animated=False)
    events = [l for l in ass.splitlines() if l.startswith("Dialogue:")]
    assert len(events) == 2
    assert events[0].startswith("Dialogue: 0,0:00:01.00,")
    assert events[1].startswith("Dialogue: 0,0:00:05.00,")
    assert "PlayResX: 1080" in ass and "PlayResY: 1920" in ass


def test_animated_highlights_each_word():
    ass = subtitles.build_ass(transcript(), 9.0, 20.0, 1080, 1920, animated=True)
    events = [l for l in ass.splitlines() if l.startswith("Dialogue:")]
    assert len(events) == 6  # one event per spoken word
    assert all(subtitles.HIGHLIGHT in e for e in events)
    assert "SALUT" in events[0]


def test_words_outside_the_clip_are_dropped():
    assert subtitles.build_ass(transcript(), 30.0, 90.0, 720, 1280, animated=False) is None
    ass = subtitles.build_ass(transcript(), 13.5, 40.0, 720, 1280, animated=False)
    assert "Salut" not in ass and "Regarde" in ass


def _events(ass):
    out = []
    for line in ass.splitlines():
        if line.startswith("Dialogue:"):
            parts = line.split(",", 3)
            out.append((parts[1], parts[2]))
    return out


def test_events_never_overlap_on_fast_speech():
    words = [Word(11.0 + i * 0.1, 11.0 + i * 0.1 + 0.08, w) for i, w in enumerate(["un", "deux", "trois", "quatre", "cinq", "six", "sept"])]
    tr = Transcript("fr", [Segment(11.0, 11.7, " ".join(w.text for w in words), words)])
    for animated in (True, False):
        ass = subtitles.build_ass(tr, 10.0, 20.0, 1080, 1920, animated=animated)
        ev = _events(ass)
        for (a1, b1), (a2, b2) in zip(ev, ev[1:]):
            assert b1 <= a2, (animated, ev)


def test_landscape_captions_are_sized_from_the_short_side():
    ass_v = subtitles.build_ass(transcript(), 9.0, 20.0, 1080, 1920, animated=False)
    ass_h = subtitles.build_ass(transcript(), 9.0, 20.0, 1920, 1080, animated=False)
    size = lambda a: int(a.split("Style: Default,")[1].split(",")[1])  # noqa: E731
    margin = lambda a: int(a.split("Style: Default,")[1].split(",")[20])  # noqa: E731
    assert size(ass_v) == size(ass_h)
    assert margin(ass_h) < margin(ass_v)


# --- styles ----------------------------------------------------------------------------------------

FIELDS = subtitles.STYLE_FORMAT.removeprefix("Format: ").split(", ")


def style_of(ass: str, name: str = "Default") -> dict:
    line = next(x for x in ass.splitlines() if x.startswith(f"Style: {name},"))
    values = line.removeprefix("Style: ").split(",")
    assert len(values) == len(FIELDS), line
    return dict(zip(FIELDS, values))


def dialogues(ass: str) -> list[tuple[int, str, str, str, str]]:
    """(layer, start, end, style, text) of every event."""
    out = []
    for line in ass.splitlines():
        if line.startswith("Dialogue:"):
            layer, a, b, style, _, _, _, _, _, text = line.removeprefix("Dialogue: ").split(",", 9)
            out.append((int(layer), a, b, style, text))
    return out


def words(*texts: str, start: float = 10.0, step: float = 0.4) -> Transcript:
    ws = [Word(start + i * step, start + i * step + step * 0.9, t) for i, t in enumerate(texts)]
    return Transcript("fr", [Segment(ws[0].start, ws[-1].end, " ".join(texts), ws)])


def build(tr=None, animated=True, width=1080, height=1920, **kw):
    return subtitles.build_ass(tr or transcript(), 9.0, 30.0, width, height, animated=animated, **kw)


def test_default_style_keeps_todays_look():
    for animated, size, shadow in ((True, 81, "2"), (False, 66, "1")):
        ass = build(animated=animated)
        assert ass == build(animated=animated, style=Style(), font_family="DejaVu Sans")
        assert ass == build(animated=animated, style={"font": "anton"})  # font not installed: default font
        s = style_of(ass)
        assert (s["Fontname"], s["Fontsize"], s["PrimaryColour"], s["OutlineColour"], s["BackColour"]) == (
            "DejaVu Sans", str(size), "&H00FFFFFF", "&H00000000", "&H64000000")
        assert (s["Bold"], s["BorderStyle"], s["Outline"], s["Shadow"]) == ("-1", "1", str(max(3, size // 12)), shadow)
        assert (s["Alignment"], s["MarginL"], s["MarginV"]) == ("2", str(int(1080 * 0.07)), str(int(1920 * 0.27)))
        assert sum(line.startswith("Style:") for line in ass.splitlines()) == 1
        assert all(layer == 0 and style == "Default" for layer, _, _, style, _ in dialogues(ass))


def test_font_family_size_and_bold():
    ass = build(style=Style(font="anton", size="l"), font_family="Anton")
    s = style_of(ass)
    assert s["Fontname"] == "Anton" and s["Bold"] == "0"
    assert s["Fontsize"] == str(int(1080 * 0.075 * styles.FONTS["anton"].scale * 1.2))
    s = style_of(build(animated=False, style=Style(font="poppins", size="s"), font_family="Poppins"))
    assert s["Bold"] == "-1" and s["Fontsize"] == str(int(1080 * 0.062 * styles.FONTS["poppins"].scale * 0.85))
    assert style_of(build(style=Style(font="montserrat"), font_family="Montserrat ExtraBold"))["Fontname"] == \
        "Montserrat ExtraBold"


def test_font_family_cannot_break_the_style_line():
    ass = build(style=Style(font="anton"), font_family="Evil,Font\n[Events]\nDialogue: {x}")
    assert style_of(ass)["Fontname"] == "EvilFontEventsDialogue x"
    assert ass.count("[Events]") == 1


def test_style_values_only_come_from_the_whitelist():
    evil = {"font": "anton\nStyle: X", "shape": "boite,3", "color": "&H00FF00&", "position": "{\\pos(0,0)}"}
    assert build(style=evil, font_family="Anton") == build(font_family="Anton")


def test_contour_highlights_in_the_accent_colour():
    ass = build(style=Style(color="vert"), font_family="DejaVu Sans")
    events = dialogues(ass)
    assert len(events) == 6 and all("\\c&H007AFF3D&" in text for *_, text in events)
    assert subtitles.HIGHLIGHT not in ass


def test_boite_draws_translucent_boxes_on_their_own_layer():
    ass = build(animated=True, style=Style(shape="boite"))
    box, text = style_of(ass, "Box"), style_of(ass)
    assert box["BorderStyle"] == "3" and box["OutlineColour"] == "&H66000000"  # 60 % opaque black box
    assert box["PrimaryColour"].startswith("&HFF")  # the box layer draws no letters
    assert text["BorderStyle"] == "1" and text["Outline"] == "0"
    events = dialogues(ass)
    assert [e[0] for e in events] == [0, 1] * 6
    for layer, _, _, style, text in events:
        assert style == ("Box" if layer == 0 else "Default")
        if layer == 0:  # uniform text: one box per line, no darker overlaps
            assert "\\c" not in text and "\\fscx" not in text and "\\xbord" in text


def test_bandeau():
    ass = build(animated=False, style=Style(shape="bandeau", color="rose"))
    s = style_of(ass)
    assert s["BorderStyle"] == "3" and s["OutlineColour"] == "&H00D84FFF" and s["PrimaryColour"] == "&H00000000"
    ass = build(animated=True, style=Style(shape="bandeau", color="cyan"))
    assert style_of(ass, "Box")["BorderStyle"] == "3" and style_of(ass, "Box")["OutlineColour"] == "&HFFFFE133"
    for layer, _, _, _, text in dialogues(ass):
        if layer == 0:  # only the word being spoken gets the box
            assert text.count("\\3a&H00&") == 1
        else:
            assert "\\c&H00000000&" in text  # dark letters on the box
    assert "{\\fsp" in ass  # wider spaces, so the box never touches the next word


def test_neon_glows_in_the_accent_colour():
    ass = build(animated=True, style=Style(shape="neon", color="cyan"))
    glow = style_of(ass, "Glow")
    assert glow["OutlineColour"] == styles.ass_colour("#33E1FF", 0x20) and glow["BorderStyle"] == "1"
    assert style_of(ass, "Halo") and style_of(ass)["PrimaryColour"] == "&H00FFFFFF"
    events = dialogues(ass)
    assert [e[0] for e in events] == [0, 1, 2] * 6
    assert all("\\blur" in text for *_, text in events)


def test_ombre_has_a_big_soft_shadow():
    ass = build(style=Style(shape="ombre"))
    s, contour = style_of(ass), style_of(build())
    assert float(s["Shadow"]) >= 5 and float(s["Outline"]) < float(contour["Outline"])
    assert all("\\blur" in text for *_, text in dialogues(ass))


@pytest.mark.parametrize("shape", list(styles.SHAPES))
@pytest.mark.parametrize("animated", [True, False])
def test_layers_share_timing_and_line_breaks(shape, animated):
    tr = words("Franchement", "c’était", "complètement", "incroyable", "ce", "clutch", "en", "finale", "hier")
    ass = build(tr, animated=animated, style=Style(font="classique", shape=shape, size="l"))
    by_time: dict[tuple, list] = {}
    for layer, a, b, _, text in dialogues(ass):
        by_time.setdefault((a, b), []).append(text)
    n_layers = len({layer for layer, *_ in dialogues(ass)})
    for texts in by_time.values():
        assert len(texts) == n_layers
        assert len({t.count("\\N") for t in texts}) == 1
    for layer in range(n_layers):
        ev = [(a, b) for lay, a, b, _, _ in dialogues(ass) if lay == layer]
        for (_, b1), (a2, _) in zip(ev, ev[1:]):
            assert b1 <= a2


def test_positions():
    assert style_of(build(style=Style(position="milieu")))["Alignment"] == "5"
    s = style_of(build(style=Style(position="haut")))
    assert s["Alignment"] == "8" and s["MarginV"] == str(int(1920 * 0.12))
    for position in ("bas", "auto"):
        s = style_of(build(style=Style(position=position)))
        assert s["Alignment"] == "2" and s["MarginV"] == str(int(1920 * 0.27))
    assert style_of(build(width=1920, height=1080, style=Style(position="bas")))["MarginV"] == str(int(1080 * 0.08))
    # bas / milieu / haut are explicit choices: the streamer seam only moves "auto"
    assert "\\pos" not in build(style=Style(position="bas"), seam_y=700)


def test_auto_position_centres_on_the_streamer_seam():
    ass = build(style=Style(shape="neon"), seam_y=700)
    assert style_of(ass)["Alignment"] == "5"
    assert all("\\pos(540,700)" in text for *_, text in dialogues(ass))
    # A seam near the top: the caption is moved down until it fits in the frame.
    ass = build(animated=False, style=Style(shape="boite", size="l"), seam_y=5)
    ys = {int(m) for m in re.findall(r"\\pos\(540,(\d+)\)", ass)}
    size = int(style_of(ass)["Fontsize"])
    assert ys and min(ys) >= size / 2 + 1920 * 0.03


def test_caps():
    def text_of(ass):
        return " ".join(t for *_, t in dialogues(ass))

    assert "SALUT" in text_of(build(animated=True))
    assert "Salut" in text_of(build(animated=False))
    assert "Salut" in text_of(build(animated=True, style=Style(caps=False)))
    assert "SALUT" in text_of(build(animated=False, style=Style(caps=True)))
    # caps-only fonts draw capitals anyway: the text is kept as spoken
    assert "Salut" in text_of(build(animated=True, style=Style(font="bebas", caps=True), font_family="Bebas Neue"))


def test_french_punctuation_never_starts_a_line():
    tr = words("«", "Regarde", "ça", "»", ":", "c’est", "fou", "!")
    ass = build(tr, animated=False)
    nb = subtitles.NBSP
    assert f"«{nb}Regarde ça{nb}»{nb}: c’est fou{nb}!" in ass
    assert [w.text for w in subtitles.clip_words(tr, 9.0, 30.0)] == [f"«{nb}Regarde", "ça" + nb + "»" + nb + ":",
                                                                      "c’est", f"fou{nb}!"]
    tr = Transcript("fr", [Segment(1.0, 2.0, "x", [Word(1.0, 1.5, "génial :"), Word(1.6, 2.0, "oui")])])
    assert subtitles.clip_words(tr, 0.0, 5.0)[0].text == f"génial{nb}:"


def test_long_words_are_shrunk_to_fit():
    tr = words("anticonstitutionnellement", "!")
    ass = build(tr, animated=True, style=Style(size="l"))
    size = int(style_of(ass)["Fontsize"])
    sizes = {int(m) for m in re.findall(r"\\fs(\d+)", ass)}
    assert sizes and max(sizes) < size
    font = styles.FONTS["classique"]
    assert subtitles._width("ANTICONSTITUTIONNELLEMENT\u00a0!", font, max(sizes)) * 1.12 <= 1080 * (1 - 2 * 0.07)


def test_line_breaks_are_balanced():
    widths = [100.0, 100.0, 100.0, 100.0]
    assert subtitles._break_lines(widths, 10.0, 1000.0) == [0]
    assert subtitles._break_lines(widths, 10.0, 300.0) == [0, 2]
    assert subtitles._break_lines([500.0, 50.0, 50.0], 10.0, 560.0) == [0, 1]
    assert subtitles._break_lines([900.0], 10.0, 300.0) == [0]  # too wide alone: nothing better to do


# --- real renders ----------------------------------------------------------------------------------

def _render(folder, ass: str, width: int, height: int):
    import subprocess

    import cv2

    (folder / "sub.ass").write_text(ass, encoding="utf-8")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi",
                    "-i", f"color=c=0x335577:s={width}x{height}:d=1", "-vf", "ass=sub.ass:fontsdir=.",
                    "-frames:v", "1", "out.png"], cwd=folder, check=True, timeout=60)
    return cv2.imread(str(folder / "out.png"))


def _bbox(frame):
    import numpy as np

    changed = np.abs(frame.astype(int) - frame[0, 0].astype(int)).max(axis=2) > 8
    ys, xs = np.nonzero(changed)
    assert len(xs), "nothing drawn"
    return xs.min(), ys.min(), xs.max(), ys.max()


@needs_ffmpeg
@pytest.mark.parametrize("font", list(styles.FONTS))
def test_landscape_two_lines_in_size_l_stay_inside_the_frame(tmp_path, font):
    tr = words("Franchement", "c’était", "complètement", "dingue", "cette", "finale", "!")
    for shape in ("boite", "neon", "bandeau"):
        style = Style(font=font, shape=shape, size="l", caps=True)
        family = styles.install_font(tmp_path, style)
        ass = subtitles.build_ass(tr, 10.0, 30.0, 1920, 1080, animated=False, style=style, font_family=family)
        first = next(text for layer, a, *_, text in dialogues(ass) if a == "0:00:00.00" and layer == 0)
        assert first.count("\\N") <= 1, first  # at most two lines
        x0, y0, x1, y1 = _bbox(_render(tmp_path, ass, 1920, 1080))
        assert x0 >= 19 and y0 >= 10 and x1 <= 1920 - 19 and y1 <= 1080 - 10, (shape, x0, y0, x1, y1)


@needs_ffmpeg
@pytest.mark.parametrize("position", list(styles.POSITIONS))
def test_long_word_in_size_l_is_not_clipped(tmp_path, position):
    tr = words("anticonstitutionnellement", "extraordinairement")
    style = Style(font="luckiest", shape="neon", size="l", position=position)
    family = styles.install_font(tmp_path, style)
    ass = subtitles.build_ass(tr, 10.0, 30.0, 1080, 1920, animated=True, style=style, font_family=family,
                              seam_y=60 if position == "auto" else None)
    x0, y0, x1, y1 = _bbox(_render(tmp_path, ass, 1080, 1920))
    assert x0 >= 10 and y0 >= 19 and x1 <= 1080 - 10 and y1 <= 1920 - 19, (x0, y0, x1, y1)
