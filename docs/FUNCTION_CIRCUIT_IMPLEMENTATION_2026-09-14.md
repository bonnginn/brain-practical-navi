# 機能・回路教材の実装記録（2026-09-14）

## 結論

`FUNCTION_CIRCUIT_NEXT_INSTRUCTIONS_2026-09-14.md` の教材改善指示を実装した。断面画面では選択中構造の「主な役割」を詳細パネルを開かず確認できる。自由観察にはPapez回路、視覚路、大脳基底核回路の日本語・英語学習ガイドを追加した。

3回路は、学習目標、主な役割、常時見える概念図、段階ごとの役割と接続、標本で見る位置、表示限界、出典を同じ形式で示す。概念上の情報の流れと既存標本の観察順を別表示にした。未分節の核・線維束は概念図と文章だけで扱い、存在しないラベルやmeshを追加していない。

実装コミットは `de8f1c1`。main統合、push、公開更新は行っていない。

## 実装内容

- 断面の選択要約に、現在対象の構造名と既存 `structureFunctions` の本文を使う「主な役割」を常時表示した。
- 複数表示では現在対象に追従し、対象を非表示にすると残る先頭構造へ移る。表示可能構造が0件のときは名称・役割・色を消し、詳細ボタンを無効化する。
- Papez回路は、海馬体→脳弓→乳頭体→乳頭視床路→視床前部核→帯状回→帯状束→海馬傍回・嗅内野→海馬体の古典的簡略図を示す。乳頭視床路と帯状束は未収録、視床前部核は未分節、脳弓は模式3D、皮質はアトラス対応であることを各段階に表示する。
- 視覚路は、網膜→視神経→視交叉→視索→外側膝状体→視放線→V1を示す。鼻側網膜線維の交叉、耳側網膜線維の同側走行、各視索が反対側視野を運ぶ関係を説明する。現行の交叉・視索・視放線は模式表示であり、LGNとV1も実標本の確定分節ではないことを明示する。
- 大脳基底核は、直接路・間接路・ハイパー直接路を分岐表示し、＋を興奮性、−を抑制性として示す。GPi/SNrを概念上の出力核として扱いつつ、現行黒質ラベルがSNr/SNcを分けないこと、視床の運動関連核を独立分節していないことを表示する。
- 概念図の段階選択はキーボード操作できる。既存標本に対応がある段階だけ「標本で見る」を表示し、Papez・基底核では既存ステッパーへ、視覚路では既存の自由観察対象へ接続する。
- 参考文献4件を日英のブラウザ参考文献にも追加した。

## 可変フォント

追加要望に基づき、1440px以上では従来値を維持し、狭いブラウザ幅では `clamp()` で主要文字を連続的に縮小する。代表的な16px本文は1440pxで16px、1100pxで約15.03px、900pxで約14.46px、760pxで約14.06px、520pxで約13.37px、390pxで13pxになる。補助文は12pxを下限とし、タップ対象の寸法は縮めていない。回路ガイドも同じ変数を使う。

## 根拠

- [UTHealth Neuroanatomy Online — Limbic system](https://nba.uth.tmc.edu/neuroanatomy/L11/Lab11p06_index.html)
- [NCBI Bookshelf — Neuroanatomy, Limbic System](https://www.ncbi.nlm.nih.gov/books/NBK538491/)
- [NCBI Bookshelf — Neuroanatomy, Visual Pathway](https://www.ncbi.nlm.nih.gov/books/NBK553189/)
- [NCBI Bookshelf — Circuits within the Basal Ganglia System](https://www.ncbi.nlm.nih.gov/books/NBK10847/)
- [Lanciego et al. (2012) — Functional neuroanatomy of the basal ganglia](https://pmc.ncbi.nlm.nih.gov/articles/PMC3543080/)

これらは機能・接続の教材本文を確認する資料であり、BigBrainの境界データとして転写していない。

## 検証

- 対象試験：回路データ3/3、選択構造要約2/2、日英参考文献2/2、関連表示97/97に成功
- Node全試験：607/607成功
- TypeScript型検査：成功
- 通常build：成功
- GitHub Pages形式build：成功
- 最終通常buildを `work/september14-function-circuit-preview` へ保存し、`http://127.0.0.1:4346/` で配信
- 実ブラウザ：Papez・視覚路・基底核の各概念図と段階切替、Papezの標本ステッパー、英語版、断面の役割追従を確認
- 390px：日本語・英語ともdocument横overflow 0、概念図と「標本で見る」のボタン高44px、UI error 0
- browser console warning/error：0
- ラベルSHA：`785ce199e2c7226e5527a771e953d1b78cfed1067179aa04c63b9eba74577e0f` のまま

分節・mesh・クイズ適格性を変更していないため、Python全試験は今回再実行していない。既存の500kB超chunk警告は従来どおりで、新規build失敗ではない。

## 残る範囲

597点、水道両端、第四脳室下方、脳弓、視交叉・視索、視放線、V・IX–XIの解剖境界・模式形状は、既存の保留条件を維持する。今回の概念図はこの保留を解消したものではない。新しい原画像根拠または専門家判断を得た場合だけ、既存の図付き記録から一件ずつ再開する。
