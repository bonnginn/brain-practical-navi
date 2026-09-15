import hashlib
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import inventory_stage2_ventricular_terminals as inventory


REPORT_SHA = "6d0475b6af9330a1d2ee8ddb4663c20fced18968a678bc709ef62ae3dc2b9a0d"
V1_REPORT = inventory.ROOT / "work/anatomy-review/stage2-ventricular-terminals-inventory-v1/report.json"
V1_REPORT_SHA = "16948907383cba28e95b1fe753b83755a47d4d30cbfb93feb8374fa36878455f"
V2_REPORT = inventory.ROOT / "work/anatomy-review/stage2-ventricular-terminals-inventory-v2/report.json"
V2_REPORT_SHA = "e31d45493df393b473d19df08aff4978538bf64e949e91fdd2cf070f9f1a89f7"


class Stage2VentricularTerminalsInventory(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not (inventory.ROOT / "work/anatomy-review").exists():
            raise unittest.SkipTest("Requires uncommitted native-image review evidence")
        cls.report_path = inventory.OUTPUT
        cls.report = json.loads(cls.report_path.read_text(encoding="utf-8"))

    def test_current_label_and_report_input_digests_are_pinned(self):
        self.assertEqual(hashlib.sha256(inventory.SOURCE_LABELS.read_bytes()).hexdigest(), inventory.CURRENT_LABEL_SHA)
        self.assertEqual(hashlib.sha256(self.report_path.read_bytes()).hexdigest(), REPORT_SHA)
        self.assertTrue(V1_REPORT.exists())
        self.assertEqual(hashlib.sha256(V1_REPORT.read_bytes()).hexdigest(), V1_REPORT_SHA)
        self.assertTrue(V2_REPORT.exists())
        self.assertEqual(hashlib.sha256(V2_REPORT.read_bytes()).hexdigest(), V2_REPORT_SHA)
        for source in self.report["inputs"]:
            path = inventory.ROOT / source["path"]
            self.assertTrue(path.exists(), source["path"])
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), source["sha256"])

    def test_three_regions_replay_current_values_without_mutation(self):
        self.assertEqual(
            (self.report["mutation"], self.report["adopted"], self.report["expertReviewed"]),
            (False, False, False),
        )
        expected = {
            "aqueduct": (30, 94, {"0": 11, "27": 19}, 0),
            "thirdVentricleInferiorTerminal": (16, 24, {"25": 16}, 0),
            "fourthVentricleInferior": (316, 316, {"0": 316}, 0),
        }
        for name, (count, held, values, overlap) in expected.items():
            region = self.report["regions"][name]
            self.assertEqual(region["currentHeldCount"], count)
            self.assertEqual(len(region["currentHeldPoints"]), count)
            self.assertEqual(len({tuple(point) for point in region["currentHeldPoints"]}), count)
            self.assertEqual(region["historicalHeldCount"], held)
            self.assertEqual(region["currentHeldValueCounts"], values)
            self.assertEqual(region["currentHeldAdoptedCoordinateOverlapCount"], overlap)
            self.assertEqual(region["historicalContextCount"], {"aqueduct": 273, "thirdVentricleInferiorTerminal": 24, "fourthVentricleInferior": 316}[name])
            self.assertFalse(region["directCurrentLabelComparison"])
            self.assertIn("current-SHA overlay needed", region["nextEvidence"])

    def test_each_region_preserves_scope_and_reusable_review_evidence(self):
        for region in self.report["regions"].values():
            self.assertTrue(region["reviewEvidence"])
            self.assertTrue(region["limitation"])
            self.assertEqual(region["currentlyUnlabelledCount"] + region["currentNonzeroCount"], region["currentHeldCount"])
            self.assertTrue(region["historicalAdoptedCoordinateOverlapBySource"])


if __name__ == "__main__":
    unittest.main()
