"""Digital enclosure distinctions; these do not identify anatomy."""
import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_ventricle_enclosed_holes import enclosed_masks


class EnclosedHoleTests(unittest.TestCase):
    def test_enclosed_void_and_input_unchanged(self):
        mask=np.zeros((7,7,7),dtype=bool);mask[1:6,1:6,1:6]=True;mask[3,3,3]=False
        before=mask.copy();result=enclosed_masks(mask)
        self.assertEqual({k:int(v.sum()) for k,v in result.items()},{'6':1,'18':1,'26':1})
        self.assertTrue(all(v[3,3,3] for v in result.values()))
        np.testing.assert_array_equal(mask,before)

    def test_diagonal_escape_is_not_26_enclosed(self):
        mask=np.ones((5,5,5),dtype=bool)
        for i in range(3):mask[i,i,i]=False
        result=enclosed_masks(mask)
        self.assertEqual(int(result['6'].sum()),2)
        self.assertEqual(int(result['18'].sum()),2)
        self.assertEqual(int(result['26'].sum()),0)

    def test_open_channel_and_invalid_schema(self):
        mask=np.ones((5,5,5),dtype=bool);mask[0:3,2,2]=False
        self.assertTrue(all(not v.any() for v in enclosed_masks(mask).values()))
        for bad in (np.zeros((2,2),dtype=bool),np.zeros((2,2,2),dtype=np.uint8)):
            with self.assertRaises(ValueError):enclosed_masks(bad)


if __name__=='__main__':unittest.main()
