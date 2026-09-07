import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from build_native_optic_bridge_candidate import seeded_support


class CandidateSupport(unittest.TestCase):
    def test_component_only_no_diagonal_bridge(self):
        image=np.zeros((7,7))
        image[1:3,1:3]=10000
        image[3:5,3:5]=10000
        mask=seeded_support(image,(1,1),1500)
        self.assertEqual(int(mask.sum()),4)
        self.assertFalse(mask[3,3])

    def test_background_seed_is_not_silently_replaced(self):
        with self.assertRaises(ValueError):seeded_support(np.zeros((3,3)),(1,1),500)

    def test_threshold_sensitivity_does_not_fill_holes(self):
        image=np.ones((5,5))*10000
        image[2,2]=1000
        low=seeded_support(image,(0,0),500)
        high=seeded_support(image,(0,0),1500)
        self.assertTrue(low[2,2]);self.assertFalse(high[2,2])


if __name__=='__main__':unittest.main()
