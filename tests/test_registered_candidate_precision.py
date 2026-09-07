import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_registered_candidate_precision import unique_evidence_points, precise_inverse
from review_bigbrain_grid_transform import DisplacementGrid, forward_chain


class PrecisionReviewTests(unittest.TestCase):
    def test_evidence_union_deduplicates_between_categories_only(self):
        findings=[dict(points=[[1,2,3],[4,5,6]],voxelCount=2),dict(points=[[1,2,3]],voxelCount=1)]
        np.testing.assert_array_equal(unique_evidence_points(findings),[[1,2,3],[4,5,6]])
        for bad in ([],[dict(points=[[1,2,3]],voxelCount=2)], [dict(points=[[1,2,3],[1,2,3]],voxelCount=2)], [dict(points=[[-1,2,3]],voxelCount=1)], [dict(points=[[1.5,2,3]],voxelCount=1)]):
            with self.assertRaises(ValueError): unique_evidence_points(bad)

    def test_tighter_inverse_composes_and_preserves_input(self):
        points=np.array([[2.4,3.1,4.8],[5.2,5.3,5.7]])
        grids=[DisplacementGrid(np.broadcast_to(np.array([.1,.2,.3])[:,None,None,None],(3,12,12,12)),[0,0,0],[1,1,1],'catmull-rom') for _ in range(3)]
        mapped=forward_chain(grids,points); saved=mapped.copy()
        result,residual=precise_inverse(grids,mapped)
        np.testing.assert_allclose(result,points,atol=3e-6)
        self.assertLessEqual(residual,1e-5)
        np.testing.assert_array_equal(mapped,saved)

    def test_tighter_inverse_rejects_invalid_target(self):
        for bad in (np.empty((0,3)),np.ones((2,2)),np.array([[0,0,np.nan]])):
            with self.assertRaises(ValueError): precise_inverse([],bad)


if __name__ == '__main__': unittest.main()
