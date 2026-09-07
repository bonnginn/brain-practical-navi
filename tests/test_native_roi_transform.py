import sys
import tempfile
import unittest
import hashlib
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_native_roi_transform import BoundedGrid, checked


class NativeGridSafety(unittest.TestCase):
    def test_interior_forward_and_outside_rejection(self):
        values=np.zeros((3,7,7,7),dtype=np.float32)
        values[0]=2
        grid=BoundedGrid(values,[-3,-3,-3],[1,1,1],'catmull-rom')
        np.testing.assert_allclose(grid.forward(np.array([[0.,0.,0.]])),[[2,0,0]])
        for point in [[-3,0,0],[3,0,0],[99,0,0]]:
            with self.assertRaises(ValueError):grid.forward(np.array([point],dtype=float))

    def test_source_hash_rejects_changed_input(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'fixture'
            path.write_bytes(b'known source')
            digest=hashlib.sha256(b'known source').hexdigest()
            self.assertEqual(checked(path,digest),path)
            path.write_bytes(b'changed source')
            with self.assertRaises(ValueError):checked(path,digest)

    def test_transform_order_matters(self):
        # An affine input step is not implicitly included in a displacement field.
        grid=BoundedGrid(np.ones((3,9,9,9)),[-4,-4,-4],[1,1,1])
        point=np.array([[.2,.3,.4]])
        correct=grid.forward(point*2)
        wrong=grid.forward(point)*2
        np.testing.assert_allclose(correct,[[1.4,1.6,1.8]])
        self.assertFalse(np.allclose(correct,wrong))


if __name__=='__main__':unittest.main()
