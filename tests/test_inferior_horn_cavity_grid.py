import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_inferior_horn_cavity_grid import support_record


class FiniteSupportTests(unittest.TestCase):
    def test_center_is_not_whole_cell_support(self):
        mask=np.ones((5,5,5),bool);mask[3,2,2]=False
        r=support_record(np.array([2.,2.,2.]),np.ones(3)*1.7,mask,np.zeros(3,int))
        self.assertFalse(r['fullySupported'])
        self.assertEqual(r['outsideExplorationCells'],1)

    def test_crop_edge_and_outside_not_silently_clipped(self):
        mask=np.ones((5,5,5),bool)
        for center in [np.array([0.,2.,2.]),np.array([-1.,2.,2.])]:
            self.assertFalse(support_record(center,np.ones(3),mask,np.zeros(3,int))['fullySupported'])
        self.assertTrue(support_record(np.array([2.,2.,2.]),np.ones(3),mask,np.zeros(3,int))['fullySupported'])


if __name__=='__main__':unittest.main()
