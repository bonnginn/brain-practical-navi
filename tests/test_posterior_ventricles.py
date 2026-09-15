import copy
import gzip
import json
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_posterior_ventricles158 import replay,sha,POSTERIOR,POSTERIOR_SHA
from review_third_posterior_native100 import interior_offsets


class PosteriorVentriclesTest(unittest.TestCase):
    def fixture(self):
        points=np.indices((6,6,6)).reshape(3,-1).T[:158]
        entries=[dict(xyz=p.tolist(),before=25 if i<94 else 0 if i<106 else 27,after=0 if i<94 else 41) for i,p in enumerate(points)]
        labels=np.zeros((6,6,6),np.uint8)
        for p in entries:labels[tuple(p['xyz'])]=p['before']
        labels[5,5,5]=39
        return labels,entries

    def test_exact_reversible_regions_without_collateral_changes(self):
        before,entries=self.fixture();after=replay(before,entries)
        self.assertEqual(int(np.count_nonzero(after!=before)),158)
        self.assertTrue(np.array_equal(replay(after,entries,True),before))
        self.assertEqual(after[5,5,5],39)

    def test_count_type_duplicates_bounds_and_conflicts_fail_closed(self):
        before,entries=self.fixture()
        for mutate in [lambda p:p.pop(),lambda p:p[0].update(before=True),lambda p:p[0].update(after=41),
                       lambda p:p[0].update(xyz=p[1]['xyz']),lambda p:p[0].update(xyz=[6,0,0]),
                       lambda p:p[0].update(xyz=[.5,0,0])]:
            bad=copy.deepcopy(entries);mutate(bad)
            with self.assertRaises(ValueError):replay(before,bad)
        bad=before.copy();bad[0,0,0]=0
        with self.assertRaises(ValueError):replay(bad,entries)
        after=replay(before,entries);after[0,0,0]=25
        with self.assertRaises(ValueError):replay(after,entries,True)

    def test_quadrature_is_symmetric_inside_cells_not_corner_or_exact_volume_claim(self):
        offsets=interior_offsets()
        self.assertEqual(offsets.shape,(27,3));self.assertTrue(np.all(np.abs(offsets)<.5))
        self.assertTrue(np.allclose(offsets.mean(0),0));self.assertEqual(len(np.unique(offsets,axis=0)),27)
        for invalid in [True,1,10,3.0]:
            with self.assertRaises(ValueError):interior_offsets(invalid)

    def test_adoption_matches_all_retained_stage_bytes_and_reverses(self):
        path=ROOT/'segmentation-patches/review/posterior-ventricles158-adoption-2026-09-08.json'
        raw=path.read_bytes();self.assertEqual(sha(raw),'f45703a468358528c46b80dfc83d7c1bfaaa3b29079e842d0c45fab82df7c2ec')
        r=json.loads(raw)
        base=(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-posterior-ventricles158.bin.gz').read_bytes()
        current=(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-upper729.bin.gz').read_bytes()
        self.assertEqual(sha(base),r['beforeSha256']);self.assertEqual(sha(current),r['afterSha256'])
        load=lambda b:np.frombuffer(gzip.decompress(b),np.uint8,offset=10).reshape((394,466,378),order='F')
        before=load(base);after=load(current)
        self.assertTrue(np.array_equal(replay(before,r['points']),after))
        self.assertTrue(np.array_equal(replay(after,r['points'],True),before))
        self.assertEqual(sha(after.tobytes(order='F')),r['afterRawVoxelSha256'])
        self.assertEqual(int(np.count_nonzero(after==25)),11853);self.assertEqual(int(np.count_nonzero(after==41)),259)
        self.assertTrue(np.all(after[before==41]==41));self.assertEqual(r['heldAqueductLocatorCount'],30)
        self.assertFalse(r['expertReviewed']);self.assertFalse(r['published']);self.assertTrue(r['projectAdopted'])

    @unittest.skipUnless((ROOT/POSTERIOR).exists(),'Local original image review not packaged for CI')
    def test_local_review_images_and_selected_core_are_pinned(self):
        raw=(ROOT/POSTERIOR).read_bytes();self.assertEqual(sha(raw),POSTERIOR_SHA);r=json.loads(raw)
        self.assertEqual(r['candidateCount'],94);self.assertEqual(len(r['figures']),14)
        self.assertEqual(sum(len(f['planes']) for f in r['figures']),39)
        self.assertFalse(r['adopted']);self.assertFalse(r['mutation'])
        for f in r['figures']:self.assertEqual(sha(((ROOT/POSTERIOR).parent/f['path']).read_bytes()),f['sha256'])
        for p in r['points']:
            self.assertGreaterEqual(p['samplesBelow40000'],22);self.assertEqual(p['sampleCount'],27)
            self.assertEqual(p['before'],25);self.assertEqual(p['after'],0)


if __name__=='__main__':unittest.main()
