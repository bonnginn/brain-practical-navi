import json
import sys
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import review_lateral_midline597_regional_triage as triage


def triage_context_palette():
    return {
        str(label_id): {"rgb": triage.CONTEXT_PALETTE[label_id], "legend": f"ID{label_id}"}
        for label_id in (23, 24, 25, 26, 41)
    }


@unittest.skipUnless(
    triage.OUTPUT.joinpath("report.json").exists(),
    "Local regional review evidence is not packaged for CI",
)
class LateralMidline597RegionalTriage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = json.loads(triage.OUTPUT.joinpath("report.json").read_text(encoding="utf-8"))
        _, _, cls.labels = triage.read_browser_volume(
            triage.SOURCE_LABELS, triage.MAGIC_LABELS, triage.LABEL_SHA
        )

    def test_exact_set_difference_and_current_label_state(self):
        remaining, adopted, _, _ = triage._load_points(self.labels)
        self.assertEqual(len(remaining), 597)
        self.assertEqual(len(adopted), 75)
        self.assertEqual(len({tuple(point) for point in remaining}), 597)
        self.assertEqual(len({tuple(point) for point in adopted}), 75)
        self.assertTrue(np.all(self.labels[tuple(remaining.T)] == 0))
        self.assertEqual(self.report["currentLabelSha256"], triage.LABEL_SHA)

    def test_deterministic_component_order_and_summaries(self):
        expected = [
            (389, [194, 253, 152], [210, 270, 170]),
            (110, [191, 261, 146], [204, 271, 150]),
            (49, [193, 255, 164], [203, 264, 166]),
            (20, [194, 235, 165], [198, 247, 165]),
        ]
        actual = [
            (component["count"], component["bounds"]["min"], component["bounds"]["max"])
            for component in self.report["components"][:4]
        ]
        self.assertEqual(actual, expected)
        self.assertEqual(self.report["componentCount"], 19)
        self.assertEqual(sum(component["count"] for component in self.report["components"]), 597)
        for component in self.report["components"]:
            self.assertEqual(set(component["sixNeighborContactCandidateCounts"]), {"23", "24", "25", "26", "41"})
            self.assertTrue(component["representativePoints"])

    def test_report_flags_points_and_top_figures_are_consistent(self):
        self.assertEqual(
            (self.report["mutation"], self.report["adopted"], self.report["expertReviewed"]),
            (False, False, False),
        )
        report_points = {tuple(point) for point in self.report["candidatePoints"]}
        component_points = {
            tuple(point)
            for component in self.report["components"]
            for point in component["points"]
        }
        self.assertEqual(report_points, component_points)
        self.assertEqual(
            [(item["componentId"], item["figureCount"]) for item in self.report["renderedTopComponents"]],
            [("component-01", 9), ("component-02", 9), ("component-03", 9), ("component-04", 9)],
        )
        for item in self.report["renderedTopComponents"]:
            child = triage.ROOT / item["reportPath"]
            self.assertTrue(child.exists())
            child_report = json.loads(child.read_text(encoding="utf-8"))
            self.assertFalse(child_report["mutation"])
            self.assertFalse(child_report["adopted"])
            self.assertFalse(child_report["expertReviewed"])
            self.assertEqual(child_report["contextLabelIds"], [23, 24, 25, 26, 41])
            self.assertEqual(child_report["contextPalette"], triage_context_palette())
            self.assertEqual(len(child_report["figures"]), 9)
            for figure in child_report["figures"]:
                figure_path = child.parent.joinpath(figure["path"])
                self.assertTrue(figure_path.exists())
                with Image.open(figure_path) as image:
                    pixels = np.asarray(image)
                for metadata in child_report["contextPalette"].values():
                    rgb = np.asarray(metadata["rgb"], dtype=np.uint8)
                    self.assertTrue(np.any(np.all(pixels == rgb, axis=2)))

    def test_context_palette_validation_and_default_report_compatibility(self):
        import review_lateral_detached547 as detached

        for invalid in ((23, 23), (22,), (23, True), "23"):
            with self.assertRaises(ValueError):
                detached.main(context_label_ids=invalid)
        default_report_path = triage.ROOT / "work/anatomy-review/lateral-superomedial75-native300-v1/report.json"
        if default_report_path.exists():
            default_report = json.loads(default_report_path.read_text(encoding="utf-8"))
            self.assertNotIn("contextLabelIds", default_report)


if __name__ == "__main__":
    unittest.main()
