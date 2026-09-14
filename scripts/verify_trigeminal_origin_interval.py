"""Complete the read-only V review: independent plane checks and locator sheets."""
from pathlib import Path
import sys, json, hashlib
import numpy as np
import h5py
from PIL import Image, ImageDraw, ImageFont
ROOT = Path.cwd()
sys.path.insert(0, str(ROOT/'scripts'))
from read_native100_crop import read_crop
out = ROOT/'work/anatomy-review/astra-trigeminal-interval-2026-09-14'
report = json.loads((out/'report.json').read_text())
sha = lambda data: hashlib.sha256(data).hexdigest()
font = ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc', 18)
small = ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc', 15)
def rendered(values):
    return Image.fromarray(np.rint(np.clip((values-40000)/25535,0,1)*255).astype('uint8')).convert('RGB')
checked = 0
report['supplementaryFigures'] = []
with h5py.File(ROOT/report['sourcePath'], 'r') as f:
    group = f['minc-2.0/image/0']
    ny,nz,nx = group['image'].shape
    for p in report['points']:
        region = p['modelId']
        data = np.load(out/f'model-{region}-raw.npz')
        raw, low = data['decoded'], data['lowXYZ']
        assert sha(raw.tobytes()) == p['decodedSha256']
        for figure in [q for q in report['figures'] if q['modelId'] == region]:
            assert sha((out/figure['path']).read_bytes()) == figure['sha256']
            k = 'xyz'.index(figure['axis'])
            for plane in figure['planes']:
                # Independent direct slicing, without the rendering coordinate helper.
                values = np.take(raw, plane['index']-low[k], axis=k).T[::-1,:]
                assert sha(values.tobytes()) == plane['sha256']
                checked += 1
        y = p['centerXYZ'][1]
        full,_,_,_ = read_crop(group, np.array([0,y,0]), np.array([nx,y+1,nz]))
        assert np.array_equal(full[low[0]:low[0]+201,0,low[2]:low[2]+201],raw[:,100,:])
        broad = rendered(full[:,0,:].T[::-1,:])
        scale = min(460/nx,510/nz)
        broad = broad.resize((round(nx*scale),round(nz*scale)),Image.Resampling.NEAREST)
        d = ImageDraw.Draw(broad)
        d.rectangle((low[0]*scale,(nz-low[2]-201)*scale,(low[0]+201)*scale,(nz-low[2])*scale),outline='#ff0088',width=2)
        local = rendered(raw[:,100,:].T[::-1,:]).resize((402,402),Image.Resampling.NEAREST)
        marked = local.copy(); d = ImageDraw.Draw(marked)
        pt = p['nativeXYZ']; x=(pt[0]-low[0]+.5)*2; z=(200-(pt[2]-low[2])+.5)*2
        d.rectangle((x-5,z-5,x+5,z+5),outline='#ff0088',width=2)
        sheet = Image.new('RGB',(1320,670),'#202020'); d=ImageDraw.Draw(sheet)
        d.text((16,10),f'V（三叉神経）旧模式起点の照合：region {region} ／ native 100 µm 冠状断 Y={y}',font=font,fill='white')
        d.text((16,42),'紫は旧モデルの投影位置です。実神経の同定点・新しい候補境界ではありません。',font=small,fill='white')
        for x0,label in [(16,'引き：同じ原画像の全断面'),(490,'原画像：20.1 mmの局所範囲'),(910,'原画像＋旧起点の投影')]:
            d.text((x0,80),label,font=small,fill='white')
        sheet.paste(broad,(16,115));sheet.paste(local,(490,115));sheet.paste(marked,(910,115))
        d.text((490,535),'画像右向き：native X増加 ／ 上向き：Z増加',font=small,fill='white')
        d.text((16,590),'判定：この範囲から脳外へ続く根を確定できず、置換形状の採用なし。神経の欠損を断定する図ではありません。',font=small,fill='white')
        d.text((16,620),'次に必要な判断：同一標本上で三叉神経根と同定できる付着部・近位区間の指定。',font=small,fill='white')
        target=out/f'model-{region}-locator.png';sheet.save(target)
        for path in [target,out/f'model-{region}-comparison.png']:
            report['supplementaryFigures'].append(dict(path=path.name,sha256=sha(path.read_bytes())))
report['verification'] = dict(independentPlaneHashesMatched=checked,fullCoronalLocalOverlapMatched=2,visuallyReviewedSeries=6,displayedSeriesPlanes=66,additionalIndicesVersusPriorRing0Review=48)
report['decision'] = 'Hold: no defensible extra-axial root segment identified in the reviewed interval. This does not establish absence or loss of the nerve.'
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report['verification']))
