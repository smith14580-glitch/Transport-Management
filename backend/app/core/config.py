from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "HK Transport API"
    environment: str = "development"
    database_url: str
    secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 15
    frontend_url: str = "http://localhost:3000"
    app_timezone: str = "Asia/Karachi"

    seed_manager_email: str = "manager@hktransport.pk"
    seed_manager_password: str = ""
    seed_manager_name: str = "Talha — Manager"
    seed_manager_phone: str = "0315-2776677"

    @property
    def allowed_origins(self) -> list[str]:
        origins: list[str] = []
        for raw in self.frontend_url.split(","):
            origin = raw.strip().rstrip("/")
            if origin:
                origins.append(origin)
        for local in ("http://localhost:3000", "http://127.0.0.1:3000"):
            if local not in origins:
                origins.append(local)
        return origins

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in {"production", "prod"}


def sqlalchemy_url(raw: str) -> str:
    url = raw.strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
