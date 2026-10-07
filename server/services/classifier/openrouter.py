"""OpenRouter 사진 분류기 (spec 5.2). 사진은 메모리에서만 쓰고 저장·로그하지 않는다."""

import base64
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, get_args

import httpx
from pydantic import ValidationError

from schemas import ClassifyResult, ProblemType
from services.openrouter import OpenRouterError, chat_json, prompt_hash
from settings import Settings

PROBLEM_TYPES_PATH = Path(__file__).resolve().parents[3] / "contracts" / "problem-types.json"
TYPE_IDS = list(get_args(ProblemType))

SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "type": {"type": "string", "enum": TYPE_IDS},
        "confidence": {"type": "number", "description": "0 이상 1 이하의 확신도"},
        "description": {"type": "string", "description": "쉬운 말 한 문장으로 사진 속 문제"},
    },
    "required": ["type", "confidence", "description"],
    "additionalProperties": False,
}


class ClassifyError(Exception):
    pass


@lru_cache
def system_prompt() -> str:
    types = json.loads(PROBLEM_TYPES_PATH.read_text(encoding="utf-8"))["types"]
    lines = "\n".join(f"- {t['id']}: {t['criterion']}" for t in types)
    return (
        "집 사진을 보고 어떤 집수리 문제인지 하나로 분류해요.\n"
        "분류 기준:\n"
        f"{lines}\n"
        "확신이 없거나 위에 맞는 것이 없으면 other 로 답해요.\n"
        "description 은 어르신이 읽기 쉬운 말로 한 문장만 써요. 어려운 용어와 단정하는 말은 쓰지 않아요.\n"
        "confidence 는 0 이상 1 이하 숫자예요."
    )


def classifier_prompt_hash() -> str:
    return prompt_hash(system_prompt(), SCHEMA)


class OpenRouterClassifier:
    def __init__(
        self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_VISION_MODEL
        self.timeout = settings.CLASSIFY_TIMEOUT
        self.max_tokens = settings.OPENROUTER_MAX_TOKENS
        self.max_images = settings.MAX_IMAGES
        self.transport = transport

    def _messages(self, images: list[bytes]) -> list[dict[str, Any]]:
        content: list[dict[str, Any]] = [
            {"type": "text", "text": "이 사진의 문제를 분류해 주세요."}
        ]
        for img in images[: self.max_images]:
            b64 = base64.b64encode(img).decode("ascii")
            content.append(
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
            )
        return [
            {"role": "system", "content": system_prompt()},
            {"role": "user", "content": content},
        ]

    async def classify(self, images: list[bytes]) -> ClassifyResult:
        if not images:
            raise ClassifyError("no_images")
        messages = self._messages(images)
        last = "unknown"
        for _ in range(2):  # 파싱·스키마 위반은 1회 재시도
            try:
                data = await chat_json(
                    api_key=self.api_key,
                    model=self.model,
                    messages=messages,
                    schema_name="problem_classification",
                    schema=SCHEMA,
                    timeout=self.timeout,
                    max_tokens=self.max_tokens,
                    transport=self.transport,
                )
                return ClassifyResult.model_validate(
                    {
                        "type": data.get("type"),
                        "confidence": data.get("confidence"),
                        "description": str(data.get("description", "")).strip()
                        or "문제 사진이에요",
                        "source": "openrouter",
                    }
                )
            except ValidationError:
                last = "schema"
            except OpenRouterError as e:
                last = str(e)
                if last != "bad_response":
                    break  # 시간 초과·HTTP 오류는 재시도하지 않는다
        raise ClassifyError(last)
