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
