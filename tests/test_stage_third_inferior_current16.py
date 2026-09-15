import gzip
import hashlib
import json
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import stage_third_inferior_current16 as stage


CANDIDATE_SHA = "dfa0506ddb5204d1a4f3c9d05bdff910952be24b573c26124ae761b92f77ed90"
STAGE_REPORT_SHA = "2f63a000cbb43d80211be2515789d626480197df646ec0e11a916187655a263c"
AFTER_COMPRESSED_SHA = "785ce199e2c7226e5527a771e953d1b78cfed1067179aa04c63b9eba74577e0f"
AFTER_RAW_SHA = "97480cb8894ff12fb3e77e5ada08f209dd142bff2f8ba4a4182d3cd43ffd310b"


@unittest.skipUnless(
    stage.CANDIDATE_DIR.joinpath("candidate.json").exists()
    and stage.STAGE_DIR.joinpath("repair.json").exists(),
    "Local current16 candidate/stage evidence is not packaged for CI",
)
class StageThirdInferiorCurrent16(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.candidate_path = stage.CANDIDATE_DIR / "candidate.json"
        cls.stage_path = stage.STAGE_DIR / "repair.json"
        cls.candidate = json.loads(cls.candidate_path.read_text(encoding="utf-8"))
        cls.repair = json.loads(cls.stage_path.read_text(encoding="utf-8"))
        cls.labels = stage.read_browser_volume(
            stage.SOURCE_LABELS, stage.MAGIC_LABELS, stage.LABEL_SHA
        )[2]

    def test_candidate_is_exact_reversible_16_point_transition(self):
        self.assertEqual(hashlib.sha256(self.candidate_path.read_bytes()).hexdigest(), CANDIDATE_SHA)
        self.assertEqual(self.candidate["sourceSha256"], stage.LABEL_SHA)
        self.assertEqual(self.candidate["inventorySha256"], stage.INVENTORY_SHA)
        self.assertEqual(self.candidate["native100ReportSha256"], stage.NATIVE_REPORT_SHA)
        self.assertEqual(self.candidate["count"], 16)
        expected = {tuple(point) for point in stage.current_points(self.labels)[0].tolist()}
        actual = {tuple(item["xyz"]) for item in self.candidate["points"]}
        self.assertEqual(actual, expected)
        self.assertEqual(len(actual), 16)
        self.assertTrue(all(item["before"] == 25 and item["after"] == 0 for item in self.candidate["points"]))
        points = np.asarray(sorted(actual), dtype=np.int64)
        self.assertTrue(np.all(self.labels[tuple(points.T)] == 25))
        self.assertEqual(self.candidate["representatives"], [[195, 265, 107], [196, 268, 108]])
        self.assertEqual(self.candidate["rationale"], "visible specimen上で外部開放空間へ突出する局所誤収録を除く")
        self.assertFalse(self.candidate["adopted"])
        self.assertFalse(self.candidate["expertReviewed"])
        self.assertFalse(self.candidate["published"])
        self.assertFalse(self.candidate["publicMutation"])

    def test_stage_gzip_diff_reverse_and_label_counts(self):
        before_path = stage.STAGE_DIR / "before.bin.gz"
        after_path = stage.STAGE_DIR / "labels.bin.gz"
        before_compressed = before_path.read_bytes()
        after_compressed = after_path.read_bytes()
        self.assertEqual(hashlib.sha256(before_compressed).hexdigest(), stage.LABEL_SHA)
        self.assertEqual(hashlib.sha256(after_compressed).hexdigest(), AFTER_COMPRESSED_SHA)
        self.assertEqual(before_compressed[:10], after_compressed[:10])
        before_raw = gzip.decompress(before_compressed)
        after_raw = gzip.decompress(after_compressed)
        before = np.frombuffer(before_raw[10:], dtype=np.uint8).reshape(stage.SHAPE, order="F")
        after = np.frombuffer(after_raw[10:], dtype=np.uint8).reshape(stage.SHAPE, order="F")
        self.assertEqual(hashlib.sha256(after_raw[10:]).hexdigest(), AFTER_RAW_SHA)
        self.assertEqual(int(np.count_nonzero(before != after)), 16)
        changed = np.argwhere(before != after)
        self.assertTrue(np.all(before[tuple(changed.T)] == 25))
        self.assertTrue(np.all(after[tuple(changed.T)] == 0))
        restored = after.copy()
        points = np.asarray([item["xyz"] for item in self.candidate["points"]], dtype=np.int64)
        restored[tuple(points.T)] = 25
        self.assertTrue(np.array_equal(restored, before))
        self.assertEqual(self.repair["thirdVentricleBefore"], 11853)
        self.assertEqual(self.repair["thirdVentricleAfter"], 11837)
        self.assertTrue(self.repair["gzipHeaderPreserved"])
        self.assertEqual(self.repair["afterRawVoxelSha256"], AFTER_RAW_SHA)
        for label in np.unique(before):
            label = int(label)
            if label not in (0, 25):
                self.assertEqual(self.repair["labelVoxelCountsBefore"][str(label)], self.repair["labelVoxelCountsAfter"][str(label)])

    def test_all_native_and_historical_evidence_is_pinned(self):
        evidence = self.candidate["evidence"]
        native = next(item for item in evidence if item["path"] == stage.NATIVE_REPORT.relative_to(stage.ROOT).as_posix())
        self.assertEqual(native["sha256"], stage.NATIVE_REPORT_SHA)
        self.assertEqual((native["figureCount"], native["planeCount"]), (6, 18))
        for figure in native["figures"]:
            self.assertEqual(hashlib.sha256((stage.NATIVE_REPORT.parent / figure["path"]).read_bytes()).hexdigest(), figure["sha256"])
        extent = [item for item in evidence if item.get("axis") in ("x", "y", "z")]
        self.assertEqual(len(extent), 3)
        self.assertEqual(sum(item["planeCount"] for item in extent), 69)
        for item in extent:
            report_path = stage.ROOT / item["path"]
            self.assertEqual(hashlib.sha256(report_path.read_bytes()).hexdigest(), item["sha256"])
            for figure in item["figures"]:
                self.assertEqual(hashlib.sha256(report_path.parent.joinpath(figure["path"]).read_bytes()).hexdigest(), figure["sha256"])
        self.assertEqual(hashlib.sha256(self.stage_path.read_bytes()).hexdigest(), STAGE_REPORT_SHA)


if __name__ == "__main__":
    unittest.main()
