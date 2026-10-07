"""녹화 응답(httpx.MockTransport)으로 외부 연동을 시험한다. 실제 네트워크는 쓰지 않는다."""

import asyncio
import json
from datetime import date

import httpx
import pytest

import services.analyze as analyze_mod
from schemas import Household
from services.address import RealAddressService, get_address_service
from services.analyze import AnalyzeInput, analyze
from services.building import RealBuildingService, get_building_service
from services.classifier import FakeClassifier, OpenRouterClassifier, get_classifier
from services.classifier.openrouter import ClassifyError, classifier_prompt_hash
from services.matcher import match
from services.programs import get_programs
from services.ranker.base import RankContext
from services.ranker.factory import get_llm_ranker
from services.ranker.llm import LLMRanker, ranker_prompt_hash
from settings import Settings
from version import build_version

SETTINGS = Settings(
    _env_file=None,
    OPENROUTER_API_KEY="k",
    OPENROUTER_VISION_MODEL="vision-x",
    OPENROUTER_TEXT_MODEL="text-x",
    KAKAO_REST_KEY="kk",
    JUSO_API_KEY="jk",
    BLDG_API_KEY="bk",
    RANK_TIMEOUT=2.0,
)


def run(coro):
    return asyncio.run(coro)


def llm_reply(content) -> httpx.Response:
    text = content if isinstance(content, str) else json.dumps(content, ensure_ascii=False)
    return httpx.Response(200, json={"choices": [{"message": {"content": text}}]})


def transport(*replies, seen: list | None = None) -> httpx.MockTransport:
    queue = list(replies)

    def handler(request: httpx.Request) -> httpx.Response:
        if seen is not None:
            seen.append(request)
        r = queue.pop(0) if len(queue) > 1 else queue[0]
        if isinstance(r, Exception):
            raise r
        return r

    return httpx.MockTransport(handler)


# ---------------------------------------------------------------- 분류기


GOOD_CLASSIFY = {"type": "mold", "confidence": 0.9, "description": "벽에 곰팡이가 피었어요"}


def test_classifier_request_and_result():
    seen: list[httpx.Request] = []
    c = OpenRouterClassifier(SETTINGS, transport(llm_reply(GOOD_CLASSIFY), seen=seen))
    r = run(c.classify([b"\xff\xd8photo"]))
    assert (r.type, r.confidence, r.source) == ("mold", 0.9, "openrouter")
    req = seen[0]
    body = json.loads(req.content)
    assert req.headers["Authorization"] == "Bearer k"
    assert body["model"] == "vision-x"
    fmt = body["response_format"]["json_schema"]
    assert fmt["strict"] is True
    assert len(fmt["schema"]["properties"]["type"]["enum"]) == 8
    image = body["messages"][1]["content"][1]["image_url"]["url"]
    assert image.startswith("data:image/jpeg;base64,")
    assert "물이 새거나 젖은 자국이 있어요" in body["messages"][0]["content"]


def test_classifier_retries_once_on_bad_json():
    seen: list[httpx.Request] = []
    t = transport(llm_reply("not json"), llm_reply(GOOD_CLASSIFY), seen=seen)
    r = run(OpenRouterClassifier(SETTINGS, t).classify([b"x"]))
    assert r.type == "mold" and len(seen) == 2


@pytest.mark.parametrize(
    "bad",
    [
        {"type": "roof", "confidence": 0.5, "description": "x"},
        {"type": "leak", "confidence": 1.7, "description": "x"},
        "깨진 {",
    ],
)
def test_classifier_schema_violation_fails_after_retry(bad):
    seen: list[httpx.Request] = []
    c = OpenRouterClassifier(SETTINGS, transport(llm_reply(bad), seen=seen))
    with pytest.raises(ClassifyError):
        run(c.classify([b"x"]))
    assert len(seen) == 2


def test_classifier_http_error_and_timeout_no_retry():
    seen: list[httpx.Request] = []
    c = OpenRouterClassifier(SETTINGS, transport(httpx.Response(401), seen=seen))
    with pytest.raises(ClassifyError):
        run(c.classify([b"x"]))
    assert len(seen) == 1
    c = OpenRouterClassifier(SETTINGS, transport(httpx.ReadTimeout("slow")))
    with pytest.raises(ClassifyError):
        run(c.classify([b"x"]))


def test_get_classifier_selection(caplog):
    assert isinstance(get_classifier(SETTINGS), OpenRouterClassifier)
    no_key = Settings(_env_file=None)
    assert isinstance(get_classifier(no_key), FakeClassifier)
    no_model = Settings(_env_file=None, OPENROUTER_API_KEY="k")
    with caplog.at_level("WARNING", logger="jipgyeol"):
        assert isinstance(get_classifier(no_model), FakeClassifier)
    assert "[MOCK] openrouter(model 미설정)" in caplog.text


def test_version_reflects_actual_parts():
    v = build_version(SETTINGS, "openrouter", "llm")
    assert v.classifier.model == "vision-x" and v.classifier.promptHash == classifier_prompt_hash()
    assert v.ranker.model == "text-x" and v.ranker.promptHash == ranker_prompt_hash()
    assert len(v.classifier.promptHash) == 12
    v = build_version(SETTINGS, "fake", "rules")
    assert v.classifier.model is None and v.ranker.provider == "rules" and v.ranker.model is None


# ---------------------------------------------------------------- 랭커


def _ctx(problem="leak"):
    h = Household(size=1, income="le48", housingBenefit="no", tenure="own", traits="none")
    r = match(get_programs().programs, h, None, None, problem_type=problem, today=date(2026, 10, 7))
    return RankContext(problem_type=problem, description="천장에서 물이 새요", household=h), (
        r.candidates
    )


def _good_reply(cands, n=2):
    return {
        "recommendations": [
            {
                "programId": c.program.id,
                "rank": i,
                "reason": "집 수리를 받을 수도 있어요",
            }
            for i, c in enumerate(cands[:n], 1)
        ]
    }


def test_llm_ranker_ok_and_request_shape():
    ctx, cands = _ctx()
    seen: list[httpx.Request] = []
    r = LLMRanker(SETTINGS, transport(llm_reply(_good_reply(cands)), seen=seen))
    recs = run(r.rank(ctx, cands))
    assert [x.rank for x in recs] == [1, 2]
    body = json.loads(seen[0].content)
    enum = body["response_format"]["json_schema"]["schema"]["properties"]["recommendations"][
        "items"
    ]["properties"]["programId"]["enum"]
    assert enum == [c.program.id for c in cands]
    assert body["model"] == "text-x"


def test_llm_ranker_uses_candidate_values_not_llm_values():
    ctx, cands = _ctx()
    reply = _good_reply(cands, 1)
    recs = run(LLMRanker(SETTINGS, transport(llm_reply(reply))).rank(ctx, cands))
    assert recs[0].status == cands[0].status
    assert recs[0].applyState == cands[0].program.apply.state


def test_llm_ranker_retries_once_then_succeeds():
    ctx, cands = _ctx()
    seen: list[httpx.Request] = []
    t = transport(llm_reply("깨짐"), llm_reply(_good_reply(cands)), seen=seen)
    recs = run(LLMRanker(SETTINGS, t).rank(ctx, cands))
    assert recs and len(seen) == 2


def _bad_replies(cands):
    unknown = {"recommendations": [{"programId": "C99", "rank": 1, "reason": "받을 수도 있어요"}]}
    invented = _good_reply(cands, 1)
    invented["recommendations"][0]["reason"] = "최대 987654321원까지 받을 수도 있어요"
    banned = _good_reply(cands, 1)
    banned["recommendations"][0]["reason"] = "확실히 받아요"
    too_many = _good_reply(cands, 6)
    return {
        "unknown_id": llm_reply(unknown),
        "invented_amount": llm_reply(invented),
        "banned_word": llm_reply(banned),
        "too_many": llm_reply(too_many),
        "empty": llm_reply({"recommendations": []}),
        "broken_json": llm_reply("{깨진"),
        "http_500": httpx.Response(500),
        "timeout": httpx.ReadTimeout("slow"),
    }


@pytest.mark.parametrize(
    "name",
    ["unknown_id", "invented_amount", "banned_word", "too_many", "empty", "broken_json",
     "http_500", "timeout"],
)  # fmt: skip
def test_bad_llm_response_falls_back_to_rules(name, monkeypatch, tmp_path):
    ctx, cands = _ctx()
    assert len(cands) >= 6 or name != "too_many"
    reply = _bad_replies(cands)[name]
    llm = LLMRanker(SETTINGS, transport(reply))
    monkeypatch.setattr(analyze_mod, "get_llm_ranker", lambda s: llm)
    monkeypatch.setattr(analyze_mod, "write_log", lambda row: None)
    inp = AnalyzeInput([], ctx.household, None, None, "leak")
    res = run(analyze(inp, SETTINGS))
    assert res.rankerUsed == "rules" and res.fallbackUsed is True
    assert res.version.ranker.provider == "rules" and res.version.ranker.model is None
    assert res.recommendations


def test_analyze_uses_llm_when_valid(monkeypatch):
    ctx, cands = _ctx()
    llm = LLMRanker(SETTINGS, transport(llm_reply(_good_reply(cands))))
    monkeypatch.setattr(analyze_mod, "get_llm_ranker", lambda s: llm)
    monkeypatch.setattr(analyze_mod, "write_log", lambda row: None)
    res = run(analyze(AnalyzeInput([], ctx.household, None, None, "leak"), SETTINGS))
    assert res.rankerUsed == "llm" and res.fallbackUsed is False
    assert res.version.ranker.promptHash == ranker_prompt_hash()


def test_get_llm_ranker_selection():
    assert isinstance(get_llm_ranker(SETTINGS), LLMRanker)
    assert get_llm_ranker(Settings(_env_file=None)) is None
    assert get_llm_ranker(Settings(_env_file=None, OPENROUTER_API_KEY="k")) is None  # 모델 없음
    assert get_llm_ranker(SETTINGS.model_copy(update={"RANKER": "rules"})) is None


# ---------------------------------------------------------------- 주소


KAKAO_OK = {
    "documents": [
        {
            "address": {
                "address_name": "서울 노원구 월계동 12-3",
                "main_address_no": "12",
                "sub_address_no": "3",
                "mountain_yn": "N",
            }
        }
    ]
}
JUSO_OK = {
    "results": {
        "common": {"errorCode": "0", "errorMessage": "정상", "totalCount": "2"},
        "juso": [
            {
                "roadAddr": "서울특별시 노원구 월계로45길 99",
                "jibunAddr": "서울특별시 노원구 월계동 99-1",
                "admCd": "1135010100",
                "lnbrMnnm": "99",
                "lnbrSlno": "1",
                "mtYn": "0",
            },
            {
                "roadAddr": "서울특별시 노원구 월계로45길 12",
                "jibunAddr": "서울특별시 노원구 월계동 12-3",
                "admCd": "1135010100",
                "lnbrMnnm": "12",
                "lnbrSlno": "3",
                "mtYn": "0",
            },
        ],
    }
}


def _addr_transport(juso=JUSO_OK, kakao=KAKAO_OK, kakao_status=200, seen=None):
    def handler(request: httpx.Request) -> httpx.Response:
        if seen is not None:
            seen.append(request)
        if request.url.host == "dapi.kakao.com":
            return httpx.Response(kakao_status, json=kakao)
        if isinstance(juso, Exception):
            raise juso
        return httpx.Response(200, json=juso)

    return httpx.MockTransport(handler)


def test_real_reverse():
    seen: list[httpx.Request] = []
    svc = RealAddressService(SETTINGS, _addr_transport(seen=seen))
    a = run(svc.reverse(37.6, 127.06))
    assert a is not None
    assert (a.sidoCd, a.sigunguCd, a.bjdongCd) == ("11", "11350", "10100")
    assert (a.bun, a.ji, a.platGbCd) == ("0012", "0003", "0")
    assert a.road.endswith("월계로45길 12")  # 본번이 같은 항목을 고른다
    kakao = seen[0]
    assert kakao.headers["Authorization"] == "KakaoAK kk"
    assert kakao.url.params["x"] == "127.06" and kakao.url.params["y"] == "37.6"
    assert seen[1].url.params["confmKey"] == "jk"


@pytest.mark.parametrize(
    "kw",
    [
        {"kakao": {"documents": []}},
        {"kakao_status": 401},
        {"juso": {"results": {"common": {"errorCode": "E0005"}, "juso": []}}},
        {"juso": httpx.ConnectTimeout("slow")},
        {"juso": {"results": {"common": {"errorCode": "0"}, "juso": [{"roadAddr": "x"}]}}},
    ],
)
def test_real_reverse_failure_is_none(kw):
    assert run(RealAddressService(SETTINGS, _addr_transport(**kw)).reverse(37.6, 127.06)) is None


def test_real_search():
    svc = RealAddressService(SETTINGS, _addr_transport())
    hits = run(svc.search("월계로"))
    assert len(hits) == 2 and hits[0].bun == "0099" and hits[0].ji == "0001"
    bad = {"results": {"common": {"errorCode": "E0001"}}}
    assert run(RealAddressService(SETTINGS, _addr_transport(juso=bad)).search("x")) == []


def test_mountain_flag():
    juso = json.loads(json.dumps(JUSO_OK))
    juso["results"]["juso"][0]["mtYn"] = "1"
    hits = run(RealAddressService(SETTINGS, _addr_transport(juso=juso)).search("산"))
    assert hits[0].platGbCd == "1"


def test_address_service_selection():
    none = Settings(_env_file=None)
    assert run(get_address_service(none).reverse(1, 1)).bun == "0012"  # 가짜
    juso_only = Settings(_env_file=None, JUSO_API_KEY="j")
    svc = get_address_service(juso_only)
    assert svc.real.juso_key == "j"  # type: ignore[attr-defined]


# ---------------------------------------------------------------- 건물


def _bldg(items, status=200):
    return httpx.MockTransport(
        lambda r: httpx.Response(
            status, json={"response": {"header": {"resultCode": "00"}, "body": {"items": items}}}
        )
    )


def test_building_picks_largest_total_area():
    items = {
        "item": [
            {"totArea": "30.5", "useAprDay": "20100101", "mainPurpsCdNm": "창고"},
            {
                "totArea": "120.4",
                "useAprDay": "19850315",
                "mainPurpsCdNm": "단독주택",
                "grndFlrCnt": 2,
                "ugrndFlrCnt": 0,
            },
        ]
    }
    b = run(RealBuildingService(SETTINGS, _bldg(items)).get("11350", "10100", "0", "0012", "0003"))
    assert b.fetchedOk and b.useAprDay == date(1985, 3, 15)
    assert (b.mainPurpose, b.grndFlrCnt, b.ugrndFlrCnt) == ("단독주택", 2, 0)


def test_building_single_item_object_and_request_params():
    seen: list[httpx.Request] = []

    def handler(r):
        seen.append(r)
        return httpx.Response(
            200,
            json={
                "response": {"body": {"items": {"item": {"totArea": 1, "useAprDay": "19700101"}}}}
            },
        )

    svc = RealBuildingService(SETTINGS, httpx.MockTransport(handler))
    b = run(svc.get("11350", "10100", "0", "0012", "0003"))
    assert b.fetchedOk and b.useAprDay == date(1970, 1, 1)
    q = seen[0].url.params
    assert q["serviceKey"] == "bk" and q["_type"] == "json" and q["bun"] == "0012"


@pytest.mark.parametrize("items", ["", {}, {"item": []}])
def test_building_empty_is_not_ok(items):
    svc = RealBuildingService(SETTINGS, _bldg(items))
    assert run(svc.get("11350", "10100", "0", "0012", "0003")).fetchedOk is False


def test_building_failures_are_not_errors():
    for t in (
        _bldg({}, status=500),
        httpx.MockTransport(lambda r: httpx.Response(200, text="<xml/>")),
        httpx.MockTransport(lambda r: (_ for _ in ()).throw(httpx.ReadTimeout("slow"))),
    ):
        b = run(RealBuildingService(SETTINGS, t).get("11350", "10100", "0", "0012", "0003"))
        assert b.fetchedOk is False


def test_building_service_selection():
    assert isinstance(get_building_service(SETTINGS), RealBuildingService)
    assert not isinstance(get_building_service(Settings(_env_file=None)), RealBuildingService)
