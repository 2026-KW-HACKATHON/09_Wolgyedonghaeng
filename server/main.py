import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import programs as programs_router
from services.programs import load_programs
from settings import get_settings

log = logging.getLogger("jipgyeol")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
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


@app.get("/health")
def health():
    return {"ok": True}
