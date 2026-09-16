import gzip
import hashlib
import json
import sys
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_section_ventricle_meshes import build_assets
from stage_aqueduct_fourth44 import replay

BEFORE = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-aqueduct-fourth44.bin.gz"
AFTER = ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-right-foramen36.bin.gz"
CURRENT = ROOT / "public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz"
RECORD = ROOT / "segmentation-patches/review/aqueduct-fourth44-adoption-2026-09-16.json"
BASE_SHA = "065ebcef8e76dcbaab292750815d5135d92b1da1123a92b802d2efff2e41a912"
AFTER_SHA = "633e8b51db19e57b7d81c069e1093ddfe80a62eaab0fd3ea3e5bc970cfc6f450"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def load(path):
    raw = gzip.decompress(path.read_bytes())
    dims = np.frombuffer(raw, dtype="<u2", count=3, offset=4)
    return np.frombuffer(raw, dtype=np.uint8, offset=10).reshape(tuple(dims), order="F")


class AqueductFourth44AdoptionTests(unittest.TestCase):
    def test_exact_reversible_transition_counts_and_unrelated_labels(self):
        record = json.loads(RECORD.read_text(encoding="utf-8"))
        before, after = load(BEFORE), load(AFTER)
        self.assertEqual(digest(BEFORE.read_bytes()), BASE_SHA)
        self.assertEqual(digest(AFTER.read_bytes()), AFTER_SHA)
        self.assertEqual(record["beforeSha256"], BASE_SHA)
        self.assertEqual(record["afterSha256"], AFTER_SHA)
        self.assertEqual(record["count"], 44)
        self.assertEqual((record["countsBefore"], record["countsAfter"]), (
            {"0": 66611112, "26": 9166, "27": 264498, "41": 259},
            {"0": 66611110, "26": 9202, "27": 264456, "41": 267},
        ))
        np.testing.assert_array_equal(replay(before, record["points"]), after)
        np.testing.assert_array_equal(replay(after, record["points"], True), before)
        changed = before != after
        self.assertEqual(int(changed.sum()), 44)
        self.assertTrue(np.all(np.isin(before[changed], (0, 27))))
        self.assertTrue(np.all(np.isin(after[changed], (26, 41))))
        np.testing.assert_array_equal(before[~changed], after[~changed])

    def test_three_ventricle_labels_become_one_six_connected_component(self):
        from scipy import ndimage

        record = json.loads(RECORD.read_text(encoding="utf-8"))
        before, after = load(BEFORE), load(AFTER)
        structure = ndimage.generate_binary_structure(3, 1)
        components = []
        for labels in (before, after):
            component_ids, _ = ndimage.label(np.isin(labels, (25, 26, 41)), structure)
            components.append({int(label): int(np.argmax(np.bincount(component_ids[labels == label])))
                               for label in (25, 26, 41)})
        self.assertFalse(len(set(components[0].values())) == 1)
        self.assertEqual(len(set(components[1].values())), 1)
        self.assertEqual(record["connectivity"]["after"]["allThreeConnected"], True)

    def test_generated_section_meshes_match_current_assets(self):
        report, assets = build_assets(CURRENT.read_bytes())
        stored_report = json.loads((ROOT / "public/atlas/section-current-ventricles.json").read_text())
        self.assertEqual(json.loads(json.dumps(report)), stored_report)
        for name, payload in assets.items():
            if name.endswith(".mesh"):
                self.assertEqual(payload, (ROOT / "public/atlas" / name).read_bytes())


if __name__ == "__main__":
    unittest.main()
