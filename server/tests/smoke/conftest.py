"""실제 키로 연동을 한 번씩 확인하는 스모크 테스트.

실행: cd server && .venv/bin/pytest -q tests/smoke
기본 `pytest -q` 에서는 건너뛰고, 해당 키가 비어 있으면 그 테스트만 건너뛴다.
"""

from pathlib import Path

import pytest

from settings import Settings

ROOT = Path(__file__).resolve().parents[3]
SAMPLE_IMAGE = ROOT / "app" / "e2e" / "fixtures" / "problem.jpg"
# 서울 노원구 월계동 부근
WOLGYE_LAT, WOLGYE_LNG = 37.6, 127.06


def pytest_configure(config):
    config.addinivalue_line("markers", "smoke: 실제 키로 외부 서비스를 부르는 확인 테스트")


def pytest_collection_modifyitems(config, items):
    explicit = any("smoke" in str(a) for a in config.args)
    for item in items:
        if "tests/smoke" in str(item.fspath).replace("\\", "/") and not explicit:
            item.add_marker(
                pytest.mark.skip(reason="스모크 테스트: pytest -q tests/smoke 로 따로 실행해요")
            )


@pytest.fixture(scope="session")
def settings() -> Settings:
    return Settings()  # server/.env 와 환경변수를 읽는다


def need(*values: str, names: str):
    if not all(values):
        pytest.skip(f"{names} 가 비어 있어요 (키를 넣으면 실행돼요)")
