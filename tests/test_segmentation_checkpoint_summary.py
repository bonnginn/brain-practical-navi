import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from summarize_segmentation_checkpoint import summarize


class CheckpointSummary(unittest.TestCase):
    def test_changes_reclassification_and_counts(self):
        before=np.array([0,23,25,27,40,0,0,0],np.uint8).reshape(2,2,2)
        after=np.array([23,0,25,41,40,0,0,0],np.uint8).reshape(2,2,2)
        saved=before.copy();result=summarize(before,after)
        self.assertEqual(result['changedVoxels'],3)
        self.assertEqual(result['transitions'],[dict(before=0,after=23,count=1),
            dict(before=23,after=0,count=1),dict(before=27,after=41,count=1)])
        self.assertEqual(next(r['net'] for r in result['labels'] if r['id']==23),0)
        self.assertFalse(result['anatomicalValidation']);self.assertFalse(result['mutation'])
        self.assertTrue(np.array_equal(before,saved))

    def test_identical_is_not_anatomical_approval(self):
        result=summarize(np.zeros((2,2,2),np.uint8),np.zeros((2,2,2),np.uint8))
        self.assertEqual(result['changedVoxels'],0);self.assertEqual(result['transitions'],[])
        self.assertFalse(result['anatomicalValidation'])

    def test_wrong_grid_and_type(self):
        for other in [np.zeros((2,2),np.uint8),np.zeros((3,2,2),np.uint8),np.zeros((2,2,2))]:
            with self.assertRaises(ValueError):summarize(np.zeros((2,2,2),np.uint8),other)


if __name__=='__main__':unittest.main()
