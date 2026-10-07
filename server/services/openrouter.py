"""OpenRouter 공용 클라이언트. 분류기와 추천기가 함께 쓴다.

키·사진·응답 본문은 로그에 남기지 않는다.
"""

import hashlib
import json
from typing import Any

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class OpenRouterError(Exception):
    """호출 실패 또는 응답이 약속한 모양이 아님. 메시지에는 원인 종류만 담는다."""


def prompt_hash(*parts: Any) -> str:
    """프롬프트와 출력 스키마가 바뀌면 달라지는 짧은 해시 (sha256 앞 12자)."""
    h = hashlib.sha256()
    for p in parts:
        h.update(
            p.encode("utf-8") if isinstance(p, str) else json.dumps(p, sort_keys=True).encode()
        )
    return h.hexdigest()[:12]


async def chat_json(
    *,
    api_key: str,
    model: str,
    messages: list[dict[str, Any]],
    schema_name: str,
    schema: dict[str, Any],
    timeout: float,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict[str, Any]:
    """JSON 스키마를 강제해 한 번 호출하고 파싱한 JSON 객체를 돌려준다."""
    body = {
        "model": model,
        "messages": messages,
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": schema_name, "strict": True, "schema": schema},
        },
        "provider": {"require_parameters": True},
    }
    try:
        async with httpx.AsyncClient(transport=transport, timeout=timeout) as client:
            resp = await client.post(
                OPENROUTER_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json=body,
            )
    except httpx.TimeoutException as e:
        raise OpenRouterError("timeout") from e
    except httpx.HTTPError as e:
        raise OpenRouterError("network") from e
    if resp.status_code != 200:
        raise OpenRouterError(f"http_{resp.status_code}")
    try:
        content = resp.json()["choices"][0]["message"]["content"]
        data = json.loads(content) if isinstance(content, str) else content
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise OpenRouterError("bad_response") from e
    if not isinstance(data, dict):
        raise OpenRouterError("bad_response")
    return data
