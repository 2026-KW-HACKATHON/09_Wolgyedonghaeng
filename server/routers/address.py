from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from schemas import Address, ErrorBody, ErrorResponse
from services.address import get_address_service
from settings import get_settings

router = APIRouter(prefix="/address", tags=["address"])


@router.get(
    "/reverse", response_model=Address, responses={404: {"model": ErrorResponse}}
)
async def reverse(lat: float = Query(ge=-90, le=90), lng: float = Query(ge=-180, le=180)):
    result = await get_address_service(get_settings()).reverse(lat, lng)
    if result is None:
        body = ErrorResponse(
            error=ErrorBody(
                code="address_not_found", message="주소를 찾지 못했어요. 직접 입력해 주세요."
            )
        )
        return JSONResponse(status_code=404, content=body.model_dump())
    return result


@router.get("/search", response_model=list[Address])
async def search(q: str = Query(min_length=1, max_length=100)) -> list[Address]:
    return (await get_address_service(get_settings()).search(q))[:10]
