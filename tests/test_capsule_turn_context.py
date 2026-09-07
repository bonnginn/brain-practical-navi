"""Local scientific evidence checks; not proof of anatomical correctness."""
import hashlib
import json
import sys
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from render_capsule_turn_context import SOURCE, IMAGE_NAME, IMAGE_SHA, load_identity_minc, encode_image
from render_capsule_turn_context import oriented_plane, DEFAULT_LABELS, MAGIC_LABELS, LABEL_SHA, read_browser_volume


class CapsuleTurnContextTests(unittest.TestCase):
    def test_orthogonal_raw_and_projected_label_planes(self):
        folder = ROOT / 'work/anatomy-review/capsule-turn-orthogonal300-v1'
        report = json.loads((folder / 'report.json').read_text(encoding='utf-8'))
        self.assertEqual([(f['axis'],f['index']) for f in report['figures']],
                         [('x',i) for i in [291,292,293,364,365,366]] + [('y',i) for i in [449,450,451]])
        raw,start,step,_ = load_identity_minc(SOURCE / IMAGE_NAME, IMAGE_SHA)
        _,_,labels = read_browser_volume(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-fourth-anterior105-e98c.bin.gz',MAGIC_LABELS,LABEL_SHA)
        affine = np.array(report['scientificAffine'])
        low,high = [np.array(report[k]) for k in ['lowXYZ','highExclusiveXYZ']]
        expected_low = np.floor((affine[:3,:3] @ [135,215,130] + affine[:3,3] - start) / step).astype(int)
        expected_high = np.ceil((affine[:3,:3] @ [260,320,190] + affine[:3,3] - start) / step).astype(int)+1
        np.testing.assert_array_equal(low,expected_low)
        np.testing.assert_array_equal(high,expected_high)
        for f in report['figures']:
            component = 'xyz'.index(f['axis'])
            axes = [np.arange(low[j],high[j]) if j != component else np.array([f['index']]) for j in range(3)]
            coords = np.stack(np.meshgrid(*axes,indexing='ij'),axis=-1)
            app = np.floor(((coords*step+start-affine[:3,3]) / np.diag(affine)[:3])+.5).astype(int)
            projected = labels[app[...,0],app[...,1],app[...,2]].squeeze(axis=component).T[::-1]
            self.assertEqual(hashlib.sha256(projected.tobytes()).hexdigest(),f['projectedSha256'])
            raw_plane = raw[np.ix_(*axes)].squeeze(axis=component)
            expected = encode_image(raw_plane,report['intensityWindow']).T[::-1]
            self.assertEqual(hashlib.sha256(expected.tobytes()).hexdigest(),f['rawEncodedSha256'])
            path = folder/f['path']
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),f['sha256'])
            h,w = expected.shape
            with Image.open(path) as image:
                actual = np.array(image.crop((0,50,w*3,50+h*3)))
            expected = np.repeat(np.repeat(expected,3,0),3,1)
            np.testing.assert_array_equal(actual,np.repeat(expected[:,:,None],3,2))

    def test_orientation_is_read_only_and_rejects_unknown_axis(self):
        data = np.arange(3*4*5).reshape(3,4,5)
        before = data.copy()
        np.testing.assert_array_equal(oriented_plane(data,'x',1),data[1,:,:].T[::-1])
        np.testing.assert_array_equal(oriented_plane(data,'y',2),data[:,2,:].T[::-1])
        np.testing.assert_array_equal(oriented_plane(data,'z',3),data[:,:,3].T[::-1])
        np.testing.assert_array_equal(data,before)
        with self.assertRaises(ValueError):oriented_plane(data,'bad',0)

    def test_saved_raw_panels_and_scientific_coordinates(self):
        folder = ROOT / 'work/anatomy-review/capsule-turn-context300-v1'
        report = json.loads((folder / 'report.json').read_text(encoding='utf-8'))
        self.assertFalse(report['adopted'])
        self.assertFalse(report['mutation'])
        self.assertEqual([f['index'] for f in report['figures']], [249,250,251,256,257,258,263,264,265])
        raw, start, step, _ = load_identity_minc(SOURCE / IMAGE_NAME, IMAGE_SHA)
        np.testing.assert_array_equal(start, report['sourceStart'])
        np.testing.assert_array_equal(step, report['sourceStep'])
        affine = np.array(report['scientificAffine'])
        np.testing.assert_array_equal(affine[:3,3], [-98,-134,-72])
        low = np.floor((affine[:3,:3] @ [135,215,148] + affine[:3,3] - start) / step).astype(int)
        high = np.ceil((affine[:3,:3] @ [260,320,161] + affine[:3,3] - start) / step).astype(int) + 1
        np.testing.assert_array_equal(low, report['lowXYZ'])
        np.testing.assert_array_equal(high, report['highExclusiveXYZ'])
        for figure in report['figures']:
            path = folder / figure['path']
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), figure['sha256'])
            plane = raw[low[0]:high[0], low[1]:high[1], figure['index']]
            expected = encode_image(plane, report['intensityWindow']).T[::-1]
            self.assertEqual(hashlib.sha256(expected.tobytes()).hexdigest(), figure['rawEncodedSha256'])
            h,w = expected.shape
            with Image.open(path) as image:
                actual = np.array(image.crop((0,50,w*3,50+h*3)))
            enlarged = np.repeat(np.repeat(expected,3,axis=0),3,axis=1)
            np.testing.assert_array_equal(actual, np.repeat(enlarged[:,:,None],3,axis=2))


if __name__ == '__main__':
    unittest.main()
