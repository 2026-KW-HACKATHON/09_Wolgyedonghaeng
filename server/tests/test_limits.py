import pytest
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from limits import RequestLimitMiddleware
from schemas import ErrorResponse


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def make_app(clock, max_bytes=100, per_min=3, trust_proxy=False, cors=False):
    app = FastAPI()

    @app.get("/health")
    def health():
        return {"ok": True}

    @app.get("/ping")
    def ping():
        return {"ok": True}

    @app.post("/echo")
    async def echo(request: Request):
        body = await request.body()
        return {"n": len(body)}

    app.add_middleware(
        RequestLimitMiddleware,
        max_bytes=max_bytes,
        per_min=per_min,
        trust_proxy=trust_proxy,
        clock=clock,
    )
    if cors:
        app.add_middleware(CORSMiddleware, allow_origins=["http://a.test"], allow_methods=["*"])
    return app


def test_rate_limit_blocks_after_limit_and_uses_easy_message():
    clock = Clock()
    c = TestClient(make_app(clock))
    assert [c.get("/ping").status_code for _ in range(3)] == [200, 200, 200]
    r = c.get("/ping")
    assert r.status_code == 429
    body = ErrorResponse.model_validate(r.json())
    assert body.error.code == "rate_limited"
    assert "잠시" in body.error.message
    assert int(r.headers["retry-after"]) >= 1


def test_window_slides():
    clock = Clock()
    c = TestClient(make_app(clock))
    for _ in range(3):
        c.get("/ping")
    assert c.get("/ping").status_code == 429
    clock.now += 61
    assert c.get("/ping").status_code == 200


def test_health_is_not_counted_or_blocked():
    clock = Clock()
    c = TestClient(make_app(clock, per_min=1))
    assert all(c.get("/health").status_code == 200 for _ in range(10))
    assert c.get("/ping").status_code == 200
    assert c.get("/health").status_code == 200


def test_zero_disables_limit():
    c = TestClient(make_app(Clock(), per_min=0))
    assert all(c.get("/ping").status_code == 200 for _ in range(20))


def test_forwarded_for_first_value_only_when_trusted():
    clock = Clock()
    trusted = TestClient(make_app(clock, per_min=1, trust_proxy=True))
    assert trusted.get("/ping", headers={"X-Forwarded-For": "1.1.1.1, 10.0.0.1"}).status_code == 200
    assert trusted.get("/ping", headers={"X-Forwarded-For": "1.1.1.1, 10.0.0.2"}).status_code == 429
    assert trusted.get("/ping", headers={"X-Forwarded-For": "2.2.2.2"}).status_code == 200

    untrusted = TestClient(make_app(clock, per_min=1, trust_proxy=False))
    assert untrusted.get("/ping", headers={"X-Forwarded-For": "1.1.1.1"}).status_code == 200
    assert untrusted.get("/ping", headers={"X-Forwarded-For": "2.2.2.2"}).status_code == 429


def test_content_length_over_limit_is_413():
    c = TestClient(make_app(Clock(), max_bytes=100))
    assert c.post("/echo", content=b"x" * 100).status_code == 200
    r = c.post("/echo", content=b"x" * 101)
    assert r.status_code == 413
    assert ErrorResponse.model_validate(r.json()).error.code == "payload_too_large"


def test_chunked_body_over_limit_is_413():
    c = TestClient(make_app(Clock(), max_bytes=100))

    def chunks():
        for _ in range(3):
            yield b"x" * 60

    r = c.post("/echo", content=chunks())
    assert r.status_code == 413


@pytest.mark.parametrize("path,method", [("/ping", "get")])
def test_limit_responses_carry_cors_headers(path, method):
    clock = Clock()
    c = TestClient(make_app(clock, per_min=1, cors=True))
    h = {"Origin": "http://a.test"}
    c.get(path, headers=h)
    r = c.get(path, headers=h)
    assert r.status_code == 429
    assert r.headers["access-control-allow-origin"] == "http://a.test"


def test_real_app_applies_request_size_limit(monkeypatch):
    from main import app
    from settings import get_settings

    limit = get_settings().MAX_REQUEST_BYTES
    c = TestClient(app)
    r = c.post(
        "/analyze", content=b"x" * (limit + 1), headers={"content-type": "multipart/form-data"}
    )
    assert r.status_code == 413
