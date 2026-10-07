"""공통 코드 (spec 3.1). 앱과 서버가 같은 값을 쓴다."""

from typing import Literal

IncomeBand = Literal["le48", "48_60", "60_100", "gt100", "unknown"]
YesNoUnknown = Literal["yes", "no", "unknown"]
# rent = 민간 전세·월세, public_rent = LH·SH 건설·매입임대
Tenure = Literal["own", "rent", "public_rent", "unknown"]
# welfare = 기초수급·차상위
Trait = Literal["elderly65", "disabled", "welfare"]
ApplyState = Literal["always", "open", "check", "closed_next"]
ProgramGroup = Literal["main", "checkup", "reference"]
ProgramKind = Literal["in_kind", "grant", "loan", "service", "reference"]
ProblemType = Literal[
    "leak",
    "mold",
    "window_insulation",
    "heating",
    "plumbing",
    "safety",
    "electric",
    "other",
]
DataConfidence = Literal["high", "mid", "low"]
RecommendationStatus = Literal["likely", "maybe"]
RankerProvider = Literal["llm", "rules"]
ClassifierSource = Literal["fake", "openrouter", "user"]
