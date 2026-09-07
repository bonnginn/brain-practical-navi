import unittest
import numpy as np
from stage_third_ventricle_core_repair import replay


class RepairTest(unittest.TestCase):
    def test_exact_reversible_change(self):
        old = np.zeros((3, 3, 3), dtype=np.uint8)
        old[0, 0, 0] = 39
        points = [dict(xyz=[1, 1, 1], before=0, after=25)]
        new = replay(old, points)
        self.assertEqual(np.count_nonzero(new != old), 1)
        self.assertEqual(new[0, 0, 0], 39)
        np.testing.assert_array_equal(replay(new, points, True), old)

    def test_invalid_changes_rejected(self):
        old = np.zeros((3, 3, 3), dtype=np.uint8)
        valid = dict(xyz=[1, 1, 1], before=0, after=25)
        for points in ([valid, valid], [dict(valid, xyz=[-1, 1, 1])],
                       [dict(valid, xyz=[3, 1, 1])], [dict(valid, xyz=[1.0, 1, 1])],
                       [dict(valid, after=23)], [dict(valid, before=39)]):
            with self.subTest(points=points), self.assertRaises(ValueError):
                replay(old, points)
        old[1, 1, 1] = 39
        with self.assertRaises(ValueError):
            replay(old, [valid])
        with self.assertRaises(ValueError):
            replay(old, [valid], True)


if __name__ == '__main__':
    unittest.main()
