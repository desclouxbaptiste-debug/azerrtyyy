from conftest import needs_ffmpeg
from server import media


@needs_ffmpeg
def test_audio_decode_is_bounded_by_the_probed_duration(sample_video, tmp_path):
    """A file can lie about its length: decoding stops at the duration we checked against the plan."""
    dest = tmp_path / "a.raw"
    media.extract_audio(sample_video, dest, duration=10.0)
    seconds = dest.stat().st_size / 2 / media.AUDIO_RATE
    assert 10.0 <= seconds <= 11.2


@needs_ffmpeg
def test_scene_scores_parse_real_ffmpeg_output(sample_video, tmp_path):
    scores = media.scene_scores_per_second(sample_video, 150.0, tmp_path)
    assert len(scores) == 150
    assert scores[90:102].max() > 0.3  # the flashing passage
    assert scores[:80].max() < 0.3
