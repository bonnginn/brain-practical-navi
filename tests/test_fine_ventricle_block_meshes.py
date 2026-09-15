import hashlib, json, sys, tempfile, unittest, zipfile
from pathlib import Path
from unittest.mock import patch
import numpy as np
from scipy import ndimage

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
import build_specimen_blocks as blocks
FIXTURE=ROOT/'tests/fixtures/block-cavities-pre-fine-20260915.zip'
EXPECTED={('lateral-ventricle','ventricular-cavity'):82250,('commissural-system','lateral-ventricles'):116602,
 ('choroid-plexus','ventricular-cavity'):79373,('medial-temporal','inferior-horn'):4950}

def connected_mesh_components(faces,vertex_count):
 parent=np.arange(vertex_count)
 def find(x):
  while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
  return x
 def union(a,b):
  a,b=find(a),find(b)
  if a!=b:parent[b]=a
 for tri in faces:union(int(tri[0]),int(tri[1]));union(int(tri[1]),int(tri[2]))
 return len({find(i) for i in range(vertex_count)})

class FineVentricleBlockMeshes(unittest.TestCase):
 def test_public_and_generator_match_with_only_four_historical_changes(self):
  with zipfile.ZipFile(FIXTURE) as archive:old={Path(n).name:archive.read(n) for n in archive.namelist() if not n.endswith('/')}
  manifest=json.loads((blocks.ATLAS/'specimen-blocks.json').read_text(encoding='utf-8'))
  entries={(block,p['part']):p for block,parts in manifest['specimens'].items() for p in parts};self.assertEqual(len(entries),55)
  for key in EXPECTED:
   entry=entries[key];name=entry['file'];payload=(blocks.ATLAS/name).read_bytes()
   self.assertIn(name,old);self.assertNotEqual(payload,old[name]);self.assertIn('meshSha256',entry)
   self.assertEqual(hashlib.sha256(payload).hexdigest(),entry['meshSha256'])
   self.assertEqual(entry['geometrySamplingMm'],.5);self.assertEqual(entry['sampledVoxels'],EXPECTED[key])
   self.assertEqual(entry['occupancyPolicy'],'exact-label-no-fill-no-filter-no-smoothing')
  with tempfile.TemporaryDirectory() as folder:
   generated=Path(folder)/'generated'
   with patch.object(sys,'argv',['build_specimen_blocks.py','--output-dir',str(generated)]):blocks.main()
   candidate=json.loads((generated/'specimen-blocks.json').read_text(encoding='utf-8'))
   candidate_entries={(b,p['part']):p for b,ps in candidate['specimens'].items() for p in ps};self.assertEqual(candidate_entries,entries)
   for entry in entries.values():self.assertEqual((generated/entry['file']).read_bytes(),(blocks.ATLAS/entry['file']).read_bytes())

 def test_synthetic_thin_and_detached_occupancy_keeps_world_coordinates(self):
  mask=np.zeros((12,13,14),bool);mask[2,3,4:10]=True;mask[8:10,9:11,11:13]=True
  before=mask.copy();mesh=blocks.mesh_from_fine_cavity(mask);self.assertTrue(np.array_equal(mask,before))
  _,n=ndimage.label(mask,ndimage.generate_binary_structure(3,1));self.assertEqual(n,2)
  self.assertEqual(connected_mesh_components(mesh[3],len(mesh[0])),2)
  np.testing.assert_allclose(mesh[0].min(0),[-89.25,-114.75,-96.25]);np.testing.assert_allclose(mesh[0].max(0),[-85.25,-110.75,-91.75])

if __name__=='__main__':unittest.main()
