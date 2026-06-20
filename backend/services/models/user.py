from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    email: EmailStr = Field(max_length=120)


class UserCreateRequest(UserBase):
    password: str = Field(min_length=8)


class UserUpdateRequest(BaseModel):
    username: str | None = Field(default=None, min_length=1, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=120)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: str | None = None
    permissions: set[str] | None = None


class UserPublicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str


class UserPrivateResponse(UserPublicResponse):
    email: EmailStr
