import gzip
import json
import sys
import unittest
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_lateral_cavity21 import replay, reviewed_points, digest, SHA


class StageTest(unittest.TestCase):
    def test_all_block_parts_and_reproduced_baselines(self):
        folder=ROOT/'work/anatomy-review/lateral-cavity21-meshes-v1'
        report=json.loads((folder/'report.json').read_text())
        manifest=json.loads((ROOT/'public/atlas/specimen-blocks.json').read_text(encoding='utf-8'))
        rows=report['blockMaskImpact']
        self.assertEqual(len(rows),55)
        self.assertEqual({(r['block'],r['part']) for r in rows},{(key,p['part']) for key,parts in manifest['specimens'].items() for p in parts})
        changed=[r for r in rows if r['changedMaskVoxels']]
        self.assertEqual({(r['block'],r['part']):r['changedMaskVoxels'] for r in changed},
                         {('lateral-ventricle','tissue'):39,('lateral-ventricle','ventricular-cavity'):3,
                          ('choroid-plexus','tissue'):37,('choroid-plexus','ventricular-cavity'):3,
                          ('medial-temporal','tissue'):1,('medial-temporal','inferior-horn'):3})
        self.assertFalse(report['installationBlocked']);self.assertFalse(report['installed'])
        for r in changed:
            self.assertTrue(r['beforeMatches'])
            for prefix,key in [('', 'afterSha256'),('installed-','beforeSha256'),('reproduced-before-','beforeSha256')]:
                self.assertEqual(digest((folder/(prefix+r['file'])).read_bytes()),r[key])

    def test_exact_forward_reverse_and_conflict(self):
        folder=ROOT/'work/anatomy-review/lateral-cavity21-stage-v1'
        before_bytes=(folder/'before.bin.gz').read_bytes()
        after_bytes=(folder/'labels.bin.gz').read_bytes()
        report=json.loads((folder/'repair.json').read_text())
        self.assertEqual(digest(before_bytes),SHA)
        self.assertEqual(digest(after_bytes),report['afterSha256'])
        before_raw=gzip.decompress(before_bytes);after_raw=gzip.decompress(after_bytes)
        self.assertEqual(before_raw[:10],after_raw[:10])
        before=np.frombuffer(before_raw,np.uint8,offset=10).reshape((394,466,378),order='F')
        after=np.frombuffer(after_raw,np.uint8,offset=10).reshape(before.shape,order='F')
        points,evidence=reviewed_points()
        self.assertEqual(report['evidence'],evidence)
        np.testing.assert_array_equal(points,np.array(report['points']))
        np.testing.assert_array_equal(replay(before,points),after)
        np.testing.assert_array_equal(replay(after,points,True),before)
        self.assertEqual(np.count_nonzero(before!=after),21)
        self.assertEqual(np.count_nonzero(after==24),63815)
        self.assertEqual(digest(after_raw[10:]),report['afterRawVoxelSha256'])
        wrong=before.copy();wrong[tuple(points[0])]=25
        with self.assertRaises(ValueError):replay(wrong,points)

    def test_full_section_mesh_identity_and_counts(self):
        folder=ROOT/'work/anatomy-review/lateral-cavity21-section-meshes-v1'
        report=json.loads((folder/'report.json').read_text())
        self.assertTrue(report['allBeforeAssetsMatch']);self.assertFalse(report['installed'])
        self.assertEqual(set(report['changedMeshes']),{'section-current-lateral-ventricles.mesh','section-current-ventricular-system.mesh'})
        for name,meta in report['after']['meshes'].items():
            self.assertEqual(digest((folder/(name+'.mesh')).read_bytes()),meta['sha256'])
            expected=21 if name+'.mesh' in report['changedMeshes'] else 0
            self.assertEqual(meta['voxels']-report['before']['meshes'][name]['voxels'],expected)


if __name__=='__main__':unittest.main()
