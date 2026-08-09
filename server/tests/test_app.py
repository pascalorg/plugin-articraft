from pathlib import Path

from fastapi.testclient import TestClient

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
