"""Independently decode the local staged volume; does not certify anatomy."""
import gzip
import hashlib
import json
import unittest
from pathlib import Path
import numpy as np


class StageTests(unittest.TestCase):
    def test_residual_53_mesh_and_context_evidence(self):
        work=Path(__file__).resolve().parents[1]/'work/anatomy-review'
        folder=work/'inferior-horn-residual-27-meshes-v1'
        context_path=work/'inferior-horn-residual-27-context-v1.json'
        if not folder.exists() or not context_path.exists():self.skipTest('Local 53-cell mesh/context evidence not present')
        r=json.loads((folder/'report.json').read_text(encoding='utf-8'))
        self.assertEqual(len(r['blockMaskImpact']),55)
        changed=[p for p in r['blockMaskImpact'] if p['changedMaskVoxels']]
        self.assertEqual([(p['block'],p['part'],p['changedMaskVoxels']) for p in changed],[
            ('lateral-ventricle','tissue',997),('lateral-ventricle','ventricular-cavity',8),
            ('choroid-plexus','tissue',523),('choroid-plexus','ventricular-cavity',8),
            ('medial-temporal','inferior-horn',8)])
        self.assertFalse(r['installationBlocked'])
        for p in changed:
            old=(folder/('installed-'+p['file'])).read_bytes()
            self.assertEqual(old,(folder/('reproduced-before-'+p['file'])).read_bytes())
            self.assertEqual(hashlib.sha256(old).hexdigest(),p['beforeSha256'])
            self.assertEqual(hashlib.sha256((folder/p['file']).read_bytes()).hexdigest(),p['afterSha256'])
        context=json.loads(context_path.read_text(encoding='utf-8'))
        self.assertTrue(context['unionReplayExact']);self.assertTrue(context['reverseExact'])
        changes=context['changes'];self.assertEqual(len(changes),1520)
        self.assertEqual(len({(c['block'],tuple(c['appXYZ'])) for c in changes}),1520)
        for c in changes:
            if c['reason']=='new-ventricular-label-excluded-from-context':
                self.assertTrue(c['before']);self.assertFalse(c['after'])
                self.assertEqual((c['labelBefore'],c['labelAfter']),(0,24))
            else:
                self.assertEqual(c['reason'],'unchanged-tissue-enters-distance-cutoff')
                self.assertFalse(c['before']);self.assertTrue(c['after'])
                self.assertEqual(c['labelBefore'],c['labelAfter'])
                self.assertGreater(c['distanceBeforeMm'],c['cutoffMm'])
                self.assertLessEqual(c['distanceAfterMm'],c['cutoffMm'])

    def test_residual_53_exact_reversible_difference(self):
        folder=Path(__file__).resolve().parents[1]/'work/anatomy-review/inferior-horn-residual-27-stage-v1'
        if not folder.exists():self.skipTest('Local 53-cell stage not present')
        r=json.loads((folder/'repair.json').read_text(encoding='utf-8'))
        arrays=[]
        for name,prefix in [('base.bin.gz','input'),('labels.bin.gz','output')]:
            blob=(folder/name).read_bytes();raw=gzip.decompress(blob)
            self.assertEqual(hashlib.sha256(blob).hexdigest(),r[prefix+'CompressedSha256'])
            self.assertEqual(raw[:4],b'BBS1')
            self.assertEqual(tuple(np.frombuffer(raw[4:10],dtype='<u2')),(394,466,378))
            self.assertEqual(hashlib.sha256(raw[10:]).hexdigest(),r[prefix+'RawSha256'])
            arrays.append(np.frombuffer(raw[10:],dtype=np.uint8).reshape((394,466,378),order='F'))
        before,after=arrays;points=np.argwhere(before!=after)
        self.assertEqual(len(points),53);self.assertEqual(len(r['points']),53)
        self.assertEqual(set(map(tuple,points)),{tuple(p['xyz']) for p in r['points']})
        self.assertTrue((before[tuple(points.T)]==0).all())
        self.assertTrue((after[tuple(points.T)]==24).all())
        restored=after.copy();restored[tuple(points.T)]=0
        self.assertTrue(np.array_equal(restored,before))
        self.assertEqual(r['inputCompressedSha256'],'681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88')
        self.assertFalse(r['installed']);self.assertFalse(r['expertReviewed'])

    def test_residual_meshes_reproduce_installed_baseline(self):
        work=Path(__file__).resolve().parents[1]/'work/anatomy-review'
        folder=work/'inferior-horn-residual-51-meshes-v1'
        if not folder.exists():self.skipTest('Local residual mesh evidence not present')
        r=json.loads((folder/'report.json').read_text(encoding='utf-8'))
        self.assertEqual(len(r['blockMaskImpact']),55)
        changed=[p for p in r['blockMaskImpact'] if p['changedMaskVoxels']]
        self.assertEqual([(p['block'],p['part'],p['changedMaskVoxels']) for p in changed],[
            ('lateral-ventricle','tissue',129),('lateral-ventricle','ventricular-cavity',6),
            ('choroid-plexus','tissue',125),('choroid-plexus','ventricular-cavity',6),
            ('medial-temporal','tissue',5),('medial-temporal','inferior-horn',6)])
        self.assertFalse(r['installationBlocked'])
        for p in changed:
            old=(folder/('installed-'+p['file'])).read_bytes()
            self.assertEqual(old,(folder/('reproduced-before-'+p['file'])).read_bytes())
            self.assertEqual(hashlib.sha256(old).hexdigest(),p['beforeSha256'])
            self.assertEqual(hashlib.sha256((folder/p['file']).read_bytes()).hexdigest(),p['afterSha256'])

    def test_residual_57_exact_reversible_difference(self):
        folder=Path(__file__).resolve().parents[1]/'work/anatomy-review/inferior-horn-residual-51-stage-v1'
        if not folder.exists():self.skipTest('Local residual stage not present')
        r=json.loads((folder/'repair.json').read_text(encoding='utf-8'))
        arrays=[]
        for name,prefix in [('base.bin.gz','input'),('labels.bin.gz','output')]:
            blob=(folder/name).read_bytes();data=gzip.decompress(blob)
            self.assertEqual(hashlib.sha256(blob).hexdigest(),r[prefix+'CompressedSha256'])
            self.assertEqual(data[:4],b'BBS1')
            self.assertEqual(tuple(np.frombuffer(data[4:10],dtype='<u2')),(394,466,378))
            self.assertEqual(hashlib.sha256(data[10:]).hexdigest(),r[prefix+'RawSha256'])
            arrays.append(np.frombuffer(data[10:],dtype=np.uint8).reshape((394,466,378),order='F'))
        before,after=arrays;points=np.argwhere(before!=after)
        self.assertEqual(len(points),57)
        self.assertEqual(len(r['points']),57)
        self.assertEqual(set(map(tuple,points)),{tuple(p['xyz']) for p in r['points']})
        self.assertTrue((before[tuple(points.T)]==0).all())
        self.assertTrue((after[tuple(points.T)]==24).all())
        restored=after.copy();restored[tuple(points.T)]=0
        self.assertTrue(np.array_equal(restored,before))
        self.assertFalse(r['installed']);self.assertFalse(r['expertReviewed'])

    def test_residual_context_changes_are_fully_explained(self):
        path=Path(__file__).resolve().parents[1]/'work/anatomy-review/inferior-horn-residual-51-context-v1.json'
        if not path.exists():self.skipTest('Local residual context evidence not present')
        r=json.loads(path.read_text(encoding='utf-8'));changes=r['changes']
        self.assertEqual(len(changes),259)
        self.assertEqual(len({(c['block'],tuple(c['appXYZ'])) for c in changes}),259)
        self.assertTrue(r['unionReplayExact']);self.assertTrue(r['reverseExact'])
        removals=0
        for c in changes:
            if c['reason']=='new-ventricular-label-excluded-from-context':
                self.assertTrue(c['before']);self.assertFalse(c['after'])
                self.assertEqual((c['labelBefore'],c['labelAfter']),(0,24));removals+=1
            else:
                self.assertEqual(c['reason'],'unchanged-tissue-enters-distance-cutoff')
                self.assertFalse(c['before']);self.assertTrue(c['after'])
                self.assertEqual(c['labelBefore'],c['labelAfter'])
                self.assertGreater(c['distanceBeforeMm'],c['cutoffMm'])
                self.assertLessEqual(c['distanceAfterMm'],c['cutoffMm'])
        self.assertEqual(removals,15)

    def test_mesh_reproduction_and_context_explanation(self):
        root=Path(__file__).resolve().parents[1];work=root/'work/anatomy-review'
        folder=work/'inferior-horn-cavity-meshes-v1'
        context_path=work/'inferior-horn-cavity-context-v1.json'
        if not folder.exists() or not context_path.exists():self.skipTest('Local mesh/context evidence not present')
        r=json.loads((folder/'report.json').read_text(encoding='utf-8'))
        self.assertEqual(len(r['blockMaskImpact']),55)
        changed=[p for p in r['blockMaskImpact'] if p['changedMaskVoxels']]
        self.assertEqual([(p['block'],p['part'],p['changedMaskVoxels']) for p in changed],[
            ('lateral-ventricle','tissue',55),('lateral-ventricle','ventricular-cavity',31),
            ('radiations','tissue',5),('choroid-plexus','tissue',1),
            ('choroid-plexus','ventricular-cavity',28),('medial-temporal','tissue',3),
            ('medial-temporal','inferior-horn',27)])
        self.assertFalse(r['installationBlocked'])
        for p in changed:
            old=(folder/('installed-'+p['file'])).read_bytes()
            self.assertEqual(old,(folder/('reproduced-before-'+p['file'])).read_bytes())
            self.assertEqual(hashlib.sha256(old).hexdigest(),p['beforeSha256'])
            self.assertEqual(hashlib.sha256((folder/p['file']).read_bytes()).hexdigest(),p['afterSha256'])
        context=json.loads(context_path.read_text(encoding='utf-8'))
        self.assertEqual(len(context['changes']),64)
        self.assertEqual(len({(c['block'],tuple(c['appXYZ'])) for c in context['changes']}),64)
        for c in context['changes']:
            if c['reason']=='new-ventricular-label-excluded-from-context':
                self.assertTrue(c['before']);self.assertFalse(c['after'])
                self.assertEqual((c['labelBefore'],c['labelAfter']),(0,24))
            else:
                self.assertEqual(c['reason'],'unchanged-tissue-enters-distance-cutoff')
                self.assertFalse(c['before']);self.assertTrue(c['after'])
                self.assertEqual(c['labelBefore'],c['labelAfter'])
                self.assertGreater(c['distanceBeforeMm'],c['cutoffMm'])
                self.assertLessEqual(c['distanceAfterMm'],c['cutoffMm'])

    def test_exact_patch_and_reverse(self):
        root=Path(__file__).resolve().parents[1]
        folder=root/'work/anatomy-review/inferior-horn-cavity-stage-v1'
        if not folder.exists():self.skipTest('Local stage not present')
        r=json.loads((folder/'repair.json').read_text(encoding='utf-8'));arrays=[]
        for name,prefix in [('base.bin.gz','input'),('labels.bin.gz','output')]:
            blob=(folder/name).read_bytes()
            self.assertEqual(hashlib.sha256(blob).hexdigest(),r[prefix+'CompressedSha256'])
            data=gzip.decompress(blob);self.assertEqual(data[:4],b'BBS1')
            shape=tuple(np.frombuffer(data[4:10],dtype='<u2'));self.assertEqual(shape,(394,466,378))
            self.assertEqual(hashlib.sha256(data[10:]).hexdigest(),r[prefix+'RawSha256'])
            arrays.append(np.frombuffer(data[10:],dtype=np.uint8).reshape(shape,order='F'))
        before,after=arrays;points=np.argwhere(before!=after)
        self.assertEqual(len(points),304)
        self.assertEqual(set(map(tuple,points)),{tuple(p['xyz']) for p in r['points']})
        self.assertTrue((before[tuple(points.T)]==0).all())
        self.assertTrue((after[tuple(points.T)]==24).all())
        restored=after.copy();restored[tuple(points.T)]=0
        self.assertTrue(np.array_equal(restored,before))
        self.assertFalse(r['installed']);self.assertFalse(r['expertReviewed'])


if __name__=='__main__':unittest.main()
