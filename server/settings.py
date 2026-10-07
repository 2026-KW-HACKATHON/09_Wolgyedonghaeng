from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    CLASSIFIER: str = "openrouter"
    RANKER: str = "llm"
    CONFIRM_THRESHOLD: float = 0.7
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_VISION_MODEL: str = ""
    OPENROUTER_TEXT_MODEL: str = ""
    KAKAO_REST_KEY: str = ""
    KAKAO_CLIENT_SECRET: str = ""
    JUSO_API_KEY: str = ""
    BLDG_API_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:8081,http://localhost:19006"


@lru_cache
def get_settings() -> Settings:
    return Settings()
