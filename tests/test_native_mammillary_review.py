import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from render_native_mammillary_review import plane_indices
from build_orthogonal_review_bundle import _oriented_crop


class NativePlanes(unittest.TestCase):
    def test_matches_existing_orientation_on_every_axis(self):
        volume = np.arange(7*8*9).reshape(7,8,9)
        crop = {'min':[1,2,3], 'max':[5,6,7]}
        for axis in 'xyz':
            indices = plane_indices(axis,4,crop)
            sampled = volume[tuple(indices.reshape(-1,3).T)].reshape(indices.shape[:2])
            np.testing.assert_array_equal(sampled,_oriented_crop(volume,axis,4,crop))

    def test_rejects_outside_plane(self):
        with self.assertRaises(ValueError):
            plane_indices('x',0,{'min':[1,2,3],'max':[5,6,7]})


if __name__ == '__main__':
    unittest.main()
