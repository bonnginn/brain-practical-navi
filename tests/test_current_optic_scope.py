import hashlib
import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import audit_current_optic_scope as audit  # noqa: E402


class CurrentOpticScopeTests(unittest.TestCase):
    def test_current_volume_and_historical_coordinate_set(self):
        report = json.loads((ROOT / "segmentation-patches/review/current-optic-scope-inventory-2026-09-14.json").read_text(encoding="utf-8"))
        current = report["currentVolume"]
        self.assertEqual(current["sha256"], audit.EXPECTED_CURRENT_SHA)
        self.assertEqual(current["dims"], [394, 466, 378])
        self.assertEqual(current["label33"]["voxelCount"], 8482)
        self.assertEqual(current["label33"]["connectedComponentCount6"], 12)
        self.assertEqual(current["label33"]["bboxXYZ"], {"min": [163, 246, 86], "max": [228, 302, 122], "size": [66, 57, 37]})
        self.assertEqual(current["labelCounts"], {"36": 0, "37": 0, "38": 0})
        historical = report["historicalReference"]
        self.assertEqual(historical["sha256"], audit.EXPECTED_HISTORICAL_SHA)
        self.assertEqual(historical["auditInputSha256"], audit.EXPECTED_HISTORICAL_SHA)
        self.assertTrue(report["comparison"]["coordinateSetEqual"])
        self.assertEqual(report["comparison"]["currentOnlyCount"], 0)
        self.assertEqual(report["comparison"]["historicalOnlyCount"], 0)

    def test_status_inputs_and_deterministic_bytes(self):
        path = ROOT / "segmentation-patches/review/current-optic-scope-inventory-2026-09-14.json"
        before = path.read_bytes()
        report = json.loads(before.decode("utf-8"))
        self.assertEqual(report["format"], "brain-practical-current-optic-scope-inventory")
        self.assertEqual(set(report["fixedInputs"]), set(audit.DOC_INPUTS) | {"public/atlas/structure-provenance.json"})
        provenance = report["provenance"]
        self.assertEqual(provenance["path"], "public/atlas/structure-provenance.json")
        self.assertEqual(provenance["sha256"], audit.EXPECTED_PROVENANCE_SHA)
        self.assertEqual(provenance["key"], "visual-pathway-legacy-optic-label")
        self.assertEqual(provenance["legacyIds"], [33])
        self.assertEqual(provenance["quizEligibility"], "none")
        self.assertTrue(provenance["excludedFromSectionAndQuizTargets"])
        self.assertTrue(provenance["id36To38AwaitingSegmentation"])
        self.assertEqual(report["status"], {
            "mutation": False,
            "adopted": False,
            "expertReviewed": False,
            "id33ExcludedFromSectionAndQuiz": True,
            "ids36To38Unsegmented": True,
        })
        regenerated = audit.build_report()
        regenerated_bytes = (json.dumps(regenerated, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        self.assertEqual(regenerated_bytes, before)
        self.assertEqual(hashlib.sha256(before).hexdigest(), "1c8161009e3593bfa41c435204079b52c2ec619d62f9c529f7d62b2d23ecacdc")


if __name__ == "__main__":
    unittest.main()
