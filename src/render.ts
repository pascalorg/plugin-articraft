import type { AnyNodeDefinition, Plugin } from '@pascal-app/core'
import { articraftAssetRenderDefinition } from './definition.render'

/** Render-only Articraft plugin for read-only viewers: no `@pascal-app/editor`. */
export const articraftRenderPlugin = {
  id: 'pascal:articraft',
  apiVersion: 1,
  nodes: [articraftAssetRenderDefinition as unknown as AnyNodeDefinition],
} satisfies Plugin

export { articraftAssetRenderDefinition } from './definition.render'
export { ArticraftAssetNode } from './schema'
