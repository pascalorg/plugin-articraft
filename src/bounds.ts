import type { Vec3 } from './types'

/** Axis-aligned bounds in the frame Pascal renders an asset in: Y up, metres. */
export type Bounds = { min: Vec3; max: Vec3 }

/** Where a mesh's vertices lie in its own frame, before the visual's `scale`. */
export type MeshExtent = { min: Vec3; max: Vec3 }

type XmlElement = { name: string; attributes: Record<string, string>; children: XmlElement[] }
type Matrix = number[] // 4 × 4, row-major

const IDENTITY: Matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/**
 * The rest-pose bounds of a URDF (every joint at 0) in Pascal's frame: the
 * URDF's Z-up axes turned Y-up, as the renderer turns the loaded robot
 * (`rotation.x = -π/2`). Every visual counts (box, cylinder, sphere, mesh)
 * through its link, joint and visual origins and the mesh `scale`; a
 * rotated visual contributes the bounds of its turned box. `meshExtent`
 * resolves a mesh `filename` as written in the URDF. Null when nothing is
 * visible.
 */
export async function urdfRestBounds(
  urdf: string,
  meshExtent: (filename: string) => Promise<MeshExtent | null>,
): Promise<Bounds | null> {
  const robot = parseXml(urdf).find((element) => element.name === 'robot')
  if (!robot) return null
  const links = robot.children.filter((element) => element.name === 'link')
  const jointByChild = new Map<string, XmlElement>()
  for (const joint of robot.children.filter((element) => element.name === 'joint')) {
    const child = childNamed(joint, 'child')?.attributes.link
    if (child) jointByChild.set(child, joint)
  }
  const worldByLink = new Map<string, Matrix>()
  const world = (link: string, visiting = new Set<string>()): Matrix => {
    const known = worldByLink.get(link)
    if (known) return known
    const joint = jointByChild.get(link)
    const parent = joint && childNamed(joint, 'parent')?.attributes.link
    // A root link, or a cycle the URDF should not have, sits at the origin.
    const matrix =
      joint && parent && !visiting.has(parent)
        ? multiply(world(parent, visiting.add(link)), originOf(joint))
        : IDENTITY
    worldByLink.set(link, matrix)
    return matrix
  }

  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const link of links) {
    const linkWorld = world(link.attributes.name ?? '')
    for (const visual of link.children.filter((element) => element.name === 'visual')) {
      const extent = await visualExtent(visual, meshExtent)
      if (!extent) continue
      const matrix = multiply(linkWorld, originOf(visual))
      for (const x of [extent.min[0], extent.max[0]]) {
        for (const y of [extent.min[1], extent.max[1]]) {
          for (const z of [extent.min[2], extent.max[2]]) {
            const point = transform(matrix, [x, y, z])
            for (const axis of [0, 1, 2] as const) {
              min[axis] = Math.min(min[axis], point[axis])
              max[axis] = Math.max(max[axis], point[axis])
            }
          }
        }
      }
    }
  }
  if (!min.every(Number.isFinite)) return null
  // URDF (x, y, z) Z up → Pascal (x, z, -y) Y up.
  return { min: [min[0], min[2], -max[1]], max: [max[0], max[2], -min[1]] }
}

/**
 * The footprint and the offset that stand an asset on its bottom centre at the
 * node's origin: the renderer moves the loaded asset by `offset` (before the
 * node's scale), so its rest pose rests on the floor, centred on the node,
 * like the placeholder box. Rounded to 0.1 mm.
 */
export function bottomCentreFrame(bounds: Bounds): { dimensions: Vec3; offset: Vec3 } {
  const [minX, minY, minZ] = bounds.min
  const [maxX, maxY, maxZ] = bounds.max
  return {
    dimensions: [
      round(Math.max(maxX - minX, 0.001)),
      round(Math.max(maxY - minY, 0.001)),
      round(Math.max(maxZ - minZ, 0.001)),
    ],
    offset: [round(-(minX + maxX) / 2), round(-minY), round(-(minZ + maxZ) / 2)],
  }
}

/** The extent of an OBJ's `v x y z` vertices, null when it has none. */
export function objExtent(obj: string): MeshExtent | null {
  const min: Vec3 = [Infinity, Infinity, Infinity]
  const max: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const line of obj.split('\n')) {
    if (!line.startsWith('v ')) continue
    const values = line.trim().split(/\s+/).slice(1, 4).map(Number)
    if (values.length !== 3 || !values.every(Number.isFinite)) continue
    for (const axis of [0, 1, 2] as const) {
      min[axis] = Math.min(min[axis], values[axis] as number)
      max[axis] = Math.max(max[axis], values[axis] as number)
    }
  }
  return min.every(Number.isFinite) ? { min, max } : null
}

async function visualExtent(
  visual: XmlElement,
  meshExtent: (filename: string) => Promise<MeshExtent | null>,
): Promise<MeshExtent | null> {
  const shape = childNamed(visual, 'geometry')?.children[0]
  if (!shape) return null
  const number = (name: string) => Number(shape.attributes[name])
  if (shape.name === 'box') {
    const [x, y, z] = vector(shape.attributes.size, [0, 0, 0])
    return { min: [-x / 2, -y / 2, -z / 2], max: [x / 2, y / 2, z / 2] }
  }
  if (shape.name === 'cylinder') {
    const radius = number('radius')
    const half = number('length') / 2
    if (!(Number.isFinite(radius) && Number.isFinite(half))) return null
    return { min: [-radius, -radius, -half], max: [radius, radius, half] }
  }
  if (shape.name === 'sphere') {
    const radius = number('radius')
    return Number.isFinite(radius)
      ? { min: [-radius, -radius, -radius], max: [radius, radius, radius] }
      : null
  }
  if (shape.name === 'mesh' && shape.attributes.filename) {
    const extent = await meshExtent(shape.attributes.filename)
    if (!extent) return null
    const scale = vector(shape.attributes.scale, [1, 1, 1])
    const a = extent.min.map((value, axis) => value * (scale[axis] ?? 1)) as Vec3
    const b = extent.max.map((value, axis) => value * (scale[axis] ?? 1)) as Vec3
    return {
      min: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])],
      max: [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])],
    }
  }
  return null
}

/** A URDF `<origin xyz rpy>` (fixed-axis roll, pitch, yaw) as a matrix. */
function originOf(element: XmlElement): Matrix {
  const origin = childNamed(element, 'origin')
  const [x, y, z] = vector(origin?.attributes.xyz, [0, 0, 0])
  const [roll, pitch, yaw] = vector(origin?.attributes.rpy, [0, 0, 0])
  const [cr, sr, cp, sp, cy, sy] = [
    Math.cos(roll),
    Math.sin(roll),
    Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw),
    Math.sin(yaw),
  ]
  // R = Rz(yaw) · Ry(pitch) · Rx(roll)
  return [
    cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr, x,
    sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr, y,
    -sp, cp * sr, cp * cr, z,
    0, 0, 0, 1,
  ]
}

function multiply(a: Matrix, b: Matrix): Matrix {
  const out: Matrix = new Array(16).fill(0)
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let sum = 0
      for (let k = 0; k < 4; k += 1) sum += (a[row * 4 + k] ?? 0) * (b[k * 4 + column] ?? 0)
      out[row * 4 + column] = sum
    }
  }
  return out
}

function transform(m: Matrix, [x, y, z]: Vec3): Vec3 {
  const at = (index: number) => m[index] ?? 0
  return [
    at(0) * x + at(1) * y + at(2) * z + at(3),
    at(4) * x + at(5) * y + at(6) * z + at(7),
    at(8) * x + at(9) * y + at(10) * z + at(11),
  ]
}

function vector(value: string | undefined, fallback: Vec3): Vec3 {
  const parts = value?.trim().split(/\s+/).map(Number)
  return parts?.length === 3 && parts.every(Number.isFinite) ? (parts as Vec3) : fallback
}

function childNamed(element: XmlElement, name: string): XmlElement | undefined {
  return element.children.find((child) => child.name === name)
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000 + 0
}

/** Elements of a small XML document (URDF): declarations and comments skipped. */
function parseXml(source: string): XmlElement[] {
  const roots: XmlElement[] = []
  const stack: XmlElement[] = []
  const tag = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/\s*([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g
  for (const match of source.matchAll(tag)) {
    const [, closing, name, rawAttributes, selfClosing] = match
    if (closing) {
      stack.pop()
      continue
    }
    if (!name) continue
    const attributes: Record<string, string> = {}
    for (const attribute of (rawAttributes ?? '').matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attributes[attribute[1] as string] = attribute[2] ?? attribute[3] ?? ''
    }
    const element: XmlElement = { name, attributes, children: [] }
    const parent = stack.at(-1)
    if (parent) parent.children.push(element)
    else roots.push(element)
    if (!selfClosing) stack.push(element)
  }
  return roots
}
