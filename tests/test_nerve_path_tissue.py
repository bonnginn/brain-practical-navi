import sys
import unittest
from pathlib import Path
import numpy as np
from scipy.ndimage import map_coordinates
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_nerve_path_tissue import sample_path


class PathSampling(unittest.TestCase):
    def setUp(self):
        self.raw=np.arange(27,dtype=np.uint8).reshape(3,3,3)
        self.labels=np.zeros((3,3,3),dtype=np.uint8)
        self.labels[1,1,1]=27

    def test_interpolation_and_nearest_label_are_distinct(self):
        centers=np.array([[.5,.5,.5],[1,1,1]])
        samples=sample_path(centers,np.eye(4),self.raw,self.labels)
        self.assertEqual(samples[0]['sourceGray'],6.5)
        self.assertEqual(samples[0]['label'],27)
        self.assertAlmostEqual(samples[1]['distanceFromOriginMm'],np.sqrt(.75))
        expected=map_coordinates(self.raw.astype(np.float32),centers.T,order=1,prefilter=False)
        np.testing.assert_array_equal([s['sourceGray'] for s in samples],expected)

    def test_inverse_display_affine_and_physical_distance(self):
        affine=np.diag([.5,.5,.5,1]);affine[:3,3]=[-98,-116,-90]
        coords=np.array([[0,0,0],[2,2,2]])
        centers=coords@affine[:3,:3].T+affine[:3,3]
        samples=sample_path(centers,np.linalg.inv(affine),self.raw,self.labels)
        np.testing.assert_array_equal(samples[1]['appXYZ'],[2,2,2])
        self.assertAlmostEqual(samples[1]['distanceFromOriginMm'],np.sqrt(3))

    def test_invalid_inputs_never_clip_into_source(self):
        for centers in [[[0,0,0],[3,1,1]],[[0,0,0],[-.01,1,1]],[[0,0,0],[np.nan,1,1]],[[0,0,0]]]:
            with self.assertRaises(ValueError):sample_path(centers,np.eye(4),self.raw,self.labels)
        with self.assertRaises(ValueError):sample_path([[0,0,0],[1,1,1]],np.eye(3),self.raw,self.labels)
        with self.assertRaises(ValueError):sample_path([[0,0,0],[1,1,1]],np.eye(4),self.raw,self.labels[:2])


if __name__=='__main__':unittest.main()
