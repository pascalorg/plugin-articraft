import type { HandleDescriptor, NodeDefinition, ParametricDescriptor } from '@pascal-app/core'
import type { ArticraftAssetNode } from './schema'

/** Fields only an editor reads. Their lazy modules import `@pascal-app/editor`. */
export const ARTICRAFT_EDIT_FIELDS = [
  'snapProfile',
  'parametrics',
  'handles',
  'preview',
  'tool',
  'toolHints',
] as const

type EditField = (typeof ARTICRAFT_EDIT_FIELDS)[number]

const rotateHandle: HandleDescriptor<ArticraftAssetNode> = {
  kind: 'arc-resize',
  axis: 'angular',
  shape: 'rotate',
  apply: (initial, delta) => ({
    rotation: [
      initial.rotation[0],
      initial.rotation[1] - delta,
      initial.rotation[2],
    ] as [number, number, number],
  }),
  placement: {
    position: (node) => {
      const radius = Math.max(node.dimensions[0], node.dimensions[2]) * node.scale * 0.65
      return [radius, 0.08, radius]
    },
    rotationY: () => -Math.PI / 4,
  },
  decoration: {
    kind: 'ring',
    radius: (node) => Math.max(node.dimensions[0], node.dimensions[2]) * node.scale * 0.65,
    y: () => 0.08,
  },
}

const parametrics: ParametricDescriptor<ArticraftAssetNode> = {
  groups: [],
  trailingSection: () => import('./joint-controls'),
}

export const articraftAssetEditContribution: Pick<
  NodeDefinition<typeof ArticraftAssetNode>,
  EditField
> = {
  snapProfile: 'item',
  parametrics,
  handles: [rotateHandle],
  preview: () => import('./preview'),
  tool: () => import('./tool'),
  toolHints: [
    { key: 'Left click', label: 'Place articulated asset' },
    { key: 'Esc', label: 'Stop' },
  ],
}
