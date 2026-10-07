"""규칙 추천기. LLM 없이 점수와 템플릿 이유로 순위를 정한다."""

import json
from functools import lru_cache
from pathlib import Path

from schemas import Recommendation
from services.matcher import Candidate
from services.ranker.base import RankContext, build_recommendation
from settings import get_settings

PROBLEM_TYPES_PATH = Path(__file__).resolve().parents[3] / "contracts" / "problem-types.json"
APPLY_SCORE = {"always": 2, "open": 2, "check": 1, "closed_next": 0}


@lru_cache
def problem_labels() -> dict[str, str]:
    data = json.loads(PROBLEM_TYPES_PATH.read_text(encoding="utf-8"))
    return {t["id"]: t["label"] for t in data["types"]}


def score(c: Candidate) -> int:
    p = c.program
    return (
        (3 if c.problem_match else 0)
        + APPLY_SCORE[p.apply.state]
        + (1 if c.status == "likely" else 0)
        - (1 if p.kind == "loan" else 0)
    )


def sort_candidates(candidates: list[Candidate]) -> list[Candidate]:
    return sorted(candidates, key=lambda c: (-score(c), c.program.priority, c.program.id))


def template_reason(c: Candidate, ctx: RankContext) -> str:
    """단정하지 않는 템플릿 이유. 숫자는 사업 JSON에 있는 연식 기준만 쓴다."""
    parts: list[str] = []
    if c.problem_match:
        label = problem_labels().get(ctx.problem_type, "집수리")
        parts.append(f"{label} 공사를 지원해요")
    else:
        parts.append("내 집 조건에 맞을 수도 있는 지원이에요")
    if c.variant:
        parts.append(f"{c.variant.label} 유형으로 받을 수도 있어요")
    if c.age_years is not None:
        parts.append(f"집을 지은 지 {c.age_years}년이 넘었어요")
    parts.extend(c.trait_notes)
    return ". ".join(parts) + "."


class RulesRanker:
    async def rank(self, ctx: RankContext, candidates: list[Candidate]) -> list[Recommendation]:
        return self.rank_sync(ctx, candidates)

    def rank_sync(self, ctx: RankContext, candidates: list[Candidate]) -> list[Recommendation]:
        top = sort_candidates(candidates)[: get_settings().RANK_MAX]
        return [build_recommendation(c, i, template_reason(c, ctx)) for i, c in enumerate(top, 1)]
