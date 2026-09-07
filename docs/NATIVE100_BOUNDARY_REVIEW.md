# 全脳100 µm原画像による境界再評価

## 取得と対象（2026-09-07）

BigBrain公式の [Histological Space配布](https://ftp.bigbrainproject.org/bigbrain-ftp/BigBrainRelease.2015/3D_Volumes/Histological_Space/mnc/) から `full16_100um_optbal.mnc` を研究用workへ取得した。部分ファイルからの改名はcurl session4767のexit0と、HEAD Content-Lengthとの一致を確認してから実施。

- 取得ファイル: `work/full16_100um_optbal.mnc`
- バイト数: 1,454,989,037（配布元HEADと一致）
- 観測SHA-256: `61e6ebbeb0d6876051b9348a68bfe22b733fead04d112c35ff1a29819b67d351`。提供者の署名・公表checksumを照合したという意味ではない。
- metadata記録: `work/native100-metadata-v1.json`。HDF5は読み取り可能、画像payload全体は未展開。
- 保存順YZX: [1541,1209,1392]、uint16、gzip圧縮。XYZ順では[1392,1541,1209]。
- native XYZ開始座標mm: [-70.6666,-72.97,-58.7777]、間隔[0.1,0.1,0.1]、方向余弦は単位行列。

神経出現部、内包、脳弓などで既存登録300/500 µmだけでは判断できなかった部分の追加根拠を探す。100 µmのsamplingであり元20 µm切片と同一ではない。神経根が標本に残存することや各白質束の分離が可能であることを保証しない。既存の疑わしい神経経路を単純切断・移動する根拠にもならない。

## 読み取り上の重要事項

`image-min` はYごとに異なり、`image-max` は65535。全画像をidentity scalingとして読むことはできない。保存値と実値を区別し、`valid_range` と該当Yのimage-min/maxで変換してから濃度を比較する。定数sliceもある。既存視床下部ROI用のidentity専用decode関数をそのまま流用しない。

`read_native100_crop.py` の限定crop readerを作成。対応するYのスケーリングを適用し、全画像の展開や自動的な極性反転は行わない。異なるslice range、定数slice、範囲外、格子不一致、読み込み前voxel上限の合成4テスト成功。NiBabel 5.4.2の実ファイルproxy読取と、native XYZ [650,825,380]–[660,830,395)の750点で独立比較し、最大絶対差0.0を確認した。NiBabelの処理全体や全脳の全点同値を証明したものではない。

## 既知ROIとの局所照合

`compare_native100_overlap.py` は既存視床下部ROIのXYZ [175,0,80]–[296,101,211)を比較した。両画像のヘッダからROI→全脳の格子offsetは[476.0,793.1,294.0]と得られ、Yに0.01mmの非整数差がある。手動shiftを推定せず、同じworld座標で全脳側を三線形補間した。ROIの濃度極性を反転した場合、793,958の比較対象組織点で相関0.9824101、平均絶対差941.757（0–65535尺度）だった。同極性では相関−0.9824101。これは局所濃度比較であり解剖学的正解率や厳密同一性ではない。

`work/anatomy-review/native100-overlap-v1` のY35/55/70の全3PNGをAIが実際に目視した。同じ表示窓15000–60000で、左右腹側組織・中央の腔・小さい切れ込みが対応する一方、微細濃淡は同一でない。両画像をbyte一致の複製とは扱わない。最初の中央背景4点だけの比較より広い根拠を得たが、脳幹など別領域の位置合わせや神経根の存在までは確認していない。次は既知模式神経位置を公式変換の逆経路でnativeへ移し、実画像を確認する。

## 三叉神経模式位置の直交断再評価（2026-09-07）

`render_trigeminal_native100_review.py` で、現行pontine meshのID30/31のring0・ring4中心をnative100へ逆変換した。現行mesh SHA `1244f483c765ef084648a74bbad13cff78ea498d4edb9918e15812709e4fd823` の全V ring平均点が旧模式profileと厳密一致することを確認した。ラベルは現行 `58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7` を固定した。表示用座標ではなく科学用affineから、improved grids逆順→native grid逆→linear逆の順に変換し、順方向往復最大差は `2.717115798134273e-06 mm`。この数値は変換計算の自己整合性であり、解剖学的位置合わせ精度ではない。

- `work/anatomy-review/trigeminal-native100-v1`: 12 PNG・36 paired planes、表示窓15000–60000。report SHA `73cdd028befe4439017872218ba2d0c18b350c45fbf93ae19f971085ed554cb7`。
- `work/anatomy-review/trigeminal-native100-window-v2`: 同じ36断面を40000–65535で表示。report SHA `47cd7154f46f751e5aa8c1a6276472acd05fac82a8e87c49a27d93946261db8d`。
- AIによる目視は両組の全24 PNGで実施。左右原画像・右側模式点の対照で、原画像側は無印。各点のX/Y/Z中心±1 native slice、半径6 mmを確認した。72枚の別断面ではなく、同じ36断面の2種類の濃度表示である。

所見: ID30 ring0は組織辺縁にあり、X595–597で局所の突出・切れ込みが見えるが、Y690–692/Z360–362から独立した神経根の連続性は確定できない。ID31 ring0はX865–867/Y700–702/Z369–371で組織外の明るい間隙にあり、濃度窓を変えてもその点を通る独立した根は確認できなかった。これは標本全体で神経が存在しない証明ではない。両側ring4は周辺の連続した組織の辺縁・内部に重なり、孤立した神経束を指す根拠は得られなかった。濃度変更は淡い組織の内部模様を見やすくしたが、新たな神経走行の根拠にはならない。

採否: 既存経路の疑義を解消できず、単純短縮・左右対称移動・根糸の追加は採用しない。この4点照合を神経全経路の精査完了とは扱わない。次の神経修正には模式点から独立した出現部の同定と、より広い連続断の追跡が必要。生成時reportの `visualReviewPending:true` は元成果物を保持し、この節を後続の目視記録とする。原画像・ラベル・meshに変更なし。

表示窓を引数化し、範囲外・逆転窓の拒否、表示変更時の原データ・点位置の保持をテストに追加した。

## 状態と由来

技術参考: [NiBabel MINC2 API](https://nipy.org/nibabel/reference/nibabel.minc2.html) の `get_scaled_data(sliceobj)` と、ローカルNiBabel 5.4.2のminc1.py `_normalize` / minc2.py `get_scaled_data` を照合した。上記の独立数値比較は、この実装による限定cropとの比較であり、MINC CLIでの検証ではない。

追加のラベル・mesh・公開更新はない。BigBrainの既存帰属・ライセンス条件は [DATA_AND_LICENSES.md](../DATA_AND_LICENSES.md) に従い、この大きい原データは公開教材へ同梱しない。専門家確認や新しい手動分節を意味しない。構造ごとの実際の使用範囲は、今後の画像レビューと差分記録から追跡する。
