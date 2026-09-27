'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useMemo } from 'react'
import { catalogNode } from './catalog-node'
import { ArticraftVisual } from './renderer'
import { useArticraftPlacement } from './placement'
import { useArticraftStore } from './store'

export default function ArticraftTool() {
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const item = useArticraftStore((state) => state.selectedItem)
  const previewNode = useMemo(() => (item ? catalogNode(item, [0, 0, 0]) : null), [item])
  const { cursorRef, cursorVisible } = useArticraftPlacement(activeLevelId, (position) => {
    if (!(activeLevelId && item)) return
    const node = catalogNode(item, position)
    useScene.getState().createNode(node as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [node.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
  })

  if (!(activeLevelId && item && previewNode)) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <ArticraftVisual ghost node={previewNode} />
    </group>
  )
}
