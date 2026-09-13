import hashlib
import json
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import review_lateral_midline597_component04_native100 as review


@unittest.skipUnless(
    review.OUTPUT.joinpath("report.json").exists(),
    "Local native100 review evidence is not packaged for CI",
)
class LateralMidline597Component04Native100(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = json.loads((review.OUTPUT / "report.json").read_text(encoding="utf-8"))
        cls.labels = review.read_browser_volume(review.SOURCE_LABELS, review.MAGIC_LABELS, review.LABEL_SHA)[2]
        cls.v2 = json.loads(review.REGIONAL_REPORT.read_text(encoding="utf-8"))
        cls.component = next(item for item in cls.v2["components"] if item["componentId"] == "component-04")

    def test_component_points_match_v2_and_are_currently_unlabelled(self):
        self.assertEqual(self.report["triageComponentId"], "component-04")
        self.assertEqual(self.report["candidateCount"], 20)
        expected = {tuple(point) for point in self.component["points"]}
        actual = {tuple(point) for point in self.report["candidatePoints"]}
        self.assertEqual(actual, expected)
        points = np.asarray(self.report["candidatePoints"], dtype=np.int64)
        self.assertTrue(np.all(self.labels[tuple(points.T)] == 0))
        self.assertEqual(self.report["triageComponentBounds"], {"min": [194, 235, 165], "max": [198, 247, 165]})
        self.assertEqual(self.report["representativeAppXYZ"], [[197, 242, 165], [194, 246, 165], [198, 245, 165]])

    def test_native100_references_figures_and_projection_hashes(self):
        self.assertEqual(
            (self.report["mutation"], self.report["adopted"], self.report["expertReviewed"]),
            (False, False, False),
        )
        self.assertEqual(len(self.report["references"]), 3)
        self.assertEqual(len(self.report["figures"]), 9)
        self.assertEqual(sum(len(figure["planes"]) for figure in self.report["figures"]), 27)
        self.assertEqual(self.report["locatorSha256"], review.REGIONAL_REPORT_SHA)
        self.assertEqual(self.report["currentLabelSha256"], review.LABEL_SHA)
        for reference, expected in zip(self.report["references"], self.report["representativeAppXYZ"]):
            self.assertEqual(reference["appXYZ"], expected)
            self.assertEqual(len(reference["nativeXYZ"]), 3)
        for figure in self.report["figures"]:
            path = review.OUTPUT / figure["path"]
            self.assertTrue(path.exists())
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), figure["sha256"])
            for plane in figure["planes"]:
                self.assertIn(plane["axis"], ("x", "y", "z"))
                self.assertTrue(plane["valuesSha256"])
                self.assertTrue(plane["labelProjectionSha256"])
                self.assertTrue(plane["candidateProjectionSha256"])

    def test_native100_palette_and_scope_are_explicit(self):
        self.assertEqual(
            self.report["native100LabelLegend"],
            {
                "ID23": {"color": "cyan", "rgb": [0, 190, 220]},
                "ID24": {"color": "cyan", "rgb": [0, 190, 220]},
                "ID25": {"color": "amber", "rgb": [255, 190, 20]},
                "candidate": {"color": "pink", "rgb": [255, 70, 130]},
            },
        )
        self.assertIn("do not establish cavity identity", self.report["limitation"])
        self.assertTrue(self.report["visualReviewPending"])


if __name__ == "__main__":
    unittest.main()
