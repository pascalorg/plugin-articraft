'use client'

import { useRegistry } from '@pascal-app/core'
import { useNodeEvents } from '@pascal-app/viewer'
import { useEffect, useRef, useState } from 'react'
import {
  Group,
  type Material,
  type Mesh,
  type Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { USDLoader } from 'three/examples/jsm/loaders/USDLoader.js'
import URDFLoader from 'urdf-loader'
import type { ArticraftAssetNode } from './schema'
import type { ArticraftJoint } from './types'

type LoadedArticulation = {
  root: Object3D
  setJointValue: (name: string, value: number) => void
}

export default function ArticraftRenderer({ node }: { node: ArticraftAssetNode }) {
  const ref = useRef<Group>(null)
  const [loaded, setLoaded] = useState<LoadedArticulation | null>(null)
  const [failed, setFailed] = useState(false)
  const handlers = useNodeEvents(node as never, node.type as never)
  useRegistry(node.id, node.type, ref as React.RefObject<Object3D>)

  useEffect(() => {
    let cancelled = false
    let owned: Object3D | null = null
    setLoaded(null)
    setFailed(false)

    const load = async () => {
      const next =
        node.artifact.format === 'urdf'
          ? await loadUrdf(node.artifact.url)
          : await loadUsdz(node.artifact.url, node.parts, node.joints)
      if (cancelled) {
        disposeObject(next.root)
        return
      }
      owned = next.root
      setLoaded(next)
    }

    void load().catch((error) => {
      if (cancelled) return
      console.error('[articraft] asset load failed', error)
      setFailed(true)
    })

    return () => {
      cancelled = true
      if (owned) disposeObject(owned)
    }
  }, [node.artifact.format, node.artifact.url, node.joints, node.parts])

  useEffect(() => {
    if (!loaded) return
    for (const [name, value] of Object.entries(node.jointValues)) {
      loaded.setJointValue(name, value)
    }
  }, [loaded, node.jointValues])

  return (
    <group
      {...handlers}
      position={node.position}
      ref={ref}
      rotation={node.rotation}
      scale={node.scale}
      visible={node.visible}
    >
      {loaded && <primitive object={loaded.root} />}
      {failed && (
        <mesh position={[0, node.dimensions[1] / 2, 0]}>
          <boxGeometry args={node.dimensions} />
          <meshStandardMaterial color="#ef4444" opacity={0.3} transparent wireframe />
        </mesh>
      )}
    </group>
  )
}

async function loadUrdf(url: string): Promise<LoadedArticulation> {
  const loader = new URDFLoader()
  loader.parseCollision = false
  loader.loadMeshCb = (meshUrl, manager, material, done) => {
    new OBJLoader(manager).load(
      meshUrl,
      (object) => {
        object.traverse((child) => {
          const mesh = child as Mesh
          if (!mesh.isMesh) return
          mesh.material = material
          mesh.castShadow = true
          mesh.receiveShadow = true
        })
        done(object)
      },
      undefined,
      (error) => done(new Group(), error instanceof Error ? error : new Error(String(error))),
    )
  }
  const robot = await loader.loadAsync(url)
  robot.rotation.x = -Math.PI / 2
  markShadows(robot)
  return {
    root: robot,
    setJointValue: (name, value) => robot.setJointValue(name, value),
  }
}

async function loadUsdz(
  url: string,
  parts: ArticraftAssetNode['parts'],
  joints: ArticraftAssetNode['joints'],
): Promise<LoadedArticulation> {
  const source = await new USDLoader().loadAsync(url)
  const root = buildUsdHierarchy(source, parts, joints)
  markShadows(root.root)
  return root
}

function buildUsdHierarchy(
  source: Group,
  parts: ArticraftAssetNode['parts'],
  joints: ArticraftAssetNode['joints'],
): LoadedArticulation {
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

  const root = new Group()
  const motionGroups = new Map<string, { group: Group; joint: ArticraftJoint }>()
  const children = new Set<string>()

  for (const joint of joints) {
    const parent = partObjects.get(joint.parent)
    const child = partObjects.get(joint.child)
    if (!(parent && child)) continue
    const frame = new Group()
    frame.position.fromArray(joint.origin.xyz)
    frame.rotation.set(...joint.origin.rpy, 'XYZ')
    const motion = new Group()
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

function markShadows(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
  })
}

function disposeObject(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials as Material[]) material.dispose()
  })
}
