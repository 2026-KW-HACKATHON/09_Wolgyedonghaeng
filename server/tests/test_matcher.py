"""matcher 표 테스트. 사례는 eval/matcher_cases.yaml."""

from datetime import date
from pathlib import Path

import pytest
import yaml

from schemas import Address, Building, Household
from services.matcher import _variant_checks, check_age, check_basement, match
from services.programs import get_programs

CASES_PATH = Path(__file__).resolve().parents[1] / "eval" / "matcher_cases.yaml"
SPEC = yaml.safe_load(CASES_PATH.read_text(encoding="utf-8"))
TODAY = date.fromisoformat(SPEC["today"])
PROGRAMS = get_programs().programs


def _merge(defaults: dict | None, override):
    if override is None:
        return None
    return {**(defaults or {}), **override}


def run_case(case: dict):
    d = SPEC["defaults"]
    h = Household(**_merge(d["household"], case.get("household", {})))
    addr = case.get("address", {})
    addr = None if addr is None else Address(**_merge(d["address"], addr))
    bld = case.get("building", {})
    if bld is not None:
        bld = _merge(d["building"], bld)
        if bld.get("useAprDay"):
            bld["useAprDay"] = date.fromisoformat(str(bld["useAprDay"]))
        bld = Building(**bld)
    return match(PROGRAMS, h, addr, bld, today=TODAY)


@pytest.mark.parametrize("case", SPEC["cases"], ids=[c["name"] for c in SPEC["cases"]])
def test_case(case):
    r = run_case(case)
    cands = {c.program.id: c for c in r.candidates}
    excl = {e.programId: e.why for e in r.excluded}

    for pid, want in (case.get("expect") or {}).items():
        if want == "fail":
            assert pid in excl, (
                f"{pid}: 제외돼야 해요 (후보에 있음: {cands.get(pid) and cands[pid].status})"
            )
            assert pid not in cands
        else:
            assert pid in cands, f"{pid}: 후보여야 해요 (제외 이유: {excl.get(pid)})"
            assert cands[pid].status == want, pid
    for pid, text in (case.get("why") or {}).items():
        assert text in excl[pid], f"{pid} 이유: {excl[pid]}"
    for pid, texts in (case.get("confirm") or {}).items():
        joined = " | ".join(cands[pid].to_confirm)
        for t in texts:
            assert t in joined, f"{pid} toConfirm: {joined}"
    for pid, notes in (case.get("trait_notes") or {}).items():
        assert cands[pid].trait_notes == notes
    for pid, vid in (case.get("variant") or {}).items():
        assert cands[pid].variant.id == vid
    for pid, short in (case.get("amount_short") or {}).items():
        assert cands[pid].amount_short == short
    if "checkup" in case:
        assert [c.program.id for c in r.checkup] == case["checkup"]


def test_group_rules():
    r = run_case({})
    all_ids = {c.program.id for c in r.candidates} | {e.programId for e in r.excluded}
    # reference(N03, N04) 는 어디에도 나오지 않고, checkup(N02) 은 후보 목록에 섞이지 않는다
    assert not {"N03", "N04", "N02"} & all_ids
    assert [c.program.id for c in r.checkup] == ["N02"]


def test_closed_programs_stay_in_results():
    r = run_case({"household": {"housingBenefit": "no"}})
    states = {c.program.id: c.program.apply.state for c in r.candidates}
    assert states["S01"] == "closed_next"
    assert states["S04"] == "closed_next"
    assert "S01" in {c.program.id for c in r.candidates}


def test_problem_match_is_not_an_exclusion():
    h = Household(size=1, income="le48", housingBenefit="no", tenure="own", traits="none")
    r = match(PROGRAMS, h, None, None, problem_type="mold", today=TODAY)
    by_id = {c.program.id: c for c in r.candidates}
    assert by_id["S01"].problem_match is True
    assert (
        by_id["C03"].problem_match is False
    )  # 곰팡이는 C03 유형이 아니지만 후보에서 빠지지 않는다
    r2 = match(PROGRAMS, h, None, None, problem_type=None, today=TODAY)
    assert not any(c.problem_match for c in r2.candidates)


def test_to_confirm_composition():
    r = run_case({"household": {"income": "unknown", "housingBenefit": None}})
    s01 = next(c for c in r.candidates if c.program.id == "S01")
    assert s01.to_confirm[0] == PROGRAMS_BY_ID("S01").toConfirm[0]
    assert "재산을 포함한 소득 기준" in s01.to_confirm
    assert len(s01.to_confirm) == len(set(s01.to_confirm))
    # 소득 조건이 없는 사업에는 붙이지 않는다
    s03 = next(c for c in r.candidates if c.program.id == "S03")
    assert "재산을 포함한 소득 기준" not in s03.to_confirm


def PROGRAMS_BY_ID(pid):
    return next(p for p in PROGRAMS if p.id == pid)


def test_variant_d_zone_check_needs_20_years():
    d = next(v for v in PROGRAMS_BY_ID("S02").eligibility.variants if v.id == "D")
    h = Household(size=1, income="gt100", tenure="own", traits="none")
    old = Building(useAprDay=date(2000, 1, 1), fetchedOk=True)
    young = Building(useAprDay=date(2010, 1, 1), fetchedOk=True)
    assert {c.state for c in _variant_checks(d, h, old, TODAY)} == {"unknown", "pass"}
    assert "fail" in {c.state for c in _variant_checks(d, h, young, TODAY)}


def test_helpers():
    assert check_age(10, None, TODAY).state == "unknown"
    assert check_basement(None, hint_only=True).state == "unknown"
