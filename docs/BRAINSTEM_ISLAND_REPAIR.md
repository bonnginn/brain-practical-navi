# 脳幹上端の孤立した40点 — 2026-09-06

## 確認と採否

現在の7ebed144…ラベルと原BigBrain画像で、脳幹の欠落範囲を水平Z100–148の全49面＋矢状7面＋冠状7面、計63比較・16シートにして全16枚をAIが目視した。`render_current_midbrain_extent.py`、`work/anatomy-review/current-midbrain-extent-v1/`。黄の元Ventral DCは中脳の正解境界ではなく、赤核・黒質（水色）と視床下核（紫）を分けて表示。Z103以降の腹側不足を再確認したが、上位で間脳へ連続するため、混合区画の一括合併はしない。

その途中でZ143–144の空隙内に、脳幹ラベル27の横棒状の孤立成分を確認した。XYZ [191,205,143]–[200,206,144]の40 voxel、6近傍で単一の孤立成分。全点で原画像値255。ただし値255や小さい成分という条件だけで削除するのではなく、この特定成分を画像で追った。

局所確認は水平Z142–145、矢状X190–201、冠状Y204–207の全20比較・5シート。全5枚をAIが開いて目視した。水平では隣接する組織から離れた白い空隙内の横棒、矢状では脳幹表面より離れた小点、冠状では左右の背側組織の上方に浮いた横棒であり、連続する組織としての画像根拠がない。図は `work/anatomy-review/brainstem-island-review-v1/island-00.png`～`island-04.png`。入力SHA・全点座標・各図SHA・crop・画素座標規約は `segmentation-patches/review/brainstem-island-image-review-2026-09-06.json`。

**この40点だけを27→0（未ラベル）とする局所修正をプロジェクト判断として採用する。** 専門家レビューではない。中脳水道・脳室へ再分類せず、他の孤立成分を消さず、不足している腹側中脳を推測で追加しない。脳幹全体の修復完了ではない。

## 開発版への統合

統合後の検証：Node全496/496、Python全100/100、型検査、通常・Pages用ビルド成功。Chrome152のloopback4345で水平1366px・冠状390px・矢状1366pxの3経路を確認し、新版c58f8beb…取得、loader/console/request/UI error/横overflow/WebGL fallbackは0。水平の実画面PNGも目視した。これは画面動作の検証であり、40点の解剖学的根拠は前節の三方向原画像レビュー。ログは work/brainstem-island-full-node.log、work/brainstem-island-full-python.log、work/island-browser-{horizontal,coronal,sagittal}.json。公開URLや実機は未検証。main・公開・commit/pushなし。

`prepare_brainstem_island_adoption.py` は固定入力から40点だけ変更し、逆方向へ戻して全格子一致を確認した。入力配列は変更せず、出力はworkのみ。`tests/test_brainstem_island_repair.py` 2/2成功、未対象成分・乳頭体を保持し、対象に接続する点が増えた場合やseed欠落を拒否する。

- 採用台帳: `segmentation-patches/review/brainstem-island-adoption-2026-09-06.json`
- 統合用volume（導入済み）: `work/anatomy-review/brainstem-island-adoption-v1/labels.bin.gz`
- 入力compressed SHA: `7ebed144c2b200233ad1389d3288b2407edcb542fe46eaf8626ef872522f8c3f`
- 出力compressed SHA: `c58f8bebc02ca6ce10a9d1a82c4e8fe7a4fe9c8c349f66a4e1675ffd93b94899`
- 出力raw SHA: `47965fba566883004c105ab445a6311db94425441da608a4789335dd61000aeb`
- ID27: 254,664→254,624。その他の非0ラベルは不変。

既存BigBrain原画像を使う全ブロックの部品マスクを修正前後で計算して比較し、変更部品0を確認した。40点は原画像の組織マスク外なので、ブロックmeshを再生成して変更する必要はない。これは実際の各Part.maskの比較であり、見た目からの推定ではない。

上記volumeは固定台帳の再生で開発本体へ導入済み。入力fixtureを `tests/fixtures/bigbrain-practical-segmentation-pre-brainstem-island-7ebe.bin.gz` に保持し、`install_brainstem_island_repair.py` で全格子逆変換と出力SHAを検証した。過去の登録補正・内包・脳幹レビューはこのfixtureに固定し、現行版の客観監査は新しいbrainstem-island記録へ更新した。専門家レビューではなく、公開サイト・mainは未変更。

## 次の局所確認：左右8点ずつ（後続で開発版へ統合）

c58f8beb…版で、左XYZ[175,201,133]–[176,202,134]、右[215,201,133]–[216,202,134]の6近傍独立成分を確認した。`render_brainstem_paired_islands.py` は両成分の全該当X/Y/Zと上下1枚を含む24比較・6シートを作成し、全6枚をAIが目視した。左右とも、水平では脳幹輪郭の外の白い空隙、矢状・冠状でも組織表面から離れた小点で、隣接断に連続する組織が見えない。全16点raw255だが、採否はこの局所三方向所見に基づく。白質や脳室として再分類する根拠はない。

この16点も27→0の局所修復対象として妥当と判断する。ただし、この時点では画像確認のみで、本体は40点修正後のc58f8beb…のまま。次工程で固定採用台帳・可逆差分・依存部品検査を作り、統合後検証する。記録は `segmentation-patches/review/brainstem-paired-islands-image-review-2026-09-06.json`、画像は `work/anatomy-review/brainstem-paired-islands-v1/{left,right}-00.png`～02.png。原画像・ラベル・各図SHAと全座標を保存。全体テスト496/100はこのread-only補助スクリプト追加前であり、その後の新規統合結果ではない。

### 16点の統合結果

統合後Node全497/497、Python全104/104、型検査、通常・Pages build成功。残り9成分のread-only描画補助追加後は別途構文確認と対象Node3/3（新規の121面カバレッジ検査を含む）成功。Chrome152、loopback4345の水平1366・冠状390・矢状1366の3経路で189fbd26…ラベルの読み込みを確認、canvas各3/1/3、loader・console/request/UI error・overflow・WebGL fallbackは0。ログは work/paired-island-full-{node,python}.log、work/paired-browser-{horizontal,coronal,sagittal}.json。公開URL・物理端末は未確認。専門家による形状保証ではない。

前段落は画像確認時点の履歴。その後 `prepare_brainstem_paired_adoption.py` で16点のみの変更・全格子逆変換・全ブロック部品mask差0を確認し、固定採用記録（SHA22ed2f98…）を `install_brainstem_paired_repair.py` で再生して開発版へ導入した。修正前c58f8beb…は `tests/fixtures/bigbrain-practical-segmentation-pre-paired-islands-c58f.bin.gz` に保持。現行compressed SHAは `189fbd26080448aa7813918dae6f17bdfed11a5ca15a12211cadfa3a6a5723d8`、raw SHAは `0e3e5f0e3652af3e81a840d41c889fff0d0ee7d9dacac9f640eb0df7f8841b5b`。ID27は254,608、その他非0ラベル不変。40点＋16点で計56点。mesh差し替え不要。専門家レビュー・公開・main統合なし。

## 残る9小成分の全局所レビュー

189fbd26…版の残る9小成分113点を、各成分の全該当X/Y/Z＋前後1面で点検した。計121比較・34シートを全34枚AIが目視。画像は `work/anatomy-review/brainstem-remaining-islands-v2/`、固定座標・raw値・画像SHAは `segmentation-patches/review/brainstem-remaining-islands-image-review-2026-09-06.json`。v1はmid-upperのbbox最小点をseedとして指定して欠落で停止した試行。実在seed[195,253,109]へ直して新規v2に生成し、失敗出力は上書きしていない。ラベル変更なし。

| 成分 | 点数 | 原画像に基づく扱い |
| --- | ---: | --- |
| left-posterior [163,231,91] | 8 | 三方向で脳幹表面から離れた空隙内。未ラベルへ戻す対象。 |
| right-posterior [227,231,91] | 8 | 同様に輪郭外の空隙内。左と対称だからではなく右の全12面でも確認。未ラベルへ戻す対象。 |
| mid-upper [195,253,109] | 11 | 背側の左右組織の間～下端の空隙内にある細片。全14面で組織外。未ラベルへ戻す対象。 |
| left-upper [173,215,111] | 6 | 実際の組織と重なり、明るい内部境界付近。孤立しているだけでは消せないため保持。 |
| mid-low [195,239,73] | 16 | 正中の組織表面・浅い切れ込み・空隙が混在。全成分削除はしない。点別の追加評価対象。 |
| left/right-low [155/235,205,81] | 各16 | 葉状の組織に重なる。脳幹への帰属は疑わしいが、空隙と同じ一括処理にしない。広い文脈で小脳・接合部を確認する。 |
| left/right-inferior [163/227,191,51] | 各16 | 脳幹輪郭から離れ、葉状組織の縁と空隙を含む。点別の由来・組織帰属確認が必要。 |

次の明瞭な修復範囲は上記3成分27点。他の86点は正常確定でも一括削除対象でもない。脳幹腹側の欠落と主成分の境界は、この小成分監査とは別に未解決。

### 27点の固定差分作成と開発本体への導入

統合後検証：Node全499/499（接触数の期待値修正後に全再実行）、Python全109/109、型検査、通常・Pages build成功。Chrome152のloopback4345で水平1366px・冠状390px・矢状1366pxの3経路に82384fa6…ラベルが読み込まれ、canvas各3/1/3、loader・console/request/UI error・横overflow・WebGL fallbackは0。ログはwork/three-island-full-node-v2.log、work/three-island-full-python.log、work/three-browser-{horizontal,coronal,sagittal}.json。最初の失敗ログを保持。新しい解剖学的保証をテスト数から主張せず、局所三方向画像を採用根拠とする。公開・main・commit/pushなし。

後続で `install_brainstem_three_repair.py` によって固定台帳を再生し、本体を82384fa6…へ更新した。以下の「本体導入前」はstage作成時点の履歴。逆変換・出力SHA・入力版を検証しており、専門家レビューではない。今回も既存全ブロックPart.mask差0のためmeshを再生成していない。40＋16＋27＝計83点の局所除外である。

乳頭体・旧混合ID33のラベル自体は完全保持されるが、除外点が接していた分だけID27との接触面数が変わる。差分座標から独立に数え直し、ID39との接触は11面減（69→58）、ID40は7面減（38→31）、ID33は3面減（32→29）、ID33と未ラベルの接触は7575→7578と確認した。乳頭体の代表Y断面は左251／右253で不変だが、その面内接触数も更新。旧値を固定した監査が失敗したため、独立再計算後に現行期待値を同期した。監査のチェックを削除・緩和してはいない。

`prepare_brainstem_three_adoption.py` で上記3成分だけを27→0へ変更し、全格子の逆変換・他86点保持・全ブロックPart.mask差0を確認した。固定記録は `segmentation-patches/review/brainstem-three-islands-adoption-2026-09-06.json`（SHA9c7b14f4…）。出力compressed SHA82384fa6961b4eb6aa272aa556f76febd4027cf1f67937504ee227ac0a8e4726、raw4550dd6ddf6272dde98253f1fc18484b48dd06970a5ee0a42ebfb382a22a7ac8。ID27は254608→254581。作業用volumeはwork/anatomy-review/brainstem-three-adoption-v1/labels.bin.gz、入力189fbd26…はpre-three-islands fixtureに保存。本体はまだ189fbd26…、公開・mainは未変更。関連Python11/11成功。新しい統合後の全体検証・ブラウザ検証はまだ行っていない。

### 保留86点の広域文脈確認

続いて6成分を大きいcropで三方向18比較・6シートにし、全6枚をAIが目視。ID27を赤、既存小脳ID28/29を水色、対象を黄で併記した。画像はwork/anatomy-review/brainstem-retained-islands-context-v1/、固定記録はsegmentation-patches/review/brainstem-retained-islands-context-2026-09-06.json。

- 左右low/inferiorの計64点は、脳幹本体から離れた葉状組織の縁で、既存小脳区画に囲まれる／隣接する。脳幹ラベルとしての帰属を再検討すべき根拠が強まった。ただし全点が組織内部ではないため、一律に小脳へ再分類せず、組織点と空隙点を分ける次工程が必要。
- 82384fa6…版で4成分の6近傍外部接触も計算。各成分は同側小脳（左28／右29）と24面、未ラベル0と16面で接する。これは隣接関係の補助情報で、解剖学的帰属の単独根拠ではない。rawはleft-low123–244、right-low26–190、left-inferior158–246、right-inferior190–255。特に右inferiorには組織と空隙が混在し、全64点を同じ値へ置換しない。
- left-upper6点は脳幹上部の実組織内の境界付近であり、孤立しているだけでは除外しない。
- mid-low16点は脳幹前方の正中表面付近。浅い切れ込みと組織縁が混在するため点別評価を残す。

この広域確認は各成分の代表三面で、全連続断の代用ではない。前項の全121局所比較と併せて扱う。今回は広域所見だけで64点を小脳に塗り替えていない。
