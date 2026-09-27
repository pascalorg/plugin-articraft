'use client'

import { useSyncExternalStore } from 'react'
import type { ArticraftJoint } from './types'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const listeners = new Set<() => void>()
let mediaQuery: MediaQueryList | null = null

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  mediaQuery ??= window.matchMedia(REDUCED_MOTION_QUERY)
  return mediaQuery
}

function notifyMotionPreference(): void {
  for (const listener of listeners) listener()
}

function subscribeMotionPreference(listener: () => void): () => void {
  const query = getMediaQuery()
  listeners.add(listener)
  if (listeners.size === 1) query?.addEventListener('change', notifyMotionPreference)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) query?.removeEventListener('change', notifyMotionPreference)
  }
}

function getReducedMotionPreference(): boolean {
  return getMediaQuery()?.matches ?? false
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotionPreference,
    getReducedMotionPreference,
    () => false,
  )
}

/** Motion rate in radians per second: the sweep's angular frequency, and how fast continuous joints turn. */
export const MOTION_RATE = 1.4
/** One sweep of the limited joints, and one full turn of the continuous ones. */
export const MOTION_PERIOD_SECONDS = (Math.PI * 2) / MOTION_RATE

export function motionRange(joint: ArticraftJoint): [number, number] {
  if (joint.limits && joint.limits.upper > joint.limits.lower) {
    return [joint.limits.lower, joint.limits.upper]
  }
  return joint.type === 'prismatic' ? [-1, 1] : [-Math.PI, Math.PI]
}

export function motionValueAtTime(
  joint: ArticraftJoint,
  index: number,
  elapsedSeconds: number,
): number {
  // A wheel, fan or knob turns without end; sweeping it back and forth over ±π rocks it instead.
  if (joint.type === 'continuous') return elapsedSeconds * MOTION_RATE
  const hasLimits = joint.limits && joint.limits.upper > joint.limits.lower
  const lower = hasLimits
    ? joint.limits!.lower
    : joint.type === 'prismatic'
      ? -1
      : -Math.PI
  const upper = hasLimits
    ? joint.limits!.upper
    : joint.type === 'prismatic'
      ? 1
      : Math.PI
  const progress = (Math.sin(elapsedSeconds * MOTION_RATE + index * 0.7) + 1) / 2
  return lower + (upper - lower) * progress
}
