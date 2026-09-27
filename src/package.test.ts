import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  peerDependencies: Record<string, string>
}

// The host ships Pascal 1.x on three 0.186 (@pascal-app/core 1.0.3 pins `three ^0.186`);
// strict installs refuse the plugin when a peer range excludes them.
const shippedHost = {
  '@pascal-app/core': ['1.0.0-beta.4', '1.0.3', '1.9.0'],
  '@pascal-app/editor': ['1.0.0-beta.4', '1.0.3', '1.9.0'],
  '@pascal-app/viewer': ['1.0.0-beta.4', '1.0.3', '1.9.0'],
  three: ['0.185.0', '0.186.0', '0.186.1'],
} as const

describe('peer ranges', () => {
  for (const [name, versions] of Object.entries(shippedHost)) {
    test(`${name} accepts ${versions.join(', ')}`, () => {
      const range = manifest.peerDependencies[name]
      expect(range).toBeDefined()
      for (const version of versions) {
        expect({ version, accepted: Bun.semver.satisfies(version, range ?? '') }).toEqual({
          version,
          accepted: true,
        })
      }
    })
  }

  test('does not claim the next major', () => {
    for (const name of ['@pascal-app/core', '@pascal-app/editor', '@pascal-app/viewer']) {
      expect(Bun.semver.satisfies('2.0.0', manifest.peerDependencies[name] ?? '')).toBe(false)
    }
    expect(Bun.semver.satisfies('0.187.0', manifest.peerDependencies.three ?? '')).toBe(false)
  })
})
