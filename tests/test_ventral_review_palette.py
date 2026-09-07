import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from render_current_ventral_midbrain import LAYERS, CROP, outlined_labels, require_labels_in_crop

class VentralReviewPalette(unittest.TestCase):
    def test_aqueduct_is_distinct_and_inputs_unchanged(self):
        raw=np.full((9,9),110,dtype=np.uint8)
        labels=np.zeros_like(raw)
        labels[2,2]=41;labels[6,6]=26
        saved=labels.copy()
        rgb=outlined_labels(raw,labels)
        np.testing.assert_array_equal(rgb[2,2],[255,120,200])
        np.testing.assert_array_equal(rgb[6,6],[75,150,255])
        np.testing.assert_array_equal(labels,saved)
        np.testing.assert_array_equal(raw,110)
    def test_no_duplicate_label_color_assignments(self):
        ids=[i for group,_ in LAYERS for i in group]
        self.assertEqual(len(ids),len(set(ids)))
        self.assertIn(41,ids)
    def test_crop_has_context_around_pinned_aqueduct(self):
        self.assertTrue(np.all(np.array(CROP['min'])<[195,199,116]))
        self.assertTrue(np.all(np.array(CROP['max'])>[196,202,123]))
    def test_coverage_guard_rejects_missing_and_clipped_labels(self):
        labels=np.zeros((5,5,5),dtype=np.uint8)
        labels[2,2,2]=33
        crop={'min':[1,1,1],'max':[3,3,3]}
        require_labels_in_crop(labels,crop,[33])
        with self.assertRaises(ValueError):require_labels_in_crop(labels,crop,[39])
        labels[0,2,2]=33
        with self.assertRaises(ValueError):require_labels_in_crop(labels,crop,[33])

if __name__=='__main__':unittest.main()
