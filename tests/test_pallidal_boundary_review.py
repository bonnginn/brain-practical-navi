import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from render_pallidal_boundary_review import review_planes, reference_crop


class PallidalReviewTests(unittest.TestCase):
    def test_all_xy_plus_neighbors_and_fixed_upper_z(self):
        points = np.array([[218, 230, 127], [253, 289, 159], [215, 237, 129]])
        before = points.copy()
        planes = review_planes(points, (394, 466, 378))
        self.assertEqual([i for axis, i in planes if axis == 'x'], list(range(214, 255)))
        self.assertEqual([i for axis, i in planes if axis == 'y'], list(range(229, 291)))
        self.assertEqual([i for axis, i in planes if axis == 'z'], list(range(147, 161)))
        self.assertEqual(len(planes), len(set(planes)))
        np.testing.assert_array_equal(points, before)

    def test_edge_clamping_and_invalid_points(self):
        self.assertEqual(review_planes(np.array([[0, 0, 0]]), (1, 1, 1)), [('x', 0), ('y', 0)])
        for points in ([], [[1, 2]], [[0.5, 1, 1]], [[-1, 1, 1]], [[394, 1, 1]]):
            with self.assertRaises(ValueError):
                review_planes(points, (394, 466, 378))

    def test_reference_addressing_of_all_axes(self):
        x, y, z = np.indices((5, 6, 7))
        volume = 100*x+10*y+z
        crop = dict(min=[1, 2, 3], max=[3, 4, 5])
        for axis, first, last in [('x', 225, 243), ('y', 125, 323), ('z', 142, 322)]:
            result = reference_crop(volume, axis, 2, crop)
            self.assertEqual(result.shape, (3, 3))
            self.assertEqual(result[0, 0], first)
            self.assertEqual(result[-1, -1], last)


if __name__ == '__main__':
    unittest.main()
