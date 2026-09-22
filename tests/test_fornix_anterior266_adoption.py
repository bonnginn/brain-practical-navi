import gzip, hashlib, json, sys, unittest
from pathlib import Path
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from stage_fornix_anterior266 import replay
from stage_aqueduct_fourth44 import encode
from build_section_ventricle_meshes import reconstruct

BEFORE = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-fornix-anterior266.bin.gz"
CURRENT = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-fornix-continuation269.bin.gz"
RECORD = ROOT / "segmentation-patches/review/fornix-anterior266-adoption-2026-09-19.json"
MESH = ROOT / "tests/fixtures/section-current-fornix-body-partial-pre-fornix-continuation269.mesh"
META = ROOT / "tests/fixtures/section-current-fornix-body-partial-pre-fornix-continuation269.json"


def load(path):
    raw = gzip.decompress(path.read_bytes())
    dims = np.frombuffer(raw, dtype="<u2", count=3, offset=4)
    return raw, np.frombuffer(raw, dtype=np.uint8, offset=10).reshape(tuple(dims), order="F")


class FornixAnterior266AdoptionTests(unittest.TestCase):
    def test_exact_reversible_transition_and_non_target_invariance(self):
        record = json.loads(RECORD.read_text(encoding="utf-8"))
        before_raw, before = load(BEFORE)
        _, current = load(CURRENT)
        self.assertEqual(hashlib.sha256(BEFORE.read_bytes()).hexdigest(), record["beforeSha256"])
        self.assertEqual(hashlib.sha256(CURRENT.read_bytes()).hexdigest(), record["afterSha256"])
        self.assertEqual(record["beforeSha256"], "5211664518129297bbf78d1d536004e540e721615a88007ecf1459d18fb97a96")
        self.assertEqual(record["afterSha256"], "d815aaff6b98c95109cdd7c052a29871d49cc9cdf463bcb3db7e28a1497c2392")
        self.assertEqual(record["count"], 266)
        self.assertEqual(record["transition"], "mixed-fornix-body-anterior-partial")
        self.assertEqual((record["countsBefore"], record["countsAfter"]), ({"46": 987}, {"46": 1253}))
        self.assertEqual((sum(p["side"] == 1 for p in record["points"]), sum(p["side"] == 2 for p in record["points"])), (159, 107))
        after = replay(before, record["points"])
        np.testing.assert_array_equal(replay(after, record["points"], True), before)
        changed = before != after
        self.assertEqual(int(changed.sum()), 266)
        self.assertTrue(np.all(before[changed] == 0))
        self.assertTrue(np.all(after[changed] == 46))
        np.testing.assert_array_equal(before[~changed], after[~changed])
        self.assertEqual(hashlib.sha256(after.tobytes(order="F")).hexdigest(), record["afterRawVoxelSha256"])
        np.testing.assert_array_equal(current == 46, after == 46)

    def test_current_id46_mask_has_two_components_and_matches_mesh(self):
        _, labels = load(CURRENT)
        selected = labels == 46
        ids, count = ndimage.label(selected, ndimage.generate_binary_structure(3, 1))
        self.assertEqual(count, 2)
        self.assertEqual(sorted(np.bincount(ids.ravel())[1:]), [623, 630])
        payload, info = reconstruct(selected.transpose(2, 1, 0))
        mesh = encode(payload)
        self.assertEqual(mesh, MESH.read_bytes())
        meta = json.loads(META.read_text(encoding="utf-8"))
        self.assertEqual(info["voxels"], 1253)
        self.assertEqual(meta["voxels"], 1253)
        self.assertEqual(meta["components6"], 2)
        self.assertEqual(sorted(meta["componentSizes"]), [623, 630])
        self.assertEqual(meta["labelIds"], [46])
        self.assertEqual(meta["sha256"], hashlib.sha256(mesh).hexdigest())
        self.assertEqual(meta["method"], "native-image-reviewed partial body; marching cubes 0.5; no resampling, smoothing or filling")


if __name__ == "__main__":
    unittest.main()
