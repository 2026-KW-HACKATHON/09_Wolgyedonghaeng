import httpx
import pytest

from schemas import Household
from services.address import RealAddressService
from services.building import RealBuildingService
from services.classifier import OpenRouterClassifier, classifier_is_real, mock_parts
from services.matcher import match
from services.programs import get_programs
from services.ranker.base import RankContext
from services.ranker.llm import LLMRanker
from tests.smoke.conftest import SAMPLE_IMAGE, WOLGYE_LAT, WOLGYE_LNG, need

pytestmark = pytest.mark.smoke


def _explain(e: Exception) -> str:
    if isinstance(e, httpx.TimeoutException):
        return "시간 초과: 네트워크 또는 서비스 지연"
    return f"{type(e).__name__}: {e}"


async def test_openrouter_classify(settings):
    need(settings.OPENROUTER_API_KEY, settings.OPENROUTER_VISION_MODEL,
         names="OPENROUTER_API_KEY, OPENROUTER_VISION_MODEL")  # fmt: skip
    assert SAMPLE_IMAGE.exists(), f"샘플 사진이 없어요: {SAMPLE_IMAGE}"
    try:
        r = await OpenRouterClassifier(settings).classify([SAMPLE_IMAGE.read_bytes()])
    except Exception as e:  # noqa: BLE001
        pytest.fail(
            f"분류 호출 실패({e}). http_401=키 오류, http_402=크레딧 부족, "
            "http_404/400=모델 이름 또는 이미지·JSON 스키마 미지원 모델, timeout=지연"
        )
    assert r.source == "openrouter" and 0 <= r.confidence <= 1 and r.description


async def test_openrouter_ranker(settings):
    need(settings.OPENROUTER_API_KEY, settings.OPENROUTER_TEXT_MODEL,
         names="OPENROUTER_API_KEY, OPENROUTER_TEXT_MODEL")  # fmt: skip
    h = Household(size=1, income="le48", housingBenefit="no", tenure="own", traits="none")
    cands = match(get_programs().programs, h, None, None, problem_type="leak").candidates
    ctx = RankContext(problem_type="leak", description="천장에서 물이 새요", household=h)
    try:
        recs = await LLMRanker(settings).rank(ctx, cands)
    except Exception as e:  # noqa: BLE001
        pytest.fail(
            f"추천 호출 실패({e}). http_401=키 오류, http_404/400=모델 이름 또는 "
            "JSON 스키마(strict) 미지원 모델, validator=모델이 후보 밖 id·지어낸 숫자를 냄"
        )
    assert recs and {r.programId for r in recs} <= {c.program.id for c in cands}


async def test_kakao_coord2address_and_juso(settings):
    need(settings.KAKAO_REST_KEY, settings.JUSO_API_KEY, names="KAKAO_REST_KEY, JUSO_API_KEY")
    a = await RealAddressService(settings).reverse(WOLGYE_LAT, WOLGYE_LNG)
    assert a is not None, (
        "좌표 → 주소 실패. 카카오 401=REST 키 오류 또는 '카카오맵' 사용 설정 꺼짐, "
        "행안부 errorCode=승인키 오류·승인 대기·운영 서버 IP/도메인 미등록 "
        "(서버 로그의 'reverse failed', 'kakao reverse http' 줄 확인)"
    )
    assert a.sidoCd == "11" and a.sigunguCd == "11350"  # 서울 노원구


async def test_juso_search(settings):
    need(settings.JUSO_API_KEY, names="JUSO_API_KEY")
    hits = await RealAddressService(settings).search("서울 노원구 월계동")
    assert hits, (
        "주소 검색 결과가 비었어요. 행안부 승인키 오류(E0005)·승인 대기·호출 한도 초과·"
        "개발용 키 기간 만료 가능성 (서버 로그의 'search failed' 확인)"
    )
    assert all(len(a.bjdongCd) == 5 for a in hits)


async def test_building_hub(settings):
    need(settings.BLDG_API_KEY, names="BLDG_API_KEY")
    # 서울 노원구 월계동 일대. 번지가 없으면 fetchedOk=False 일 수 있어 여러 곳을 본다
    for bun, ji in (("0001", "0000"), ("0012", "0003"), ("0025", "0007")):
        b = await RealBuildingService(settings).get("11350", "10100", "0", bun, ji)
        if b.fetchedOk:
            assert b.useAprDay is None or b.useAprDay.year > 1900
            return
    pytest.fail(
        "건축물대장을 못 가져왔어요. 공공데이터포털 '건축HUB 건축물대장정보 서비스' "
        "활용신청 승인 여부, 서비스키(인코딩 전 값) 확인, 일일 호출 한도 확인 "
        "(서버 로그의 'building http' 줄 확인)"
    )


def test_health_has_no_mock(settings):
    need(
        settings.OPENROUTER_API_KEY, settings.OPENROUTER_VISION_MODEL,
        settings.OPENROUTER_TEXT_MODEL, settings.KAKAO_REST_KEY, settings.JUSO_API_KEY,
        settings.BLDG_API_KEY,
        names="모든 키와 모델 이름",
    )  # fmt: skip
    assert classifier_is_real(settings)
    assert mock_parts(settings) == [], f"아직 가짜로 동작하는 부품: {mock_parts(settings)}"
