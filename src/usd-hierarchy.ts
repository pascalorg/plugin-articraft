import { Group, type Object3D, Quaternion, Vector3 } from 'three'
import { markArticraftJointTarget } from './animation'
import type { ArticraftAssetNode } from './schema'
import type { ArticraftJoint } from './types'

export type LoadedArticulationSource = {
  root: Object3D
  setJointValue: (name: string, value: number) => void
}

/**
 * Rebuilds a mini-articraft USDZ as a joint tree: each part under its parent
 * through the joint's frame and a motion group the joint value drives.
 */
export function buildUsdHierarchy(
  source: Group,
  parts: ArticraftAssetNode['parts'],
  joints: ArticraftAssetNode['joints'],
): LoadedArticulationSource {
  if (parts.length === 0) {
    return { root: source, setJointValue: () => undefined }
  }

  const scope = source.getObjectByName('parts') ?? source
  const partObjects = new Map<string, Object3D>()
  for (const part of parts) {
    const object = scope.getObjectByName(part.objectName ?? part.name)
    if (!object) continue
    object.removeFromParent()
    object.position.set(0, 0, 0)
    object.quaternion.identity()
    object.scale.set(1, 1, 1)
    partObjects.set(part.name, object)
  }

  if (partObjects.size === 0) {
    return { root: source, setJointValue: () => undefined }
  }

  // The loader turns the stage's Z up to Y up and applies metersPerUnit on the
  // group it returns; the rebuilt tree keeps that frame.
  const root = new Group()
  root.position.copy(source.position)
  root.quaternion.copy(source.quaternion)
  root.scale.copy(source.scale)
  const motionGroups = new Map<string, { group: Group; joint: ArticraftJoint }>()
  const children = new Set<string>()

  for (const joint of joints) {
    const parent = partObjects.get(joint.parent)
    const child = partObjects.get(joint.child)
    if (!(parent && child)) continue
    const frame = new Group()
    frame.position.fromArray(joint.origin.xyz)
    // URDF roll, pitch, yaw are fixed-axis: R = Rz(yaw) · Ry(pitch) · Rx(roll).
    frame.rotation.set(...joint.origin.rpy, 'ZYX')
    const motion = new Group()
    if (joint.type !== 'fixed') markArticraftJointTarget(motion, joint.name)
    frame.add(motion)
    motion.add(child)
    parent.add(frame)
    motionGroups.set(joint.name, { group: motion, joint })
    children.add(joint.child)
  }

  for (const [name, object] of partObjects) {
    if (!children.has(name)) root.add(object)
  }

  return {
    root,
    setJointValue: (name, value) => {
      const entry = motionGroups.get(name)
      if (!entry || entry.joint.type === 'fixed') return
      entry.group.position.set(0, 0, 0)
      entry.group.quaternion.identity()
      const axis = new Vector3(...entry.joint.axis).normalize()
      if (entry.joint.type === 'prismatic') {
        entry.group.position.copy(axis.multiplyScalar(value))
      } else {
        entry.group.quaternion.copy(new Quaternion().setFromAxisAngle(axis, value))
      }
    },
  }
}
