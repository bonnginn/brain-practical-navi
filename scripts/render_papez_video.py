#!/usr/bin/env python3
"""Render an original captioned teaching film from existing, unchanged labels.

Requires numpy, Pillow and imageio-ffmpeg. No browser capture or external images.
Software: AGPL-3.0-or-later. Rendered teaching material: CC BY-NC-SA 4.0;
source-specific BigBrain and manual-label notices remain applicable.
"""
from pathlib import Path
import argparse, gzip, hashlib, html, json, math, shutil, struct, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'work/video-tools'))
import imageio_ffmpeg

W,H,FPS=1280,720,20
BG='#102a30'; FG='#f3f2e9'; MUTED='#abc1c3'; LINE='#507176'; RED='#ff7770'; TEAL='#83d0bd'
FONT=Path('C:/Windows/Fonts/BIZ-UDGothicR.ttc')
BOLD=Path('C:/Windows/Fonts/BIZ-UDGothicB.ttc')
FONTS={}
def font(size,bold=False):
    key=size,bold
    if key not in FONTS:FONTS[key]=ImageFont.truetype(str(BOLD if bold else FONT),size)
    return FONTS[key]
def text(d,xy,value,size=24,fill=FG,bold=False,anchor=None):
    d.text(xy,value,font=font(size,bold),fill=fill,anchor=anchor)
def wrap(value,size,width):
    result=[]
    for paragraph in value.split('\n'):
        line=''
        for char in paragraph:
            if font(size).getlength(line+char)>width:
                result.append(line);line=char
            else:line+=char
        result.append(line)
    return result
def block(d,xy,value,size=24,width=450,fill=FG,gap=10,bold=False):
    x,y=xy
    for line in wrap(value,size,width):
        text(d,(x,y),line,size,fill,bold);y+=size+gap
    return y

NAMES=['海馬体','脳弓','乳頭体','乳頭視床路','視床前部核','帯状回','帯状束','海馬傍回・嗅内野']
KINDS=['灰白質','白質路','灰白質','白質路','灰白質','皮質','白質路','皮質']
POINTS=[(150,230),(390,230),(630,230),(630,370),(630,510),(390,510),(150,510),(150,370)]
# Caption timing is editorial, not an estimate of physiological conduction speed.
SCENES=[
 dict(seconds=8,title='Papez回路を、ひとつの流れとして見る',caption='記憶に関わる構造を、灰白質の中継部と白質の通り道に分けて追いましょう。',kind='intro'),
 dict(seconds=10,title='01  海馬体 → 脳弓',caption='海馬体は、新しい出来事の記憶形成に関わります。主要な出力のひとつが脳弓です。',node=0,image='hippocampus'),
 dict(seconds=10,title='02  脳弓を通って乳頭体へ',caption='白板の線維は海馬采へ集まり、脳弓へ続きます。この図では乳頭体へ向かう枝を追います。',node=1,image='fornix'),
 dict(seconds=8,title='03  乳頭体で中継する',caption='乳頭体は視床下部にある小さな中継部です。ここから乳頭視床路が視床前部へ向かいます。',node=2,image='mammillary'),
 dict(seconds=10,title='04  乳頭視床路で視床前部へ',caption='乳頭体と視床前部核の間を結ぶ線維束が、乳頭視床路です。',node=3,kind='tract'),
 dict(seconds=10,title='05  視床前部核 → 帯状回',caption='視床前部核から帯状回へ、情報が中継されます。視床全体と前部核を区別しましょう。',node=4,image='thalamus'),
 dict(seconds=10,title='06  帯状回は、内側面の皮質',caption='帯状回は脳梁の上方を弧状に走る脳回です。深部の帯状束とは別の構造です。',node=5,kind='layers'),
 dict(seconds=10,title='07  帯状束は、皮質をつなぐ白質路',caption='帯状束を介するつながりをたどり、海馬傍回・嗅内野へ向かいます。',node=6,kind='layers'),
 dict(seconds=10,title='08  嗅内野を経て海馬体へ',caption='嗅内野から海馬体への入力には穿通路が関わります。ここでは内部の細かな接続を省略します。',node=7,kind='return'),
 dict(seconds=12,title='一周を、構造を消さずにたどる',caption='中継する灰白質と、つなぐ白質路。名称だけでなく、順序と種類も確かめましょう。',kind='recap'),
 dict(seconds=10,title='ここで一時停止して、説明してみよう',caption='海馬体と乳頭体の間は何を通る？ 乳頭体と視床前部核の間は？ 帯状回と帯状束は同じ？',kind='quiz'),
 dict(seconds=8,title='答え合わせ',caption='脳弓、乳頭視床路。帯状回は皮質を含む脳回、帯状束はその深部を通る白質路です。',kind='answer'),
 dict(seconds=10,title='観察へ戻って、位置を確かめる',caption='教育目的の試作教材です。実際の記憶ネットワークには、この簡略回路以外の結合もあります。',kind='credits'),
]
TOTAL=sum(s['seconds'] for s in SCENES)

def load_volume(path,magic):
    payload=gzip.open(path,'rb').read()
    if payload[:4]!=magic:raise ValueError(f'Bad magic: {path}')
    dims=struct.unpack('<3H',payload[4:10])
    return np.frombuffer(payload,np.uint8,int(np.prod(dims)),10).reshape(dims,order='F')
def section(a,plane,p):
    if plane=='coronal':return a[:,round(p*(a.shape[1]-1)),:].T[::-1]
    if plane=='horizontal':return a[:,:,round((1-p)*(a.shape[2]-1))].T[::-1]
    return a[round(p*(a.shape[0]-1)),:,:].T[::-1]

def make_specimens(out):
    raw=load_volume(ROOT/'public/atlas/bigbrain-icbm500.bin.gz',b'BBV1')
    seg=load_volume(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',b'BBS1')
    if raw.shape!=seg.shape:raise ValueError('Grid mismatch')
    result={}
    for key,plane,p,ids in [('hippocampus','coronal',.51,[17,18]),('fornix','coronal',.53,[46]),('mammillary','horizontal',.69,[39,40]),('thalamus','coronal',.49,[15,16])]:
        r=section(raw,plane,p); mask=np.isin(section(seg,plane,p),ids)
        if not mask.any():raise ValueError(f'Empty target: {key}')
        v=r.astype(np.float32)
        rgb=np.stack((47+v*.81,40+v*.75,32+v*.66),axis=-1)
        rgb[r>=252]=(16,42,48)
        # Static target colouring, never a fabricated intratissue tract.
        rgb[mask]=rgb[mask]*.28+np.array([255,119,112])*.72
        im=Image.fromarray(np.clip(rgb,0,255).astype(np.uint8))
        ys,xs=np.where(mask); box=(max(0,int(xs.min())-30),max(0,int(ys.min())-28),min(im.width,int(xs.max())+31),min(im.height,int(ys.max())+29))
        im.save(out/f'{key}-section.png')
        result[key]=(im,box,'冠状断  L ← → R / 上 S・下 I' if plane=='coronal' else '水平断  L ← → R / 上 A・下 P')
    return result

def arrow(d,a,b,color=LINE,width=3):
    x,y=a;u,v=b;dx=u-x;dy=v-y;n=math.hypot(dx,dy);ux,uy=dx/n,dy/n
    d.line([a,b],fill=color,width=width)
    d.polygon([(u,v),(u-ux*11-uy*5,v-uy*11+ux*5),(u-ux*11+uy*5,v-uy*11-ux*5)],fill=color)

def edge(i):
    a=POINTS[i];b=POINTS[(i+1)%8]
    dx,dy=b[0]-a[0],b[1]-a[1]
    if dx:return ((a[0]+math.copysign(98,dx),a[1]),(b[0]-math.copysign(105,dx),b[1]))
    return ((a[0],a[1]+math.copysign(43,dy)),(b[0],b[1]-math.copysign(49,dy)))

def graph(d,active=None,phase=0):
    text(d,(48,130),'情報の流れを示す模式図',20,TEAL,True)
    text(d,(48,157),'配置・距離は実際の解剖学的位置を表しません',16,MUTED)
    for i in range(8):arrow(d,*edge(i))
    for i,(x,y) in enumerate(POINTS):
        white=KINDS[i]=='白質路'
        d.rounded_rectangle((x-95,y-40,x+95,y+40),12,fill='#203f48' if white else '#284c49',outline=RED if i==active else '#638880',width=3 if i==active else 1)
        text(d,(x,y-14),NAMES[i],19 if i==7 else 24,FG,True,'mm')
        text(d,(x,y+12),KINDS[i],15,MUTED,False,'mm')
        text(d,(x-82,y-32),str(i+1),13,RED if i==active else MUTED)
        if i==active:
            # Motion along a schematic box precedes transfer along its connector.
            progress=min(phase/.65,1)
            d.line((x-77,y+29,x-77+154*progress,y+29),fill=RED,width=4)
    if active is not None and phase>.65:
        a,b=edge(active);p=(phase-.65)/.35
        for trail in range(7,0,-1):
            q=max(0,p-trail*.025);x=a[0]+(b[0]-a[0])*q;y=a[1]+(b[1]-a[1])*q
            d.ellipse((x-3,y-3,x+3,y+3),fill='#b35b5b')
        x=a[0]+(b[0]-a[0])*p;y=a[1]+(b[1]-a[1])*p
        d.ellipse((x-7,y-7,x+7,y+7),fill=RED)
    text(d,(50,577),'赤：いま追っている段階と次へのつながり',18,RED)
    text(d,(50,604),'伝播の向きの説明です。実測の活動・速度ではありません。',16,MUTED)

def fitted(im,size):
    scale=min(size[0]/im.width,size[1]/im.height)
    return im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)

def right_panel(im,d,s,local,specimens):
    x,y=778,140
    d.rounded_rectangle((756,120,1246,622),18,fill='#19363e')
    key=s.get('image');kind=s.get('kind')
    if key:
        img,box,orient=specimens[key]
        name={'hippocampus':'標本で見る：海馬','fornix':'標本で見る：脳弓（部分）','mammillary':'標本で見る：乳頭体','thalamus':'位置の目安：視床全体'}[key]
        text(d,(x,y),name,23,TEAL,True)
        zoom=local>=3
        view=img.crop(box) if zoom else img
        thumb=fitted(view,(438,310));im.paste(thumb,(x+(438-thumb.width)//2,185+(310-thumb.height)//2))
        if zoom:
            # Keep the complete section visible so the close-up is locatable.
            small=fitted(img,(176,150));sx=390-small.width//2;sy=310
            im.paste(small,(sx,sy))
            k=small.width/img.width
            d.rectangle((sx+box[0]*k,sy+box[1]*k,sx+box[2]*k,sy+box[3]*k),outline=RED,width=2)
            text(d,(390,288),'断面全体の位置図',16,MUTED,anchor='ma')
        text(d,(x,508),'注目部を拡大' if zoom else '全体の位置を確認',20,FG,True)
        text(d,(x,540),orient,17,MUTED)
        note='視床前部核の輪郭ではありません' if key=='thalamus' else '着色：教材内の既存ラベル'
        text(d,(x,570),note,18,RED if key=='thalamus' else MUTED)
        text(d,(x,600),'BigBrain 0.5 mm派生画像 / CC BY-NC-SA 4.0',13,MUTED)
    elif kind in ('layers','return','tract'):
        text(d,(x,y),'構造の種類を区別する',24,TEAL,True)
        if kind=='layers':
            d.rounded_rectangle((805,233,1200,312),22,fill='#467a70',outline=TEAL,width=2)
            text(d,(1002,272),'帯状回：皮質を含む脳回',23,FG,True,'mm')
            d.rounded_rectangle((805,339,1200,418),22,fill='#2d5365',outline='#8faeba',width=2)
            text(d,(1002,379),'帯状束：深部の白質路',23,FG,True,'mm')
            block(d,(x,467),'「回」と「束」は別の構造。\n皮質と、その深部を通る線維を\n分けて理解しましょう。',24,438)
        elif kind=='tract':
            for yy,name in [(228,'乳頭体'),(450,'視床前部核')]:
                d.rounded_rectangle((837,yy,1165,yy+66),16,fill='#284c49',outline=TEAL,width=2)
                text(d,(1001,yy+33),name,28,FG,True,'mm')
            arrow(d,(1001,308),(1001,430),RED,6)
            text(d,(1020,350),'乳頭視床路',24,FG)
            text(d,(x,570),'この線維束は模式図で説明しています',18,MUTED)
        else:
            block(d,(x,223),'海馬傍回・嗅内野\n\n      ↓ 穿通路など\n\n海馬体',28,438,bold=True)
            block(d,(x,488),'海馬体内部の細かな回路は、\nこの動画では描き分けません。',23,438)
        text(d,(x,600),'概念図：形状・厚さ・接続を簡略化',16,MUTED)
    else:
        title={'intro':'この動画でわかること','recap':'記憶を支えるネットワーク','quiz':'声に出して説明しよう','answer':'答えのポイント'} .get(kind,'観察へ戻ろう')
        text(d,(x,y),title,26,TEAL,True)
        body={
            'intro':'1  中継部と白質路を区別\n\n2  一周のつながりを説明\n\n3  標本で位置を確かめる\n\n字幕付き・音声なし',
            'recap':'海馬体 → 間脳 → 帯状回\n→ 内側側頭葉 → 海馬体\n\n歴史的な基本回路です。\n実際には追加の結合があり、\n記憶をこの一周だけで\n説明することはできません。',
            'quiz':'① 海馬体 → 乳頭体\n    間の白質路は？\n\n② 乳頭体 → 視床前部核\n    間の白質路は？\n\n③ 帯状回と帯状束の違いは？',
            'answer':'① 脳弓\n\n② 乳頭視床路\n\n③ 帯状回：皮質を含む脳回\n    帯状束：深部の白質路',
        }.get(kind,'')
        block(d,(x,202),body,24,438,gap=10)

def frame(s,local,global_time,specimens):
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
    text(d,(44,23),'脳実習ナビ  /  MINI LESSON 01',17,TEAL,True)
    text(d,(44,59),s['title'],32,FG,True)
    text(d,(1234,33),f'{int(global_time)//60}:{int(global_time)%60:02d} / {TOTAL//60}:{TOTAL%60:02d}',18,MUTED,anchor='ra')
    active=s.get('node');phase=(local%5)/5
    if s.get('kind')=='recap':active=min(7,int(local/s['seconds']*8));phase=(local/s['seconds']*8)%1
    if s.get('kind')=='credits':
        text(d,(55,155),'出典・制作',30,TEAL,True)
        lines=[
          '構成・模式図・字幕：脳実習ナビ contributors（2026）',
          '組織画像：BigBrain — Amunts, Zilles, Evans et al. / CC BY-NC-SA 4.0',
          '海馬・視床ラベル：Xiao et al. (2019) / CC BY 4.0',
          '脳弓・乳頭体：本教材の画像誘導ラベル（専門家未監修）',
          '変更：再標本化画像から断面抽出・色調整・着色・拡大',
          '解説の照合：Choi et al. (2019), doi:10.3389/fnana.2019.00017',
          'UTHealth Neuroscience Online — Limbic System: Hippocampus',
          '動画：CC BY-NC-SA 4.0  /  詳細とリンクは付属の出典一覧へ',
        ]
        for i,line in enumerate(lines):text(d,(55,214+i*43),line,23)
        text(d,(55,583),'教育目的限定。診断・治療・手術計画・定量研究には使用できません。',21,TEAL)
    else:
        graph(d,active,phase);right_panel(im,d,s,local,specimens)
    d.rectangle((0,639,W,H),fill='#091d23')
    lines=wrap(s['caption'],27,1180)
    if len(lines)>2:raise ValueError(f'Caption overflows: {s["title"]}')
    for i,line in enumerate(lines):text(d,(50,651+i*33),line,27)
    d.rectangle((0,716,int(W*global_time/TOTAL),719),fill=TEAL)
    return im

def package(out,timeline):
    def stamp(seconds):return f'{seconds//3600:02}:{seconds//60%60:02}:{seconds%60:02}.000'
    vtt='WEBVTT\n\n'+'\n\n'.join(f'{stamp(s["start"])} --> {stamp(s["end"])}\n{s["caption"]}' for s in timeline)+'\n'
    (out/'captions-ja.vtt').write_text(vtt,encoding='utf-8')
    for name in ['BIGBRAIN-DATA-LICENSE.txt','BIGBRAIN-MANUAL-LICENSE.txt']:
        shutil.copyfile(ROOT/'public/atlas'/name,out/name)
    references='''
<li>原組織画像：Amunts, Zilles, Evans et al., BigBrain. <a href="https://bigbrainproject.org/">BigBrain Project</a> / <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>。既存0.5 mm派生画像から断面抽出、色調整、着色、切り抜き拡大を実施。<a href="BIGBRAIN-DATA-LICENSE.txt">原notice</a></li>
<li>海馬・視床の手動ラベル：Yiming Xiao and collaborators, McConnell Brain Imaging Centre, McGill University. <a href="https://nist.mni.mcgill.ca/multi-contrast-pd25-atlas/">BigBrain co-registration with PD25 and ICBM152</a> / <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>。<a href="BIGBRAIN-MANUAL-LICENSE.txt">原notice</a>。基になるBigBrainの条件も保持。</li>
<li>脳弓・乳頭体：脳実習ナビの既存画像誘導ラベル。今回の動画のために分節は変更していません。専門家未監修。</li>
<li>解説照合：Choi S-H, Kim Y-B, Paek S-H, Cho Z-H (2019). <a href="https://doi.org/10.3389/fnana.2019.00017">Papez Circuit Observed by in vivo Human Brain With 7.0T MRI Super-Resolution Track Density Imaging and Track Tracing</a>. Introductionの接続順序を照合。論文の図は転載していません。</li>
<li>学習用解説：<a href="https://nba.uth.tmc.edu/neuroscience/s4/chapter05.html">UTHealth Neuroscience Online — Limbic System: Hippocampus</a>。画像の転載なし。</li>
<li>動画・構成・模式図・字幕：© 2026 脳実習ナビ contributors / CC BY-NC-SA 4.0。提供元・著者・所属機関による推奨や承認を意味しません。再配布時は動画とこの出典一覧・原noticeを併せてください。</li>
'''
    chapters=''.join(f'<button data-time="{s["start"]}">{s["start"]//60}:{s["start"]%60:02} {html.escape(s["title"])}</button>' for s in timeline)
    transcript=''.join(f'<h3>{s["start"]//60}:{s["start"]%60:02} {html.escape(s["title"])}</h3><p>{html.escape(s["caption"])}</p>' for s in timeline)
    page='''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Papez回路をたどる | 脳実習ナビ</title>
<style>body{margin:0;background:#102a30;color:#f3f2e9;font:16px/1.8 system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:24px}h1{font-size:clamp(24px,4vw,36px);margin:8px 0}a{color:#8fdec8}video{width:100%;display:block;background:#091d23;border-radius:12px}nav{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}button{font:inherit;color:inherit;background:#284c49;border:1px solid #638880;border-radius:6px;padding:8px 12px;min-height:44px;cursor:pointer}button:hover,button:focus-visible{background:#416e61}details{border-top:1px solid #638880;padding:16px 0}summary{cursor:pointer;font-weight:700}li{margin:12px 0}.lead{color:#b7d2cd}.downloads{display:flex;flex-wrap:wrap;gap:20px}.tag{font-size:13px;letter-spacing:.12em;color:#83d0bd}</style>
<main><div class="tag">脳実習ナビ / 教育用動画・試作</div><h1>Papez回路を、ひとつの流れとして見る</h1><p class="lead">2分06秒・日本語字幕・音声なし。回路全体を残し、赤い信号の移動に合わせて説明します。</p>
<video controls playsinline preload="metadata" poster="proof-01.jpg" aria-label="Papez回路の教材動画"><source src="papez-circuit-ja.mp4" type="video/mp4"><track kind="captions" src="captions-ja.vtt" srclang="ja" label="日本語（画面にも表示）"></video>
<nav aria-label="動画の章へ移動">CHAPTERS</nav><p class="downloads"><a href="papez-circuit-ja.mp4" download>動画を保存（MP4）</a><a href="captions-ja.vtt" download>字幕データ</a><a href="storyboard.jpg">全場面の一覧</a></p>
<p>赤い信号は模式図上の説明です。標本内の活動・神経線維・伝導速度を測定したものではありません。標本画像は全体の位置図と注目部の拡大を併記します。乳頭視床路は模式図のみ、視床前部核は視床全体と区別しています。</p>
<details><summary>字幕を文章で読む</summary>TRANSCRIPT</details><details><summary>出典・加工内容・利用条件</summary><ul>REFERENCES</ul><p>教育目的に限ります。診断・治療・手術計画・定量研究には使用できません。専門家監修・学習効果の検証は未実施です。</p><p><a href="inputs.json">使用データのSHA-256</a> · <a href="timeline.json">構成とタイミング</a></p></details></main>
<script>const video=document.querySelector('video');document.querySelectorAll('[data-time]').forEach(button=>button.addEventListener('click',()=>{video.currentTime=Number(button.dataset.time);video.play();video.focus();}));</script></html>'''
    page=page.replace('CHAPTERS',chapters).replace('TRANSCRIPT',transcript).replace('REFERENCES',references)
    (out/'index.html').write_text(page,encoding='utf-8')

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--out',default='work/papez-video');ap.add_argument('--proof-only',action='store_true');args=ap.parse_args()
    out=ROOT/args.out;out.mkdir(parents=True,exist_ok=True)
    specimens=make_specimens(out)
    timeline=[];start=0;proofs=[]
    for i,s in enumerate(SCENES):
        timeline.append(dict(s,start=start,end=start+s['seconds']))
        im=frame(s,min(5,s['seconds']/2),start+min(5,s['seconds']/2),specimens)
        im.save(out/f'proof-{i:02d}.jpg',quality=92);proofs.append(im.resize((640,360)))
        start+=s['seconds']
    sheet=Image.new('RGB',(1280,360*math.ceil(len(proofs)/2)),BG)
    for i,im in enumerate(proofs):sheet.paste(im,((i%2)*640,(i//2)*360))
    sheet.save(out/'storyboard.jpg',quality=92)
    (out/'timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2),encoding='utf-8')
    sources={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'public/atlas/bigbrain-icbm500.bin.gz',ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz']}
    (out/'inputs.json').write_text(json.dumps(sources,indent=2),encoding='utf-8')
    package(out,timeline)
    if args.proof_only:return
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'papez-circuit-ja.mp4')]
    with (out/'encode.log').open('w',encoding='utf-8') as log:
        proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
        for scene in timeline:
            print(scene['title'],flush=True)
            for n in range(scene['seconds']*FPS):proc.stdin.write(frame(scene,n/FPS,scene['start']+n/FPS,specimens).tobytes())
        proc.stdin.close();code=proc.wait()
        if code:raise RuntimeError(f'ffmpeg exited {code}')
    print(json.dumps({'seconds':TOTAL,'bytes':(out/'papez-circuit-ja.mp4').stat().st_size}),flush=True)

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8');main()
