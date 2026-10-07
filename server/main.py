import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from settings import get_settings

log = logging.getLogger("jipgyeol")
settings = get_settings()

app = FastAPI(title="집결 서버")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}
