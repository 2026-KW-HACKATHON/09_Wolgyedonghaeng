"""추천기 인터페이스 (spec 5.4)."""

from dataclasses import dataclass
from datetime import date
from typing import Protocol

from schemas import Building, Household, ProblemType, Recommendation
from services.matcher import Candidate


@dataclass
class RankContext:
    problem_type: ProblemType
    description: str
    household: Household
    building: Building | None = None
    today: date | None = None


class Ranker(Protocol):
    async def rank(self, ctx: RankContext, candidates: list[Candidate]) -> list[Recommendation]: ...


def build_recommendation(c: Candidate, rank: int, reason: str) -> Recommendation:
    """후보의 확정 값(상태·접수 상태·확인 사항)에 이유 문장만 붙인다."""
    return Recommendation(
        programId=c.program.id,
        rank=rank,
        reason=reason,
        status=c.status,
        toConfirm=list(c.to_confirm),
        applyState=c.program.apply.state,
        variant=c.variant.id if c.variant else None,
    )
