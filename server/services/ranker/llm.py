"""LLM 추천기 (spec 5.4). 후보 안에서만 고르고 이유 문장만 쓴다. 자격 판정은 하지 않는다."""

import json
import logging
import time
from typing import Any

import httpx

from schemas import Recommendation
from services.matcher import Candidate
from services.openrouter import OpenRouterError, chat_json, prompt_hash
from services.ranker.base import RankContext, build_recommendation
from services.ranker.rules import problem_labels
from services.validator import check
from settings import Settings

log = logging.getLogger("jipgyeol")

SYSTEM_PROMPT = (
    "집수리 지원사업 후보 중에서 이 가구에 먼저 안내할 사업을 골라 순서를 정해요.\n"
    "규칙:\n"
    "- 후보 목록에 있는 id 만 써요. 목록에 없는 사업은 만들지 않아요.\n"
    "- problemMatch 가 true 인 사업을 먼저 고려해요.\n"
    "- reason 은 쉬운 말 한 문장, 30자 안팎이에요.\n"
    '- 말투는 "받을 수 있을 수도 있어요" 처럼 단정하지 않아요. '
    '"해당돼요", "확실히", "무조건"은 쓰지 않아요.\n'
    "- 금액, 날짜, 기간, 전화번호는 reason 에 쓰지 않아요. 후보 목록에 없는 숫자를 만들지 않아요.\n"
    "- rank 는 1부터 시작하고 겹치지 않아요."
)


def _schema(ids: list[str], max_items: int) -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "recommendations": {
                "type": "array",
                "maxItems": max_items,
                "items": {
                    "type": "object",
                    "properties": {
                        "programId": {"type": "string", "enum": ids},
                        "rank": {"type": "integer"},
                        "reason": {"type": "string"},
                    },
                    "required": ["programId", "rank", "reason"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["recommendations"],
        "additionalProperties": False,
    }


def ranker_prompt_hash() -> str:
    return prompt_hash(SYSTEM_PROMPT, _schema(["ID"], 0))


def _household_summary(ctx: RankContext) -> dict[str, Any]:
    h = ctx.household
    out: dict[str, Any] = {
        "가구원 수": h.size,
        "소득 구간": h.income,
        "주거 형태": h.tenure,
        "특성": h.traits if isinstance(h.traits, list) else [],
    }
    b = ctx.building
    if b and b.useAprDay:
        out["집 지은 해"] = b.useAprDay.year
    return out


def _candidate_view(c: Candidate) -> dict[str, Any]:
    p = c.program
    return {
        "id": p.id,
        "이름": p.name,
        "지원 항목": p.display.supportItemsText,
        "금액": p.amount.short,
        "기간": p.display.periodText,
        "problemMatch": c.problem_match,
    }


class LLMRanker:
    def __init__(
        self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_TEXT_MODEL
        self.timeout = settings.RANK_TIMEOUT
        self.max_tokens = settings.OPENROUTER_MAX_TOKENS
        self.max = settings.RANK_MAX
        self.transport = transport

    async def rank(self, ctx: RankContext, candidates: list[Candidate]) -> list[Recommendation]:
        if not candidates:
            return []
        user = {
            "문제 유형": problem_labels().get(ctx.problem_type, ctx.problem_type),
            "문제 설명": ctx.description,
            "가구": _household_summary(ctx),
            "최대 개수": self.max,
            "후보": [_candidate_view(c) for c in candidates],
        }
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
        ]
        schema = _schema([c.program.id for c in candidates], self.max)
        by_id = {c.program.id: c for c in candidates}
        deadline = time.monotonic() + self.timeout
        last = "unknown"
        for _ in range(2):  # 위반은 1회 재시도
            remain = deadline - time.monotonic()
            if remain <= 0:
                last = "timeout"
                break
            try:
                data = await chat_json(
                    api_key=self.api_key,
                    model=self.model,
                    messages=messages,
                    schema_name="program_ranking",
                    schema=schema,
                    timeout=remain,
                    max_tokens=self.max_tokens,
                    transport=self.transport,
                )
            except OpenRouterError as e:
                last = str(e)
                if last != "bad_response":
                    break
                continue
            items = data.get("recommendations")
            if (
                not isinstance(items, list)
                or not items
                or not all(isinstance(i, dict) for i in items)
            ):
                last = "schema"
                continue
            if any(i.get("programId") not in by_id for i in items):
                last = "unknown_id"
                continue
            try:
                recs = [
                    build_recommendation(by_id[i["programId"]], int(i["rank"]), str(i["reason"]))
                    for i in items
                ]
            except (KeyError, ValueError, TypeError):
                last = "schema"
                continue
            checked = check(recs, candidates, ctx)
            # 이유 문장이 바뀌어야 하는 경우(금지어, 지어낸 숫자)도 위반으로 본다
            if not checked.ok or checked.replaced:
                last = "validator"
                continue
            return checked.recommendations
        log.warning("llm ranker failed: %s", last)
        raise OpenRouterError(last)
