"""지원사업 데이터 로더. 시작 시 Pydantic으로 검증하고, 틀리면 예외를 낸다."""

import json
from functools import lru_cache
from pathlib import Path

from schemas import Program, ProgramsFile

DEFAULT_PATH = Path(__file__).resolve().parents[1] / "data" / "programs-2026.json"


def load_programs(path: Path | str | None = None) -> ProgramsFile:
    """파일을 읽어 검증한다. 읽기·JSON·스키마 오류는 그대로 예외로 올린다."""
    p = Path(path) if path else DEFAULT_PATH
    raw = json.loads(p.read_text(encoding="utf-8"))
    return ProgramsFile.model_validate(raw)


@lru_cache
def get_programs() -> ProgramsFile:
    return load_programs()


def get_program(program_id: str) -> Program | None:
    return next((p for p in get_programs().programs if p.id == program_id), None)
