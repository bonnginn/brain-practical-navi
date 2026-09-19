import importlib.util
import unittest
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "build_fornix_continuation_draft",
    ROOT / "scripts/build_fornix_continuation_draft.py",
)
BUILDER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(BUILDER)


class ContinuationBuilderGeometryTest(unittest.TestCase):
    def test_interpolation_and_inside_outside_for_synthetic_xz_xy(self):
        # Deliberately asymmetric polygons make an accidental x/z reuse visible.
        xz = {
            880: np.array([[10.0, 20.0], [18.0, 21.0], [16.0, 30.0], [11.0, 29.0]]),
            900: np.array([[14.0, 24.0], [23.0, 25.0], [21.0, 36.0], [15.0, 34.0]]),
        }
        xy = {
            554: np.array([[60.0, 80.0], [72.0, 81.0], [69.0, 91.0], [61.0, 89.0]]),
            592: np.array([[64.0, 84.0], [78.0, 85.0], [75.0, 98.0], [65.0, 95.0]]),
        }
        xz_mid = BUILDER.interpolated_polygon(xz, 890)
        xy_mid = BUILDER.interpolated_polygon(xy, 573)
        np.testing.assert_allclose(xz_mid, (xz[880] + xz[900]) / 2)
        np.testing.assert_allclose(xy_mid, (xy[554] + xy[592]) / 2)

        _, xz_axes, _ = BUILDER.contour_layout("contoursNativeXZ")
        _, xy_axes, _ = BUILDER.contour_layout("contoursNativeXY")
        xz_inside = np.zeros(3)
        xz_inside[list(xz_axes)] = xz_mid.mean(axis=0)
        xy_inside = np.zeros(3)
        xy_inside[list(xy_axes)] = xy_mid.mean(axis=0)
        self.assertTrue(BUILDER.inside(xz_inside[list(xz_axes)], xz_mid))
        self.assertTrue(BUILDER.inside(xy_inside[list(xy_axes)], xy_mid))
        self.assertFalse(BUILDER.inside(xz_inside[list(xz_axes)] + 100, xz_mid))
        self.assertFalse(BUILDER.inside(xy_inside[list(xy_axes)] + 100, xy_mid))

    def test_non_integer_anchor_is_rejected_without_rounding(self):
        with self.assertRaisesRegex(ValueError, "integer without rounding"):
            BUILDER.integer_number("592.001", "synthetic anchor")
        self.assertEqual(BUILDER.integer_number("592", "synthetic anchor"), 592)


if __name__ == "__main__":
    unittest.main()
