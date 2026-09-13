import hashlib
import json
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import review_aqueduct_current30_native100 as review

REPORT_SHA = "a5a5fbcbb98a6a8d8379db70fa90016b06960df9afea818332c47b6263cf6d0c"


@unittest.skipUnless(
    review.OUTPUT.joinpath("report.json").exists(),
    "Local current30 native100 evidence is not packaged for CI",
)
class AqueductCurrent30Native100(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report_path = review.OUTPUT / "report.json"
        cls.report = json.loads(cls.report_path.read_text(encoding="utf-8"))
        cls.inventory = json.loads(review.INVENTORY.read_text(encoding="utf-8"))
        cls.labels = review.read_browser_volume(
            review.SOURCE_LABELS, review.MAGIC_LABELS, review.LABEL_SHA
        )[2]

    def test_fixed_inventory_set_and_current_values(self):
        self.assertEqual(hashlib.sha256(self.report_path.read_bytes()).hexdigest(), REPORT_SHA)
        self.assertEqual(
            hashlib.sha256(review.INVENTORY.read_bytes()).hexdigest(), review.INVENTORY_SHA
        )
        expected = self.inventory["regions"]["aqueduct"]["currentHeldPoints"]
        actual = self.report["candidatePoints"]
        self.assertEqual({tuple(p) for p in actual}, {tuple(p) for p in expected})
        self.assertEqual(len(actual), 30)
        values = self.labels[tuple(np.asarray(actual, dtype=np.int64).T)]
        unique, counts = np.unique(values, return_counts=True)
        self.assertEqual(dict(zip((str(int(v)) for v in unique), (int(c) for c in counts))), {"0": 11, "27": 19})
        self.assertEqual(self.report["candidateValueCounts"], {"0": 11, "27": 19})
        self.assertEqual(self.report["currentLabelSha256"], review.LABEL_SHA)

    def test_components_bounds_representatives_and_scope(self):
        groups = self.report["groups"]
        self.assertEqual([g["count"] for g in groups], [9, 21])
        self.assertEqual(
            [g["bounds"] for g in groups],
            [
                {"min": [194, 201, 109], "max": [196, 202, 113]},
                {"min": [194, 215, 136], "max": [198, 218, 137]},
            ],
        )
        self.assertEqual([g["componentId"] for g in groups], ["component-01", "component-02"])
        candidate_set = {tuple(p) for p in self.report["candidatePoints"]}
        for group in groups:
            representative = tuple(group["representativeAppXYZ"][0])
            self.assertIn(representative, {tuple(p) for p in group["points"]})
            self.assertTrue(set(map(tuple, group["points"])).issubset(candidate_set))
            self.assertEqual(len(group["figures"]), 3)
        self.assertEqual(self.report["currentContextLabelVoxelCounts"]["41"], 259)
        self.assertEqual(
            (self.report["mutation"], self.report["adopted"], self.report["expertReviewed"]),
            (False, False, False),
        )

    def test_palette_inputs_and_six_figures_eighteen_planes(self):
        self.assertEqual(len(self.report["references"]), 2)
        self.assertEqual(len(self.report["figures"]), 6)
        self.assertEqual(sum(len(f["planes"]) for f in self.report["figures"]), 18)
        self.assertEqual(self.report["nativeSourceSha256"], review.AQUEDUCT_NATIVE_SOURCE_SHA)
        for key, rgb in {
            "ID23": [0, 190, 220],
            "ID24": [40, 140, 255],
            "ID25": [255, 190, 20],
            "ID26": [175, 100, 255],
            "ID41": [230, 80, 190],
            "candidate": [255, 70, 130],
        }.items():
            self.assertEqual(self.report["colors"][key]["rgb"], rgb)
        representatives = [g["representativeAppXYZ"][0] for g in self.report["groups"]]
        self.assertEqual([r["appXYZ"] for r in self.report["references"]], representatives)
        for figure in self.report["figures"]:
            path = review.OUTPUT / figure["path"]
            self.assertTrue(path.exists())
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), figure["sha256"])
            self.assertEqual(len(figure["planes"]), 3)
            self.assertTrue(all(p["axis"] in ("x", "y", "z") for p in figure["planes"]))
            self.assertTrue(all(p["valuesSha256"] and p["labelProjectionSha256"] and p["candidateProjectionSha256"] for p in figure["planes"]))


if __name__ == "__main__":
    unittest.main()
