import { useInteractive } from '@pascal-app/core'
import { create } from 'zustand'

/**
 * Which placed assets are playing their motion. Playback is transient, like
 * Pascal's own mechanisms: never saved, undone or shared. The scene keeps only
 * each asset's rest pose (`jointValues`).
 *
 * Hosts whose core keeps single-switch mechanisms in `useInteractive`
 * (`mechanisms`, `setMechanism`) hold it there, so their Play/Stop, E key,
 * walkthrough and baked viewer drive the same state as the inspector. Older
 * hosts have no such map, and playback stays in this plugin's store.
 */
export const useArticraftMotion = create<{ playing: Record<string, true> }>(() => ({
  playing: {},
}))

/** The host's mechanism state, when its core has one. */
export type HostMechanisms = {
  mechanisms?: Readonly<Record<string, boolean>>
  setMechanism?: (nodeId: string, on: boolean) => void
}

/** Reads a host interactive state (typed per host core version) as its mechanism fields. */
export function hostMechanismsOf(state: object): HostMechanisms {
  return state as HostMechanisms
}

function hostMechanisms(): HostMechanisms | null {
  const state = hostMechanismsOf(useInteractive.getState())
  return typeof state.setMechanism === 'function' ? state : null
}

export function articraftMotionPlaying(nodeId: string): boolean {
  const host = hostMechanisms()
  return host
    ? host.mechanisms?.[nodeId] === true
    : useArticraftMotion.getState().playing[nodeId] === true
}

export function setArticraftMotionPlaying(nodeId: string, on: boolean): void {
  const host = hostMechanisms()
  if (host) {
    if ((host.mechanisms?.[nodeId] === true) !== on) host.setMechanism?.(nodeId, on)
    return
  }
  useArticraftMotion.setState((state) => {
    if ((state.playing[nodeId] === true) === on) return state
    const playing = { ...state.playing }
    if (on) playing[nodeId] = true
    else delete playing[nodeId]
    return { playing }
  })
}

/** Whether `nodeId` is playing, re-rendering when that changes. */
export function useArticraftMotionPlaying(nodeId: string | undefined): boolean {
  const hosted = useInteractive((state) =>
    nodeId ? hostMechanismsOf(state).mechanisms?.[nodeId] === true : false,
  )
  const local = useArticraftMotion((state) => (nodeId ? state.playing[nodeId] === true : false))
  return hostMechanisms() ? hosted : local
}
