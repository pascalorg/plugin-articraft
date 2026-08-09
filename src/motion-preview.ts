type JointValues = Record<string, number>
type Listener = () => void

const valuesByNode = new Map<string, JointValues>()
const listenersByNode = new Map<string, Set<Listener>>()

export function getMotionPreview(nodeId: string): JointValues | null {
  return valuesByNode.get(nodeId) ?? null
}

export function subscribeMotionPreview(nodeId: string, listener: Listener): () => void {
  const listeners = listenersByNode.get(nodeId) ?? new Set<Listener>()
  listeners.add(listener)
  listenersByNode.set(nodeId, listeners)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) listenersByNode.delete(nodeId)
  }
}

export function setMotionPreview(nodeId: string, values: JointValues | null): void {
  if (values) valuesByNode.set(nodeId, values)
  else valuesByNode.delete(nodeId)
  for (const listener of listenersByNode.get(nodeId) ?? []) listener()
}
