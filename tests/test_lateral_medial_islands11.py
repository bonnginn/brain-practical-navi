import copy
import gzip
import json
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
from stage_lateral_medial_islands11 import replay, LABEL_SHA, POINTS, digest
from inventory_lateral_review_candidates import inventory


class MedialIslands11(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.record = json.loads((ROOT/'segmentation-patches/review/lateral-medial-islands11-adoption-2026-09-12.json').read_bytes())
        blob = (ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-medial-islands11.bin.gz').read_bytes()
        if digest(blob) != LABEL_SHA:
            raise ValueError('Baseline changed')
        cls.before = np.frombuffer(gzip.decompress(blob), np.uint8, offset=10).reshape((394,466,378), order='F')

    def test_exact_exclusion_and_reversal(self):
        r = self.record
        result = replay(self.before, r['points'])
        self.assertEqual(np.count_nonzero(result != self.before), 11)
        self.assertEqual(digest(result.tobytes(order='F')), r['afterRawVoxelSha256'])
        self.assertTrue(np.array_equal(replay(result, r['points'], True), self.before))
        self.assertEqual(int((result == 23).sum()), 81633)
        self.assertEqual(int((result == 24).sum()), 82204)
        self.assertEqual(r['visuallyInspectedUniquePlanes'], 45)
        self.assertEqual(sum(len(e['visuallyInspectedFigures']) for e in r['evidence']), 17)
        self.assertTrue(r['projectAdopted'])
        self.assertFalse(r['expertReviewed'])
        self.assertFalse(r['published'])

    def test_invalid_or_conflicting_edits_rejected(self):
        for mutate in (lambda p:p.pop(), lambda p:p[0].update(xyz=p[1]['xyz']),
                       lambda p:p[0].update(xyz=[148.0,231,120]),
                       lambda p:p[0].update(before=24), lambda p:p[0].update(after=False),
                       lambda p:p[0].update(xyz=[-1,231,120])):
            bad = copy.deepcopy(self.record['points']); mutate(bad)
            with self.assertRaises(ValueError):
                replay(self.before, bad)
        with self.assertRaisesRegex(ValueError, 'Conflicting'):
            replay(replay(self.before, self.record['points']), self.record['points'])


class CandidateInventory(unittest.TestCase):
    def test_six_connected_inventory_and_no_implicit_side_split(self):
        points = [dict(xyz=q, after=k) for k, q in
                  [(23,[2,2,2]), (23,[3,2,2]), (23,[4,3,2]), (24,[1,1,1])]]
        rows = inventory(points)
        self.assertEqual([(r['side'],r['count']) for r in rows], [(23,2),(23,1),(24,1)])
        self.assertEqual(inventory([]), [])

    def test_wrong_label_coordinates_and_cross_side_duplicates_rejected(self):
        bad = [[dict(xyz=[1,2,3], after=k)] for k in (25, True, 23.0)]
        bad += [[dict(xyz=q, after=23)] for q in ([1.0,2,3],[-1,2,3],[394,2,3],[1,466,3],[1,2,378],[1,2])]
        bad += [[dict(xyz=[1,2,3], after=k) for k in (23,24)]]
        for points in bad:
            with self.assertRaises(ValueError):
                inventory(points)


if __name__ == '__main__':
    unittest.main()
