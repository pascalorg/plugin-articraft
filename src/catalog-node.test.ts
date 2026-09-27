import { describe, expect, test } from 'bun:test'
import { catalogNode } from './catalog-node'
import type { ArticraftCatalogItem } from './types'

const item: ArticraftCatalogItem = {
  id: 'articraft-10k:lamp',
  title: 'Task lamp',
  source: 'articraft-10k',
  artifact: { format: 'urdf', url: 'https://assets.example/model.urdf' },
  dimensions: [0.3, 0.6, 0.3],
  parts: [{ name: 'base' }, { name: 'arm' }],
  joints: [
    {
      name: 'arm_hinge',
      type: 'revolute',
      parent: 'base',
      child: 'arm',
      axis: [0, 1, 0],
      origin: { xyz: [0, 0, 0.1], rpy: [0, 0, 0] },
      limits: { lower: 0, upper: 1.2 },
    },
  ],
  defaultJointValues: { arm_hinge: 0 },
  attribution: {
    creator: 'Articraft authors',
    license: 'CC-BY-4.0',
    sourceUrl: 'https://huggingface.co/datasets/camvsl/Articraft-10K',
  },
}

describe('placing a catalog asset', () => {
  test('saves its rest pose and no playback state', () => {
    const node = catalogNode(item, [1, 0, 2])
    expect(node).toMatchObject({
      type: 'articraft:asset',
      position: [1, 0, 2],
      catalogId: item.id,
      jointValues: { arm_hinge: 0 },
    })
    expect(Object.hasOwn(node, 'motionEnabled')).toBe(false)
  })
})
