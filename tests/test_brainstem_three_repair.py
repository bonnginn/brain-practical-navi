import sys,json,copy,unittest
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import prepare_brainstem_three_adoption as p
import install_brainstem_three_repair as installer

class ThreeRepair(unittest.TestCase):
    def test_installed_replay_and_tamper_rejection(self):
        dims,data=installer.read_volume(installer.BASE)
        labels=np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F')
        record=json.loads(installer.RECORD.read_text(encoding='utf-8'))
        self.assertEqual(installer.sha(installer.encode(installer.replay(labels,record))),installer.FINAL_SHA)
        record['expertReviewed']=True
        with self.assertRaises(ValueError):installer.replay(labels,record)
    def fixture(self):
        evidence=json.loads(p.EVIDENCE.read_text(encoding='utf-8'))
        labels=np.zeros((240,260,140),dtype=np.uint8)
        for c in evidence['components']:
            labels[tuple(np.array(c['points']).T)]=27
        labels[0,0,0]=39
        return labels,evidence
    def test_exact_27_changes_and_other_86_retained(self):
        labels,evidence=self.fixture();snapshot=labels.copy()
        result,points=p.repair(labels,evidence)
        self.assertEqual(len(points),27);self.assertEqual(np.count_nonzero(labels!=result),27)
        self.assertEqual(np.count_nonzero(result==27),86);self.assertEqual(result[0,0,0],39)
        np.testing.assert_array_equal(labels,snapshot)
    def test_changed_connectivity_is_rejected(self):
        labels,evidence=self.fixture();labels[162,231,91]=27
        with self.assertRaises(ValueError):p.repair(labels,evidence)
    def test_wrong_source_missing_or_duplicate_component_is_rejected(self):
        for mutate in [
            lambda r:r.update(inputSha256='bad'),
            lambda r:r.update(components=[x for x in r['components'] if x['name']!='mid-upper']),
            lambda r:r['components'].append(copy.deepcopy(next(x for x in r['components'] if x['name']=='mid-upper'))),
        ]:
            labels,evidence=self.fixture();mutate(evidence)
            with self.assertRaises(ValueError):p.repair(labels,evidence)
    def test_pinned_image_record(self):
        self.assertEqual(p.sha(p.EVIDENCE.read_bytes()),p.EVIDENCE_SHA)
