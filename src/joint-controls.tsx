'use client'

import { type AnyNodeId, useScene } from '@pascal-app/core'
import { PanelSection, SliderControl } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useMemo, useRef, useState } from 'react'
import { setMotionPreview } from './motion-preview'
import type { ArticraftAssetNode } from './schema'
import type { ArticraftJoint } from './types'

export default function ArticraftJointControls() {
  const selectedId = useViewer((state) => state.selection.selectedIds[0]) as
    | AnyNodeId
    | undefined
  const node = useScene((state) => {
    const value = selectedId ? state.nodes[selectedId] : undefined
    return (value?.type as string | undefined) === 'articraft:asset'
      ? (value as unknown as ArticraftAssetNode)
      : null
  })
  const [previewing, setPreviewing] = useState(false)
  const frameRef = useRef<number | null>(null)
  const nodeId = node?.id ?? null
  const movable = useMemo(
    () => node?.joints.filter((joint) => joint.type !== 'fixed') ?? [],
    [node?.joints],
  )

  useEffect(() => {
    if (!(previewing && nodeId && node)) {
      if (nodeId) setMotionPreview(nodeId, null)
      return
    }

    const startedAt = performance.now()
    const animate = (now: number) => {
      const elapsed = (now - startedAt) / 1_000
      setMotionPreview(
        nodeId,
        Object.fromEntries(
          movable.map((joint, index) => {
            const [lower, upper] = rangeFor(joint)
            const progress = (Math.sin(elapsed * 1.4 + index * 0.7) + 1) / 2
            return [joint.name, lower + (upper - lower) * progress]
          }),
        ),
      )
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      setMotionPreview(nodeId, null)
    }
  }, [movable, node, nodeId, previewing])

  if (!node) return null

  const stopPreview = () => {
    setPreviewing(false)
    setMotionPreview(node.id, null)
  }

  const setJoint = (joint: ArticraftJoint, value: number) => {
    stopPreview()
    useScene.getState().updateNode(
      node.id as AnyNodeId,
      {
        jointValues: { ...node.jointValues, [joint.name]: value },
      } as never,
    )
  }

  const reset = () => {
    stopPreview()
    useScene.getState().updateNode(
      node.id as AnyNodeId,
      {
        jointValues: Object.fromEntries(movable.map((joint) => [joint.name, 0])),
      } as never,
    )
  }

  const setScale = (value: number) => {
    useScene.getState().updateNode(node.id as AnyNodeId, { scale: value } as never)
  }

  const setVector = (
    key: 'position' | 'rotation',
    index: 0 | 1 | 2,
    value: number,
  ) => {
    const next = [...node[key]] as [number, number, number]
    next[index] = key === 'rotation' ? toRadians(value) : value
    useScene.getState().updateNode(node.id as AnyNodeId, { [key]: next } as never)
  }

  return (
    <>
      <PanelSection title="Transform">
        <SliderControl
          label="Scale"
          max={20}
          min={0.05}
          onChange={setScale}
          precision={2}
          restoreOnCommit={false}
          step={0.05}
          value={node.scale}
        />
        {AXES.map(({ index, label }) => (
          <SliderControl
            key={`position-${label}`}
            label={`Position ${label}`}
            max={100}
            min={-100}
            onChange={(value) => setVector('position', index, value)}
            precision={2}
            restoreOnCommit={false}
            step={0.05}
            unit="m"
            value={node.position[index]}
          />
        ))}
        {AXES.map(({ index, label }) => (
          <SliderControl
            key={`rotation-${label}`}
            label={`Rotation ${label}`}
            max={180}
            min={-180}
            onChange={(value) => setVector('rotation', index, value)}
            precision={1}
            restoreOnCommit={false}
            step={1}
            unit="°"
            value={toDegrees(node.rotation[index])}
          />
        ))}
      </PanelSection>
      <PanelSection title="Articulation">
        {movable.length === 0 ? (
          <p style={{ color: 'var(--muted-foreground)', fontSize: 12, margin: 0 }}>
            This asset has no movable joints.
          </p>
        ) : (
          movable.map((joint) => {
            const range = rangeFor(joint)
            const angular = joint.type !== 'prismatic'
            const displayRange = angular
              ? ([toDegrees(range[0]), toDegrees(range[1])] as const)
              : range
            return (
              <SliderControl
                key={joint.name}
                label={joint.name}
                max={displayRange[1]}
                min={displayRange[0]}
                onChange={(value) => setJoint(joint, angular ? toRadians(value) : value)}
                precision={angular ? 1 : 3}
                restoreOnCommit={false}
                step={angular ? 1 : 0.001}
                unit={angular ? '°' : 'm'}
                value={angular
                  ? toDegrees(node.jointValues[joint.name] ?? 0)
                  : (node.jointValues[joint.name] ?? 0)}
              />
            )
          })
        )}
        {movable.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <button
              aria-pressed={previewing}
              onClick={() => setPreviewing((value) => !value)}
              style={buttonStyle(previewing)}
              type="button"
            >
              {previewing ? 'Stop preview' : 'Preview motion'}
            </button>
            <button onClick={reset} style={buttonStyle(false)} type="button">
              Reset pose
            </button>
          </div>
        )}
      </PanelSection>
      <PanelSection title="Source">
        <div style={{ color: 'var(--muted-foreground)', fontSize: 12, lineHeight: 1.5 }}>
          <div>{node.attribution.creator}</div>
          <div>{node.attribution.license}</div>
          <a href={node.attribution.sourceUrl} rel="noreferrer" target="_blank">
            Open source record
          </a>
        </div>
      </PanelSection>
    </>
  )
}

const AXES = [
  { index: 0, label: 'X' },
  { index: 1, label: 'Y' },
  { index: 2, label: 'Z' },
] as const

function rangeFor(joint: ArticraftJoint): [number, number] {
  if (joint.limits && joint.limits.upper > joint.limits.lower) {
    return [joint.limits.lower, joint.limits.upper]
  }
  return joint.type === 'prismatic' ? [-1, 1] : [-Math.PI, Math.PI]
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function buttonStyle(active: boolean) {
  return {
    background: active ? 'var(--primary)' : 'var(--secondary)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    color: active ? 'var(--primary-foreground)' : 'var(--secondary-foreground)',
    cursor: 'pointer',
    fontSize: 12,
    padding: '7px 12px',
  } as const
}
