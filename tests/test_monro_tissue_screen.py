import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from review_monro_existing_tissue import source_bounds,tissue_candidates


class MonroScreen(unittest.TestCase):
    def test_axis_aligned_crop(self):
        low,high=source_bounds(np.eye(4),[0,0,0],[1,1,1],[30]*3,[5]*3,[10]*3)
        self.assertEqual(low.tolist(),[3]*3);self.assertEqual(high.tolist(),[13]*3)

    def test_invalid_geometry_and_bounds(self):
        for kind in ['rotation','negative','nan','homogeneous','outside','zero-step']:
            affine=np.eye(4);step=[1,1,1];lo=[5]*3
            if kind=='rotation':affine[0,1]=.1
            if kind=='negative':affine[0,0]=-1
            if kind=='nan':affine[0,3]=float('nan')
            if kind=='homogeneous':affine[3,0]=1
            if kind=='outside':lo=[0]*3
            if kind=='zero-step':step[0]=0
            with self.subTest(kind=kind),self.assertRaises(ValueError):
                source_bounds(affine,[0]*3,step,[30]*3,lo,[10]*3)

    def test_finite_support_not_center_only_or_outside(self):
        rows=[dict(weightedSupportFraction=f,weightedOutsideCropFraction=o) for f,o in
              [(.9,0),(.899,0),(1,.01),(float('nan'),0)]]
        self.assertEqual(tissue_candidates(rows),[rows[0]])
        self.assertEqual(len(rows),4)


if __name__=='__main__':unittest.main()
