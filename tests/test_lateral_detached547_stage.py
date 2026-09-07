"""Patch/coverage mechanics only; passing tests do not prove anatomy."""
import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
from stage_lateral_detached547 import validate_review, replay


class LateralDetachedTests(unittest.TestCase):
    def test_staged_mesh_impact_complete_and_exact(self):
        work = ROOT/'work/anatomy-review'
        folder = work/'lateral-detached547-meshes-v1'
        impact = json.loads((folder/'report.json').read_text())
        direction = json.loads((work/'lateral-detached547-mask-direction-v1.json').read_text())
        manifest = json.loads((ROOT/'public/atlas/specimen-blocks.json').read_text(encoding='utf-8'))
        expected = {(key, p['part']) for key, parts in manifest['specimens'].items() for p in parts}
        self.assertEqual(len(impact['blockMaskImpact']), 55)
        self.assertEqual({(r['block'], r['part']) for r in impact['blockMaskImpact']}, expected)
        self.assertEqual(len(direction['blockRows']), 55)
        self.assertEqual({(r['block'], r['part']) for r in direction['blockRows']}, expected)
        self.assertTrue(all(r['added'] == 0 for r in direction['blockRows']))
        self.assertEqual({(r['block'], r['part']): r['removed'] for r in direction['blockRows'] if r['removed']},
                         {('lateral-ventricle', 'tissue'): 414, ('lateral-ventricle', 'ventricular-cavity'): 76,
                          ('choroid-plexus', 'ventricular-cavity'): 6})
        self.assertFalse(impact['installationBlocked'])
        self.assertEqual(hashlib.sha256((folder/'report.json').read_bytes()).hexdigest(), direction['impactReportSha256'])
        for row in impact['blockMaskImpact']:
            if row['changedMaskVoxels']:
                self.assertTrue(row['beforeMatches'])
                for prefix, field in [('', 'afterSha256'), ('installed-', 'beforeSha256'), ('reproduced-before-', 'beforeSha256')]:
                    self.assertEqual(hashlib.sha256((folder/(prefix+row['file'])).read_bytes()).hexdigest(), row[field])
        section_folder = work/'lateral-detached547-section-meshes-v1'
        section = json.loads((section_folder/'report.json').read_text())
        self.assertTrue(section['allBeforeAssetsMatch'])
        self.assertEqual(set(section['changedMeshes']), {'section-current-lateral-ventricles.mesh', 'section-current-ventricular-system.mesh'})
        self.assertEqual(hashlib.sha256((section_folder/'report.json').read_bytes()).hexdigest(), direction['sectionReportSha256'])
        for name, meta in section['after']['meshes'].items():
            self.assertEqual(hashlib.sha256((section_folder/(name+'.mesh')).read_bytes()).hexdigest(), meta['sha256'])
            difference = 547 if 'lateral-ventricles' in name or 'ventricular-system' in name else 0
            self.assertEqual(section['before']['meshes'][name]['voxels']-meta['voxels'], difference)

    def report(self, axis='x'):
        return json.loads((ROOT/f'work/anatomy-review/lateral-detached547-series-{axis}-v1/report.json').read_text())

    def test_full_coverage_and_points_across_axes(self):
        points = validate_review(self.report(), 'x')
        for axis in 'yz':
            np.testing.assert_array_equal(points, validate_review(self.report(axis), axis))

    def test_missing_duplicate_shift_wrong_identity_rejected(self):
        original = self.report()
        for mode in ['missing', 'duplicate', 'shift', 'identity', 'duplicate-point']:
            changed = copy.deepcopy(original)
            if mode == 'missing':
                changed['figures'].pop(0)
            elif mode == 'duplicate':
                changed['figures'].insert(1, changed['figures'][0])
            elif mode == 'shift':
                for f in changed['figures']:
                    f['indices'] = [i+1 for i in f['indices']]
            elif mode == 'identity':
                changed['labelsSha256'] = '0'*64
            else:
                changed['points'][0] = changed['points'][1]
            with self.subTest(mode=mode), self.assertRaises(ValueError):
                validate_review(changed, 'x')

    def test_reversible_exact_points_and_conflict(self):
        points = validate_review(self.report(), 'x')
        before = np.zeros((394, 466, 378), dtype=np.uint8)
        before[tuple(points.T)] = 24
        before[0, 0, 0] = 25
        after = replay(before, points)
        self.assertEqual(np.count_nonzero(before != after), 547)
        self.assertEqual(after[0, 0, 0], 25)
        np.testing.assert_array_equal(replay(after, points, True), before)
        before[tuple(points[0])] = 23
        with self.assertRaises(ValueError):
            replay(before, points)


if __name__ == '__main__':
    unittest.main()
