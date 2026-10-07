import logging
from datetime import date
from typing import Protocol

from schemas import Building
from settings import Settings

log = logging.getLogger("jipgyeol")


class BuildingService(Protocol):
    async def get(
        self, sigunguCd: str, bjdongCd: str, platGbCd: str, bun: str, ji: str
    ) -> Building: ...


class FakeBuildingService:
    async def get(
        self, sigunguCd: str, bjdongCd: str, platGbCd: str, bun: str, ji: str
    ) -> Building:
        if bun == "9999":  # 실패 흐름 시험용
            return Building(fetchedOk=False)
        return Building(
            useAprDay=date(1985, 1, 1),
            mainPurpose="단독주택",
            grndFlrCnt=2,
            ugrndFlrCnt=0,
            fetchedOk=True,
        )


def get_building_service(settings: Settings) -> BuildingService:
    if not settings.BLDG_API_KEY:
        log.warning("[MOCK] building")
    # TODO(키 반영 후): 건축HUB 실제 구현
    return FakeBuildingService()
