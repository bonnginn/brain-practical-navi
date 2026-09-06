"""Real-volume safety checks for the bounded, unadopted ID26 exclusion."""
import hashlib
import sys
import subprocess
import tempfile
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from prepare_fourth_ventricle_candidate import component
import prepare_fourth_ventricle_candidate as historical_candidate
import render_ventricle_fragment_review as historical_fragments
from apply_segmentation_patch import read_volume, validate_patch
DEFAULT_LABELS=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz'
EXPECTED_LABELS_SHA256='b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3'


class FourthVentricleCandidateTests(unittest.TestCase):
    def test_historical_cli_defaults_keep_the_archived_input(self):
        for module in (historical_candidate, historical_fragments):
            self.assertEqual(module.DEFAULT_LABELS, DEFAULT_LABELS)
            self.assertEqual(module.EXPECTED_LABELS_SHA256, EXPECTED_LABELS_SHA256)

    @classmethod
    def setUpClass(cls):
        cls.dims, cls.labels = read_volume(DEFAULT_LABELS)
        cls.path = ROOT / 'segmentation-patches/review/fourth-ventricle-exclusion-candidate-2026-09-05.json'
        cls.sha = hashlib.sha256(DEFAULT_LABELS.read_bytes()).hexdigest()

    def test_exact_reversible_component_only(self):
        patch, edits, metadata = validate_patch(self.path, self.dims, len(self.labels), self.labels, self.sha)
        self.assertEqual(self.sha, EXPECTED_LABELS_SHA256)
        self.assertEqual(metadata['status'], 'strict')
        self.assertEqual(patch['review']['decision'], 'unreviewed')
        self.assertEqual(len(edits), 16)
        grid = np.frombuffer(self.labels, dtype=np.uint8).reshape(self.dims, order='F')
        pts = component(grid == 26, (195, 199, 119))
        expected = {int(np.ravel_multi_index(p, self.dims, order='F')) for p in pts}
        self.assertEqual({i for i, _ in edits}, expected)
        after = self.labels.copy()
        for i, value in edits:
            self.assertEqual(self.labels[i], 26)
            self.assertEqual(value, 0)
            after[i] = value
        self.assertEqual(after.count(26), 8551)
        # Keep the separate Z114 fragment and the entire main cavity untouched.
        self.assertEqual(after[int(np.ravel_multi_index((193, 195, 114), self.dims, order='F'))], 26)
        self.assertEqual(after[:394*466*98], self.labels[:394*466*98])
        for i, _ in edits:
            after[i] = 26
        self.assertEqual(after, self.labels)

    def test_wrong_source_fails(self):
        with self.assertRaisesRegex(ValueError, 'sourceLabelsSha256'):
            validate_patch(self.path, self.dims, len(self.labels), self.labels, '0'*64)

    def test_anterior_fragments_exclude_only_the_two_reviewed_components(self):
        path=ROOT/'segmentation-patches/review/fourth-ventricle-anterior-fragments-candidate-2026-09-06.json'
        candidate,edits,metadata=validate_patch(path,self.dims,len(self.labels),self.labels,self.sha)
        self.assertEqual(metadata['status'],'strict')
        self.assertEqual(candidate['reviewStatus'],'unreviewed')
        grid=np.frombuffer(self.labels,dtype=np.uint8).reshape(self.dims,order='F')
        left=component(grid==26,(172,239,73));right=component(grid==26,(218,239,73))
        self.assertEqual((len(left),len(right)),(16,15))
        expected={int(np.ravel_multi_index(p,self.dims,order='F')) for p in left+right}
        self.assertEqual({i for i,_ in edits},expected)
        after=self.labels.copy()
        for i,v in edits:
            self.assertEqual(v,0);self.assertEqual(after[i],26);after[i]=v
        self.assertEqual(after.count(26),8536)
        for p in [(193,195,114),(195,199,119)]:
            self.assertEqual(after[int(np.ravel_multi_index(p,self.dims,order='F'))],26)
        for i,_ in edits:after[i]=26
        self.assertEqual(after,self.labels)

    def test_aqueduct_reclassification_preserves_exact_fragment(self):
        path = ROOT/'segmentation-patches/review/aqueduct-reclassification-candidate-2026-09-05.json'
        patch, edits, metadata = validate_patch(path, self.dims, len(self.labels), self.labels, self.sha)
        _, old_edits, _ = validate_patch(self.path, self.dims, len(self.labels), self.labels, self.sha)
        self.assertEqual(edits, [(i, 41) for i, _ in old_edits])
        self.assertEqual(patch['targetStructures'], [{'id':26,'name':'第四脳室'}, {'id':41,'name':'中脳水道候補（部分）'}])
        self.assertEqual(patch['reviewStatus'], 'unreviewed')
        self.assertEqual(metadata['status'], 'strict')
        after = self.labels.copy()
        for i, value in edits:
            after[i] = value
        self.assertEqual(after.count(41), 16)
        self.assertEqual(after.count(26), 8551)
        self.assertEqual(after.count(0), self.labels.count(0))

    def test_unreviewed_cannot_emit_volume(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'candidate.bin.gz'
            result = subprocess.run([sys.executable, '-X', 'utf8', str(ROOT/'scripts/apply_segmentation_patch.py'),
                str(self.path), '--input', str(DEFAULT_LABELS), '--output', str(output)],
                capture_output=True, text=True, encoding='utf-8')
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('review decision approved', result.stderr)
            self.assertFalse(output.exists())

    def test_connectivity_is_six_neighbour_and_does_not_wrap(self):
        a = np.zeros((3, 3, 3), dtype=bool)
        a[0, 0, 0] = a[1, 0, 0] = a[2, 2, 2] = a[1, 1, 1] = True
        self.assertEqual(component(a, (0, 0, 0)), [(0, 0, 0), (1, 0, 0)])
        with self.assertRaises(ValueError):
            component(a, (0, 1, 0))


if __name__ == '__main__':
    unittest.main()
