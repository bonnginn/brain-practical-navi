"""Evidence integrity and independently decoded unmarked panels; not anatomy approval."""
import hashlib
import json
import sys
import unittest
from pathlib import Path
import h5py
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from read_native100_crop import read_crop

class FornixNativeTests(unittest.TestCase):
    def test_wide_orthogonal_raw_planes_and_coverage(self):
        folder=ROOT/'work/anatomy-review/fornix-native100-wide-orthogonal-v1'
        report=json.loads((folder/'report.json').read_text())
        expected=[('x',i) for i in [669,670,671,682,683,684,696,697,698]]+[('z',i) for i in [653,654,655]]
        self.assertEqual([(f['axis'],f['index']) for f in report['figures']],expected)
        meta=report['crop'];low=np.array(meta['lowXYZ'])
        self.assertEqual((low[1],meta['highExclusiveXYZ'][1]),(775,938))
        with h5py.File(ROOT/'work/full16_100um_optbal.mnc','r') as source:
            decoded,_,_,_=read_crop(source['minc-2.0/image/0'],low,np.array(meta['highExclusiveXYZ']))
        for f in report['figures']:
            axis='xyz'.index(f['axis']);values=np.take(decoded,f['index']-low[axis],axis=axis).T[::-1]
            self.assertEqual(hashlib.sha256(values.tobytes()).hexdigest(),f['decodedSha256'])
            gray=np.rint(np.clip((values-40000)/25535,0,1)*255).astype('uint8')
            pixels=np.repeat(np.repeat(gray,4,axis=0),4,axis=1)
            np.testing.assert_array_equal(np.asarray(Image.open(folder/f['path']))[45:],np.repeat(pixels[:,:,None],3,axis=2))
        self.assertEqual([p for c in report['contacts'] for p in c['sourcePanels']],[f['path'] for f in report['figures']])
        for c in report['contacts']:
            sheet=np.asarray(Image.open(folder/c['path']));x=0
            self.assertEqual(hashlib.sha256((folder/c['path']).read_bytes()).hexdigest(),c['sha256'])
            for name in c['sourcePanels']:
                panel=np.asarray(Image.open(folder/name));width=panel.shape[1]
                np.testing.assert_array_equal(sheet[:,x:x+width],panel);x+=width
            self.assertEqual(x,sheet.shape[1])

    def test_series_is_consecutive_and_contacts_are_pixel_exact(self):
        folder=ROOT/'work/anatomy-review/fornix-native100-coronal-series-v1'
        report=json.loads((folder/'report.json').read_text())
        self.assertEqual([f['index'] for f in report['figures']],list(range(845,868)))
        self.assertEqual([p for c in report['contacts'] for p in c['sourcePanels']],[f['path'] for f in report['figures']])
        for figure in report['figures']+report['contacts']:
            self.assertEqual(hashlib.sha256((folder/figure['path']).read_bytes()).hexdigest(),figure['sha256'])
        for contact in report['contacts']:
            combined=np.asarray(Image.open(folder/contact['path']));x=0
            for name in contact['sourcePanels']:
                panel=np.asarray(Image.open(folder/name));w=panel.shape[1]
                np.testing.assert_array_equal(combined[:,x:x+w],panel);x+=w
            self.assertEqual(x,combined.shape[1])
        meta=report['crop'];low=np.array(meta['lowXYZ'])
        with h5py.File(ROOT/'work/full16_100um_optbal.mnc','r') as source:
            decoded,_,_,_=read_crop(source['minc-2.0/image/0'],low,np.array(meta['highExclusiveXYZ']))
        for f in report['figures']:
            values=decoded[:,f['index']-low[1],:].T[::-1]
            self.assertEqual(hashlib.sha256(values.tobytes()).hexdigest(),f['decodedSha256'])
            gray=np.rint(np.clip((values-40000)/25535,0,1)*255).astype('uint8')
            expected=np.repeat(np.repeat(gray,4,axis=0),4,axis=1)
            np.testing.assert_array_equal(np.asarray(Image.open(folder/f['path']))[45:],np.repeat(expected[:,:,None],3,axis=2))

    def test_geometry_coverage_and_raw_panels(self):
        self.check_reference_bundle('fornix-native100-connection-v1','registeredXYZ',[[322,422,291],[331,422,291]])

    def test_capsule_geometry_and_raw_panels(self):
        self.check_reference_bundle('capsule-native100-anterior-v1','appXYZ',[[155,299,159],[235,299,159]])

    def test_fourth_ventricle_geometry_and_raw_panels(self):
        self.check_reference_bundle('fourth-native100-wall-v1','appXYZ',[[188,184,73],[204,184,73]])

    def test_third_detached_geometry_and_raw_panels(self):
        self.check_reference_bundle('third-detached137-native100-v1','appXYZ',[[193,248,168],[193,241,172]])

    def test_lateral_residual_geometry_and_raw_panels(self):
        self.check_reference_bundle('lateral-residual80-116-native100-v1','appXYZ',[[235,235,117],[248,248,109]])

    def test_lateral_cavity21_geometry_and_raw_panels(self):
        self.check_reference_bundle('lateral-cavity21-native100-v1','appXYZ',[[240,249,105],[253,242,113]])

    def test_lateral_crop34_geometry_and_raw_panels(self):
        self.check_reference_bundle('lateral-crop34-native100-v1','appXYZ',[[232,249,107],[239,249,106],[254,253,91]])

    def check_reference_bundle(self,name,point_key,expected_points):
        folder=ROOT/'work/anatomy-review'/name
        report=json.loads((folder/'report.json').read_text())
        self.assertEqual([p[point_key] for p in report['points']],expected_points)
        if point_key=='appXYZ':
            affine=np.array(report['scientificAffine'])
            self.assertEqual(report['referenceSpace'],'App500')
            for p in report['points']:
                np.testing.assert_allclose(np.array(p['appXYZ'])@affine[:3,:3].T+affine[:3,3],p['worldMm'],rtol=0,atol=1e-9)
        self.assertEqual(len(report['figures']),3*len(expected_points))
        self.assertLess(report['maxForwardRoundtripErrorMm'],1e-4)
        self.assertFalse(report['adopted']);self.assertFalse(report['mutation'])
        with h5py.File(ROOT/'work/full16_100um_optbal.mnc','r') as source:
            for point in range(len(expected_points)):
                p=report['points'][point];meta=p['crop'];low=np.array(meta['lowXYZ'])
                decoded,_,_,_=read_crop(source['minc-2.0/image/0'],low,np.array(meta['highExclusiveXYZ']))
                self.assertEqual(hashlib.sha256(decoded.tobytes()).hexdigest(),p['decodedSha256'])
                for axis in range(3):
                    f=report['figures'][point*3+axis];path=folder/f['path']
                    self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),f['sha256'])
                    image=np.asarray(Image.open(path));self.assertEqual(image.shape,(1239,738,3))
                    indices=[v['index'] for v in f['planes']]
                    self.assertEqual(indices,list(range(indices[0],indices[0]+3)))
                    for row,plane in enumerate(f['planes']):
                        values=np.take(decoded,plane['index']-low[axis],axis=axis).T[::-1]
                        self.assertEqual(hashlib.sha256(values.tobytes()).hexdigest(),plane['decodedSha256'])
                        gray=np.rint(np.clip((values-40000)/25535,0,1)*255).astype('uint8')
                        expected=np.repeat(np.repeat(gray,3,axis=0),3,axis=1)
                        raw=image[row*413+50:(row+1)*413,:363]
                        np.testing.assert_array_equal(raw,np.repeat(expected[:,:,None],3,axis=2))

if __name__=='__main__':unittest.main()
