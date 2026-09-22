#!/usr/bin/env python3
"""Original educational visual-pathway animation; no textbook images copied.

Uses unchanged project labels for two illustrative sections. Software AGPL-3.0;
rendered material CC BY-NC-SA 4.0 with the bundled source notices.
"""
from pathlib import Path
import argparse, hashlib, html, json, math, shutil, subprocess, sys, zipfile
import numpy as np
from PIL import Image, ImageDraw
from render_papez_video import ROOT, W, H, FPS, BG, FG, MUTED, RED, TEAL, text, block, wrap, load_volume, section, fitted, imageio_ffmpeg

OUT=ROOT/'work/visual-pathway-video'
SCENES=[
    dict(seconds=8,title='視野と眼を分けて、視覚路をたどる',caption='「左眼」と「左視野」は別です。ここでは両眼で見える範囲の、左右の視野を考えます。',kind='intro',paths=[]),
    dict(seconds=12,title='01  左視野は、両眼の網膜に映る',caption='左視野の情報は、左眼の鼻側網膜と右眼の耳側網膜へ届きます。',kind='left',paths=['LN','RT']),
    dict(seconds=10,title='02  鼻側網膜の線維は、視交叉で交叉',caption='左眼の鼻側網膜から来る線維は、左視神経から視交叉を通って右視索へ進みます。',kind='nasal',paths=['LN']),
    dict(seconds=10,title='03  耳側網膜の線維は、同側を進む',caption='右眼の耳側網膜から来る線維は、視交叉で反対側へ渡らず、右視索へ進みます。',kind='temporal',paths=['RT']),
    dict(seconds=10,title='04  右視索が運ぶのは、左視野の情報',caption='両眼由来の左視野の情報が、同じ右視索へ入ります。「右眼だけの通り道」ではありません。',kind='left',paths=['LN','RT']),
    dict(seconds=10,title='05  右視野は、その逆をたどる',caption='右眼の鼻側網膜と左眼の耳側網膜からの情報は、左視索を通って左半球へ向かいます。',kind='right',paths=['RN','LT']),
    dict(seconds=12,title='06  外側膝状体 → 視放線 → 一次視覚野',caption='主な中継部は視床の外側膝状体です。そこから視放線を経て、同じ側の一次視覚野へ進みます。',kind='relay',paths=['LN','RT']),
    dict(seconds=10,title='07  標本では、まず視交叉の位置を探す',caption='着色は本教材の視交叉部分ラベルです。ここから交叉する一本一本の線維が見えるわけではありません。',kind='specimen',image='chiasm',paths=['LN','RT']),
    dict(seconds=10,title='08  外側膝状体を断面で確かめる',caption='左右の外側膝状体を着色しています。視放線の線は模式図であり、この標本の線維追跡ではありません。',kind='specimen',image='lgn',paths=['LN','RT']),
    dict(seconds=8,title='一時停止して、説明してみよう',caption='左視野はどちらの視索へ？ 交叉するのは鼻側・耳側のどちら？ 視放線はどこからどこへ？',kind='quiz',paths=[]),
    dict(seconds=8,title='答え合わせ',caption='左視野は右視索へ。交叉するのは鼻側網膜の線維。視放線は外側膝状体から同側の一次視覚野へ。',kind='answer',paths=['LN','RT']),
    dict(seconds=10,title='出典と、観察へ戻るための手がかり',caption='視交叉と外側膝状体を標本で、視放線の方向と左右の対応を模式図で確認しましょう。',kind='credits',paths=[]),
]
TOTAL=sum(s['seconds'] for s in SCENES)
# Left/right are the person's sides. The diagram encodes connectivity, not geometry.
ROUTES={
 'LT':[(110,264),(140,304),(170,381),(180,435)],
 'LN':[(250,264),(275,305),(465,382),(560,435)],
 'RN':[(490,264),(465,305),(275,382),(180,435)],
 'RT':[(630,264),(600,304),(570,381),(560,435)],
}
END={'LT':180,'LN':560,'RN':180,'RT':560}

def point_along(points,phase):
    lengths=[math.dist(a,b) for a,b in zip(points,points[1:])]
    distance=max(0,min(1,phase))*sum(lengths)
    for (a,b),length in zip(zip(points,points[1:]),lengths):
        if distance<=length:return a[0]+(b[0]-a[0])*distance/length,a[1]+(b[1]-a[1])*distance/length
        distance-=length
    return points[-1]

def node(d,x,y,label,active=False,width=150):
    d.rounded_rectangle((x-width/2,y-23,x+width/2,y+23),10,fill='#23454b',outline=RED if active else '#668b90',width=3 if active else 1)
    text(d,(x,y),label,20,FG,True,'mm')

def graph(d,s,t):
    active=s['paths']
    text(d,(42,120),'左右は本人から見た方向',19,TEAL,True)
    text(d,(42,148),'接続の模式図：光学図・線維の実測図ではありません',16,MUTED)
    text(d,(180,189),'左眼の網膜',23,FG,True,'mm');text(d,(560,189),'右眼の網膜',23,FG,True,'mm')
    for key,x,label in [('LT',110,'耳側'),('LN',250,'鼻側'),('RN',490,'鼻側'),('RT',630,'耳側')]:
        node(d,x,238,label,key in active,112)
    text(d,(370,230),'鼻',17,MUTED,anchor='mm')
    for key,points in ROUTES.items():d.line(points,fill='#6a8a8e' if key not in active else '#cc7770',width=4,joint='curve')
    text(d,(130,280),'左視神経',16,MUTED,anchor='rm');text(d,(610,280),'右視神経',16,MUTED,anchor='lm')
    d.rounded_rectangle((309,317,431,378),8,outline='#91aaa9',width=1)
    text(d,(370,399),'視交叉',20,TEAL,True,'mm')
    text(d,(157,410),'左視索',18,MUTED,anchor='rm');text(d,(583,410),'右視索',18,MUTED,anchor='lm')
    for x,side in [(180,'左'),(560,'右')]:
        on=any(END[k]==x for k in active)
        d.line([(x,481),(x,551)],fill='#cc7770' if on else '#6a8a8e',width=4)
        d.polygon([(x,548),(x-7,538),(x+7,538)],fill='#cc7770' if on else '#6a8a8e')
        text(d,(x+15,516),'視放線',18,MUTED,anchor='lm')
        node(d,x,458,f'{side}外側膝状体',on,176)
        node(d,x,575,f'{side}一次視覚野',on,176)
    # A repeated travelling point explains order. It never removes a structure.
    phase=(t%8)/8
    for key in active:
        x=END[key];path=ROUTES[key]+[(x,458),(x,575)]
        for tail in range(5,0,-1):
            px,py=point_along(path,max(0,phase-tail*.014));d.ellipse((px-3,py-3,px+3,py+3),fill='#be6866')
        px,py=point_along(path,phase);d.ellipse((px-6,py-6,px+6,py+6),fill=RED)
    text(d,(42,610),'赤い点は説明用の進行表示。伝導速度を表しません。',16,MUTED)

def make_specimens(out):
    raw=load_volume(ROOT/'public/atlas/bigbrain-icbm500.bin.gz',b'BBV1')
    seg=load_volume(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',b'BBS1')
    if raw.shape!=seg.shape:raise ValueError('Grid mismatch')
    result={}
    for key,ids in [('chiasm',[36]),('lgn',[44,45])]:
        # Choose a clear existing-label slice for illustration, never for segmentation.
        z=int(np.isin(seg,ids).sum(axis=(0,1)).argmax());p=1-z/(raw.shape[2]-1)
        r=section(raw,'horizontal',p);labels=section(seg,'horizontal',p);mask=np.isin(labels,ids)
        if not mask.any():raise ValueError('Empty illustration')
        v=r.astype(float);rgb=np.stack((47+v*.81,40+v*.75,32+v*.66),axis=-1);rgb[r>=252]=(16,42,48)
        rgb[mask]=rgb[mask]*.25+np.array([255,119,112])*.75
        image=Image.fromarray(np.clip(rgb,0,255).astype('uint8'));yy,xx=np.where(mask)
        box=(max(0,int(xx.min())-22),max(0,int(yy.min())-22),min(image.width,int(xx.max())+23),min(image.height,int(yy.max())+23))
        image.save(out/f'{key}-section.png');result[key]=(image,box,z)
    return result

NOTES={
 'intro':'眼：情報を受ける器官\n\n視野：見ている空間の範囲\n\n左視野の情報は、\n両眼から右半球へ。',
 'left':'左視野の情報\n\n左眼・鼻側網膜\n  ＋\n右眼・耳側網膜\n\n→ 右視索 → 右半球',
 'nasal':'左眼の鼻側網膜\n        ↓\n左視神経\n        ↓\n視交叉で反対側へ\n        ↓\n右視索',
 'temporal':'右眼の耳側網膜\n        ↓\n右視神経\n        ↓\n反対側へ渡らない\n        ↓\n右視索',
 'right':'右視野の情報\n\n右眼・鼻側網膜\n  ＋\n左眼・耳側網膜\n\n→ 左視索 → 左半球',
 'relay':'外側膝状体：視床の中継核\n\n視放線：白質の通り道\n\n一次視覚野：V1 / BA17\n鳥距溝に沿う後頭葉の皮質\n\nここでは主要経路を扱い、\n他の投射や細かな層は省略。',
 'quiz':'① 左視野はどちらの視索へ？\n\n② 交叉する網膜由来線維は？\n\n③ 視放線はどこをつなぐ？\n\n一時停止して、図を指しながら\n説明してみましょう。',
 'answer':'① 右視索\n\n② 鼻側網膜の線維\n\n③ 外側膝状体から\n   同じ側の一次視覚野へ',
}

def frame(s,t,global_time,specimens):
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
    text(d,(42,22),'脳実習ナビ / 視覚路のミニレッスン',18,TEAL,True)
    text(d,(42,58),s['title'],31,FG,True)
    text(d,(1236,31),f'{int(global_time)//60}:{int(global_time)%60:02} / {TOTAL//60}:{TOTAL%60:02}',18,MUTED,anchor='ra')
    if s['kind']=='credits':
        lines=['構成・模式図・字幕：脳実習ナビ contributors（2026）',
          '組織像：BigBrain — Amunts, Zilles, Evans et al. / CC BY-NC-SA 4.0',
          'LGN：Schiffer, Brandstetter, Bolakhrif, Mohlberg, Amunts, Dickscheid',
          '公開LGB層分節 doi:10.25493/33Z0-BX / CC BY-NC-SA 4.0',
          '加工：既存0.5 mm画像・ラベルから断面抽出、着色・拡大',
          '解説：Purves et al., Neuroscience (2nd ed.), Chapters 12',
          '動画：CC BY-NC-SA 4.0 / 原notice・参考文献は再生ページに掲載',
          '教育目的限定。診断・治療・手術計画・定量研究には使用不可。']
        for i,line in enumerate(lines):text(d,(48,167+i*49),line,23)
    else:
        graph(d,s,t);d.rounded_rectangle((755,117,1244,624),14,fill='#19363e')
        if s.get('image'):
            image,box,z=specimens[s['image']]
            text(d,(779,136),'標本での位置：'+('視交叉（部分）' if s['image']=='chiasm' else '外側膝状体'),22,TEAL,True)
            full=fitted(image,(205,180));fx=993-full.width//2;fy=173
            im.paste(full,(fx,fy));k=full.width/image.width
            d.rectangle((fx+box[0]*k,fy+box[1]*k,fx+box[2]*k,fy+box[3]*k),outline=RED,width=2)
            text(d,(779,350),f'水平断 Z{z} / 左 L・右 R・上 A・下 P',17,MUTED)
            zoom=fitted(image.crop(box),(420,175));im.paste(zoom,(999-zoom.width//2,379))
            text(d,(779,565),'赤枠の範囲を拡大・既存ラベルを着色',18,MUTED)
            text(d,(779,597),'BigBrain派生画像 / CC BY-NC-SA 4.0',16,MUTED)
        else:
            end=block(d,(779,155),NOTES[s['kind']],24,438,gap=11)
            if end>610:raise ValueError(f'Notes overflow: {s["kind"]}')
    d.rectangle((0,639,W,H),fill='#091d23');lines=wrap(s['caption'],26,1180)
    if len(lines)>2:raise ValueError('Caption overflow')
    for i,line in enumerate(lines):text(d,(45,651+i*32),line,26)
    d.rectangle((0,716,int(W*global_time/TOTAL),719),fill=TEAL)
    return im

def package(out,timeline):
    def stamp(s):return f'00:{s//60:02}:{s%60:02}.000'
    (out/'captions-ja.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{stamp(s["start"])} --> {stamp(s["end"])}\n{s["caption"]}' for s in timeline)+'\n',encoding='utf-8')
    for name in ['BIGBRAIN-DATA-LICENSE.txt','ATTRIBUTION.txt']:shutil.copyfile(ROOT/'public/atlas'/name,out/name)
    chapters=''.join(f'<button data-time="{s["start"]}">{stamp(s["start"])[3:8]} {html.escape(s["title"])}</button>' for s in timeline)
    transcript=''.join(f'<h3>{html.escape(s["title"])}</h3><p>{html.escape(s["caption"])}</p>' for s in timeline)
    page=f'''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>視野と眼を分けて、視覚路をたどる | 脳実習ナビ</title>
<style>body{{margin:0;background:#102a30;color:#f3f2e9;font:16px/1.8 system-ui}}main{{max-width:1180px;margin:auto;padding:24px}}h1{{font-size:clamp(24px,4vw,36px)}}video{{width:100%;background:#091d23}}a{{color:#83d0bd}}nav{{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}}button{{font:inherit;color:inherit;background:#284c49;border:1px solid #638880;border-radius:6px;padding:8px 12px;min-height:44px;cursor:pointer}}button:focus-visible{{outline:3px solid #83d0bd}}details{{padding:16px 0;border-top:1px solid #507176}}summary{{cursor:pointer;font-weight:700}}</style>
<main><p>脳実習ナビ / 教育用動画・試作</p><h1>視野と眼を分けて、視覚路をたどる</h1><p>{TOTAL//60}分{TOTAL%60:02}秒・日本語字幕・音声なし。全経路を残したまま、赤い点で左右の対応を追います。</p>
<video controls playsinline preload="metadata" poster="proof-01.jpg" aria-label="視覚路の教材動画"><source src="visual-pathway-ja.mp4" type="video/mp4"><track kind="captions" src="captions-ja.vtt" srclang="ja" label="日本語（画面にも表示）"></video>
<nav aria-label="動画の章へ移動">{chapters}</nav><p><a href="visual-pathway-ja.mp4" download>MP4を保存</a> · <a href="visual-pathway-package.zip" download>出典・字幕込みZIP</a> · <a href="storyboard.jpg">全場面の一覧</a></p>
<p>両眼で見える視野の左右を例に、鼻側網膜の交叉と耳側網膜の非交叉を説明します。図は接続を表す独自の模式図で、眼の光学図や個別の線維走行ではありません。赤い点の速度は説明上の演出です。</p>
<details><summary>字幕を文章で読む</summary>{transcript}</details>
<details><summary>出典・加工内容・利用条件</summary><ul>
<li>解説照合：Purves et al., <i>Neuroscience</i>, 2nd ed. <a href="https://www.ncbi.nlm.nih.gov/books/NBK10944/">The Retinotopic Representation of the Visual Field</a> / <a href="https://www.ncbi.nlm.nih.gov/books/NBK11145/">Central Projections of Retinal Ganglion Cells</a>。文章・図の転載はありません。</li>
<li>組織像：Amunts, Zilles, Evans et al., <a href="https://bigbrainproject.org/">BigBrain</a> / CC BY-NC-SA 4.0。既存0.5 mm派生画像から断面抽出、色調整、着色と拡大。<a href="BIGBRAIN-DATA-LICENSE.txt">原notice</a>。</li>
<li>外側膝状体：Schiffer, Brandstetter, Bolakhrif, Mohlberg, Amunts, Dickscheid, <a href="https://doi.org/10.25493/33Z0-BX">同一BigBrainの公開LGB層分節</a> / CC BY-NC-SA 4.0。公式登録・最近傍再標本化・左右の6層和集合を経た本教材の既存ラベルを使用。視交叉はプロジェクトの部分分節。今回ラベルは変更していません。<a href="ATTRIBUTION.txt">配布データの出典台帳</a>。</li>
<li>動画・構成・模式図・字幕：© 2026 脳実習ナビ contributors / <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>。再配布時は動画と出典・原noticeを併せてください。提供元による承認や推奨を意味しません。</li></ul><p>教育目的限定。臨床・手術計画・定量研究には使えません。専門家監修・学習効果の検証は未実施です。視放線の標本分節や、網膜対応の線維分節は収録していません。</p><p><a href="inputs.json">使用データのSHA-256</a> · <a href="timeline.json">構成とタイミング</a></p></details></main>
<script>const v=document.querySelector('video');document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{{v.currentTime=Number(b.dataset.time);v.play();v.focus();}});</script></html>'''
    (out/'index.html').write_text(page,encoding='utf-8')

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--proof-only',action='store_true');args=ap.parse_args();OUT.mkdir(parents=True,exist_ok=True)
    specimens=make_specimens(OUT);timeline=[];start=0;proofs=[]
    for i,s in enumerate(SCENES):
        timeline.append(dict(s,start=start,end=start+s['seconds']));im=frame(s,4,start+4,specimens)
        im.save(OUT/f'proof-{i:02}.jpg',quality=92);proofs.append(im.resize((640,360)));start+=s['seconds']
    sheet=Image.new('RGB',(1280,360*math.ceil(len(proofs)/2)),BG)
    for i,im in enumerate(proofs):sheet.paste(im,(i%2*640,i//2*360))
    sheet.save(OUT/'storyboard.jpg',quality=92)
    (OUT/'timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2),encoding='utf-8')
    files=[ROOT/'public/atlas/bigbrain-icbm500.bin.gz',ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',ROOT/'src/circuitTeaching.mjs',Path(__file__)]
    (OUT/'inputs.json').write_text(json.dumps({str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},indent=2),encoding='utf-8');package(OUT,timeline)
    if args.proof_only:return
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'visual-pathway-ja.mp4')]
    with (OUT/'encode.log').open('w') as log:
        p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
        for scene in timeline:
            print(scene['title'],flush=True)
            for n in range(scene['seconds']*FPS):p.stdin.write(frame(scene,n/FPS,scene['start']+n/FPS,specimens).tobytes())
        p.stdin.close()
        if p.wait():raise RuntimeError('Encoder failed')
    with zipfile.ZipFile(OUT/'visual-pathway-package.zip','w',zipfile.ZIP_DEFLATED) as z:
        for f in OUT.iterdir():
            if f.suffix not in ('.zip','.log'):z.write(f,f.name)
    print(json.dumps({'seconds':TOTAL,'bytes':(OUT/'visual-pathway-ja.mp4').stat().st_size}),flush=True)

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8');main()
