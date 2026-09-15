import hashlib
import json
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import review_third_inferior_current16_native100 as review


REPORT_SHA = "1a0d59a0e3860ad590c076188e27d2fdb284cfde73d277dc55de90c2fec37216"


@unittest.skipUnless(
    review.OUTPUT.joinpath("report.json").exists(),
    "Local third-inferior current16 native100 evidence is not packaged for CI",
)
class ThirdInferiorCurrent16Native100(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report_path = review.OUTPUT / "report.json"
        cls.report = json.loads(cls.report_path.read_text(encoding="utf-8"))
        cls.inventory = json.loads(review.INVENTORY.read_text(encoding="utf-8"))
        cls.historical_locator_path = review.ROOT / "work/anatomy-review/third-inferior-terminal24-candidate-v1.json"
        cls.historical_locator = json.loads(cls.historical_locator_path.read_text(encoding="utf-8"))
        cls.labels = review.read_browser_volume(
            review.SOURCE_LABELS, review.MAGIC_LABELS, review.LABEL_SHA
        )[2]

    def test_inventory_points_values_and_historical_separation(self):
        self.assertEqual(hashlib.sha256(review.INVENTORY.read_bytes()).hexdigest(), review.INVENTORY_SHA)
        region = self.inventory["regions"]["thirdVentricleInferiorTerminal"]
        expected = {tuple(point) for point in region["currentHeldPoints"]}
        actual = {tuple(point) for point in self.report["candidatePoints"]}
        self.assertEqual(expected, actual)
        self.assertEqual(len(actual), 16)
        points = np.asarray(self.report["candidatePoints"], dtype=np.int64)
        self.assertTrue(np.all(self.labels[tuple(points.T)] == 25))
        self.assertEqual(self.report["currentHeldValueCounts"], {"25": 16})
        self.assertEqual(self.report["currentHeldDefinition"]["rangesInclusive"], {
            "x": [195, 196], "y": [265, 268], "z": [107, 108]
        })
        self.assertEqual(self.report["historicalContextCount"], 24)
        self.assertEqual(self.report["historicalHeldCount"], 24)
        self.assertEqual(self.report["historicalExcluded24"]["count"], 24)
        historical_points = {tuple(item["xyz"]) for item in self.historical_locator["points"]}
        self.assertEqual(len(historical_points), 24)
        self.assertTrue(actual.isdisjoint(historical_points))
        self.assertEqual(self.report["historicalExcluded24"]["locatorSha256"], hashlib.sha256(self.historical_locator_path.read_bytes()).hexdigest())

    def test_representatives_native_figures_and_flags(self):
        self.assertEqual(self.report["representativeAppXYZ"], [[195, 265, 107], [196, 268, 108]])
        self.assertEqual(len(self.report["representativeNativeMm"]), 2)
        self.assertTrue(all(len(point) == 3 for point in self.report["representativeNativeMm"]))
        self.assertEqual(len(self.report["figures"]), 6)
        self.assertEqual(sum(len(figure["planes"]) for figure in self.report["figures"]), 18)
        self.assertEqual(self.report["currentLabelSha256"], review.LABEL_SHA)
        self.assertEqual(self.report["nativeSourceSha256"], review.SOURCE_SHA)
        self.assertEqual(
            (self.report["mutation"], self.report["adopted"], self.report["expertReviewed"]),
            (False, False, False),
        )
        self.assertEqual(self.report["colors"], {
            "ID25": {"name": "amber", "rgb": [255, 190, 20]},
            "held16": {"name": "pink", "rgb": [255, 70, 130]},
        })
        for figure in self.report["figures"]:
            path = review.OUTPUT / figure["path"]
            self.assertTrue(path.exists())
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), figure["sha256"])
            self.assertEqual(len(figure["planes"]), 3)
            self.assertEqual(len({plane["axis"] for plane in figure["planes"]}), 1)
            for plane in figure["planes"]:
                self.assertTrue(plane["valuesSha256"])
                self.assertTrue(plane["labelProjectionSha256"])
                self.assertTrue(plane["candidateProjectionSha256"])

    def test_report_digest(self):
        self.assertEqual(hashlib.sha256(self.report_path.read_bytes()).hexdigest(), REPORT_SHA)


if __name__ == "__main__":
    unittest.main()
