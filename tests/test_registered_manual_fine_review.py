import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from render_registered_manual_fine_review import fine_box, encode_image, render_fine_row, region_set


class FineReviewTests(unittest.TestCase):
    def test_fixed_region_sets_preserve_previous_review_and_reject_unknown(self):
        self.assertEqual(len(region_set('background')), 5)
        selected = region_set('conflicts')
        self.assertEqual([r[1] for r in selected], [13, 14, 19, 20])
        self.assertEqual(len({r[0] for r in selected}), 4)
        self.assertEqual(selected[0][2], [163, 254, 137])
        with self.assertRaises(ValueError): region_set('all')

    def test_box_uses_physical_image_origin_and_spacing(self):
        start = np.array([-98.1,-134.1,-72.1]); step = np.full(3,.3)
        center = np.array([50,60,70]); world = center*step+start
        low, high, actual = fine_box(world,start,step,[200,200,200])
        np.testing.assert_array_equal(actual,center)
        np.testing.assert_array_equal(low,center-10)
        np.testing.assert_array_equal(high,center+11)
        with self.assertRaises(ValueError): fine_box(start,start,step,[200,200,200])
        with self.assertRaises(ValueError): fine_box(world,start,[0,.3,.3],[200,200,200])

    def test_window_preserves_background_code_without_label_decision(self):
        source=np.array([0,100,200,300,65000,65535],dtype=np.uint16)
        original=source.copy()
        np.testing.assert_array_equal(encode_image(source,[100,300]),[0,0,125,250,255,255])
        np.testing.assert_array_equal(source,original)
        with self.assertRaises(ValueError): encode_image(source,[300,100])

    def test_original_panel_addresses_and_input_immutability(self):
        raw=np.arange(3*4*5,dtype=np.uint8).reshape(3,4,5)
        old=np.zeros_like(raw); old[1,2,2]=7
        candidate=old.copy(); candidate[1,2,3]=7
        originals=[v.copy() for v in (raw,old,candidate)]
        for axis,index in (('x',1),('y',2),('z',3)):
            result=np.asarray(render_fine_row(raw,old,candidate,axis,index,7))
            width=4 if axis=='x' else 3
            height=4 if axis=='z' else 5
            scale=300//width
            for r in range(height):
                for c in range(width):
                    xyz=(index,c,4-r) if axis=='x' else ((c,index,4-r) if axis=='y' else (c,3-r,index))
                    self.assertTrue(np.all(result[28+r*scale:28+(r+1)*scale,c*scale:(c+1)*scale,:]==raw[xyz]))
        for actual,expected in zip((raw,old,candidate),originals): np.testing.assert_array_equal(actual,expected)


if __name__=='__main__': unittest.main()
