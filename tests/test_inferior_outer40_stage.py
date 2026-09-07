"""Fixed-set guards and independent staged-volume decoding; not anatomy certification."""
import copy
import gzip
import hashlib
import json
import sys
import unittest
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_inferior_outer40_repair import validated_points, XYZ, WORK


class Outer40Tests(unittest.TestCase):
    def test_all_specimen_masks_remain_unchanged(self):
        report=json.loads((WORK/'inferior-horn-outer40-meshes-v1/report.json').read_text(encoding='utf-8'))
        self.assertEqual(report['inputSha256'],'58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7')
        self.assertEqual(report['outputSha256'],'e98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3')
        rows=report['blockMaskImpact']
        self.assertEqual(len(rows),55)
        self.assertEqual(len({(r['block'],r['part']) for r in rows}),55)
        self.assertTrue(all(r['changedMaskVoxels']==0 for r in rows))
        self.assertFalse(report['installed'])
        self.assertFalse(report['installationBlocked'])
        self.assertFalse(report['anatomyValidatedByMaskComparison'])

    def test_evidence_guards(self):
        grid=json.loads((WORK/'inferior-horn-outer-after19-grid-v1.json').read_text(encoding='utf-8'))
        finite=json.loads((WORK/'inferior-horn-outer-after19-finite-v1/report.json').read_text(encoding='utf-8'))
        self.assertEqual(len(validated_points(grid,finite)),40)
        for kind in ['baseline','source','set','duplicate','support','label','crop','outside','coverage']:
            bad=copy.deepcopy(grid); view=copy.deepcopy(finite)
            selected=next(r for r in bad['records'] if tuple(r['xyz']) == XYZ[0])
            if kind == 'baseline': bad['labelSha256']='0'*64
            if kind == 'source': view['sourceSha256']='0'*64
            if kind == 'set': bad['candidateAppXYZ'][0]=[0,0,0]
            if kind == 'duplicate': bad['candidateAppXYZ'][0]=bad['candidateAppXYZ'][1]
            if kind == 'support': selected['fullySupported']=False
            if kind == 'label': selected['currentLabel']=18
            if kind == 'crop': selected['touchesCropFace']=True
            if kind == 'outside': selected['outsideExplorationCells']=1
            if kind == 'coverage': view['figures'].pop()
            with self.subTest(kind=kind),self.assertRaises(ValueError):
                validated_points(bad,view)

    def test_independent_full_volume_diff_and_reverse(self):
        folder=WORK/'inferior-horn-outer40-stage-v1'
        report=json.loads((folder/'repair.json').read_text(encoding='utf-8'))
        volumes=[]
        for filename,prefix in [('base.bin.gz','input'),('labels.bin.gz','output')]:
            blob=(folder/filename).read_bytes(); raw=gzip.decompress(blob)
            self.assertEqual(hashlib.sha256(blob).hexdigest(),report[prefix+'CompressedSha256'])
            self.assertEqual(raw[:4],b'BBS1')
            self.assertEqual(tuple(np.frombuffer(raw[4:10],dtype='<u2')),(394,466,378))
            self.assertEqual(hashlib.sha256(raw[10:]).hexdigest(),report[prefix+'RawSha256'])
            volumes.append(np.frombuffer(raw[10:],dtype=np.uint8).reshape((394,466,378),order='F'))
        before,after=volumes
        changed=np.argwhere(before != after)
        self.assertEqual(len(changed),40)
        self.assertEqual(set(map(tuple,changed)),set(XYZ))
        self.assertEqual({tuple(p['xyz']) for p in report['points']},set(XYZ))
        self.assertTrue((before[tuple(changed.T)] == 0).all())
        self.assertTrue((after[tuple(changed.T)] == 24).all())
        reverse=after.copy(); reverse[tuple(changed.T)]=0
        self.assertTrue(np.array_equal(reverse,before))
        self.assertEqual(int((before == 24).sum()),64381)
        self.assertEqual(int((after == 24).sum()),64421)
        for field in ['installed','adopted','published','expertReviewed']:
            self.assertFalse(report[field])


if __name__ == '__main__':
    unittest.main()
