import asyncio
import json

import httpx
from fastapi.testclient import TestClient

from main import app
from schemas import ErrorResponse
from services.kakao_auth import (
    AuthError,
    FakeKakaoAuth,
    RealKakaoAuth,
    get_kakao_auth,
    issue_token,
    verify_token,
)
from settings import Settings, get_settings

client = TestClient(app)
REDIRECT = "http://localhost:8081/auth-callback"


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_fake_login_flow():
    r = client.get("/auth/kakao/url", params={"redirectUri": REDIRECT})
    assert r.json()["url"] == f"{REDIRECT}?code=fake"
    r = client.post("/auth/kakao", json={"code": "anything", "redirectUri": REDIRECT})
    assert r.status_code == 200
    body = r.json()
    assert body["user"] == {"id": "fake-1", "nickname": "테스트"}
    token = body["token"]

    assert client.get("/me/profile", headers=_auth(token)).json() == {
        "household": None,
        "address": None,
    }
    prof = {"household": {"size": 2, "income": "le48", "tenure": "own"}, "address": None}
    r = client.put("/me/profile", json=prof, headers=_auth(token))
    assert r.status_code == 200
    got = client.get("/me/profile", headers=_auth(token)).json()
    assert got["household"]["size"] == 2 and got["household"]["tenure"] == "own"


def test_bad_token_is_401():
    for h in ({}, _auth("nope"), _auth("a.b"), {"Authorization": "Basic x"}):
        r = client.get("/me/profile", headers=h)
        assert r.status_code == 401
        ErrorResponse.model_validate(r.json())
    assert client.put("/me/profile", json={}, headers=_auth("x")).status_code == 401


def test_token_sign_expiry_and_tamper():
    s = Settings(_env_file=None, APP_TOKEN_SECRET="s1")
    t = issue_token(s, "u1", now=1000)
    assert verify_token(s, t, now=1001) == "u1"
    assert verify_token(s, t, now=1000 + 31 * 86400) is None
    payload, sig = t.split(".")
    assert verify_token(s, payload + "." + sig[:-2] + "AA", now=1001) is None
    assert verify_token(Settings(_env_file=None, APP_TOKEN_SECRET="s2"), t, now=1001) is None


def test_selection_and_health():
    assert isinstance(get_kakao_auth(Settings(_env_file=None)), FakeKakaoAuth)
    assert isinstance(
        get_kakao_auth(Settings(_env_file=None, KAKAO_REST_KEY="k", KAKAO_CLIENT_SECRET="s")),
        RealKakaoAuth,
    )
    if not get_settings().KAKAO_REST_KEY:
        assert "kakao" in client.get("/health").json()["mock"]


def _real(handler):
    s = Settings(_env_file=None, KAKAO_REST_KEY="rk", KAKAO_CLIENT_SECRET="cs")
    return RealKakaoAuth(s, transport=httpx.MockTransport(handler))


def test_real_authorize_url():
    url = _real(lambda r: None).authorize_url(REDIRECT)
    assert url.startswith("https://kauth.kakao.com/oauth/authorize?client_id=rk&redirect_uri=")
    assert "response_type=code" in url


def test_real_exchange_flow():
    seen = {}

    def handler(req: httpx.Request) -> httpx.Response:
        if req.url.host == "kauth.kakao.com":
            seen["form"] = req.content.decode()
            return httpx.Response(200, json={"access_token": "AT"})
        assert req.headers["Authorization"] == "Bearer AT"
        return httpx.Response(
            200, json={"id": 123, "kakao_account": {"profile": {"nickname": "민수"}}}
        )

    user = asyncio.run(_real(handler).exchange("CODE", REDIRECT))
    assert user.id == "123" and user.nickname == "민수"
    assert "code=CODE" in seen["form"] and "client_secret=cs" in seen["form"]
    assert "grant_type=authorization_code" in seen["form"]


def test_real_exchange_failure():
    def handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(400, content=json.dumps({"error": "x"}))

    try:
        asyncio.run(_real(handler).exchange("bad", REDIRECT))
    except AuthError:
        pass
    else:
        raise AssertionError("AuthError 가 나야 해요")


def test_real_failure_returns_502(monkeypatch):
    import routers.auth as ra

    class Boom:
        async def exchange(self, code, redirect_uri):
            raise AuthError("x")

    monkeypatch.setattr(ra, "get_kakao_auth", lambda s: Boom())
    r = client.post("/auth/kakao", json={"code": "c", "redirectUri": REDIRECT})
    assert r.status_code == 502
    assert ErrorResponse.model_validate(r.json()).error.code == "auth_failed"
