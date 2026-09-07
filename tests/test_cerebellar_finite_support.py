import unittest
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_cerebellar_finite_support import support_corner_minima,clip_figure_margin


class SupportTests(unittest.TestCase):
    def test_display_margin_clips_without_moving_centre(self):
        low,high=clip_figure_margin([-4,2,1],[12,8,11],[5,5,5],[10,10,10])
        self.assertEqual(low.tolist(),[0,2,1])
        self.assertEqual(high.tolist(),[10,8,10])
        for center in ([0,5,5],[9,5,5]):
            with self.assertRaises(ValueError):
                clip_figure_margin([-4,2,1],[12,8,11],center,[10,10,10])

    def test_includes_covering_corner_outside_box(self):
        raw=np.full((4,4,4),65535,dtype=np.uint16);raw[2,2,2]=42000
        before=raw.copy()
        self.assertEqual(support_corner_minima(raw,[[1.1]*3],[[1.2]*3]).tolist(),[42000])
        np.testing.assert_array_equal(raw,before)

    def test_exact_integer_box_does_not_include_next_cell(self):
        raw=np.full((3,3,3),65535,dtype=np.uint16);raw[2,2,2]=0
        self.assertEqual(support_corner_minima(raw,[[0,0,0]],[[1,1,1]]).tolist(),[65535])

    def test_invalid_or_outside_box(self):
        raw=np.zeros((3,3,3))
        for low,high in [([[-.1,0,0]],[[1,1,1]]),([[0,0,0]],[[3,1,1]]),([[2,0,0]],[[1,1,1]]),([[float('nan'),0,0]],[[1,1,1]])]:
            with self.assertRaises(ValueError):support_corner_minima(raw,low,high)


if __name__=='__main__':unittest.main()
