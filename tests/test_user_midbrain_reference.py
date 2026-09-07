import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from import_midbrain_review_line import to_voxel

class ReferenceCoordinates(unittest.TestCase):
    def test_pixel_centers_and_axes(self):
        self.assertEqual(to_voxel([456.5,60.5]),[180,185,180])
        self.assertEqual(to_voxel([461.5,65.5]),[180,186,179])
    def test_other_panel_or_nonfinite_rejected(self):
        for p in [[12,60],[454,500],[900,100],[float('nan'),100]]:
            with self.assertRaises(ValueError):to_voxel(p)

if __name__=='__main__':unittest.main()
