import sys,json,copy,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import prepare_brainstem_paired_adoption as p
import install_brainstem_paired_repair as installer

class PairedRepair(unittest.TestCase):
    def test_installer_replay_and_adoption_tamper(self):
        dims,data=installer.read_volume(installer.BASE)
        labels=np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F')
        record=json.loads(installer.RECORD.read_text(encoding='utf-8'))
        result=installer.replay(labels,record)
        self.assertEqual(installer.sha(installer.encode(result)),installer.FINAL_SHA)
        record['expertReviewed']=True
        with self.assertRaises(ValueError):installer.replay(labels,record)
    def fixture(self):
        labels=np.zeros((220,210,140),dtype=np.uint8)
        labels[175:177,201:203,133:135]=27
        labels[215:217,201:203,133:135]=27
        labels[1,1,1]=27;labels[2,2,2]=39
        return labels,json.loads(p.EVIDENCE.read_text(encoding='utf-8'))
    def test_exact_repair_retains_other_labels_and_input(self):
        before,evidence=self.fixture();original=before.copy()
        after,points=p.repair(before,evidence)
        self.assertEqual(len(points),16);self.assertEqual(np.count_nonzero(before!=after),16)
        self.assertEqual(after[1,1,1],27);self.assertEqual(after[2,2,2],39)
        np.testing.assert_array_equal(before,original)
    def test_changed_connectivity_or_evidence_is_rejected(self):
        for xyz in [(174,201,133),(217,201,133)]:
            before,evidence=self.fixture();before[xyz]=27
            with self.assertRaises(ValueError):p.repair(before,evidence)
        before,evidence=self.fixture();evidence['components'][0]['points'][0]=[0,0,0]
        with self.assertRaises(ValueError):p.repair(before,evidence)
    def test_source_evidence_is_pinned(self):
        self.assertEqual(p.sha(p.EVIDENCE.read_bytes()),p.EVIDENCE_SHA)
        before,evidence=self.fixture();evidence['inputSha256']='bad'
        with self.assertRaises(ValueError):p.repair(before,evidence)
