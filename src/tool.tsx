'use client'

import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { EDITOR_LAYER, triggerSFX } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { ArticraftAssetNode } from './schema'
import ArticraftPreview from './preview'
import { useArticraftPlacement } from './placement'
import { useArticraftStore } from './store'

export default function ArticraftTool() {
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const item = useArticraftStore((state) => state.selectedItem)
  const { cursorRef, cursorVisible } = useArticraftPlacement(activeLevelId, (position) => {
    if (!(activeLevelId && item)) return
    const node = ArticraftAssetNode.parse({
      name: item.title,
      position,
      rotation: [0, 0, 0],
      scale: 1,
      catalogId: item.id,
      title: item.title,
      source: item.source,
      artifact: item.artifact,
      thumbnailUrl: item.thumbnailUrl,
      dimensions: item.dimensions,
      parts: item.parts,
      joints: item.joints,
      jointValues: item.defaultJointValues,
      attribution: item.attribution,
      prompt: item.prompt,
    })
    useScene.getState().createNode(node as unknown as AnyNode, activeLevelId as AnyNodeId)
    useViewer.getState().setSelection({ selectedIds: [node.id as AnyNodeId] })
    triggerSFX('sfx:item-place')
  })

  if (!(activeLevelId && item)) return null

  return (
    <group layers={EDITOR_LAYER} ref={cursorRef} visible={cursorVisible}>
      <ArticraftPreview dimensions={item.dimensions} />
    </group>
  )
}
