from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr | None = None
    password: str


class AuthResponse(BaseModel):
    auth_required: bool
    token: str | None = None
    user_id: str | None = None
    email: str | None = None
