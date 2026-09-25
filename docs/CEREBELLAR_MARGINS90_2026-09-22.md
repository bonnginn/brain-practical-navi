# 小脳葉の局所的な塗り残し補完 — 2026-09-22

ユーザーの「30分くらい、細かいsegmentationも少し」の追加許可により、既存の小脳葉4局所を対象に90点をローカル採用した。主要構造を追加する変更ではなく、葉の縁の小修正。専門家確認ではない。公開更新はしていない。

## 変更と根拠

- 背景→左小脳 ID28：71点。背景→右小脳 ID29：19点。
- 範囲：アプリ格子 Y171–179、X167–222、Z47–60の4局所。範囲全体の塗りつぶしではない。
- 左小脳736,104→736,175点、右小脳725,042→725,061点。
- 登録300 µm原画像の冠状断9面と、候補を覆う矢状23面・水平13面を、原画像／現行輪郭／候補の並列図で確認。小脳葉の連続した組織と、その周囲の暗い葉間裂を区別した。
- 既存197点補完の内部候補より縁寄りの部分体積を扱うため、今回の濃淡抽出は9標本点が50,000未満を候補の位置決めにのみ利用。濃淡だけでは採用せず、3方向の葉状形態を照合した。脳幹の再分類や葉間裂の充填は行っていない。
- 91候補のうち `[216,177,47]` は新たな孤立成分になるため保留。連結のための補間はしない。以前の5保留点についても全体を採用した扱いにはしない。
- Y165–170／180–184の隣接範囲も既存方式で候補を抽出したが、それぞれ3点／1点にとどまり未採用。これを新たな成果点数に含めない。

原画像・比較図・候補・復元データは `work/cerebellum-folia-margins-20260922/` に保存。冠状9図と直交9シート（36面）のSHAを採用記録に保持。元の `work/cerebellum-core-candidates-v1/` は変更していない。今回native100の追加取得・再調査はしていない。

## 同期・確認

- 入力SHA：`a0be53bb43f2316bd9100903d6e81ac65b23fe6830c3500cd18c4acba5883417`
- 出力SHA：`71eebaf135377bf8da9b121e6a7a510de8066c3ca9172cf02d32b55baa140a0a`
- [可逆採用記録](../segmentation-patches/review/cerebellar-margins90-adoption-2026-09-22.json)、[導入スクリプト](../scripts/install_cerebellar_margins90.py)。90点の順方向／逆方向再生と対象外不変を確認。
- 断面併設小脳3Dは0.5 mm格子から再構成。既存メッシュを先に再現して一致確認。6近傍成分数は51のまま、90点は既存主成分へ追加。
- 既存ブロック55部品中、後脳ブロックの小脳11格子のみ変更。残り54部品と微細脳室5部品は不変。現行の不透明標本は小脳ラベルを着色対象に使わず、標本本体は原画像と脳室除外から作るため形状不変。全既存部品SHAを確認して出典ラベル版だけ同期。
- ブラウザのラベル／メッシュcache用revisionと観察リンクの版を更新。
- 対象Node試験12/12成功（既存の可逆差分連鎖、現行集計、標本整合、メッシュURL）。通常build成功。全Node/Python、Pages build、型検査はこの局所データ修正では反復していない。
- 通常previewは4346/4347/4372/4373を更新。旧タブに旧版が残る場合は更新後に閉じて開き直す。
- 実ブラウザ4373で新revisionの観察リンクが適用されること、冠状断Y175で左右小脳の着色と併設3Dが表示されることを目視確認。描画エラーログなし。未変更のUIについて日英全画面確認は反復していない。

## English summary

Added 90 locally reviewed cerebellar folial-margin voxels (71 left, 19 right), using adjacent and orthogonal registered 300 µm images. One isolated candidate remains deferred. This is a small teaching-scale contour refinement, not complete segmentation or expert validation. The same-grid section surface and affected hindbrain block part are synchronized; all other label identities are unchanged. Local development only, not published.
