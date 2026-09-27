import pytest

from articraft_worker.generation import _joints, _parts, _public_manifest, _title
from articraft_worker.models import Artifact, CatalogItem


def test_normalizes_viewer_metadata() -> None:
    parts = _parts([{"name": "lid", "usd_name": "lid_1"}])
    joints = _joints(
        [
            {
                "name": "hinge",
                "type": "revolute",
                "parent": "body",
                "child": "lid",
                "axis": [0, 1, 0],
                "origin": {"xyz": [1, 2, 3], "rpy": [0, 0, 0]},
                "motion_limits": {"lower": -1.2, "upper": 0.4},
            }
        ]
    )

    assert parts[0].objectName == "lid_1"
    assert joints[0].limits is not None
    assert joints[0].limits.lower == -1.2
    assert joints[0].axis == (0.0, 1.0, 0.0)


def test_title_is_bounded() -> None:
    assert _title("  a   folding desk lamp with a blue shade  ") == (
        "A folding desk lamp with a blue shade"
    )


def test_public_manifest_omits_generation_prompt() -> None:
    item = CatalogItem(
        id="generated:abc123",
        title="Folding lamp",
        artifact=Artifact(url="https://assets.invalid/model.usdz", sha256="abc123"),
        dimensions=(1.0, 1.0, 1.0),
        parts=[],
        joints=[],
        defaultJointValues={},
        prompt="private reconstruction details",
    )

    manifest = _public_manifest(item)

    assert "prompt" not in manifest
    assert manifest["id"] == "generated:abc123"


def test_frame_is_in_pascal_axes_and_metres(tmp_path) -> None:
    from pxr import Gf, Usd, UsdGeom

    from articraft_worker.generation import _frame

    # A Z-up stage in half-metre units holding one box: x 0.5..1.5, y 1..3,
    # z 1..5 in stage units, as mini-articraft writes its stages (Z up).
    path = tmp_path / "model.usda"
    stage = Usd.Stage.CreateNew(str(path))
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.z)
    UsdGeom.SetStageMetersPerUnit(stage, 0.5)
    UsdGeom.Xform.Define(stage, "/root")
    box = UsdGeom.Cube.Define(stage, "/root/box")
    box.GetSizeAttr().Set(2.0)
    box.AddTranslateOp().Set(Gf.Vec3d(1, 2, 3))
    box.AddScaleOp().Set(Gf.Vec3f(0.5, 1, 2))
    stage.GetRootLayer().Save()

    dimensions, offset = _frame(path)

    # Pascal is Y up in metres: (x, z, -y) x 0.5 spans x 0.25..0.75,
    # y 0.5..2.5, z -1.5..-0.5.
    assert dimensions == pytest.approx((0.5, 2.0, 1.0))
    # The offset stands that box on its bottom centre at the node origin.
    assert offset == pytest.approx((-0.5, -0.5, 1.0))
