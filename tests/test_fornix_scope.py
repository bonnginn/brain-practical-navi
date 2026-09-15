import hashlib
import json
import sys
import unittest
from unittest.mock import patch
from pathlib import Path
import tempfile
import zipfile


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import audit_fornix_scope  # noqa: E402


class FornixScopeInventoryTests(unittest.TestCase):
    def current_inventory(self):
        # These host sources also contain unrelated UI/nerve/mesh changes.
        # Run the current semantic checks, rather than claiming to replay the
        # unrecoverable historical Canvas bytes. Other fixed inputs stay pinned.
        current_hashes = {
            key: hashlib.sha256((ROOT / audit_fornix_scope.INPUTS[key]).read_bytes()).hexdigest()
            for key in ("structureProvenance", "atlasVolumeCanvas", "specimenBuilder")
        }
        fixture_path = ROOT / "tests/fixtures/block-cavities-pre-fine-20260915.zip"
        with zipfile.ZipFile(fixture_path) as fixture:
            pinned_bytes = fixture.read("specimen-blocks.json")
        pinned = json.loads(pinned_bytes)
        current = json.loads((ROOT / "public/atlas/specimen-blocks.json").read_text(encoding="utf-8"))
        pinned_fornix = next(p for p in pinned["specimens"]["commissural-system"] if p["part"] == "fornix")
        current_fornix = next(p for p in current["specimens"]["commissural-system"] if p["part"] == "fornix")
        self.assertEqual(current_fornix, pinned_fornix)
        with tempfile.TemporaryDirectory() as temp:
            historical_manifest = Path(temp) / "specimen-blocks.json"
            historical_manifest.write_bytes(pinned_bytes)
            inputs = dict(audit_fornix_scope.INPUTS)
            inputs["specimenBlocks"] = str(historical_manifest)
            with patch.dict(audit_fornix_scope.EXPECTED_SHA256, current_hashes), \
                    patch.object(audit_fornix_scope, "INPUTS", inputs):
                result = audit_fornix_scope.inventory()
        return result

    def test_inventory_is_fixed_and_separates_teaching_from_drafts(self):
        result = self.current_inventory()
        self.assertFalse(result["mutation"])
        self.assertFalse(result["adopted"])
        self.assertFalse(result["expertReviewed"])
        self.assertEqual(result["quizEligibility"], "none")
        current = result["currentTeaching"]
        self.assertEqual(current["surfaceDeepFornix"]["representations"], ["schematic-3d"])
        self.assertEqual(current["surfaceDeepFornix"]["labelIds"], [])
        self.assertEqual(current["sectionFornix"]["quizEligibility"], "none")
        self.assertEqual(current["papezStepper"]["targetKeys"], ["fornix"])
        self.assertEqual(current["papezStepper"]["sectionLabelIds"], [])
        self.assertEqual(result["unadoptedImageDrafts"]["body"]["pointCount"], 1098)
        self.assertEqual(result["unadoptedImageDrafts"]["bend"]["pointCount"], 130)
        self.assertEqual(result["unadoptedImageDrafts"]["combined"]["pointCount"], 1228)
        self.assertEqual(result["unadoptedImageDrafts"]["body"]["registered300XYZBounds"], [[316, 336], [404, 421], [291, 299]])
        self.assertEqual(result["unadoptedImageDrafts"]["bend"]["registered300XYZBounds"], [[320, 331], [422, 434], [283, 289]])
        self.assertEqual(result["currentTeaching"]["mesh"]["storedVertexOrder"], ["z", "y", "x"])
        self.assertEqual(result["currentTeaching"]["mesh"]["storedVertexBoundsZYXmm"], [[-29.5, -1.5], [-30.499662399291992, 21.5], [-4.5, 4.5]])
        self.assertEqual(result["sharedMeshMapping"]["usedBy"], ["currentTeaching.surfaceDeepFornix", "currentTeaching.sectionFornix"])
        grid = result["unadoptedImageDrafts"]["gridContainment"]
        self.assertEqual((grid["mappedAppVoxelCount"], grid["fullyInsideCount"], grid["existingLabelCenterConflicts"]), (301, 75, 0))

    def test_current_scope_matches_preserved_historical_report(self):
        before = audit_fornix_scope.OUTPUT.read_bytes()
        self.assertEqual(hashlib.sha256(before).hexdigest(), "7346d9662d620f7667fd2067eea6d657039114a06750507cb56caf022f2f47d6")
        historical = json.loads(before)
        result = self.current_inventory()
        for key in result:
            if key != "inputs":
                self.assertEqual(result[key], historical[key], key)
        for name, expected in audit_fornix_scope.EXPECTED_SHA256.items():
            if name not in ("structureProvenance", "atlasVolumeCanvas", "specimenBuilder"):
                self.assertEqual(result["inputs"][name]["sha256"], expected, name)
        # Keep the complete current fornix provenance entries, not just counts.
        import zipfile
        with zipfile.ZipFile(ROOT / "tests/fixtures/schematic-roots-pre-20260915.zip") as fixture:
            old = json.loads(fixture.read("public/atlas/structure-provenance.json"))
        current = json.loads((ROOT / "public/atlas/structure-provenance.json").read_text(encoding="utf-8"))
        for key in ("surface-deep-fornix", "section-fornix"):
            self.assertEqual(next(e for e in current["entries"] if e["key"] == key),
                             next(e for e in old["entries"] if e["key"] == key))
        self.assertEqual(audit_fornix_scope.OUTPUT.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
