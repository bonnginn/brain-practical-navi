import sys
import struct
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from build_section_structure_meshes import read_labels, voxel_surface, encode_mesh, STRUCTURES, GEOMETRY_STRIDE, ATLAS


class SectionStructureSync(unittest.TestCase):
    def test_single_cell_geometry_and_binary_layout(self):
        mask = np.ones((1, 1, 1), dtype=bool)
        vertices, normals, shade, faces = voxel_surface(mask)
        self.assertEqual(len(vertices), 24)
        self.assertEqual(len(faces), 36)
        np.testing.assert_allclose(vertices.min(0), [-90.5, -116.5, -98.5])
        np.testing.assert_allclose(vertices.max(0), [-89.5, -115.5, -97.5])
        payload = encode_mesh((vertices, normals, shade, faces))
        self.assertEqual(payload[:4], b'BNM2')
        self.assertEqual(struct.unpack('<II', payload[4:12]), (24, 36))
        self.assertEqual(len(payload), 12 + 24 * 28 + 36 * 4)

    def test_all_three_current_assets_match_source(self):
        labels = read_labels()[::GEOMETRY_STRIDE, ::GEOMETRY_STRIDE, ::GEOMETRY_STRIDE]
        for name, ids in STRUCTURES.items():
            with self.subTest(name=name):
                self.assertEqual((ATLAS / f'{name}.mesh').read_bytes(), encode_mesh(voxel_surface(np.isin(labels, ids))))


if __name__ == '__main__':
    unittest.main()
