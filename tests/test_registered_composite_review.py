import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from render_registered_composite_review import GROUPS,COLORS,NAMES,selected_planes,render_row,legend_layout


class CompositeReviewTests(unittest.TestCase):
    def test_legend_wraps_and_names_every_group_label(self):
        for width in (540,1062,1164,1272):
            for count in (7,8,15):
                height,positions=legend_layout(width,count)
                self.assertEqual(len(set(positions)),count)
                self.assertTrue(all(x+176<=width and y+16<=height for x,y in positions))
        for _,_,ids,_ in GROUPS:self.assertTrue(set(ids)<=set(NAMES))

    def test_matrix_is_six_groups_with_adjacent_orthogonal_planes(self):
        self.assertEqual(len(GROUPS),6)
        self.assertEqual(len({g[0] for g in GROUPS}),6)
        for _,crop_ids,ids,center in GROUPS:
            self.assertTrue(set(crop_ids)<=set(ids))
            self.assertEqual(len(ids),len(set(ids)))
            self.assertLessEqual(len(ids),len(COLORS))
            self.assertEqual(len(set(selected_planes(center,(394,466,378)))),9)
        with self.assertRaises(ValueError): selected_planes((0,2,2),(5,5,5))

    def test_raw_pixels_multi_label_edges_and_immutable_inputs(self):
        raw=np.arange(60,dtype=np.uint8).reshape(3,4,5)
        old=np.zeros_like(raw);new=old.copy()
        old[1,2,3]=7;new[1,2,3]=31
        originals=[v.copy() for v in (raw,old,new)]
        crop=dict(min=[0,0,0],max=[2,3,4])
        for axis,index in (('x',1),('y',2),('z',3)):
            result=np.asarray(render_row(raw,old,new,axis,index,crop,(7,31)))
            width=4 if axis=='x' else 3
            height=4 if axis=='z' else 5
            scale=420//width
            for r in range(height):
                for c in range(width):
                    xyz=(index,c,4-r) if axis=='x' else ((c,index,4-r) if axis=='y' else (c,3-r,index))
                    self.assertTrue(np.all(result[28+r*scale:28+(r+1)*scale,c*scale:(c+1)*scale]==raw[xyz]))
            row=1 if axis!='z' else 1
            col=2 if axis=='x' else 1
            for panel,color in ((1,COLORS[0]),(2,COLORS[1])):
                x=panel*(width*scale+10)+col*scale
                self.assertTrue(np.all(result[28+row*scale:28+(row+1)*scale,x:x+scale]==color))
        for a,b in zip((raw,old,new),originals):np.testing.assert_array_equal(a,b)
        with self.assertRaises(ValueError):render_row(raw,old,new,'z',3,crop,(7,7))


if __name__=='__main__':unittest.main()
