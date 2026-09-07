"""Independent stage decoding and fixed-evidence guard tests, not anatomy certification."""
import copy
import gzip
import hashlib
import json
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_inferior_partial19_repair import validated_points, XYZ


class Partial19Tests(unittest.TestCase):
    def test_context_changes_explained_independently(self):
        path = ROOT/'work/anatomy-review/inferior-horn-partial19-context-v1.json'
        report = json.loads(path.read_text(encoding='utf-8'))
        self.assertTrue(report['unionReplayExact']); self.assertTrue(report['reverseExact'])
        self.assertEqual(len(report['changes']),13)
        reasons = {}
        for c in report['changes']:
            reasons[c['reason']] = reasons.get(c['reason'],0) + 1
            if c['reason'] == 'new-ventricular-label-excluded-from-context':
                self.assertTrue(c['before']); self.assertFalse(c['after'])
                self.assertEqual((c['labelBefore'],c['labelAfter']),(0,24))
                self.assertIn(tuple(c['appXYZ']),XYZ)
            else:
                self.assertEqual(c['reason'],'unchanged-tissue-enters-distance-cutoff')
                self.assertFalse(c['before']); self.assertTrue(c['after'])
                self.assertEqual(c['labelBefore'],c['labelAfter'])
                self.assertGreater(c['distanceBeforeMm'],c['cutoffMm'])
                self.assertLessEqual(c['distanceAfterMm'],c['cutoffMm'])
        self.assertEqual(reasons,{'new-ventricular-label-excluded-from-context':3,
                                 'unchanged-tissue-enters-distance-cutoff':10})

    def test_all_mesh_masks_and_reproduced_baselines(self):
        folder = ROOT/'work/anatomy-review/inferior-horn-partial19-meshes-v1'
        report = json.loads((folder/'report.json').read_text(encoding='utf-8'))
        self.assertEqual(len(report['blockMaskImpact']),55)
        changed = [p for p in report['blockMaskImpact'] if p['changedMaskVoxels']]
        self.assertEqual([(p['block'],p['part'],p['changedMaskVoxels']) for p in changed],[
            ('lateral-ventricle','tissue',7),('lateral-ventricle','ventricular-cavity',1),
            ('choroid-plexus','tissue',5),('choroid-plexus','ventricular-cavity',1),
            ('medial-temporal','tissue',1),('medial-temporal','inferior-horn',1)])
        self.assertFalse(report['installationBlocked'])
        for p in changed:
            old = (folder/('installed-'+p['file'])).read_bytes()
            self.assertEqual(old,(folder/('reproduced-before-'+p['file'])).read_bytes())
            self.assertEqual(hashlib.sha256(old).hexdigest(),p['beforeSha256'])
            self.assertEqual(hashlib.sha256((folder/p['file']).read_bytes()).hexdigest(),p['afterSha256'])

    def test_exact_full_volume_difference_and_reverse(self):
        folder = ROOT/'work/anatomy-review/inferior-horn-partial19-stage-v1'
        r = json.loads((folder/'repair.json').read_text(encoding='utf-8'))
        volumes = []
        for file, prefix in [('base.bin.gz','input'),('labels.bin.gz','output')]:
            blob = (folder/file).read_bytes(); raw = gzip.decompress(blob)
            self.assertEqual(hashlib.sha256(blob).hexdigest(),r[prefix+'CompressedSha256'])
            self.assertEqual(raw[:4],b'BBS1')
            self.assertEqual(tuple(np.frombuffer(raw[4:10],dtype='<u2')),(394,466,378))
            self.assertEqual(hashlib.sha256(raw[10:]).hexdigest(),r[prefix+'RawSha256'])
            volumes.append(np.frombuffer(raw[10:],dtype=np.uint8).reshape((394,466,378),order='F'))
        before, after = volumes
        changed = np.argwhere(before != after)
        self.assertEqual(set(map(tuple,changed)),set(XYZ))
        self.assertEqual({tuple(p['xyz']) for p in r['points']},set(XYZ))
        self.assertTrue((before[tuple(changed.T)] == 0).all())
        self.assertTrue((after[tuple(changed.T)] == 24).all())
        reverse = after.copy(); reverse[tuple(changed.T)] = 0
        self.assertTrue(np.array_equal(reverse,before))
        self.assertEqual(int((before == 24).sum()),64362)
        self.assertEqual(int((after == 24).sum()),64381)
        self.assertFalse(r['installed']); self.assertFalse(r['expertReviewed'])
        self.assertFalse(r['published'])

    def test_reject_unreviewed_or_contradictory_sets(self):
        work = ROOT/'work/anatomy-review'
        report = json.loads((work/'inferior-horn-residual-107-grid-precision-v1.json').read_text(encoding='utf-8'))
        cells = json.loads((work/'inferior-horn-residual-107-partial-cells-v1/report.json').read_text(encoding='utf-8'))
        self.assertEqual(len(validated_points(report,cells)),19)
        for kind in ['duplicate','label','nominal','baseline']:
            bad = copy.deepcopy(report)
            selected = [r for r in bad['records'] if r['selectedForPriorVisualReview']]
            if kind == 'duplicate': selected[0]['xyz'] = selected[1]['xyz']
            if kind == 'label': selected[0]['currentLabel'] = 18
            if kind == 'nominal': selected[0]['nominalFullySupported'] = False
            if kind == 'baseline': bad['labelSha256'] = '0'*64
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                validated_points(bad,cells)
        bad = copy.deepcopy(cells); bad['figures'][0]['views'].pop()
        with self.assertRaises(ValueError): validated_points(report,bad)


if __name__ == '__main__':
    unittest.main()
