# Articraft for Pascal

An external Pascal Editor plugin for articulated 3D assets. It can browse a
Pascal-hosted mirror of Articraft-10K, place URDF assets as custom Pascal nodes,
pose their revolute/continuous/prismatic joints, and submit prompt or reference-
image jobs to a credentialed mini-articraft worker that returns posable USDZ.

Placement previews use the same articulated URDF/USDZ hierarchy as committed
nodes, with translucent non-interactive materials. Committed nodes continue to
render while Pascal moves, rotates, or scales their registered root transform.
The inspector's **Preview motion** control animates every movable joint without
writing preview frames into scene history or autosave.

This is a Pascal integration maintained by `pascalorg`. It is not an official
hosted service from the Articraft researchers.

## What the plugin contributes

- Plugin id `pascal:articraft` and node kind `articraft:asset`.
- A lazy Articraft sidebar with Browse and Generate views.
- A placement tool that persists the artifact identity, source attribution,
  normalized articulation graph, and current joint pose in the Pascal scene.
- URDF + OBJ rendering for the CC BY 4.0 Articraft-10K dataset.
- USDZ rendering for results produced by the Apache 2.0 mini-articraft SDK.
- Joint sliders in the normal Pascal inspector; radians stay radians in scene
  data and are displayed as degrees only for people.
- A non-persistent motion preview that smoothly sweeps every movable joint.

The browser package never receives provider, worker, or Supabase service-role
credentials. Hosts expose the same-origin broker described in
[HOST_INTEGRATION.md](./HOST_INTEGRATION.md).

## Development

```bash
bun install
bun run check-types
bun test

cd server
uv sync --extra test
uv run pytest
```

Read [Create a plugin](https://editor.pascal.app/docs/developers/plugins) for
Pascal's public Plugin API v1 contract.

## Upstream and data attribution

- [Articraft project](https://articraft3d.github.io/)
- [mini-articraft](https://github.com/articraftresearch/Articraft), Apache 2.0
- [Articraft-10K](https://huggingface.co/datasets/camvsl/Articraft-10K),
  CC BY 4.0, by the Articraft authors / Cambridge Visual Structure Learning Lab

Every mirrored catalog record keeps the upstream dataset revision, source
archive, license, and attribution. Applications embedding this plugin must keep
that attribution visible.

## License

Plugin and reference-worker integration code is MIT licensed. mini-articraft and
Articraft-10K retain their own licenses above; this repository does not relicense
their code or dataset artifacts.
