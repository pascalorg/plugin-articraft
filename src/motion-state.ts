import { create } from 'zustand'

/**
 * Which placed assets are playing their motion. Playback is transient, like
 * Pascal's own mechanisms: never saved, undone or shared. The scene keeps only
 * each asset's rest pose (`jointValues`).
 */
export const useArticraftMotion = create<{ playing: Record<string, true> }>(() => ({
  playing: {},
}))

export function articraftMotionPlaying(nodeId: string): boolean {
  return useArticraftMotion.getState().playing[nodeId] === true
}

export function setArticraftMotionPlaying(nodeId: string, on: boolean): void {
  useArticraftMotion.setState((state) => {
    if ((state.playing[nodeId] === true) === on) return state
    const playing = { ...state.playing }
    if (on) playing[nodeId] = true
    else delete playing[nodeId]
    return { playing }
  })
}
