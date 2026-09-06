import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from compose_registered_practical_candidate import compose, make_delta, replay_delta


class RegisteredCompositeTests(unittest.TestCase):
    def test_priority_preserves_reviewed_and_ventricular_labels(self):
        old=np.arange(42,dtype=np.uint8).reshape(7,3,2)
        registered=np.ones_like(old)
        original=old.copy()
        result,stats=compose(old,registered)
        for value in range(42):
            expected=1 if value<=22 or value in (27,31,32) else value
            self.assertTrue(np.all(result[old==value]==expected))
        self.assertEqual(stats['preservedConflicts'],16)
        self.assertEqual(stats['replacedCoarseCount'],3)
        np.testing.assert_array_equal(old,original)

    def test_old_positions_cleared_without_filling_surroundings(self):
        old=np.zeros((5,5,5),dtype=np.uint8); old[1,1,1]=7; old[2,2,2]=7; old[4,4,4]=39
        registered=np.zeros_like(old); registered[2,2,2]=7; registered[3,2,2]=7
        result,stats=compose(old,registered)
        self.assertEqual(result[1,1,1],0)
        self.assertEqual(result[4,4,4],39)
        self.assertEqual(np.count_nonzero(result),3)
        self.assertEqual(stats['obsoleteManualClearedToUnlabeled'],1)
        self.assertEqual(stats['preservedConflicts'],0)

    def test_delta_roundtrip_fortran_order_and_atomic_rejection(self):
        old=np.zeros((3,4,5),dtype=np.uint8)
        new=old.copy(); new[1,2,3]=7; new[2,0,4]=31
        indices,before,after=make_delta(old,new)
        np.testing.assert_array_equal(indices,[1+3*(2+4*3),2+3*(0+4*4)])
        np.testing.assert_array_equal(replay_delta(old,indices,before,after),new)
        np.testing.assert_array_equal(replay_delta(new,indices,before,after,True),old)
        bad=new.copy(); bad[2,0,4]=0; unchanged=bad.copy()
        with self.assertRaises(ValueError): replay_delta(bad,indices,before,after,True)
        np.testing.assert_array_equal(bad,unchanged)
        for corrupt in (indices[::-1],np.array([-1,2]),np.array([0,old.size]),np.array([2,2])):
            with self.assertRaises(ValueError): replay_delta(old,corrupt,before,after)

    def test_invalid_labels_cannot_silently_enter_candidate(self):
        old=np.zeros((2,2,2),dtype=np.uint8); candidate=old.copy(); candidate[0,0,0]=23
        with self.assertRaises(ValueError): compose(old,candidate)
        with self.assertRaises(ValueError): compose(old.astype(float),old)


if __name__=='__main__': unittest.main()
