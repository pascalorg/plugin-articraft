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
    )


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required")
    return value
