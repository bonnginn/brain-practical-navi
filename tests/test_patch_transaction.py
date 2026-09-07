"""Rejected reviewed patches must leave the caller's volume unchanged."""
import hashlib
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import build_bigbrain_practical_seg as builder


class PatchTransactionTests(unittest.TestCase):
    def check_rejection(self, function, digest_name, edits, initial=None):
        volume = np.zeros((4, 4, 4), dtype=np.uint8) if initial is None else initial
        before = volume.copy()
        digest = hashlib.sha256(volume.tobytes(order='F')).hexdigest()
        metadata = ({'reviewStatus': 'approved'}, edits, {'status': 'strict'})
        with patch.object(builder, digest_name, digest), patch.object(builder, 'validate_patch', return_value=metadata):
            with self.assertRaises(ValueError):
                function(volume, builder.ROOT / 'dummy.json')
        np.testing.assert_array_equal(volume, before)

    def test_mammillary_aggregate_mismatch_is_atomic(self):
        self.check_rejection(builder.apply_approved_patch, 'MAMMILLARY_SOURCE_LABELS_SHA256', [(0, 39)])

    def test_mammillary_late_invalid_label_is_atomic(self):
        self.check_rejection(builder.apply_approved_patch, 'MAMMILLARY_SOURCE_LABELS_SHA256', [(0, 39), (1, 23)])

    def test_ventricle_aggregate_mismatch_is_atomic(self):
        self.check_rejection(builder.apply_approved_ventricle_patch, 'VENTRICLE_SOURCE_LABELS_SHA256', [(0, 23)])

    def test_ventricle_late_invalid_label_is_atomic(self):
        self.check_rejection(builder.apply_approved_ventricle_patch, 'VENTRICLE_SOURCE_LABELS_SHA256', [(0, 23), (1, 39)])

    def test_ventricle_late_nonzero_source_is_atomic(self):
        volume = np.zeros((4, 4, 4), dtype=np.uint8)
        volume[1, 0, 0] = 27
        self.check_rejection(builder.apply_approved_ventricle_patch, 'VENTRICLE_SOURCE_LABELS_SHA256', [(0, 23), (1, 24)], volume)

    def test_ventricle_report_path_failure_is_atomic(self):
        volume = np.zeros((4, 4, 4), dtype=np.uint8)
        before = volume.copy()
        edits = [(i, 23 if i < 14 else 24 if i < 29 else 25) for i in range(33)]
        digest = hashlib.sha256(volume.tobytes(order='F')).hexdigest()
        metadata = ({'reviewStatus': 'approved', 'review': {}}, edits, {'status': 'strict'})
        with patch.object(builder, 'VENTRICLE_SOURCE_LABELS_SHA256', digest), patch.object(builder, 'validate_patch', return_value=metadata):
            with self.assertRaises(ValueError):
                builder.apply_approved_ventricle_patch(volume, builder.ROOT.parent / 'outside-review.json')
        np.testing.assert_array_equal(volume, before)


if __name__ == '__main__':
    unittest.main()
