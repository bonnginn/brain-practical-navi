import copy
import gzip
import json
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_lateral_upper_nearblack1487 import replay, digest, LABEL_SHA, HELD
from explore_lateral_upper_cavity import candidates


class LateralUpperNearblackTest(unittest.TestCase):
    def test_near_black_threshold_preserves_nonzero_labels(self):
        image=np.zeros((8,8,3),np.uint8);labels=np.zeros_like(image)
        image[2:5,2:5,1]=245;labels[2,2,1]=23;labels[3,3,1]=7
        self.assertFalse(candidates(image,labels,1,1)[0].any())
        selected,_=candidates(image,labels,1,1,minimum=240)
        self.assertEqual(int((selected==23).sum()),7);self.assertEqual(selected[3,3,1],0)
        for value in [239,256,True,240.5]:
            with self.assertRaises(ValueError):candidates(image,labels,1,1,minimum=value)

    def test_replay_rejects_wrong_region_transition_and_conflicts(self):
        xyz=np.indices((45,45,1)).reshape(3,-1).T[:1487];xyz[:,1]+=270;xyz[:,2]=174
        entries=[dict(xyz=p.tolist(),before=0,after=23 if i<740 else 24) for i,p in enumerate(xyz)]
        before=np.zeros((46,316,203),np.uint8)
        after=replay(before,entries);self.assertTrue(np.array_equal(replay(after,entries,True),before))
        for mutate in [lambda p:p.pop(),lambda p:p[0].update(before=True),lambda p:p[0].update(after=24),
            lambda p:p[0].update(xyz=p[1]['xyz']),lambda p:p[0].update(xyz=[0,270,173]),
            lambda p:p[0].update(xyz=[0,270,203]),lambda p:p[0].update(xyz=[.5,270,174]),
            lambda p:p[0].update(xyz=[46,270,174])]:
            bad=copy.deepcopy(entries);mutate(bad)
            with self.assertRaises(ValueError):replay(before,bad)
        before[tuple(entries[0]['xyz'])]=7
        with self.assertRaises(ValueError):replay(before,entries)

    def test_full_volume_reversible_and_no_new_island(self):
        from scipy import ndimage
        r=json.loads((ROOT/'segmentation-patches/review/lateral-upper-nearblack1487-adoption-2026-09-08.json').read_bytes())
        base=(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-upper-nearblack1487.bin.gz').read_bytes()
        current=(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()
        self.assertEqual(digest(base),LABEL_SHA);self.assertEqual(digest(current),r['afterSha256'])
        load=lambda b:np.frombuffer(gzip.decompress(b),np.uint8,offset=10).reshape((394,466,378),order='F')
        before=load(base);after=load(current)
        self.assertTrue(np.array_equal(replay(before,r['points']),after))
        self.assertTrue(np.array_equal(replay(after,r['points'],True),before))
        self.assertTrue(np.array_equal(before[before!=0],after[before!=0]))
        for xyz in HELD:self.assertEqual(after[tuple(xyz)],0)
        for k,count in [(23,81455),(24,82197)]:
            self.assertEqual(int((after==k).sum()),count)
            reached=ndimage.binary_propagation(before==k,mask=after==k,structure=ndimage.generate_binary_structure(3,1))
            self.assertFalse(np.any((after==k)&~reached))
        self.assertFalse(r['expertReviewed']);self.assertFalse(r['published']);self.assertEqual(r['heldCount'],1294)


if __name__=='__main__':unittest.main()
