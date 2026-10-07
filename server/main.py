import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from limits import RequestLimitMiddleware
from routers import address as address_router
from routers import analyze as analyze_router
from routers import auth as auth_router
from routers import building as building_router
from routers import health as health_router
from routers import me as me_router
from routers import programs as programs_router
from services.address import get_address_service
from services.building import get_building_service
from services.classifier import get_classifier
from services.kakao_auth import get_kakao_auth
from services.programs import load_programs
from settings import get_settings

log = logging.getLogger("jipgyeol")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    for factory in (get_classifier,):
        factory(settings)
    get_address_service(settings)
    get_building_service(settings)
    get_kakao_auth(settings)
    load_programs()  # 잘못된 사업 데이터면 여기서 예외가 나서 서버가 뜨지 않는다
    yield


app = FastAPI(title="집결 서버", lifespan=lifespan)
# 나중에 추가한 것이 바깥쪽이다. CORS 가 바깥이어야 413·429 응답에도 CORS 헤더가 붙는다.
app.add_middleware(
    RequestLimitMiddleware,
    max_bytes=settings.MAX_REQUEST_BYTES,
    per_min=settings.RATE_LIMIT_PER_MIN,
    trust_proxy=settings.TRUST_PROXY,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(programs_router.router)
app.include_router(health_router.router)
app.include_router(analyze_router.router)
app.include_router(address_router.router)
app.include_router(building_router.router)
app.include_router(auth_router.router)
app.include_router(me_router.router)
