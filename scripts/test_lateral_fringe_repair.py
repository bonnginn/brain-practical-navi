import unittest
import numpy as np
from stage_lateral_fringe_repair import replay


class ReplayTests(unittest.TestCase):
    def test_round_trip(self):
        base=np.zeros((3,3,3),dtype=np.uint8);base[2,2,2]=39
        points=[dict(xyz=[0,1,1],before=0,after=23),dict(xyz=[1,1,1],before=0,after=24)]
        result=replay(base,points)
        self.assertEqual(result[2,2,2],39)
        self.assertTrue(np.array_equal(replay(result,points,True),base))
        self.assertEqual(base[0,1,1],0)

    def test_reject_bad_points(self):
        base=np.zeros((3,3,3),dtype=np.uint8)
        for xyz,target in [([-1,0,0],23),([3,0,0],23),([0.0,0,0],23),([0,0,0],25)]:
            with self.assertRaises(ValueError):replay(base,[dict(xyz=xyz,before=0,after=target)])

    def test_conflict_duplicate(self):
        base=np.zeros((3,3,3),dtype=np.uint8);point=dict(xyz=[0,0,0],before=0,after=23)
        with self.assertRaises(ValueError):replay(base,[point,point])
        base[0,0,0]=24
        with self.assertRaises(ValueError):replay(base,[point])


if __name__=='__main__':unittest.main()
