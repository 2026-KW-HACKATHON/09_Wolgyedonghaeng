from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse
from pydantic import TypeAdapter, ValidationError

from schemas import Address, AnalyzeResponse, Building, ErrorBody, ErrorResponse, Household
from schemas.codes import ProblemType
from services.analyze import AnalyzeError, AnalyzeInput, analyze
from settings import get_settings

router = APIRouter(tags=["analyze"])

_PROBLEM_TYPE = TypeAdapter(ProblemType)


def _error(code: str, message: str, status: int = 400) -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code=code, message=message))
    return JSONResponse(status_code=status, content=body.model_dump())


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={400: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
)
async def post_analyze(
    household: Annotated[str, Form()],
    address: Annotated[str | None, Form()] = None,
    building: Annotated[str | None, Form()] = None,
    overrideType: Annotated[str | None, Form()] = None,
    images: Annotated[list[UploadFile] | None, File(alias="images[]")] = None,
):
    settings = get_settings()
    try:
        hh = Household.model_validate_json(household)
        addr = Address.model_validate_json(address) if address and address != "null" else None
        bld = Building.model_validate_json(building) if building and building != "null" else None
        override = _PROBLEM_TYPE.validate_python(overrideType) if overrideType else None
    except ValidationError:
        return _error("bad_request", "입력을 다시 확인해 볼게요.")

    files = images or []
    if len(files) > settings.MAX_IMAGES:
        return _error("too_many_images", f"사진은 {settings.MAX_IMAGES}장까지 넣을 수 있어요.")
    data: list[bytes] = []
    total = 0
    for f in files:
        b = await f.read()
        total += len(b)
        if total > settings.MAX_REQUEST_BYTES:
            return _error("too_large", "사진이 너무 커요. 다시 찍어 주세요.", 413)
        data.append(b)

    try:
        return await analyze(AnalyzeInput(data, hh, addr, bld, override), settings)
    except AnalyzeError as e:
        return _error(e.code, e.message, e.status)
