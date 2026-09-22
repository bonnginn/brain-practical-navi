#!/usr/bin/env python3
"""Collect the local teaching films without changing app/public assets."""
from pathlib import Path
import html, json, shutil, zipfile
from teaching_video_review import review_cards, review_sheet, REVIEW_CSS

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'work/teaching-video-library'
FILMS=[
 ('surface','work/observation-videos/surface','中心溝の前と後','1分12秒','中心溝を目印に、中心前回と中心後回を見比べる。','proof-01.jpg','#workspace/surface/lateral'),
 ('sections','work/observation-videos/sections','脳室を目印に冠状断を読む','1分12秒','断面を動かし、脳室と視床の位置関係を追う。','proof-03.jpg','#workspace/sections/coronal'),
 ('papez','work/papez-video','Papez回路をたどる','2分06秒','中継する灰白質と、つなぐ白質路を分けて学ぶ。','proof-01.jpg','#workspace/surface/free'),
 ('visual','work/visual-pathway-video','視野と眼を分けて、視覚路をたどる','1分58秒','鼻側網膜の交叉と耳側網膜の非交叉を追う。','proof-01.jpg','#workspace/surface/free'),
 ('basal','work/basal-ganglia-video','大脳基底核回路：抑制を、順に読む','1分54秒','興奮性・抑制性の符号を残し、直接路と間接路を比べる。','proof-03.jpg','#workspace/surface/free'),
]

def main():
    OUT.mkdir(parents=True,exist_ok=True);cards=[];manifest=[]
    reviews=json.loads((ROOT/'scripts/teaching_video_review.json').read_text(encoding='utf-8'))
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
        questions=reviews[key]
        if any(q['time'] not in {scene['start'] for scene in timeline} for q in questions):
            raise ValueError(f'Review targets an unknown chapter: {key}')
        # Native controls can cover burned-in captions when paused. Keep a readable
        # copy outside the video, without announcing every playback update.
        controls='<div class="filmStudyControls"><div><button id="film-previous" type="button">前の章へ</button><button id="film-replay" type="button">この章を最初から</button><button id="film-next" type="button">次の章へ</button></div><label><input id="film-pause-at-chapter" type="checkbox">章の終わりで一時停止</label><label>再生速度 <select id="film-speed"><option value="0.75">0.75倍</option><option value="1" selected>1倍</option><option value="1.25">1.25倍</option></select></label><p id="film-playback-status" role="status"></p></div>'
        page=page.replace('</video>','</video><section class="currentFilmCaption" aria-label="現在の場面と字幕" aria-live="off"><strong></strong><p></p></section>'+controls+'<p><a href="#film-review-title">3つの問いで振り返る ↓</a> · <a href="review.html">印刷用の振り返り</a></p>',1)
        page=page.replace('</style>','.currentFilmCaption{border-left:4px solid #83d0bd;background:#19363e;padding:12px 16px;margin:12px 0;line-height:1.7}.currentFilmCaption p{margin:6px 0 0}button[aria-current=true]{outline:2px solid #83d0bd;outline-offset:2px}.filmStudyControls,.filmStudyControls>div{display:flex;gap:8px 18px;flex-wrap:wrap;align-items:center}.filmStudyControls>div{width:100%;gap:8px}.filmStudyControls label{display:flex;gap:8px;align-items:center;min-height:44px}.filmStudyControls input{width:20px;height:20px}.filmStudyControls select{font:inherit;padding:6px;background:#19363e;color:inherit;min-height:44px}button{min-height:44px}button:disabled{opacity:.45;cursor:default}.filmStudyControls p{width:100%;margin:0}.filmStudyControls p:empty{display:none}</style>',1)
        payload=json.dumps(timeline,ensure_ascii=False).replace('<','\\u003c')
        player=(ROOT/'scripts/teaching_video_player.js').read_text(encoding='utf-8')
        page=page.replace('</html>','<script id="film-timeline" type="application/json">'+payload+'</script><script>'+player+'</script></html>',1)
        page=page.replace('</style>',REVIEW_CSS+'</style>',1)
        page=page.replace('</main>',review_cards(questions)+'</main>',1)
        (target/'review.html').write_text(review_sheet(title,questions),encoding='utf-8')
        circuit_names={'papez':'Papez回路','visual':'視覚路','basal':'大脳基底核回路'}
        observation='自由観察で「'+circuit_names[key]+'」を選ぶ' if key in circuit_names else '教材で位置を確かめる'
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
<main><p>脳実習ナビ / LOCAL TEACHING FILMS</p><h1>短い動画で、観察の手がかりをつかむ</h1><p class="intro">まず動画で見方を確認し、途中で一時停止して自分で説明してみましょう。その後、教材の3Dや断面に戻って、同じ構造を探します。各ページに章移動、字幕全文、3つの確認の問いと解説、印刷用の振り返り、保存用ファイルがあります。</p><div class="films">CARDS</div>
<details><summary>動画の位置づけと出典</summary><p>教育用の試作です。模式図と標本由来画像を区別しています。専門家監修・学習効果の検証は未実施です。診断・治療・手術計画・定量研究には使用できません。</p><p>出典・加工内容・原noticeは各動画ページと持ち出し用ZIPに同梱しています。元の書籍や論文の図は転載していません。動画を再配布する場合は、対応する出典と利用条件も併せてください。</p></details><footer>自動再生・外部送信・新しい視聴履歴の保存はありません。アプリ本体への組込み・公開はまだ行っていません。</footer></main></html>'''.replace('CARDS',''.join(cards))
    (OUT/'index.html').write_text(page,encoding='utf-8');(OUT/'library.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'{len(FILMS)} films collected in {OUT}')

if __name__=='__main__':main()
