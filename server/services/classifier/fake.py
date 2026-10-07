from typing import get_args

from schemas import ClassifyResult, ProblemType
from settings import Settings

_VALID = set(get_args(ProblemType))
_DESCRIPTION = "욕실 천장 모서리에 물이 샌 자국이 보여요"

# 앞에 있는 키워드가 먼저 맞는다.
_HINTS: list[tuple[str, ProblemType]] = [
    ("누수", "leak"),
    ("물이 새", "leak"),
    ("곰팡이", "mold"),
    ("창문", "window_insulation"),
    ("보일러", "heating"),
    ("배관", "plumbing"),
    ("계단", "safety"),
    ("전기", "electric"),
]


class FakeClassifier:
    """이미지로는 판단할 수 없으므로 설정값대로 고정 결과를 돌려준다."""

    def __init__(self, type_: str = "leak", confidence: float = 0.82) -> None:
        self.type: ProblemType = type_ if type_ in _VALID else "leak"  # type: ignore[assignment]
        self.confidence = min(1.0, max(0.0, confidence))

    @classmethod
    def from_settings(cls, settings: Settings) -> "FakeClassifier":
        return cls(settings.FAKE_CLASSIFIER_TYPE, settings.FAKE_CLASSIFIER_CONFIDENCE)

    async def classify(self, images: list[bytes]) -> ClassifyResult:
        return ClassifyResult(
            type=self.type,
            confidence=self.confidence,
            description=_DESCRIPTION,
            source="fake",
        )

    def classify_hint(self, hint: str) -> ClassifyResult:
        found: ProblemType = self.type
        matched = False
        for kw, t in _HINTS:
            if kw in hint:
                found, matched = t, True
                break
        return ClassifyResult(
            type=found,
            confidence=self.confidence if matched else 0.5,
            description=_DESCRIPTION,
            source="fake",
        )
