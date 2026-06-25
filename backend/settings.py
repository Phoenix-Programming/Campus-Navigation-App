from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
		env_file="backend/.env",
		env_file_encoding="utf-8"
	)

    db_url: str

    secret_key: SecretStr
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    standard_refresh_token_expire_minutes: int = 24 * 60  # 24 hours
    long_lived_refresh_token_expire_minutes: int = 90 * 24 * 60  # 90 days
    sliding_refresh_window_days: int = 7
    refresh_token_prune_after_days: int = 14

    reset_token_expire_minutes: int = 60

    mail_server: str = "localhost"
    mail_port: int = 587
    mail_username: str = ""
    mail_password: SecretStr = SecretStr("")
    mail_from: str = "noreply@example.com"
    mail_use_tls: bool = True

    frontend_url: str = "http://localhost:8000"


settings: Settings = Settings()  # type: ignore[call-arg]  # loaded from .env file
