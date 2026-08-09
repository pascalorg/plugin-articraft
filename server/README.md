# Reference worker

This FastAPI service is the credential boundary between a Pascal host and
mini-articraft. It is designed for a persistent, single-worker container with a
durable volume mounted at `.articraft/`. Jobs survive process restarts as JSON,
but queued work is not automatically resumed and this reference implementation
does not coordinate multiple replicas.

The mini-articraft dependency is pinned to the audited upstream commit in
`pyproject.toml`. Generation invokes the selected provider using credentials in
the worker environment, uploads the resulting USDZ and manifest through the
Supabase service role, and returns only the normalized plugin record.

```bash
cp .env.example .env
uv sync --extra test
uv run uvicorn articraft_worker.app:create_app --factory --host 0.0.0.0 --port 8000
```

Run tests with `uv run pytest`. The storage bucket must already exist and be
publicly readable; the worker deliberately does not create or reconfigure it.
