import gzip, hashlib, json, sys, unittest
from pathlib import Path
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from stage_fornix_body987 import replay
from stage_aqueduct_fourth44 import encode
from build_section_ventricle_meshes import reconstruct

BEFORE = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-fornix-body987.bin.gz"
CURRENT = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
RECORD = ROOT / "segmentation-patches/review/fornix-body987-adoption-2026-09-16.json"
MESH = ROOT / "public/atlas/section-current-fornix-body-partial.mesh"
META = ROOT / "public/atlas/section-current-fornix-body-partial.json"


def load(path):
    raw = gzip.decompress(path.read_bytes())
    dims = np.frombuffer(raw, dtype="<u2", count=3, offset=4)
    return raw, np.frombuffer(raw, dtype=np.uint8, offset=10).reshape(tuple(dims), order="F")


class FornixBody987AdoptionTests(unittest.TestCase):
    def test_exact_reversible_transition_and_non_target_invariance(self):
        record = json.loads(RECORD.read_text(encoding="utf-8"))
        before_raw, before = load(BEFORE)
        _, current = load(CURRENT)
        self.assertEqual(hashlib.sha256(BEFORE.read_bytes()).hexdigest(), record["beforeSha256"])
        self.assertEqual(hashlib.sha256(CURRENT.read_bytes()).hexdigest(), record["afterSha256"])
        self.assertEqual(record["count"], 987)
        self.assertEqual(record["transition"], "mixed-fornix-body-partial")
        self.assertEqual((record["countsBefore"], record["countsAfter"]), ({"46": 0}, {"46": 987}))
        self.assertEqual((sum(p["side"] == 1 for p in record["points"]), sum(p["side"] == 2 for p in record["points"])), (464, 523))
        after = replay(before, record["points"])
        np.testing.assert_array_equal(replay(after, record["points"], True), before)
        changed = before != after
        self.assertEqual(int(changed.sum()), 987)
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
        self.assertEqual(sorted(np.bincount(ids.ravel())[1:]), [464, 523])
        payload, info = reconstruct(selected.transpose(2, 1, 0))
        mesh = encode(payload)
        self.assertEqual(mesh, MESH.read_bytes())
        meta = json.loads(META.read_text(encoding="utf-8"))
        self.assertEqual(info["voxels"], 987)
        self.assertEqual(meta["voxels"], 987)
        self.assertEqual(meta["components6"], 2)
        self.assertEqual(meta["labelIds"], [46])
        self.assertEqual(meta["sha256"], hashlib.sha256(mesh).hexdigest())
        self.assertEqual(meta["method"], "native-image-reviewed partial body; marching cubes 0.5; no resampling, smoothing or filling")


if __name__ == "__main__":
    unittest.main()
