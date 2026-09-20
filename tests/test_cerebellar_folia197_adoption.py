import copy, gzip, hashlib, json, sys, unittest
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from stage_cerebellar_folia197 import replay

BASE_SHA='055feec985e9b3a007e7856904cef0f36bbc7b00040061fdcba5d5d74820c491'
AFTER_SHA='cbbf21552628767d4d19a146229490ce34c661947bbc3948eac6080bae76a4f0'
BEFORE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-cerebellar-folia197.bin.gz'
AFTER=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-septal-membrane282.bin.gz'
RECORD=ROOT/'segmentation-patches/review/cerebellar-folia197-adoption-2026-09-16.json'

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def load(path):
 raw=gzip.decompress(path.read_bytes())
 return raw,np.frombuffer(raw,np.uint8,offset=10).reshape((394,466,378),order='F')

class CerebellarFolia197AdoptionTests(unittest.TestCase):
 def test_exact_installed_replay_restore_and_counts(self):
  record=json.loads(RECORD.read_text(encoding='utf-8'));br,before=load(BEFORE);ar,after=load(AFTER)
  self.assertEqual(digest(BEFORE),BASE_SHA);self.assertEqual(digest(AFTER),AFTER_SHA);self.assertEqual(br[:10],ar[:10])
  self.assertEqual(record['count'],197);self.assertEqual(record['transition'],'mixed-cerebellar-folia-repair')
  self.assertEqual(record['transitionCounts'],{'0->28':153,'0->29':38,'27->28':6})
  self.assertTrue(record['installed']);self.assertTrue(record['projectAdopted']);self.assertFalse(record['expertReviewed']);self.assertFalse(record['published'])
  np.testing.assert_array_equal(replay(before,record['points']),after)
  np.testing.assert_array_equal(replay(after,record['points'],True),before)
  self.assertEqual(np.count_nonzero(before!=after),197)
  self.assertEqual(hashlib.sha256(after.tobytes(order='F')).hexdigest(),record['afterRawVoxelSha256'])
  self.assertEqual({i:int(np.count_nonzero(after==i)) for i in (27,28,29)},{27:264498,28:736104,29:725042})

 def test_replay_rejects_invalid_duplicate_transition_and_conflict_atomically(self):
  record=json.loads(RECORD.read_text(encoding='utf-8'));_,before=load(BEFORE);held=before.copy()
  bad_sets=[]
  bad=[dict(record['points'][0],after=27)];bad_sets.append(bad)
  bad=copy.deepcopy(record['points']);bad[1]['xyz']=bad[0]['xyz'];bad_sets.append(bad)
  for xyz in ([-1,0,0],[394,0,0],[1.5,0,0]):bad_sets.append([dict(record['points'][0],xyz=xyz)])
  for bad in bad_sets:
   with self.assertRaises(ValueError):replay(before,bad)
   np.testing.assert_array_equal(before,held)
  conflict=before.copy();conflict[tuple(record['points'][0]['xyz'])]=27;conflict_held=conflict.copy()
  with self.assertRaisesRegex(ValueError,'label conflict'):replay(conflict,record['points'])
  np.testing.assert_array_equal(conflict,conflict_held)

 def test_block_and_independent_metadata_follow_successor_without_geometry_drift(self):
  record=json.loads(RECORD.read_text(encoding='utf-8'));impact=record['meshImpact']
  changed=[r for r in impact['blockMaskImpact'] if r['changedMaskVoxels']]
  self.assertEqual([(r['block'],r['part'],r['changedMaskVoxels'],r['added'],r['removed']) for r in changed],[('hindbrain','cerebellum',22,22,0)])
  part=changed[0];before_mesh=ROOT/'tests/fixtures/block-hindbrain-cerebellum-pre-cerebellar-folia197.mesh';after_mesh=ROOT/'public/atlas/block-hindbrain-cerebellum.mesh'
  self.assertEqual(digest(before_mesh),part['beforeSha256']);self.assertEqual(digest(after_mesh),part['afterSha256']);self.assertTrue(part['beforeMatches'])
  self.assertEqual(record['sectionMeshImpact']['changedFiles'],[])
  for name in ('aqueduct-partial','internal-capsule'):
   old=json.loads((ROOT/f'tests/fixtures/section-current-{name}-pre-cerebellar-folia197.json').read_text())
   current=json.loads((ROOT/f'tests/fixtures/section-current-{name}-pre-septal-membrane282.json').read_text())
   self.assertEqual(old['sourceSha256'],BASE_SHA);self.assertEqual(current['sourceSha256'],AFTER_SHA)
   for key in set(old)|set(current):
    if key!='sourceSha256':self.assertEqual(old.get(key),current.get(key),key)
   fixture=ROOT/f'tests/fixtures/section-current-{name}-pre-aqueduct-fourth44.mesh'
   if name=='internal-capsule':fixture=ROOT/'tests/fixtures/section-current-internal-capsule-pre-anterior-commissure185.mesh'
   self.assertEqual(digest(fixture if fixture.exists() else ROOT/f'public/atlas/section-current-{name}.mesh'),current['sha256'])

 def test_validation_records_current_counts_and_regional_successor(self):
  meta=json.loads((ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json').read_text(encoding='utf-8'))
  self.assertEqual({k:meta['labelCounts'][k] for k in ('27','28','29')},{'27':264456,'28':736104,'29':725042})
  audit=meta['regionalBatchAudits']['cerebellar-folia197']
  self.assertEqual(audit['changedVoxelCount'],197);self.assertTrue(audit['projectAdopted']);self.assertFalse(audit['expertReviewed'])
  self.assertEqual(audit['record'],'segmentation-patches/review/cerebellar-folia197-adoption-2026-09-16.json')
  self.assertEqual(audit['recordSha256'],digest(RECORD))

if __name__=='__main__':unittest.main()
