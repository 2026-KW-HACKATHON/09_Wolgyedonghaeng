import os

# 다른 테스트가 같은 앱을 많이 부르므로 분당 요청 제한은 끈다. 제한 자체는 test_limits.py 가 따로 확인한다.
os.environ.setdefault("RATE_LIMIT_PER_MIN", "0")


# server/.env 에 실제 키가 있어도 일반 테스트는 가짜 구현으로 돌린다. 스모크 테스트를 직접 지정했을 때만 .env 를 쓴다.
def pytest_configure(config):
    if any("smoke" in str(a) for a in config.args):
        return
    for name in (
        "OPENROUTER_API_KEY",
        "OPENROUTER_VISION_MODEL",
        "OPENROUTER_TEXT_MODEL",
        "KAKAO_REST_KEY",
        "KAKAO_CLIENT_SECRET",
        "JUSO_API_KEY",
        "BLDG_API_KEY",
    ):
        os.environ[name] = ""
