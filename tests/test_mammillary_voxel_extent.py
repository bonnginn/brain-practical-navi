import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_mammillary_voxel_extent import voxel_samples

class Samples(unittest.TestCase):
    def test_full_voxel_extent_and_center(self):
        points=np.array([[1,2,3],[4,5,6]])
        samples=voxel_samples(points)
        self.assertEqual(samples.shape,(2,125,3))
        np.testing.assert_array_equal(samples.min(1),points-.5)
        np.testing.assert_array_equal(samples.max(1),points+.5)
        np.testing.assert_array_equal(samples[:,62],points)
        self.assertEqual(len(np.unique(samples[0],axis=0)),125)

if __name__=='__main__': unittest.main()
