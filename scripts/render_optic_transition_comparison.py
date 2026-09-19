"""Show open visual edge guides and unresolved regions; never fill a mask."""
import argparse
import hashlib
import json
from urllib.parse import urlencode
from pathlib import Path

import h5py
import numpy as np
from PIL import Image, ImageDraw

from audit_native_roi_transform import checked, load_linear, load_native_grid
from review_bigbrain_grid_transform import load_published_grids, forward_chain
from render_optic_native40_landmarks import ROOT, gray


def main(out):
    if out.exists():
        raise ValueError('Preserve existing evidence')
    decision_path = ROOT/'segmentation-patches/review/optic-transition-guides-2026-09-19.json'
    decision = json.loads(decision_path.read_text(encoding='utf-8'))
    source = checked(ROOT/'work/hypothalamus_full_40um.mnc', decision['sourceSha256'])
    checked(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz', decision['labelSha256'])
    out.mkdir(parents=True)
    files = []
    for plane in decision['planes']:
        original = Image.open(checked(ROOT/plane['input'], plane['inputSha256'])).convert('RGB')
        annotated = original.copy()
        draw = ImageDraw.Draw(annotated)
        for line in plane['exposedEdgeGuidesPngXY']:
            draw.line([tuple(point) for point in line], fill=(0, 160, 110), width=3)
        for box in plane['unresolvedAttachmentBoxesPngXY']:
            draw.rectangle(box, outline=(225, 135, 15), width=2)
        draw.rectangle(plane['centralGapBoxPngXY'], outline=(210, 40, 60), width=2)
        pair = Image.new('RGB', (1412, 615), 'white')
        pair.paste(original, (0, 30)); pair.paste(annotated, (712, 30))
        ImageDraw.Draw(pair).text((8, 8), 'RAW / GUIDE: green = exposed tissue edge; orange = unresolved attachment; red = central gaps. NO MASK.', fill='black')
        name = f'comparison-y{plane["nativeY"]}.png'; pair.save(out/name); files.append(name)
    with h5py.File(source) as f:
        data = f['minc-2.0/image/0/image']
        for x in decision['additionalRawPlanes']['sagittalX']:
            im = Image.new('RGB', (700, 335), 'white')
            im.paste(Image.fromarray(gray(data[:, 200:500, x].T[::-1])), (0, 35))
            ImageDraw.Draw(im).text((8, 8), f'RAW X{x}; left Y0, right Y438; top Z499, bottom Z200', fill='black')
            name = f'sagittal-x{x}.png'; im.save(out/name); files.append(name)
        for z in decision['additionalRawPlanes']['horizontalZ']:
            im = Image.new('RGB', (700, 474), 'white')
            im.paste(Image.fromarray(gray(data[:, z, 250:950][::-1])), (0, 35))
            ImageDraw.Draw(im).text((8, 8), f'RAW Z{z}; top Y438, bottom Y0; X250..949', fill='black')
            name = f'horizontal-z{z}.png'; im.save(out/name); files.append(name)
    context = ROOT/'work/optic-landmark-review-20260919/app-whole-context.png'
    parent_report = json.loads((context.parent/'report.json').read_text())
    checked(context, parent_report['appContext']['sha256'])
    (out/context.name).write_bytes(context.read_bytes()); files.append(context.name)
    # Locate review-box centres, without treating them as anatomical landmarks.
    linear, grid = load_linear(), load_native_grid()
    grids = load_published_grids('catmull-rom')
    anchors = []
    for plane in decision['planes']:
        for side, box in zip(('画像左の付着部', '画像右の付着部'), plane['unresolvedAttachmentBoxesPngXY']):
            native_index = np.array([(box[0]+box[2])/2+250, plane['nativeY'], 694-(box[1]+box[3])/2])
            native_mm = native_index*.04+np.array([-23.0666,6.37,-29.3777])
            registered = forward_chain(grids, grid.forward((native_mm@linear[:,:3].T+linear[:,3])[None,:]))[0]
            app_float = (registered-np.array([-98,-134,-72]))/.5
            app_xyz = np.floor(app_float+.5).astype(int)
            links = {}
            for name, axis, size in [('coronal',1,466),('sagittal',0,394)]:
                query = urlencode(dict(v=1,revision=decision['labelSha256'],position=str(app_xyz[axis]/(size-1)*100),
                    visible='thirdVentricle,anteriorCommissurePartial',selected='thirdVentricle',layout='both',views=1,share=50))
                links[name] = '/#workspace/sections/'+name+'/observe?'+query
            anchors.append(dict(nativeY=plane['nativeY'],region=side,nativeIndex=native_index.tolist(),
                appFloatXYZ=app_float.tolist(),appNearestXYZ=app_xyz.tolist(),links=links))
    report = {'decisionSha256': hashlib.sha256(decision_path.read_bytes()).hexdigest(),
              'sourceSha256': decision['sourceSha256'], 'labelSha256': decision['labelSha256'],
              'labelsWritten': False, 'navigationOnlyBoxCenters': anchors,
              'files': {name: hashlib.sha256((out/name).read_bytes()).hexdigest() for name in files}}
    (out/'report.json').write_bytes((json.dumps(report, indent=2)+'\n').encode())
    images = ''.join(f'<h2>候補断面 Y{y}</h2><a href="comparison-y{y}.png" target="_blank"><img src="comparison-y{y}.png" alt="Y{y}の原画像と検討箇所"></a>' for y in (235, 240, 245))
    orthogonal = ''.join(f'<a href="{name}" target="_blank"><img src="{name}" alt="追加の直交原画像 {name}"></a>' for name in files if name.startswith(('sagittal-', 'horizontal-')))
    page = '''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>視交叉後方の3断面比較</title><style>body{font:16px/1.7 system-ui;background:#f6f4ef;color:#253438;margin:0}main{max-width:1440px;padding:20px;margin:auto}img{display:block;max-width:100%;height:auto;background:white;margin:15px auto}h1{font-size:1.6rem}h2{font-size:1.2rem}.note{border-left:5px solid #d88720;padding:12px;background:white}.orthogonal{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,400px),1fr));gap:12px}</style><main><h1>視交叉後方：外縁と名称の区切りを分ける</h1><p class="note">今回の結論：3断面とも、下面の露出した組織外縁は追えますが、視床下部との付着部と中央の欠けが残ります。どの断面も名称移行面として未採用です。緑の線は目視の位置案内で、厳密な分節輪郭ではありません。</p><a href="app-whole-context.png" target="_blank"><img src="app-whole-context.png" alt="全体位置案内。赤丸は第三脳室の現行ラベル前端"></a><p>以下はnative40のY235・240・245。左は原画像、右は検討箇所です。緑＝下面の外縁の一部、橙枠＝帰属をまだ決められない付着部、赤枠＝中央の欠け。枠は構造の境界ではなく、画像クリックで原寸表示できます。</p>IMAGES<h2>付着部を通る追加の直交断</h2><p>橙枠付近を通る矢状4面・水平1面を確認しました。名称面を選ぶ前に、この付着部の組織帰属を決める必要があります。中央がつながって見えることだけでは採用しません。新規ラベル・公開更新はありません。</p><div class="orthogonal">ORTHOGONAL</div></main></html>'''
    navigation = '<h2>アプリの該当断面へ</h2><p>検討枠の中心に近い0.5 mm断面を開きます。40 µm図と同じ切断面ではなく、枠・ズーム・カーソル位置は再現しません。第三脳室と前交連は位置の参考表示です。今回の枠中心ではnative Y235とY240が同じapp Y270へ丸められます。細かな差は40 µm原画像で比較してください。</p><ul>'
    for a in anchors:
        navigation += f'<li>native Y{a["nativeY"]}・{a["region"]} → app XYZ {a["appNearestXYZ"]}：<a href="{a["links"]["coronal"]}" target="_blank">冠状断</a> / <a href="{a["links"]["sagittal"]}" target="_blank">矢状断</a></li>'
    navigation += '</ul>'
    (out/'index.html').write_text(page.replace('IMAGES', navigation+images).replace('ORTHOGONAL', orthogonal), encoding='utf-8')
    print(f'Saved {len(files)} figures and local comparison page; no labels written')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    main(parser.parse_args().out.resolve())
