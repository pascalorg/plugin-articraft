import { describe, expect, test } from 'bun:test'
import { Euler, Group, Object3D, Quaternion, Vector3 } from 'three'
import { buildUsdHierarchy } from './usd-hierarchy'
import type { ArticraftJoint } from './types'

// What three's USDLoader returns for a mini-articraft stage: a root group that
// carries the stage's Z-up turn and metersPerUnit scale, holding a `parts` scope.
function loadedStage(): Group {
  const source = new Group()
  source.rotation.x = -Math.PI / 2
  source.scale.setScalar(0.5)
  const scope = new Group()
  scope.name = 'parts'
  for (const name of ['base_1', 'lid_1']) {
    const part = new Object3D()
    part.name = name
    scope.add(part)
  }
  source.add(scope)
  return source
}

const parts = [
  { name: 'base', objectName: 'base_1' },
  { name: 'lid', objectName: 'lid_1' },
]
const lift: ArticraftJoint = {
  name: 'lift',
  type: 'prismatic',
  parent: 'base',
  child: 'lid',
  axis: [0, 0, 1],
  origin: { xyz: [0, 0, 1], rpy: [0, 0, 0] },
  limits: { lower: 0, upper: 1 },
}

function worldPosition(root: Object3D, name: string): Vector3 {
  root.updateMatrixWorld(true)
  const object = root.getObjectByName(name)
  return object ? object.getWorldPosition(new Vector3()) : new Vector3(Number.NaN)
}

describe('USDZ joint tree', () => {
  test("keeps the stage's up axis and unit scale", () => {
    const { root } = buildUsdHierarchy(loadedStage(), parts, [lift])
    // 1 unit up the stage's Z is 0.5 m up Pascal's Y.
    expect(worldPosition(root, 'lid_1').distanceTo(new Vector3(0, 0.5, 0))).toBeLessThan(1e-9)
  })

  test('turns joint frames by URDF roll, pitch, yaw like the URDF path', () => {
    const rpy: [number, number, number] = [0.3, 0.4, 0.5]
    const source = loadedStage()
    source.rotation.set(0, 0, 0)
    source.scale.setScalar(1)
    const { root } = buildUsdHierarchy(source, parts, [{ ...lift, origin: { xyz: [0, 0, 0], rpy } }])
    root.updateMatrixWorld(true)
    const lid = root.getObjectByName('lid_1')
    const turned = lid?.getWorldQuaternion(new Quaternion())
    const expected = new Quaternion().setFromEuler(new Euler(...rpy, 'ZYX'))
    expect(turned?.angleTo(expected)).toBeLessThan(1e-9)
  })
})
