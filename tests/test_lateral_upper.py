import copy
import gzip
import json
from pathlib import Path
import sys
import unittest
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from explore_lateral_upper_cavity import candidates,LABEL_SHA
from stage_lateral_upper729 import replay,digest


class LateralUpperTest(unittest.TestCase):
    def test_closed_seeded_cavity_not_tissue_other_labels_or_other_planes(self):
        image=np.zeros((12,12,4),np.uint8);labels=np.zeros_like(image)
        image[2:5,2:5,:]=255;labels[2,2,1]=23;labels[3,3,1]=7
        result,records=candidates(image,labels,1,2)
        self.assertEqual(int((result==23).sum()),7)
        self.assertEqual(result[3,3,1],0);self.assertFalse(result[:,:,0].any());self.assertFalse(result[:,:,2].any())
        self.assertTrue(all(r['seeds']==[23] for r in records));self.assertEqual(labels[2,2,1],23)

    def test_open_mixed_side_and_diagonal_only_components_are_rejected(self):
        for kind in ['open','mixed','diagonal']:
            image=np.zeros((12,12,3),np.uint8);labels=np.zeros_like(image)
            image[2:5,2:5,1]=255;labels[2,2,1]=23
            if kind=='open':image[:3,2,1]=255
            if kind=='mixed':labels[4,4,1]=24
            if kind=='diagonal':
                image[:]=0;image[2,2,1]=255;image[3,3,1]=255
            result,_=candidates(image,labels,1,1);self.assertFalse(result.any(),kind)
        with self.assertRaises(ValueError):candidates(image,labels,2,4)

    def fixture(self):
        xyz=np.indices((15,49,1)).reshape(3,-1).T[:729];xyz[:,2]=174
        entries=[dict(xyz=p.tolist(),before=0,after=23 if i<209 else 24) for i,p in enumerate(xyz)]
        return np.zeros((16,50,203),np.uint8),entries

    def test_exact_replay_reverse_and_invalid_edits_fail_closed(self):
        before,entries=self.fixture();before[15,49,202]=39
        after=replay(before,entries);self.assertTrue(np.array_equal(replay(after,entries,True),before))
        self.assertEqual(int((after!=before).sum()),729);self.assertEqual(after[15,49,202],39)
        for mutate in [lambda p:p.pop(),lambda p:p[0].update(before=True),lambda p:p[0].update(after=24),
            lambda p:p[0].update(xyz=p[1]['xyz']),lambda p:p[0].update(xyz=[0,0,173]),
            lambda p:p[0].update(xyz=[.5,0,174]),lambda p:p[0].update(xyz=[16,0,174])]:
            bad=copy.deepcopy(entries);mutate(bad)
            with self.assertRaises(ValueError):replay(before,bad)
        before[tuple(entries[0]['xyz'])]=7
        with self.assertRaises(ValueError):replay(before,entries)

    def test_adopted_full_volume_bytes_and_retained_tissue(self):
        r=json.loads((ROOT/'segmentation-patches/review/lateral-upper729-adoption-2026-09-08.json').read_bytes())
        base=(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-upper729.bin.gz').read_bytes()
        current=(ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lateral-anterior1981.bin.gz').read_bytes()
        self.assertEqual(digest(base),LABEL_SHA);self.assertEqual(digest(current),r['afterSha256'])
        load=lambda b:np.frombuffer(gzip.decompress(b),np.uint8,offset=10).reshape((394,466,378),order='F')
        before=load(base);after=load(current)
        self.assertTrue(np.array_equal(replay(before,r['points']),after));self.assertTrue(np.array_equal(replay(after,r['points'],True),before))
        self.assertTrue(np.array_equal(before[before!=0],after[before!=0]));self.assertEqual(after[197,267,178],0)
        self.assertEqual(int((after==23).sum()),80582);self.assertEqual(int((after==24).sum()),79602)
        self.assertFalse(r['expertReviewed']);self.assertFalse(r['published']);self.assertEqual(r['heldCount'],16)


if __name__=='__main__':unittest.main()
