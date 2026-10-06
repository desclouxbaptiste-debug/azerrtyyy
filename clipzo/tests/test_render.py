from server import config, render
from server.media import ProbeInfo

LANDSCAPE = ProbeInfo(duration=600, width=1920, height=1080, fps=30, has_audio=True)
VERTICAL = ProbeInfo(duration=60, width=1080, height=1920, fps=30, has_audio=True)
UHD = ProbeInfo(duration=600, width=3840, height=2160, fps=60, has_audio=True)


def test_output_sizes_follow_the_plan():
    assert render.output_size(LANDSCAPE, config.PLANS["free"], True) == (720, 1280)
    assert render.output_size(LANDSCAPE, config.PLANS["creator"], True) == (1080, 1920)
    assert render.output_size(UHD, config.PLANS["creator"], True) == (1080, 1920)
    assert render.output_size(UHD, config.PLANS["pro"], True) == (2160, 3840)
    assert render.output_size(LANDSCAPE, config.PLANS["pro"], False) == (1920, 1080)
    assert render.output_size(LANDSCAPE, config.PLANS["free"], False) == (1280, 720)
    small = ProbeInfo(duration=60, width=640, height=360, fps=30, has_audio=True)
    assert render.output_size(small, config.PLANS["pro"], False) == (640, 360)  # never upscale


def test_face_crop_is_clamped_inside_the_frame():
    graph, layout = render.build_filter(LANDSCAPE, 1080, 1920, True, face_x=0.99)
    assert layout == "face"
    # scaled width = 1920 * 1920 / 1080 = 3414 → right-most crop starts at 3414 - 1080
    assert "crop=1080:1920:2334:0" in graph
    graph, _ = render.build_filter(LANDSCAPE, 1080, 1920, True, face_x=0.0)
    assert "crop=1080:1920:0:0" in graph


def test_layout_choice():
    assert render.build_filter(LANDSCAPE, 1080, 1920, True, None)[1] == "blur"
    assert render.build_filter(VERTICAL, 1080, 1920, True, 0.5)[1] == "vertical"
    assert render.build_filter(LANDSCAPE, 1920, 1080, False, None)[1] == "original"
    for g, _ in [render.build_filter(LANDSCAPE, 1080, 1920, True, None),
                 render.build_filter(VERTICAL, 1080, 1920, True, None)]:
        assert g.endswith("[base]")
