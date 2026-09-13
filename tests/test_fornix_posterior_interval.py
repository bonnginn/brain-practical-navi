import hashlib
import json
import sys
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import render_fornix_posterior_interval as review  # noqa: E402


class FornixPosteriorIntervalTests(unittest.TestCase):
    def test_report_has_exact_interval_and_no_new_points(self):
        report = json.loads((review.OUTPUT / "report.json").read_text(encoding="utf-8"))
        self.assertEqual(report["registered300Y"], list(range(392, 405)))
        self.assertEqual(len(report["figures"]), 13)
        self.assertEqual(report["bodyDraftPointCount"], 1098)
        self.assertEqual(report["newCandidatePointCount"], 0)
        self.assertEqual(report["sourceSha256"], review.IMAGE_SHA)
        self.assertEqual(report["bodyDraftReportSha256"], review.BODY_SHA)
        self.assertEqual(report["existingWideCoronalReportSha256"], review.WIDE_SHA)
        self.assertEqual(report["cropLowXYZ"], [305, 340, 230])
        self.assertEqual(report["cropHighExclusiveXYZ"], [350, 475, 345])
        self.assertEqual(set(report["fixedInputFiles"]), set(review.FIXED_FILES))
        self.assertTrue(all(
            report["fixedInputFiles"][path]["sha256"] == digest
            for path, digest in review.FIXED_FILES.items()
        ))
        self.assertFalse(report["adopted"])
        self.assertFalse(report["mutation"])
        self.assertTrue(report["visualReviewPending"])
        self.assertTrue(all(item["newCandidatePointCount"] == 0 for item in report["figures"]))
        self.assertTrue(all(item["rawPanelMatchesExistingWideCoronal"] is None for item in report["figures"] if item["index"] not in (392, 398, 404)))
        self.assertTrue(all(item["rawPanelMatchesExistingWideCoronal"] is True for item in report["figures"] if item["index"] in (392, 398, 404)))
        self.assertTrue(all(item["axis"] == "y" for item in report["figures"]))

    def test_figures_exist_and_report_is_reproducible(self):
        report_path = review.OUTPUT / "report.json"
        before = report_path.read_bytes()
        report = json.loads(before.decode("utf-8"))
        for item in report["figures"]:
            image = review.OUTPUT / item["path"]
            self.assertTrue(image.exists())
            self.assertEqual(hashlib.sha256(image.read_bytes()).hexdigest(), item["sha256"])
            with Image.open(image) as opened:
                self.assertEqual(opened.size, (650, 383))
        self.assertEqual(hashlib.sha256(before).hexdigest(), "6705173d2f8cd78cc3e79335af9162301e4aea9d668ef4ed6f3add404d7b00c3")


if __name__ == "__main__":
    unittest.main()
