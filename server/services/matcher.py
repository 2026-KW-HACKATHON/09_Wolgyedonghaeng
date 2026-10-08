"""자격 필터 (spec 5.3). 자격은 이 규칙이 정하고, 추천기는 남은 후보 안에서만 고른다.

조건마다 pass | unknown | fail 을 낸다.
fail 이 하나라도 있으면 제외, unknown 이 있으면 maybe, 모두 pass 면 likely.
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

from schemas import (
    Address,
    Building,
    CheckupItem,
    ExcludedItem,
    Household,
    ProblemType,
    Program,
    Trait,
)
from schemas.program import Variant

KST = ZoneInfo("Asia/Seoul")
State = Literal["pass", "unknown", "fail"]

# 소득 구간 범위 (하한 초과, 상한 이하). 기준 중위소득 %.
INCOME_RANGES: dict[str, tuple[float, float]] = {
    "le48": (0, 48),
    "48_60": (48, 60),
    "60_100": (60, 100),
    "gt100": (100, float("inf")),
}
LOW_RISE_PURPOSES = ("단독", "다가구", "다세대", "연립", "다중")
INCOME_NOTE = "재산을 포함한 소득 기준"
TRAIT_FAIL_TEXT: dict[str, str] = {
    "disabled": "장애인으로 등록된 가구만 신청할 수 있어요",
    "elderly65": "만 65세 이상 어르신이 있는 가구만 신청할 수 있어요",
    "welfare": "기초수급·차상위 가구만 신청할 수 있어요",
}
TRAIT_ASK_TEXT: dict[str, str] = {
    "disabled": "장애인 등록 여부",
    "elderly65": "만 65세 이상 어르신이 있는지",
    "welfare": "기초수급·차상위 여부",
}


@dataclass(frozen=True)
class Check:
    state: State
    why: str = ""  # fail일 때 쉬운 말 이유
    ask: str = ""  # unknown일 때 상담에서 확인할 것


PASS = Check("pass")


@dataclass
class Candidate:
    program: Program
    status: Literal["likely", "maybe"]
    problem_match: bool
    to_confirm: list[str]
    variant: Variant | None = None
    amount_short: str = ""
    trait_notes: list[str] = field(default_factory=list)
    age_years: int | None = None  # 연식 조건을 통과했을 때 그 기준 연수 (이유 문장용)


@dataclass
class MatchResult:
    candidates: list[Candidate]
    checkup: list[Candidate]
    excluded: list[ExcludedItem]

    def checkup_items(self) -> list[CheckupItem]:
        return [
            CheckupItem(programId=c.program.id, applyState=c.program.apply.state)
            for c in self.checkup
        ]


# ---------------------------------------------------------------- 개별 조건


def full_years(since: date, today: date) -> int:
    years = today.year - since.year
    if (today.month, today.day) < (since.month, since.day):
        years -= 1
    return years


def _income_pct_text(pct: int) -> str:
    return f"소득이 기준 중위소득 {pct}% 이하인 가구만 신청할 수 있어요"


def check_region(p: Program, address: Address | None) -> Check:
    r = p.region
    if r.sido is None and r.sigungu is None:
        return PASS
    if address is None:
        return Check("unknown", ask="사는 곳이 이 사업의 대상 지역인지")
    if r.sido is not None and address.sidoCd != r.sido:
        return Check("fail", "사는 지역이 이 사업의 대상이 아니에요")
    if r.sigungu is not None and address.sigunguCd != r.sigungu:
        return Check("fail", "사는 지역이 이 사업의 대상이 아니에요")
    return PASS


def check_income(max_pct: int | None, h: Household) -> Check:
    if max_pct is None:
        return PASS
    if h.income == "unknown":
        return Check("unknown", ask=f"소득이 기준 중위소득 {max_pct}% 이하인지")
    lo, hi = INCOME_RANGES[h.income]
    if hi <= max_pct:
        return PASS
    if lo >= max_pct:
        return Check("fail", _income_pct_text(max_pct))
    return Check("unknown", ask=f"소득이 기준 중위소득 {max_pct}% 이하인지")


def check_housing_benefit(h: Household) -> Check:
    """주거급여를 받는 자가 가구는 수선유지급여(C01)로 가야 하므로 다른 집수리 사업에서 뺀다."""
    if h.tenure in ("rent", "public_rent"):
        return PASS
    if h.income in ("48_60", "60_100", "gt100"):
        hb = "no"  # 주거급여는 소득 48% 이하만 묻는다
    else:
        hb = h.housingBenefit or "unknown"
    if hb == "no":
        return PASS
    if hb == "yes" and h.tenure == "own":
        return Check("fail", "주거급여를 받는 내 집은 주거급여 수선유지급여로 신청해요")
    return Check("unknown", ask="주거급여를 받는지 (받는 내 집이면 수선유지급여로 신청해요)")


def check_tenure(allowed: list[str] | None, h: Household) -> Check:
    if not allowed:
        return PASS
    if h.tenure == "unknown":
        return Check("unknown", ask="내 집인지, 전세·월세인지")
    if h.tenure in allowed:
        return PASS
    if h.tenure == "public_rent":
        return Check("fail", "LH·SH 공공임대 주택은 대상이 아니에요")
    if h.tenure == "own":
        return Check("fail", "내 집은 대상이 아니에요 (세입자 대상 사업이에요)")
    return Check("fail", "전세·월세 집은 대상이 아니에요 (집주인 대상 사업이에요)")


def _trait_list(h: Household) -> list[Trait] | None:
    """None = 답 안 함, [] = 해당 없음."""
    if h.traits is None:
        return None
    if h.traits == "none":
        return []
    return list(h.traits)


def check_welfare(h: Household) -> Check:
    traits = _trait_list(h)
    if traits and "welfare" in traits:
        return PASS
    if h.income in ("le48", "48_60", "unknown"):
        return Check("unknown", ask="기초수급·차상위 또는 사각지대 추천 대상인지 확인")
    return Check("fail", "기초수급·차상위 가구(또는 추천받은 가구)만 신청할 수 있어요")


def check_traits_required(required: list[str], h: Household) -> Check:
    traits = _trait_list(h)
    if traits is None:
        return Check("unknown", ask=" · ".join(TRAIT_ASK_TEXT[t] for t in required))
    missing = [t for t in required if t not in traits]
    if not missing:
        return PASS
    return Check("fail", TRAIT_FAIL_TEXT[missing[0]])


def check_traits_any(any_of: list[str], other_ok: bool, h: Household) -> Check:
    traits = _trait_list(h)
    ask = " · ".join(TRAIT_ASK_TEXT[t] for t in any_of)
    if traits is None:
        return Check("unknown", ask=ask)
    if any(t in traits for t in any_of):
        return PASS
    if other_ok:
        return Check("unknown", ask="다자녀·한부모 등 다른 취약 요건이 있는지")
    return Check("fail", "취약가구 요건에 해당하지 않아요")


def check_age(min_years: int, b: Building | None, today: date) -> Check:
    if b is None or b.useAprDay is None:
        return Check("unknown", ask="준공연도")
    if full_years(b.useAprDay, today) >= min_years:
        return PASS
    return Check("fail", f"집을 지은 지 {min_years}년이 안 된 집은 대상이 아니에요")


def check_approved_before(limit: str, b: Building | None) -> Check:
    if b is None or b.useAprDay is None:
        return Check("unknown", ask="준공연도")
    if b.useAprDay < date.fromisoformat(limit):
        return PASS
    return Check("fail", f"{limit[:4]}년 이전에 지은 집만 신청할 수 있어요")


def check_low_rise(b: Building | None) -> Check:
    if b is None or not b.mainPurpose:
        return Check("unknown", ask="집 형태 (단독·다세대·연립 등)")
    if "아파트" in b.mainPurpose:
        return Check("fail", "아파트는 대상이 아니에요")
    if any(k in b.mainPurpose for k in LOW_RISE_PURPOSES):
        return PASS
    return Check("unknown", ask="집 형태 (단독·다세대·연립 등)")


def check_basement(b: Building | None, hint_only: bool) -> Check:
    """건축물대장 지하층 정보. 대장에 지하층이 있으면 pass, 없다고 나오면 힌트일 때는 unknown, 변형 B는 fail."""
    ask = "집에 지하층(반지하)이 있는지"
    if b is None or b.ugrndFlrCnt is None:
        return Check("unknown", ask=ask)
    if b.ugrndFlrCnt > 0:
        return PASS
    if hint_only:
        return Check("unknown", ask=ask)
    return Check("fail", "건축물대장에 지하층(반지하)이 없어요")


def _worst(checks: list[Check]) -> Check:
    for state in ("fail", "unknown"):
        for c in checks:
            if c.state == state:
                return c
    return PASS


def _best(checks: list[tuple[Check, Variant]]) -> tuple[Check, Variant]:
    for state in ("pass", "unknown"):
        for c, v in checks:
            if c.state == state:
                return c, v
    return checks[0]


# ---------------------------------------------------------------- 사업 단위


def _variant_checks(v: Variant, h: Household, b: Building | None, today: date) -> list[Check]:
    checks: list[Check] = []
    if v.incomeMaxPct is not None:
        checks.append(check_income(v.incomeMaxPct, h))
    if v.traitsAny:
        checks.append(check_traits_any(list(v.traitsAny), bool(v.traitsOther), h))
    if v.basement:
        checks.append(check_basement(b, hint_only=False))
    if v.rooftop:
        checks.append(Check("unknown", ask="옥탑방에 살고 있는지"))
    if v.zoneCheck:
        checks.append(Check("unknown", ask="사는 곳이 주택성능개선지원구역인지"))
    if v.buildingAgeMin is not None:
        checks.append(check_age(v.buildingAgeMin, b, today))
    return checks


def evaluate(
    p: Program, h: Household, address: Address | None, b: Building | None, today: date
) -> tuple[State, str, list[str], Variant | None, int | None]:
    """(상태, 제외 이유, 확인 안내 목록, 맞는 유형, 연식 기준 연수)."""
    e = p.eligibility
    checks: list[Check] = [check_region(p, address)]
    checks.append(check_income(e.incomeMaxPct, h))
    if e.excludeHousingBenefitOwner:
        checks.append(check_housing_benefit(h))
    checks.append(check_tenure(e.tenure, h))
    if e.welfare == "required_or_low":
        checks.append(check_welfare(h))
    if e.traitsRequired:
        checks.append(check_traits_required(list(e.traitsRequired), h))
    age_years: int | None = None
    if e.buildingAgeMin is not None:
        c = check_age(e.buildingAgeMin, b, today)
        checks.append(c)
        if c.state == "pass":
            age_years = e.buildingAgeMin
    if e.approvedBefore:
        checks.append(check_approved_before(e.approvedBefore, b))
    if e.lowRiseOnly:
        checks.append(check_low_rise(b))
    if e.basementHint:
        checks.append(check_basement(b, hint_only=True))

    variant: Variant | None = None
    if e.variants:
        per_variant = [(_worst(_variant_checks(v, h, b, today)), v) for v in e.variants]
        best, variant = _best(per_variant)
        checks.append(best)
        if best.state == "pass" and variant.buildingAgeMin is not None:
            age_years = variant.buildingAgeMin

    worst = _worst(checks)
    if worst.state == "fail":
        return "fail", worst.why, [], None, None
    asks = list(dict.fromkeys(c.ask for c in checks if c.state == "unknown" and c.ask))
    return worst.state, "", asks, variant, age_years


def _has_income_condition(p: Program) -> bool:
    e = p.eligibility
    return e.incomeMaxPct is not None or any(v.incomeMaxPct is not None for v in (e.variants or []))


def compose_to_confirm(p: Program, asks: list[str]) -> list[str]:
    items = list(p.toConfirm) + asks
    if _has_income_condition(p) and not any("재산을 포함한" in t for t in items):
        items.append(INCOME_NOTE)
    return list(dict.fromkeys(items))


def _trait_notes(p: Program, h: Household) -> list[str]:
    traits = _trait_list(h) or []
    if not p.traitBonus:
        return []
    return [
        text for t, text in p.traitBonus.items() if t in traits and t in ("elderly65", "disabled")
    ]


def match(
    programs: list[Program],
    household: Household,
    address: Address | None = None,
    building: Building | None = None,
    problem_type: ProblemType | None = None,
    today: date | None = None,
) -> MatchResult:
    today = today or datetime.now(KST).date()
    candidates: list[Candidate] = []
    checkup: list[Candidate] = []
    excluded: list[ExcludedItem] = []

    for p in programs:
        if p.group == "reference":
            continue
        if p.group == "checkup":
            # 먼저 점검받기: 지역과 집 형태(소유)만 본다
            c = _worst([check_region(p, address), check_tenure(p.eligibility.tenure, household)])
            if c.state == "fail":
                excluded.append(ExcludedItem(programId=p.id, why=c.why))
                continue
            checkup.append(
                Candidate(
                    program=p,
                    status="likely" if c.state == "pass" else "maybe",
                    problem_match=problem_type in p.problemTypes,
                    to_confirm=list(p.toConfirm),
                    amount_short=p.amount.short,
                )
            )
            continue

        state, why, asks, variant, age_years = evaluate(p, household, address, building, today)
        if state == "fail":
            excluded.append(ExcludedItem(programId=p.id, why=why))
            continue
        candidates.append(
            Candidate(
                program=p,
                status="likely" if state == "pass" else "maybe",
                problem_match=problem_type is not None and problem_type in p.problemTypes,
                to_confirm=compose_to_confirm(p, asks),
                variant=variant,
                amount_short=variant.amountShort if variant else p.amount.short,
                trait_notes=_trait_notes(p, household),
                age_years=age_years,
            )
        )
    return MatchResult(candidates=candidates, checkup=checkup, excluded=excluded)
