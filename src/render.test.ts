import { afterEach, describe, expect, test } from 'bun:test'
import { getNodePluginId, loadPlugin, nodeRegistry } from '@pascal-app/core'
import { ARTICRAFT_EDIT_FIELDS } from './definition.edit'
import { articraftPlugin } from './index'
import { articraftRenderPlugin } from './render'

afterEach(() => nodeRegistry._reset())

describe('Articraft render entry', () => {
  test('registers the same kinds, schemas and defaults as the editor plugin', () => {
    expect(articraftRenderPlugin.id).toBe(articraftPlugin.id)
    expect(articraftRenderPlugin.apiVersion).toBe(articraftPlugin.apiVersion)
    const root = articraftPlugin.nodes ?? []
    expect(articraftRenderPlugin.nodes.map((node) => node.kind)).toEqual(
      root.map((node) => node.kind),
    )
    articraftRenderPlugin.nodes.forEach((node, index) => {
      const full = root[index]!
      expect(node.schema).toBe(full.schema)
      expect(node.schemaVersion).toBe(full.schemaVersion)
      expect(node.defaults()).toEqual(full.defaults())
      expect(node.renderer).toBe(full.renderer)
      expect(node.floorplan).toBe(full.floorplan)
      expect(node.exportAnimation).toBe(full.exportAnimation)
    })
  })

  test('carries no edit-only fields, which the editor plugin still has', () => {
    for (const node of articraftRenderPlugin.nodes) {
      for (const field of ARTICRAFT_EDIT_FIELDS) expect(node).not.toHaveProperty(field)
    }
    for (const node of articraftPlugin.nodes ?? []) {
      for (const field of ARTICRAFT_EDIT_FIELDS) expect(node).toHaveProperty(field)
    }
  })

  test('loads into the registry under the saved plugin id', async () => {
    nodeRegistry._reset()
    await loadPlugin(articraftRenderPlugin)
    expect(nodeRegistry.get('articraft:asset')?.schema).toBe(
      articraftRenderPlugin.nodes[0]!.schema,
    )
    expect(getNodePluginId('articraft:asset')).toBe('pascal:articraft')
  })
})
