"""Mapping order, schematic provenance and raw-panel guards; not anatomy review."""
import copy
import json
import sys
import unittest
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from render_trigeminal_native100_review import native_points,profile_points,make_row,digest


class TrigeminalNativeTests(unittest.TestCase):
    def test_alternate_window_preserves_source_and_geometry(self):
        decoded=np.full((121,121,121),62000.)
        args=(decoded,'y',60,np.array([60.,60,60]),np.array([0,0,0]),30,0)
        original,a=make_row(*args)
        alternate,b=make_row(*args,window=(40000,65535))
        self.assertEqual(a['decodedPixelSha256'],b['decodedPixelSha256'])
        self.assertEqual(a['markerPixelXY'],b['markerPixelXY'])
        self.assertNotEqual(a['grayPixelSha256'],b['grayPixelSha256'])
        self.assertTrue((np.asarray(original)[64:,:363]==255).all())
        self.assertTrue((np.asarray(alternate)[64:,:363]<255).all())
        for bad in [(60000,15000),(0,65536),(float('nan'),65535)]:
            with self.assertRaises(ValueError):make_row(*args,window=bad)

    def test_mapping_order_and_tolerance(self):
        calls=[]
        class Grid:
            def __init__(self,name,slope,offset):self.name=name;self.slope=slope;self.offset=offset
            def forward(self,p):return p*self.slope+self.offset
            def inverse(self,p,tolerance):
                calls.append((self.name,tolerance));return (p-self.offset)/self.slope
        grids=[Grid('first',2,1),Grid('last',3,4)];native=Grid('native',4,2)
        linear=np.array([[2.,0,0,3],[0,2,0,4],[0,0,2,5]])
        source=np.array([[1.,2,3]])
        world=grids[1].forward(grids[0].forward(native.forward(source@linear[:,:3].T+linear[:,3])))
        result,error=native_points(world,grids,native,linear)
        np.testing.assert_allclose(result,source)
        self.assertEqual(calls,[('last',1e-6),('first',1e-6),('native',1e-6)])
        self.assertLessEqual(error.max(),1e-4)

    def test_current_schematic_ring_provenance(self):
        profile=json.loads((ROOT/'work/anatomy-review/nerve-path-tissue-v1.json').read_text(encoding='utf-8'))
        mesh=(ROOT/'public/atlas/overlay-nerves-pontine.mesh').read_bytes()
        points=profile_points(profile,mesh)
        self.assertEqual([(p['modelId'],p['ring']) for p in points],[(30,0),(30,4),(31,0),(31,4)])
        bad=copy.deepcopy(profile)
        next(p for p in bad['paths'] if p['id']==30)['samples'][0]['appXYZ'][0]+=.1
        with self.assertRaises(ValueError):profile_points(bad,mesh)

    def test_raw_panel_is_unmarked_and_input_unchanged(self):
        decoded=np.full((121,121,121),37500.);before=decoded.copy()
        row,record=make_row(decoded,'y',60,np.array([60.,60,60]),np.array([0,0,0]),30,0)
        raw=np.asarray(row)[64:,0:363]
        self.assertTrue((raw==128).all())
        self.assertFalse((np.asarray(row)[64:,375:]==128).all())
        np.testing.assert_equal(decoded,before)
        self.assertEqual(record['globalIndex'],60)

    def test_bundle_coverage_and_hashes(self):
        folder=ROOT/'work/anatomy-review/trigeminal-native100-v1'
        report=json.loads((folder/'report.json').read_text(encoding='utf-8'))
        self.assertEqual(len(report['figures']),12)
        self.assertEqual(sum(len(f['planes']) for f in report['figures']),36)
        self.assertLessEqual(report['maxForwardRoundtripErrorMm'],1e-4)
        self.assertTrue(report['profileVAllRingMeansExactlyReproduced'])
        self.assertTrue(report['visualReviewPending']);self.assertFalse(report['inverted'])
        for f in report['figures']:
            self.assertEqual(digest((folder/f['path']).read_bytes()),f['sha256'])
            indices=[p['globalIndex'] for p in f['planes']]
            self.assertEqual(indices,list(range(indices[0],indices[0]+3)))

    def test_alternate_bundle_has_identical_decoded_planes(self):
        base=ROOT/'work/anatomy-review'
        first=json.loads((base/'trigeminal-native100-v1/report.json').read_text(encoding='utf-8'))
        folder=base/'trigeminal-native100-window-v2'
        second=json.loads((folder/'report.json').read_text(encoding='utf-8'))
        self.assertEqual(second['intensityWindow'],[40000,65535])
        self.assertEqual(first['points'],second['points'])
        self.assertEqual(len(second['figures']),12)
        for a,b in zip(first['figures'],second['figures']):
            self.assertEqual(a['path'],b['path'])
            self.assertEqual(digest((folder/b['path']).read_bytes()),b['sha256'])
            for p,q in zip(a['planes'],b['planes']):
                for key in ['axis','globalIndex','decodedPixelSha256','markerPixelXY','planeShape']:
                    self.assertEqual(p[key],q[key])


if __name__=='__main__':unittest.main()
