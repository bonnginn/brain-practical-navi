import gzip
import json
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


class PosteriorIslandsStageTest(unittest.TestCase):
    def test_exact_two_exclusions_and_reverse(self):
        folder = ROOT / 'work/anatomy-review/posterior-ventricular-islands2-stage-v1'
        record = json.loads((folder / 'repair.json').read_text())
        before_raw = gzip.decompress((folder / 'before.bin.gz').read_bytes())
        after_raw = gzip.decompress((folder / 'labels.bin.gz').read_bytes())
        self.assertEqual(before_raw[:10], after_raw[:10])
        before = np.frombuffer(before_raw, dtype=np.uint8, offset=10).reshape((394,466,378), order='F')
        after = np.frombuffer(after_raw, dtype=np.uint8, offset=10).reshape(before.shape, order='F')
        np.testing.assert_array_equal(np.argwhere(before != after), [[151,111,156],[237,120,158]])
        restored = after.copy()
        for xyz, ident in [((151,111,156),23), ((237,120,158),24)]:
            self.assertEqual(before[xyz], ident)
            self.assertEqual(after[xyz], 0)
            restored[xyz] = ident
        np.testing.assert_array_equal(restored, before)
        self.assertEqual(record['count'], 2)
        self.assertFalse(record['adopted'])
        self.assertFalse(record['expertReviewed'])
        self.assertEqual(int((after == 23).sum()), 80373)
        self.assertEqual(int((after == 24).sum()), 79082)

    def test_all_block_masks_unchanged(self):
        report = json.loads((ROOT / 'work/anatomy-review/posterior-ventricular-islands2-meshes-v1/report.json').read_text())
        rows = report['blockMaskImpact']
        self.assertEqual(len(rows), 55)
        self.assertEqual(len({(r['block'],r['part']) for r in rows}), 55)
        self.assertFalse(report['installationBlocked'])
        self.assertTrue(all(r['changedMaskVoxels'] == 0 for r in rows))


if __name__ == '__main__':
    unittest.main()
