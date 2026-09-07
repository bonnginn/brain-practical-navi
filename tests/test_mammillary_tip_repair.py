import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from prepare_mammillary_tip_repair import repair,POINTS

class TipRepair(unittest.TestCase):
    def source(self):
        labels=np.zeros((194,254,108),dtype=np.uint8);raw=labels.copy()
        for p,v in zip(POINTS,[250,248]):labels[p]=39;raw[p]=v
        labels[190,250,106]=40
        return labels,raw
    def test_exact_reversible_difference(self):
        labels,raw=self.source();result=repair(labels,raw)
        self.assertEqual(np.count_nonzero(result!=labels),2)
        self.assertEqual(result[190,250,106],40)
        for p in POINTS:self.assertEqual(labels[p],39);self.assertEqual(result[p],0);result[p]=39
        np.testing.assert_array_equal(result,labels)
    def test_wrong_source_rejected(self):
        for kind in ['label','image']:
            labels,raw=self.source()
            (labels if kind=='label' else raw)[POINTS[0]]=0
            with self.assertRaises(ValueError):repair(labels,raw)

if __name__=='__main__':unittest.main()
