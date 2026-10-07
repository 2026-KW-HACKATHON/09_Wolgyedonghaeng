import asyncio
from datetime import date
from itertools import pairwise

from schemas import Address, Building, Household
from services.matcher import match
from services.programs import get_programs
from services.ranker.base import RankContext, build_recommendation
from services.ranker.rules import RulesRanker, score
from services.validator import check

TODAY = date(2026, 10, 7)


def _setup(problem="leak", **hh):
    h = Household(
        **{"size": 1, "income": "le48", "housingBenefit": "no", "tenure": "own", "traits": "none"}
        | hh
    )
    addr = Address(
        road="월계로 1", sidoCd="11", sigunguCd="11350", bjdongCd="10900",
        platGbCd="0", bun="0001", ji="0000",
    )  # fmt: skip
    b = Building(
        useAprDay=date(1985, 6, 1),
        mainPurpose="단독주택",
        grndFlrCnt=2,
        ugrndFlrCnt=0,
        fetchedOk=True,
    )
    r = match(get_programs().programs, h, addr, b, problem_type=problem, today=TODAY)
    ctx = RankContext(
        problem_type=problem, description="천장에서 물이 새요", household=h, building=b
    )
    return r.candidates, ctx


def _rank(candidates, ctx):
    return asyncio.run(RulesRanker().rank(ctx, candidates))


def test_rules_ranker_order_and_limit():
    cands, ctx = _setup()
    recs = _rank(cands, ctx)
    assert 1 <= len(recs) <= 5
    assert [r.rank for r in recs] == list(range(1, len(recs) + 1))
    by_id = {c.program.id: c for c in cands}
    scores = [score(by_id[r.programId]) for r in recs]
    assert scores == sorted(scores, reverse=True)
    # 문제 유형이 맞는 사업이 맞지 않는 사업보다 위
    assert by_id[recs[0].programId].problem_match


def test_score_formula():
    cands, _ = _setup()
    by_id = {c.program.id: c for c in cands}
    # C01: 맞음 3 + always 2 + likely 1 = 6
    assert score(by_id["C01"]) == 6
    # C03: 유형 안 맞음(leak) 0 + check 1 + likely 1 - loan 1 = 1
    assert score(by_id["C03"]) == 1


def test_tie_goes_to_smaller_priority():
    cands, ctx = _setup()
    by_id = {c.program.id: c for c in cands}
    recs = _rank(cands, ctx)
    for a, b in pairwise(recs):
        ca, cb = by_id[a.programId], by_id[b.programId]
        if score(ca) == score(cb):
            assert ca.program.priority <= cb.program.priority


def test_reason_is_template_and_hedged():
    cands, ctx = _setup()
    for r in _rank(cands, ctx):
        assert "공사를 지원해요" in r.reason or "맞을 수도" in r.reason
        assert "확실" not in r.reason and "해당돼요" not in r.reason
    c01 = next(r for r in _rank(cands, ctx) if r.programId == "C01")
    assert c01.toConfirm
    cands2, ctx2 = _setup(traits=["elderly65"])
    c01 = next(r for r in _rank(cands2, ctx2) if r.programId == "C01")
    assert "65세 이상 편의시설" in c01.reason


def test_age_phrase():
    cands, ctx = _setup()
    s03 = next(c for c in cands if c.program.id == "S03")
    from services.ranker.rules import template_reason

    assert "집을 지은 지 20년이 넘었어요" in template_reason(s03, ctx)


def test_default_ranker_output_passes_validator():
    cands, ctx = _setup()
    v = check(_rank(cands, ctx), cands, ctx)
    assert v.ok and v.replaced == []


# ---- validator: 막아야 하는 것


def _good(cands, ctx):
    return _rank(cands, ctx)


def test_rejects_id_outside_candidates():
    cands, ctx = _setup()
    recs = _good(cands, ctx)
    bad = recs[0].model_copy(update={"programId": "S06"})  # S06 은 장애 필수라 후보가 아님
    assert "S06" not in {c.program.id for c in cands}
    v = check([bad], cands, ctx)
    assert not v.ok and any("후보 밖" in e for e in v.errors)
    v = check([{"programId": "Z99", "rank": 1, "reason": "x", "status": "likely",
                "toConfirm": [], "applyState": "open"}], cands, ctx)  # fmt: skip
    assert not v.ok


def test_rejects_duplicate_rank_and_id_and_schema():
    cands, ctx = _setup()
    a, b = _good(cands, ctx)[:2]
    assert not check([a, b.model_copy(update={"rank": a.rank})], cands, ctx).ok
    assert not check([a, a.model_copy(update={"rank": 2})], cands, ctx).ok
    assert not check([{"programId": "C01", "rank": 0, "reason": ""}], cands, ctx).ok
    assert not check(_good(cands, ctx) * 2, cands, ctx).ok  # 개수 초과


def test_replaces_invented_amount():
    cands, ctx = _setup()
    r = _good(cands, ctx)[0]
    fake = r.model_copy(update={"reason": "최대 9,999만 원까지 받을 수 있어요"})
    v = check([fake], cands, ctx)
    assert v.ok and v.replaced == [r.programId]
    assert "9,999" not in v.recommendations[0].reason
    assert v.recommendations[0].reason == r.reason


def test_keeps_amount_that_exists_in_json():
    cands, ctx = _setup()
    r = _good(cands, ctx)[0]
    ok = r.model_copy(update={"reason": "최대 1,601만 원까지 보수를 지원해요"})  # C01 금액
    assert r.programId == "C01"
    v = check([ok], cands, ctx)
    assert v.ok and v.replaced == []


def test_replaces_forbidden_words():
    cands, ctx = _setup()
    r = _good(cands, ctx)[0]
    for text in ("확실히 받아요", "무조건 돼요", "대상에 해당돼요"):
        v = check([r.model_copy(update={"reason": text})], cands, ctx)
        assert v.ok and v.replaced == [r.programId], text
        assert v.recommendations[0].reason == r.reason


def test_overlong_reason_is_rejected_by_schema():
    cands, ctx = _setup()
    r = _good(cands, ctx)[0]
    assert not check([{**r.model_dump(), "reason": "가" * 201}], cands, ctx).ok


def test_overwrites_status_and_apply_state():
    cands, ctx = _setup()
    r = _good(cands, ctx)[0]
    forged = r.model_copy(
        update={"status": "maybe", "applyState": "closed_next", "toConfirm": ["가짜"]}
    )
    got = check([forged], cands, ctx).recommendations[0]
    assert (
        got.status == r.status and got.applyState == r.applyState and got.toConfirm == r.toConfirm
    )


def test_build_recommendation_roundtrip():
    cands, _ = _setup()
    rec = build_recommendation(cands[0], 1, "테스트 이유")
    assert rec.programId == cands[0].program.id
