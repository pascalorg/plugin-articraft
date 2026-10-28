import { describe, expect, test } from 'bun:test'
import { bottomCentreFrame, objExtent, urdfRestBounds } from './index'

// A 1 × 0.5 × 0.2 m base standing on z = 0, a lid hinged on its top edge
// (joint origin rotated a quarter turn about Z) carrying a Z-up cylinder, and
// a handle modelled in millimetres (mesh scale 0.001).
const URDF = `<?xml version="1.0"?>
<!-- comment <link name="ignored"/> -->
<robot name="box">
  <material name="red"><color rgba="1 0 0 1"/></material>
  <link name="base">
    <visual name="body">
      <origin xyz="0 0 0.1" rpy="0 0 0"/>
      <geometry><box size="1 0.5 0.2"/></geometry>
      <material name="red"/>
    </visual>
    <collision><geometry><box size="9 9 9"/></geometry></collision>
  </link>
  <link name="lid">
    <visual>
      <origin xyz="0 0 0.2"/>
      <geometry><cylinder radius="0.1" length="0.4"/></geometry>
    </visual>
    <visual>
      <origin xyz="0.3 0 0" rpy="0 0 0"/>
      <geometry><mesh filename="assets/handle.obj" scale="0.001 0.001 0.001"/></geometry>
    </visual>
  </link>
  <joint name="hinge" type="revolute">
    <parent link="base"/>
    <child link="lid"/>
    <origin xyz="0.2 0 0.2" rpy="0 0 1.5707963267948966"/>
    <axis xyz="0 1 0"/>
    <limit lower="0" upper="1.5" effort="1" velocity="1"/>
  </joint>
</robot>`

const handle = objExtent('# handle\nv 0 -10 0\nv 100 10 20\nvn 0 0 1\nf 1 2 1\n')

describe('rest-pose bounds', () => {
  test('reads an OBJ vertex extent', () => {
    expect(handle).toEqual({ min: [0, -10, 0], max: [100, 10, 20] })
    expect(objExtent('# no vertices\n')).toBeNull()
  })

  test('counts every visual with link, joint and visual origins and mesh scale, Y up', async () => {
    const bounds = await urdfRestBounds(URDF, async (filename) =>
      filename === 'assets/handle.obj' ? handle : null,
    )
    // URDF frame: base x ±0.5, y ±0.25, z 0..0.2. The lid frame sits at
    // (0.2, 0, 0.2) turned 90° about Z: its cylinder spans x 0.1..0.3,
    // y -0.1..0.1, z 0.2..0.6; its handle (0.3 m along lid x = world y)
    // spans x 0.19..0.21, y 0.3..0.4, z 0.2..0.22.
    // Pascal frame (x, z, -y): x -0.5..0.5, y 0..0.6, z -0.4..0.25.
    expect(bounds).not.toBeNull()
    const expected = { min: [-0.5, 0, -0.4], max: [0.5, 0.6, 0.25] }
    for (const key of ['min', 'max'] as const) {
      for (const axis of [0, 1, 2]) {
        expect(bounds?.[key][axis]).toBeCloseTo(expected[key][axis] ?? Number.NaN, 9)
      }
    }
  })

  test('returns null when nothing is visible', async () => {
    expect(await urdfRestBounds('<robot name="empty"><link name="a"/></robot>', async () => null)).toBeNull()
  })

  test('stands an asset that extends below its origin on its bottom centre', () => {
    const frame = bottomCentreFrame({ min: [-0.2, -0.35, 0.1], max: [0.6, 0.45, 0.5] })
    expect(frame.dimensions).toEqual([0.8, 0.8, 0.4])
    expect(frame.offset).toEqual([-0.2, 0.35, -0.3])
  })
})
