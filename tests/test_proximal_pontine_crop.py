import sys
import unittest
import contextlib
import hashlib
import io
import struct
import tempfile
from unittest.mock import patch
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from stage_proximal_pontine_nerve_crop import crop_rings
from audit_nerve_origin_context import read_rings
import build_neurovascular_overlays as generator


def selected_mesh_arrays(data, region_ids):
    """Return a selected submesh with face indices canonicalized locally."""
    if data[:4] != b'BNM3':
        raise ValueError('Wrong mesh format')
    n, f = struct.unpack_from('<II', data, 4)
    if len(data) != 12 + n * 32 + f * 12:
        raise ValueError('Mesh length differs')
    vertices = np.frombuffer(data, dtype='<f4', count=n * 3, offset=12).reshape(-1, 3)
    normals = np.frombuffer(data, dtype='<f4', count=n * 3, offset=12 + n * 12).reshape(-1, 3)
    shade = np.frombuffer(data, dtype='<f4', count=n, offset=12 + n * 24)
    regions = np.frombuffer(data, dtype='<f4', count=n, offset=12 + n * 28)
    faces = np.frombuffer(data, dtype='<u4', count=f * 3, offset=12 + n * 32).reshape(-1, 3)
    selected = np.isin(regions, list(region_ids))
    lookup = np.full(n, -1, dtype=np.int64)
    lookup[selected] = np.arange(int(selected.sum()))
    selected_faces = faces[np.all(selected[faces], axis=1)]
    return (vertices[selected], normals[selected], shade[selected], regions[selected],
            lookup[selected_faces])


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

    def test_historical_crop_and_current_generator_reproduce_non_v_asset(self):
        self.assertEqual(hashlib.sha256(self.data).hexdigest(),'a6c912f35ad37e5a98f4f482e72df22a74f7dee22fbc1cb05e07aba050d11b1f')
        expected=crop_rings(self.data)[0]
        self.assertEqual(hashlib.sha256(expected).hexdigest(),'1244f483c765ef084648a74bbad13cff78ea498d4edb9918e15812709e4fd823')
        adopted = (generator.OUT / 'overlay-nerves-pontine.mesh').read_bytes()
        # Keep the historical crop evidence while allowing V (30/31) to be
        # reviewed independently. VI/VII/VIII must remain byte-for-byte
        # equivalent at the geometry and connectivity level.
        for actual, expected_part in zip(selected_mesh_arrays(expected, range(32, 38)),
                                         selected_mesh_arrays(adopted, range(32, 38))):
            np.testing.assert_array_equal(actual, expected_part)
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
