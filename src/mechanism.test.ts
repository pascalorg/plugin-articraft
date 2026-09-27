import { beforeEach, describe, expect, test } from 'bun:test'
import { useInteractive } from '@pascal-app/core'
import { articraftAssetDefinition } from './definition'
import { articraftMotionPlaying, useArticraftMotion } from './motion-state'
import { ArticraftAssetNode } from './schema'

const node = ArticraftAssetNode.parse({
  id: 'articraft_mechanism_test',
  catalogId: 'lamp',
  title: 'Task lamp',
  source: 'articraft-10k',
  artifact: { format: 'urdf', url: 'https://assets.example/model.urdf' },
  joints: [
    {
      name: 'arm',
      type: 'revolute',
      parent: 'base',
      child: 'arm',
      origin: { xyz: [0, 0, 0], rpy: [0, 0, 0] },
      limits: { lower: 0, upper: 1 },
    },
  ],
  attribution: { creator: 'Articraft authors', license: 'CC-BY-4.0', sourceUrl: 'https://x.test' },
})
const still = ArticraftAssetNode.parse({ ...node, id: 'articraft_still', joints: [] })

type HostMechanisms = {
  mechanisms?: Record<string, boolean>
  setMechanism?: (nodeId: string, on: boolean) => void
}
const mechanism = (
  articraftAssetDefinition.capabilities as {
    mechanism?: {
      has: (node: unknown) => boolean
      isOn: (node: unknown, state: object) => boolean
      set: (node: unknown, on: boolean) => void
      verb?: string
    }
  }
).mechanism

/** A host whose core keeps single-switch mechanisms in `useInteractive.mechanisms`. */
function installHostMechanisms() {
  const set = useInteractive.setState as (patch: HostMechanisms) => void
  set({
    mechanisms: {},
    setMechanism: (nodeId, on) =>
      set({
        mechanisms: {
          ...(useInteractive.getState() as HostMechanisms).mechanisms,
          [nodeId]: on,
        },
      }),
  })
}

describe('Articraft mechanism capability', () => {
  beforeEach(() => {
    useInteractive.setState(useInteractive.getInitialState(), true)
    useArticraftMotion.setState({ playing: {} })
  })

  test('declares the movable joints for Play/Stop, E and the walkthrough', () => {
    expect(mechanism?.has(node)).toBe(true)
    expect(mechanism?.has(still)).toBe(false)
    expect(mechanism?.verb).toBe('run')
  })

  test("runs through the host's transient mechanism state when the host has it", () => {
    installHostMechanisms()
    mechanism?.set(node, true)
    const state = useInteractive.getState() as HostMechanisms
    expect(state.mechanisms?.[node.id]).toBe(true)
    expect(mechanism?.isOn(node, state)).toBe(true)
    expect(articraftMotionPlaying(node.id)).toBe(true)
    mechanism?.set(node, false)
    expect(articraftMotionPlaying(node.id)).toBe(false)
  })

  test('keeps working on hosts without it (plugin-local playback)', () => {
    mechanism?.set(node, true)
    expect(articraftMotionPlaying(node.id)).toBe(true)
    expect(mechanism?.isOn(node, useInteractive.getState())).toBe(true)
  })
})
