# Host integration

The package follows Pascal Plugin API v1: the core manifest and host panel are
separate exports.

```ts
import { extendPluginDiscovery } from '@pascal-app/core'
import { registerEditorHostPanel } from '@pascal-app/editor'
import {
  articraftHostPanel,
  articraftPlugin,
} from '@pascal-app/plugin-articraft'

extendPluginDiscovery(async () => [articraftPlugin])
registerEditorHostPanel(articraftHostPanel)
```

The raw TypeScript package must be transpiled by the host. Keep React, Three.js,
and all `@pascal-app/*` packages deduplicated through peer dependencies.

## Same-origin browser API

The panel calls these host routes:

```text
GET  /api/plugins/articraft/catalog?q=&page=1&pageSize=24
POST /api/plugins/articraft/generations
GET  /api/plugins/articraft/generations/:jobId
```

Catalog responses use `ArticraftCatalogResponse`. Generation creation accepts
multipart form data (`prompt`, optional `image`, `provider`, optional `model`)
and returns `{ id, status }`. Job status returns an `item` with the same
`ArticraftCatalogItem` shape when complete.

The host owns Pascal session checks, request limits, billing policy, the fixed
worker origin, and server-side worker authorization. Do not expose worker or
provider credentials as `NEXT_PUBLIC_*` values.

## Reference worker

`server/` wraps mini-articraft's Python API behind a bearer-authenticated HTTP
contract. It is a reference deployment surface, not code that runs in the
browser or in a Vercel function. Generation requires CAD/OpenUSD dependencies
and should run in a persistent worker/container.

Required worker environment:

```text
ARTICRAFT_WORKER_API_KEY=
ARTICRAFT_ALLOWED_PROVIDERS=openai,anthropic,gemini,openrouter
OPENAI_API_KEY=              # at least one provider credential
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ARTICRAFT_STORAGE_BUCKET=articraft-catalog
```

Provider credits are spent by mini-articraft through whichever configured key
the request selects. Keys stay in the worker environment and never cross the
HTTP response boundary.
