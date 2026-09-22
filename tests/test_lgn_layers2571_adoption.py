import gzip, hashlib, json, sys, unittest
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from stage_lgn_layers2571 import replay
from stage_aqueduct_fourth44 import encode
from build_section_ventricle_meshes import reconstruct

BEFORE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lgn-layers2571.bin.gz'
CURRENT=ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz'
RECORD=ROOT/'segmentation-patches/review/lgn-layers2571-adoption-2026-09-16.json'
def load(path):
 raw=gzip.decompress(path.read_bytes());return raw,np.frombuffer(raw,np.uint8,offset=10).reshape((394,466,378),order='F')
class LgnLayers2571AdoptionTests(unittest.TestCase):
 def test_exact_reversible_transition_and_current_layer_mask(self):
  r=json.loads(RECORD.read_text());raw,before=load(BEFORE);_,current=load(CURRENT)
  self.assertEqual(hashlib.sha256(BEFORE.read_bytes()).hexdigest(),r['beforeSha256']);self.assertEqual(len(r['points']),2571);self.assertEqual((sum(p['after']==44 for p in r['points']),sum(p['after']==45 for p in r['points'])),(1197,1374))
  after=replay(before,r['points']);np.testing.assert_array_equal(replay(after,r['points'],True),before)
  changed=before!=after;self.assertEqual(int(changed.sum()),2571);self.assertEqual(int(np.count_nonzero(after==44)),1197);self.assertEqual(int(np.count_nonzero(after==45)),1374);self.assertEqual(int(np.count_nonzero(after==16)),67297);np.testing.assert_array_equal(before[~changed],after[~changed])
  self.assertEqual(hashlib.sha256(after.tobytes(order='F')).hexdigest(),r['afterRawVoxelSha256'])
  self.assertEqual(int(np.count_nonzero(np.isin(current,[44,45]))),2571);np.testing.assert_array_equal(np.isin(current,[44,45]),np.isin(after,[44,45]))
  overlap=[p for p in r['points'] if p['before']==16];self.assertEqual(len(overlap),1);self.assertEqual(overlap[0]['xyz'],[240,209,138]);self.assertEqual(overlap[0]['after'],45)
 def test_independent_section_mesh_reconstructs_both_current_layers(self):
  _,labels=load(CURRENT);payload,info=reconstruct(np.isin(labels,[44,45]).transpose(2,1,0));payload=encode(payload);mesh=(ROOT/'public/atlas/section-current-lateral-geniculate-bodies.mesh').read_bytes();meta=json.loads((ROOT/'public/atlas/section-current-lateral-geniculate-bodies.json').read_text())
  self.assertEqual(payload,mesh);self.assertEqual(info['voxels'],2571);self.assertEqual(meta['voxels'],2571);self.assertEqual(meta['sha256'],hashlib.sha256(mesh).hexdigest())
if __name__=='__main__':unittest.main()
