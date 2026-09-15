import sys
import unittest
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_third_inferior_terminal24 import reviewed_coordinates,replay
from install_lateral_crop34 import plan_unchanged_blocks


class ThirdInferiorTerminal(unittest.TestCase):
    def test_review_date_validation_precedes_any_file_access(self):
        for value in ('bad','2026-9-8','../x','2026-02-30',None,False):
            with self.subTest(value=value),self.assertRaises(ValueError):
                plan_unchanged_blocks('nonexistent','0'*64,review_date=value)

    def test_explicit_footprints_and_reversibility(self):
        pts=np.array(reviewed_coordinates())
        self.assertEqual(len(np.unique(pts,axis=0)),24)
        a=np.zeros((201,276,113),np.uint8)
        a[195:197,265:269,103:111]=25
        a[197:199,259:261,107:109]=25
        a[194,267,104]=27  # A neighbouring nonventricular label stays untouched.
        b=replay(a)
        self.assertEqual(np.count_nonzero(a!=b),24)
        self.assertTrue(np.all(b[195:197,265:269,107:109]==25))
        self.assertEqual(b[194,267,104],27)
        self.assertTrue(np.array_equal(replay(b,True),a))
        with self.assertRaises(ValueError):replay(b)
        with self.assertRaises(ValueError):replay(a,True)
        with self.assertRaises(ValueError):replay(np.zeros((10,10,10),np.uint8))


if __name__=='__main__':unittest.main()
