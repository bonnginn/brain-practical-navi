import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import build_neurovascular_overlays as g


def ring_centers(data, region):
    n=int.from_bytes(data[4:8],'little')
    vertices=np.frombuffer(data,dtype='<f4',count=n*3,offset=12).reshape(-1,3)[:,[2,1,0]]
    ids=np.frombuffer(data,dtype='<f4',count=n,offset=12+n*28)
    return vertices[ids==region].reshape(-1,g.SIDES,3).mean(axis=1)


class Connections(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory()
        cls.out=Path(cls.temp.name)
        with patch.object(g,'OUT',cls.out),contextlib.redirect_stdout(io.StringIO()):g.main()

    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()

    def test_actual_mesh_endpoints_share_parent_centerlines(self):
        anterior=(self.out/'overlay-arteries-anterior.mesh').read_bytes()
        posterior=(self.out/'overlay-arteries-posterior.mesh').read_bytes()
        for pc,ica,pca in ((8,1,13),(9,2,14)):
            points=ring_centers(anterior,pc)
            # Parent knots are retained every five Catmull-Rom subdivisions.
            np.testing.assert_allclose(points[0],ring_centers(anterior,ica)[10],atol=1e-5)
            np.testing.assert_allclose(points[-1],ring_centers(posterior,pca)[5],atol=1e-5)
            self.assertLess(np.linalg.norm(points[-1]-points[0]),20)
        left=ring_centers(anterior,8);right=ring_centers(anterior,9)
        np.testing.assert_allclose(left,right*[-1,1,1],atol=1e-5)

    def test_unrelated_meshes_are_unchanged(self):
        for name in ('overlay-arteries-posterior','overlay-nerves-anterior','overlay-nerves-pontine','overlay-nerves-medullary'):
            self.assertEqual((self.out/(name+'.mesh')).read_bytes(),(ROOT/'public/atlas'/(name+'.mesh')).read_bytes())

    def test_double_shift_or_old_gap_is_rejected_by_endpoint_contract(self):
        a=(self.out/'overlay-arteries-anterior.mesh').read_bytes()
        b=(self.out/'overlay-arteries-posterior.mesh').read_bytes()
        target=ring_centers(b,14)[5]
        for wrong in (ring_centers(a,9)[-1]+g.DISPLAY_SHIFT,np.array([11,7,-44])):
            self.assertGreater(np.linalg.norm(wrong-target),1)


if __name__=='__main__':unittest.main()
