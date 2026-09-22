"""Small review cards and a printable companion for the local teaching films."""
from html import escape


def review_cards(questions):
    cards = []
    for number, item in enumerate(questions, 1):
        time = item['time']
        cards.append(f'''<article class="filmReviewCard"><h3>{number}. {escape(item['question'])}</h3>
<button type="button" data-review-time="{time}">{escape(item['scene'])}（{time//60}:{time%60:02d}・一時停止）</button>
<details><summary>考えてから、解説を開く</summary><p>{escape(item['answer'])}</p></details></article>''')
    return '''<section class="filmReview" aria-labelledby="film-review-title"><h2 id="film-review-title">見たあとに、自分の言葉で確かめる</h2>
<p>答えを開く前に、位置や経路を声に出す・紙に描くなどして説明してみましょう。場面へ戻るボタンは動画を一時停止した状態で開きます。</p>''' + ''.join(cards) + '''<p><a href="review.html">印刷用の問いと解説を開く →</a></p></section>'''


REVIEW_CSS = '''.filmReview{margin:30px 0;border-top:1px solid #507176;padding-top:12px}.filmReviewCard{border:1px solid #507176;border-radius:8px;padding:16px;margin:14px 0}.filmReviewCard h3{font-size:19px;line-height:1.65;margin:0 0 12px}.filmReviewCard details{margin-top:12px}.filmReviewCard summary{min-height:44px;display:list-item;align-content:center;cursor:pointer}.filmReviewCard details p{line-height:1.8;margin:10px 0 0}'''


def review_sheet(title, questions):
    prompts = ''.join(f'<article><h2>{i}. {escape(q["question"])}</h2><div class="writing-space" aria-label="紙に書くための空欄"></div></article>' for i, q in enumerate(questions, 1))
    answers = ''.join(f'<article><h2>{i}. {escape(q["question"])}</h2><p>{escape(q["answer"])}</p></article>' for i, q in enumerate(questions, 1))
    return f'''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)} — 振り返り</title>
<style>body{{margin:0;color:#182f32;background:#f4f3ee;font:17px/1.8 system-ui}}main{{max-width:850px;margin:auto;padding:24px}}h1{{font-size:27px;line-height:1.5}}h2{{font-size:19px;line-height:1.65}}a{{color:#126452}}button{{font:inherit;min-height:44px;padding:6px 18px;cursor:pointer}}article{{break-inside:avoid;margin:24px 0}}.writing-space{{height:95px;background:repeating-linear-gradient(transparent,transparent 31px,#c8d2cc 31px,#c8d2cc 32px)}}.answers{{border-top:2px solid #c8d2cc;margin-top:36px}}.notice{{font-size:14px}}@media print{{@page{{size:A4;margin:18mm}}body{{background:white;font-size:11pt;line-height:1.7}}main{{padding:0;max-width:none}}h1{{font-size:17pt}}h2{{font-size:12pt}}.screen-only{{display:none}}.writing-space{{height:28mm;border-bottom:1px solid #aaa;background:none}}article{{margin:5mm 0}}.answers{{break-before:page;border:0;margin:0}}.notice{{font-size:9pt}}}}</style>
<main><nav class="screen-only"><a href="index.html">動画へ戻る</a> · <button type="button" onclick="window.print()">問いと解説を印刷</button></nav>
<section><p>脳実習ナビ / 動画の振り返り</p><h1>{escape(title)}</h1><p>動画を見たあと、自分の言葉や簡単な図で説明してください。解説は次のページにあります。</p>{prompts}<p class="notice">教育用の自己確認です。回答の入力・保存・送信はありません。図や動画の出典・利用条件は、同梱の動画ページをご覧ください。</p></section>
<section class="answers"><h1>解説 — {escape(title)}</h1>{answers}<p class="notice">動画の範囲に合わせた簡略な解説です。表示モデルの限界と参考文献は動画ページに記載しています。</p></section></main></html>'''
