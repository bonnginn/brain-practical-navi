import hashlib
import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import audit_fornix_scope  # noqa: E402


class FornixScopeInventoryTests(unittest.TestCase):
    def test_inventory_is_fixed_and_separates_teaching_from_drafts(self):
        result = audit_fornix_scope.inventory()
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

    def test_input_hashes_and_output_are_deterministic(self):
        result = audit_fornix_scope.inventory()
        for name, expected in audit_fornix_scope.EXPECTED_SHA256.items():
            self.assertEqual(result["inputs"][name]["sha256"], expected, name)
        self.assertIn("atlasVolumeCanvas", result["inputs"])
        self.assertIn("specimenBuilder", result["inputs"])
        self.assertEqual(result["sharedMeshMapping"]["mappingToken"], 'item.key==="fornix"?"block-commissural-system-fornix"')
        payload = (json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode("utf-8")
        audit_fornix_scope.main()
        output = audit_fornix_scope.OUTPUT.read_bytes()
        self.assertEqual(output, payload)
        self.assertEqual(hashlib.sha256(output).hexdigest(), "7346d9662d620f7667fd2067eea6d657039114a06750507cb56caf022f2f47d6")


if __name__ == "__main__":
    unittest.main()
