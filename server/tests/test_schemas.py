import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from schemas import (
    Address,
    AnalyzeResponse,
    ErrorResponse,
    Household,
    ProgramsFile,
)

ROOT = Path(__file__).resolve().parents[2]
EXAMPLES = ROOT / "contracts" / "examples"


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def test_programs_file_validates():
    pf = ProgramsFile.model_validate(_load(ROOT / "server" / "data" / "programs-2026.json"))
    assert len(pf.programs) == 14
    s02 = next(p for p in pf.programs if p.id == "S02")
    assert [v.id for v in s02.eligibility.variants] == ["A", "B", "C", "D"]


@pytest.mark.parametrize("name", ["normal", "confirm", "other", "empty"])
def test_analyze_examples(name):
    AnalyzeResponse.model_validate(_load(EXAMPLES / f"analyze-{name}.json"))


def test_example_semantics():
    confirm = AnalyzeResponse.model_validate(_load(EXAMPLES / "analyze-confirm.json"))
    assert confirm.needsConfirm and confirm.classification.confidence < 0.7
    other = AnalyzeResponse.model_validate(_load(EXAMPLES / "analyze-other.json"))
    assert other.classification.type == "other"
    empty = AnalyzeResponse.model_validate(_load(EXAMPLES / "analyze-empty.json"))
    assert empty.recommendations == []


def test_example_program_ids_exist():
    ids = {p["id"] for p in _load(ROOT / "server" / "data" / "programs-2026.json")["programs"]}
    for f in EXAMPLES.glob("analyze-*.json"):
        d = _load(f)
        refs = [
            r["programId"] for k in ("recommendations", "checkup", "excluded") for r in d.get(k, [])
        ]
        assert set(refs) <= ids


def test_error_example():
    ErrorResponse.model_validate(_load(EXAMPLES / "analyze-error.json"))


def test_rejects_unknown_enum_and_bad_size():
    with pytest.raises(ValidationError):
        Household(size=0, income="le48", tenure="own")
    with pytest.raises(ValidationError):
        Household(size=2, income="rich", tenure="own")
    d = _load(EXAMPLES / "analyze-normal.json")
    d["classification"]["type"] = "roof"
    with pytest.raises(ValidationError):
        AnalyzeResponse.model_validate(d)


def test_rejects_bad_program_data():
    d = _load(ROOT / "server" / "data" / "programs-2026.json")
    d["programs"][0]["kind"] = "gift"
    with pytest.raises(ValidationError):
        ProgramsFile.model_validate(d)


def test_household_traits_and_address():
    assert Household(size=1, income="le48", tenure="own", traits="none").traits == "none"
    with pytest.raises(ValidationError):
        Address(
            road="x",
            sidoCd="11",
            sigunguCd="11350",
            bjdongCd="10100",
            platGbCd="2",
            bun="0012",
            ji="0000",
        )
