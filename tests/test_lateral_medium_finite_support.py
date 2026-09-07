import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from audit_lateral_medium_finite_support import finite_stats


class FiniteSupportTest(unittest.TestCase):
    def test_exact_single_cell_excludes_touching_neighbors(self):
        raw = np.zeros((3, 3, 3), dtype=np.uint16); raw[1, 1, 1] = 65535
        r = finite_stats(raw, [.5]*3, [1.5]*3)
        self.assertEqual(r['sourceCells'], 1)
        self.assertEqual(r['sourceMin'], 65535)
        self.assertEqual(r['below65000VolumeFraction'], 0)

    def test_weighted_overlap_not_unweighted_cell_count(self):
        raw = np.full((3, 3, 3), 65535, dtype=np.uint16); raw[0, 1, 1] = 60000
        r = finite_stats(raw, [.25, .5, .5], [1.25, 1.5, 1.5])
        self.assertEqual(r['sourceCells'], 2)
        self.assertAlmostEqual(r['below65000VolumeFraction'], .25)
        self.assertAlmostEqual(r['weightedMean'], 60000*.25 + 65535*.75)
        self.assertEqual(r['minimumCellXYZ'], [0, 1, 1])

    def test_invalid_or_outside_box_rejected(self):
        raw = np.zeros((3, 3, 3), dtype=np.uint16)
        for lo, hi in [([0]*3, [0]*3), ([-2]*3, [0]*3), ([0]*3, [float('nan')]*3)]:
            with self.assertRaises(ValueError):
                finite_stats(raw, lo, hi)


if __name__ == '__main__':
    unittest.main()
