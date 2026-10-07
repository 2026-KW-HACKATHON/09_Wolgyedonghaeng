from fastapi import APIRouter

from schemas import HealthResponse
from services.classifier import mock_parts
from settings import get_settings
from version import build_version

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    s = get_settings()
    source = "openrouter" if s.OPENROUTER_API_KEY else "fake"
    return HealthResponse(ok=True, version=build_version(s, source, "rules"), mock=mock_parts(s))
