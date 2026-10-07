import os

# 다른 테스트가 같은 앱을 많이 부르므로 분당 요청 제한은 끈다. 제한 자체는 test_limits.py 가 따로 확인한다.
os.environ.setdefault("RATE_LIMIT_PER_MIN", "0")
