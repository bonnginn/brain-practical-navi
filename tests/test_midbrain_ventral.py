import json
import gzip
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from refine_midbrain_ventral_tissue import connected_candidates
from explore_midbrain_ventral_tissue import anchored_axial_tissue
from stage_midbrain_ventral14803 import replay, COUNT, LABEL_SHA, digest


class MidbrainVentralTest(unittest.TestCase):
    def test_axial_anchor_and_explicit_open_context(self):
        tissue=np.zeros((7,7,2),bool);tissue[2:5,2:5,:]=True
        labels=np.zeros(tissue.shape,np.uint8);labels[3,3,:]=27
        selected,_=anchored_axial_tissue(tissue,labels);self.assertEqual(int(selected.sum()),18)
        tissue[0:3,3,0]=True
        selected,planes=anchored_axial_tissue(tissue,labels);self.assertFalse(selected[:,:,0].any())
        selected,planes=anchored_axial_tissue(tissue,labels,allow_open_context=True)
        self.assertTrue(planes[0]['touchesCropEdge']);self.assertTrue(selected[0,3,0])

    def test_6connected_not_diagonal_or_nonzero(self):
        labels=np.zeros((8,8,8),np.uint8);labels[1,1,1]=27
        points=[[2,1,1],[3,1,1],[5,5,5],[2,2,2]]
        self.assertEqual(connected_candidates(labels,points).tolist(),[True,True,False,False])
        for bad in [[[2,1,1],[2,1,1]],[[8,1,1]],[[-1,1,1]],[[2.5,1,1]],[[1,1,1]]]:
            with self.assertRaises(ValueError):connected_candidates(labels,bad)

    def test_strict_region_and_reverse(self):
        points=np.indices((100,30,6)).reshape(3,-1).T[:COUNT]+[145,215,104]
        before=np.zeros((249,252,117),np.uint8);after=replay(before,points)
        self.assertTrue(np.array_equal(replay(after,points,True),before))
        for bad in [points[:-1],np.vstack([points[0],points[0],points[2:]]),points+[0,0,12],points.astype(float)+.5]:
            with self.assertRaises(ValueError):replay(before,bad)
        before[tuple(points[0])]=7
        with self.assertRaises(ValueError):replay(before,points)

    def test_staged_full_volume_reversible_preserving_labels(self):
        r=json.loads((ROOT/'segmentation-patches/review/midbrain-ventral14803-adoption-2026-09-08.json').read_bytes())
        base=(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-midbrain-ventral14803.bin.gz').read_bytes()
        current=(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-midbrain-interface14.bin.gz').read_bytes()
        self.assertEqual(digest(base),LABEL_SHA);self.assertEqual(digest(current),r['afterSha256'])
        load=lambda b:np.frombuffer(gzip.decompress(b),np.uint8,offset=10).reshape((394,466,378),order='F')
        before=load(base);after=load(current);points=np.asarray(r['points'])
        self.assertTrue(np.array_equal(replay(before,points),after));self.assertTrue(np.array_equal(replay(after,points,True),before))
        self.assertTrue(np.array_equal(before[before!=0],after[before!=0]));self.assertTrue(connected_candidates(before,points).all())
        self.assertEqual(int((after==27).sum()),264619)
        self.assertTrue(np.all(after[tuple(np.asarray(r['rejectedXYZ']).T)]==0))

    def test_interface_hold_preserves_old_contacts_and_all_existing_labels(self):
        from stage_midbrain_interface14 import HELD, replay as hold
        from scipy import ndimage
        a=json.loads((ROOT/'segmentation-patches/review/midbrain-ventral14803-adoption-2026-09-08.json').read_bytes())
        r=json.loads((ROOT/'segmentation-patches/review/midbrain-interface14-adoption-2026-09-08.json').read_bytes())
        load=lambda path:np.frombuffer(gzip.decompress(path.read_bytes()),np.uint8,offset=10).reshape((394,466,378),order='F')
        original=load(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-midbrain-ventral14803.bin.gz')
        intermediate=replay(original,a['points'])
        final=load(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz')
        self.assertEqual(r['points'],HELD);self.assertTrue(np.array_equal(hold(intermediate,HELD),final))
        self.assertTrue(np.array_equal(hold(final,HELD,True),intermediate))
        self.assertTrue(np.array_equal(original[original!=0],final[original!=0]))
        new=(original==0)&(final==27);self.assertEqual(int(new.sum()),14789)
        boundary=ndimage.binary_dilation(np.isin(original,[33,39,40]),structure=ndimage.generate_binary_structure(3,1))
        self.assertFalse((new&boundary).any());self.assertTrue(connected_candidates(original,np.argwhere(new)).all())
        self.assertEqual(int((final==27).sum()),264605)
        for bad in [HELD[:-1],list(reversed(HELD)),np.asarray(HELD,dtype=float)]:
            with self.assertRaises(ValueError):hold(intermediate,bad)


if __name__=='__main__':unittest.main()
