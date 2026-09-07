import copy,json,sys,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import adopt_remaining_registered_labels as r


class RemainingRegistrationTests(unittest.TestCase):
    def test_exact_final_composite_and_protected_labels(self):
        self.assertEqual(r.digest(r.RECORD.read_bytes()),r.RECORD_SHA)
        self.assertEqual(r.digest(r.FIXTURE.read_bytes()),r.BASE_SHA)
        record=json.loads(r.RECORD.read_text(encoding='utf-8'))
        dims,data=r.read_volume(r.FIXTURE)
        old=np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F')
        after=r.apply_record(old,record)
        self.assertEqual(r.raw_sha(old),r.BASE_RAW)
        stage=r.ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-brainstem-island-7ebe.bin.gz'
        self.assertEqual(r.digest(stage.read_bytes()),r.FINAL_SHA)
        _,installed=r.read_volume(stage)
        self.assertEqual(after.tobytes(order='F'),bytes(installed))
        self.assertEqual(int(np.count_nonzero(after!=old)),137228)
        for label in (1,2,23,24,25,26,28,29,30,33,34,35,39,40,41):
            with self.subTest(label=label):np.testing.assert_array_equal(old==label,after==label)
        self.assertEqual(int(after[173,262,184]),23)
        self.assertEqual(int(np.count_nonzero(np.isin(old,(27,31,32)) & (after!=old))),2522)

    def test_atomic_rejection_of_runs_and_metadata(self):
        record=json.loads(r.RECORD.read_text(encoding='utf-8'))
        dims,data=r.read_volume(r.FIXTURE)
        old=np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F')
        for case in ('zero','negative','overlap','float','other-target','red-target','expert','unapproved','count'):
            bad=copy.deepcopy(record)
            if case=='zero':bad['runs'][0][1]=0
            elif case=='negative':bad['runs'][0][0]=-1
            elif case=='overlap':bad['runs'].insert(0,bad['runs'][0])
            elif case=='float':bad['runs'][0][0]=float(bad['runs'][0][0])
            elif case=='other-target':bad['runs'][0][3]=39
            elif case=='red-target':bad['runs'][0][3]=1
            elif case=='expert':bad['expertReviewed']=True
            elif case=='unapproved':bad['reviewStatus']='candidate'
            else:bad['changedVoxelCount']-=1
            with self.subTest(case=case),self.assertRaises(ValueError):r.apply_record(old,bad)
        self.assertEqual(r.raw_sha(old),r.BASE_RAW)

    def test_run_packing_is_lossless_and_does_not_cross_transition(self):
        packed=r.pack_runs([1,2,3,5,6],[0,0,3,3,3],[3,3,0,0,0])
        self.assertEqual(packed,[[1,2,0,3],[3,1,3,0],[5,2,3,0]])


if __name__=='__main__':unittest.main()
