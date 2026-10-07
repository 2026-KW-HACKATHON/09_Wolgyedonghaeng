"""카카오 로그인과 내 정보 기본값 (spec 4.3)."""

from pydantic import BaseModel, ConfigDict, Field

from .codes import IncomeBand, Tenure, Trait, YesNoUnknown


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AuthUrlResponse(_Strict):
    url: str


class AuthRequest(_Strict):
    code: str = Field(min_length=1)
    redirectUri: str = Field(min_length=1)


class AuthUser(_Strict):
    id: str
    nickname: str


class AuthResponse(_Strict):
    token: str
    user: AuthUser


class ProfileHousehold(_Strict):
    """가구 기본값. 채워진 것만 담는 부분 객체."""

    size: int | None = Field(default=None, ge=1, le=20)
    income: IncomeBand | None = None
    housingBenefit: YesNoUnknown | None = None
    tenure: Tenure | None = None
    traits: list[Trait] | str | None = None


class ProfileAddress(_Strict):
    """주소 기본값. 채워진 것만 담는 부분 객체."""

    road: str | None = None
    jibun: str | None = None
    sidoCd: str | None = Field(default=None, pattern=r"^\d{2}$")
    sigunguCd: str | None = Field(default=None, pattern=r"^\d{5}$")
    bjdongCd: str | None = Field(default=None, pattern=r"^\d{5}$")
    platGbCd: str | None = Field(default=None, pattern=r"^[01]$")
    bun: str | None = Field(default=None, pattern=r"^\d{4}$")
    ji: str | None = Field(default=None, pattern=r"^\d{4}$")


class Profile(_Strict):
    household: ProfileHousehold | None = None
    address: ProfileAddress | None = None


__all__ = [
    "AuthRequest",
    "AuthResponse",
    "AuthUrlResponse",
    "AuthUser",
    "Profile",
    "ProfileAddress",
    "ProfileHousehold",
]
