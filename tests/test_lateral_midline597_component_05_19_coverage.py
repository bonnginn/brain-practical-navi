import hashlib
import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import audit_lateral_midline597_component_05_19_coverage as audit  # noqa: E402


OUTPUT = ROOT / "work/anatomy-review/lateral-midline597-component-05-19-coverage-v1/report.json"


@unittest.skipUnless(OUTPUT.exists(), "Local regional review evidence is not packaged for CI")
class LateralMidline597ComponentCoverage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = json.loads(OUTPUT.read_text(encoding="utf-8"))

    def test_exact_components_current_label_and_coverage(self):
        self.assertEqual(self.report["currentLabel"]["sha256"], audit.CURRENT_LABEL_SHA)
        self.assertEqual(self.report["currentLabel"]["dims"], [394, 466, 378])
        self.assertEqual(self.report["currentLabel"]["targetPointValueCounts"], {"0": 29})
        self.assertEqual(self.report["locator"]["targetComponents"], [f"component-{index:02d}" for index in range(5, 20)])
        self.assertEqual(self.report["locator"]["targetPointCount"], 29)
        self.assertFalse(self.report["locator"]["sourceCurrentLabelShaMatches"])
        self.assertEqual(self.report["coveredPointCount"], 29)
        self.assertEqual(self.report["uncoveredPointCount"], 0)
        self.assertEqual(self.report["uncoveredPoints"], [])
        self.assertEqual(self.report["additionalReviewTargets"], [])
        self.assertEqual(len(self.report["points"]), 29)
        self.assertTrue(all(item["covered"] and set(axis for axis, covered in item["axisCoverage"].items() if covered) == {"x", "y", "z"} for item in self.report["points"]))
        self.assertTrue(all(item["mismatchCount"] == 0 for item in self.report["coverageMethod"]["mappingValidation"] if item["checked"]))
        self.assertEqual((self.report["mutation"], self.report["adopted"], self.report["expertReviewed"]), (False, False, False))

    def test_existing_evidence_hashes_and_deterministic_report(self):
        self.assertEqual(len(self.report["existingEvidence"]), len(audit.EVIDENCE))
        for item in self.report["existingEvidence"]:
            self.assertEqual(item["reportSha256"], audit.EVIDENCE[item["path"]])
            self.assertFalse(item["labelsShaMatchesCurrent"])
            self.assertGreater(item["figureCount"], 0)
            for figure in item["figures"]:
                self.assertTrue((ROOT / Path(item["path"]).parent / figure["path"]).exists())
                self.assertRegex(figure["sha256"], r"^[0-9a-f]{64}$")
        before = OUTPUT.read_bytes()
        regenerated = audit.build_report()
        regenerated_bytes = (json.dumps(regenerated, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        self.assertEqual(regenerated_bytes, before)
        self.assertEqual(hashlib.sha256(before).hexdigest(), "170191caa5e6b1a9dbe2a503f967c6dcc797c8ad10eb3cfdfc55f275820bf044")


if __name__ == "__main__":
    unittest.main()
