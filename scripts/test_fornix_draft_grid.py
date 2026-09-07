import unittest
from audit_fornix_draft_grid import intersecting_cells


class SupportTests(unittest.TestCase):
    def test_exact_cell_excludes_zero_volume_neighbors(self):
        self.assertEqual(intersecting_cells([-.5,-.5,-.5],[.5,.5,.5]),[(0,0,0)])

    def test_crossing_faces_includes_all_cells(self):
        self.assertEqual(set(intersecting_cells([.4,.4,.4],[.6,.6,.6])),{(x,y,z) for x in (0,1) for y in (0,1) for z in (0,1)})

    def test_bad_boxes_rejected(self):
        for lo,hi in [([0,0,0],[0,1,1]),([0,0],[1,1]),([float('nan'),0,0],[1,1,1])]:
            with self.assertRaises(ValueError):intersecting_cells(lo,hi)


if __name__=='__main__':unittest.main()
