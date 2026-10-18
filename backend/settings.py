import os
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


# Settings loaded from config.toml and the environment variables
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        toml_file=[
            "backend/config/config.toml",
            f"backend/config/config.{os.environ.get('ENV', 'DEV').lower()}.toml"
        ],
    )

    # Environment
    env: str = "DEV"

    # Database
    db_name: str
    db_host: str
    db_username: str
    db_password: SecretStr

    # Tokens
    jwt_secret_key: SecretStr
    jwt_algorithm: str

    access_token_expire_minutes: int
    reset_token_expire_minutes: int
    standard_refresh_token_expire_minutes: int
    long_lived_refresh_token_expire_minutes: int

    sliding_refresh_window_days: int
    refresh_token_prune_after_days: int

    # Frontend
    frontend_url: str

    # Email
    mail_server: str
    mail_port: int

    mail_system_email: str
    mail_system_username: str
    mail_system_password: SecretStr

    mail_primary_email: str
    mail_support_email: str


settings: Settings = Settings()  # type: ignore[call-arg]
