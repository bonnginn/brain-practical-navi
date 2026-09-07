import sys,json,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import prepare_cerebellar_island_adoption as p
import install_cerebellar_island_repair as installer
class CerebellarRepair(unittest.TestCase):
    def test_real_installer_replay_and_tamper(self):
        dims,data=installer.read_volume(installer.BASE)
        labels=np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F')
        record=json.loads(installer.RECORD.read_text(encoding='utf-8'))
        self.assertEqual(installer.sha(installer.encode(installer.replay(labels,record))),installer.FINAL_SHA)
        record['expertReviewed']=True
        with self.assertRaises(ValueError):installer.replay(labels,record)
    def fixture(self):
        e=json.loads(p.EVIDENCE.read_text(encoding='utf-8'))
        labels=np.zeros((240,220,90),dtype=np.uint8);raw=np.zeros_like(labels)
        for c in e['components']:
            xyz=np.array(c['points']);labels[tuple(xyz.T)]=27;raw[tuple(xyz.T)]=c['rawValues']
        labels[0,0,0]=39
        return labels,raw,e
    def test_exact_transitions_and_24_unassigned_boundaries(self):
        labels,raw,e=self.fixture();saved=labels.copy()
        result,edits,held=p.repair(labels,raw,e)
        self.assertEqual(len(held),24);self.assertEqual(len(edits),64)
        self.assertEqual(np.count_nonzero(result==28),16);self.assertEqual(np.count_nonzero(result==29),20)
        self.assertEqual(np.count_nonzero(result==27),0);self.assertEqual(result[0,0,0],39)
        self.assertTrue(all(result[tuple(xyz)]==0 for xyz in held))
        np.testing.assert_array_equal(labels,saved)
    def test_changed_source_or_image_rejected(self):
        for image in (False,True):
            labels,raw,e=self.fixture()
            if image:raw[155,205,81]=0
            else:labels[155,205,81]=28
            with self.assertRaises(ValueError):p.repair(labels,raw,e)
    def test_evidence_pin_and_source_identity(self):
        self.assertEqual(p.sha(p.EVIDENCE.read_bytes()),p.EVIDENCE_SHA)
        labels,raw,e=self.fixture();e['inputSha256']='bad'
        with self.assertRaises(ValueError):p.repair(labels,raw,e)
