import logging
from typing import Protocol

from schemas import Address
from settings import Settings

log = logging.getLogger("jipgyeol")


class AddressService(Protocol):
    async def reverse(self, lat: float, lng: float) -> Address | None: ...
    async def search(self, q: str) -> list[Address]: ...


def _addr(road, jibun, sido, sigungu, bjdong, bun, ji) -> Address:
    return Address(
        road=road,
        jibun=jibun,
        sidoCd=sido,
        sigunguCd=sigungu,
        bjdongCd=bjdong,
        platGbCd="0",
        bun=bun,
        ji=ji,
    )


# 월계동 법정동코드 10자리 1135010100 중 뒤 5자리 (확인 필요, 보고 참고)
_WOLGYE = ("11", "11350", "10100")

_SAMPLES: list[Address] = [
    _addr(
        "서울특별시 노원구 월계로 45길 12",
        "서울특별시 노원구 월계동 12-3",
        *_WOLGYE,
        "0012",
        "0003",
    ),
    _addr(
        "서울특별시 노원구 월계로 45길 20",
        "서울특별시 노원구 월계동 25-7",
        *_WOLGYE,
        "0025",
        "0007",
    ),
    _addr(
        "서울특별시 노원구 광운로 21길 8",
        "서울특별시 노원구 월계동 410-2",
        *_WOLGYE,
        "0410",
        "0002",
    ),
    _addr(
        "서울특별시 노원구 월계로 51가길 5",
        "서울특별시 노원구 월계동 88-1",
        *_WOLGYE,
        "0088",
        "0001",
    ),
    # 서울 밖 (지역 밖 흐름 시험)
    _addr(
        "부산광역시 해운대구 해운대해변로 264",
        "부산광역시 해운대구 우동 1411",
        "26",
        "26350",
        "10500",
        "1411",
        "0000",
    ),
    _addr(
        "경기도 수원시 팔달구 효원로 241",
        "경기도 수원시 팔달구 인계동 1111",
        "41",
        "41115",
        "10400",
        "1111",
        "0000",
    ),
]


class FakeAddressService:
    async def reverse(self, lat: float, lng: float) -> Address | None:
        return _SAMPLES[0]

    async def search(self, q: str) -> list[Address]:
        q = q.strip()
        hits = [a for a in _SAMPLES if q in a.road or (a.jibun and q in a.jibun)]
        return hits[:10]


def get_address_service(settings: Settings) -> AddressService:
    if not (settings.KAKAO_REST_KEY and settings.JUSO_API_KEY):
        log.warning("[MOCK] address")
    # TODO(키 반영 후): 카카오·행안부 실제 구현
    return FakeAddressService()
