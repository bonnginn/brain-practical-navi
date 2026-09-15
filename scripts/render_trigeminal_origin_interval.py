"""Read-only extension of native100 V-origin review; no proposed nerve geometry."""
import sys,json,hashlib
from pathlib import Path
import h5py,numpy as np
from PIL import Image,ImageDraw
ROOT=Path.cwd();sys.path.insert(0,str(ROOT/'scripts'))
from read_native100_crop import read_crop
from render_native_mammillary_review import plane_indices
sha=lambda b:hashlib.sha256(b).hexdigest()
priorpath=ROOT/'work/anatomy-review/trigeminal-native100-window-v2/report.json'
prior=json.loads(priorpath.read_text())
out=ROOT/'work/anatomy-review/astra-trigeminal-interval-2026-09-14'
if out.exists():raise ValueError('Preserve evidence')
mesh=ROOT/'public/atlas/overlay-nerves-pontine.mesh'
assert sha(mesh.read_bytes())==prior['currentMeshSha256']
report=dict(priorReportSha256=sha(priorpath.read_bytes()),sourcePath=prior['sourcePath'],historicalSourceSha256=prior['sourceSha256'],fullSourceHashRechecked=False,meshSha256=prior['currentMeshSha256'],mutation=False,adopted=False,expertReviewed=False,markerMeaning='Historic schematic origin projected into each slice; NOT an observed nerve',points=[],figures=[])
out.mkdir()
with h5py.File(ROOT/prior['sourcePath'],'r') as f:
 for record in [p for p in prior['points'] if p['ring']==0]:
  region=record['modelId'];point=np.array(record['nativeXYZ']);center=np.rint(point).astype(int)
  old,_,_,_=read_crop(f['minc-2.0/image/0'],record['crop']['lowXYZ'],record['crop']['highExclusiveXYZ'])
  assert sha(old.tobytes())==record['decodedCropSha256']
  low=center-100;high=center+101
  raw,_,_,meta=read_crop(f['minc-2.0/image/0'],low,high)
  np.savez_compressed(out/f'model-{region}-raw.npz',decoded=raw,lowXYZ=low)
  report['points'].append(dict(modelId=region,centerXYZ=center.tolist(),nativeXYZ=point.tolist(),crop=meta,decodedSha256=sha(raw.tobytes()),oldCropVerified=True))
  crop=dict(min=[0,0,0],max=[200,200,200])
  for k,axis in enumerate('xyz'):
   sheet=Image.new('RGB',(1200,990),'#202020');d=ImageDraw.Draw(sheet)
   d.text((8,5),f'Model {region}: native100 {axis.upper()} continuous +/-0.5mm | 20mm field | raw, no nerve proposal',fill='white')
   planes=[]
   for j,delta in enumerate(range(-5,6)):
    idx=plane_indices(axis,100+delta,crop)
    vals=raw[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2])
    gray=np.rint(np.clip((vals-40000)/25535,0,1)*255).astype('uint8')
    im=Image.fromarray(gray).convert('RGB').resize((280,280),Image.Resampling.NEAREST)
    q=ImageDraw.Draw(im);a,b=[i for i in range(3) if i!=k]
    x=(point[a]-low[a]+.5)*280/201;y=(200-(point[b]-low[b])+.5)*280/201
    q.rectangle((x-3,y-3,x+3,y+3),outline='#ff0088')
    px=(j%4)*300;py=35+(j//4)*315
    d.text((px+4,py),f'{axis.upper()}={center[k]+delta}'+(' (prior)' if abs(delta)<=1 else ' (added)'),fill='white');sheet.paste(im,(px+4,py+20))
    planes.append(dict(index=int(center[k]+delta),sha256=sha(vals.tobytes()),previouslyShown=abs(delta)<=1))
   target=out/f'model-{region}-{axis}-series.png';sheet.save(target)
   report['figures'].append(dict(path=target.name,sha256=sha(target.read_bytes()),axis=axis,modelId=region,planes=planes))
  # Exact middle coronal: wide position + unmarked raw + historic point overlay.
  idx=plane_indices('y',100,crop);v=raw[tuple(idx.reshape(-1,3).T)].reshape(idx.shape[:2]);im=Image.fromarray(np.rint(np.clip((v-40000)/25535,0,1)*255).astype('uint8')).convert('RGB').resize((402,402),Image.Resampling.NEAREST)
  pair=Image.new('RGB',(824,460),'#202020');d=ImageDraw.Draw(pair);d.text((8,5),f'Model {region} | Native Y={center[1]} | RAW left / historic model origin right',fill='white');d.text((8,22),'20mm field; magenta is not a proposed root; no new nerve boundary adopted.',fill='white');pair.paste(im,(5,50));marked=im.copy();dm=ImageDraw.Draw(marked);x=(point[0]-low[0]+.5)*2;y=(200-(point[2]-low[2])+.5)*2;dm.rectangle((x-5,y-5,x+5,y+5),outline='#ff0088',width=2);pair.paste(marked,(417,50));pair.save(out/f'model-{region}-comparison.png')
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(dict(output=str(out),figures=len(report['figures']),planes=66,addedPlanes=48,oldCropsVerified=2)))
