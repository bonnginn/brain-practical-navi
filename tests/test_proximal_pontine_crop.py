import sys
import unittest
import contextlib
import hashlib
import io
import tempfile
from unittest.mock import patch
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from stage_proximal_pontine_nerve_crop import crop_rings
from audit_nerve_origin_context import read_rings
import build_neurovascular_overlays as generator


class ProximalCrop(unittest.TestCase):
    def setUp(self):
        self.data=(Path(__file__).resolve().parents[1]/'tests/fixtures/overlay-nerves-pontine-pre-proximal-a6c9.mesh').read_bytes()

    def test_only_distal_vii_viii_vertices_are_removed(self):
        result,xyz,regions,keep=crop_rings(self.data)
        self.assertEqual(int((~keep).sum()),320)
        self.assertEqual(set(regions[~keep]),{34,35,36,37})
        for region in [30,31,32,33]:
            np.testing.assert_array_equal(read_rings(result,region),read_rings(self.data,region))
        for region in [34,35,36,37]:
            np.testing.assert_array_equal(read_rings(result,region),read_rings(self.data,region)[:8])

    def test_bad_cutoffs_and_truncated_data_are_rejected(self):
        for cutoff in [True,-1,0,15,16,7.5]:
            with self.assertRaises(ValueError):crop_rings(self.data,cutoff)
        with self.assertRaises(ValueError):crop_rings(self.data[:-1])

    def test_adopted_asset_is_exact_reviewed_crop_and_generator_reproduces_it(self):
        self.assertEqual(hashlib.sha256(self.data).hexdigest(),'a6c912f35ad37e5a98f4f482e72df22a74f7dee22fbc1cb05e07aba050d11b1f')
        expected=crop_rings(self.data)[0]
        self.assertEqual(hashlib.sha256(expected).hexdigest(),'1244f483c765ef084648a74bbad13cff78ea498d4edb9918e15812709e4fd823')
        self.assertEqual(expected,(generator.OUT/'overlay-nerves-pontine.mesh').read_bytes())
        with tempfile.TemporaryDirectory() as folder:
            out=Path(folder)
            with patch.object(generator,'OUT',out),contextlib.redirect_stdout(io.StringIO()):generator.main()
            for mesh in out.glob('*.mesh'):
                self.assertEqual(mesh.read_bytes(),(generator.OUT/mesh.name).read_bytes(),mesh.name)

    def test_invalid_display_scope_rejected(self):
        for rings in [True,0,1,17,2.5]:
            with self.assertRaises(ValueError):
                generator.tube_mesh([dict(points=[[0,0,0],[1,1,1],[2,2,2],[3,3,3]],radius=1,id=1,display_rings=rings)])


if __name__=='__main__':unittest.main()
