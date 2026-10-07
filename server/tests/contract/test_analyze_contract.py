"""/analyze 계약 테스트: 가짜 분류기·rules 랭커로 호출해 계약 파일(contracts/)과 맞는지 본다."""

import json
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import db.log
import services.analyze as analyze_mod
from main import app
from schemas import AnalyzeResponse, ErrorResponse, HealthResponse
from services.matcher import Candidate
from services.ranker.base import RankContext
from services.ranker.rules import RulesRanker
from settings import get_settings

ROOT = Path(__file__).resolve().parents[3]
CONTRACTS = ROOT / "contracts"

HOUSEHOLD = {
    "size": 1,
    "income": "le48",
    "housingBenefit": "no",
    "tenure": "own",
    "traits": ["elderly65"],
}
ADDRESS = {
    "road": "서울특별시 노원구 월계로 45길 12",
    "jibun": None,
    "sidoCd": "11",
    "sigunguCd": "11350",
    "bjdongCd": "10100",
    "platGbCd": "0",
    "bun": "0012",
    "ji": "0003",
}
BUILDING = {
    "useAprDay": "1985-01-01",
    "mainPurpose": "단독주택",
    "grndFlrCnt": 2,
    "ugrndFlrCnt": 0,
    "fetchedOk": True,
}
PHOTO = b"\xff\xd8\xff\xe0PHOTO-BYTES-SENTINEL"


@pytest.fixture(autouse=True)
def tmp_log(tmp_path, monkeypatch):
    monkeypatch.setattr(db.log, "DB_PATH", tmp_path / "log.sqlite3")


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def post(client, household=None, **extra):
    data = {
        "household": json.dumps(household or HOUSEHOLD),
        "address": json.dumps(ADDRESS),
        "building": json.dumps(BUILDING),
    }
    data.update(extra)
    return client.post("/analyze", data=data, files=[("images[]", ("a.jpg", PHOTO, "image/jpeg"))])


def example(name):
    return json.loads((CONTRACTS / "examples" / name).read_text(encoding="utf-8"))


def openapi_schema(name):
    return json.loads((CONTRACTS / "openapi.json").read_text(encoding="utf-8"))["components"][
        "schemas"
    ][name]


# ---- 스키마·예시 모양 ----


@pytest.mark.parametrize(
    "name",
    ["analyze-normal", "analyze-confirm", "analyze-other", "analyze-empty"],
)
def test_examples_follow_models(name):
    AnalyzeResponse.model_validate(example(f"{name}.json"))


def test_error_example_follows_model():
    ErrorResponse.model_validate(example("analyze-error.json"))


def test_response_has_contract_fields(client):
    body = post(client).json()
    AnalyzeResponse.model_validate(body)
    schema = openapi_schema("AnalyzeResponse")
    assert set(schema["required"]) <= set(body)
    assert set(body) <= set(schema["properties"])
    assert set(body) == set(example("analyze-normal.json"))
    rec = body["recommendations"][0]
    assert set(rec) == set(example("analyze-normal.json")["recommendations"][0])
    assert set(body["version"]) == set(example("analyze-normal.json")["version"])


def test_normal_flow(client):
    a = AnalyzeResponse.model_validate(post(client).json())
    assert a.classification.type == "leak" and not a.needsConfirm
    assert a.rankerUsed == "rules" and not a.fallbackUsed
    ranks = [r.rank for r in a.recommendations]
    assert ranks == sorted(ranks) and len(set(ranks)) == len(ranks)
    for r in a.recommendations:
        assert r.reason and "해당돼요" not in r.reason and "확실히" not in r.reason


# ---- 확인 단계·기타·결과 없음 ----


def test_confirm_step_when_confidence_low(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "FAKE_CLASSIFIER_CONFIDENCE", 0.5)
    a = AnalyzeResponse.model_validate(post(client).json())
    assert a.needsConfirm and a.classification.confidence < get_settings().CONFIRM_THRESHOLD


def test_other_type_needs_confirm(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "FAKE_CLASSIFIER_TYPE", "other")
    a = AnalyzeResponse.model_validate(post(client).json())
    assert a.classification.type == "other" and a.needsConfirm


def test_override_never_needs_confirm(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "FAKE_CLASSIFIER_CONFIDENCE", 0.1)
    a = AnalyzeResponse.model_validate(post(client, overrideType="mold").json())
    assert a.classification.overridden and not a.needsConfirm


def test_empty_result_is_valid(client, monkeypatch):
    async def none(*_a, **_k):
        return []

    monkeypatch.setattr(analyze_mod.RulesRanker, "rank", none)
    monkeypatch.setattr(analyze_mod.RulesRanker, "rank_sync", lambda *_a, **_k: [])
    r = post(client)
    assert r.status_code == 200
    a = AnalyzeResponse.model_validate(r.json())
    assert a.recommendations == []


# ---- 오류 형식 ----


def test_error_shape_missing_images(client):
    r = client.post("/analyze", data={"household": json.dumps(HOUSEHOLD)})
    assert r.status_code == 400
    body = r.json()
    assert set(body) == {"error"} and set(body["error"]) == {"code", "message"}
    ErrorResponse.model_validate(body)


def test_error_shape_bad_household(client):
    r = client.post("/analyze", data={"household": "{}"})
    assert r.status_code == 400
    ErrorResponse.model_validate(r.json())


def test_error_shape_classifier_failure(client, monkeypatch):
    class Boom:
        async def classify(self, images):
            raise RuntimeError("boom")

    monkeypatch.setattr(analyze_mod, "get_classifier", lambda _s: Boom())
    r = post(client)
    assert r.status_code == 502
    body = ErrorResponse.model_validate(r.json())
    assert body.error.code and body.error.message


# ---- validator 대체 경로 ----


def test_fallback_when_ranker_returns_unknown_id(client, monkeypatch):
    real_rank_sync = RulesRanker.rank_sync

    class BadRanker:
        async def rank(self, ctx: RankContext, candidates: list[Candidate]):
            recs = await RulesRanker().rank(ctx, candidates)
            return [recs[0].model_copy(update={"programId": "ZZ99"}), *recs[1:]]

        def rank_sync(self, ctx, candidates):
            return real_rank_sync(RulesRanker(), ctx, candidates)

    monkeypatch.setattr(analyze_mod, "RulesRanker", BadRanker)
    a = AnalyzeResponse.model_validate(post(client).json())
    assert a.fallbackUsed is True and a.rankerUsed == "rules"
    assert a.recommendations and all(r.programId != "ZZ99" for r in a.recommendations)


# ---- /health ----


def test_health_version_and_mock(client):
    h = HealthResponse.model_validate(client.get("/health").json())
    assert h.ok and h.version.server and h.version.rulesHash.startswith("sha256:")
    assert isinstance(h.mock, list)
    if not get_settings().OPENROUTER_API_KEY:
        assert "openrouter" in h.mock


# ---- 개인정보 ----


def test_log_has_no_photo_or_address(client, tmp_path):
    r = post(client)
    assert r.status_code == 200
    rows = sqlite3.connect(tmp_path / "log.sqlite3").execute("select record from analyze_log")
    text = "".join(row[0] for row in rows.fetchall())
    for secret in ("월계로", "서울특별시", "10100", "0012", "SENTINEL", "1985-01-01"):
        assert secret not in text


def test_response_has_no_photo_or_address(client):
    text = post(client).text
    assert "SENTINEL" not in text and "월계로" not in text


# ---- 계약 파일이 실제 앱과 같은지 ----


def test_contracts_match_app():
    script = ROOT / "server" / "scripts" / "export_contracts.py"
    before = {
        n: (CONTRACTS / n).read_text(encoding="utf-8")
        for n in ("openapi.json", "programs.schema.json")
    }
    try:
        subprocess.run(
            [sys.executable, str(script)], check=True, capture_output=True, cwd=ROOT / "server"
        )
        for n, old in before.items():
            assert (CONTRACTS / n).read_text(encoding="utf-8") == old, (
                f"contracts/{n} 이 앱과 달라요. 'python scripts/export_contracts.py' 로 다시 만드세요"
            )
    finally:
        for n, old in before.items():
            (CONTRACTS / n).write_text(old, encoding="utf-8")
