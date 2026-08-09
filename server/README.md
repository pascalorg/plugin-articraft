# Reference worker

This FastAPI service is the credential boundary between a Pascal host and
mini-articraft. It is designed for a persistent, single-replica container with a
durable volume mounted at `.articraft/`. Queued or interrupted jobs resume from
their JSON records after a process restart, including an uploaded reference image.
Generation concurrency is bounded by `ARTICRAFT_MAX_CONCURRENT_JOBS` (default 1)
so simultaneous requests do not create an unbounded number of CAD/provider runs.
This reference implementation does not coordinate multiple replicas.

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

## Container deployment

Build and run the pinned production image from this directory:

```bash
docker build --platform linux/amd64 -t pascal-articraft-worker .
docker run --rm --platform linux/amd64 --env-file .env -p 8000:8000 \
  -v pascal-articraft-data:/data pascal-articraft-worker
```

Deploy exactly one replica with a persistent volume mounted at `/data`; the local
JSON scheduler deliberately favors simple restart recovery over a distributed
queue. Configure the host with its HTTPS URL and the same
`ARTICRAFT_WORKER_API_KEY`. Provider keys and the Supabase service-role key stay
inside the worker environment. The container runs as an unprivileged user and
exposes `/health` for platform probes. The image targets Linux/amd64 because the
locked `usd-core` dependency does not publish a Linux ARM64 wheel.
