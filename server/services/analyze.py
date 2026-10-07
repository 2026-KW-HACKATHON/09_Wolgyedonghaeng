"""/analyze 처리 순서 (spec 5.1): 분류 → 자격 필터 → 추천 → 검증 → 로그."""

import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from db.log import write_log
from schemas import (
    Address,
    AnalyzeResponse,
    Building,
    CheckupItem,
    ClassifyResult,
    Household,
    ProblemType,
)
from services.classifier import get_classifier
from services.matcher import match
from services.programs import get_programs
from services.ranker.base import RankContext
from services.ranker.rules import RulesRanker
from services.validator import check
from settings import Settings
from version import build_version

log = logging.getLogger("jipgyeol")


class AnalyzeError(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        self.code, self.message, self.status = code, message, status


@dataclass
class AnalyzeInput:
    images: list[bytes]
    household: Household
    address: Address | None
    building: Building | None
    override_type: ProblemType | None


async def _classify(inp: AnalyzeInput, settings: Settings) -> ClassifyResult:
    if inp.override_type:
        return ClassifyResult(
            type=inp.override_type,
            confidence=1.0,
            description="직접 고른 문제예요",
            source="user",
            overridden=True,
        )
    if not inp.images:
        raise AnalyzeError("images_required", "사진을 한 장 이상 넣어 주세요.")
    try:
        return await asyncio.wait_for(
            get_classifier(settings).classify(inp.images), settings.CLASSIFY_TIMEOUT
        )
    except (TimeoutError, Exception) as e:
        log.warning("classify failed: %s", type(e).__name__)
        raise AnalyzeError("classify_failed", "지금은 사진을 살펴보지 못했어요.", status=502) from e


async def analyze(inp: AnalyzeInput, settings: Settings) -> AnalyzeResponse:
    t0 = time.perf_counter()
    request_id = uuid4().hex
    classification = await _classify(inp, settings)
    t_classify = time.perf_counter()

    result = match(
        get_programs().programs,
        inp.household,
        inp.address,
        inp.building,
        classification.type,
    )
    ctx = RankContext(
        problem_type=classification.type,
        description=classification.description,
        household=inp.household,
        building=inp.building,
    )
    # TODO(T51): RANKER=llm 이고 키가 있으면 LLMRanker, 실패하면 rules로 대체
    ranker_used, fallback_used = "rules", False
    recs = await RulesRanker().rank(ctx, result.candidates)
    checked = check(recs, result.candidates, ctx)
    if not checked.ok:
        log.warning("validator failed: %s", checked.errors)
        fallback_used = True
        checked = check(RulesRanker().rank_sync(ctx, result.candidates), result.candidates, ctx)
    t_rank = time.perf_counter()

    needs_confirm = not classification.overridden and (
        classification.confidence < settings.CONFIRM_THRESHOLD or classification.type == "other"
    )
    response = AnalyzeResponse(
        requestId=request_id,
        classification=classification,
        needsConfirm=needs_confirm,
        recommendations=checked.recommendations,
        checkup=[
            CheckupItem(programId=c.program.id, applyState=c.program.apply.state)
            for c in result.checkup
        ],
        excluded=result.excluded,
        rankerUsed=ranker_used,
        fallbackUsed=fallback_used,
        version=build_version(settings, classification.source, ranker_used),
    )
    t_end = time.perf_counter()
    write_log(
        {
            "requestId": request_id,
            "ts": datetime.now(UTC).isoformat(),
            "classification": {
                "type": classification.type,
                "confidence": classification.confidence,
                "source": classification.source,
                "overridden": classification.overridden,
            },
            "needsConfirm": needs_confirm,
            "candidatesCount": len(result.candidates),
            "excludedCount": len(result.excluded),
            "recommendations": [
                {"id": r.programId, "rank": r.rank} for r in response.recommendations
            ],
            "rankerUsed": ranker_used,
            "fallbackUsed": fallback_used,
            "addressOk": inp.address is not None,
            "buildingOk": bool(inp.building and inp.building.fetchedOk),
            "latencyMs": {
                "classify": round((t_classify - t0) * 1000),
                "rank": round((t_rank - t_classify) * 1000),
                "total": round((t_end - t0) * 1000),
            },
            "version": response.version.model_dump(),
        }
    )
    return response
