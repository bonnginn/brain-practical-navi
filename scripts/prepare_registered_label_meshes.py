"""Stage dependent meshes; refuse silently replacing non-reproducible parts."""
import sys,json,hashlib,struct,argparse
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import build_specimen_blocks as b
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
OUT=args.output.resolve()
if not OUT.is_relative_to(ROOT/'work'):raise ValueError('Work output only')
if OUT.exists():raise ValueError('New output required')
OUT.mkdir()
raw,_=b.read_volume(b.BIGBRAIN,b'BBV1');raw=raw[::2,::2,::2].copy()
from adopt_remaining_registered_labels import FIXTURE, BASE_SHA, FINAL_SHA
if hashlib.sha256(FIXTURE.read_bytes()).hexdigest()!=BASE_SHA:raise ValueError('Wrong mesh baseline')
REGISTERED=ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-brainstem-island-7ebe.bin.gz'
if hashlib.sha256(REGISTERED.read_bytes()).hexdigest()!=FINAL_SHA:raise ValueError('Wrong registration stage')
old,_=b.read_volume(FIXTURE,b'BBS1');old=old[::2,::2,::2]
new,_=b.read_volume(REGISTERED,b'BBS1');new=new[::2,::2,::2]
before=b.specimen_definitions(raw,old);after=b.specimen_definitions(raw,new)
def encode(mesh):
 v,n,s,f=mesh
 return b'BNM2'+struct.pack('<II',len(v),len(f))+v.tobytes()+n.tobytes()+s.tobytes()+f.tobytes()
sha=lambda x:hashlib.sha256(x).hexdigest()
entries=[]
manifest=ROOT/'segmentation-patches/review/registered-dependent-meshes-2026-09-06.json'
known={}
if manifest.exists():
 if sha(manifest.read_bytes())!='9f963ddc75101adaf23832a3af326e260bfaab06340b6c62ba145fb457225f24':raise ValueError('Changed mesh manifest')
 known={e['file']:e for e in json.loads(manifest.read_text(encoding='utf-8'))}

def baseline_sha(name,installed):
 if name not in known:return sha(installed)
 e=known[name]
 if sha(installed) not in (e['beforeSha256'],e['afterSha256']):raise ValueError('Independent mesh changes: '+name)
 return e['beforeSha256']
for block,parts in after.items():
 for a,z in zip(before[block],parts):
  assert a.key==z.key
  if np.array_equal(a.mask,z.mask):continue
  name=f'block-{block}-{z.key}.mesh'
  prior=encode(b.mesh_from_mask(a.mask,raw,a.material=='specimen'))
  installed=(b.ATLAS/name).read_bytes()
  mesh=b.mesh_from_mask(z.mask,raw,z.material=='specimen');encoded=encode(mesh)
  (OUT/name).write_bytes(encoded)
  entry=dict(file=name,block=block,part=z.key,beforeMatches=sha(prior)==baseline_sha(name,installed),beforeSha256=baseline_sha(name,installed),reproducedBeforeSha256=sha(prior),afterSha256=sha(encoded),vertices=len(mesh[0]),faces=len(mesh[3]),changedMaskVoxels=int(np.count_nonzero(a.mask!=z.mask)),source=z.source)
  entries.append(entry);print(json.dumps(entry),flush=True)
import build_section_structure_meshes as sections
name='section-accumbens.mesh'
prior=encode(sections.voxel_surface(np.isin(old,(19,20))))
mesh=sections.voxel_surface(np.isin(new,(19,20)));encoded=encode(mesh)
installed=(b.ATLAS/name).read_bytes()
(OUT/name).write_bytes(encoded)
entries.append(dict(file=name,block=None,part='accumbens',beforeMatches=sha(prior)==baseline_sha(name,installed),beforeSha256=baseline_sha(name,installed),reproducedBeforeSha256=sha(prior),afterSha256=sha(encoded),vertices=len(mesh[0]),faces=len(mesh[3])//3,legacyFaceIndexCountHeader=True,source='manual-segmentation'))
if not all(e['beforeMatches'] for e in entries):raise ValueError('Existing mesh has independent changes; do not install')
(OUT/'report.json').write_text(json.dumps(entries,indent=2)+'\n',encoding='utf-8')
