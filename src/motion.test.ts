import { describe, expect, test } from 'bun:test'
import { motionRange, motionValueAtTime } from './motion'
import type { ArticraftJoint } from './types'

const hinge: ArticraftJoint = {
  name: 'hinge',
  type: 'revolute',
  parent: 'base',
  child: 'lid',
  axis: [0, 0, 1],
  origin: { xyz: [0, 0, 0], rpy: [0, 0, 0] },
  limits: { lower: -0.5, upper: 1.5 },
}

describe('persistent articulation motion', () => {
  test('sweeps a joint smoothly through its authored limits', () => {
    expect(motionValueAtTime(hinge, 0, 0)).toBeCloseTo(0.5, 8)
    expect(motionValueAtTime(hinge, 0, Math.PI / 2 / 1.4)).toBeCloseTo(1.5, 8)
  })

  test('spins a continuous joint one full turn per loop instead of rocking it', () => {
    const wheel: ArticraftJoint = { ...hinge, type: 'continuous', limits: null }
    const period = (Math.PI * 2) / 1.4
    const samples = Array.from({ length: 9 }, (_, step) =>
      motionValueAtTime(wheel, 0, (step / 8) * period),
    )
    for (const [step, value] of samples.entries()) {
      expect(value).toBeCloseTo((step / 8) * Math.PI * 2, 8)
    }
    expect(motionValueAtTime(wheel, 0, period * 3)).toBeCloseTo(Math.PI * 6, 8)
  })

  test('provides a bounded fallback for joints without limits', () => {
    expect(motionRange({ ...hinge, type: 'continuous', limits: null })).toEqual([
      -Math.PI,
      Math.PI,
    ])
    expect(motionRange({ ...hinge, type: 'prismatic', limits: null })).toEqual([-1, 1])
  })
})
