import { describe, expect, test } from 'bun:test'
import {
  getMotionPreview,
  setMotionPreview,
  subscribeMotionPreview,
} from './motion-preview'

describe('transient articulation preview', () => {
  test('notifies the renderer without persisting values in a node', () => {
    const nodeId = 'articraft:test'
    let notifications = 0
    const unsubscribe = subscribeMotionPreview(nodeId, () => {
      notifications += 1
    })

    setMotionPreview(nodeId, { hinge: 0.75 })
    expect(getMotionPreview(nodeId)).toEqual({ hinge: 0.75 })

    setMotionPreview(nodeId, null)
    expect(getMotionPreview(nodeId)).toBeNull()
    expect(notifications).toBe(2)
    unsubscribe()
  })
})
