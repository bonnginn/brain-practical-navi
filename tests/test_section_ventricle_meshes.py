import gzip
import hashlib
import json
import struct
import sys
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_section_ventricle_meshes import reconstruct, SOURCE, ATLAS, GROUPS


class SectionVentricleMeshes(unittest.TestCase):
    def test_small_and_edge_components_are_preserved(self):
        mask = np.zeros((8, 9, 10), dtype=bool)
        mask[0, 0, 0] = True
        mask[5:7, 6:8, 7:9] = True
        before = mask.copy()
        payload, info = reconstruct(mask)
        self.assertEqual(info["componentSizes"], [8, 1])
        self.assertTrue(np.array_equal(mask, before))
        self.assertEqual(payload[:4], b"BNM2")
        n, f = struct.unpack("<II", payload[4:12])
        self.assertEqual(len(payload), 12 + n * 28 + f * 12)
        vertices = np.frombuffer(payload, dtype="<f4", count=n*3, offset=12).reshape(-1, 3)
        np.testing.assert_allclose(vertices.min(axis=0), [-90.25, -116.25, -98.25])
        np.testing.assert_allclose(vertices.max(axis=0), [-86.75, -112.25, -93.75])

    def test_current_assets_are_exact_reconstruction(self):
        report = json.loads((ATLAS / "section-current-ventricles.json").read_text())
        data = SOURCE.read_bytes()
        self.assertEqual(report["sourceSha256"], hashlib.sha256(data).hexdigest())
        raw = gzip.decompress(data)
        dims = struct.unpack("<3H", raw[4:10])
        seg = np.frombuffer(raw, dtype=np.uint8, offset=10).reshape(dims[::-1])
        self.assertEqual(set(report["meshes"]), set(GROUPS))
        for name, ids in GROUPS.items():
            actual = (ATLAS / f"{name}.mesh").read_bytes()
            expected, info = reconstruct(np.isin(seg, ids))
            self.assertEqual(actual, expected)
            self.assertEqual(report["meshes"][name], {**info, "labelIds": list(ids)})


if __name__ == "__main__":
    unittest.main()
