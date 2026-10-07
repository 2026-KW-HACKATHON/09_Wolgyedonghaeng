import logging
from typing import Protocol

import httpx

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


KAKAO_COORD_URL = "https://dapi.kakao.com/v2/local/geo/coord2address.json"
JUSO_URL = "https://business.juso.go.kr/addrlink/addrLinkApi.do"


def _to_address(item: dict) -> Address | None:
    """행안부 juso 항목 하나를 Address 로 바꾼다. 모자란 값이 있으면 None."""
    try:
        adm = str(item["admCd"])
        if len(adm) != 10:
            return None
        return Address(
            road=item["roadAddr"],
            jibun=item.get("jibunAddr") or None,
            sidoCd=adm[:2],
            sigunguCd=adm[:5],
            bjdongCd=adm[5:10],
            platGbCd="1" if str(item.get("mtYn", "0")) == "1" else "0",
            bun=str(int(item["lnbrMnnm"])).zfill(4),
            ji=str(int(item.get("lnbrSlno") or 0)).zfill(4),
        )
    except (KeyError, ValueError, TypeError):
        return None


class RealAddressService:
    """카카오 로컬(좌표 → 지번 주소)과 행안부 도로명주소(검색, 법정동코드·번지)를 쓴다.

    reverse 는 두 키가 모두 있어야 하고, search 는 행안부 키만 있으면 된다.
    실패는 오류로 올리지 않고 None, 빈 목록으로 돌려준다. 주소·좌표는 로그에 남기지 않는다.
    """

    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        self.kakao_key = settings.KAKAO_REST_KEY
        self.juso_key = settings.JUSO_API_KEY
        self.reverse_timeout = settings.REVERSE_TIMEOUT
        self.search_timeout = settings.SEARCH_TIMEOUT
        self.transport = transport

    async def _juso(self, keyword: str, count: int, timeout: float) -> list[dict]:
        # 응답 형식은 실제 키로 확인 필요 (results.common.errorCode, results.juso[])
        async with httpx.AsyncClient(transport=self.transport, timeout=timeout) as client:
            resp = await client.get(
                JUSO_URL,
                params={
                    "confmKey": self.juso_key,
                    "keyword": keyword,
                    "resultType": "json",
                    "currentPage": 1,
                    "countPerPage": count,
                },
            )
        if resp.status_code != 200:
            raise ValueError(f"juso http {resp.status_code}")
        results = resp.json()["results"]
        if str(results["common"]["errorCode"]) != "0":
            raise ValueError(f"juso error {results['common']['errorCode']}")
        return results.get("juso") or []

    async def reverse(self, lat: float, lng: float) -> Address | None:
        if not (self.kakao_key and self.juso_key):
            return None
        try:
            # 응답 형식은 실제 키로 확인 필요 (documents[0].address)
            async with httpx.AsyncClient(
                transport=self.transport, timeout=self.reverse_timeout
            ) as client:
                resp = await client.get(
                    KAKAO_COORD_URL,
                    params={"x": lng, "y": lat},
                    headers={"Authorization": f"KakaoAK {self.kakao_key}"},
                )
            if resp.status_code != 200:
                log.warning("kakao reverse http %s", resp.status_code)
                return None
            docs = resp.json().get("documents") or []
            jibun = (docs[0].get("address") or {}) if docs else {}
            name = jibun.get("address_name")
            if not name:
                return None
            items = await self._juso(name, 5, self.reverse_timeout)
            main_no = str(jibun.get("main_address_no") or "").lstrip("0")
            # 지번 본번이 같은 항목을 먼저 고르고, 없으면 첫 항목
            items.sort(key=lambda i: 0 if main_no and str(i.get("lnbrMnnm")) == main_no else 1)
            for item in items:
                addr = _to_address(item)
                if addr:
                    return addr
            return None
        except (httpx.HTTPError, ValueError, KeyError, TypeError, AttributeError) as e:
            log.warning("reverse failed: %s", type(e).__name__)
            return None

    async def search(self, q: str) -> list[Address]:
        if not self.juso_key:
            return []
        try:
            items = await self._juso(q, 10, self.search_timeout)
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as e:
            log.warning("search failed: %s", type(e).__name__)
            return []
        out = [a for a in (_to_address(i) for i in items) if a]
        return out[:10]


class _Mixed:
    """reverse 는 두 키가 있어야 실제, search 는 행안부 키만 있으면 실제."""

    def __init__(self, real: RealAddressService, fake: FakeAddressService):
        self.real, self.fake = real, fake

    async def reverse(self, lat: float, lng: float) -> Address | None:
        has_both = self.real.kakao_key and self.real.juso_key
        return await (self.real if has_both else self.fake).reverse(lat, lng)

    async def search(self, q: str) -> list[Address]:
        return await (self.real if self.real.juso_key else self.fake).search(q)


def get_address_service(settings: Settings) -> AddressService:
    if not (settings.KAKAO_REST_KEY and settings.JUSO_API_KEY):
        log.warning("[MOCK] address")
    if not (settings.KAKAO_REST_KEY or settings.JUSO_API_KEY):
        return FakeAddressService()
    return _Mixed(RealAddressService(settings), FakeAddressService())
