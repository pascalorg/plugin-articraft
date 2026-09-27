import { ArticraftAssetNode } from './schema'
import type { ArticraftCatalogItem, Vec3 } from './types'

/** The node placing a catalog item creates: its artifact, joint graph and rest pose. */
export function catalogNode(item: ArticraftCatalogItem, position: Vec3): ArticraftAssetNode {
  return ArticraftAssetNode.parse({
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
    offset: item.offset,
    parts: item.parts,
    joints: item.joints,
    jointValues: item.defaultJointValues,
    attribution: item.attribution,
    prompt: item.prompt,
  })
}
