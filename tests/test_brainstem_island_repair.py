import sys,unittest
import json,copy
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from prepare_brainstem_island_adoption import remove_reviewed_island
import install_brainstem_island_repair as installer

class IslandRepair(unittest.TestCase):
    def test_installer_replay_and_mutations(self):
        dims,data=installer.read_volume(installer.BASE)
        labels=np.frombuffer(data,dtype=np.uint8).reshape(dims,order='F')
        record=json.loads(installer.RECORD.read_text(encoding='utf-8'))
        self.assertEqual(installer.sha(installer.RECORD.read_bytes()),installer.RECORD_SHA)
        self.assertEqual(installer.sha(installer.encode(installer.replay(labels,record))),installer.FINAL_SHA)
        for field,value in [('expertReviewed',True),('sourceLabel',26),('changedVoxelCount',41),('outputRawSha256','bad')]:
            bad=copy.deepcopy(record);bad[field]=value
            with self.assertRaises(ValueError):installer.replay(labels,bad)
        bad=copy.deepcopy(record);bad['points'][0]=bad['points'][1]
        with self.assertRaises(ValueError):installer.replay(labels,bad)
    def fixture(self):
        labels=np.zeros((202,210,147),dtype=np.uint8)
        labels[191:201,205:207,143:145]=27
        labels[0,0,0]=27;labels[1,1,1]=39
        return labels
    def test_only_exact_reviewed_island_changes(self):
        before=self.fixture();snapshot=before.copy()
        after,points=remove_reviewed_island(before)
        self.assertEqual(len(points),40)
        self.assertEqual(after[0,0,0],27);self.assertEqual(after[1,1,1],39)
        self.assertEqual(np.count_nonzero(before!=after),40)
        np.testing.assert_array_equal(before,snapshot)
    def test_connected_extension_or_absent_seed_is_rejected(self):
        for xyz,value in [((190,205,143),27),((195,205,143),0)]:
            labels=self.fixture();labels[xyz]=value
            with self.assertRaises(ValueError):remove_reviewed_island(labels)
