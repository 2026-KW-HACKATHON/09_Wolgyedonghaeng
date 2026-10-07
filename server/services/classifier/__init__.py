import logging

from settings import Settings

from .base import Classifier
from .fake import FakeClassifier

log = logging.getLogger("jipgyeol")


def get_classifier(settings: Settings) -> Classifier:
    if not settings.OPENROUTER_API_KEY:
        log.warning("[MOCK] openrouter")
    # TODO(T50): 키가 있으면 OpenRouterClassifier를 돌려준다. 지금은 항상 가짜.
    return FakeClassifier.from_settings(settings)


def mock_parts(settings: Settings) -> list[str]:
    """키가 없어 가짜로 동작하는 부품 이름 (/health 표시용)."""
    parts: list[str] = []
    if not settings.OPENROUTER_API_KEY:
        parts.append("openrouter")
    if not (settings.KAKAO_REST_KEY and settings.JUSO_API_KEY):
        parts.append("address")
    if not settings.BLDG_API_KEY:
        parts.append("building")
    return parts


__all__ = ["Classifier", "FakeClassifier", "get_classifier", "mock_parts"]
