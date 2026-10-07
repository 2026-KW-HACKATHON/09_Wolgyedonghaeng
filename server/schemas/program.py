"""지원사업 데이터 (programs-2026.json, schemaVersion 2). spec 3.2."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .codes import (
    ApplyState,
    DataConfidence,
    ProblemType,
    ProgramGroup,
    ProgramKind,
    Tenure,
    Trait,
)


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Region(_Strict):
    sido: str | None = None  # null = 전국
    sigungu: str | None = None  # "11350" = 노원구


class Apply(_Strict):
    state: ApplyState
    text: str
    nextText: str | None = None


class Variant(_Strict):
    id: str
    label: str
    amountShort: str
    incomeMaxPct: int | None = Field(default=None, ge=0)
    traitsAny: list[Trait] | None = None
    traitsOther: bool | None = None
    basement: bool | None = None
    rooftop: bool | None = None
    zoneCheck: bool | None = None
    buildingAgeMin: int | None = Field(default=None, ge=0)


class Eligibility(_Strict):
    incomeMaxPct: int | None = Field(default=None, ge=0)
    tenure: list[Tenure] | None = None
    excludeHousingBenefitOwner: bool | None = None
    welfare: Literal["required_or_low"] | None = None
    traitsRequired: list[Trait] | None = None
    buildingAgeMin: int | None = Field(default=None, ge=0)
    approvedBefore: str | None = None
    lowRiseOnly: bool | None = None
    basementHint: bool | None = None
    variants: list[Variant] | None = None


class Amount(_Strict):
    max: int | None = Field(default=None, ge=0)
    short: str
    detail: str


class CallPhone(_Strict):
    name: str
    phone: str | None = None


class Display(_Strict):
    statusText: str
    incomeText: str
    buildingAgeText: str
    regionText: str
    conditionsText: str
    supportItemsText: str
    operatorText: str
    howToApplyText: str
    periodText: str
    sourcesText: str


class Program(_Strict):
    id: str = Field(pattern=r"^[CSN]\d{2}$")
    name: str
    kind: ProgramKind
    group: ProgramGroup
    region: Region
    problemTypes: list[ProblemType]
    priority: int
    apply: Apply
    eligibility: Eligibility
    toConfirm: list[str]
    amount: Amount
    traitBonus: dict[Trait, str] | None = None
    callPhone: CallPhone | None = None  # null이면 fallbackPhone
    display: Display
    verificationNotes: str
    dataNote: str | None = None
    dataConfidence: DataConfidence


class ProgramsFile(_Strict):
    schemaVersion: Literal[2]
    asOf: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    builtAt: str | None = None
    source: str
    fallbackPhone: CallPhone
    programs: list[Program] = Field(min_length=1)

    @model_validator(mode="after")
    def _unique_ids(self) -> "ProgramsFile":
        ids = [p.id for p in self.programs]
        dup = {i for i in ids if ids.count(i) > 1}
        if dup:
            raise ValueError(f"사업 id가 겹쳐요: {sorted(dup)}")
        return self
