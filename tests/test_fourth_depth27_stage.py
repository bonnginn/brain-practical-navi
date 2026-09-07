import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from stage_fourth_depth27 import replay


class MixedReplay(unittest.TestCase):
    def setUp(self):
        self.entries=[dict(xyz=p.tolist(),before=0 if i<16 else 27,after=26)
            for i,p in enumerate(np.argwhere(np.ones((3,3,3))))]
        self.labels=np.ones((4,4,4),dtype=np.uint8)
        for p in self.entries:self.labels[tuple(p['xyz'])]=p['before']

    def test_reversible_exact_patch(self):
        after=replay(self.labels,self.entries)
        self.assertEqual(np.count_nonzero(after!=self.labels),27)
        self.assertTrue(np.array_equal(replay(after,self.entries,True),self.labels))

    def test_label_conflict(self):
        self.labels[tuple(self.entries[0]['xyz'])]=25
        with self.assertRaises(ValueError):replay(self.labels,self.entries)

    def test_transition_and_coordinate_guards(self):
        from copy import deepcopy
        for key,value in [('before',25),('after',27),('xyz',[-1,0,0]),('xyz',[0.5,0,0]),('xyz',[99,0,0])]:
            bad=deepcopy(self.entries);bad[0][key]=value
            with self.subTest(key=key,value=value):
                with self.assertRaises(ValueError):replay(self.labels,bad)


if __name__=='__main__':unittest.main()
