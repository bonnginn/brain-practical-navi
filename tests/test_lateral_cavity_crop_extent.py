import sys
import unittest
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from compare_lateral_cavity_crop_extent import compare_masks
from audit_inferior_horn_cavity_grid import weighted_support_record, support_record


class CropComparisonTest(unittest.TestCase):
    def test_reconnection_and_external_growth_are_separate(self):
        inner = np.zeros((3,3,3),dtype=bool); inner[1,1,1] = True
        outer = np.zeros((5,5,5),dtype=bool)
        outer[2,2,2] = True; outer[3,2,2] = True; outer[4,2,2] = True
        self.assertEqual(compare_masks(inner,outer,[1,1,1]), dict(lostInsideOldCrop=0,addedInsideOldCrop=1,addedOutsideOldCrop=1))
        outer[2,2,2] = False
        self.assertEqual(compare_masks(inner,outer,[1,1,1])['lostInsideOldCrop'],1)

    def test_reject_non_nested_crop(self):
        with self.assertRaises(ValueError):
            compare_masks(np.ones((3,3,3),dtype=bool),np.ones((4,4,4),dtype=bool),[2,0,0])

    def test_weighted_support_uses_overlap_not_number_of_touched_cells(self):
        mask=np.zeros((3,3,3),dtype=bool);mask[1,:,:]=True
        result=weighted_support_record([1.25,1,1],[1,1,1],mask,[0,0,0])
        self.assertAlmostEqual(result['weightedSupportFraction'],.75)
        self.assertEqual(result['weightedOutsideCropFraction'],0)
        self.assertFalse(support_record(np.array([1.25,1,1]),np.ones(3),mask,np.zeros(3,dtype=int))['fullySupported'])
        self.assertAlmostEqual(weighted_support_record([1.5,1,1],[1,1,1],mask,[0,0,0])['weightedSupportFraction'],.5)

    def test_weighted_crop_loss_is_not_renormalized_away(self):
        result=weighted_support_record([-.25,1,1],[1,1,1],np.ones((3,3,3),bool),[0,0,0])
        self.assertAlmostEqual(result['weightedOutsideCropFraction'],.25)
        self.assertAlmostEqual(result['weightedSupportFraction'],.75)

    def test_weighted_support_preserves_translation_and_rejects_invalid_spacing(self):
        mask=np.ones((3,3,3),bool)
        a=weighted_support_record([11,21,31],[1.7,1.7,1.7],mask,[10,20,30])
        b=weighted_support_record([1,1,1],[1.7,1.7,1.7],mask,[0,0,0])
        for key in a:self.assertAlmostEqual(a[key],b[key],places=12)
        with self.assertRaises(ValueError):weighted_support_record([1,1,1],[0,1,1],mask,[0,0,0])


if __name__ == '__main__':
    unittest.main()
