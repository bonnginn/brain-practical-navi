import gzip, hashlib, json, sys, unittest
from pathlib import Path
import numpy as np
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1]; sys.path.insert(0,str(ROOT/'scripts'))
from stage_right_foramen36 import replay

BEFORE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-right-foramen36.bin.gz'
AFTER=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-lgn-layers2571.bin.gz'
RECORD=ROOT/'segmentation-patches/review/right-foramen36-adoption-2026-09-16.json'

def load(path):
 raw=gzip.decompress(path.read_bytes()); return np.frombuffer(raw,np.uint8,offset=10).reshape((394,466,378),order='F')

class RightForamen36AdoptionTests(unittest.TestCase):
 def test_exact_reversible_36_point_transition_and_five_cavity_connection(self):
  r=json.loads(RECORD.read_text()); before,after=load(BEFORE),load(AFTER)
  self.assertEqual(hashlib.sha256(BEFORE.read_bytes()).hexdigest(),r['beforeSha256']);self.assertEqual(hashlib.sha256(AFTER.read_bytes()).hexdigest(),r['afterSha256'])
  self.assertEqual((r['count'],r['transition'],r['countsBefore'],r['countsAfter']),(36,'0->25',{'25':11837},{'25':11873}))
  np.testing.assert_array_equal(replay(before,r['points']),after);np.testing.assert_array_equal(replay(after,r['points'],True),before)
  changed=before!=after;self.assertEqual(int(changed.sum()),36);self.assertTrue(np.all(before[changed]==0));self.assertTrue(np.all(after[changed]==25));np.testing.assert_array_equal(before[~changed],after[~changed])
  ids,_=ndimage.label(np.isin(after,(23,24,25,26,41)),ndimage.generate_binary_structure(3,1)); comps={k:int(np.argmax(np.bincount(ids[after==k]))) for k in (23,24,25,26,41)}
  self.assertEqual(len(set(comps.values())),1);self.assertTrue(r['connectivity']['after']['allFiveConnected'])
  current=load(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz')
  for ident in (23,24,25,26,41):np.testing.assert_array_equal(current==ident,after==ident)

if __name__=='__main__':unittest.main()
