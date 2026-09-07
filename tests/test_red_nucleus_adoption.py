import copy
import json
import sys
import unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import adopt_registered_red_nuclei as r


class RedAdoptionTests(unittest.TestCase):
    def test_bounded_composition_preserves_other_labels_and_inputs(self):
        old=np.array([1,2,0,3,39,40],dtype=np.uint8).reshape(2,3,1)
        candidate=np.array([0,2,1,4,5,6],dtype=np.uint8).reshape(old.shape)
        before=old.copy(); source=candidate.copy()
        result=r.compose_red(old,candidate)
        self.assertEqual(result.ravel().tolist(),[0,2,1,3,39,40])
        np.testing.assert_array_equal(old,before);np.testing.assert_array_equal(candidate,source)
        candidate[1,0,0]=1
        with self.assertRaisesRegex(ValueError,'overwrite'):r.compose_red(old,candidate)
        np.testing.assert_array_equal(old,before)

    def test_real_artifact_and_reversible_scope(self):
        self.assertEqual(r.digest(r.FIXTURE.read_bytes()),r.BASE_SHA)
        self.assertEqual(r.digest(r.RECORD.read_bytes()),r.RECORD_SHA)
        record=json.loads(r.RECORD.read_text(encoding='utf-8'))
        dims,data=r.read_volume(r.FIXTURE)
        old=np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F')
        result=r.apply_record(old,record)
        stage=r.ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-remaining-registration-cec9.bin.gz'
        self.assertEqual(r.digest(stage.read_bytes()),record['outputCompressedSha256'])
        _,installed=r.read_volume(stage)
        self.assertEqual(result.tobytes(order='F'),bytes(installed))
        self.assertEqual(np.count_nonzero(old!=result),2224)
        mask=~np.isin(old,(0,1,2))
        np.testing.assert_array_equal(old[mask],result[mask])
        self.assertEqual([int(np.count_nonzero(result==i)) for i in (1,2)],[2887,2888])
        self.assertEqual(r.raw_sha(old),r.BASE_RAW)
        for change in ('out-of-scope','duplicate','wrong-after','wrong-hash','expert'):
            bad=copy.deepcopy(record)
            if change=='out-of-scope':bad['edits'][0][2]=3
            elif change=='duplicate':bad['edits'].insert(0,bad['edits'][0])
            elif change=='wrong-after':bad['edits'][0][2]=2 if bad['edits'][0][2]!=2 else 1
            elif change=='wrong-hash':bad['outputRawSha256']='0'*64
            else:bad['expertReviewed']=True
            with self.subTest(change=change),self.assertRaises(ValueError):r.apply_record(old,bad)
        self.assertEqual(r.raw_sha(old),r.BASE_RAW)


if __name__=='__main__':unittest.main()
