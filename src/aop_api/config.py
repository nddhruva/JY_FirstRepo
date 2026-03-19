from __future__ import annotations

from dataclasses import dataclass
from os import getenv
from typing import Final


SUPPORTED_RELATIONAL_DIALECTS: Final[set[str]] = {
    "postgresql",
    "mysql",
    "mariadb",
    "mssql",
    "oracle",
    "sqlite",
}


@dataclass(frozen=True)
class Settings:
    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str
    jwt_exp_minutes: int
    bootstrap_admin_username: str
    bootstrap_admin_password: str
    graph_database_url: str | None
    upload_dir: str
    max_upload_bytes: int


def get_settings() -> Settings:
    return Settings(
        database_url=getenv("AOP_DATABASE_URL", "sqlite+pysqlite:///./aop.db"),
        jwt_secret_key=getenv("AOP_JWT_SECRET_KEY", "change-me-in-production"),
        jwt_algorithm=getenv("AOP_JWT_ALGORITHM", "HS256"),
        jwt_exp_minutes=int(getenv("AOP_JWT_EXP_MINUTES", "60")),
        bootstrap_admin_username=getenv("AOP_BOOTSTRAP_ADMIN_USERNAME", "platform_admin"),
        bootstrap_admin_password=getenv("AOP_BOOTSTRAP_ADMIN_PASSWORD", "ChangeMe123!"),
        graph_database_url=getenv("AOP_GRAPH_DATABASE_URL"),
        upload_dir=getenv("AOP_UPLOAD_DIR", "./uploads"),
        max_upload_bytes=int(getenv("AOP_MAX_UPLOAD_BYTES", str(5 * 1024 * 1024))),
    )


settings = get_settings()


def database_dialect(url: str) -> str:
    return url.split("://", 1)[0].split("+", 1)[0].lower()
