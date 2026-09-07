import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from render_registered_precision_differences import change_points,render_point


class PrecisionDifferenceTests(unittest.TestCase):
    def test_changed_points_and_distant_extension(self):
        old=np.zeros((15,15,15),dtype=np.uint8);old[7,7,7]=9
        new=old.copy();new[8,7,7]=9
        points,support=change_points(old,new)
        np.testing.assert_array_equal(points,[[8,7,7]]);self.assertEqual(support,[True])
        new[13,13,13]=9
        self.assertEqual(change_points(old,new)[1],[True,False])

    def test_raw_center_pixel_not_hidden_and_xyz_addresses(self):
        raw=(np.indices((15,15,15))*np.array([1,3,7])[:,None,None,None]).sum(0).astype(np.uint8)
        old=np.zeros_like(raw);old[7,7,7]=9;new=old.copy();new[7,7,7]=0
        originals=[v.copy() for v in (raw,old,new)]
        panel=np.asarray(render_point(raw,old,new,[7,7,7]))
        for n in range(3):
            x=155+n*3*73
            self.assertTrue(np.all(panel[54:60,x+30:x+36]==raw[7,7,7]))
        for a,b in zip((raw,old,new),originals):np.testing.assert_array_equal(a,b)
        with self.assertRaises(ValueError):render_point(raw,old,new,[0,0,0])


if __name__=='__main__':unittest.main()
