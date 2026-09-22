#!/usr/bin/env python3
"""Captioned surface/serial-section films from unchanged repository assets.

Software AGPL-3.0-or-later; authored teaching material CC BY-NC-SA 4.0.
Source-specific notices are bundled. Run with the project Python environment.
"""
import argparse, hashlib, html, json, math, shutil, struct, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from render_papez_video import ROOT, BG, FG, TEAL, RED, text, block, wrap, load_volume, section, imageio_ffmpeg

OUT=ROOT/'work/observation-videos'
W,H,FPS=1280,720,20
SURFACE=[
 ('脳表の目印：中心溝の前と後','左大脳半球を外側から見ます。まず前・後・上・下の向きを確かめましょう。','左半球の外側面\n前方 ← → 後方\n上方 ↑',0),
 ('中心前回と中心後回を並べる','赤い中心前回と、青緑の中心後回。その間を走る溝が中心溝です。','赤：中心前回\n青緑：中心後回\n間の溝：中心溝',3),
 ('中心前回：運動を送り出す皮質','中心前回には一次運動野があり、主に反対側の身体の随意運動に関わります。','中心前回\n前頭葉側\n一次運動野を含む',1),
 ('中心後回：身体の感覚を受け取る皮質','中心後回には一次体性感覚野があり、主に反対側の身体の触覚などを処理します。','中心後回\n頭頂葉側\n一次体性感覚野を含む',2),
 ('脳回の名前と機能領域を区別する','着色は脳回のアトラス区分です。一次運動野・一次体性感覚野の厳密な境界ではありません。','形の区分：脳回\n機能・細胞構築の区分：皮質領野\n境界は必ずしも一致しない',3),
 ('色を外して、見つけてみよう','一時停止して、中心前回と中心後回を指してみましょう。前頭葉側はどちらでしょうか？','一時停止して考える\n中心前回はどこ？\n中心後回はどこ？',0),
 ('答え合わせと、観察の続き','前頭葉側が中心前回、頭頂葉側が中心後回。実物では溝の形に個人差があります。','赤：中心前回\n青緑：中心後回\n全体の向きと併せて覚える',3),
]
SURFACE.append(('出典と、次の観察へ','アプリの脳表観察でも、全体の向きから中心溝と二つの脳回を探してみましょう。','',0))
SECTIONS=[
 ('冠状断を読む：脳室を目印にする','前から後ろへ向かって冠状断を動かします。左右・上下と、切っている位置を確認しましょう。','冠状断\n画面左 L / 画面右 R\n上 S / 下 I',[],True),
 ('左右にある側脳室','青緑は左右の側脳室です。断面を少しずらすだけでも、見える形や大きさが変わります。','側脳室：青緑\n左右に一つずつ\n形は断面位置によって変化',[23,24],True),
 ('正中の第三脳室','黄色は第三脳室。左右の側脳室とは別に、正中の細い腔として探します。','第三脳室：黄\n正中を探す\n側脳室：青緑',[23,24,25],False),
 ('第三脳室の左右に視床','赤い領域は視床です。この断面で、第三脳室と視床の位置関係を確かめましょう。','視床：赤\n第三脳室：黄\n視床全体の着色',[15,16,25],False),
 ('同じ構造を、隣の断面でも追う','一枚の形だけで決めず、前後の断面へ続く様子を見ます。断面位置は右の位置図に示します。','前 → 後へ移動\n視床：赤\n脳室：青緑・黄',[15,16,23,24,25],True),
 ('色を外して、位置を説明してみよう','一時停止して、側脳室・第三脳室・視床を探してみましょう。視床は第三脳室のどちら側ですか？','一時停止して考える\n三つの構造を探す\n互いの位置を説明する',[],False),
 ('答え合わせ','視床は第三脳室の左右に位置します。脳室を目印にすると、深部構造の位置を捉えやすくなります。','側脳室：青緑\n第三脳室：黄\n視床：赤',[15,16,23,24,25],False),
]

SECTIONS.append(('出典と、次の観察へ','アプリの連続断面でも、隣り合う断面を動かしながら構造の位置を確かめてみましょう。','',[],False))

def surface_images():
    """Orthographic left-lateral rendering, triangle painter at 2x resolution.

    Stored axes are z,y,x; anatomical y is anterior-positive and z superior.
    Far-to-near is decreasing anatomical x for the left lateral view.
    """
    b=(ROOT/'public/atlas/pial-left.mesh').read_bytes()
    assert b[:4]==b'BNM3'
    n,nf=struct.unpack_from('<II',b,4)
    v=np.frombuffer(b,'<f4',n*3,12).reshape(-1,3)[:,[2,1,0]]
    normal=np.frombuffer(b,'<f4',n*3,12+n*12).reshape(-1,3)[:,[2,1,0]]
    shade=np.frombuffer(b,'<f4',n,12+n*24)
    region=np.frombuffer(b,'<f4',n,12+n*28).round().astype(int)
    faces=np.frombuffer(b,'<u4',nf*3,12+n*32).reshape(-1,3)
    xy=np.column_stack([-v[:,1],-v[:,2]])
    xy-=xy.min(axis=0);scale=min(1400/np.ptp(xy[:,0]),850/np.ptp(xy[:,1]));xy=xy*scale+[50,60]
    depth=v[faces,0].mean(axis=1);order=np.argsort(depth)[::-1]
    light=np.clip(.55+.35*(-normal[:,0])+.18*normal[:,2],.2,1)*np.clip(shade,.35,1)
    light=light[faces].mean(axis=1)
    # A majority label avoids assigning a whole face from one isolated vertex.
    regs=region[faces];labels=np.where((regs[:,0]==regs[:,1])|(regs[:,0]==regs[:,2]),regs[:,0],regs[:,1])
    result={}
    for mode in range(4):
        im=Image.new('RGB',(1500,980),BG);d=ImageDraw.Draw(im)
        colors=np.tile([207,202,182],(nf,1)).astype(float)
        if mode in (1,3):colors[labels==86]=[255,119,112]
        if mode in (2,3):colors[labels==64]=[104,217,197]
        colors=np.clip(colors*light[:,None],0,255).astype(np.uint8)
        for j in order:d.polygon([tuple(p) for p in xy[faces[j]]],fill=tuple(colors[j]))
        result[mode]=im.resize((780,510),Image.Resampling.LANCZOS)
    return result

def raw_rgb(r):
    v=r.astype(float);rgb=np.stack((47+v*.81,40+v*.75,32+v*.66),axis=-1)
    rgb[r>=252]=(16,42,48)
    return rgb

def section_image(raw,seg,p,ids):
    r=section(raw,'coronal',p);s=section(seg,'coronal',p);rgb=raw_rgb(r)
    for group,color in [([23,24],[104,217,197]),([25],[249,209,100]),([15,16],[255,119,112])]:
        mask=np.isin(s,[i for i in group if i in ids]);rgb[mask]=rgb[mask]*.23+np.array(color)*.77
    im=Image.fromarray(np.clip(rgb,0,255).astype('uint8'))
    im=im.resize((530,508),Image.Resampling.LANCZOS)
    return im

def make_frame(kind,index,t,assets):
    scenes=SURFACE if kind=='surface' else SECTIONS
    title,caption,notes,*rest=scenes[index]
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
    text(d,(40,22),'脳実習ナビ  /  脳表観察' if kind=='surface' else '脳実習ナビ  /  連続断面',18,TEAL)
    text(d,(40,62),title,34,bold=True)
    if index==7:
        lines=(['表面：MNI152 / Louis Collins, McGill University（MNI licence）',
                '配布：BigBrainWarp — Paquola et al. / doi:10.7554/eLife.70119',
                '領域：CerebrA — Manera et al. / doi:10.1038/s41597-020-0557-9',
                '加工：既存の拡張表面を投影・陰影・脳回着色',
                '解説：White et al. (1997), doi:10.1093/cercor/7.1.18',
                'Purves et al., Neuroscience — Primary Motor Cortex'] if kind=='surface' else
               ['原画像：BigBrain — Amunts, Zilles, Evans et al. (2013)',
                'doi:10.1126/science.1235381 / CC BY-NC-SA 4.0',
                '視床ラベル：Yiming Xiao and collaborators / McGill / CC BY 4.0',
                '脳室：本プロジェクトで改訂した既存分節',
                '加工：0.5 mm派生画像から断面抽出・色調整・着色・拡大',
                '画像・分節は今回の制作に伴って変更していません。'])
        for j,line in enumerate(lines):text(d,(50,163+j*49),line,23)
        text(d,(50,491),'動画・構成・字幕：© 2026 脳実習ナビ contributors / CC BY-NC-SA 4.0',23,TEAL)
        text(d,(50,544),'教育用・専門家未監修。出典の詳細と原noticeは付属ページに掲載。',22)
        text(d,(50,580),'診断・治療・手術計画・定量研究には使用できません。',21)
    elif kind=='surface':
        view=assets[rest[0]]
        if index>0 and t<.7:view=Image.blend(assets[SURFACE[index-1][3]],view,t/.7)
        im.paste(view,(25,117))
        text(d,(70,145),'前 A',22,TEAL);text(d,(685,145),'後 P',22,TEAL);text(d,(365,116),'上 S',20,TEAL)
        block(d,(855,200),notes,27,370,gap=22)
        block(d,(855,490),'MNI表面モデル\nCerebrA由来の脳回区分',18,370,fill='#abc1c3')
    else:
        raw,seg,sag=assets;ids,sweep=rest
        p=.60-.16*min(t/8,1) if sweep else .51
        im.paste(section_image(raw,seg,p,ids),(120,120))
        for xy,value in [((85,350),'L'),((670,350),'R'),((380,112),'S'),((380,605),'I')]:text(d,xy,value,22,TEAL)
        im.paste(sag,(885,125));x=885+round(p*(sag.width-1))
        # Sagittal source is displayed with posterior left / anterior right.
        d.line([(x,125),(x,125+sag.height)],fill=RED,width=3)
        text(d,(885,108),'後 P',16,TEAL);text(d,(1080,108),'前 A',16,TEAL)
        text(d,(855,323),'正中矢状断：赤線が切断位置',18,TEAL)
        block(d,(855,368),notes,25,380,gap=12)
        text(d,(855,571),f'冠状断  Y = {round(p*(raw.shape[1]-1))}',19,'#abc1c3')
    d.rectangle((0,642,W,H),fill='#091d23')
    lines=wrap(caption,26,1180)
    assert len(lines)<=2
    for j,line in enumerate(lines):text(d,(45,652+31*j),line,26)
    d.rectangle((0,716,int(W*(index*9+t)/72),719),fill=TEAL)
    return im

def package(kind,scenes,out):
    title='中心溝の前と後' if kind=='surface' else '脳室を目印に冠状断を読む'
    links=[('https://pubmed.ncbi.nlm.nih.gov/9023429/','White et al. (1997), 中心溝の形態・細胞構築'),('https://www.ncbi.nlm.nih.gov/books/NBK11095/','Purves et al., Neuroscience: Primary Motor Cortex')]
    if kind=='sections':links=[('https://bigbrainproject.org/','Amunts et al. (2013), BigBrain'),('https://nist.mni.mcgill.ca/multi-contrast-pd25-atlas/','Xiao et al., BigBrain co-registration / manual labels')]
    names=['LICENSE.txt'] if kind=='surface' else ['BIGBRAIN-DATA-LICENSE.txt','BIGBRAIN-MANUAL-LICENSE.txt']
    for name in names:shutil.copyfile(ROOT/'public/atlas'/name,out/name)
    source=('表面：MNI152高密度白質表面（BigBrainWarp配布）を法線方向へ拡張した既存モデル。脳回区分：CerebrA（Manera et al., 2020）。MNI licence、Louis Collins / McGill University。左外側面へ投影し、陰影・着色を加えた教育用表示。BigBrainの組織標本ではありません。' if kind=='surface' else '原画像：BigBrain（Amunts, Zilles, Evans et al., 2013）、CC BY-NC-SA 4.0。視床手動ラベル：Yiming Xiao and collaborators / McGill、CC BY 4.0。脳室は本プロジェクトの既存改訂ラベル。0.5 mm派生画像から断面抽出、色調整、着色、拡大。')
    if kind=='surface':links += [('https://doi.org/10.7554/eLife.70119','Paquola et al., BigBrainWarp'),('https://doi.org/10.1038/s41597-020-0557-9','Manera et al., CerebrA')]
    chapters=''.join(f'<button data-time="{i*9}">{i*9//60}:{i*9%60:02} {html.escape(s[0])}</button>' for i,s in enumerate(scenes))
    refs=''.join(f'<li><a href="{u}">{n}</a></li>' for u,n in links)+''.join(f'<li><a href="{n}">{n}</a></li>' for n in names)
    transcript=''.join(f'<h3>{html.escape(s[0])}</h3><p>{html.escape(s[1])}</p>' for s in scenes)
    page=f'''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} | 脳実習ナビ</title><style>body{{margin:0;background:#102a30;color:#f3f2e9;font:16px/1.8 system-ui}}main{{max-width:1180px;margin:auto;padding:24px}}video{{width:100%;background:#091d23}}a{{color:#83d0bd}}nav{{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}}button{{font:inherit;color:inherit;background:#284c49;border:1px solid #638880;border-radius:6px;padding:8px 12px;cursor:pointer}}details{{padding:16px 0;border-top:1px solid #507176}}</style><main><a href="../">動画一覧</a><h1>{title}</h1><p>1分12秒・日本語字幕・音声なし。教育用の試作動画です。</p><video controls playsinline preload="metadata" poster="proof-01.jpg"><source src="{kind}-ja.mp4" type="video/mp4"><track kind="captions" src="captions-ja.vtt" srclang="ja" label="日本語"></video><nav>{chapters}</nav><p><a href="{kind}-ja.mp4" download>MP4を保存</a> · <a href="{kind}-package.zip" download>出典・字幕込みZIP</a> · <a href="storyboard.jpg">場面一覧</a></p><details><summary>字幕を読む</summary>{transcript}</details><details><summary>出典・加工・利用条件</summary><p>{source}</p><ul>{refs}</ul><p>動画・構成・字幕：© 2026 脳実習ナビ contributors / CC BY-NC-SA 4.0。元資料の図や文章の転載はありません。再配布時は出典・原noticeを併せてください。提供元の推奨・承認を意味しません。教育用、専門家未監修。臨床・定量研究には使用できません。</p><a href="inputs.json">使用ファイルのSHA-256</a></details></main><script>const v=document.querySelector('video');document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{{v.currentTime=Number(b.dataset.time);v.play();}});</script></html>'''
    (out/'index.html').write_text(page,encoding='utf-8')
    def stamp(s):return f'00:{s//60:02}:{s%60:02}.000'
    (out/'captions-ja.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{stamp(i*9)} --> {stamp((i+1)*9)}\n{s[1]}' for i,s in enumerate(scenes))+'\n',encoding='utf-8')
    (out/'timeline.json').write_text(json.dumps([dict(start=i*9,end=(i+1)*9,title=s[0],caption=s[1]) for i,s in enumerate(scenes)],ensure_ascii=False,indent=2),encoding='utf-8')
    inputs=['pial-left.mesh','surface-region-labels.json'] if kind=='surface' else ['bigbrain-icbm500.bin.gz','bigbrain-practical-segmentation-icbm500.bin.gz']
    (out/'inputs.json').write_text(json.dumps({n:hashlib.sha256((ROOT/'public/atlas'/n).read_bytes()).hexdigest() for n in inputs},indent=2),encoding='utf-8')

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--proof-only',action='store_true');args=ap.parse_args()
    for kind,scenes in [('surface',SURFACE),('sections',SECTIONS)]:
        out=OUT/kind;out.mkdir(parents=True,exist_ok=True)
        if kind=='surface':assets=surface_images()
        else:
            raw=load_volume(ROOT/'public/atlas/bigbrain-icbm500.bin.gz',b'BBV1');seg=load_volume(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',b'BBS1')
            sag=Image.fromarray(np.clip(raw_rgb(section(raw,'sagittal',.5)),0,255).astype('uint8')).resize((250,190),Image.Resampling.LANCZOS)
            assets=raw,seg,sag
        sheet=Image.new('RGB',(1280,360*4),BG)
        for i in range(len(scenes)):
            im=make_frame(kind,i,4.5,assets);im.save(out/f'proof-{i:02}.jpg',quality=92);sheet.paste(im.resize((640,360)),(i%2*640,i//2*360))
        sheet.save(out/'storyboard.jpg',quality=92);package(kind,scenes,out)
        if args.proof_only:continue
        cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(out/f'{kind}-ja.mp4')]
        with (out/'encode.log').open('w') as log:
            p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
            for i in range(len(scenes)):
                print(f'{kind} scene {i+1}',flush=True)
                for n in range(9*FPS):p.stdin.write(make_frame(kind,i,n/FPS,assets).tobytes())
            p.stdin.close()
            if p.wait():raise RuntimeError('Encoder failed')
        import zipfile
        with zipfile.ZipFile(out/f'{kind}-package.zip','w',zipfile.ZIP_DEFLATED) as z:
            for f in out.iterdir():
                if f.suffix not in ('.zip','.log'):z.write(f,f.name)
    (OUT/'index.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>観察の教材動画</title><style>body{background:#102a30;color:#f3f2e9;font:20px/1.8 system-ui;max-width:900px;margin:40px auto;padding:24px}a{color:#83d0bd}li{margin:24px 0}img{width:100%;max-width:380px;display:block}</style><h1>脳実習ナビ：観察の教材動画</h1><p>各1分12秒・日本語字幕・音声なし</p><ul><li><a href="surface/">脳表：中心溝の前と後<img src="surface/proof-01.jpg" alt="中心前回と中心後回"></a></li><li><a href="sections/">断面：脳室を目印に冠状断を読む<img src="sections/proof-03.jpg" alt="第三脳室と視床"></a></li></ul>',encoding='utf-8')

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8');main()

