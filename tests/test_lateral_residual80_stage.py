"""Exact exclusion, retained evidence and coverage mechanics; not anatomy approval."""
import copy
import gzip
import json
import sys
import unittest
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
from stage_lateral_residual80 import SHA, replay, reviewed_points, digest, validate_review


class Residual80Tests(unittest.TestCase):
    def test_all_mesh_impacts_and_recovery_bytes(self):
        work=ROOT/'work/anatomy-review'
        folder=work/'lateral-residual80-meshes-v1'
        impact=json.loads((folder/'report.json').read_text())
        direction=json.loads((work/'lateral-residual80-mask-direction-v1.json').read_text())
        manifest=json.loads((ROOT/'public/atlas/specimen-blocks.json').read_text(encoding='utf-8'))
        expected={(b,p['part']) for b,parts in manifest['specimens'].items() for p in parts}
        self.assertEqual(len(impact['blockMaskImpact']),55)
        self.assertEqual({(r['block'],r['part']) for r in impact['blockMaskImpact']},expected)
        self.assertEqual(len(direction['blockRows']),55)
        self.assertEqual({(r['block'],r['part']) for r in direction['blockRows']},expected)
        self.assertTrue(all(r['added']==0 for r in direction['blockRows']))
        self.assertEqual({(r['block'],r['part']):r['removed'] for r in direction['blockRows'] if r['removed']},
                         {('lateral-ventricle','tissue'):1717,('lateral-ventricle','ventricular-cavity'):11,
                          ('choroid-plexus','tissue'):857,('choroid-plexus','ventricular-cavity'):11,
                          ('medial-temporal','inferior-horn'):11})
        self.assertFalse(impact['installationBlocked'])
        self.assertEqual(digest((folder/'report.json').read_bytes()),direction['impactReportSha256'])
        for r in impact['blockMaskImpact']:
            if r['changedMaskVoxels']:
                self.assertTrue(r['beforeMatches'])
                for prefix,key in [('', 'afterSha256'),('installed-','beforeSha256'),('reproduced-before-','beforeSha256')]:
                    self.assertEqual(digest((folder/(prefix+r['file'])).read_bytes()),r[key])
        folder=work/'lateral-residual80-section-meshes-v1'
        section=json.loads((folder/'report.json').read_text())
        self.assertEqual(digest((folder/'report.json').read_bytes()),direction['sectionReportSha256'])
        self.assertTrue(section['allBeforeAssetsMatch'])
        self.assertEqual(set(section['changedMeshes']),{'section-current-lateral-ventricles.mesh','section-current-ventricular-system.mesh'})
        for name,r in section['after']['meshes'].items():
            self.assertEqual(digest((folder/(name+'.mesh')).read_bytes()),r['sha256'])
            delta=80 if name in ['section-current-lateral-ventricles','section-current-ventricular-system'] else 0
            self.assertEqual(section['before']['meshes'][name]['voxels']-r['voxels'],delta)

    def test_exact_reversible_stage(self):
        folder = ROOT/'work/anatomy-review/lateral-residual80-stage-v1'
        report = json.loads((folder/'repair.json').read_text())
        points, _ = reviewed_points()
        self.assertEqual(points.tolist(), report['points'])
        arrays = []
        for name, key in [('before.bin.gz','beforeSha256'),('labels.bin.gz','afterSha256')]:
            data = (folder/name).read_bytes()
            self.assertEqual(digest(data), report[key])
            arrays.append(np.frombuffer(gzip.decompress(data), np.uint8, offset=10).reshape((394,466,378), order='F'))
        before, after = arrays
        np.testing.assert_array_equal(np.argwhere(before != after), points)
        np.testing.assert_array_equal(replay(before, points), after)
        np.testing.assert_array_equal(replay(after, points, True), before)
        self.assertEqual(np.count_nonzero(after == 24), 63794)
        self.assertEqual(after[248,248,109],24)
        self.assertFalse(report['adopted'])
        broken = before.copy(); broken[tuple(points[0])] = 23
        with self.assertRaises(ValueError):
            replay(broken, points)

    def test_each_axis_rejects_missing_plane_or_duplicate_point(self):
        for axis in 'xyz':
            path = ROOT/f'work/anatomy-review/lateral-residual80-series-{axis}-v1/report.json'
            report = json.loads(path.read_text())
            validate_review(report, axis, expected_sha=SHA, expected_count=80)
            for mode in ('plane','point'):
                changed = copy.deepcopy(report)
                if mode == 'plane':changed['figures'].pop(0)
                else:changed['points'][0] = changed['points'][1]
                with self.subTest(axis=axis,mode=mode), self.assertRaises(ValueError):
                    validate_review(changed, axis, expected_sha=SHA, expected_count=80)


if __name__ == '__main__':unittest.main()
