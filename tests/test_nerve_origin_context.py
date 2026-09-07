import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_nerve_origin_context import display_affine,read_rings

class OriginContext(unittest.TestCase):
    def test_scientific_and_display_frames_are_distinct(self):
        scientific=np.diag([.5,.5,.5,1]);scientific[:3,3]=[-98,-134,-72]
        display=display_affine(scientific,[-98,-116,-90])
        np.testing.assert_array_equal(display[:3,3]-scientific[:3,3],[0,18,-18])
        point=np.array([196,250,120,1])
        np.testing.assert_allclose(np.linalg.inv(display)@(display@point),point)
        self.assertGreater(np.linalg.norm((display@point)-(scientific@point)),25)
    def test_known_mesh_origin_axis_order(self):
        data=(Path(__file__).resolve().parents[1]/'public/atlas/overlay-nerves-pontine.mesh').read_bytes()
        np.testing.assert_allclose(read_rings(data,33)[0].mean(0),[3,3,-58],atol=1e-5)
        with self.assertRaises(ValueError):read_rings(data[:-1],33)

if __name__=='__main__':unittest.main()
