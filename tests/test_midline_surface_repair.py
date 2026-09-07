import sys,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from prepare_midline_surface_repair import repair,INVENTORY,RAW_VALUES,POINTS

class MidlineSurfaceRepairTest(unittest.TestCase):
    def source(self):
        labels=np.zeros((198,244,76),dtype=np.uint8);raw=labels.copy()
        for p,value in zip(INVENTORY,RAW_VALUES):labels[p]=27;raw[p]=value
        return labels,raw

    def test_exact_four_and_twelve_retained(self):
        labels,raw=self.source();original=labels.copy();out=repair(labels,raw)
        self.assertEqual(set(map(tuple,np.argwhere(labels!=out))),set(POINTS))
        self.assertTrue(all(out[p]==27 for p in set(INVENTORY)-set(POINTS)))
        self.assertTrue(np.array_equal(original,labels))

    def test_reject_changed_evidence(self):
        labels,raw=self.source();raw[POINTS[0]]=254
        with self.assertRaises(ValueError):repair(labels,raw)
        labels,raw=self.source();labels[INVENTORY[0]]=0
        with self.assertRaises(ValueError):repair(labels,raw)

    def test_reject_bad_grid(self):
        with self.assertRaises(ValueError):repair(np.zeros((2,2,2)),np.zeros((2,2,2)))
        with self.assertRaises(ValueError):repair(np.zeros((2,2,2)),np.zeros((2,2,3)))
