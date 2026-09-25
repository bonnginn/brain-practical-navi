import copy,gzip,hashlib,io,json,sys,unittest
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from build_section_ventricle_meshes import reconstruct
from stage_septal_membrane282 import replay
BASE_SHA='cbbf21552628767d4d19a146229490ce34c661947bbc3948eac6080bae76a4f0'
AFTER_SHA='4e9b48aa687e21f38d140dd4745319875112130c84301434e68ce4713ba27b5f'
CURRENT_SHA='065ebcef8e76dcbaab292750815d5135d92b1da1123a92b802d2efff2e41a912'
BEFORE=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-septal-membrane282.bin.gz'
AFTER=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-anterior-commissure-core416.bin.gz'
CURRENT=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-aqueduct-fourth44.bin.gz'
RECORD=ROOT/'segmentation-patches/review/septal-membrane282-adoption-2026-09-16.json'
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def load(path):
 raw=gzip.decompress(path.read_bytes());return raw,np.frombuffer(raw,np.uint8,offset=10).reshape((394,466,378),order='F')
def fixed_gzip(payload):
 out=io.BytesIO()
 with gzip.GzipFile(fileobj=out,mode='wb',filename='',mtime=0) as stream:stream.write(payload)
 return out.getvalue()

class SeptalMembrane282AdoptionTests(unittest.TestCase):
 def test_exact_replay_reverse_count_and_other_labels_unchanged(self):
  record=json.loads(RECORD.read_text(encoding='utf-8'));br,before=load(BEFORE);ar,after=load(AFTER)
  self.assertEqual(digest(BEFORE),BASE_SHA);self.assertEqual(digest(AFTER),AFTER_SHA);self.assertEqual(br[:10],ar[:10])
  self.assertEqual((record['transition'],record['count'],record['components6'],record['componentSizes']),('0->43',282,8,[181,71,12,7,5,3,2,1]))
  self.assertTrue(record['installed']);self.assertTrue(record['projectAdopted']);self.assertFalse(record['expertReviewed']);self.assertFalse(record['published'])
  np.testing.assert_array_equal(replay(before,record['points']),after);np.testing.assert_array_equal(replay(after,record['points'],True),before)
  changed=before!=after;self.assertEqual(int(changed.sum()),282);self.assertTrue(np.all(before[changed]==0));self.assertTrue(np.all(after[changed]==43));np.testing.assert_array_equal(before[~changed],after[~changed])
  self.assertEqual(int(np.count_nonzero(after==43)),282);self.assertEqual(hashlib.sha256(after.tobytes(order='F')).hexdigest(),record['afterRawVoxelSha256'])
  _,current=load(CURRENT);successor=before!=current
  self.assertEqual(digest(CURRENT),CURRENT_SHA);self.assertEqual(int(successor.sum()),282+416)
  ac_only=after!=current;self.assertEqual(int(ac_only.sum()),416);self.assertTrue(np.all(after[ac_only]==0));self.assertTrue(np.all(current[ac_only]==42));np.testing.assert_array_equal(after[~ac_only],current[~ac_only])

 def test_replay_rejects_invalid_duplicate_transition_and_conflict_atomically(self):
  record=json.loads(RECORD.read_text(encoding='utf-8'));_,before=load(BEFORE);held=before.copy();bad_sets=[]
  bad_sets.append([dict(record['points'][0],after=42)]);bad=copy.deepcopy(record['points']);bad[1]['xyz']=bad[0]['xyz'];bad_sets.append(bad)
  for xyz in ([-1,0,0],[394,0,0],[1.5,0,0]):bad_sets.append([dict(record['points'][0],xyz=xyz)])
  for bad in bad_sets:
   with self.assertRaises(ValueError):replay(before,bad)
   np.testing.assert_array_equal(before,held)
  conflict=before.copy();conflict[tuple(record['points'][0]['xyz'])]=27;copy_conflict=conflict.copy()
  with self.assertRaisesRegex(ValueError,'label conflict'):replay(conflict,record['points'])
  np.testing.assert_array_equal(conflict,copy_conflict)

 def test_section_mesh_is_exact_deterministic_reconstruction(self):
  raw=gzip.decompress(AFTER.read_bytes());dims=np.frombuffer(raw,dtype='<u2',count=3,offset=4);labels=np.frombuffer(raw,np.uint8,offset=10).reshape(tuple(int(x) for x in dims[::-1]))
  payload,evidence=reconstruct(labels==43);stored=fixed_gzip(payload);mesh=ROOT/'public/atlas/section-current-septum-pellucidum-partial.mesh';meta=json.loads((ROOT/'tests/fixtures/section-current-septum-pellucidum-partial-pre-aqueduct-fourth44.json').read_text())
  self.assertEqual(stored,mesh.read_bytes());self.assertEqual(meta['sha256'],hashlib.sha256(stored).hexdigest());self.assertEqual(meta['rawSha256'],hashlib.sha256(payload).hexdigest())
  self.assertEqual((meta['voxels'],meta['components6'],meta['componentSizes']),(282,8,[181,71,12,7,5,3,2,1]));self.assertEqual(meta['sourceSha256'],CURRENT_SHA);self.assertEqual(meta['labelIds'],[43]);self.assertEqual((evidence['vertices'],evidence['faces']),(meta['vertices'],meta['faces']))

 def test_existing_section_meshes_and_all_specimen_blocks_are_unchanged(self):
  record=json.loads(RECORD.read_text(encoding='utf-8'));self.assertEqual(record['sectionMeshImpact']['changedFiles'],[])
  self.assertEqual(len(record['meshImpact']['blockMaskImpact']),55);self.assertFalse(record['meshImpact']['installationBlocked']);self.assertFalse(any(r['changedMaskVoxels'] for r in record['meshImpact']['blockMaskImpact']))
  for name in ('aqueduct-partial','internal-capsule','brainstem','cerebellum'):
   old=json.loads((ROOT/f'tests/fixtures/section-current-{name}-pre-septal-membrane282.json').read_text());after=json.loads((ROOT/f'tests/fixtures/section-current-{name}-pre-anterior-commissure-core416.json').read_text());current=json.loads((ROOT/f'tests/fixtures/section-current-{name}-pre-aqueduct-fourth44.json').read_text())
   self.assertEqual(old['sourceSha256'],BASE_SHA);self.assertEqual(after['sourceSha256'],AFTER_SHA);self.assertEqual(current['sourceSha256'],CURRENT_SHA)
   for key in set(old)|set(after)|set(current):
    if key!='sourceSha256':self.assertEqual((old.get(key),after.get(key)),(after.get(key),current.get(key)),f'{name}:{key}')
   mesh_path=ROOT/f'tests/fixtures/section-current-{name}-pre-aqueduct-fourth44.mesh'
   if name=='cerebellum':mesh_path=ROOT/'tests/fixtures/section-current-cerebellum-pre-cerebellar-margins90.mesh'
   if name=='internal-capsule':mesh_path=ROOT/'tests/fixtures/section-current-internal-capsule-pre-anterior-commissure185.mesh'
   self.assertEqual(digest(mesh_path if mesh_path.exists() else ROOT/f'public/atlas/section-current-{name}.mesh'),current['sha256'])

 def test_validation_records_successor_and_current_id43_count(self):
  meta=json.loads((ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500-validation.json').read_text(encoding='utf-8'));audit=meta['regionalBatchAudits']['septal-membrane282']
  _,labels=load(CURRENT);self.assertEqual(int(np.count_nonzero(labels==43)),282);self.assertEqual(int(np.count_nonzero(labels==42)),416)
  self.assertEqual(audit['record'],'segmentation-patches/review/septal-membrane282-adoption-2026-09-16.json');self.assertEqual(audit['recordSha256'],digest(RECORD));self.assertEqual(audit['changedVoxelCount'],282);self.assertTrue(audit['projectAdopted']);self.assertFalse(audit['expertReviewed'])
if __name__=='__main__':unittest.main()
