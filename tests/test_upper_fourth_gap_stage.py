import copy,gzip,json,sys,unittest
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from stage_upper_fourth_gap import BASE_SHA,CANDIDATE,digest,replay
BEFORE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-upper-fourth-gap.bin.gz'
AFTER=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-folia197.bin.gz'
RECORD=ROOT/'segmentation-patches/review/upper-fourth-gap-adoption-2026-09-15.json'
AFTER_SHA='055feec985e9b3a007e7856904cef0f36bbc7b00040061fdcba5d5d74820c491'

def load(path):
 raw=gzip.decompress(path.read_bytes());return raw,np.frombuffer(raw,np.uint8,offset=10).reshape((394,466,378),order='F')
class UpperFourthGapStageTests(unittest.TestCase):
 def test_independent_section_geometry_is_unchanged_across_source_revision(self):
  for name in ('aqueduct-partial','internal-capsule'):
   before=json.loads((ROOT/f'tests/fixtures/section-current-{name}-pre-upper-fourth-gap.json').read_text())
   current=json.loads((ROOT/f'tests/fixtures/section-current-{name}-pre-cerebellar-folia197.json').read_text())
   self.assertEqual(before['sourceSha256'],BASE_SHA);self.assertEqual(current['sourceSha256'],AFTER_SHA)
   for key in set(before)|set(current):
    if key!='sourceSha256':self.assertEqual(before.get(key),current.get(key),key)
   fixture=ROOT/f'tests/fixtures/section-current-{name}-pre-aqueduct-fourth44.mesh'
   self.assertEqual(digest(fixture.read_bytes() if fixture.exists() else (ROOT/f'public/atlas/section-current-{name}.mesh').read_bytes()),current['sha256'])
 def test_exact_158_installed_replay_and_restore(self):
  record=json.loads(RECORD.read_text(encoding='utf-8'));br,before=load(BEFORE);ar,after=load(AFTER)
  self.assertEqual(digest(BEFORE.read_bytes()),BASE_SHA);self.assertEqual(digest(AFTER.read_bytes()),AFTER_SHA);self.assertEqual(br[:10],ar[:10])
  self.assertEqual(record['count'],158);self.assertEqual(record['transition'],'mixed-to-26');self.assertTrue(record['installed']);self.assertFalse(record['expertReviewed'])
  self.assertEqual(sum(p['before']==0 for p in record['points']),57);self.assertEqual(sum(p['before']==27 for p in record['points']),101);self.assertTrue(all(p['after']==26 for p in record['points']))
  np.testing.assert_array_equal(replay(before,record['points']),after);np.testing.assert_array_equal(replay(after,record['points'],True),before)
  self.assertEqual(np.count_nonzero(before!=after),158);self.assertEqual(digest(after.tobytes(order='F')),record['afterRawVoxelSha256'])
 @unittest.skipUnless(CANDIDATE.exists() and (ROOT/'work/ventricle-gap-20260915-continuation/decision-adopt158.json').exists(),'Local original-image decision evidence not packaged for CI')
 def test_local_decision_excludes_z111_and_is_pinned_to_candidate(self):
  record=json.loads(RECORD.read_text(encoding='utf-8'));decision_path=ROOT/record['decision']['path'];decision_bytes=decision_path.read_bytes();decision=json.loads(decision_bytes)
  self.assertEqual(digest(decision_bytes),record['decision']['sha256']);self.assertTrue(decision['approved']);self.assertFalse(decision['expertReviewed']);self.assertEqual(digest(CANDIDATE.read_bytes()),decision['candidateSha256'])
  selected={tuple(p) for p in decision['points']};all_candidates={tuple(r['xyz']) for r in json.loads(CANDIDATE.read_text())['records']}
  self.assertEqual(len(selected),158);self.assertEqual(all_candidates-selected,{(187,193,111),(187,194,111),(188,194,111)})
 def test_replay_rejects_transition_conflict_duplicate_and_invalid_coordinates_atomically(self):
  record=json.loads(RECORD.read_text());_,before=load(BEFORE);original=before.copy()
  mutations=[]
  bad=[dict(record['points'][0])];bad[0]['after']=41;mutations.append(bad)
  bad=copy.deepcopy(record['points']);bad[1]['xyz']=bad[0]['xyz'];mutations.append(bad)
  for xyz in ([-1,0,0],[394,0,0],[1.5,0,0]):
   bad=[dict(record['points'][0],xyz=xyz)];mutations.append(bad)
  for bad in mutations:
   with self.assertRaises(ValueError):replay(before,bad)
   self.assertTrue(np.array_equal(before,original))
  conflict=before.copy();xyz=tuple(record['points'][0]['xyz']);conflict[xyz]=25;held=conflict.copy()
  with self.assertRaisesRegex(ValueError,'label conflict'):replay(conflict,record['points'])
  self.assertTrue(np.array_equal(conflict,held))
if __name__=='__main__':unittest.main()
