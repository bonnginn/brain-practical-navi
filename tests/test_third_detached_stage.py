import gzip
import hashlib
import json
import sys
import unittest
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_third_detached8 import POINTS, replay


class StageTests(unittest.TestCase):
    def test_mesh_impact_complete(self):
        work = ROOT/'work/anatomy-review'
        impact = json.loads((work/'third-detached8-meshes-v1/report.json').read_text())
        manifest = json.loads((ROOT/'public/atlas/specimen-blocks.json').read_text(encoding='utf-8'))
        expected = {(block,p['part']) for block,parts in manifest['specimens'].items() for p in parts}
        rows = impact['blockMaskImpact']
        self.assertEqual(len(rows),55)
        self.assertEqual({(r['block'],r['part']) for r in rows},expected)
        self.assertTrue(all(r['changedMaskVoxels']==0 for r in rows))
        self.assertFalse(impact['installationBlocked'])
        folder = work/'third-detached8-section-meshes-v1'
        section = json.loads((folder/'report.json').read_text())
        self.assertTrue(section['allBeforeAssetsMatch'])
        self.assertEqual(set(section['changedMeshes']), {'section-current-third-ventricle.mesh','section-current-ventricular-system.mesh'})
        for name, meta in section['after']['meshes'].items():
            self.assertEqual(hashlib.sha256((folder/(name+'.mesh')).read_bytes()).hexdigest(),meta['sha256'])
        self.assertEqual(section['after']['meshes']['section-current-third-ventricle']['voxels'],12015)

    def test_exact_diff_and_reverse(self):
        folder = ROOT/'work/anatomy-review/third-detached8-stage-v1'
        report = json.loads((folder/'repair.json').read_text())
        arrays = []
        for name, key in [('before.bin.gz','beforeSha256'),('labels.bin.gz','afterSha256')]:
            data = (folder/name).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), report[key])
            arrays.append(np.frombuffer(gzip.decompress(data),np.uint8,offset=10).reshape((394,466,378),order='F'))
        before, after = arrays
        self.assertEqual(np.argwhere(before != after).tolist(), [list(p) for p in POINTS])
        self.assertTrue(np.all(before[tuple(np.array(POINTS).T)] == 0))
        self.assertTrue(np.all(after[tuple(np.array(POINTS).T)] == 25))
        np.testing.assert_array_equal(replay(after,True), before)
        np.testing.assert_array_equal(replay(before), after)
        self.assertFalse(report['adopted'])

    def test_conflict_refused(self):
        labels = np.zeros((394,466,378),np.uint8)
        labels[POINTS[-1]]=31
        with self.assertRaises(ValueError):replay(labels)
        self.assertEqual(np.count_nonzero(labels),1)
        with self.assertRaises(ValueError):replay(np.zeros((3,4,5),np.uint8))


if __name__ == '__main__':unittest.main()
