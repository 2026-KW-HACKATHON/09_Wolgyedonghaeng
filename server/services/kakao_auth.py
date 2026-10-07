"""카카오 로그인 (spec 6.4). 키가 없으면 가짜 구현이 어떤 code 든 가짜 사용자로 받아 준다.

앱 토큰은 서버가 HMAC-SHA256 으로 서명한 단순 토큰이다. 카카오 id·닉네임은 로그에 남기지 않는다.
"""

import base64
import hashlib
import hmac
import json
import logging
import secrets
import time
from typing import Protocol
from urllib.parse import urlencode

import httpx

from schemas import AuthUser
from settings import Settings

log = logging.getLogger("jipgyeol")

AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize"
TOKEN_URL = "https://kauth.kakao.com/oauth/token"
USER_URL = "https://kapi.kakao.com/v2/user/me"


class AuthError(Exception):
    """로그인 실패 (코드 교환·사용자 조회)."""


class KakaoAuth(Protocol):
    def authorize_url(self, redirect_uri: str) -> str: ...
    async def exchange(self, code: str, redirect_uri: str) -> AuthUser: ...


class FakeKakaoAuth:
    """가짜 모드: 인가 URL 이 앱 자신으로 돌아오고, 어떤 code 든 성공한다."""

    def authorize_url(self, redirect_uri: str) -> str:
        sep = "&" if "?" in redirect_uri else "?"
        return f"{redirect_uri}{sep}code=fake"

    async def exchange(self, code: str, redirect_uri: str) -> AuthUser:
        return AuthUser(id="fake-1", nickname="테스트")


class RealKakaoAuth:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        self.key = settings.KAKAO_REST_KEY
        self.secret = settings.KAKAO_CLIENT_SECRET
        self.timeout = settings.AUTH_TIMEOUT
        self.transport = transport

    def authorize_url(self, redirect_uri: str) -> str:
        q = urlencode(
            {"client_id": self.key, "redirect_uri": redirect_uri, "response_type": "code"}
        )
        return f"{AUTHORIZE_URL}?{q}"

    async def exchange(self, code: str, redirect_uri: str) -> AuthUser:
        try:
            async with httpx.AsyncClient(transport=self.transport, timeout=self.timeout) as c:
                tok = await c.post(
                    TOKEN_URL,
                    data={
                        "grant_type": "authorization_code",
                        "client_id": self.key,
                        "client_secret": self.secret,
                        "redirect_uri": redirect_uri,
                        "code": code,
                    },
                )
                if tok.status_code != 200:
                    raise AuthError(f"token http {tok.status_code}")
                access = tok.json()["access_token"]
                me = await c.get(USER_URL, headers={"Authorization": f"Bearer {access}"})
                if me.status_code != 200:
                    raise AuthError(f"user http {me.status_code}")
                body = me.json()
            kakao_id = str(body["id"])
            account = body.get("kakao_account") or {}
            nick = (
                (account.get("profile") or {}).get("nickname")
                or (body.get("properties") or {}).get("nickname")
                or ""
            )
            return AuthUser(id=kakao_id, nickname=nick)
        except AuthError:
            raise
        except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError) as e:
            raise AuthError(type(e).__name__) from e


def kakao_is_real(settings: Settings) -> bool:
    return bool(settings.KAKAO_REST_KEY and settings.KAKAO_CLIENT_SECRET)


def get_kakao_auth(settings: Settings) -> KakaoAuth:
    if kakao_is_real(settings):
        return RealKakaoAuth(settings)
    log.warning("[MOCK] kakao")
    return FakeKakaoAuth()


# ---- 앱 토큰 ----

_random_secret = secrets.token_bytes(32)  # APP_TOKEN_SECRET 이 비면 프로세스마다 새로 만든다


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _key(settings: Settings) -> bytes:
    return settings.APP_TOKEN_SECRET.encode() if settings.APP_TOKEN_SECRET else _random_secret


def issue_token(settings: Settings, user_id: str, now: float | None = None) -> str:
    t = time.time() if now is None else now
    payload = _b64(
        json.dumps(
            {"uid": user_id, "exp": int(t + settings.TOKEN_TTL_DAYS * 86400)},
            separators=(",", ":"),
        ).encode()
    )
    sig = _b64(hmac.new(_key(settings), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def verify_token(settings: Settings, token: str, now: float | None = None) -> str | None:
    """올바르고 만료되지 않은 토큰이면 사용자 id, 아니면 None."""
    try:
        payload, sig = token.split(".", 1)
        want = _b64(hmac.new(_key(settings), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, want):
            return None
        data = json.loads(_unb64(payload))
        if data["exp"] < (time.time() if now is None else now):
            return None
        return str(data["uid"])
    except (ValueError, KeyError, TypeError):
        return None


# ---- 내 정보 저장소 (MVP 스텁: 프로세스 메모리) ----

_profiles: dict[str, dict] = {}


def get_profile(user_id: str) -> dict | None:
    return _profiles.get(user_id)


def put_profile(user_id: str, data: dict) -> None:
    _profiles[user_id] = data
