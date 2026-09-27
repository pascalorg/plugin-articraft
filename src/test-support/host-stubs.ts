import { plugin } from 'bun'

/**
 * Replaces the host packages (`@pascal-app/core`, `editor`, `viewer`) with
 * stubs for a probe script. Module stubs are process-global, so probes run in
 * a child process (see `runProbe`) and never inside the test runner.
 */
export function stubHostModules(stubs: Record<string, Record<string, unknown>>): void {
  plugin({
    name: 'articraft-host-stubs',
    setup(build) {
      for (const [specifier, exports] of Object.entries(stubs)) {
        build.module(specifier, () => ({ exports, loader: 'object' }))
      }
    },
  })
}

/** Runs a probe script in a child process and returns the JSON it prints. */
export function runProbe<T>(probe: string): T {
  const result = Bun.spawnSync([process.execPath, probe], { stderr: 'pipe', stdout: 'pipe' })
  if (result.exitCode !== 0) {
    throw new Error(`${probe} failed:\n${result.stderr.toString()}`)
  }
  return JSON.parse(result.stdout.toString()) as T
}
