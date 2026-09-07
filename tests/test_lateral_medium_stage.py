"""Replay contract and independently decoded work-stage checks."""
import gzip
import json
import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from stage_lateral_fringe_repair import replay, digest
from build_orthogonal_review_bundle import ROOT


class LateralStageTest(unittest.TestCase):
    def test_saved_mesh_and_context_evidence(self):
        work=ROOT/'work/anatomy-review'; folder=work/'lateral-fringe-medium-meshes-v1'
        if not folder.exists(): self.skipTest('Local mesh evidence not present')
        r=json.loads((folder/'report.json').read_text(encoding='utf-8'))
        self.assertEqual(len(r['blockMaskImpact']),55)
        changed=[p for p in r['blockMaskImpact'] if p['changedMaskVoxels']]
        self.assertEqual([(p['block'],p['part'],p['changedMaskVoxels']) for p in changed], [
            ('lateral-ventricle','tissue',147),('lateral-ventricle','ventricular-cavity',27),
            ('commissural-system','tissue',8),('commissural-system','lateral-ventricles',46),
            ('choroid-plexus','tissue',114),('choroid-plexus','ventricular-cavity',27),
            ('medial-temporal','inferior-horn',7)])
        for p in changed:
            self.assertTrue(p['beforeMatches'])
            self.assertEqual((folder/('installed-'+p['file'])).read_bytes(),(folder/('reproduced-before-'+p['file'])).read_bytes())
            self.assertEqual(digest((folder/p['file']).read_bytes()),p['afterSha256'])
        self.assertFalse(r['installationBlocked'])
        c=json.loads((work/'lateral-fringe-medium-context-v1.json').read_text(encoding='utf-8'))
        self.assertEqual(len(c['changes']),269)
        self.assertEqual(len({(p['block'],tuple(p['appXYZ'])) for p in c['changes']}),269)
        for p in c['changes']:
            self.assertEqual(p['reason'],'unchanged-tissue-enters-distance-cutoff')
            self.assertEqual(p['labelBefore'],p['labelAfter'])
            self.assertFalse(p['before']); self.assertTrue(p['after'])
            self.assertGreater(p['distanceBeforeMm'],p['cutoffMm'])
            self.assertLessEqual(p['distanceAfterMm'],p['cutoffMm'])

    def test_roundtrip_and_rejections(self):
        old = np.zeros((3,3,3), dtype=np.uint8)
        points = [dict(xyz=[1,1,1], before=0, after=23)]
        new = replay(old, points)
        self.assertTrue(np.array_equal(replay(new, points, True), old))
        for bad in [points*2, [dict(xyz=[3,1,1],before=0,after=23)],
                    [dict(xyz=[1,1,1],before=0,after=25)]]:
            with self.assertRaises(ValueError): replay(old, bad)
        with self.assertRaises(ValueError): replay(new, points)

    def test_saved_stage_exact_diff(self):
        folder = ROOT/'work/anatomy-review/lateral-fringe-medium-stage-v1'
        if not folder.exists(): self.skipTest('Local evidence artifact not present')
        r = json.loads((folder/'repair.json').read_text(encoding='utf-8'))
        arrays = []
        for filename, prefix in [('base.bin.gz','input'), ('labels.bin.gz','output')]:
            data = (folder/filename).read_bytes()
            self.assertEqual(digest(data), r[prefix+'CompressedSha256'])
            raw = gzip.decompress(data)
            self.assertEqual(raw[:4], b'BBS1')
            shape = tuple(np.frombuffer(raw[4:10], dtype='<u2'))
            self.assertEqual(shape, (394,466,378))
            self.assertEqual(digest(raw[10:]), r[prefix+'RawSha256'])
            arrays.append(np.frombuffer(raw[10:], dtype=np.uint8).reshape(shape, order='F'))
        a,b = arrays
        coords = np.argwhere(a != b)
        actual = {(tuple(p), int(a[tuple(p)]), int(b[tuple(p)])) for p in coords}
        planned = {(tuple(p['xyz']),p['before'],p['after']) for p in r['points']}
        self.assertEqual(actual, planned)
        self.assertEqual(len(actual), 867)
        self.assertEqual(r['transitions'], {'0->23':555,'0->24':312})
        self.assertEqual(sum(p[2] == 23 for p in actual), 555)
        self.assertTrue(all(p[1] == 0 for p in actual))
        self.assertTrue(np.array_equal(replay(b, r['points'], True), a))
        self.assertFalse(r['installed'])
        self.assertFalse(r['expertReviewed'])


if __name__ == '__main__': unittest.main()
