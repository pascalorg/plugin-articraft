from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class Settings:
    api_key: str
    allowed_providers: frozenset[str]
    storage_url: str
    storage_service_key: str
    storage_bucket: str
    jobs_dir: Path
    runs_dir: Path
    max_concurrent_jobs: int = 1


def load_settings() -> Settings:
    return Settings(
        api_key=_required("ARTICRAFT_WORKER_API_KEY"),
        allowed_providers=frozenset(
            value.strip()
            for value in os.getenv(
                "ARTICRAFT_ALLOWED_PROVIDERS",
                "openai,anthropic,gemini,openrouter",
            ).split(",")
            if value.strip()
        ),
        storage_url=_required("SUPABASE_URL").rstrip("/"),
        storage_service_key=_required("SUPABASE_SERVICE_ROLE_KEY"),
        storage_bucket=os.getenv("ARTICRAFT_STORAGE_BUCKET", "articraft-catalog"),
        jobs_dir=Path(os.getenv("ARTICRAFT_JOBS_DIR", ".articraft/jobs")),
        runs_dir=Path(os.getenv("ARTICRAFT_RUNS_DIR", ".articraft/runs")),
        max_concurrent_jobs=_bounded_integer(
            "ARTICRAFT_MAX_CONCURRENT_JOBS", default=1, minimum=1, maximum=4
        ),
    )


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def _bounded_integer(name: str, *, default: int, minimum: int, maximum: int) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        value = int(raw)
    except ValueError as error:
        raise RuntimeError(f"{name} must be an integer") from error
    if value < minimum or value > maximum:
        raise RuntimeError(f"{name} must be between {minimum} and {maximum}")
    return value
