import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from build_registered_manual_candidate import nearest_labels, box_from_extent, analyze_labels
from render_registered_manual_review import review_planes, render_row


class RegisteredCandidateTests(unittest.TestCase):
    def test_nearest_uses_source_world_not_target_indices(self):
        source = np.arange(27, dtype=np.uint8).reshape(3,3,3)
        start, step = np.array([-98.,-134.,-72.]), np.full(3,.3)
        points = np.array([[0,1,2],[2,0,1],[1,2,0]])
        np.testing.assert_array_equal(nearest_labels(source, points*step+start, start, step), source[tuple(points.T)])
        self.assertEqual(int(nearest_labels(source, np.array([[-200.,0.,0.]]), start, step)[0]),0)
        with self.assertRaises(ValueError): nearest_labels(source, [[np.nan,0,0]], start, step)

    def test_extent_has_margin_and_refuses_clipping(self):
        low, high = box_from_extent([10,11,12],[20,21,22],[0,0,0],[1,1,1],[40,40,40])
        np.testing.assert_array_equal(low,[6,7,8]); np.testing.assert_array_equal(high,[25,26,27])
        for a,b in (([0,10,10],[20,20,20]),([10,10,10],[39,20,20]),([20,10,10],[10,20,20])):
            with self.assertRaises(ValueError): box_from_extent(a,b,[0,0,0],[1,1,1],[40,40,40])

    def test_metrics_record_cross_label_conflicts_without_adoption(self):
        candidate = np.zeros((4,11,3),dtype=np.uint8)
        for left in range(1,23,2):
            candidate[1,left//2,1]=left; candidate[2,left//2,1]=left+1
        old=candidate.copy(); old[1,0,1]=27
        raw=np.zeros_like(old); raw[2,0,1]=255
        result=analyze_labels(old,candidate,raw)
        self.assertEqual(result['1']['overlapsCurrentLabels'],{'27':1})
        self.assertEqual(result['2']['encodedBackgroundVoxels'],1)
        self.assertEqual(result['1']['sixConnectedComponents'],1)
        bad=candidate.copy(); bad[1,0,1]=0
        with self.assertRaises(ValueError): analyze_labels(old,bad,raw)

    def test_review_planes_include_all_z_and_adjacent_endpoints(self):
        points=np.array([[2,3,4],[6,8,9]])
        planes=review_planes(points,(12,12,12))
        self.assertEqual([i for a,i in planes if a=='z'],list(range(3,11)))
        self.assertEqual(len(planes),len(set(planes)))
        for pair in (('x',1),('x',7),('y',2),('y',9)):
            self.assertIn(pair,planes)

    def test_raw_panel_pixel_address_and_no_label_mutation(self):
        raw=np.arange(6*7*5,dtype=np.uint8).reshape(6,7,5)
        old=np.zeros_like(raw); old[2:4,2:5,1:3]=1
        new=old.copy(); crop=dict(min=[1,1,1],max=[4,5,3])
        for axis,index in (('x',2),('y',3),('z',2)):
            row=np.array(render_row(raw,old,new,axis,index,crop,(1,2)))
            width=5 if axis=='x' else 4
            height=5 if axis=='z' else 3
            for r in range(height):
                for c in range(width):
                    xyz=(index,1+c,3-r) if axis=='x' else ((1+c,index,3-r) if axis=='y' else (1+c,5-r,index))
                    self.assertTrue(np.all(row[26+r*6:26+(r+1)*6,c*6:(c+1)*6,:]==raw[xyz]))
        np.testing.assert_array_equal(old,new)


if __name__ == '__main__': unittest.main()
