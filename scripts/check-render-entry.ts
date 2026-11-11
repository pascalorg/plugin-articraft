// Bundles the `./render` entry with every dependency followed and fails if
// anything on that graph resolves to `@pascal-app/editor` or `next`.
// Run with `bun run check:render`.
import { fileURLToPath } from 'node:url'

const FORBIDDEN = /^(?:@pascal-app\/editor|next)(?:\/|$)/
const entry = fileURLToPath(new URL('../src/render.ts', import.meta.url))
const hits: string[] = []

let failure: unknown
const result = await Bun.build({
  entrypoints: [entry],
  target: 'browser',
  format: 'esm',
  splitting: true,
  plugins: [
    {
      name: 'render-entry-guard',
      setup(build) {
        build.onResolve({ filter: /.*/ }, (args) => {
          if (FORBIDDEN.test(args.path)) hits.push(`${args.path}  <-  ${args.importer}`)
          return undefined
        })
      },
    },
  ],
}).catch((error: unknown) => {
  failure = error
  return null
})

if (hits.length > 0) {
  console.error('The ./render entry reaches editor-only modules:')
  for (const hit of hits) console.error(`  ${hit}`)
  process.exit(1)
}
if (!result?.success) {
  console.error('The ./render entry failed to bundle:')
  for (const log of result?.logs ?? [failure]) console.error(log)
  process.exit(1)
}
console.log(
  `./render bundles without @pascal-app/editor or next (${result.outputs.length} outputs).`,
)
