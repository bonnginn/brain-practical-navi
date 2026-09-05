"""Pinned candidate checks; passing does not authorize anatomical adoption."""
import hashlib
import sys
import unittest
from pathlib import Path
from collections import Counter
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from apply_segmentation_patch import read_volume,validate_patch
from build_orthogonal_review_bundle import ROOT
DEFAULT_LABELS=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz'
EXPECTED_LABELS_SHA256='b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3'


class CapsuleCandidateTests(unittest.TestCase):
    def test_exact_transitions_and_full_restore(self):
        dims,labels=read_volume(DEFAULT_LABELS)
        sha=hashlib.sha256(DEFAULT_LABELS.read_bytes()).hexdigest()
        self.assertEqual(sha,EXPECTED_LABELS_SHA256)
        path=ROOT/'segmentation-patches/review/capsule-morphology-candidate-2026-09-06.json'
        patch,edits,metadata=validate_patch(path,dims,len(labels),labels,sha)
        self.assertEqual(metadata['status'],'strict')
        self.assertEqual(patch['review']['decision'],'unreviewed')
        self.assertEqual(patch['confidence'],'low')
        self.assertEqual(Counter(labels[i] for i,_ in edits),{31:856,32:760})
        after=labels.copy()
        for i,value in edits:
            self.assertEqual(value,0)
            after[i]=value
        self.assertEqual(after.count(0)-labels.count(0),1616)
        for label in range(1,42):
            if label not in (31,32):self.assertEqual(after.count(label),labels.count(label))
        for i,_ in edits:after[i]=labels[i]
        self.assertEqual(after,labels)


if __name__=='__main__':unittest.main()
