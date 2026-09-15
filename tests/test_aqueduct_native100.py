import copy
import json
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from review_aqueduct_native100 import plane_coordinates,remaining_mask,CANDIDATE,CANDIDATE_SHA,sha


class NativeAqueductTest(unittest.TestCase):
    def test_projection_grid_matches_raw_plane_pixel_order(self):
        low=np.array([8,12,16]);shape=(4,5,6)
        raw=np.arange(np.prod(shape)).reshape(shape)
        for axis in range(3):
            for offset in range(shape[axis]):
                coords,shape2=plane_coordinates(shape,low,axis,int(low[axis]+offset))
                values=raw[tuple((coords-low).T)].reshape(shape2).T[::-1,:]
                self.assertTrue(np.array_equal(values,np.take(raw,offset,axis=axis).T[::-1,:]))
        with self.assertRaises(ValueError):plane_coordinates(shape,low,3,5)
        with self.assertRaises(ValueError):plane_coordinates(shape,low,0,7)

    def test_remaining_mask_separates_adopted_cells_and_rejects_state_changes(self):
        labels=np.zeros((4,80,140),np.uint8)
        remaining=[dict(xyz=[i%4,i//4,115],before=0) for i in range(94)]
        adopted=[dict(xyz=[i%4,i//4,130],before=27) for i in range(179)]
        for p in adopted:labels[tuple(p['xyz'])]=41
        record=dict(points=remaining+adopted)
        mask=remaining_mask(labels,record)
        self.assertEqual(int(mask.sum()),94)
        self.assertEqual(int(mask[:,:,130].sum()),0)
        changed=labels.copy();changed[tuple(remaining[0]['xyz'])]=41
        with self.assertRaises(ValueError):remaining_mask(changed,record)
        for mutate in [lambda p:p.pop(),lambda p:p.__setitem__(0,p[1]),lambda p:p[0].update(xyz=[True,0,115])]:
            bad=copy.deepcopy(record);mutate(bad['points'])
            with self.assertRaises(ValueError):remaining_mask(labels,bad)

    @unittest.skipUnless((ROOT/CANDIDATE).exists(),'Local candidate evidence not packaged for CI')
    def test_current_remaining94_and_rendered_evidence_identity(self):
        import gzip
        from PIL import Image
        candidate=(ROOT/CANDIDATE).read_bytes();self.assertEqual(sha(candidate),CANDIDATE_SHA)
        compressed=(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-posterior-ventricles158.bin.gz').read_bytes()
        labels=np.frombuffer(gzip.decompress(compressed),np.uint8,offset=10).reshape((394,466,378),order='F')
        self.assertEqual(int(remaining_mask(labels,json.loads(candidate)).sum()),94)
        folder=ROOT/'work/anatomy-review/aqueduct-native100-terminals-2026-09-08-v1'
        report=json.loads((folder/'report.json').read_bytes())
        self.assertEqual(report['currentLabelSha256'],sha(compressed))
        self.assertEqual(len(report['figures']),9)
        self.assertEqual(sum(len(f['planes']) for f in report['figures']),27)
        self.assertFalse(report['mutation']);self.assertFalse(report['adopted'])
        for figure in report['figures']:
            path=folder/figure['path'];self.assertEqual(sha(path.read_bytes()),figure['sha256'])
            self.assertEqual(Image.open(path).size,(738,1239))


if __name__=='__main__':unittest.main()
