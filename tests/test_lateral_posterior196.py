import copy
import gzip
import json
import sys
import unittest
from pathlib import Path

import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from stage_lateral_posterior_september12 import replay, digest, LABEL_SHA, HELD


class LateralPosterior196(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.record = json.loads((ROOT / 'segmentation-patches/review/lateral-posterior196-adoption-2026-09-12.json').read_bytes())
        blob = (ROOT / 'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-posterior196.bin.gz').read_bytes()
        if digest(blob) != LABEL_SHA:
            raise ValueError('Baseline changed')
        cls.before = np.frombuffer(gzip.decompress(blob), np.uint8, offset=10).reshape((394, 466, 378), order='F')

    def test_exact_local_volume_and_connectivity(self):
        r = self.record
        result = replay(self.before, r['points'])
        self.assertEqual(digest(result.tobytes(order='F')), r['afterRawVoxelSha256'])
        self.assertEqual(int(np.count_nonzero(result != self.before)), 196)
        self.assertTrue(np.array_equal(replay(result, r['points'], True), self.before))
        self.assertTrue(np.array_equal(result[self.before != 0], self.before[self.before != 0]))
        self.assertEqual(int(result[tuple(HELD)]), 0)
        for ident, count in ((23, 81637), (24, 82211)):
            self.assertEqual(int((result == ident).sum()), count)
            reached = ndimage.binary_propagation(self.before == ident, mask=result == ident)
            self.assertFalse(np.any((result == ident) & ~reached))
        self.assertEqual(r['visuallyInspectedUniquePlanes'], 71)
        self.assertEqual(sum(len(e['visuallyInspectedFigures']) for e in r['evidence']), 25)
        self.assertTrue(r['projectAdopted'])
        self.assertFalse(r['expertReviewed'])
        self.assertFalse(r['published'])

    def test_wrong_coordinates_sides_and_conflicts_are_rejected(self):
        entries = self.record['points']
        for mutate in (
            lambda p: p.pop(),
            lambda p: p[0].update(xyz=p[1]['xyz']),
            lambda p: p[0].update(xyz=[-1, 150, 150]),
            lambda p: p[0].update(xyz=[130.5, 150, 150]),
            lambda p: p[0].update(before=True),
            lambda p: p[0].update(after=25),
        ):
            bad = copy.deepcopy(entries)
            mutate(bad)
            with self.assertRaises(ValueError):
                replay(self.before, bad)
        bad = copy.deepcopy(entries)
        left = next(p for p in bad if p['after'] == 23)
        right = next(p for p in bad if p['after'] == 24)
        left['after'], right['after'] = 24, 23
        with self.assertRaisesRegex(ValueError, 'side identity'):
            replay(self.before, bad)
        with self.assertRaisesRegex(ValueError, 'Conflicting'):
            replay(replay(self.before, entries), entries)


if __name__ == '__main__':
    unittest.main()
