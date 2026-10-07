"""가구·주소·건물 (spec 3.3)."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .codes import IncomeBand, Tenure, Trait, YesNoUnknown


class Household(BaseModel):
    model_config = ConfigDict(extra="forbid")

    size: int = Field(ge=1, le=20)
    income: IncomeBand
    # income != le48 이면 None
    housingBenefit: YesNoUnknown | None = None
    tenure: Tenure
    # None = 답 안 함, "none" = 해당 없음
    traits: list[Trait] | Literal["none"] | None = None


class Address(BaseModel):
    model_config = ConfigDict(extra="forbid")

    road: str = Field(min_length=1)
    jibun: str | None = None
    sidoCd: str = Field(pattern=r"^\d{2}$")
    sigunguCd: str = Field(pattern=r"^\d{5}$")
    bjdongCd: str = Field(pattern=r"^\d{5}$")
    platGbCd: Literal["0", "1"]  # 0 대지, 1 산
    bun: str = Field(pattern=r"^\d{4}$")
    ji: str = Field(pattern=r"^\d{4}$")


class Building(BaseModel):
    model_config = ConfigDict(extra="forbid")

    useAprDay: date | None = None
    mainPurpose: str | None = None
    grndFlrCnt: int | None = Field(default=None, ge=0)
    ugrndFlrCnt: int | None = Field(default=None, ge=0)
    fetchedOk: bool
