import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from explore_inferior_horn_cavity import connected_trial


class CavityTrialTests(unittest.TestCase):
    def test_no_diagonal_bridge_and_reports_crop_contact(self):
        raw=np.zeros((4,4,4));raw[1,1,1]=65535;raw[2,2,2]=65535
        mask,faces=connected_trial(raw,[1,1,1],65000)
        self.assertEqual(int(mask.sum()),1)
        self.assertFalse(any(faces.values()))
        raw[0,1,1]=65535
        mask,faces=connected_trial(raw,[1,1,1],65000)
        self.assertEqual(int(mask.sum()),2)
        self.assertEqual(faces['xmin'],1)

    def test_rejects_unqualified_and_outside_seed(self):
        raw=np.zeros((4,4,4))
        for seed in [[1,1,1],[-1,1,1],[4,1,1],[1.2,1,1]]:
            with self.assertRaises(ValueError):connected_trial(raw,seed,65000)


if __name__=='__main__':unittest.main()
