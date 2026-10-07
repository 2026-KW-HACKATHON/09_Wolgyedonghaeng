import logging
from datetime import date
from typing import Protocol

import httpx

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


BLDG_URL = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo"


def _float(v) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _int(v) -> int | None:
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def parse_title_info(data: dict) -> Building:
    """표제부 응답에서 연면적이 가장 큰 건물 하나를 골라 Building 으로 만든다."""
    # 응답 형식은 실제 키로 확인 필요 (response.body.items.item: 객체 또는 배열)
    body = data["response"]["body"]
    items = body.get("items")
    item = items.get("item") if isinstance(items, dict) else None
    if isinstance(item, dict):
        item = [item]
    if not item:
        return Building(fetchedOk=False)
    main = max(item, key=lambda i: _float(i.get("totArea")))
    day = str(main.get("useAprDay") or "")
    use_day = None
    if len(day) == 8 and day.isdigit():
        try:
            use_day = date(int(day[:4]), int(day[4:6]), int(day[6:]))
        except ValueError:
            use_day = None
    return Building(
        useAprDay=use_day,
        mainPurpose=main.get("mainPurpsCdNm") or None,
        grndFlrCnt=_int(main.get("grndFlrCnt")),
        ugrndFlrCnt=_int(main.get("ugrndFlrCnt")),
        fetchedOk=True,
    )


class RealBuildingService:
    """건축HUB 건축물대장 표제부. 실패는 오류가 아니라 fetchedOk=false 로 돌려준다."""

    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        self.key = settings.BLDG_API_KEY
        self.timeout = settings.BUILDING_TIMEOUT
        self.transport = transport

    async def get(
        self, sigunguCd: str, bjdongCd: str, platGbCd: str, bun: str, ji: str
    ) -> Building:
        try:
            async with httpx.AsyncClient(transport=self.transport, timeout=self.timeout) as c:
                resp = await c.get(
                    BLDG_URL,
                    params={
                        "serviceKey": self.key,
                        "sigunguCd": sigunguCd,
                        "bjdongCd": bjdongCd,
                        "platGbCd": platGbCd,
                        "bun": bun,
                        "ji": ji,
                        "_type": "json",
                        "numOfRows": 100,
                        "pageNo": 1,
                    },
                )
            if resp.status_code != 200:
                log.warning("building http %s", resp.status_code)
                return Building(fetchedOk=False)
            return parse_title_info(resp.json())
        except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError) as e:
            log.warning("building failed: %s", type(e).__name__)
            return Building(fetchedOk=False)


def get_building_service(settings: Settings) -> BuildingService:
    if not settings.BLDG_API_KEY:
        log.warning("[MOCK] building")
        return FakeBuildingService()
    return RealBuildingService(settings)
