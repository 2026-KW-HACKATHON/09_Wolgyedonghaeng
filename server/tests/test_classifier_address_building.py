import asyncio

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers import address as address_router
from routers import building as building_router
from services.classifier import FakeClassifier, get_classifier, mock_parts
from settings import Settings

app = FastAPI()
app.include_router(address_router.router)
app.include_router(building_router.router)
client = TestClient(app)


def test_fake_classifier_default():
    r = asyncio.run(FakeClassifier().classify([b"x"]))
    assert (r.type, r.confidence, r.source) == ("leak", 0.82, "fake")


def test_fake_classifier_settings_and_hint():
    s = Settings(_env_file=None, FAKE_CLASSIFIER_TYPE="other", FAKE_CLASSIFIER_CONFIDENCE=0.5)
    c = get_classifier(s)
    assert asyncio.run(c.classify([])).type == "other"
    assert c.classify_hint("보일러가 안 켜져요").type == "heating"
    assert c.classify_hint("벽에 곰팡이").type == "mold"


def test_mock_parts():
    assert mock_parts(Settings(_env_file=None)) == ["openrouter", "address", "building"]
    only_key = Settings(_env_file=None, OPENROUTER_API_KEY="a")
    assert mock_parts(only_key) == ["openrouter", "address", "building"]  # 모델 이름이 비어 있음
    s = Settings(
        _env_file=None,
        OPENROUTER_API_KEY="a",
        OPENROUTER_VISION_MODEL="m1",
        OPENROUTER_TEXT_MODEL="m2",
        KAKAO_REST_KEY="b",
        JUSO_API_KEY="c",
        BLDG_API_KEY="d",
    )
    assert mock_parts(s) == []


def test_address_reverse_and_search():
    r = client.get("/address/reverse", params={"lat": 37.62, "lng": 127.06})
    assert r.status_code == 200 and r.json()["sigunguCd"] == "11350"
    hits = client.get("/address/search", params={"q": "월계"}).json()
    assert 1 <= len(hits) <= 10
    out = client.get("/address/search", params={"q": "해운대"}).json()
    assert out and out[0]["sidoCd"] != "11"
    assert client.get("/address/reverse", params={"lat": 999, "lng": 0}).status_code == 422


def test_building():
    p = {"sigunguCd": "11350", "bjdongCd": "10100", "platGbCd": "0", "bun": "0012", "ji": "0003"}
    b = client.get("/building", params=p).json()
    assert b["fetchedOk"] and b["useAprDay"].startswith("1985") and b["mainPurpose"] == "단독주택"
    assert client.get("/building", params={**p, "bun": "9999"}).json()["fetchedOk"] is False
