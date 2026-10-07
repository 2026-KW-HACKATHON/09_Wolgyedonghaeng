"""support-programs-2026.xlsx → programs-2026.json

엑셀(기획 담당이 고치는 원본)에서 표시용 원문을 읽고, 이 파일의 STRUCT에 사람이 검토해 적은
규칙용 구조화 필드를 합쳐 앱·서버가 쓰는 JSON을 만든다.

- 엑셀 문구가 바뀌면 이 스크립트만 다시 돌리면 된다 (표시용 필드는 자동 반영).
- 자격 조건이 바뀌면 STRUCT를 사람이 고친다. 규칙을 엑셀 자유 서술에서 자동 추출하지 않는다.

실행: python build_programs.py [xlsx 경로] [출력 json 경로]
"""
import json
import sys
from datetime import date
from pathlib import Path

import openpyxl

HERE = Path(__file__).parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "support-programs-2026.xlsx"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / "programs-2026.json"
AS_OF = "2026-10-06"  # 엑셀 최종 조사일 (서울재정포털 조회일 기준)

SEOUL = {"sido": "11", "sigungu": None}
NOWON = {"sido": "11", "sigungu": "11350"}
NATIONAL = {"sido": None, "sigungu": None}

ALL7 = ["leak", "mold", "window_insulation", "heating", "plumbing", "safety", "electric"]

# 규칙용 구조화 필드 (사람이 엑셀을 읽고 정한 값. 근거는 각 항목의 note)
# eligibility 필드 의미는 spec 3.2 / 5.3 참고
STRUCT = {
    "C01": dict(
        kind="in_kind", group="main", region=NATIONAL,
        problemTypes=["leak", "mold", "window_insulation", "heating", "plumbing", "safety"],
        applyState="always", applyText="언제든 신청할 수 있어요", nextText=None,
        eligibility=dict(incomeMaxPct=48, tenure=["own"]),
        priority=1,
        callPhone={"name": "노원구청 주거복지팀", "phone": "02-2116-3671"},
        toConfirm=["재산을 포함한 소득인정액", "같은 범위를 최근에 고쳤는지(경 3년·중 5년·대 7년)"],
        amountMax=16010000, amountShort="최대 1,601만 원 (보수 범위별, 소득에 따라 본인 부담 0~20%)",
        traitBonus={"elderly65": "65세 이상 편의시설 최대 50만 원 추가", "disabled": "장애인 편의시설 최대 380만 원 추가"},
    ),
    "C02": dict(
        kind="in_kind", group="main", region=NATIONAL,
        problemTypes=["window_insulation", "heating"],
        applyState="check", applyText="난방 지원은 예산이 남아 있으면 신청할 수 있어요. 전화로 확인해 주세요", nextText="냉방(에어컨)은 올해 마감",
        eligibility=dict(welfare="required_or_low", tenure=["own", "rent"], excludeHousingBenefitOwner=True),
        priority=2,
        callPhone={"name": "노원구청 복지정책과", "phone": "02-2116-3664"},
        toConfirm=["기초수급·차상위 또는 사각지대 추천 여부", "최근 2년 안에 지원받았는지", "전세·월세면 집주인 동의서"],
        amountMax=3300000, amountShort="평균 243만 원, 최대 330만 원 (자부담 없음)",
    ),
    "C03": dict(
        kind="loan", group="main", region=NATIONAL,
        problemTypes=["window_insulation", "heating", "electric"],
        applyState="check", applyText="선착순이라 지금 받는지 확인이 필요해요", nextText=None,
        eligibility=dict(tenure=["own"], approvedBefore="2016-01-01"),
        priority=8,
        callPhone=None,
        toConfirm=["주택 가격 12억 원 이하", "공사 시작 전에 신청해야 해요", "등록된 그린리모델링 사업자를 통해서만"],
        amountMax=None, amountShort="공사비 대출 이자 4.5~5.5% 지원 (단독 최대 1억 원 대출)",
    ),
    "S01": dict(
        kind="in_kind", group="main", region=SEOUL,
        problemTypes=ALL7,
        applyState="closed_next", applyText="올해 모집은 끝났어요", nextText="내년 상반기(예년 2월) 모집 예정 — 공고 확인 필요",
        eligibility=dict(incomeMaxPct=60, tenure=["own", "rent"], excludeHousingBenefitOwner=True),
        priority=3,
        callPhone={"name": "서울시 주거복지과", "phone": "02-2133-7985"},
        toConfirm=["2023~2025년에 이 지원을 받았는지", "전세·월세면 남은 계약 12개월 이상 + 집주인 동의서"],
        amountMax=2500000, amountShort="최대 250만 원 (자부담 없음)",
    ),
    "S02": dict(
        kind="grant", group="main", region=SEOUL,
        problemTypes=["leak", "window_insulation", "heating", "plumbing", "safety", "electric"],
        applyState="closed_next", applyText="올해 모집은 끝났어요", nextText="내년 3월 전후 모집 예정 — 공고 확인 필요",
        eligibility=dict(
            tenure=["own"], lowRiseOnly=True,
            variants=[
                dict(id="A", label="취약가구", incomeMaxPct=100, traitsAny=["elderly65", "disabled", "welfare"], traitsOther=True, buildingAgeMin=10,
                     amountShort="공사비 80%, 최대 1,200만 원"),
                dict(id="B", label="반지하", basement=True, buildingAgeMin=10, amountShort="공사비 50%, 최대 600만 원 (취약가구는 80%, 1,200만 원)"),
                dict(id="C", label="옥탑방", rooftop=True, buildingAgeMin=10, amountShort="공사비 50%, 최대 1,200만 원"),
                dict(id="D", label="주택성능개선지원구역", zoneCheck=True, buildingAgeMin=20, amountShort="공사비 50%, 최대 1,200만 원"),
            ],
        ),
        priority=4,
        callPhone=None,
        toConfirm=["공시가격 (단독 6억5천만 원·공동 세대별 6억 원 이하)", "재개발·재건축 정비구역이 아닌지", "자부담 20~50%와 시공 업체 직접 선정"],
        amountMax=12000000, amountShort="공사비 50~80%, 최대 1,200만 원",
    ),
    "S03": dict(
        kind="loan", group="main", region=SEOUL,
        problemTypes=ALL7,
        applyState="check", applyText="올해 접수 기간이 확인되지 않았어요. 전화로 확인해 주세요", nextText=None,
        eligibility=dict(tenure=["own"], lowRiseOnly=True, buildingAgeMin=20),
        priority=7,
        callPhone=None,
        toConfirm=["주택 공시가격 9억 원 이하", "한국주택금융공사 보증", "선정 후 시공 업체와 직접 계약"],
        amountMax=None, amountShort="공사비 80% 이내 연 0.7% 융자 (단독 최대 6천만 원)",
    ),
    "S04": dict(
        kind="grant", group="main", region=SEOUL,
        problemTypes=["window_insulation", "electric"],
        applyState="closed_next", applyText="올해 모집은 끝났어요 (예산 소진)", nextText="내년 2월 전후 모집 예정 — 공고 확인 필요",
        eligibility=dict(tenure=["own", "rent"], buildingAgeMin=15),
        priority=6,
        callPhone={"name": "서울시 저탄소건물지원센터", "phone": "02-2133-1192"},
        toConfirm=["공시가격 3억 원 이하", "창호·조명을 전부 바꿔야 해요", "세입자는 집주인 위임 필요"],
        amountMax=5000000, amountShort="공사비 70~90%, 단독 최대 500만 원",
    ),
    "S06": dict(
        kind="in_kind", group="main", region=SEOUL,
        problemTypes=["safety", "plumbing"],
        applyState="closed_next", applyText="올해 모집은 끝났어요", nextText="매년 2~3월 모집",
        eligibility=dict(incomeMaxPct=65, traitsRequired=["disabled"], tenure=["own", "rent"]),
        priority=5,
        callPhone={"name": "서울시 장애인자립지원과", "phone": "02-2133-7461"},
        toConfirm=["등록 장애인 가구", "중위소득 50% 초과면 자부담 30%", "전세·월세면 집주인 동의서"],
        amountMax=10000000, amountShort="최대 1,000만 원 (평균 약 340만 원)",
    ),
    "N01": dict(
        kind="in_kind", group="main", region=NOWON,
        problemTypes=["leak", "mold", "window_insulation", "plumbing", "electric"],
        applyState="check", applyText="지금 접수하는지 확인이 필요해요", nextText="정부24 안내: 매년 2~9월, 예산 마감 시 종료",
        eligibility=dict(incomeMaxPct=60, tenure=["own", "rent"], excludeHousingBenefitOwner=True),
        priority=2,
        callPhone={"name": "노원구청 복지정책과", "phone": "02-2116-3664"},
        toConfirm=["올해 서울시 희망의 집수리를 받았는지(중복 불가)", "최근 2년 안에 지원받았는지", "전세·월세면 집주인 동의서"],
        amountMax=1000000, amountShort="최대 100만 원 (자부담 없음)",
        dataNote="소득 기준(중위 60%)은 예산 성과계획서에만 있어요",
    ),
    "N02": dict(
        kind="service", group="checkup", region=NOWON,
        problemTypes=["window_insulation", "heating"],
        applyState="closed_next", applyText="올해 신청은 끝났어요", nextText="매년 1~2월 (겨울철)",
        eligibility=dict(tenure=["own", "rent", "public_rent"]),
        priority=9,
        callPhone={"name": "노원구청 복지정책과", "phone": "02-2116-3664"},
        toConfirm=["신축 아파트는 제외"],
        amountMax=0, amountShort="무료 (열화상 진단과 상담, 수리는 포함되지 않아요)",
    ),
    "N03": dict(kind="reference", group="reference", region=NOWON, problemTypes=[], applyState="closed_next",
                applyText="아파트 단지(관리주체)가 신청하는 사업이에요", nextText=None, eligibility={}, priority=99, callPhone=None, toConfirm=[],
                amountMax=None, amountShort="단지당 최대 3,000만 원 (공용부만)"),
    "N04": dict(kind="reference", group="reference", region=NOWON, problemTypes=[], applyState="check",
                applyText="동주민센터 복지 상담으로 연결돼요", nextText=None, eligibility={}, priority=99,
                callPhone={"name": "노원구청 복지정책과", "phone": "02-2116-3664"}, toConfirm=[],
                amountMax=None, amountShort="적치물 제거·청소 (수리 공사 아님)"),
    "N05": dict(
        kind="in_kind", group="main", region=NOWON,
        problemTypes=["leak"],
        applyState="check", applyText="운영 중이라고 알려져 있지만 자세한 내용은 확인이 필요해요", nextText=None,
        eligibility=dict(basementHint=True),
        priority=10,
        callPhone=None,
        toConfirm=["대상·설치 품목·신청 방법 (노원구청 확인)"],
        amountMax=0, amountShort="무료 설치",
        dataNote="근거 자료 URL이 없어요",
    ),
    "N06": dict(
        kind="in_kind", group="main", region=NOWON,
        problemTypes=["safety", "electric"],
        applyState="check", applyText="복지기관마다 모집 시기가 달라요. 확인이 필요해요", nextText="주로 4~8월",
        eligibility=dict(traitsRequired=["elderly65"], tenure=["own", "rent", "public_rent"]),
        priority=6,
        callPhone=None,
        toConfirm=["취약계층 어르신인지", "수행 복지기관 (동주민센터에서 안내)"],
        amountMax=0, amountShort="물품·시공 전액 지원 (자부담 없음)",
        dataNote="수행 기관과 공식 공고가 확인되지 않았어요",
    ),
}

COLS = ["code", "name", "statusText", "incomeText", "buildingAgeText", "regionText", "conditionsText",
        "supportItemsText", "amountText", "operatorText", "howToApplyText", "periodText", "sourcesText", "verificationNotes"]

CONFIDENCE = {  # 엑셀 확인 메모를 보고 정한 데이터 신뢰도
    "C01": "high", "C02": "high", "C03": "mid", "S01": "high", "S02": "high", "S03": "mid", "S04": "mid",
    "S06": "mid", "N01": "mid", "N02": "mid", "N03": "mid", "N04": "low", "N05": "low", "N06": "low",
}


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb.worksheets[0]
    rows = [r for r in ws.iter_rows(min_row=2, values_only=True) if r and r[0]]
    programs = []
    for r in rows:
        raw = dict(zip(COLS, [(c or "").strip() if isinstance(c, str) else c for c in r[: len(COLS)]]))
        code = raw["code"]
        if code not in STRUCT:
            raise SystemExit(f"STRUCT에 {code}가 없어요. 새 사업이면 구조화 필드를 먼저 적어 주세요.")
        s = STRUCT[code]
        programs.append({
            "id": code,
            "name": raw["name"],
            "kind": s["kind"],
            "group": s["group"],
            "region": s["region"],
            "problemTypes": s["problemTypes"],
            "priority": s["priority"],
            "apply": {"state": s["applyState"], "text": s["applyText"], "nextText": s.get("nextText")},
            "eligibility": s["eligibility"],
            "toConfirm": s["toConfirm"],
            "amount": {"max": s.get("amountMax"), "short": s["amountShort"], "detail": raw["amountText"]},
            "traitBonus": s.get("traitBonus"),
            "callPhone": s.get("callPhone"),
            "display": {
                "statusText": raw["statusText"], "incomeText": raw["incomeText"], "buildingAgeText": raw["buildingAgeText"],
                "regionText": raw["regionText"], "conditionsText": raw["conditionsText"], "supportItemsText": raw["supportItemsText"],
                "operatorText": raw["operatorText"], "howToApplyText": raw["howToApplyText"], "periodText": raw["periodText"],
                "sourcesText": raw["sourcesText"],
            },
            "verificationNotes": raw["verificationNotes"],
            "dataNote": s.get("dataNote"),
            "dataConfidence": CONFIDENCE[code],
        })
    missing = set(STRUCT) - {p["id"] for p in programs}
    if missing:
        raise SystemExit(f"엑셀에 없는 STRUCT 항목: {sorted(missing)}")
    out = {
        "schemaVersion": 2,
        "asOf": AS_OF,
        "builtAt": date.today().isoformat(),
        "source": SRC.name,
        "fallbackPhone": {"name": "주소지 동 행정복지센터 (월계1동)", "phone": None},
        "programs": programs,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(programs)}개 사업 → {OUT}")


if __name__ == "__main__":
    main()
