import sys
import unittest
import json
import hashlib
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_fourth_ventricle_anterior_repair import replay, reviewed_points, BASE_SHA, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume


class FourthAnteriorRepairTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        _,_,cls.before = read_browser_volume(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-fourth-anterior105-e98c.bin.gz',MAGIC_LABELS,BASE_SHA)
        cls.points = reviewed_points()

    def test_exact_reversible_repair(self):
        after = replay(self.before,self.points)
        self.assertEqual(np.count_nonzero(after != self.before),105)
        self.assertEqual(np.count_nonzero(after == 26),8641)
        self.assertTrue(np.array_equal(replay(after,self.points,True),self.before))
        self.assertEqual(np.count_nonzero(self.before == 26),8536)

    def test_wrong_points_types_and_grid_rejected(self):
        for points in [self.points[:-1], [self.points[0]]+self.points[:-1],
                       [[float(v) for v in p] for p in self.points],
                       [(0,0,0)]+self.points[1:]]:
            with self.assertRaises(ValueError): replay(self.before,points)
        with self.assertRaises(ValueError): replay(self.before[:20],self.points)

    def test_existing_label_protected(self):
        volume = self.before.copy()
        volume[self.points[0]] = 27
        with self.assertRaises(ValueError): replay(volume,self.points)
        self.assertEqual(volume[self.points[0]],27)

    def test_registered_source_support_and_complete_raw_plane_evidence(self):
        from audit_manual_label_space import SOURCE, load_identity_minc
        from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
        raw,start,step,_ = load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
        geometry=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
        affine=np.asarray(geometry['affine']);origin=affine[:3,3];spacing=np.diag(affine)[:3]
        points=np.asarray(self.points)
        lower=((points-.5)*spacing+origin-start)/step
        upper=((points+.5)*spacing+origin-start)/step
        for lo,hi in zip(np.floor(lower).astype(int),np.ceil(upper).astype(int)):
            # Independent direct lattice enumeration of every support corner.
            self.assertGreaterEqual(float(raw[tuple(slice(int(a),int(b)+1) for a,b in zip(lo,hi))].min()),65000)
        folder=ROOT/'work/anatomy-review/fourth-ventricle-anterior-next-native-v1'
        report=json.loads((folder/'report.json').read_text())
        self.assertEqual(report['source300Sha256'],IMAGE_SHA)
        self.assertEqual(report['inputSha256'],BASE_SHA)
        low=np.asarray(report['cropExclusive']['low']);high=np.asarray(report['cropExclusive']['high'])
        gray=encode_image(raw[tuple(slice(a,b) for a,b in zip(low,high))],geometry['intensityWindow'])
        observed={axis:[] for axis in 'xyz'}
        for figure in report['figures']:
            path=folder/figure['path']
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),figure['sha256'])
            actual=np.asarray(Image.open(path).convert('RGB'))
            dim='xyz'.index(figure['axis']);offset=0
            for index in figure['nativeIndices']:
                plane=np.take(gray,index-low[dim],axis=dim).T[::-1]
                expected=np.repeat(np.repeat(np.repeat(plane[:,:,None],3,axis=2),3,axis=0),3,axis=1)
                np.testing.assert_array_equal(actual[offset+42:offset+42+expected.shape[0],:expected.shape[1]],expected)
                offset+=expected.shape[0]+42
                observed[figure['axis']].append(index)
        self.assertEqual(observed,{ 'x':list(range(308,347)), 'y':list(range(303,315)), 'z':list(range(115,137)) })
        self.assertEqual(sum(map(len,observed.values())),73)


if __name__ == '__main__': unittest.main()
