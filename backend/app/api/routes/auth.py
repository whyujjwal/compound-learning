from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import auth_enabled, make_token, verify_password

router = APIRouter(tags=["auth"])


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    auth_required: bool
    token: str | None = None


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    if not auth_enabled():
        return LoginResponse(auth_required=False, token=None)
    if not verify_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    return LoginResponse(auth_required=True, token=make_token())
