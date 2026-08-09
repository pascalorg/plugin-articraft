import asyncio
import threading
import time
from pathlib import Path

from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
import pytest

from articraft_worker.app import create_app
from articraft_worker.config import Settings


def settings(tmp_path: Path) -> Settings:
    return Settings(
        api_key="test-worker-key",
        allowed_providers=frozenset({"openai"}),
        storage_url="http://storage.invalid",
        storage_service_key="test-service-key",
        storage_bucket="articraft-catalog",
        jobs_dir=tmp_path / "jobs",
        runs_dir=tmp_path / "runs",
    )


def test_generation_requires_bearer_auth(tmp_path: Path) -> None:
    client = TestClient(create_app(settings(tmp_path)))

    response = client.post(
        "/v1/generations",
        data={"prompt": "a folding lamp", "provider": "openai"},
    )

    assert response.status_code == 401


def test_generation_rejects_disallowed_provider(tmp_path: Path) -> None:
    client = TestClient(create_app(settings(tmp_path)))

    response = client.post(
        "/v1/generations",
        headers={"authorization": "Bearer test-worker-key"},
        data={"prompt": "a folding lamp", "provider": "anthropic"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Provider is not allowed"}


@pytest.mark.asyncio
async def test_generation_keeps_status_endpoint_responsive(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    generation_started = threading.Event()

    async def slow_generation(**_: object) -> None:
        generation_started.set()
        time.sleep(0.25)
        raise RuntimeError("expected test failure")

    monkeypatch.setattr("articraft_worker.app.generate_item", slow_generation)
    transport = ASGITransport(app=create_app(settings(tmp_path)))
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/v1/generations",
            headers={"authorization": "Bearer test-worker-key"},
            data={"prompt": "a folding lamp", "provider": "openai"},
        )
        job_id = created.json()["id"]
        assert await asyncio.to_thread(generation_started.wait, 0.2)
        started = time.perf_counter()
        response = await client.get(
            f"/v1/generations/{job_id}",
            headers={"authorization": "Bearer test-worker-key"},
        )
        elapsed = time.perf_counter() - started
        assert response.status_code == 200
        assert response.json()["status"] == "running"
        assert elapsed < 0.1
        await asyncio.sleep(0.3)
