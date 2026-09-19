import gzip
import hashlib
import json
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from install_optic_central112 import replay,labels
from build_section_ventricle_meshes import reconstruct

class OpticCentralAdoptionTests(unittest.TestCase):
    def test_exact_transition_and_mesh(self):
        before_bytes=(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-optic-central112.bin.gz').read_bytes()
        after_bytes=(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()
        record=json.loads((ROOT/'segmentation-patches/review/optic-central112-adoption-2026-09-19.json').read_bytes())
        before,after=labels(before_bytes),labels(after_bytes)
        self.assertEqual(hashlib.sha256(before_bytes).hexdigest(),record['beforeSha256'])
        self.assertEqual(hashlib.sha256(after_bytes).hexdigest(),record['afterSha256'])
        self.assertTrue(np.array_equal(replay(before,record['points']),after))
        self.assertTrue(np.array_equal(replay(after,record['points'],True),before))
        self.assertEqual(int(np.count_nonzero(before!=after)),112)
        self.assertEqual(sum(p['before']==0 for p in record['points']),19)
        self.assertEqual(sum(p['before']==33 for p in record['points']),93)
        raw,info=reconstruct((after==36).transpose(2,1,0))
        self.assertEqual(info['componentSizes'],[108,2,2])
        mesh=(ROOT/'public/atlas/section-current-optic-chiasm-partial.mesh').read_bytes()
        self.assertEqual(gzip.decompress(mesh),raw)
        meta=json.loads((ROOT/'public/atlas/section-current-optic-chiasm-partial.json').read_bytes())
        self.assertEqual(meta['sourceSha256'],record['afterSha256'])
        self.assertEqual(meta['labelIds'],[36])
        self.assertEqual(meta['sha256'],hashlib.sha256(mesh).hexdigest())
        self.assertTrue(meta['partialExtent'])
        self.assertFalse(meta['expertReviewed'])

    def test_conflicts_and_duplicate_points_rejected(self):
        before=labels((ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-optic-central112.bin.gz').read_bytes())
        points=json.loads((ROOT/'segmentation-patches/review/optic-central112-adoption-2026-09-19.json').read_bytes())['points']
        with self.assertRaises(ValueError):replay(before,points[:-1]+[points[0]])
        bad=before.copy();bad[tuple(points[0]['xyz'])]=27
        with self.assertRaises(ValueError):replay(bad,points)

if __name__=='__main__':unittest.main()
