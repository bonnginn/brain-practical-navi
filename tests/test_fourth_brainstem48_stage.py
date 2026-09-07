import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from stage_fourth_brainstem48 import replay


class BrainstemCavityReplay(unittest.TestCase):
    def setUp(self):
        self.labels = np.zeros((8, 8, 8), dtype=np.uint8)
        self.points = np.argwhere(np.ones((3, 4, 4), dtype=bool))
        self.labels[tuple(self.points.T)] = 27

    def test_exact_reversible_reclassification(self):
        changed = replay(self.labels, self.points)
        self.assertEqual(np.count_nonzero(changed != self.labels), 48)
        self.assertTrue(np.array_equal(replay(changed, self.points, True), self.labels))
        self.assertEqual(np.count_nonzero(self.labels == 27), 48)

    def test_rejects_wrong_source_label(self):
        self.labels[tuple(self.points[0])] = 0
        with self.assertRaises(ValueError): replay(self.labels, self.points)

    def test_rejects_invalid_points(self):
        for bad in (self.points[:-1], self.points.astype(float), self.points-1,
                    np.repeat(self.points[:1], 48, axis=0), self.points+100):
            with self.subTest(shape=bad.shape):
                with self.assertRaises(ValueError): replay(self.labels, bad)


if __name__ == '__main__': unittest.main()
