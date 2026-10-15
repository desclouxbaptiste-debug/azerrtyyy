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


CAM_TOP_RIGHT = (0.73, 0.03, 0.25, 0.25)
CAM_BOTTOM_CENTRE = (0.375, 0.71, 0.25, 0.25)


def _crops(graph):
    import re

    return [tuple(int(v) for v in m) for m in re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", graph)]


def test_streamer_layout_preferences():
    def layout(**kw):
        return render.build_filter(LANDSCAPE, 1080, 1920, True, kw.pop("face_x", None), **kw)[1]

    assert layout(facecam=CAM_TOP_RIGHT) == "streamer"  # auto prefers it when a webcam is found
    assert layout(facecam=CAM_TOP_RIGHT, layout="streamer") == "streamer"
    assert layout(layout="streamer") == "blur" and layout(layout="streamer", face_x=0.5) == "face"  # no webcam
    assert layout(facecam=CAM_TOP_RIGHT, layout="face", face_x=0.85) == "face"
    assert layout(layout="face") == "blur"
    assert layout(facecam=CAM_TOP_RIGHT, layout="full", face_x=0.5) == "blur"
    assert render.build_filter(VERTICAL, 1080, 1920, True, None, CAM_TOP_RIGHT)[1] == "vertical"
    assert render.build_filter(LANDSCAPE, 1920, 1080, False, None, CAM_TOP_RIGHT)[1] == "original"


def test_streamer_panels_fill_the_short():
    top = render.seam_y(1920)
    assert top == 652 and top % 2 == 0
    graph, _ = render.build_filter(LANDSCAPE, 1080, 1920, True, None, CAM_TOP_RIGHT)
    assert graph.endswith("[base]") and "vstack=inputs=2" in graph
    assert f"scale=1080:{top}" in graph and f"scale=1080:{1920 - top}" in graph
    (cw, ch, cx, cy), (gw, gh, gx, gy) = _crops(graph)
    assert all(v % 2 == 0 for v in (cw, ch, cx, cy, gw, gh, gx, gy))
    assert cx + cw <= 1920 and cy + ch <= 1080 and gx + gw <= 1920 and gy + gh <= 1080
    assert abs(cw / ch - 1080 / top) < 0.02 and abs(gw / gh - 1080 / (1920 - top)) < 0.02  # nothing stretched
    assert cx >= 1300  # the webcam crop is the top-right corner
    # a webcam at the bottom centre is kept out of the game panel
    graph, _ = render.build_filter(LANDSCAPE, 1080, 1920, True, None, CAM_BOTTOM_CENTRE)
    _, (gw, gh, gx, gy) = _crops(graph)
    assert gy + gh <= int(0.71 * 1080) + 1


def test_streamer_crop_uses_square_pixels():
    anamorphic = ProbeInfo(duration=60, width=1440, height=1080, fps=25, has_audio=True, sar=4 / 3)
    graph, layout = render.build_filter(anamorphic, 1080, 1920, True, None, CAM_TOP_RIGHT)
    assert layout == "streamer"
    for w, h, x, y in _crops(graph):
        assert x + w <= 1920 and y + h <= 1080  # coordinates on the 1920x1080 frame after the SAR fix
