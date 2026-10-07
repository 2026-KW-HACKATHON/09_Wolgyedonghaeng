from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse

from schemas import ErrorBody, ErrorResponse, Profile
from services.kakao_auth import get_profile, put_profile, verify_token
from settings import get_settings

router = APIRouter(prefix="/me", tags=["me"])

_UNAUTH = {401: {"model": ErrorResponse}}


def _user_id(authorization: str | None) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return verify_token(get_settings(), authorization[7:].strip())


def _unauthorized() -> JSONResponse:
    body = ErrorResponse(error=ErrorBody(code="unauthorized", message="다시 로그인해 주세요."))
    return JSONResponse(status_code=401, content=body.model_dump())


@router.get("/profile", response_model=Profile, responses=_UNAUTH)
def read_profile(authorization: str | None = Header(default=None)):
    uid = _user_id(authorization)
    if uid is None:
        return _unauthorized()
    return Profile.model_validate(get_profile(uid) or {})


@router.put("/profile", response_model=Profile, responses=_UNAUTH)
def write_profile(profile: Profile, authorization: str | None = Header(default=None)):
    uid = _user_id(authorization)
    if uid is None:
        return _unauthorized()
    put_profile(uid, profile.model_dump())
    return profile
