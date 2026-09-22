"""Read-only CMA landmark review in native40; never generates optic labels.

Uses the existing verified transform chain to locate current labels. Their
extremes are navigation aids, not ground truth for an anatomical boundary.
"""
import argparse
import gzip
import hashlib
import html
import json
from pathlib import Path
import struct

import h5py
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_erosion

from audit_native_roi_transform import checked, load_linear, load_native_grid, GRID_SHA, LIN_SHA, NL_SHA
from review_bigbrain_grid_transform import load_published_grids, GRID_SHAS, XFM_SHA
from render_trigeminal_native100_review import native_points
from render_fornix_native100_connection import sample_native_labels
from build_orthogonal_review_bundle import read_browser_volume, DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA = '18aec7b69b59ab5e3dc578885accbae2d86f86a7bbc6cba5dd2a07dbd4712f65'
LABEL_SHA = '5211664518129297bbf78d1d536004e540e721615a88007ecf1459d18fb97a96'


def gray(raw):
    # Display window only. No intensity threshold is used to classify tissue.
    return 255 - np.rint(np.clip(raw.astype(float) / 40000, 0, 1) * 255).astype('u1')


def write_app_context(out, report):
    """Place the measured current-label endpoint in whole registered sections."""
    _, _, volume = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    anchor = report['labels']['25']['extremePointsForNavigationOnly'][0]['appXYZ']
    x, y, z = anchor
    views = [(volume[:, y, :].T[::-1], x, 377-z, f'Coronal app Y{y}'),
             (volume[x, :, :].T[::-1], y, 377-z, f'Sagittal app X{x}')]
    page = Image.new('RGB', (1740, 805), 'white')
    draw = ImageDraw.Draw(page)
    draw.text((8, 8), f'WHOLE REGISTERED SECTIONS | red circle = current third-ventricle label anterior endpoint {anchor}', fill='black')
    draw.text((8, 24), 'Location only, not the boundary of the optic chiasm; native40 views use different axes and indices.', fill='black')
    offset = 0
    for plane, cx, cy, title in views:
        im = Image.fromarray(plane).convert('RGB').resize((plane.shape[1]*2, plane.shape[0]*2), Image.Resampling.NEAREST)
        d = ImageDraw.Draw(im)
        d.ellipse((cx*2-25, cy*2-25, cx*2+25, cy*2+25), outline=(220, 50, 30), width=3)
        page.paste(im, (offset, 49))
        draw.text((offset+8, 790), title, fill='black')
        offset += im.width+12
    path = out / 'app-whole-context.png'
    page.save(path)
    report['appContext'] = dict(file=path.name, sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                                imageSha256=EXPECTED_IMAGE_SHA256, endpointAppXYZ=anchor,
                                meaning='Current label endpoint for navigation only; not an optic boundary')


def write_review_board(out, report):
    """Local, source-linked review board; deliberately not a learner atlas."""
    items = {f['file']: f for f in report['figures']}
    # Check the actual images before linking them in the board.
    for name, item in items.items():
        checked(out / name, item['sha256'])
    checked(out / report['appContext']['file'], report['appContext']['sha256'])
    gallery = []
    for prefix, title in [('posterior-', '後方：左右へ分かれる付近'),
                          ('landmark-', '前方：第三脳室ラベル終端の付近'),
                          ('horizontal-', '水平断で前後関係を確認'),
                          ('sagittal-', '矢状断で付着部を確認')]:
        first = {'posterior-': 'posterior-y235.png', 'landmark-': 'landmark-y300.png',
                 'horizontal-': 'horizontal-z300.png', 'sagittal-': 'sagittal-x575.png'}[prefix]
        options = ''.join(f'<option value="{html.escape(name)}"' + (' selected' if name == first else '')
                          + f'>{html.escape(item["caption"])}</option>'
                          for name, item in items.items() if name.startswith(prefix))
        gallery.append(f'<section><h2>{title}</h2><label>断面を選択 <select>{options}</select></label>'
                       f'<a href="{first}" target="_blank"><img src="{first}" alt="{title}の原画像"></a></section>')
    document = '''<!doctype html><html lang="ja"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>視交叉の境界目印 — 9月19日</title>
<style>body{margin:0;background:#f6f4ef;color:#253438;font:16px/1.65 system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:24px}h1{font-size:1.6rem}h2{font-size:1.15rem}p{max-width:80ch}section,aside{background:white;border:1px solid #d2d9d7;border-radius:10px;padding:16px;min-width:0}img{max-width:100%;height:auto;display:block;margin:auto}select{display:block;width:100%;font:inherit;padding:6px;margin:8px 0 16px}a{color:#166c72}.context{display:grid;grid-template-columns:minmax(240px,1fr) minmax(300px,2fr);gap:18px;align-items:start}.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:18px}.note{border-left:5px solid #a77120;padding:8px 16px;background:#fff8e9}.context img{max-height:660px;object-fit:contain}footer{font-size:.9rem;margin-top:20px}@media(max-width:850px){.context,.gallery{grid-template-columns:1fr}main{padding:12px}}</style>
<main><h1>視交叉・近位視索：境界を決める目印の確認</h1>
<p class="note">AIによる原画像レビュー資料です。新しい分節の採用、専門家確認、完成した視覚路の表示ではありません。画像をクリックすると元の大きさで開きます。</p>
<section><h2>脳全体の中ではこの位置</h2><a href="app-whole-context.png" target="_blank"><img src="app-whole-context.png" alt="全体冠状断と矢状断。赤丸は第三脳室の現行ラベル前端で、視交叉の輪郭ではない"></a><p>赤丸は第三脳室の現行ラベル前端の位置案内です。以下の40 µm拡大図とは座標系・断面の向きが異なり、同一の切断面ではありません。</p></section>
<div class="context"><aside><h2>まず全体の位置</h2><img src="whole-y300.png" alt="視床下部を含むnative40 ROI全体と赤い拡大範囲"><p>Y300のROI全体。赤枠は前方比較図の範囲です。全脳ではありません。</p></aside>
<section><h2>今回わかったこと</h2>
<p><strong>前方：</strong>第三脳室の現行ラベル前端はnative40のY約300に位置します。これは既存ラベルの端であり、真の解剖学的前端を確定する目印ではありません。Y290–310付近では組織の付着・離開も変わるため、原画像上の終板／視床下部との関係を優先します。</p>
<p><strong>後方：</strong>Y220–245には中央の欠け・細い連続と、左右に分かれる形が混在します。連結の有無だけで「ここから視索」とは決めず、この帯で名称移行面と組織外縁を別々に比較します。</p>
<p><strong>次に決める一点：</strong>後方のY220–245帯において、残存組織の外縁を確認した上で、どの冠状面を視交叉／視索の名称移行面とするか。原画像の欠けは埋めず、左右を旧ID33の座標分割で作りません。</p>
<p>座標はこの40 µm ROIの0始まりindexです。アプリの0.5 mm座標とは異なります。白い背景は表示反転によるもので、すべて脳室ではありません。</p>
<p>前方比較図の左＝原画像、右＝現行ラベル輪郭。桃色＝第三脳室、橙色＝前交連（部分）。視交叉・視索の候補輪郭ではありません。</p>
<p><a href="report.json">入力SHA・変換・全図の目録</a></p></section></div>
<div class="gallery">GALLERY</div>
<footer>規約の比較資料：<a href="https://cma.mgh.harvard.edu/wp-content/uploads/2023/04/HOA-Subcortical-Brain-Structure-Segmentation-Manual.pdf">MGH CMA manual, PDF p.68</a>、<a href="https://cancerdata.org/tutorial/eptn-neuro-atlas-video-optic-tract/">EPTN / INCA optic tract</a>。MRIの信号閾値や距離をBigBrainへ転用していません。BigBrain画像の出典・利用条件はリポジトリのDATA_AND_LICENSES.mdを参照。ローカル検討用。</footer></main>
<script>document.querySelectorAll('select').forEach(s=>s.addEventListener('change',()=>{const a=s.parentElement.nextElementSibling;a.href=s.value;a.querySelector('img').src=s.value;}));</script></html>'''
    (out / 'index.html').write_text(document.replace('GALLERY', ''.join(gallery)), encoding='utf-8')


def main(out):
    if out.exists():
        raise ValueError('Preserve existing evidence; choose a new output directory')
    source = checked(ROOT / 'work/hypothalamus_full_40um.mnc', SOURCE_SHA)
    label_path = checked(ROOT / 'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz', LABEL_SHA)
    raw = gzip.decompress(label_path.read_bytes())
    if raw[:4] != b'BBS1' or struct.unpack_from('<3H', raw, 4) != (394, 466, 378):
        raise ValueError('Unexpected label format')
    labels = np.frombuffer(raw, np.uint8, offset=10).reshape((394, 466, 378), order='F')
    affine_path = ROOT / 'public/atlas/bigbrain-icbm500-validation.json'
    affine = np.array(json.loads(affine_path.read_text())['affine'])
    expected_affine = np.diag([.5, .5, .5, 1.])
    expected_affine[:3, 3] = [-98, -134, -72]
    if not np.array_equal(affine, expected_affine):
        raise ValueError('Scientific affine changed; do not use display coordinates')
    linear, native_grid = load_linear(), load_native_grid()
    grids = load_published_grids('catmull-rom')
    out.mkdir(parents=True, exist_ok=False)
    report = {
        'purpose': 'Landmark and field-of-view review; no inferred optic boundary or new mask',
        'sourceSha256': SOURCE_SHA, 'labelSha256': LABEL_SHA,
        'affineSha256': hashlib.sha256(affine_path.read_bytes()).hexdigest(),
        'transforms': {'linear': LIN_SHA, 'nativeGrid': GRID_SHA, 'nativeNonlinear': NL_SHA,
                       'improved': XFM_SHA, 'grids': GRID_SHAS},
        'displayInverseWindow': [0, 40000], 'labelsWritten': False,
        'labels': {}, 'figures': [],
    }

    def save(im, name, caption, **metadata):
        page = Image.new('RGB', (max(im.width, 700), im.height + 45), 'white')
        page.paste(im, (0, 45))
        ImageDraw.Draw(page).text((8, 8), caption, fill='black')
        path = out / (name + '.png')
        page.save(path)
        report['figures'].append(dict(file=path.name, caption=caption,
            sha256=hashlib.sha256(path.read_bytes()).hexdigest(), **metadata))

    with h5py.File(source) as f:
        group = f['minc-2.0']
        data = group['image/0/image']
        dims = group['dimensions']
        start = np.array([dims[a + 'space'].attrs['start'] for a in 'xyz'])
        step = np.array([dims[a + 'space'].attrs['step'] for a in 'xyz'])
        if data.shape != (439, 976, 1185) or data.attrs['dimorder'] != b'yspace,zspace,xspace':
            raise ValueError('Unexpected native40 axes')
        if not np.allclose(start, [-23.0666, 6.37, -29.3777], atol=1e-9, rtol=0) or not np.array_equal(step, [.04]*3):
            raise ValueError('Unexpected native40 grid')
        for k, a in enumerate('xyz'):
            if not np.array_equal(dims[a + 'space'].attrs.get('direction_cosines', np.eye(3)[k]), np.eye(3)[k]):
                raise ValueError('Unexpected direction cosines')
        shape = np.array(data.shape)[[2, 0, 1]]
        report.update(native40StartMm=start.tolist(), native40StepMm=step.tolist(),
                      native40ShapeXYZ=shape.tolist(), native40LastVoxelMm=(start+(shape-1)*step).tolist())
        for label in (25, 33, 42, 46):
            xyz = np.argwhere(labels == label)
            world, error = native_points(xyz @ affine[:3, :3].T + affine[:3, 3], grids, native_grid, linear)
            indices = (world-start)/step
            inside = ((indices >= 0) & (indices <= shape-1)).all(1)
            np.savez_compressed(out / f'label-{label}-native40-coordinates.npz',
                                appXYZ=xyz, nativeWorld=world, native40Index=indices)
            extremes = []
            for name, i in [('anterior', world[:, 1].argmax()), ('posterior', world[:, 1].argmin())]:
                extremes.append(dict(extreme=name, appXYZ=xyz[i].tolist(), nativeMm=world[i].tolist(),
                                     native40Index=indices[i].tolist()))
            report['labels'][str(label)] = dict(count=len(xyz), withinNative40ROI=int(inside.sum()),
                outside=int((~inside).sum()), nativeMmMin=world.min(0).tolist(), nativeMmMax=world.max(0).tolist(),
                maxRoundtripErrorMm=float(error.max()), extremePointsForNavigationOnly=extremes)

        full = Image.fromarray(gray(data[300, :, :][::-1])).convert('RGB')
        ImageDraw.Draw(full).rectangle((330, 326, 849, 865), outline='red', width=3)
        save(full, 'whole-y300', 'Whole native40 ROI, Y300; red: comparison crop X330..849, Z110..649', axis='y', index=300)
        for y in (280, 290, 300, 310, 320, 340):
            rgb = np.repeat(gray(data[y, 110:650, 330:850][::-1])[:, :, None], 3, 2)
            xx, zz = np.meshgrid(np.arange(330, 850), np.arange(649, 109, -1))
            q = np.c_[xx.ravel(), np.full(xx.size, y), zz.ravel()]
            lab = sample_native_labels(labels, q, start, step, linear, native_grid, grids, affine).reshape(rgb.shape[:2])
            overlay = rgb.copy()
            for lid, color in [(25, [230, 50, 160]), (42, [220, 140, 0])]:
                m = lab == lid
                overlay[m & ~binary_erosion(m)] = color
            pair = Image.new('RGB', (1050, 540), 'white')
            pair.paste(Image.fromarray(rgb), (0, 0))
            pair.paste(Image.fromarray(overlay), (530, 0))
            save(pair, f'landmark-y{y}', f'Y{y} = {start[1]+y*.04:.2f} mm | RAW / current 25 (magenta), 42 (orange)',
                 axis='y', index=y, cropXZ=[330, 849, 110, 649], currentThirdProjectedPixels=int((lab == 25).sum()))
        for z in (180, 220, 260, 300, 340):
            save(Image.fromarray(gray(data[:, z, 250:950][::-1])), f'horizontal-z{z}',
                 f'Z{z}; top anterior Y438, bottom posterior Y0; X250..949', axis='z', index=z, cropXY=[250, 949, 0, 438])
        for x in (500, 575, 636, 700):
            save(Image.fromarray(gray(data[:, 100:650, x].T[::-1])), f'sagittal-x{x}',
                 f'X{x}; left posterior Y0, right anterior Y438; top Z649, bottom Z100', axis='x', index=x, cropYZ=[0, 438, 100, 649])
        for y in (80, 120, 160, 200, 210, 220, 225, 230, 235, 240, 245, 250):
            save(Image.fromarray(gray(data[y, 110:650, 250:950][::-1])), f'posterior-y{y}',
                 f'Y{y} = {start[1]+y*.04:.2f} mm; X250..949; top Z649, bottom Z110', axis='y', index=y, cropXZ=[250, 949, 110, 649])
    write_app_context(out, report)
    (out / 'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    write_review_board(out, report)
    print(json.dumps({'output': str(out), 'figures': len(report['figures']), 'labelsWritten': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True, help='New evidence directory; refuses overwrite')
    main(parser.parse_args().out.resolve())
