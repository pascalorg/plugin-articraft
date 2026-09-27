import { describe, expect, test } from 'bun:test'
import { runProbe } from './test-support/host-stubs'

describe('Articraft inspector', () => {
  test('every slider drag commits as one undo step (restoreOnCommit left on)', () => {
    const sliders = runProbe<Array<{ label: string; restoreOnCommit: unknown }>>(
      new URL('./test-support/joint-controls-probe.tsx', import.meta.url).pathname,
    )
    expect(sliders.map((slider) => slider.label)).toEqual([
      'Scale',
      'Position X',
      'Position Y',
      'Position Z',
      'Rotation X',
      'Rotation Y',
      'Rotation Z',
      'lid',
      'drawer',
    ])
    expect(sliders.filter((slider) => slider.restoreOnCommit === false)).toEqual([])
  })
})
