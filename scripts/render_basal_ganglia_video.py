#!/usr/bin/env python3
"""Render a simplified basal-ganglia lesson using original diagrams and existing labels."""
import argparse, hashlib, html, json, math, shutil, subprocess, sys, zipfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from render_papez_video import ROOT,W,H,FPS,BG,FG,MUTED,RED,TEAL,text,block,wrap,load_volume,section,fitted,imageio_ffmpeg
from render_visual_pathway_video import point_along

OUT=ROOT/'work/basal-ganglia-video'
NODES={'cortex':(380,182,'大脳皮質'),'striatum':(175,290,'線条体'),'gpe':(175,411,'GPe'),'stn':(375,535,'STN'),'output':(570,411,'GPi / SNr'),'thalamus':(570,290,'視床')}
EDGES={
 'cs':('cortex','striatum','+',[(301,205),(218,262)]),
 'so':('striatum','output','−',[(257,290),(520,382)]),
 'sg':('striatum','gpe','−',[(175,317),(175,382)]),
 'gs':('gpe','stn','−',[(215,439),(337,507)]),
 'so2':('stn','output','+',[(414,507),(530,439)]),
 'ot':('output','thalamus','−',[(570,382),(570,317)]),
 'tc':('thalamus','cortex','+',[(535,262),(459,205)]),
 'cx':('cortex','stn','+',[(295,182),(45,182),(45,535),(290,535)]),
}
DIRECT=['cs','so','ot','tc'];INDIRECT=['cs','sg','gs','so2','ot','tc'];HYPER=['cx','so2','ot','tc']
SCENES=[
 dict(seconds=8,title='大脳基底核回路：抑制を、順に読む',caption='ここでは運動ループの基本を扱います。まず、どの結合が興奮性で、どれが抑制性かを見ましょう。',kind='intro',route=[]),
 dict(seconds=10,title='01  出力核は、視床を持続的に抑える',caption='淡蒼球内節GPiと黒質網様部SNrは主要な出力核です。視床への抑制を調節します。',kind='baseline',route=['ot']),
 dict(seconds=10,title='02  直接路：線条体から出力核へ',caption='大脳皮質から入力を受けた線条体は、GPi／SNrへ抑制性の出力を送ります。',kind='direct',route=DIRECT),
 dict(seconds=12,title='03  抑制を抑える ＝ 脱抑制',caption='出力核から視床への抑制が弱まり、対応する視床皮質活動が通りやすくなります。これが脱抑制です。',kind='release',route=DIRECT),
 dict(seconds=16,title='04  間接路：GPeとSTNを介する',caption='線条体がGPeを抑えると、STNへの抑制が弱まります。STNは出力核を興奮させ、視床への抑制を強めます。',kind='indirect',route=INDIRECT),
 dict(seconds=10,title='05  ハイパー直接路：皮質からSTNへ',caption='皮質から視床下核STNへ直接入り、GPi／SNrを介して視床への抑制を強める経路です。',kind='hyper',route=HYPER),
 dict(seconds=12,title='06  標本では、GPeとGPiを見分ける',caption='淡蒼球の外節と内節は別の区画です。断面では位置関係を、模式図では結合の符号を確かめます。',kind='specimen',route=[]),
 dict(seconds=10,title='3本を、ひとつずつ順番に動く鎖と考えない',caption='直接路・間接路・ハイパー直接路は並列に働く経路です。この図は主要な結合を簡略化しています。',kind='compare',route=INDIRECT),
 dict(seconds=8,title='一時停止して、説明してみよう',caption='直接路で視床が通りやすくなるのはなぜ？ 間接路でGPeが抑えられると、STNはどうなる？',kind='quiz',route=[]),
 dict(seconds=8,title='答え合わせ：結合の符号を残して読む',caption='直接路は視床への抑制を弱めます。間接路ではGPeの抑制が弱まり、STNが出力核を興奮させます。',kind='answer',route=INDIRECT),
 dict(seconds=10,title='出典と、観察へ戻るための手がかり',caption='これは運動ループの簡略教材です。ドパミン作用の細部、並列チャネルや局所回路は省略しています。',kind='credits',route=[]),
]
TOTAL=sum(s['seconds'] for s in SCENES)
NOTES={
 'intro':'＋：興奮性の結合\n−：抑制性の結合\n\n赤い点：いま説明する接続\n活動量・発火率の表示では\nありません。',
 'baseline':'GPi：淡蒼球内節\nSNr：黒質網様部\n\nどちらも主要な出力核。\n視床への持続的な抑制を\n強めたり、弱めたりします。',
 'direct':'皮質 → 線条体：＋\n\n線条体 → GPi / SNr：−\n\nGPi / SNr → 視床：−\n\n抑制性の出力核を抑えます。',
 'release':'出力核を抑える\n        ↓\n視床への抑制が弱まる\n        ↓\n視床皮質活動が\n通りやすくなる\n\n「抑制がなくなる」とは限りません。',
 'indirect':'線条体がGPeを抑える\n        ↓\nSTNへの抑制が弱まる\n        ↓\nSTNがGPi / SNrを興奮\n        ↓\n視床への抑制が強まる',
 'hyper':'皮質 → STN：＋\n\nSTN → GPi / SNr：＋\n\n出力核から視床への\n抑制を強める方向に働く。\n\n線条体を通らない経路です。',
 'compare':'直接路\n  視床への抑制を弱める方向\n\n間接路・ハイパー直接路\n  視床への抑制を強める方向\n\n実際の行動選択は、\n並列したネットワークの働き。',
 'quiz':'① 直接路の「−」と「−」は\n   どの構造の間にある？\n\n② GPeが抑えられると、\n   STNへの抑制はどう変わる？\n\n図を指して説明してみましょう。',
 'answer':'① 線条体 → GPi / SNr\n   GPi / SNr → 視床\n   抑制を抑える＝脱抑制\n\n② STNへの抑制が弱まる\n   STNは出力核を興奮させる',
}

def graph(d,s,t):
    text(d,(42,118),'主要な結合の模式図（位置・距離は実際と異なります）',16,MUTED)
    route=s['route'];key=route[int(t/1.7)%len(route)] if route else None
    for name,(source,target,sign,path) in EDGES.items():
        color=TEAL if sign=='+' else '#a8bee6';d.line(path,fill=color,width=3,joint='curve')
        a,b=path[-2:];dx,dy=b[0]-a[0],b[1]-a[1];n=math.hypot(dx,dy);ux,uy=dx/n,dy/n
        d.polygon([b,(b[0]-ux*11-uy*5,b[1]-uy*11+ux*5),(b[0]-ux*11+uy*5,b[1]-uy*11-ux*5)],fill=color)
        x,y=point_along(path,.47);d.ellipse((x-14,y-14,x+14,y+14),fill=BG,outline=color,width=1);text(d,(x,y),sign,23,color,True,'mm')
    active=set(EDGES[key][:2]) if key else set()
    for name,(x,y,label) in NODES.items():
        d.rounded_rectangle((x-82,y-27,x+82,y+27),10,fill='#23454b',outline=RED if name in active else '#718f91',width=3 if name in active else 1)
        text(d,(x,y),label,23,FG,True,'mm')
    if key:
        x,y=point_along(EDGES[key][3],(t%1.7)/1.7);d.ellipse((x-6,y-6,x+6,y+6),fill=RED)
    text(d,(42,580),'GPe＝淡蒼球外節 / STN＝視床下核',18,MUTED)
    text(d,(42,609),'＋ 興奮性   − 抑制性   赤い点＝説明中の接続',18,TEAL)

def specimen(out):
    raw=load_volume(ROOT/'public/atlas/bigbrain-icbm500.bin.gz',b'BBV1');seg=load_volume(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',b'BBS1')
    if raw.shape!=seg.shape:raise ValueError('Grid mismatch')
    z=int(np.isin(seg,[11,12,13,14]).sum(axis=(0,1)).argmax());p=1-z/(raw.shape[2]-1)
    r=section(raw,'horizontal',p);labels=section(seg,'horizontal',p);v=r.astype(float)
    rgb=np.stack((47+v*.81,40+v*.75,32+v*.66),axis=-1);rgb[r>=252]=(16,42,48)
    for ids,color in [([11,12],[115,211,184]),([13,14],[255,194,98])]:
        mask=np.isin(labels,ids)
        if not mask.any():raise ValueError('Missing pallidal segment')
        rgb[mask]=rgb[mask]*.2+np.array(color)*.8
    image=Image.fromarray(np.clip(rgb,0,255).astype('uint8'));yy,xx=np.where(np.isin(labels,[11,12,13,14]))
    box=(max(0,int(xx.min())-20),max(0,int(yy.min())-20),min(image.width,int(xx.max())+21),min(image.height,int(yy.max())+21))
    image.save(out/'pallidum-section.png');return image,box,z

def frame(s,t,elapsed,asset):
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
    text(d,(42,22),'脳実習ナビ / 大脳基底核のミニレッスン',18,TEAL,True)
    text(d,(42,58),s['title'],30,FG,True)
    text(d,(1236,31),f'{int(elapsed)//60}:{int(elapsed)%60:02} / {TOTAL//60}:{TOTAL%60:02}',18,MUTED,anchor='ra')
    if s['kind']=='credits':
        lines=['構成・模式図・字幕：脳実習ナビ contributors（2026）',
          '解説：UTHealth Neuroscience Online — Basal Ganglia (J. Knierim)',
          'Purves et al., Neuroscience (2nd ed.); Lanciego et al. (2012)',
          '組織像：BigBrain — Amunts, Zilles, Evans et al. / CC BY-NC-SA 4.0',
          '淡蒼球ラベル：Yiming Xiao and collaborators / McGill / CC BY 4.0',
          '加工：既存0.5 mm画像とラベルから断面抽出・色調整・着色・拡大',
          '動画：CC BY-NC-SA 4.0 / 原notice・参考文献は付属ページへ',
          '教育目的限定。診断・治療・手術計画・定量研究には使用不可。']
        for i,line in enumerate(lines):text(d,(48,167+i*49),line,23)
    else:
        graph(d,s,t);d.rounded_rectangle((766,117,1244,624),14,fill='#19363e')
        if s['kind']=='specimen':
            image,box,z=asset;text(d,(787,139),'淡蒼球外節と内節',23,TEAL,True)
            full=fitted(image,(210,175));x=1005-full.width//2;y=173;im.paste(full,(x,y));k=full.width/image.width
            d.rectangle((x+box[0]*k,y+box[1]*k,x+box[2]*k,y+box[3]*k),outline=RED,width=2)
            text(d,(787,350),f'水平断 Z{z} / 左 L・右 R・上 A・下 P',17,MUTED)
            zoom=fitted(image.crop(box),(425,165));im.paste(zoom,(1005-zoom.width//2,382))
            text(d,(787,559),'緑：GPe（外節）  黄：GPi（内節）',19,TEAL)
            text(d,(787,594),'位置の観察用。図の接続線は模式です。',17,MUTED)
        else:
            end=block(d,(787,153),NOTES[s['kind']],23,433,gap=10)
            if end>616:raise ValueError(f'Notes overflow: {s["kind"]}')
    d.rectangle((0,639,W,H),fill='#091d23');lines=wrap(s['caption'],26,1180)
    if len(lines)>2:raise ValueError('Caption overflow')
    for i,line in enumerate(lines):text(d,(45,651+i*32),line,26)
    d.rectangle((0,716,int(W*elapsed/TOTAL),719),fill=TEAL);return im

def package(out,timeline):
    def stamp(s):return f'00:{s//60:02}:{s%60:02}.000'
    (out/'captions-ja.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{stamp(s["start"])} --> {stamp(s["end"])}\n{s["caption"]}' for s in timeline)+'\n',encoding='utf-8')
    for name in ['BIGBRAIN-DATA-LICENSE.txt','BIGBRAIN-MANUAL-LICENSE.txt']:shutil.copyfile(ROOT/'public/atlas'/name,out/name)
    chapters=''.join(f'<button data-time="{s["start"]}">{stamp(s["start"])[3:8]} {html.escape(s["title"])}</button>' for s in timeline)
    transcript=''.join(f'<h3>{html.escape(s["title"])}</h3><p>{html.escape(s["caption"])}</p>' for s in timeline)
    page=f'''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>大脳基底核：抑制を順に読む | 脳実習ナビ</title><style>body{{margin:0;background:#102a30;color:#f3f2e9;font:16px/1.8 system-ui}}main{{max-width:1180px;margin:auto;padding:24px}}h1{{font-size:clamp(24px,4vw,36px)}}video{{width:100%;background:#091d23}}a{{color:#83d0bd}}nav{{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}}button{{font:inherit;color:inherit;background:#284c49;border:1px solid #638880;border-radius:6px;padding:8px 12px;min-height:44px;cursor:pointer}}details{{padding:16px 0;border-top:1px solid #507176}}summary{{cursor:pointer;font-weight:700}}</style>
<main><p>脳実習ナビ / 教育用動画・試作</p><h1>大脳基底核回路：抑制を、順に読む</h1><p>{TOTAL//60}分{TOTAL%60:02}秒・日本語字幕・音声なし。直接路・間接路・ハイパー直接路を、同じ図で見比べます。</p><video controls playsinline preload="metadata" poster="proof-03.jpg" aria-label="大脳基底核回路の教材動画"><source src="basal-ganglia-ja.mp4" type="video/mp4"><track kind="captions" src="captions-ja.vtt" srclang="ja" label="日本語（画面にも表示）"></video><nav aria-label="動画の章へ移動">{chapters}</nav><p><a href="basal-ganglia-ja.mp4" download>MP4を保存</a> · <a href="basal-ganglia-package.zip" download>出典・字幕込みZIP</a> · <a href="storyboard.jpg">場面一覧</a></p><p>＋は興奮性、−は抑制性結合です。赤い点は説明中の接続を示し、発火率や活動量・速度を表しません。運動ループの主要結合を示す模式図で、並列チャネル・局所回路・ドパミン作用の細部は省略しています。</p>
<details><summary>字幕を文章で読む</summary>{transcript}</details><details><summary>出典・加工内容・利用条件</summary><ul><li>解説：James Knierim, <a href="https://nba.uth.tmc.edu/neuroscience/s3/chapter04.html">UTHealth Neuroscience Online — Basal Ganglia</a>、Purves et al., <a href="https://www.ncbi.nlm.nih.gov/books/NBK10847/">Circuits within the Basal Ganglia System</a>、Lanciego et al. (2012), <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC3543080/">Functional Neuroanatomy of the Basal Ganglia</a>。文章・図の転載なし。</li><li>組織像：Amunts, Zilles, Evans et al., <a href="https://bigbrainproject.org/">BigBrain</a> / CC BY-NC-SA 4.0。淡蒼球ラベル：Yiming Xiao and collaborators, McConnell Brain Imaging Centre, McGill University, <a href="https://nist.mni.mcgill.ca/multi-contrast-pd25-atlas/">BigBrain co-registration with PD25 and ICBM152</a> / CC BY 4.0。基のBigBrain条件も保持。<a href="BIGBRAIN-DATA-LICENSE.txt">BigBrain notice</a>、<a href="BIGBRAIN-MANUAL-LICENSE.txt">手動ラベルnotice</a>。</li><li>既存0.5 mm派生画像・既存ラベルから断面抽出、色調整、着色、拡大。分節は変更していません。図上のGPi／SNrは機能上の出力核のまとめで、単一の実標本ラベルではありません。</li><li>動画・構成・模式図・字幕：© 2026 脳実習ナビ contributors / <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>。再配布時は出典と原noticeを併せてください。提供元の推奨・承認を意味しません。</li></ul><p>教育目的限定。臨床・手術計画・定量研究には使えません。専門家監修・学習効果の検証は未実施です。</p><a href="inputs.json">入力SHA-256</a> · <a href="timeline.json">構成とタイミング</a></details></main><script>const v=document.querySelector('video');document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{{v.currentTime=Number(b.dataset.time);v.play();v.focus();}});</script></html>'''
    (out/'index.html').write_text(page,encoding='utf-8')

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--proof-only',action='store_true');args=ap.parse_args();OUT.mkdir(parents=True,exist_ok=True)
    asset=specimen(OUT);timeline=[];start=0;proofs=[]
    for i,s in enumerate(SCENES):
        timeline.append(dict(s,start=start,end=start+s['seconds']));im=frame(s,4,start+4,asset);im.save(OUT/f'proof-{i:02}.jpg',quality=92);proofs.append(im.resize((640,360)));start+=s['seconds']
    sheet=Image.new('RGB',(1280,360*math.ceil(len(proofs)/2)),BG)
    for i,im in enumerate(proofs):sheet.paste(im,(i%2*640,i//2*360))
    sheet.save(OUT/'storyboard.jpg',quality=92);(OUT/'timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2),encoding='utf-8')
    files=[ROOT/'public/atlas/bigbrain-icbm500.bin.gz',ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',ROOT/'src/circuitTeaching.mjs',Path(__file__)]
    (OUT/'inputs.json').write_text(json.dumps({str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},indent=2),encoding='utf-8');package(OUT,timeline)
    if args.proof_only:return
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'basal-ganglia-ja.mp4')]
    with (OUT/'encode.log').open('w') as log:
        p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
        for s in timeline:
            print(s['title'],flush=True)
            for n in range(s['seconds']*FPS):p.stdin.write(frame(s,n/FPS,s['start']+n/FPS,asset).tobytes())
        p.stdin.close()
        if p.wait():raise RuntimeError('Encoder failed')
    with zipfile.ZipFile(OUT/'basal-ganglia-package.zip','w',zipfile.ZIP_DEFLATED) as z:
        for f in OUT.iterdir():
            if f.suffix not in {'.zip','.log'}:z.write(f,f.name)
    print(json.dumps({'seconds':TOTAL,'bytes':(OUT/'basal-ganglia-ja.mp4').stat().st_size}),flush=True)

if __name__=='__main__':sys.stdout.reconfigure(encoding='utf-8');main()
