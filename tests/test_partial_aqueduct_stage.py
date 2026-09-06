"""Test the prepared adoption stage without adopting the current candidate."""
import hashlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import build_bigbrain_practical_seg as builder
from apply_segmentation_patch import read_volume


class PartialAqueductStageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dims, cls.payload=read_volume(builder.ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz')
        cls.candidate=builder.ROOT/'segmentation-patches/review/aqueduct-reclassification-candidate-2026-09-05.json'

    def volume(self):
        return np.frombuffer(bytes(self.payload),dtype=np.uint8).reshape(self.dims,order='F').copy()

    def test_actual_unreviewed_candidate_is_rejected_without_mutation(self):
        volume=self.volume()
        with self.assertRaisesRegex(ValueError,'strict approved'):
            builder.apply_approved_partial_aqueduct_patch(volume,self.candidate)
        self.assertEqual(hashlib.sha256(volume.tobytes(order='F')).hexdigest(),builder.AQUEDUCT_SOURCE_LABELS_SHA256)

    def test_simulated_approved_stage_is_exact_and_reversible(self):
        volume=self.volume()
        edits=[(i,41) for i in builder.AQUEDUCT_PARTIAL_INDICES]
        # Synthetic approval only in memory; no review file or public asset changes.
        metadata=({'reviewStatus':'approved','review':{'testFixture':True}},edits,{'status':'strict'})
        with patch.object(builder,'validate_patch',return_value=metadata):
            audit=builder.apply_approved_partial_aqueduct_patch(volume,self.candidate)
        flat=volume.ravel(order='F')
        before=np.frombuffer(self.payload,dtype=np.uint8)
        self.assertEqual(np.flatnonzero(flat!=before).tolist(),list(builder.AQUEDUCT_PARTIAL_INDICES))
        self.assertTrue(np.all(flat[list(builder.AQUEDUCT_PARTIAL_INDICES)]==41))
        flat[list(builder.AQUEDUCT_PARTIAL_INDICES)]=26
        np.testing.assert_array_equal(flat,before)
        self.assertFalse(audit['completeAqueduct'])
        self.assertFalse(audit['expertReviewed'])

    def test_simulated_approval_cannot_expand_or_retarget(self):
        for mode in ('extra','moved','wrong-label'):
            with self.subTest(mode=mode):
                volume=self.volume()
                edits=[(i,41) for i in builder.AQUEDUCT_PARTIAL_INDICES]
                if mode=='extra':edits.append((0,41))
                if mode=='moved':edits[0]=(0,41)
                if mode=='wrong-label':edits[0]=(edits[0][0],0)
                with patch.object(builder,'validate_patch',return_value=({'reviewStatus':'approved'},edits,{'status':'strict'})):
                    with self.assertRaisesRegex(ValueError,'exact 16-voxel'):
                        builder.apply_approved_partial_aqueduct_patch(volume,self.candidate)
                self.assertEqual(hashlib.sha256(volume.tobytes(order='F')).hexdigest(),builder.AQUEDUCT_SOURCE_LABELS_SHA256)


if __name__=='__main__':unittest.main()
