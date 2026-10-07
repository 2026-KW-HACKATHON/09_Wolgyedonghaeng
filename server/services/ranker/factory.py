from services.classifier import ranker_is_real
from services.ranker.llm import LLMRanker
from settings import Settings


def get_llm_ranker(settings: Settings) -> LLMRanker | None:
    """RANKER=llm 이고 키·모델이 있으면 LLMRanker, 아니면 None (규칙 추천기를 쓴다)."""
    return LLMRanker(settings) if ranker_is_real(settings) else None
