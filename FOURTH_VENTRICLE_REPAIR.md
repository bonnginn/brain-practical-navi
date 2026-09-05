# 第四脳室ラベルの混在修復候補 — 2026-09-05

## 最新：47 voxelを開発資産へ接続（2026-09-06、未公開）

旧unreviewed候補はそのまま保存し、別の `segmentation-patches/review/ventricle-classification-project-review-2026-09-06.json` を作成した。中脳水道16 voxelはユーザーの分類指示、前方31 voxelは自律修正指示下のAIによる原画像・連続断・直交断・全体位置の点検に基づく。reviewerは `ai-assisted-project-review-under-maintainer-direction`。**ユーザーが31 voxelを個別目視承認したという記録でも専門家レビューでもない**。開発版への限定採用であり、公開・main統合の承認ではない。

[draft PR27の記録](https://github.com/bonnginn/brain-practical-navi/pull/27#issuecomment-5553267106) を追加した。現時点では未commit/push。strict approved validatorを経て `work/anatomy-review/ventricle-classification-adoption-v1/labels.bin.gz` を出力し、圧縮SHA `930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7`。`apply_approved_ventricle_classification_patch` は正確な47座標と変化先を固定し、全検査後だけ反映する。実採用JSONによるstageテスト1/1で全47箇所、第四脳室8,520／部分水道16、Z114不変、完全復元を確認した。

生成スクリプトのmain処理へ47 stageを接続し、開発assetsのvolumeと版定数を更新した（git mainへの統合ではない）。`install_ventricle_classification.py` は旧履歴fixtureから正確な差分だけを再構成し、新旧SHA以外の現行資産を上書きしない。元NIfTI入力の全処理を再実行したという意味ではない。`audit_practical_reconstruction.py` は現在のラベル生成本体を実行し、全ラベル差異0・raw SHA一致を `work/anatomy-review/practical-reconstruction-v2.json` に記録した。旧16単独stageは準備履歴であり、新47stageと重複適用しない。下記の未採用記載は個別候補を作った時点の履歴。

乳頭体・視覚路の数値監査を新volumeで再生成し、2026-09-06付の別JSONへ保存した。旧記録は変更していない。ID41はクリック同定で部分候補の説明を日英表示し、通常構造一覧／クイズには追加しない。第四脳室の説明は削除済みの前方小片と未確定の上方2 voxelを区別する。対象Nodeテスト93/93・TypeScript成功。統合後の実ブラウザ確認と全体テストは別途記録する。

`audit_classification_block_meshes.py` により全55パーツの旧新マスクを比較した。第四脳室だけ1 mm格子で6 voxel変化し、他54パーツは不変。旧第四脳室meshをSHA `e4276e536ad9cacc2dd9f1713c7410fdc349398b09214d5eb14dafe088f73fef` まで完全再現してから、当該mesh1点とmetadataだけを更新した。新SHA `1cfc2dade80d86c041f0696af721b3068c7121bfbcc77bee70c59ce717df5613`、1,228頂点／2,452面。`work/anatomy-review/classification-block-meshes-v1/report.json`。別途修正済みの中脳組織meshは保持。ここでの54パーツ不変は今回47 voxel修正による差異についてであり、以前の中脳組織修正を否定しない。

旧volumeは `tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz` にSHA照合後保存した。旧差分のPythonテストはこのfixtureへ固定し、将来の配布版変更で歴史的パッチの入力を書き換えない。移行後のPython全24/24成功。新volumeのraw SHAは `261beb616856653d4d7acd2d411a98f1435eb6beab8b91a2b8ac7b5642909d18`。

`audit_ventricle_classification_browser.mjs` は同じ通常buildでラベル応答だけを旧／新に差し替え、水平位置69の水道小片と矢状位置44の前方小片を実マウス操作で同定した。旧26→新「中脳水道候補（部分）」、旧26→新「ラベルの範囲外」、部分候補の通常クイズ除外説明、描画エラーなしを4/4確認し全4画像をAIが目視。`work/anatomy-review/ventricle-classification-browser-v1/report.json` に実応答SHAとブラウザ情報を保存。これはstaged asset overrideであり、アプリの版定数更新・配布assetsの統合検証ではない。最初は全Nodeテストが残したPages-base buildとroot serverが一致せずapp rootを読めなかったため、通常buildを再生成して成功した。今後はrunner冒頭で通常baseを要求し早期拒否する。

## 2026-09-06 採用段階の安全性準備

統合後の検証: 全Node **484/484**（`work/anatomy-classification-full-tests.log`）、Python **24/24**、型検査、通常build成功。実際のdist資産（ラベル応答の差し替えなし）で日英×水道／前方除外点のクリック同定4/4を確認し全4画像を目視した。`work/anatomy-review/ventricle-classification-browser-integrated-v1/`。第四脳室blockの新mesh実応答SHAを検証し、通常／透過×上下面の全4画像を目視した。通常は周囲組織に隠れ、透過では第四脳室主腔が見える。`work/anatomy-review/fourth-ventricle-block-browser-v1/`。これらはWindows上のローカルChromeであり、公開先・物理端末での確認ではない。

この目視で発見した既存の英語header／詳細欄の重なりは別途修正。headerの2段化を1600pxまで適用し、日英×8幅（1920/1600/1440/1366/1200/1024/768/390、mouse/desktop emulation）で要素の重なり・ページ横overflow・描画エラー0、代表4画像を目視。`work/anatomy-review/header-layout-v1/`。スマホ実機・touch検証とは扱わない。英語のアトラス由来説明とホイール操作説明の残った不自然な訳を原文に沿って訂正した。

現行作業PRは読み取り照合で#27、OPEN・draft、branch `codex/september-learning-review` と確認した。候補のreviewStatusを変更したり、PRへ採用記録を送ったり、配布volumeを変更したりはしていない。

`build_bigbrain_practical_seg.py` に未接続の `apply_approved_partial_aqueduct_patch` を準備した。mainからは呼ばない。採用後に使う場合もstrict approved／元raw SHA／正確な格子・uint8／固定16座標／全26→41だけを要求し、集計一致だけで別の16座標を許さない。全検査後の一括反映で失敗時は原volumeを保持する。

`tests/test_partial_aqueduct_stage.py` は実データと実未承認JSONの拒否、テスト内だけの模擬承認による厳密16 voxel変更・完全復元、追加／移動／別ラベルへの改変拒否を検証する。テスト内の模擬承認を実際の採用記録と扱わない。通常表示・名称・由来・クイズ除外・下流SHA監査の同期が終わるまで配布本体へ接続しない。

クリック同定の名前辞書にも41「中脳水道候補（部分）」を準備した。通常のstructure一覧・bigbrainIds・quiz targetには追加していない。候補に対応する説明は部分収録／未確定／通常クイズ対象外を日英で明記する。また未登録ラベルをクリックした時に以前の選択構造の説明が残る既存バグを修正し、クリック時の説明を独立保持した。

型検査・本番ビルド、関連日英13/13、新規静的回帰3/3成功。Chromeローカルpreview 4346、1440×1000で、断面の枠外を実クリック→詳細解説を開き、未ラベル／組織不存在とは限らない説明、エラーなしを実測・画像目視。`scripts/audit_identification_note_browser.mjs`、`work/anatomy-review/identification-note-v1/report.json` と `outside.png`。41は配布データにまだ存在しないので、今回の実ブラウザ確認は41の実クリック成功を意味しない。小画面／英語実操作は未確認。README日英に同定説明修正を同期。Sitesスキルに従い既存構成を保ち、公開はしていない。

## 更新：未ラベル化ではなく、中脳水道への分類変更

ユーザーの「①は中脳水道にぬりかえたほうがよい」という指示に従い、同じ16 voxelを26→41へ変更する新候補 `segmentation-patches/review/aqueduct-reclassification-candidate-2026-09-05.json` を作成した。旧26→0案は比較履歴として保存するが、**両方を適用してはいけない**。新候補が旧案を置き換える。

41は編集・レビュー用の「中脳水道候補（部分）」としてPython/ブラウザの差分メタデータと編集ツールのパレットに追加。通常学習・クイズ・配布volumeには未登録／未適用。全長を塗り終えた意味ではなく、境界拡張は0 voxel。元の未ラベルvoxel数は不変。`prepare_fourth_ventricle_candidate.py --aqueduct` で三方向比較と差分を再生成できる。出力先 `work/anatomy-review/aqueduct-reclassification-v1/`、赤は26、紫紅は41。X比較をAIが再目視した。

ユーザーの分類方針と、strictパッチの採用記録は区別する。PR上の正式記録と下流資産の整合更新は未実施なので、現時点のJSONはunreviewedを維持する。

今回の検証: Python候補テスト5/5、既存ventricle-adoption＋rendered-htmlテスト81/81、TypeScript型検査、本番ビルド成功。diff-checkは改行警告のみ。全Nodeテスト／実ブラウザでの編集・import・export操作は今回未実施。既存の本番bundleサイズ警告あり。公開assetsの差分はない。

### 他の修復調査：脳幹下端の判定を保留

原画像Z0–2は各断面**全体が255**で、ラベル27が608/612/612、計1,832 voxelある。Z3から画像信号が現れる（Z3の非255は断面全体で140 voxel）。したがって、この1,832 voxelは「原画像上で組織の不存在を確認した誤ラベル」とは断定できない。画像収録端・欠損／背景処理の影響を調査するまで削除しない。前回の「背景ラベル」という数値所見を解剖学的削除の根拠に転用しない。

## 結果と採否

ID26 の中脳水道付近の独立小片16 voxelを ID26→0 とする可逆候補を作成した。**未採用・専門家未確認**。0 は「未ラベル」であり、組織の不存在や背景の確定を意味しない。中脳水道全体の分節を完成させたものではない。公開ラベル・アプリ・3Dモデルは変更していない。

- 差分: `segmentation-patches/review/fourth-ventricle-exclusion-candidate-2026-09-05.json`
- 再生成: `scripts/prepare_fourth_ventricle_candidate.py`（ラベルvolumeを出力しない）
- 原画像SHA-256: `c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746`
- 元ラベルSHA-256: `b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3`
- ID26: 8,567 → 8,551 voxel（候補をメモリ上で適用した値）
- 16 voxel = 2 mm³。XYZ [195,199,116]–[196,202,123]、6近傍で単一成分。
- 全16座標は生成manifestと差分runsに保存。変更前はすべて26で、26への復元が完全一致することをテスト。

## 解剖学的判断の根拠と限界

中脳水道は中脳内を走り、第四脳室とは区別する（[NCBI Neuroscience: The Ventricular System](https://www.ncbi.nlm.nih.gov/books/NBK11083/)、[NLM MeSH: Fourth Ventricle](https://www.ncbi.nlm.nih.gov/mesh/68020546)）。これは一般的な解剖学的根拠であり、この16 voxelの境界を外部資料が保証するわけではない。

前回の全Z点検とX195の矢状断所見を再確認した。さらに今回、同一BigBrain原画像の Z115–124、X194–197、Y198–203 を修正前・候補と対にしてAIが目視した。対象は橋背側の大きな第四脳室主腔ではなく、上方の中脳内の細い腔に位置する。既存の小片を第四脳室として残さない判断には根拠があるが、0.5 mm画像の部分体積効果、近傍腔との移行部、細い腔の全長は未確定。新しい境界を描いたり空白を連結したりしていない。

seed [195,199,119] は目視した成分を再現する識別子に限る。座標・小ささ・連結性だけを解剖学的判定の代用にしていない。入力SHAと16 voxel／bboxを固定して、入力変化時の推測再生成を拒否する。

## 全成分と保留

### 2026-09-06 前方の左右小片を精査

左16・右15 voxelは、全体矢状断locatorと各占有X/Y/Z＋上下1枚を点検した結果、橋の腹外側の外部空間に位置する。橋と小脳の間の第四脳室主腔とは反対側にあり、第四脳室ラベルとして保持しない判断に根拠がある。`render_ventricle_fragment_review.py` により3 fragmentの9連続断シート・3全体locatorを生成し、全12画像をAIが開いて目視した。左14断面・右14断面・上方2 voxel片10断面、計38断面。根拠は座標上の前後だけではなく原画像での橋の外形との位置関係。

`segmentation-patches/review/fourth-ventricle-anterior-fragments-candidate-2026-09-06.json` はこの2成分31 voxelだけの26→0、medium／unreviewed。0は未ラベルであり、特定の脳槽や血管へ再分類しない。採用済みでも公開反映済みでもない。元第四脳室8,567→8,536、16 voxelの水道再分類とは非重複。Z114の上方2 voxelは中脳水道の尾側移行付近だが、この画像から分類境界を確定せず保持した。

実volume候補テスト6/6成功。2成分の座標集合と数量、上方2 voxel／水道16 voxelの不変、完全復元を検証。`work/anatomy-review/ventricle-fragments-v1/report.json` に全座標、crop、各画像SHA、候補SHAを保存。`--exclusion-candidate` でwork内へ再生成する。配布volumeは未変更。

| voxel数 | XYZ最小–最大 | 今回の扱い |
| --- | --- | --- |
| 8,518 | [179,157,59]–[212,194,97] | 主腔、変更なし |
| 16 | [171,239,73]–[174,240,74] | 前方左小片、別途原画像判定が必要 |
| 15 | [217,239,73]–[220,240,74] | 前方右小片、別途原画像判定が必要 |
| 2 | [193,195,114]–[193,196,114] | 今回の数値確認で明確化。未変更 |
| 16 | [195,199,116]–[196,202,123] | 今回の除外候補 |

前回の「Z98–115には連続ラベルなし」は、全スライスが空という意味ではない。Z114に2 voxelあり、空なのはZ98–113とZ115。今回の修正だけで ID26 全体を正しいと認定しない。

## 証拠と確認方法

生成先 `work/anatomy-review/fourth-ventricle-repair-v1/`:

- `x.png`、`y.png`、`z.png`: 左から原画像、既存ID26の赤輪郭、候補ID26の赤輪郭。最近傍拡大のみ。
- `manifest.json`: 入力／patch／PNGのSHA、全座標、画素→XYZ対応、スライス範囲。
- `fourth-ventricle-exclusion-candidate.json`: tracked差分と同一の再生成物。

`tests/test_fourth_ventricle_candidate.py` は実volumeで変更集合、主腔／Z114不変、完全復元、誤SHA拒否、6近傍を検証する。既存 `apply_segmentation_patch.py --check` でstrict整合性を検証する。正式適用は既存のapprovedレビュー手順を維持する。未承認をapprovedへ書き換えたり、適用ガードを迂回したりしない。

## 次段階

この候補の採否を確認後に生成処理・資産・下流SHA監査を一括更新する。その前に、他の小片を同じ理由で一括削除しない。脳幹／脳梁の欠け、内包・淡蒼球などの詳細化は別の修復対象であり、完了扱いにしていない。
