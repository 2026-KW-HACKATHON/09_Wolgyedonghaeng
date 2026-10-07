"""계약 파일 생성. 실행: cd server && .venv/bin/python scripts/export_contracts.py

스키마 모델만으로 임시 FastAPI 앱을 만들어 openapi.json을 뽑는다 (실제 라우터는 쓰지 않는다).
T14에서 실제 라우터가 생기면 같은 경로·모델이어야 한다.
"""

import json
import sys
from pathlib import Path
from typing import Annotated

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server"))

from fastapi import FastAPI, File, Form, UploadFile

from schemas import (
    Address,
    AnalyzeResponse,
    Building,
    ErrorResponse,
    HealthResponse,
    Program,
    ProgramsFile,
)

CONTRACTS = ROOT / "contracts"


def build_app() -> FastAPI:
    app = FastAPI(title="집결 서버", version="1")
    err = {"model": ErrorResponse, "description": "오류"}

    @app.post("/analyze", response_model=AnalyzeResponse, responses={400: err, 422: err, 500: err})
    def analyze(
        household: Annotated[str, Form(description="Household JSON 문자열")],
        address: Annotated[str, Form(description="Address JSON 문자열")],
        building: Annotated[
            str | None, Form(description="Building JSON 문자열 (null 가능)")
        ] = None,
        images: Annotated[
            list[UploadFile] | None,
            File(alias="images[]", description="JPEG, 긴 변 1024px 이하, 최대 3장"),
        ] = None,
        overrideType: Annotated[str | None, Form(description="S4에서 바꾼 문제 유형")] = None,
    ): ...

    @app.get("/address/reverse", response_model=Address, responses={400: err, 500: err})
    def address_reverse(lat: float, lng: float): ...

    @app.get("/address/search", response_model=list[Address], responses={400: err, 500: err})
    def address_search(q: str): ...

    @app.get("/building", response_model=Building, responses={400: err, 500: err})
    def building_info(sigunguCd: str, bjdongCd: str, platGbCd: str, bun: str, ji: str): ...

    @app.get("/programs", response_model=ProgramsFile)
    def programs(): ...

    @app.get("/programs/{id}", response_model=Program, responses={404: err})
    def program(id: str): ...

    @app.get("/health", response_model=HealthResponse)
    def health(): ...

    return app


def write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    write(CONTRACTS / "openapi.json", build_app().openapi())
    write(CONTRACTS / "programs.schema.json", ProgramsFile.model_json_schema())
    print("wrote", CONTRACTS / "openapi.json", CONTRACTS / "programs.schema.json")


if __name__ == "__main__":
    main()
