import copy
import hashlib
import gzip
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from explore_aqueduct_continuity import enclosed_coronal
from stage_aqueduct_core179 import replay, reviewed_entries, digest
import review_lateral_detached547 as renderer


class AqueductTest(unittest.TestCase):
    def test_partial_mesh_reproduces_only_id41_without_legacy_group_changes(self):
        from build_partial_aqueduct_mesh import build,ADOPTION
        from build_section_ventricle_meshes import GROUPS
        source=(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()
        record=(ROOT/ADOPTION).read_bytes();mesh,report=build(source,record)
        self.assertEqual(mesh,(ROOT/'public/atlas/section-current-aqueduct-partial.mesh').read_bytes())
        current_report=json.loads((ROOT/'public/atlas/section-current-aqueduct-partial.json').read_bytes())
        comparable={k:v for k,v in report.items() if k not in ('adoption','adoptionSha256')}
        self.assertEqual({k:current_report[k] for k in comparable},comparable)
        historical=json.loads((ROOT/'tests/fixtures/section-current-aqueduct-partial-pre-upper-fourth-gap.json').read_bytes())
        self.assertEqual(historical['sourceSha256'],'d7fc87b5b18e1221c2979aeab9d6fefeefcfd4d353cfc78cab782930f32f8e29')
        self.assertEqual(historical['sha256'],'22b992bfa93ec644aaf29d7644aebe12b50513b27c877941c70c65e641a4eeef')
        self.assertEqual(report['sha256'],hashlib.sha256(mesh).hexdigest())
        self.assertEqual(report['voxels'],267);self.assertTrue(report['partialExtent']);self.assertFalse(report['expertReviewed'])
        self.assertEqual(len(GROUPS),4)
        for bad_source,bad_record in [(source+b'x',record),(source,record+b'x')]:
            with self.assertRaises(ValueError):build(bad_source,bad_record)

    def test_closed_lumen_does_not_include_open_or_diagonally_open_background(self):
        mask=np.zeros((7,2,7),dtype=bool)
        mask[3,0,3]=True;mask[0,0,:]=True
        mask[0,1,0]=mask[1,1,1]=mask[2,1,2]=True
        expected=np.zeros_like(mask);expected[3,0,3]=True
        self.assertTrue(np.array_equal(enclosed_coronal(mask),expected))
        for bad in [mask.astype(np.uint8),mask[:,0,:]]:
            with self.assertRaises(ValueError):enclosed_coronal(bad)

    def fixture(self):
        points=np.indices((6,6,6)).reshape(3,-1).T[:179]
        entries=[dict(xyz=p.tolist(),before=0 if n<64 else 27,after=41) for n,p in enumerate(points)]
        labels=np.zeros((6,6,6),np.uint8)
        for p in entries:labels[tuple(p['xyz'])]=p['before']
        labels[5,5,5]=30
        return labels,entries

    def test_replay_exact_changes_and_restoration(self):
        before,entries=self.fixture();after=replay(before,entries)
        self.assertEqual(np.count_nonzero(after!=before),179)
        self.assertEqual(after[5,5,5],30)
        self.assertTrue(np.array_equal(replay(after,entries,True),before))
        self.assertEqual(before[0,0,0],0)

    def test_replay_rejects_wrong_values_count_coordinates_and_conflicts(self):
        before,entries=self.fixture()
        mutations=[lambda p:p.pop(),lambda p:p[0].update(before=True),lambda p:p[0].update(before=27),
            lambda p:p[0].update(after=26),lambda p:p[0].update(xyz=p[1]['xyz']),
            lambda p:p[0].update(xyz=[-.5,0,0]),lambda p:p[0].update(xyz=[6,0,0])]
        for mutate in mutations:
            bad=copy.deepcopy(entries);mutate(bad)
            with self.assertRaises(ValueError):replay(before,bad)
        before[0,0,0]=25
        with self.assertRaises(ValueError):replay(before,entries)
        before,entries=self.fixture();after=replay(before,entries);after[0,0,0]=0
        with self.assertRaises(ValueError):replay(after,entries,True)

    def test_renderer_requires_exact_explicit_mixed_labels(self):
        labels=np.zeros((4,4,4),np.uint8);labels[1,1,1]=27
        points=np.array([[1,1,1],[2,2,2]])
        with tempfile.TemporaryDirectory() as directory,patch.object(renderer,'ROOT',Path(directory)),\
                patch.object(renderer,'read_browser_volume',return_value=(None,None,labels)),\
                patch.object(renderer,'load_identity_minc',side_effect=RuntimeError('validated-before-source-load')):
            for values in [[0,0],[27,1],[27],[True,False],[27.,0.]]:
                with self.assertRaises(ValueError):renderer.main(component_count=2,candidate_points=points,label_id=41,candidate_before_labels=values)
            with self.assertRaises(ValueError):renderer.main(component_count=2,candidate_points=points,label_id=41)
            with self.assertRaisesRegex(RuntimeError,'validated-before-source-load'):
                renderer.main(component_count=2,candidate_points=points,label_id=41,candidate_before_labels=[27,0])

    @unittest.skipUnless((ROOT/'work/anatomy-review/aqueduct-core179-stage-v1/repair.json').exists(),'Local original-image evidence not packaged for CI')
    def test_local_review_and_full_volume_replay(self):
        entries,evidence,prior=reviewed_entries()
        self.assertEqual(len(entries),179);self.assertEqual(sum(len(e.get('visuallyInspectedFigures',[])) for e in evidence),37)
        self.assertTrue(prior);self.assertTrue(all(r['overlapCount']==0 for r in prior))
        folder=ROOT/'work/anatomy-review/aqueduct-core179-stage-v1'
        report=json.loads((folder/'repair.json').read_bytes())
        def load(name):
            data=gzip.decompress((folder/name).read_bytes())
            return np.frombuffer(data,np.uint8,offset=10).reshape((394,466,378),order='F')
        before=load('before.bin.gz');after=load('labels.bin.gz')
        self.assertTrue(np.array_equal(replay(before,entries),after))
        self.assertTrue(np.array_equal(replay(after,entries,True),before))
        self.assertEqual(report['afterRawVoxelSha256'],digest(after.tobytes(order='F')))
        self.assertFalse(report['adopted']);self.assertTrue(report['partialExtent'])


if __name__=='__main__':unittest.main()
