import hashlib
import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import audit_current_schematic_roots_scope as audit  # noqa: E402


class CurrentSchematicRootsScopeTests(unittest.TestCase):
    def test_mesh_regions_and_current_status(self):
        report_path = ROOT / "segmentation-patches/review/current-schematic-roots-scope-inventory-2026-09-14.json"
        report = json.loads(report_path.read_text(encoding="utf-8"))
        self.assertEqual(report["format"], "brain-practical-current-schematic-roots-scope-inventory")
        self.assertEqual(report["status"], {"mutation": False, "adopted": False, "expertReviewed": False})
        self.assertEqual(report["provenance"]["representations"], ["schematic-3d"])
        self.assertEqual(report["provenance"]["quizEligibility"], "pilot")
        self.assertEqual(report["quizHold"]["heldTargets"], ["cn10", "cn11", "cn5", "cn9"])
        expected_ids = {"V": (30, 31), "IX": (38, 39), "X": (40, 41), "XI": (42, 43)}
        for nerve, (left_id, right_id) in expected_ids.items():
            for side, region_id in (("left", left_id), ("right", right_id)):
                region = report["structures"][nerve][side]
                self.assertEqual(region["regionId"], region_id)
                self.assertEqual(region["vertexCount"], 160)
                self.assertEqual(region["ringCount"], 16)
                self.assertEqual(region["ringIndexRange"], [0, 15])
                self.assertEqual(region["sidesPerRing"], 10)
                self.assertEqual(region["faceCount"], 300)
        self.assertEqual(report["structures"]["V"]["mesh"], "pontine")
        for nerve in ("IX", "X", "XI"):
            self.assertEqual(report["structures"][nerve]["mesh"], "medullary")

    def test_inputs_and_deterministic_bytes(self):
        path = ROOT / "segmentation-patches/review/current-schematic-roots-scope-inventory-2026-09-14.json"
        before = path.read_bytes()
        report = json.loads(before.decode("utf-8"))
        mesh_paths = {spec[0] for spec in audit.MESHES.values()}
        self.assertEqual(set(report["fixedInputs"]), set(audit.INPUTS) | mesh_paths)
        for relative, expected in audit.MESHES.values():
            self.assertEqual(report["fixedInputs"][relative]["sha256"], expected)
        self.assertEqual(report["generator"]["sha256"], audit.INPUTS["scripts/build_neurovascular_overlays.py"])
        for declaration in report["generator"]["declarations"].values():
            self.assertEqual(declaration["generatorCall"], "pair")
            self.assertTrue(declaration["mirroredSides"])
            self.assertEqual(declaration["controlPointCount"], 4)
        self.assertEqual(len(report["historicalImageEvidence"]), 5)
        self.assertTrue(all(item["expertReviewed"] is False for item in report["historicalImageEvidence"]))
        self.assertEqual(hashlib.sha256(before).hexdigest(), "3947032405d9822f126cf0213d89303b6eaf3afa48620e36f2e050a19f61b0e4")
        if not audit.EVIDENCE_ROOT.exists():
            self.skipTest("Requires uncommitted local image review evidence for regeneration")
        missing = [relative for relative in audit.EVIDENCE if not (ROOT / relative).is_file()]
        if missing:
            self.fail("Local evidence directory exists but evidence is incomplete: " + ", ".join(missing))
        regenerated = audit.build_report()
        regenerated_bytes = (json.dumps(regenerated, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        self.assertEqual(regenerated_bytes, before)


if __name__ == "__main__":
    unittest.main()
