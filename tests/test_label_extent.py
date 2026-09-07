import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_label_extent import measure

class ExtentTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(measure(np.zeros((3,4,5),dtype=bool)),{'count':0})

    def test_exact_extent_profiles_and_nonmutation(self):
        mask=np.zeros((6,7,8),dtype=bool)
        mask[1:4,2:6,3:5]=True
        before=mask.copy(); r=measure(mask)
        self.assertTrue(np.array_equal(mask,before))
        self.assertEqual(r['count'],24)
        self.assertEqual(r['bbox'],{'min':[1,2,3],'max':[3,5,4]})
        for axis,expected in [('x',[8]*3),('y',[6]*4),('z',[12]*2)]:
            self.assertEqual(r['profiles'][axis]['counts'],expected)
            self.assertEqual(r['profiles'][axis]['firstToPeak'],1)
            self.assertEqual(sum(r['profiles'][axis]['counts']),24)

    def test_tapered_end_not_confused_with_peak(self):
        mask=np.zeros((3,3,3),dtype=bool)
        mask[0,1,1]=True;mask[1,:,:]=True;mask[2,1,1]=True
        r=measure(mask)
        self.assertEqual(r['profiles']['x']['counts'],[1,9,1])
        self.assertAlmostEqual(r['profiles']['x']['firstToPeak'],1/9)

if __name__=='__main__':unittest.main()
