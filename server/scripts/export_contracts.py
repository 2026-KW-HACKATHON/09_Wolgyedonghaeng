"""계약 파일 생성. 실행: cd server && .venv/bin/python scripts/export_contracts.py

실제 앱의 OpenAPI와 사업 데이터 JSON 스키마를 contracts/ 에 쓴다.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server"))

from main import app  # noqa: E402
from schemas import ProgramsFile  # noqa: E402

CONTRACTS = ROOT / "contracts"


def write(name: str, data: dict) -> None:
    (CONTRACTS / name).write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    write("openapi.json", app.openapi())
    write("programs.schema.json", ProgramsFile.model_json_schema())
    print("contracts 생성 완료")
