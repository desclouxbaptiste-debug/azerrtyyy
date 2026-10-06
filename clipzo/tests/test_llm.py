import json
from types import SimpleNamespace

import pytest

from server import config, llm
from server.transcribe import Segment, Transcript
from server.virality import Candidate


def cands():
    return [Candidate(100, 190, 0.5, 80, 140, reasons=["Rires détectés : moment drôle"]),
            Candidate(400, 490, 0.4, 70, 450), Candidate(800, 890, 0.3, 60, 850)]


TRANSCRIPT = Transcript("fr", [Segment(float(t), t + 4.0, f"phrase {t}") for t in range(0, 1000, 5)])


def test_parse_clamps_and_dedupes():
    data = {"clips": [
        {"candidate_id": 1, "virality": 140, "start": 10, "end": 9999, "title": "T" * 200, "hook": "h",
         "hashtags": ["fun", "#ok", " "], "why": ["a", "", "b", "c", "d"]},
        {"candidate_id": 1, "virality": 50, "start": 400, "end": 490, "title": "dup", "hook": "", "hashtags": [], "why": []},
        {"candidate_id": 7, "virality": 50, "start": 0, "end": 60, "title": "bad id", "hook": "", "hashtags": [], "why": []},
        {"candidate_id": "x"},
        {"candidate_id": 0, "virality": 90, "start": 98, "end": 188, "title": "Best", "hook": "Hook",
         "hashtags": [], "why": ["Chute inattendue"]},
    ]}
    out = llm.parse_choices(data, cands(), clip_seconds=90, count=3, duration=1000)
    assert [c.candidate.start for c in out] == [400, 100]
    first = out[0]
    assert first.virality == 100
    assert first.start >= 400 - llm.CONTEXT_PAD and first.end <= 490 + llm.CONTEXT_PAD
    assert 76 <= first.end - first.start <= 104
    assert first.hashtags == ["#fun", "#ok"] and len(first.why) == 3 and len(first.title) <= 90
    assert out[1].title == "Best" and out[1].start == 98


def test_parse_with_nothing_usable_raises():
    with pytest.raises(llm.LLMUnavailable):
        llm.parse_choices({"clips": [{"candidate_id": 99}]}, cands(), 90, 3, 1000)


def test_prompt_contains_each_candidate_with_context():
    p = llm.build_prompt("Mon live", "Twitch", TRANSCRIPT, cands(), 90, 2)
    assert p.count("<candidate ") == 3
    assert "[85.0-89.0] phrase 85" in p  # 15 s of context before candidate 0
    assert "allowed range 76-104 s" in p
    assert "Rires détectés" in p


class FakeClient:
    def __init__(self, response, sink):
        self._response, self._sink = response, sink
        create = lambda **kw: (sink.append(kw), response)[1]  # noqa: E731
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=create))
        self.messages = SimpleNamespace(create=create)


def fake_response(payload, stop="end_turn"):
    return SimpleNamespace(stop_reason=stop, content=[
        SimpleNamespace(type="thinking", thinking=""),
        SimpleNamespace(type="text", text=json.dumps(payload)),
    ])


@pytest.fixture
def claude(monkeypatch):
    import anthropic

    sent = []
    state = {"response": None}
    monkeypatch.setattr(config, "LLM_MODE", "on")
    monkeypatch.setattr(anthropic, "Anthropic", lambda **kw: FakeClient(state["response"], sent))
    return state, sent


def test_rank_sends_structured_request_with_fallback(claude):
    state, sent = claude
    state["response"] = fake_response({"clips": [
        {"candidate_id": 2, "virality": 88, "start": 801, "end": 889, "title": "Le moment", "hook": "Regarde",
         "hashtags": ["#a"], "why": ["Chute"]}]})
    out = llm.rank("Titre", "YouTube", TRANSCRIPT, cands(), 90, 1, 1000)
    assert out[0].candidate.start == 800 and out[0].title == "Le moment"
    req = sent[0]
    assert req["model"] == config.CLAUDE_MODEL
    assert req["output_config"]["format"]["type"] == "json_schema"
    assert req["output_config"]["effort"] == config.CLAUDE_EFFORT
    assert req["fallbacks"] == "default" and req["betas"] == ["server-side-fallback-2026-07-01"]
    assert "thinking" not in req and "temperature" not in req


@pytest.mark.parametrize("stop", ["refusal", "max_tokens"])
def test_rank_handles_bad_stop_reasons(claude, stop):
    state, _ = claude
    state["response"] = fake_response({"clips": []}, stop=stop)
    with pytest.raises(llm.LLMUnavailable):
        llm.rank("t", "p", TRANSCRIPT, cands(), 90, 1, 1000)


def test_rank_without_key_is_unavailable(monkeypatch):
    monkeypatch.setattr(config, "LLM_MODE", "off")
    with pytest.raises(llm.LLMUnavailable):
        llm.rank("t", "p", TRANSCRIPT, cands(), 90, 1, 1000)
