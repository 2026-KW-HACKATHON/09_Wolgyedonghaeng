"""버전 정보 (spec 5.6). 어떤 코드·데이터·모델로 답했는지 응답과 로그에 남긴다."""

import hashlib
import subprocess
from functools import lru_cache
from pathlib import Path

from schemas import ProviderInfo, RankerInfo, VersionInfo
from services.programs import DEFAULT_PATH, get_programs
from settings import Settings

ROOT = Path(__file__).resolve().parent


@lru_cache
def server_version() -> str:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=2,
            check=False,
        )
        return (
            f"git:{out.stdout.strip()}"
            if out.returncode == 0 and out.stdout.strip()
            else "git:unknown"
        )
    except (OSError, subprocess.SubprocessError):
        return "git:unknown"


@lru_cache
def rules_hash() -> str:
    h = hashlib.sha256()
    h.update((ROOT / "services" / "matcher.py").read_bytes())
    h.update(Path(DEFAULT_PATH).read_bytes())
    return f"sha256:{h.hexdigest()}"


def build_version(settings: Settings, classifier_source: str, ranker_provider: str) -> VersionInfo:
    """classifier_source, ranker_provider 는 실제로 쓴 구현 (가짜면 fake, 규칙이면 rules)."""
    from services.classifier.openrouter import classifier_prompt_hash
    from services.ranker.llm import ranker_prompt_hash

    real_cls = classifier_source == "openrouter"
    real_rank = ranker_provider == "llm"
    return VersionInfo(
        server=server_version(),
        rulesHash=rules_hash(),
        programsAsOf=get_programs().asOf,
        classifier=ProviderInfo(
            provider=classifier_source,
            model=(settings.OPENROUTER_VISION_MODEL or None) if real_cls else None,
            promptHash=classifier_prompt_hash() if real_cls else None,
        ),
        ranker=RankerInfo(
            provider=ranker_provider,
            model=(settings.OPENROUTER_TEXT_MODEL or None) if real_rank else None,
            promptHash=ranker_prompt_hash() if real_rank else None,
        ),
        confirmThreshold=settings.CONFIRM_THRESHOLD,
    )
