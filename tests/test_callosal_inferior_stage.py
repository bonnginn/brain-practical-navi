"""Pinned sixth-stage edits and atomic rejection, not anatomical ground truth."""
import hashlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import build_bigbrain_practical_seg as b
from apply_segmentation_patch import read_volume,validate_patch


class CallosalInferiorTests(unittest.TestCase):
    def setUp(self):
        self.source=b.ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosal-inferior-8cc6.bin.gz'
        dims,payload=read_volume(self.source)
        self.before=bytes(payload)
        self.volume=np.frombuffer(self.before,dtype=np.uint8).reshape(dims,order='F').copy()
        self.record=b.ROOT/'segmentation-patches/review/callosum-inferior-exclusion-project-review-2026-09-06.json'

    def test_exact_sixth_stage(self):
        audit=b.apply_approved_callosal_inferior_patch(self.volume,self.record)
        before=np.frombuffer(self.before,dtype=np.uint8);after=self.volume.ravel(order='F')
        changed=np.flatnonzero(after!=before).astype('<u4')
        self.assertEqual(len(changed),2160)
        self.assertEqual(hashlib.sha256(changed.tobytes()).hexdigest(),b.CALLOSUM_INFERIOR_INDICES_SHA256)
        self.assertTrue(np.all(before[changed]==30));self.assertTrue(np.all(after[changed]==0))
        self.assertEqual(hashlib.sha256(after.tobytes()).hexdigest(),'afc55069f2ecdcad36429f1026276f10c8e17a31fa9c6bf985b3beec3f640130')
        self.assertEqual(int(np.sum(after==30)),146019)
        self.assertFalse(audit['expertReviewed']);self.assertFalse(audit['completeCallosum'])

    def test_late_provenance_failure_is_atomic(self):
        with patch.object(Path,'relative_to',side_effect=ValueError('outside repository')):
            with self.assertRaisesRegex(ValueError,'outside repository'):
                b.apply_approved_callosal_inferior_patch(self.volume,self.record)
        self.assertEqual(self.volume.tobytes(order='F'),self.before)

    def test_wrong_review_or_wrong_exact_set_is_atomic(self):
        record,edits,metadata=validate_patch(self.record,self.volume.shape,self.volume.size,bytearray(self.before),b.CALLOSUM_INFERIOR_SOURCE_SHA256)
        for scenario in ('review','set','value'):
            proposed=dict(record);changed=list(edits)
            if scenario=='review':proposed['reviewStatus']='unreviewed'
            elif scenario=='set':changed=changed[:-1]
            else:changed[-1]=(changed[-1][0],31)
            with self.subTest(scenario=scenario),patch.object(b,'validate_patch',return_value=(proposed,changed,metadata)):
                with self.assertRaises(ValueError):b.apply_approved_callosal_inferior_patch(self.volume,self.record)
                self.assertEqual(self.volume.tobytes(order='F'),self.before)

    def test_already_applied_or_modified_baseline_is_rejected(self):
        for scenario in ('modified','already-applied'):
            self.volume[...] = np.frombuffer(self.before,dtype=np.uint8).reshape(self.volume.shape,order='F')
            if scenario=='modified':self.volume[0,0,0]=255
            else:b.apply_approved_callosal_inferior_patch(self.volume,self.record)
            before=self.volume.tobytes(order='F')
            with self.subTest(scenario=scenario),self.assertRaisesRegex(ValueError,'baseline changed'):
                b.apply_approved_callosal_inferior_patch(self.volume,self.record)
            self.assertEqual(self.volume.tobytes(order='F'),before)


if __name__=='__main__':unittest.main()
