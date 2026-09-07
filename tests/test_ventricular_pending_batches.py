"""Whole-volume replay of the pending upper omission / inferior exclusion batches."""
import gzip
import hashlib
import json
import unittest
import sys
import copy
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_ventricular_mixed12 import replay


class PendingBatches(unittest.TestCase):
    def test_combination_and_invalid_changes(self):
        evidence=(ROOT/'segmentation-patches/review/ventricular-mixed12-adoption-2026-09-07.json').read_bytes()
        self.assertEqual(hashlib.sha256(evidence).hexdigest(),'91319d05addfd63bc1263d9dfcae7a2beb607dfc080603089fe9d52508f2a9f7')
        r=json.loads(evidence)
        baseline=(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-ventricular-mixed12.bin.gz').read_bytes()
        current=(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()
        self.assertEqual(hashlib.sha256(baseline).hexdigest(),r['beforeSha256'])
        self.assertEqual(hashlib.sha256(current).hexdigest(),r['afterSha256'])
        before=np.frombuffer(gzip.decompress(baseline),np.uint8,offset=10).reshape((394,466,378),order='F')
        after=np.frombuffer(gzip.decompress(current),np.uint8,offset=10).reshape(before.shape,order='F')
        self.assertTrue(np.array_equal(replay(before,r['points']),after))
        self.assertTrue(np.array_equal(replay(after,r['points'],True),before))
        self.assertEqual(np.count_nonzero(before!=after),12)
        for field,value in [('before',False),('after',27),('xyz',[-1,0,0])]:
            entries=copy.deepcopy(r['points']);entries[0][field]=value
            with self.assertRaises(ValueError):replay(before,entries)
        entries=copy.deepcopy(r['points']);entries[1]=copy.deepcopy(entries[0])
        with self.assertRaises(ValueError):replay(before,entries)
        with self.assertRaises(ValueError):replay(after,r['points'])

    def test_exact_reversible_differences_and_shared_base(self):
        # Resolve optional local evidence before subTest can consume the error.
        (ROOT/'work/anatomy-review/fourth-upper-residual8-stage-v1/repair.json').read_bytes()
        for name,count,before_id,after_id in [('fourth-upper-residual8',8,0,26),('third-inferior4',4,25,0)]:
            with self.subTest(name=name):
                stage=ROOT/f'work/anatomy-review/{name}-stage-v1'
                r=json.loads((stage/'repair.json').read_bytes())
                before=(stage/'before.bin.gz').read_bytes();after=(stage/'labels.bin.gz').read_bytes()
                self.assertEqual(hashlib.sha256(before).hexdigest(),r['beforeSha256'])
                self.assertEqual(hashlib.sha256(after).hexdigest(),r['afterSha256'])
                self.assertEqual(r['beforeSha256'],'6626f8eb6da43ebd6f41e39e247c32338fb06588ee94b407549cd0a30f61aa08')
                a=gzip.decompress(before);b=gzip.decompress(after)
                self.assertEqual(a[:10],b[:10])
                original=np.frombuffer(a,np.uint8,offset=10).reshape((394,466,378),order='F')
                final=np.frombuffer(b,np.uint8,offset=10).reshape(original.shape,order='F')
                pts=np.asarray([p['xyz'] if isinstance(p,dict) else p for p in r['points']])
                self.assertEqual(len(np.unique(pts,axis=0)),count)
                expected=original.copy()
                self.assertTrue(np.all(expected[tuple(pts.T)]==before_id))
                expected[tuple(pts.T)]=after_id
                self.assertTrue(np.array_equal(expected,final))
                self.assertEqual(np.count_nonzero(original!=final),count)
                expected[tuple(pts.T)]=before_id
                self.assertTrue(np.array_equal(expected,original))
                self.assertFalse(r['adopted']);self.assertFalse(r['expertReviewed'])


if __name__=='__main__':unittest.main()
