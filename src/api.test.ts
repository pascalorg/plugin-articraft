import { describe, expect, test } from 'bun:test'
import { isCatalogItem, parseCatalogResponse } from './api'

const item = {
  id: 'globe',
  title: 'Articulated globe',
  source: 'articraft-10k',
  artifact: { format: 'urdf', url: 'https://assets.example/model.urdf' },
  dimensions: [1, 1, 1],
  parts: [],
  joints: [],
  defaultJointValues: {},
  attribution: {
    creator: 'Articraft authors',
    license: 'CC-BY-4.0',
    sourceUrl: 'https://huggingface.co/datasets/camvsl/Articraft-10K',
  },
}

describe('Articraft API parsing', () => {
  test('accepts a node-ready catalog response', () => {
    expect(isCatalogItem(item)).toBe(true)
    expect(
      parseCatalogResponse({
        categories: [{ name: 'Other', count: 1 }],
        items: [item],
        page: 1,
        pageSize: 24,
        total: 1,
      }).total,
    ).toBe(1)
  })

  test('rejects incomplete catalog records', () => {
    expect(() =>
      parseCatalogResponse({
        categories: [],
        items: [{ id: 'broken' }],
        page: 1,
        pageSize: 24,
        total: 1,
      }),
    ).toThrow('invalid response')
  })
})
