"""요청 크기 제한과 IP당 분당 요청 제한 (spec 11절). 순수 ASGI 미들웨어라 본문을 미리 읽지 않는다.

- 요청 크기: Content-Length 가 한도를 넘으면 바로 413. 길이를 안 알려 주는 요청은 읽으면서 센다.
- 요청 횟수: IP마다 최근 60초의 요청 시각을 메모리에 둔다 (슬라이딩 윈도우). /health 는 세지 않는다.
- 초과하면 ErrorResponse 모양의 JSON 으로 쉬운 말 안내를 돌려준다.
- 프록시 뒤(Render 등)에서는 TRUST_PROXY=true 로 두면 X-Forwarded-For 의 첫 값을 IP 로 쓴다.
  프록시가 없는데 켜면 누구나 헤더를 바꿔 한도를 피할 수 있으니 기본은 끈다.
- 로그에 IP 를 남기지 않는다.
"""

import json
import time
from collections import deque
from collections.abc import Callable

from schemas import ErrorBody, ErrorResponse

WINDOW_SECONDS = 60.0
EXEMPT_PATHS = frozenset({"/health"})
MAX_TRACKED_IPS = 10_000  # 메모리 보호: 이 수를 넘으면 오래된 IP부터 비운다

TOO_LARGE = ErrorResponse(
    error=ErrorBody(
        code="payload_too_large",
        message="사진이 너무 커서 받지 못했어요. 사진을 줄여서 다시 보내 주세요.",
    )
)
RATE_LIMITED = ErrorResponse(
    error=ErrorBody(
        code="rate_limited",
        message="요청이 너무 많아요. 잠시 뒤에 다시 해 주세요.",
    )
)


class _TooLarge(Exception):
    pass


async def _send_json(send, status: int, body: ErrorResponse, extra: list[tuple[bytes, bytes]]):
    payload = json.dumps(body.model_dump(), ensure_ascii=False).encode()
    headers = [(b"content-type", b"application/json; charset=utf-8"), *extra]
    headers.append((b"content-length", str(len(payload)).encode()))
    await send({"type": "http.response.start", "status": status, "headers": headers})
    await send({"type": "http.response.body", "body": payload})


class RequestLimitMiddleware:
    def __init__(
        self,
        app,
        max_bytes: int,
        per_min: int,
        trust_proxy: bool = False,
        clock: Callable[[], float] = time.monotonic,
    ):
        self.app = app
        self.max_bytes = max_bytes
        self.per_min = per_min
        self.trust_proxy = trust_proxy
        self.clock = clock
        self.hits: dict[str, deque[float]] = {}

    def _client_ip(self, scope) -> str:
        if self.trust_proxy:
            for name, value in scope.get("headers", []):
                if name == b"x-forwarded-for":
                    first = value.decode("latin-1").split(",")[0].strip()
                    if first:
                        return first
        client = scope.get("client")
        return client[0] if client else "unknown"

    def _allow(self, ip: str) -> int | None:
        """허용이면 None, 막히면 다시 해도 되는 때까지 남은 초."""
        if self.per_min <= 0:
            return None
        now = self.clock()
        q = self.hits.get(ip)
        if q is None:
            if len(self.hits) >= MAX_TRACKED_IPS:
                self._sweep(now)
            q = self.hits[ip] = deque()
        while q and now - q[0] >= WINDOW_SECONDS:
            q.popleft()
        if len(q) >= self.per_min:
            return max(1, int(WINDOW_SECONDS - (now - q[0])) + 1)
        q.append(now)
        return None

    def _sweep(self, now: float) -> None:
        for ip in [k for k, q in self.hits.items() if not q or now - q[-1] >= WINDOW_SECONDS]:
            del self.hits[ip]
        while len(self.hits) >= MAX_TRACKED_IPS:  # 그래도 가득 차면 가장 먼저 들어온 것부터
            del self.hits[next(iter(self.hits))]

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if scope["method"] != "OPTIONS" and scope["path"] not in EXEMPT_PATHS:
            wait = self._allow(self._client_ip(scope))
            if wait is not None:
                await _send_json(send, 429, RATE_LIMITED, [(b"retry-after", str(wait).encode())])
                return

        for name, value in scope.get("headers", []):
            if name == b"content-length":
                try:
                    too_big = int(value) > self.max_bytes
                except ValueError:
                    too_big = False
                if too_big:
                    await _send_json(send, 413, TOO_LARGE, [])
                    return

        received = 0

        async def counting_receive():
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise _TooLarge
            return message

        started = False

        async def tracking_send(message):
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, counting_receive, tracking_send)
        except _TooLarge:
            if not started:
                await _send_json(send, 413, TOO_LARGE, [])
