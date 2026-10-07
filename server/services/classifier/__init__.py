import logging

from settings import Settings

from .base import Classifier
from .fake import FakeClassifier
from .openrouter import OpenRouterClassifier, classifier_prompt_hash

log = logging.getLogger("jipgyeol")


def classifier_is_real(settings: Settings) -> bool:
    return (
        settings.CLASSIFIER == "openrouter"
        and bool(settings.OPENROUTER_API_KEY)
        and bool(settings.OPENROUTER_VISION_MODEL)
    )


def ranker_is_real(settings: Settings) -> bool:
    return (
        settings.RANKER == "llm"
        and bool(settings.OPENROUTER_API_KEY)
        and bool(settings.OPENROUTER_TEXT_MODEL)
    )


def get_classifier(settings: Settings) -> Classifier:
    if classifier_is_real(settings):
        return OpenRouterClassifier(settings)
    if settings.CLASSIFIER == "openrouter":
        if settings.OPENROUTER_API_KEY:
            log.warning("[MOCK] openrouter(model 미설정)")
        else:
            log.warning("[MOCK] openrouter")
    return FakeClassifier.from_settings(settings)


def mock_parts(settings: Settings) -> list[str]:
    """키가 없어 가짜로 동작하는 부품 이름 (/health 표시용)."""
    parts: list[str] = []
    if not classifier_is_real(settings) and settings.CLASSIFIER == "openrouter":
        parts.append("openrouter")
    elif settings.RANKER == "llm" and settings.OPENROUTER_API_KEY and not ranker_is_real(settings):
        parts.append("ranker")  # 키는 있는데 추천 모델 이름이 비어 규칙 추천을 쓴다
    if not (settings.KAKAO_REST_KEY and settings.JUSO_API_KEY):
        parts.append("address")
    if not settings.BLDG_API_KEY:
        parts.append("building")
    return parts


__all__ = [
    "Classifier",
    "FakeClassifier",
    "OpenRouterClassifier",
    "classifier_is_real",
    "classifier_prompt_hash",
    "get_classifier",
    "mock_parts",
    "ranker_is_real",
]
