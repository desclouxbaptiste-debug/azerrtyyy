from server import subtitles
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
