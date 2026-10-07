"""추천 결과 검증 (spec 5.5).

구조가 틀리면(후보 밖 id, 중복, 스키마) ok=False 로 돌려 호출한 쪽이 규칙 추천기로 대체하게 한다.
이유 문장만 틀리면(금지어, 길이, 사업 데이터에 없는 숫자) 그 문장만 템플릿으로 바꾼다.
상태·접수 상태·확인 사항·유형은 항상 후보 값으로 덮어쓴다.
"""

import json
import re
from dataclasses import dataclass, field

from pydantic import ValidationError

from schemas import Recommendation
from services.matcher import Candidate
from services.ranker.base import RankContext
from services.ranker.rules import template_reason
from settings import get_settings

FORBIDDEN_WORDS = ("확실히", "무조건", "해당돼요")
_NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")


@dataclass
class ValidationResult:
    ok: bool
    recommendations: list[Recommendation] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    replaced: list[str] = field(default_factory=list)  # 이유를 템플릿으로 바꾼 programId


def _numbers(text: str) -> set[str]:
    out = set()
    for m in _NUMBER.findall(text):
        n = m.replace(",", "").rstrip(".")
        out.add(n.lstrip("0") or "0")
    return out


def allowed_numbers(c: Candidate) -> set[str]:
    """이 사업의 JSON 값(문장, 금액, 날짜, 연식 기준)에 나오는 숫자."""
    text = json.dumps(c.program.model_dump(mode="json"), ensure_ascii=False)
    return _numbers(text)


def _reason_problem(reason: str, c: Candidate) -> str | None:
    if not reason.strip():
        return "이유가 비어 있어요"
    if len(reason) > get_settings().REASON_MAX_LEN:
        return "이유가 너무 길어요"
    for w in FORBIDDEN_WORDS:
        if w in reason:
            return f"금지어: {w}"
    extra = _numbers(reason) - allowed_numbers(c)
    if extra:
        return f"사업 데이터에 없는 숫자: {sorted(extra)}"
    return None


def check(
    recs: list[Recommendation | dict],
    candidates: list[Candidate],
    ctx: RankContext,
) -> ValidationResult:
    by_id = {c.program.id: c for c in candidates}
    errors: list[str] = []
    parsed: list[Recommendation] = []

    for r in recs:
        try:
            parsed.append(r if isinstance(r, Recommendation) else Recommendation.model_validate(r))
        except ValidationError as e:
            errors.append(f"스키마 위반: {e.error_count()}건")

    if len(parsed) > get_settings().RANK_MAX:
        errors.append("추천 개수가 너무 많아요")
    ids = [r.programId for r in parsed]
    for pid in ids:
        if pid not in by_id:
            errors.append(f"후보 밖 사업: {pid}")
    if len(set(ids)) != len(ids):
        errors.append("같은 사업이 두 번 나왔어요")
    ranks = [r.rank for r in parsed]
    if len(set(ranks)) != len(ranks):
        errors.append("순위가 겹쳐요")
    if errors:
        return ValidationResult(ok=False, errors=errors)

    fixed: list[Recommendation] = []
    replaced: list[str] = []
    for r in sorted(parsed, key=lambda x: x.rank):
        c = by_id[r.programId]
        reason = r.reason
        if _reason_problem(reason, c):
            reason = template_reason(c, ctx)
            replaced.append(r.programId)
        fixed.append(
            r.model_copy(
                update={
                    "reason": reason,
                    "status": c.status,
                    "toConfirm": list(c.to_confirm),
                    "applyState": c.program.apply.state,
                    "variant": c.variant.id if c.variant else None,
                }
            )
        )
    return ValidationResult(ok=True, recommendations=fixed, replaced=replaced)
