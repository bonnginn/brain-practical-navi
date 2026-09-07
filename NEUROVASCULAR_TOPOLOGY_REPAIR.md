# 後交通動脈の接続と神経表示の訂正 — 2026-09-06

## 追加：III–XIIの全20始点を現ラベルと比較

`scripts/audit_nerve_origin_context.py`で3つの配布神経meshから各領域の最初のringを読み、ring中心を始点として現ID27の6近傍境界voxel中心まで測定した。現ラベルSHA86e3b22d…、3meshとmetadataのSHAも `work/anatomy-review/nerve-origin-context-v2.json` に保存。III–XII左右20領域（mesh IDs26–45）の全てを収録。根糸本数は推定せずnull。

重要な座標区別：原画像affineの原点[-98,-134,-72]と、`build_section_structure_meshes.ORIGIN_ZYX`から得る表示原点[-98,-116,-90]は異なる。神経meshは既に表示座標にある。最初のv1はこの違いを混同した無効な比較であり、9–25 mm等の距離やXIの範囲外判定を解剖学的誤りとして使わない。v2はlabel側を実際の表示原点へ変換し、神経へ余分な移動を加えない。回帰テスト2/2で、この[0,18,-18]差とmesh ZYX→XYZ復号を検査。

修正済み比較では全20始点がvolume内にあり、最寄り境界voxel中心まで0〜約1 mm（最大は右III、次いで左VI／左Xの約0.707 mm）。これは現ID27に対する幾何的な近接性であり、連続表面の正確な距離、正しい出現溝、神経と脳幹の接続、根糸本数、個体の解剖精度を保証しない。ID27自体の腹側不足も残る。過去metadataの未検証表現を「全神経が解剖学的に検証済み」へ変更しない。

この結果から、見えにくさを理由に始点を最寄り表面へ一括移動する案は採らない。次は各始点の周辺部位と表示経路の個別照合。volume／mesh／アプリは変更せず、追加診断だけを実施した。前回の全654件テストを今回の新規診断後の全体試験とは数えない。

## 後続：根の表示範囲を生成metadataにも同期

三叉神経の感覚根・運動根は現行では片側一本に省略され、UIにはその制限が表示されている。一方、generatorのIX–XIをserial rootletsとするコメント、metadataのrootlet行列と誤読できる説明、現行ID27表面から2 mm以内を検証済みのように読む記述が残っていた。これらを訂正し、Vの感覚／運動根、VIIの運動根／中間神経、VIIIの前庭／蝸牛成分、個別根糸、XI脊髄根・上行経路の未再現をmetadataにも明記した。

根の本数や位置を推測して形状を増やしたわけではない。Yousry2004の研究は運動根の細分も扱い、単にすべての神経を同じ本数へ増やす根拠にならない。文献は上記参照。

scripts/stage_neurovascular_metadata.pyで新規work出力へ全5meshとmetadataを再生成し、すべてのmeshが現行とbyte一致することを確認。work/neurovascular-metadata-v1/report.json。生成metadataとpublic版はJSON構造全体が一致（改行の違いは意味差ではない）。volume・mesh・region ID・名称・クイズキーは不変。新規／関連4/4、型検査・通常build成功。390幅の脳神経実ブラウザ記録はwork/neurovascular-metadata-browser390.json。追加rendered-html対象試験はwork/neurovascular-metadata-focused.logで別途確認。公開・main変更なし。

## 採用範囲（開発版・未公開）

以前の再点検で確定した後交通動脈–後大脳動脈の左右の隙間を、模式図の接続関係として修正した。前方群は表示移動[0,18,-18]を受け、後方群は受けない。従来の個別座標はこの違いを整合させていなかった。

既存内頸動脈の第3制御点（表示移動後）と既存後大脳動脈の第2制御点（無移動）を共有し、後交通動脈自体をその間の直線的な模式管とした。後方循環を一括移動したり、新しい血管を継ぎ足したりしていない。これは接続関係の修正であり、個体の走行・径・神経との交錯・管腔を再現したものではない。別meshの頂点を溶接して単一の水密面にしたわけでもない。

正常の基本的接続の根拠: [UTHealth Neuroanatomy Online, posterior communicating arteries](https://nba.uth.tmc.edu/neuroanatomy/l4/Lab04p06_index.html)。文献は接続関係を支持するが、このモデルの座標を実測値として承認するものではない。

## データと再現

- 変更前mesh SHA `eb1102991e5616cc9b776f0766bda45e86580f2abdb8cb21cb36608f8ce355eb`
- 変更後mesh SHA `8e1d872281eb6439b5a68b513fcd2a2b8cf8ca991e4a5854c5e3f090e6c824ad`
- 前方動脈mesh内のIDs1–7の頂点は完全一致、IDs8/9（後交通動脈）だけ変更。後方動脈および神経3群の4meshはbyte不変。領域ID・名称・クイズ正答キーは不変。
- 旧meshは tests/fixtures/overlay-arteries-anterior-pre-pcomm-eb110.mesh に保存。前後5meshのSHA台帳は segmentation-patches/review/pcomm-topology-repair-2026-09-06.json。
- scripts/stage_pcomm_repair.py は新しいwork出力にだけ生成し、他4meshの不変を検査する。通常generatorにも修正を反映。前方meshの取得URLは修正版キーを付け、以前のキャッシュと区別する。
- Pythonテストは実際に生成したBNM3の各ring中心を復元し、左右のICA/PCA接続点との一致・左右鏡映・二重移動と旧隙間の検出を確認する。Nodeテストは固定SHA、変更しない7領域、神経説明の日本語・英語を確認する。

## 神経の説明修正

V、VII、VIII、IX、X、XI、XIIの選択時に、一本の模式管に省略している部分を明記した。XIを実際には存在しない「根列」と称する説明を撤回し、脊髄根と上行経路が未収録で、全体の同定図には使えないと表示する。脳神経画面の導入・注意にも反映。視交叉は全線維交叉と誤読されないよう部分交叉を明記。英語の「舌咽・迷走・副神経」がAccessory nerveだけになっていた欠落も修正した。

根や根糸の新しい形状は作っていない。Vの根の違いと変異は [Yousry et al., 2004](https://pubmed.ncbi.nlm.nih.gov/15352600/)、XI頭根の議論と変異は [Tubbs et al., 2014 (online 2012)](https://pubmed.ncbi.nlm.nih.gov/22855423/) を参照。各神経に同じ本数の根糸を機械的に付ける根拠にはしない。

## 表示確認と限界

Chrome152のlocal4345、1366×900で動脈画面を開き、神経を非強調にして後交通動脈を選択した画面を実際に撮影・目視。左右の白い管が既存動脈間を結ぶ表示を確認。原画像に基づく位置の確定、全方向の遮蔽検査、専門家レビューではない。画像は work/neurovascular-preview-pcomm.png、読込probeは work/neurovascular-preview.log。

脳幹外形の不足、IIIの出現部の見え方、神経根・根糸、血管と脳表溝の厳密な位置関係は未解決として残す。ラベルvolume、既存原画像、ライセンス・帰属条件は変更しない。

## 検証記録

Node全495/495、Python全94/94と後続の内包再評価テスト2/2が成功。型検査・通常本番build・全Node内のPages-base build成功。既存chunkサイズ警告は残る。Chrome152、local4345で動脈・脳神経画面を各1366/390幅で4件確認し、canvas各1、読込完了、UI error・横overflowなし。記録は work/neurovascular-final-*.json。これは物理スマートフォンや解剖境界の認証ではない。画像を見た後交通動脈選択操作とは区別する。

全体監査の完了ではない。未コミット・未push・未公開。次の重点は、内包・脳幹の原画像境界と神経根の表現。過去の一括削除／追加候補を無条件に採用しない。
