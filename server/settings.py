from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    CLASSIFIER: str = "openrouter"
    RANKER: str = "llm"
    CONFIRM_THRESHOLD: float = 0.7
    RANK_MAX: int = 5  # 결과에 보여 줄 추천 최대 개수
    REASON_MAX_LEN: int = 200  # 추천 이유 문장 최대 길이 (Recommendation 스키마와 같게)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_VISION_MODEL: str = ""
    OPENROUTER_TEXT_MODEL: str = ""
    KAKAO_REST_KEY: str = ""
    KAKAO_CLIENT_SECRET: str = ""
    JUSO_API_KEY: str = ""
    BLDG_API_KEY: str = ""
    FAKE_CLASSIFIER_TYPE: str = "leak"  # 가짜 분류기가 돌려줄 유형
    FAKE_CLASSIFIER_CONFIDENCE: float = 0.82  # 가짜 분류기 확신도
    CLASSIFY_TIMEOUT: float = 8.0
    RANK_TIMEOUT: float = 6.0  # 추천(LLM) 전체 제한 시간. 넘으면 규칙 추천으로 대체
    REVERSE_TIMEOUT: float = 4.0  # 좌표 → 주소
    SEARCH_TIMEOUT: float = 3.0  # 주소 검색
    BUILDING_TIMEOUT: float = 3.0  # 건축물대장
    MAX_IMAGES: int = 3
    MAX_REQUEST_BYTES: int = 10 * 1024 * 1024
    CORS_ORIGINS: str = "http://localhost:8081,http://localhost:19006"


@lru_cache
def get_settings() -> Settings:
    return Settings()
