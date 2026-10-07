from fastapi import APIRouter, Query

from schemas import Building
from services.building import get_building_service
from settings import get_settings

router = APIRouter(tags=["building"])


@router.get("/building", response_model=Building)
async def read_building(
    sigunguCd: str = Query(pattern=r"^\d{5}$"),
    bjdongCd: str = Query(pattern=r"^\d{5}$"),
    platGbCd: str = Query(pattern=r"^[01]$"),
    bun: str = Query(pattern=r"^\d{4}$"),
    ji: str = Query(pattern=r"^\d{4}$"),
) -> Building:
    return await get_building_service(get_settings()).get(sigunguCd, bjdongCd, platGbCd, bun, ji)
