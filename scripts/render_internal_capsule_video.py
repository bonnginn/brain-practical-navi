#!/usr/bin/env python3
"""A short relational section lesson from unchanged teaching labels.

Software AGPL-3.0-or-later; authored video CC BY-NC-SA 4.0.
Source-specific notices are retained in the portable package.
"""
import argparse, hashlib, html, json, math, shutil, subprocess, sys, zipfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from render_papez_video import ROOT,W,H,FPS,BG,FG,MUTED,RED,TEAL,text,block,wrap,load_volume,section,fitted,imageio_ffmpeg
from render_observation_videos import raw_rgb

OUT=ROOT/'work/internal-capsule-video'
GROUPS=[('尾状核',[7,8],(255,164,101)),('被殻',[9,10],(174,149,237)),('淡蒼球',[11,12,13,14],(239,152,172)),('視床',[15,16],(107,211,207)),('内包',[31,32],(255,225,112))]
# Representative levels selected from the current teaching volume, not new boundaries.
LEVELS={'horizontal':('horizontal',.59),'anterior':('coronal',.58),'posterior':('coronal',.52)}
SCENES=[
 dict(seconds=8,title='内包を、周囲の核から見つける',caption='内包は白質の通り道です。まず水平断で全体の向きと、内側・外側の目印を見ます。',view='horizontal',mode='raw',note='水平断を上から読む\n\n画面左 L / 画面右 R\n上が前 A / 下が後 P\n\n脳の正中を基準に\n内側と外側を考えます。'),
 dict(seconds=10,title='01  先に、周囲の灰白質を探す',caption='尾状核と視床、外側のレンズ核を見比べます。被殻と淡蒼球を合わせたものがレンズ核です。',view='horizontal',mode='nuclei',note='橙：尾状核\n青緑：視床\n\n紫：被殻\n桃：淡蒼球\n\n被殻 ＋ 淡蒼球\n      ＝ レンズ核'),
 dict(seconds=12,title='02  前脚：尾状核頭とレンズ核の間',caption='前方では、尾状核頭の外側とレンズ核の内側の間に、内包の前脚があります。',view='horizontal',mode='all',note='前方の白質の帯を探す\n\n内側：尾状核頭\n       ↓\n     内包前脚\n       ↓\n外側：レンズ核'),
 dict(seconds=12,title='03  後脚：視床とレンズ核の間',caption='後方では、内包の後脚を挟んで、内側に視床、外側にレンズ核が位置します。',view='horizontal',mode='all',note='後方の白質の帯を探す\n\n内側：視床\n       ↓\n     内包後脚\n       ↓\n外側：レンズ核'),
 dict(seconds=8,title='04  前脚と後脚の間が「膝」',caption='内包の前脚と後脚が折れ曲がってつながる部分を膝と呼びます。正中に近い曲がりを探しましょう。',view='horizontal',mode='all',note='前脚 → 膝 → 後脚\n\n膝は、二つの脚の間で\n内側へ曲がる部分です。\n\n黄色は内包の全体表示。\n脚別に分節した色では\nありません。'),
 dict(seconds=10,title='05  冠状断：前方では尾状核と見比べる',caption='冠状断に切り替えます。尾状核とレンズ核の間の白質を、水平断で見た位置と結びつけます。',view='anterior',mode='all',note='冠状断の前方の例\n\n内側に尾状核\n外側にレンズ核\n\n上 S / 下 I\n左 L / 右 R'),
 dict(seconds=10,title='06  後方へ進むと、視床が目印になる',caption='少し後ろの冠状断では、視床の外側を内包が通ります。一枚だけでなく、隣の断面と比べます。',view='posterior',mode='all',note='冠状断の後方の例\n\n正中側の視床を探す\nその外側の内包を追う\n\n同じ構造でも、切る位置で\n見える形が変わります。'),
 dict(seconds=10,title='07  内包は、上り下りの線維が通る白質',caption='内包には皮質と視床を結ぶ線維や、皮質から脳幹・脊髄へ下る線維などが通ります。',view='horizontal',mode='capsule',note='皮質と視床を結ぶ線維\n\n皮質から下行する線維\n\n一本の神経や、ひとつの核\nではありません。\n\nこの色から個々の線維束は\n区別できません。'),
 dict(seconds=8,title='色を外して、位置を説明してみよう',caption='前脚の内側にある核は？ 後脚の内側は？ レンズ核をつくる二つの構造は何でしょうか？',view='horizontal',mode='raw',note='一時停止して考える\n\n① 前脚の内側は？\n② 後脚の内側は？\n③ レンズ核の構成は？\n\n図を指して説明しましょう。'),
 dict(seconds=10,title='答え合わせ：名前と位置を結びつける',caption='前脚の内側は尾状核頭、後脚の内側は視床。レンズ核は被殻と淡蒼球です。',view='horizontal',mode='all',note='前脚の内側：尾状核頭\n\n後脚の内側：視床\n\n外側のレンズ核\n  ＝ 被殻 ＋ 淡蒼球\n\n内包を挟む関係で覚える。'),
 dict(seconds=8,title='出典と、次の観察へ',caption='アプリでも水平断と冠状断を切り替え、内包の両側にある構造を確かめてみましょう。',view='horizontal',mode='raw',note='',credits=True),
]
TOTAL=sum(s['seconds'] for s in SCENES)

def specimens(out):
    raw=load_volume(ROOT/'public/atlas/bigbrain-icbm500.bin.gz',b'BBV1')
    seg=load_volume(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',b'BBS1')
    if raw.shape!=seg.shape:raise ValueError('Grid mismatch')
    result={};manifest={}
    for key,(plane,p) in LEVELS.items():
        r=section(raw,plane,p);labels=section(seg,plane,p);base=raw_rgb(r)
        yy,xx=np.where(np.isin(labels,list(range(7,17))+[31,32]))
        box=(max(0,int(xx.min())-16),max(0,int(yy.min())-16),min(r.shape[1],int(xx.max())+17),min(r.shape[0],int(yy.max())+17))
        index=round((1-p)*(raw.shape[2]-1)) if plane=='horizontal' else round(p*(raw.shape[1]-1))
        manifest[key]={'plane':plane,'position':p,'sliceIndex':index,'cropBox':box}
        for mode in ['raw','nuclei','all','capsule']:
            rgb=base.copy()
            for name,ids,color in GROUPS:
                if mode=='raw' or (mode=='nuclei' and name=='内包') or (mode=='capsule' and name!='内包'):continue
                mask=np.isin(labels,ids);rgb[mask]=rgb[mask]*.25+np.array(color)*.75
            im=Image.fromarray(np.clip(rgb,0,255).astype('uint8'))
            result[(key,mode)]=(im,box,index)
        result[(key,'raw')][0].save(out/f'{key}-raw.png')
    (out/'sections.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    return result

def frame(s,t,elapsed,assets):
    im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
    text(d,(40,22),'脳実習ナビ / 断面のミニレッスン',18,TEAL,True)
    text(d,(40,60),s['title'],32,FG,True)
    if s.get('credits'):
        lines=['解説：UTHealth Neuroanatomy Online — Internal Capsule',
          '組織像：BigBrain / Amunts, Zilles, Evans et al. / CC BY-NC-SA 4.0',
          '核のラベル：Yiming Xiao and collaborators / McGill / CC BY 4.0',
          '内包：BigBrain画像・CerebrA白質確率等からの既存の教育用候補',
          'CerebrA：Manera et al. (2020) / MNI licence',
          '加工：既存0.5 mm派生画像の抽出・色調整・着色・拡大',
          '動画・字幕：脳実習ナビ contributors (2026) / CC BY-NC-SA 4.0',
          '教育用・専門家未監修。詳細と原noticeは付属ページに掲載。']
        for i,line in enumerate(lines):text(d,(45,160+i*51),line,23)
    else:
        full,box,index=assets[(s['view'],s['mode'])];plane=LEVELS[s['view']][0]
        zoom=fitted(full.crop(box),(745,435));im.paste(zoom,(405-zoom.width//2,170+(435-zoom.height)//2))
        text(d,(405,135),'前 A' if plane=='horizontal' else '上 S',22,TEAL,anchor='mm')
        text(d,(405,615),'後 P' if plane=='horizontal' else '下 I',22,TEAL,anchor='mm')
        text(d,(34,390),'L',22,TEAL);text(d,(772,390),'R',22,TEAL)
        thumb=fitted(assets[(s['view'],'raw')][0],(195,180));x=1010-thumb.width//2;y=125;im.paste(thumb,(x,y));k=thumb.width/full.width
        d.rectangle((x+box[0]*k,y+box[1]*k,x+box[2]*k,y+box[3]*k),outline=RED,width=2)
        text(d,(824,312),f'{"水平断 Z" if plane=="horizontal" else "冠状断 Y"}{index} / 赤枠を拡大',18,TEAL)
        if block(d,(824,350),s['note'],22,420,gap=8)>630:raise ValueError('Notes overflow')
        # Constant colour key; names remain visible even during the uncoloured recall.
        for i,(name,ids,color) in enumerate(GROUPS):
            x=48+i*147;d.ellipse((x,111,x+12,123),fill=color);text(d,(x+19,106),name,18,MUTED)
    d.rectangle((0,640,W,H),fill='#091d23');lines=wrap(s['caption'],26,1180)
    if len(lines)>2:raise ValueError('Caption overflow')
    for i,line in enumerate(lines):text(d,(45,651+i*32),line,26)
    d.rectangle((0,716,int(W*elapsed/TOTAL),719),fill=TEAL)
    return im

def package(out,timeline):
    def stamp(s):return f'00:{s//60:02}:{s%60:02}.000'
    (out/'captions-ja.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{stamp(s["start"])} --> {stamp(s["end"])}\n{s["caption"]}' for s in timeline)+'\n',encoding='utf-8')
    for name in ['BIGBRAIN-DATA-LICENSE.txt','BIGBRAIN-MANUAL-LICENSE.txt','LICENSE.txt']:shutil.copyfile(ROOT/'public/atlas'/name,out/name)
    chapters=''.join(f'<button data-time="{s["start"]}">{stamp(s["start"])[3:8]} {html.escape(s["title"])}</button>' for s in timeline)
    transcript=''.join(f'<h3>{html.escape(s["title"])}</h3><p>{html.escape(s["caption"])}</p>' for s in timeline)
    page=f'''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>内包を周囲の核から見つける | 脳実習ナビ</title><style>body{{margin:0;background:#102a30;color:#f3f2e9;font:16px/1.8 system-ui}}main{{max-width:1180px;margin:auto;padding:24px}}h1{{font-size:clamp(24px,4vw,36px)}}video{{width:100%;background:#091d23}}a{{color:#83d0bd}}nav{{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0}}button{{font:inherit;color:inherit;background:#284c49;border:1px solid #638880;border-radius:6px;padding:8px 12px;min-height:44px;cursor:pointer}}details{{padding:16px 0;border-top:1px solid #507176}}summary{{cursor:pointer;font-weight:700}}</style>
<main><p>脳実習ナビ / 教育用動画・試作</p><h1>内包を、周囲の核から見つける</h1><p>{TOTAL//60}分{TOTAL%60:02}秒・日本語字幕・音声なし。水平断と冠状断を、周囲の核を目印に見比べます。</p><video controls playsinline preload="metadata" poster="proof-02.jpg" aria-label="内包と周囲の核の教材動画"><source src="internal-capsule-ja.mp4" type="video/mp4"><track kind="captions" src="captions-ja.vtt" srclang="ja" label="日本語（画面にも表示）"></video><nav aria-label="動画の章へ移動">{chapters}</nav><p><a href="internal-capsule-ja.mp4" download>MP4を保存</a> · <a href="internal-capsule-package.zip" download>出典・字幕込みZIP</a> · <a href="storyboard.jpg">場面一覧</a></p><p>内包の着色は既存の教育用候補全体です。前脚・膝・後脚や個々の線維束を別々に分節したものではありません。図中の前後左右は本人の解剖学的方向です。</p>
<details><summary>字幕を文章で読む</summary>{transcript}</details><details><summary>出典・加工内容・利用条件</summary><ul><li>解説：<a href="https://nba.uth.tmc.edu/neuroanatomy/L10/Lab10p01_index.html">UTHealth Neuroanatomy Online — Internal Capsule</a>。前脚・膝・後脚の位置、皮質と視床・下位への投射を照合。図と文章の転載はありません。</li><li>組織像：Amunts, Zilles, Evans et al., <a href="https://bigbrainproject.org/">BigBrain</a> / CC BY-NC-SA 4.0。核のラベル：Yiming Xiao and collaborators, McConnell Brain Imaging Centre, McGill University / CC BY 4.0。<a href="BIGBRAIN-DATA-LICENSE.txt">BigBrain notice</a>、<a href="BIGBRAIN-MANUAL-LICENSE.txt">手動ラベルnotice</a>。</li><li>内包ID31/32はBigBrain画像、CerebrA白質確率、近接核・脳室との位置制約から計算された本プロジェクトの既存教育用候補。CerebrA：Manera et al. (2020), <a href="https://doi.org/10.1038/s41597-020-0557-9">doi:10.1038/s41597-020-0557-9</a>。MNI licence / Louis Collins, McGill。<a href="LICENSE.txt">MNI notice</a>。</li><li>加工は既存0.5 mm派生画像の断面抽出・色調整・着色・拡大。左右の向きと元の縦横比を保持し、分節を追加・変更していません。選んだレベルと拡大範囲は<a href="sections.json">断面位置</a>、入力は<a href="inputs.json">SHA-256</a>に記録。</li><li>構成・動画・字幕：© 2026 脳実習ナビ contributors / <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>。再配布時は出典と原noticeを併せてください。提供元の推奨・承認を意味しません。</li></ul><p>教育用・専門家未監修。診断・治療・手術計画・定量研究には使用できません。</p></details></main><script>const v=document.querySelector('video');document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{{v.currentTime=Number(b.dataset.time);v.play();v.focus();}});</script></html>'''
    (out/'index.html').write_text(page,encoding='utf-8')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--proof-only',action='store_true');args=parser.parse_args();OUT.mkdir(exist_ok=True)
    assets=specimens(OUT);timeline=[];start=0;proofs=[]
    for i,s in enumerate(SCENES):
        timeline.append(dict(s,start=start,end=start+s['seconds']));im=frame(s,3,start+3,assets);im.save(OUT/f'proof-{i:02}.jpg',quality=92);proofs.append(im.resize((640,360)));start+=s['seconds']
    sheet=Image.new('RGB',(1280,360*math.ceil(len(proofs)/2)),BG)
    for i,im in enumerate(proofs):sheet.paste(im,(i%2*640,i//2*360))
    sheet.save(OUT/'storyboard.jpg',quality=92);(OUT/'timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2),encoding='utf-8')
    inputs=[ROOT/'public/atlas/bigbrain-icbm500.bin.gz',ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',ROOT/'src/sectionObservationGuides.ts',Path(__file__)]
    (OUT/'inputs.json').write_text(json.dumps({str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs},indent=2),encoding='utf-8');package(OUT,timeline)
    if args.proof_only:return
    cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'internal-capsule-ja.mp4')]
    with (OUT/'encode.log').open('w') as log:
        process=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
        for s in timeline:
            print(s['title'],flush=True)
            # Only the progress bar changes between frames; preserve a crisp static specimen.
            base=frame(s,0,s['start'],assets)
            for n in range(s['seconds']*FPS):
                im=base.copy();ImageDraw.Draw(im).rectangle((0,716,int(W*(s['start']+n/FPS)/TOTAL),719),fill=TEAL);process.stdin.write(im.tobytes())
        process.stdin.close()
        if process.wait():raise RuntimeError('Encoder failed')
    with zipfile.ZipFile(OUT/'internal-capsule-package.zip','w',zipfile.ZIP_DEFLATED) as bundle:
        for file in OUT.iterdir():
            if file.suffix not in {'.zip','.log'}:bundle.write(file,file.name)
    print(json.dumps({'seconds':TOTAL,'bytes':(OUT/'internal-capsule-ja.mp4').stat().st_size}),flush=True)

if __name__=='__main__':sys.stdout.reconfigure(encoding='utf-8');main()
