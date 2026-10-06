import json

import pytest

from server import sources


@pytest.mark.parametrize("url,platform", [
    ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"),
    ("youtube.com/watch?v=dQw4w9WgXcQ", "youtube"),
    ("https://m.youtube.com/shorts/abcdefghijk", "youtube"),
    ("https://youtu.be/dQw4w9WgXcQ?t=42", "youtube"),
    ("https://www.twitch.tv/videos/123456789", "twitch"),
    ("https://clips.twitch.tv/SomeClipSlug", "twitch"),
    ("https://www.tiktok.com/@user/video/7234567890123456789", "tiktok"),
    ("https://vm.tiktok.com/ZMabc123/", "tiktok"),
    ("https://x.com/user/status/1790000000000000000", "x"),
    ("https://twitter.com/user/status/1790000000000000000", "x"),
    ("https://kick.com/video/0b9a2f4e", "kick"),
    ("https://www.instagram.com/reel/C1abcDEF/", "instagram"),
    ("HTTPS://WWW.YOUTUBE.COM/watch?v=x", "youtube"),
])
def test_supported_links(url, platform):
    assert sources.detect_platform(url) == platform


@pytest.mark.parametrize("url", [
    "https://evilx.com/video",                 # suffix trick
    "https://youtube.com.evil.example/watch",  # domain as subdomain of attacker
    "https://notyoutube.com/watch?v=1",
    "http://127.0.0.1:8000/api/health",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/",
    "ftp://youtube.com/video",
    "javascript:alert(1)",
    "https://user:pass@youtube.com/watch?v=1",
    "https://youtube.com:8443/watch?v=1",
    "file:///etc/passwd",
    "",
    "https://" + "a" * 3000 + ".youtube.com",
])
def test_rejected_links(url):
    with pytest.raises(sources.SourceError):
        sources.detect_platform(url)


def test_parse_youtube_chat(tmp_path):
    lines = [
        {"replayChatItemAction": {"videoOffsetTimeMsec": "12500", "actions": [
            {"addChatItemAction": {"item": {"liveChatTextMessageRenderer": {
                "message": {"runs": [{"text": "OMG "}, {"emoji": {"shortcuts": [":fire:"]}}]}}}}}]}},
        {"replayChatItemAction": {"videoOffsetTimeMsec": "bad", "actions": []}},
        "not json",
        {"replayChatItemAction": {"videoOffsetTimeMsec": "60000", "actions": [
            {"addChatItemAction": {"item": {"liveChatPaidMessageRenderer": {
                "message": {"runs": [{"text": "GG"}]}}}}}]}},
    ]
    f = tmp_path / "chat.live_chat.json"
    f.write_text("\n".join(x if isinstance(x, str) else json.dumps(x) for x in lines))
    assert sources.parse_youtube_chat(f) == [(12.5, "OMG :fire:"), (60.0, "GG")]


def test_friendly_errors():
    assert "privée" in sources._friendly_download_error("ERROR: Private video")
    assert "introuvable" in sources._friendly_download_error("ERROR: Video unavailable")
    assert sources._friendly_download_error("random failure").startswith("Impossible")
