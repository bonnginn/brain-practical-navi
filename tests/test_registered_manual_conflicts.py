import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_registered_manual_conflicts import collect_findings, issue_planes, render_issue


class RegisteredConflictTests(unittest.TestCase):
    def fixture(self):
        new = np.zeros((8, 9, 7), dtype=np.uint8)
        new[1:3, 2:4, 2:4] = 1
        new[6, 7, 5] = 1
        old = np.zeros_like(new); old[1, 2, 2] = 31
        raw = np.arange(new.size, dtype=np.int32).reshape(new.shape).astype(np.uint8)
        raw[raw == 255] = 254
        raw[6, 7, 5] = 255
        return old, new, raw

    def test_categories_are_exact_and_do_not_mutate(self):
        old, new, raw = self.fixture()
        snapshots = [a.copy() for a in (old, new, raw)]
        records = collect_findings(old, new, raw, (10, 20, 30))
        self.assertEqual(len(records), 3)
        by_kind = {r['kind']: r for r in records}
        for kind in ('image-background-code', 'small-six-component'):
            self.assertEqual(by_kind[kind]['points'], [[16, 27, 35]])
            self.assertEqual(by_kind[kind]['voxelCount'], 1)
        overlap = by_kind['nonmanual-overlap']
        self.assertEqual(overlap['currentId'], 31)
        self.assertEqual(overlap['candidateId'], 1)
        self.assertEqual(overlap['points'], [[11, 22, 32]])
        self.assertEqual(len({r['key'] for r in records}), 3)
        for before, after in zip(snapshots, (old, new, raw)):
            np.testing.assert_array_equal(before, after)

    def test_six_not_diagonal_connectivity(self):
        new = np.zeros((4, 4, 4), dtype=np.uint8)
        new[1, 1, 1] = new[2, 2, 2] = 2
        records = collect_findings(np.zeros_like(new), new, np.zeros_like(new))
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['kind'], 'small-six-component')
        self.assertEqual(records[0]['voxelCount'], 1)
        # Selection of a largest component for enumeration never deletes a tie.
        self.assertEqual(np.count_nonzero(new), 2)

    def test_invalid_shape_dtype_and_labels_refused(self):
        old, new, raw = self.fixture()
        for args in ((old[:-1], new, raw), (old, new.astype(float), raw)):
            with self.assertRaises(ValueError): collect_findings(*args)
        new[0, 0, 0] = 23
        with self.assertRaises(ValueError): collect_findings(old, new, raw)

    def test_planes_cover_each_axis_and_neighbors(self):
        planes = issue_planes([[1, 2, 3], [3, 4, 5]], (8, 9, 7))
        self.assertEqual([i for a, i in planes if a == 'x'], list(range(0, 5)))
        self.assertEqual([i for a, i in planes if a == 'y'], list(range(1, 6)))
        self.assertEqual([i for a, i in planes if a == 'z'], list(range(2, 7)))
        self.assertEqual(len(planes), len(set(planes)))

    def test_raw_panel_and_issue_xyz_projection(self):
        old, new, raw = self.fixture()
        issue = next(r for r in collect_findings(old, new, raw) if r['kind'] == 'nonmanual-overlap')
        crop = dict(min=[0, 1, 1], max=[4, 5, 4])
        scale = 8
        for axis, index in (('x', 1), ('y', 2), ('z', 2)):
            result = np.array(render_issue(raw, old, new, issue, axis, index, crop))
            width = 5; height = 5 if axis == 'z' else 4
            for r in range(height):
                for c in range(width):
                    xyz = (index, 1+c, 4-r) if axis == 'x' else ((c, index, 4-r) if axis == 'y' else (c, 5-r, index))
                    self.assertTrue(np.all(result[30+r*scale:30+(r+1)*scale, c*scale:(c+1)*scale] == raw[xyz]))
                    if xyz == (1, 2, 2):
                        left = 2*(width*scale+10)+c*scale
                        self.assertTrue(np.all(result[30+r*scale:30+(r+1)*scale, left:left+scale] == [255, 220, 30]))


if __name__ == '__main__': unittest.main()
