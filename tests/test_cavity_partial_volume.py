import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from diagnose_cavity_partial_volume import weighted_support
from audit_fornix_draft_grid import intersecting_cells
from audit_inferior_horn_cavity_grid import support_record


class WeightedSupportTests(unittest.TestCase):
    def test_float32_roundtrip_can_change_strict_face_membership(self):
        nominal_start=np.array([-98.1,-134.1,-72.1]);nominal_step=np.array([.3,.3,.3])
        stored_start=nominal_start.astype(np.float32).astype(float)
        stored_step=nominal_step.astype(np.float32).astype(float)
        world=np.array([251,245,111])*.5+np.array([-98,-134,-72])
        center=(world-nominal_start)/nominal_step;size=.5/nominal_step
        cells=np.array(intersecting_cells(center-size/2,center+size/2))
        low=cells.min(axis=0)-2;shape=cells.max(axis=0)-low+3
        mask=np.zeros(shape,bool);mask[tuple((cells-low).T)]=True
        stored_center=(world-stored_start)/stored_step
        self.assertTrue(support_record(center,size,mask,low)['fullySupported'])
        self.assertFalse(support_record(stored_center,.5/stored_step,mask,low)['fullySupported'])
        fraction=weighted_support(stored_center,.5/stored_step,mask,low)['locatorVolumeFraction']
        self.assertGreater(fraction,.9999);self.assertLess(fraction,1)

    def test_exact_whole_cell(self):
        r=weighted_support([1,1,1],[1,1,1],np.ones((3,3,3),bool),[0,0,0])
        self.assertEqual(r['locatorVolumeFraction'],1)
        self.assertEqual(r['sourceCellCount'],1)

    def test_weight_is_not_cell_vote(self):
        m=np.zeros((3,3,3),bool);m[1,1,1]=True
        r=weighted_support([1.25,1,1],[1,1,1],m,[0,0,0])
        self.assertAlmostEqual(r['locatorVolumeFraction'],.75)
        self.assertEqual(r['unweightedLocatorFraction'],.5)

    def test_outside_crop_is_not_renormalized(self):
        r=weighted_support([-.25,0,0],[1,1,1],np.ones((1,1,1),bool),[0,0,0])
        self.assertAlmostEqual(r['locatorVolumeFraction'],.75)
        self.assertAlmostEqual(r['outsideCropVolumeFraction'],.25)

    def test_translation_and_invalid_geometry(self):
        r=weighted_support([11.25,21,31],[1,1,1],np.ones((3,3,3),bool),[10,20,30])
        self.assertEqual(r['locatorVolumeFraction'],1)
        for size in [[0,1,1],[float('nan'),1,1],[-1,1,1]]:
            with self.assertRaises(ValueError):weighted_support([1,1,1],size,np.ones((3,3,3),bool),[0,0,0])


if __name__=='__main__':unittest.main()
