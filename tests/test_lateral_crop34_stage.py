import gzip
import json
import sys
import unittest
import tempfile
from unittest.mock import patch
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_lateral_crop34 import replay, reviewed_points, digest
import stage_lateral_crop34 as stage


class StageTest(unittest.TestCase):
    def test_regional_writer_preserves_side_and_rejects_conflicts(self):
        before=np.zeros((3,3,3),dtype=np.uint8)
        before[0,0,0]=18
        raw=b'BBS1'+np.array(before.shape,dtype='<u2').tobytes()+before.tobytes(order='F')
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'work/anatomy-review').mkdir(parents=True)
            source=root/'source.bin.gz';source.write_bytes(gzip.compress(raw,mtime=0))
            with patch.object(stage,'ROOT',root),patch.object(stage,'DEFAULT_LABELS',source),patch.object(stage,'read_browser_volume',return_value=(None,None,before)):
                for ident,side in [(23,'left'),(24,'right')]:
                    stage.save_left_region([[1,1,1]],digest(source.read_bytes()),[],side,'test','test',label_id=ident)
                    folder=root/f'work/anatomy-review/{side}-stage-v1'
                    result=json.loads((folder/'repair.json').read_text())
                    after=np.frombuffer(gzip.decompress((folder/'labels.bin.gz').read_bytes()),dtype=np.uint8,offset=10).reshape(before.shape,order='F')
                    self.assertEqual(result['transition'],f'0->{ident}')
                    self.assertEqual(result[f'{side}LateralAfter'],1)
                    self.assertEqual(after[1,1,1],ident)
                    self.assertEqual(after[0,0,0],18)
                    self.assertEqual(np.count_nonzero(after!=before),1)
                for ident in [True,25,'24']:
                    with self.assertRaisesRegex(ValueError,'Invalid lateral label'):
                        stage.save_left_region([[1,1,1]],'test',[],'bad','test','test',label_id=ident)
                with self.assertRaisesRegex(ValueError,'conflicting labels'):
                    stage.save_left_region([[0,0,0]],'test',[],'conflict','test','test',label_id=24)
            self.assertEqual(gzip.decompress(source.read_bytes()),raw)

    def test_all_block_and_section_mesh_effects(self):
        work=ROOT/'work/anatomy-review'
        folder=work/'lateral-crop34-meshes-v1'
        impact=json.loads((folder/'report.json').read_text())
        parts=impact['blockMaskImpact']
        self.assertEqual(len(parts),55)
        self.assertEqual(len({(r['block'],r['part']) for r in parts}),55)
        expected={('lateral-ventricle','tissue'):394,('lateral-ventricle','ventricular-cavity'):5,
                  ('choroid-plexus','tissue'):281,('choroid-plexus','ventricular-cavity'):5,
                  ('medial-temporal','inferior-horn'):5}
        self.assertEqual({(r['block'],r['part']):r['changedMaskVoxels'] for r in parts if r['changedMaskVoxels']},expected)
        self.assertFalse(impact['installed']);self.assertFalse(impact['installationBlocked'])
        for r in parts:
            if not r['changedMaskVoxels']:continue
            self.assertTrue(r['beforeMatches'])
            for prefix,key in [('', 'afterSha256'),('installed-','beforeSha256'),('reproduced-before-','beforeSha256')]:
                self.assertEqual(digest((folder/(prefix+r['file'])).read_bytes()),r[key])
        folder=work/'lateral-crop34-section-meshes-v1'
        sections=json.loads((folder/'report.json').read_text())
        self.assertTrue(sections['allBeforeAssetsMatch'])
        self.assertFalse(sections['installed'])
        self.assertEqual(sections['beforeSha256'],impact['inputSha256'])
        self.assertEqual(sections['afterSha256'],impact['outputSha256'])
        self.assertEqual(len(sections['after']['meshes']),4)
        for key,after in sections['after']['meshes'].items():
            before=sections['before']['meshes'][key]
            changed=key in ['section-current-lateral-ventricles','section-current-ventricular-system']
            self.assertEqual(after['voxels']-before['voxels'],34 if changed else 0)
            self.assertEqual(digest((folder/(key+'.mesh')).read_bytes()),after['sha256'])
            if not changed:self.assertEqual(before['sha256'],after['sha256'])

    def test_exact_difference_and_reverse(self):
        folder=ROOT/'work/anatomy-review/lateral-crop34-stage-v1'
        report=json.loads((folder/'repair.json').read_text())
        points,evidence=reviewed_points()
        self.assertEqual(len(evidence),5)
        before_bytes=(folder/'before.bin.gz').read_bytes(); after_bytes=(folder/'labels.bin.gz').read_bytes()
        self.assertEqual(digest(before_bytes),report['beforeSha256'])
        self.assertEqual(digest(after_bytes),report['afterSha256'])
        b=gzip.decompress(before_bytes);a=gzip.decompress(after_bytes)
        self.assertEqual(b[:10],a[:10])
        before=np.frombuffer(b[10:],dtype=np.uint8).reshape((394,466,378),order='F')
        after=np.frombuffer(a[10:],dtype=np.uint8).reshape(before.shape,order='F')
        np.testing.assert_array_equal(np.argwhere(before!=after),points)
        self.assertEqual(len(points),34)
        self.assertTrue(np.all(before[tuple(points.T)]==0))
        self.assertTrue(np.all(after[tuple(points.T)]==24))
        np.testing.assert_array_equal(replay(before,points),after)
        np.testing.assert_array_equal(replay(after,points,True),before)
        self.assertEqual(digest(after.tobytes(order='F')),report['afterRawVoxelSha256'])
        self.assertEqual(int((after==24).sum()),63849)
        self.assertFalse(report['adopted']);self.assertFalse(report['expertReviewed']);self.assertFalse(report['publicMutation'])
        with self.assertRaises(ValueError):replay(after,points)
        with self.assertRaises(ValueError):replay(before,points[:-1])


if __name__=='__main__':unittest.main()
