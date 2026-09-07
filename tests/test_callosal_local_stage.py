"""Exact review, provenance failure and rejection tests for local ID30 repair."""
import hashlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import build_bigbrain_practical_seg as b
from apply_segmentation_patch import read_volume,validate_patch


class CallosalLocalStageTests(unittest.TestCase):
    def setUp(self):
        self.source=b.ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz'
        dims,payload=read_volume(self.source)
        self.original=bytes(payload)
        self.volume=np.frombuffer(self.original,dtype=np.uint8).reshape(dims,order='F').copy()
        self.record=b.ROOT/'segmentation-patches/review/callosum-local-exclusion-project-review-2026-09-06.json'

    def test_exact_exclusion_preserves_every_other_voxel(self):
        audit=b.apply_approved_callosal_local_patch(self.volume,self.record)
        actual=self.volume.ravel(order='F');before=np.frombuffer(self.original,dtype=np.uint8)
        changed=np.flatnonzero(actual!=before)
        self.assertEqual(len(changed),1605)
        self.assertEqual(hashlib.sha256(changed.astype('<u4').tobytes()).hexdigest(),b.CALLOSUM_REPAIR_INDICES_SHA256)
        self.assertTrue(np.all(before[changed]==30));self.assertTrue(np.all(actual[changed]==0))
        self.assertEqual(int(np.sum(actual==30)),149775)
        self.assertEqual(hashlib.sha256(actual.tobytes()).hexdigest(),'35b2a2bf42c0f045141ea51c2adf66d9daea99fcf851a6404133a52b8cbde734')
        self.assertFalse(audit['expertReviewed']);self.assertFalse(audit['completeCallosum'])

    def test_audit_path_failure_does_not_mutate(self):
        validated=validate_patch(self.record,self.volume.shape,self.volume.size,self.original,b.CALLOSUM_SOURCE_COMPRESSED_SHA256)
        with patch.object(b,'validate_patch',return_value=validated):
            with self.assertRaises(ValueError):b.apply_approved_callosal_local_patch(self.volume,b.ROOT.parent/'outside.json')
        self.assertEqual(self.volume.tobytes(order='F'),self.original)

    def test_unapproved_and_changed_edit_set_rejected_atomically(self):
        record,edits,meta=validate_patch(self.record,self.volume.shape,self.volume.size,self.original,b.CALLOSUM_SOURCE_COMPRESSED_SHA256)
        for mutated in (({**record,'reviewStatus':'unreviewed'},edits,meta),(record,edits[:-1],meta)):
            with patch.object(b,'validate_patch',return_value=mutated):
                with self.assertRaises(ValueError):b.apply_approved_callosal_local_patch(self.volume,self.record)
            self.assertEqual(self.volume.tobytes(order='F'),self.original)


if __name__=='__main__':unittest.main()
