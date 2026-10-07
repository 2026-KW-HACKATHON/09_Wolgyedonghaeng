import json

import pytest
from fastapi.testclient import TestClient

import db.log
from main import app
from schemas import AnalyzeResponse, ErrorResponse, HealthResponse

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


@pytest.fixture(autouse=True)
def tmp_log(tmp_path, monkeypatch):
    monkeypatch.setattr(db.log, "DB_PATH", tmp_path / "log.sqlite3")


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _post(client, **extra):
    data = {
        "household": json.dumps(HOUSEHOLD),
        "address": json.dumps(ADDRESS),
        "building": json.dumps(BUILDING),
    }
    data.update(extra)
    return client.post(
        "/analyze", data=data, files=[("images[]", ("a.jpg", b"\xff\xd8x", "image/jpeg"))]
    )


def test_health(client):
    r = client.get("/health")
    h = HealthResponse.model_validate(r.json())
    assert h.ok and "openrouter" in h.mock


def test_analyze_ok(client):
    r = _post(client)
    assert r.status_code == 200
    a = AnalyzeResponse.model_validate(r.json())
    assert a.classification.type == "leak" and not a.needsConfirm
    assert a.recommendations and a.rankerUsed == "rules" and not a.fallbackUsed
    assert all(x.reason and "해당돼요" not in x.reason for x in a.recommendations)


def test_override_skips_classification(client):
    r = client.post("/analyze", data={"household": json.dumps(HOUSEHOLD), "overrideType": "mold"})
    a = AnalyzeResponse.model_validate(r.json())
    assert a.classification.overridden and a.classification.type == "mold" and not a.needsConfirm


def test_needs_confirm_low_confidence(client, monkeypatch):
    from settings import get_settings

    monkeypatch.setattr(get_settings(), "FAKE_CLASSIFIER_CONFIDENCE", 0.5)
    a = AnalyzeResponse.model_validate(_post(client).json())
    assert a.needsConfirm


def test_no_images_is_error(client):
    r = client.post("/analyze", data={"household": json.dumps(HOUSEHOLD)})
    assert r.status_code == 400
    ErrorResponse.model_validate(r.json())


def test_bad_household(client):
    r = client.post("/analyze", data={"household": "{}"})
    assert r.status_code == 400
    ErrorResponse.model_validate(r.json())


def test_log_has_no_personal_data(client, tmp_path):
    _post(client)
    import sqlite3

    rows = (
        sqlite3.connect(tmp_path / "log.sqlite3")
        .execute("select record from analyze_log")
        .fetchall()
    )
    text = rows[0][0]
    assert "월계로" not in text and "10100" not in text
