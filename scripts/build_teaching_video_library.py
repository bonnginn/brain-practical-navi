#!/usr/bin/env python3
"""Collect the local teaching films without changing app/public assets."""
from pathlib import Path
import html, json, shutil, zipfile

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'work/teaching-video-library'
FILMS=[
 ('surface','work/observation-videos/surface','中心溝の前と後','1分12秒','中心溝を目印に、中心前回と中心後回を見比べる。','proof-01.jpg','#workspace/surface/lateral'),
 ('sections','work/observation-videos/sections','脳室を目印に冠状断を読む','1分12秒','断面を動かし、脳室と視床の位置関係を追う。','proof-03.jpg','#workspace/sections/coronal'),
 ('papez','work/papez-video','Papez回路をたどる','2分06秒','中継する灰白質と、つなぐ白質路を分けて学ぶ。','proof-01.jpg','#workspace/surface/free'),
 ('visual','work/visual-pathway-video','視野と眼を分けて、視覚路をたどる','1分58秒','鼻側網膜の交叉と耳側網膜の非交叉を追う。','proof-01.jpg','#workspace/surface/free'),
]

def main():
    OUT.mkdir(parents=True,exist_ok=True);cards=[];manifest=[]
    for key,source,title,duration,goal,poster,route in FILMS:
        src=ROOT/source;target=OUT/key
        if not list(src.glob('*.mp4')):raise FileNotFoundError(f'Film is not ready: {source}')
        target.mkdir(exist_ok=True)
        for file in src.iterdir():
            if file.is_file() and file.suffix in {'.html','.mp4','.vtt','.json','.txt','.jpg','.png','.zip'}:shutil.copyfile(file,target/file.name)
        page=(target/'index.html').read_text(encoding='utf-8')
        # Only the collected playback page gets this navigation; originals stay intact.
        back='<a href="../">動画一覧</a>'
        if back not in page:page=page.replace('<main>','<main><p>'+back+'</p>',1)
        timeline=json.loads((src/'timeline.json').read_text(encoding='utf-8'))
        # Native controls can cover burned-in captions when paused. Keep a readable
        # copy outside the video, without announcing every playback update.
        page=page.replace('</video>','</video><section class="currentFilmCaption" aria-label="現在の場面と字幕" aria-live="off"><strong></strong><p></p></section>',1)
        page=page.replace('</style>','.currentFilmCaption{border-left:4px solid #83d0bd;background:#19363e;padding:12px 16px;margin:12px 0;line-height:1.7}.currentFilmCaption p{margin:6px 0 0}button[aria-current=true]{outline:2px solid #83d0bd;outline-offset:2px}</style>',1)
        caption_script='''<script>(()=>{const video=document.querySelector('video'),box=document.querySelector('.currentFilmCaption'),scenes=TIMELINE;let previous=-1;function update(){let i=scenes.findIndex(s=>video.currentTime>=s.start&&video.currentTime<s.end);if(i<0)i=video.currentTime>=scenes[scenes.length-1].end?scenes.length-1:0;if(i===previous)return;previous=i;box.querySelector('strong').textContent=scenes[i].title;box.querySelector('p').textContent=scenes[i].caption;document.querySelectorAll('[data-time]').forEach(b=>{if(Number(b.dataset.time)===scenes[i].start)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')});}video.addEventListener('timeupdate',update);video.addEventListener('seeked',update);update();})();</script>'''
        page=page.replace('</html>',caption_script.replace('TIMELINE',json.dumps(timeline,ensure_ascii=False).replace('<','\\u003c'))+'</html>',1)
        observation='自由観察で「'+('Papez回路' if key=='papez' else '視覚路')+'」を選ぶ' if key in {'papez','visual'} else '教材で位置を確かめる'
        page=page.replace('</main>',f'<p><a href="https://bonnginn.github.io/brain-practical-navi/{route}" target="_blank" rel="noreferrer">{observation}（公開β） ↗</a></p></main>',1)
        (target/'index.html').write_text(page,encoding='utf-8')
        for archive in target.glob('*.zip'):
            with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as bundle:
                for asset in target.iterdir():
                    if asset.is_file() and asset.suffix not in {'.zip','.log'}:
                        if asset.name=='index.html':bundle.writestr(asset.name,page.replace(back,''))
                        else:bundle.write(asset,asset.name)
        cards.append(f'<article><a href="{key}/"><img src="{key}/{poster}" alt=""><h2>{html.escape(title)}</h2></a><p class="duration">{duration} · 日本語字幕 · 音声なし</p><p>{html.escape(goal)}</p><a class="action" href="{key}/">動画・章・字幕を開く →</a></article>')
        manifest.append(dict(key=key,title=title,source=source,duration=duration))
    page='''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>脳実習ナビ：短い教材動画</title>
<style>body{margin:0;background:#102a30;color:#f3f2e9;font:17px/1.8 system-ui}main{max-width:1100px;margin:auto;padding:clamp(16px,4vw,36px)}h1{font-size:clamp(25px,4vw,38px);line-height:1.4}h2{font-size:23px;line-height:1.4;margin:12px 0}a{color:#9ae3cf}a:focus-visible{outline:3px solid #a9e8d8;outline-offset:4px}.films{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:22px;margin:28px 0}article{min-width:0;border:1px solid #507176;border-radius:12px;padding:18px;background:#19363e}article img{display:block;width:100%;aspect-ratio:16/9;border-radius:6px}article p{margin:10px 0}.duration{font-size:15px;color:#b9d0cc}.action{display:inline-block;padding:8px 0;min-height:28px}.intro{max-width:850px}details{border-top:1px solid #507176;padding:16px 0}summary{cursor:pointer;font-weight:700}footer{font-size:15px;color:#b9d0cc}</style>
<main><p>脳実習ナビ / LOCAL TEACHING FILMS</p><h1>短い動画で、観察の手がかりをつかむ</h1><p class="intro">まず動画で見方を確認し、途中で一時停止して自分で説明してみましょう。その後、教材の3Dや断面に戻って、同じ構造を探します。各ページに章移動、字幕全文、保存用ファイルがあります。</p><div class="films">CARDS</div>
<details><summary>動画の位置づけと出典</summary><p>教育用の試作です。模式図と標本由来画像を区別しています。専門家監修・学習効果の検証は未実施です。診断・治療・手術計画・定量研究には使用できません。</p><p>出典・加工内容・原noticeは各動画ページと持ち出し用ZIPに同梱しています。元の書籍や論文の図は転載していません。動画を再配布する場合は、対応する出典と利用条件も併せてください。</p></details><footer>自動再生・外部送信・新しい視聴履歴の保存はありません。アプリ本体への組込み・公開はまだ行っていません。</footer></main></html>'''.replace('CARDS',''.join(cards))
    (OUT/'index.html').write_text(page,encoding='utf-8');(OUT/'library.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(FILMS)} films collected in {OUT}')

if __name__=='__main__':main()
