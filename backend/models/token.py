from pydantic import BaseModel


class RefreshTokenRequest(BaseModel):
    token: str


class TokenData(BaseModel):
    user_id: str | None = None
    permissions: set[str] | None = None


class RefreshTokenData(BaseModel):
    token: str
    user_id: int


class AccessRefreshTokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
