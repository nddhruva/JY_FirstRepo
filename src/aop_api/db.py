from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .config import SUPPORTED_RELATIONAL_DIALECTS, database_dialect, settings
from .db_models import Base


def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        db_file = url.replace("sqlite+pysqlite:///", "").replace("sqlite:///", "")
        if db_file and db_file != ":memory:":
            Path(db_file).parent.mkdir(parents=True, exist_ok=True)
        return {"connect_args": {"check_same_thread": False}}
    return {"pool_pre_ping": True}


def validate_database_url(url: str) -> str:
    dialect = database_dialect(url)
    if dialect not in SUPPORTED_RELATIONAL_DIALECTS:
        supported = ", ".join(sorted(SUPPORTED_RELATIONAL_DIALECTS))
        raise RuntimeError(f"Unsupported relational database dialect '{dialect}'. Supported: {supported}")
    return dialect


DATABASE_DIALECT = validate_database_url(settings.database_url)
engine = create_engine(settings.database_url, future=True, **_engine_kwargs(settings.database_url))
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def reset_db_for_tests() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
