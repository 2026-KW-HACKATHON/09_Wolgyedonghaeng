# 집결 서버. 저장소 루트에서 빌드한다: docker build -f server/Dockerfile -t jipgyeol-server .
# (서버가 contracts/problem-types.json 을 읽기 때문에 server/ 만으로는 부족하다)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# 코드는 /srv/server, 계약 파일은 /srv/contracts (서버 코드가 ../contracts 를 찾는다)
WORKDIR /srv/server

COPY server/requirements.txt .
RUN pip install -r requirements.txt

# 일반 사용자로 실행한다. 운영 로그(SQLite)를 /srv/server 에 쓰므로 이 사용자 소유로 둔다.
RUN useradd --create-home --uid 10001 app
COPY --chown=app:app contracts/problem-types.json /srv/contracts/problem-types.json
COPY --chown=app:app server/ .
RUN chown app:app /srv/server
USER app

# 호스팅 서비스가 PORT 를 정해 주면 그 값을, 아니면 8000 을 쓴다
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
