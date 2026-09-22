import hashlib
import json
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import audit_current_optic_scope as audit  # noqa: E402


class CurrentOpticScopeTests(unittest.TestCase):
    def test_pinned_document_newlines_and_content_tampering(self):
        lf = b"first\nsecond\n"
        crlf = lf.replace(b"\n", b"\r\n")
        self.assertEqual(audit.pinned_document_bytes(lf, audit.digest(crlf)), crlf)
        self.assertEqual(audit.pinned_document_bytes(crlf, audit.digest(lf)), lf)
        with self.assertRaises(ValueError):
            audit.pinned_document_bytes(b"changed\n", audit.digest(crlf))

    def test_historical_mixed_newlines_reconstruct_only_identical_content(self):
        import gzip
        reference = gzip.decompress((ROOT / "tests/fixtures/optic-pathway-audit-pinned.md.gz").read_bytes())
        lf = reference.replace(b"\r\n", b"\n")
        expected = audit.DOC_INPUTS["OPTIC_PATHWAY_AUDIT.md"]
        self.assertEqual(audit.pinned_document_bytes(lf, expected, reference), reference)
        with self.assertRaises(ValueError):
            audit.pinned_document_bytes(lf + b"changed", expected, reference)

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
        with tempfile.TemporaryDirectory() as folder:
            old_provenance = Path(folder) / "structure-provenance.json"
            with zipfile.ZipFile(ROOT / "tests/fixtures/schematic-roots-pre-20260915.zip") as archive:
                old_provenance.write_bytes(archive.read("public/atlas/structure-provenance.json"))
            with patch.object(audit, "PROVENANCE", old_provenance):
                regenerated = audit.build_report(replay_source=ROOT / "tests/fixtures/bigbrain-practical-segmentation-pre-lateral-roof8.bin.gz")
        current_document = json.loads((ROOT / "public/atlas/structure-provenance.json").read_text(encoding="utf-8"))
        current_entry = next(entry for entry in current_document["entries"] if entry.get("key") == audit.PROVENANCE_KEY)
        with zipfile.ZipFile(ROOT / "tests/fixtures/schematic-roots-pre-20260915.zip") as archive:
            historical_entry = next(entry for entry in json.loads(archive.read("public/atlas/structure-provenance.json"))["entries"] if entry.get("key") == audit.PROVENANCE_KEY)
        self.assertEqual(current_entry, historical_entry)
        regenerated_bytes = (json.dumps(regenerated, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        self.assertEqual(regenerated_bytes, before)
        self.assertEqual(hashlib.sha256(before).hexdigest(), "1c8161009e3593bfa41c435204079b52c2ec619d62f9c529f7d62b2d23ecacdc")


if __name__ == "__main__":
    unittest.main()
