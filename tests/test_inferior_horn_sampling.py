import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from diagnose_inferior_horn_sampling import topology


class SamplingTest(unittest.TestCase):
    def test_diagonal_is_not_face_continuity(self):
        mask=np.zeros((3,3,3),bool); mask[0,0,0]=True; mask[1,1,1]=True
        r=topology(mask)
        self.assertEqual(r['voxels'],2)
        self.assertEqual(r['components']['six']['count'],2)
        self.assertEqual(r['components']['twentySix']['count'],1)

    def test_thin_source_bridge_can_disappear_at_even_sampling(self):
        mask=np.zeros((5,3,3),bool)
        mask[0,0,0]=mask[4,0,0]=True
        mask[:,1,0]=True
        self.assertEqual(topology(mask)['components']['six']['count'],1)
        self.assertEqual(topology(mask[::2,::2,::2])['components']['six']['count'],2)


if __name__=='__main__':unittest.main()
