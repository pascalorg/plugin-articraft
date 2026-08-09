'use client'

import { type AnyNodeId, useScene } from '@pascal-app/core'
import { PanelSection, SliderControl } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
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
  if (!node) return null
  const movable = node.joints.filter((joint) => joint.type !== 'fixed')

  const setJoint = (joint: ArticraftJoint, value: number) => {
    useScene.getState().updateNode(
      node.id as AnyNodeId,
      {
        jointValues: { ...node.jointValues, [joint.name]: value },
      } as never,
    )
  }

  const reset = () => {
    useScene.getState().updateNode(
      node.id as AnyNodeId,
      {
        jointValues: Object.fromEntries(movable.map((joint) => [joint.name, 0])),
      } as never,
    )
  }

  return (
    <>
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
          <button
            onClick={reset}
            style={{
              background: 'var(--secondary)',
              border: '1px solid var(--border)',
              borderRadius: 999,
              color: 'var(--secondary-foreground)',
              cursor: 'pointer',
              fontSize: 12,
              marginTop: 8,
              padding: '7px 12px',
            }}
            type="button"
          >
            Reset pose
          </button>
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
