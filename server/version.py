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
    model = settings.OPENROUTER_VISION_MODEL or None
    return VersionInfo(
        server=server_version(),
        rulesHash=rules_hash(),
        programsAsOf=get_programs().asOf,
        classifier=ProviderInfo(
            provider=classifier_source, model=model if classifier_source == "openrouter" else None
        ),
        ranker=RankerInfo(provider=ranker_provider, model=None),
        confirmThreshold=settings.CONFIRM_THRESHOLD,
    )
