"""Coverage and retained-input checks, not anatomical approval."""
import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DetachedReviewTests(unittest.TestCase):
    def test_complete_contiguous_planes_and_files(self):
        folder = ROOT / 'work/anatomy-review/third-ventricle-detached137-native-v2'
        report = json.loads((folder / 'report.json').read_text(encoding='utf-8'))
        source = ROOT / 'tests/fixtures/bigbrain-practical-segmentation-pre-third-detached8-ffb8.bin.gz'
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), report['labelsSha256'])
        self.assertFalse(report['mutation'])
        self.assertFalse(report['adopted'])
        self.assertEqual(len(report['figures']), 26)
        self.assertEqual(report['generatedPlanes'], 78)
        for axis, low, high in [('x', 320, 334), ('y', 401, 436), ('z', 264, 290)]:
            actual = [i for f in report['figures'] if f['axis'] == axis for i in f['nativeIndices']]
            self.assertEqual(actual, list(range(low, high + 1)))
        for figure in report['figures']:
            self.assertEqual(hashlib.sha256((folder / figure['path']).read_bytes()).hexdigest(), figure['sha256'])


if __name__ == '__main__':
    unittest.main()
