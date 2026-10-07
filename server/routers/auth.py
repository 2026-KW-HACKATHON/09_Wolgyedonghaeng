from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from schemas import AuthRequest, AuthResponse, AuthUrlResponse, ErrorBody, ErrorResponse
from services.kakao_auth import AuthError, get_kakao_auth, issue_token
from settings import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/kakao/url", response_model=AuthUrlResponse)
def kakao_url(redirectUri: str = Query(min_length=1, max_length=500)) -> AuthUrlResponse:
    return AuthUrlResponse(url=get_kakao_auth(get_settings()).authorize_url(redirectUri))


@router.post("/kakao", response_model=AuthResponse, responses={502: {"model": ErrorResponse}})
async def kakao_login(req: AuthRequest):
    s = get_settings()
    try:
        user = await get_kakao_auth(s).exchange(req.code, req.redirectUri)
    except AuthError:
        body = ErrorResponse(
            error=ErrorBody(code="auth_failed", message="로그인이 잘 안 됐어요. 다시 해 볼게요.")
        )
        return JSONResponse(status_code=502, content=body.model_dump())
    return AuthResponse(token=issue_token(s, user.id), user=user)
