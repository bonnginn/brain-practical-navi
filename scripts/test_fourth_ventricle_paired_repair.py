import unittest
import numpy as np
from stage_fourth_ventricle_paired_repair import POINTS, replay


class PairedRepairTests(unittest.TestCase):
    def test_exact_reversible_patch(self):
        original = np.zeros((206,185,75),dtype=np.uint8)
        original[190,181,71] = 33
        new = replay(original,POINTS)
        self.assertEqual(np.count_nonzero(original != new),16)
        self.assertEqual(new[190,181,71],33)
        np.testing.assert_array_equal(replay(new,POINTS,True),original)

    def test_reject_wrong_coordinate_or_duplicate(self):
        original = np.zeros((206,185,75),dtype=np.uint8)
        with self.assertRaises(ValueError):
            replay(original,POINTS[:-1]+[POINTS[0]])
        with self.assertRaises(ValueError):
            replay(original,POINTS[:-1]+[(204,183,72)])

    def test_reject_nonzero(self):
        original = np.zeros((206,185,75),dtype=np.uint8)
        original[POINTS[0]] = 27
        with self.assertRaises(ValueError):
            replay(original,POINTS)


if __name__ == '__main__':
    unittest.main()
