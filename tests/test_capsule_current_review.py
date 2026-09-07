import sys,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from render_capsule_current_review import current_points

class CurrentReview(unittest.TestCase):
    def test_excludes_new_nuclei_and_preserves_xyz_order(self):
        labels=np.zeros((4,5,6),dtype=np.uint8)
        labels[1,2,3]=31;labels[2,2,3]=9;labels[3,2,3]=32
        i=int(np.ravel_multi_index((1,2,3),labels.shape,order='F'))
        before=labels.copy()
        result=current_points(labels,{'runs':[{'start':i,'length':3,'label':0}]})
        np.testing.assert_array_equal(result[31],[[1,2,3]])
        np.testing.assert_array_equal(result[32],[[3,2,3]])
        np.testing.assert_array_equal(labels,before)
