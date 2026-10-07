from fastapi import APIRouter

from schemas import HealthResponse
from services.classifier import classifier_is_real, mock_parts, ranker_is_real
from settings import get_settings
from version import build_version

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    s = get_settings()
    source = "openrouter" if classifier_is_real(s) else "fake"
    ranker = "llm" if ranker_is_real(s) else "rules"
    return HealthResponse(ok=True, version=build_version(s, source, ranker), mock=mock_parts(s))
