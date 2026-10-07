"""/analyze 응답과 공통 응답 모델 (spec 4.2, 5.6)."""

from pydantic import BaseModel, ConfigDict, Field

from .codes import (
    ApplyState,
    ClassifierSource,
    ProblemType,
    RankerProvider,
    RecommendationStatus,
)


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProviderInfo(_Strict):
    provider: str
    model: str | None = None
    promptHash: str | None = None


class RankerInfo(ProviderInfo):
    provider: RankerProvider  # type: ignore[assignment]


class VersionInfo(_Strict):
    server: str
    rulesHash: str
    programsAsOf: str
    classifier: ProviderInfo
    ranker: RankerInfo
    confirmThreshold: float = Field(ge=0, le=1)


class ClassifyResult(_Strict):
    type: ProblemType
    confidence: float = Field(ge=0, le=1)
    description: str
    source: ClassifierSource
    overridden: bool = False


class Recommendation(_Strict):
    programId: str
    rank: int = Field(ge=1)
    reason: str = Field(min_length=1, max_length=200)
    status: RecommendationStatus
    toConfirm: list[str] = Field(default_factory=list)
    applyState: ApplyState
    variant: str | None = None  # S02처럼 variants가 있는 사업의 유형 id


class CheckupItem(_Strict):
    programId: str
    applyState: ApplyState


class ExcludedItem(_Strict):
    programId: str
    why: str


class AnalyzeResponse(_Strict):
    requestId: str
    classification: ClassifyResult
    needsConfirm: bool
    recommendations: list[Recommendation]
    checkup: list[CheckupItem]
    excluded: list[ExcludedItem]
    rankerUsed: RankerProvider
    fallbackUsed: bool
    version: VersionInfo


class HealthResponse(_Strict):
    ok: bool
    version: VersionInfo
    # 가짜 구현을 쓰는 부품 이름 (예: ["openrouter", "juso"])
    mock: list[str] = Field(default_factory=list)


class ErrorBody(_Strict):
    code: str
    message: str  # 사용자에게 보여 줄 쉬운 문장


class ErrorResponse(_Strict):
    error: ErrorBody


__all__ = [
    "AnalyzeResponse",
    "CheckupItem",
    "ClassifyResult",
    "ErrorBody",
    "ErrorResponse",
    "ExcludedItem",
    "HealthResponse",
    "ProviderInfo",
    "RankerInfo",
    "Recommendation",
    "VersionInfo",
]
