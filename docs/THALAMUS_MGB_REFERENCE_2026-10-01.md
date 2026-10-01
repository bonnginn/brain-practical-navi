# 内側膝状体の同一BigBrain参照位置 — 2026-10-01

ユーザーが求めた視床内・周辺構造の概略位置案内として、既存の[7模式目印とVIM輪郭](THALAMUS_REFERENCE_GUIDE_2026-10-01.md)へ内側膝状体MGBの代表点を追加した。核境界の分節は追加せず、視床枕より後下方にある聴覚中継部の位置と、外側膝状体の視覚中継との対比を日英で説明する。

## 同一標本の根拠

[Kiwitz et al. 2022](https://doi.org/10.3389/fnana.2022.837485)のBigBrain結果と、[Schifferほかの公表MGB 3D地図](https://doi.org/10.25493/PNY0-NCW)を用いた。10標本のMNI確率地図とは区別し、同一BigBrainのCGM_dn/mn/vn左右6配信マスクを復元した。元の注釈は自動推定・補間を含み、本教材の専門家確認を意味しない。

siibraの既存設定から配信を取得。実メタデータの各軸間隔、transform.json、最高解像度半セルの中心補正、decoderのCZYX配列順を使用した。overviewは4配信が80um、左mn・右vnが40umで、名目値の等方格子とは扱わない。全チャンクのbytes/SHA、info、transform、NIfTI復元とSHAをwork/mgb-same-specimen-2026-10-01/provider-volumes.jsonに保存。0.5 mmのアプリ格子中心を公式変換列で逆投影し最近傍標本化、側ごとに3区分を和集合にした。左571点・右671点、順逆誤差最大0.000003294 mm。塗り足し・平滑化・左右転写なし。

native100原画像では左右それぞれ三方向の中心と±1 mm、計18面を全目視した。暗い核の形、周囲組織、外部との位置関係と公表輪郭の整合を確認。細胞構築区分を肉眼で再認定したものではない。図・原画像・生成元をwork/anatomy-review/mgb-native100-2026-10-01とwork/october1-*-mgb*.pyに保持。証拠SHAを固定し、現在の参考座標を[scripts/build_thalamus_mgb_reference.py](../scripts/build_thalamus_mgb_reference.py)で再生成できる。

## 表示と検証

app/thalamusMgbReference.jsonに左右それぞれの代表位置・変換SHA・証拠を保存。ガイドは左の点だけを表示し、点線の円は境界や大きさではないと説明する。右点は独立した元データから求めて保持しており、鏡像ではない。主断面へのリンクは冠状Y214、視床・外側膝状体・脳幹を基準に断面＋3Dを開く。MGBの個別着色、3D核表面、聴放線は追加していない。分節ラベルSHA a97b1a3bは不変。

再生成時に全取得物と証拠図のSHAを照合。型検査・preview build成功。4664番の実ブラウザで日本語の金色目印と説明、Y214へのリンク適用、英語の機能・局在説明を確認した。確認タブのキャッシュ迂回を復元し、タブを閉じた。低リスクのガイド追加として全件試験は繰り返していない。

CC BY-NC-SA 4.0を保持し、著者・変換・制限を[配布notice](../public/THALAMUS-MGB-REFERENCE-NOTICE.txt)、LICENSES.md、DATA_AND_LICENSES.md、日英ブラウザ参考文献へ掲載した。公開・pushなし。
