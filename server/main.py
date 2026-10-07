import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import address as address_router
from routers import analyze as analyze_router
from routers import building as building_router
from routers import health as health_router
from routers import programs as programs_router
from services.address import get_address_service
from services.building import get_building_service
from services.classifier import get_classifier
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
    load_programs()  # 잘못된 사업 데이터면 여기서 예외가 나서 서버가 뜨지 않는다
    yield


app = FastAPI(title="집결 서버", lifespan=lifespan)
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
