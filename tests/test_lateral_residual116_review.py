"""Review coverage and identity checks, not anatomical validation."""
import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
from stage_lateral_detached547 import validate_review
from build_orthogonal_review_bundle import read_browser_volume, MAGIC_LABELS

SHA = 'a512880c4dcd1b1291664f8ee4aaa3bd8d609b62dd2e037634953cd7ebd12efd'


class Residual116Review(unittest.TestCase):
    def report(self, axis):
        folder = ROOT/f'work/anatomy-review/lateral-residual116-after80-series-{axis}-v1'
        return folder, json.loads((folder/'report.json').read_text())

    def test_complete_same_component_and_all_figures(self):
        _, _, labels = read_browser_volume(ROOT/'work/anatomy-review/lateral-residual80-stage-v1/labels.bin.gz', MAGIC_LABELS, SHA)
        cc, _ = ndimage.label(labels == 24, ndimage.generate_binary_structure(3, 3))
        ident = int(cc[241,247,105])
        self.assertGreater(ident, 0)
        expected = np.argwhere(cc == ident)
        self.assertEqual(len(expected), 116)
        planes = 0
        for axis in 'xyz':
            folder, report = self.report(axis)
            np.testing.assert_array_equal(validate_review(report, axis, expected_sha=SHA, expected_count=116), expected)
            self.assertFalse(report['mutation'])
            self.assertFalse(report['adopted'])
            for figure in report['figures']:
                self.assertEqual(hashlib.sha256((folder/figure['path']).read_bytes()).hexdigest(), figure['sha256'])
                planes += len(figure['indices'])
        self.assertEqual(planes, 81)

    def test_missing_extent_or_wrong_revision_rejected(self):
        _, report = self.report('x')
        missing = copy.deepcopy(report)
        missing['figures'].pop(0)
        wrong = copy.deepcopy(report)
        wrong['labelsSha256'] = '0'*64
        for changed in [missing, wrong]:
            with self.assertRaises(ValueError):
                validate_review(changed, 'x', expected_sha=SHA, expected_count=116)


if __name__ == '__main__':
    unittest.main()
