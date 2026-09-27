import { beforeEach, describe, expect, test } from 'bun:test'
import { articraftMotionPlaying, setArticraftMotionPlaying, useArticraftMotion } from './motion-state'

describe('Articraft playback state', () => {
  beforeEach(() => useArticraftMotion.setState({ playing: {} }))

  test('is stopped until started, per asset', () => {
    expect(articraftMotionPlaying('articraft_a')).toBe(false)
    setArticraftMotionPlaying('articraft_a', true)
    expect(articraftMotionPlaying('articraft_a')).toBe(true)
    expect(articraftMotionPlaying('articraft_b')).toBe(false)
    setArticraftMotionPlaying('articraft_a', false)
    expect(useArticraftMotion.getState().playing).toEqual({})
  })
})
