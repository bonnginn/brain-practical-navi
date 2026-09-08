# 神経回路・視床下位核の表示準備 / Circuit annotation preparation

2026-09-08 JST。進行中の分節とは独立した準備用モジュール。**アプリの表示・ラベル・3Dメッシュ・公開内容は変更していない。** 現在の作業期限は11:00 JST。ここで完了したのはデータ契約、核名の整理、表示座標の接続と機械的検証まで。

This independent preparation module does not change the running application or segmentation. It provides curriculum targets, geometry adapters and evidence contracts. Subnuclear coordinates, masks and connectivity remain unreviewed and unpopulated.

教材への展開案： [ガイドツアーの検討と第1ツアー台本](../guided-tours/README.md)。既存の位置関係ステッパーを土台に、問い・ヒント・再同定を加える案を別に保存した。

## 用意したもの

| ファイル | 用途 |
| --- | --- |
| [catalog.mjs](catalog.mjs) | 核・核群26項目、左右／正中51枠、学習テーマ6系統。解剖学的な全核一覧ではなく、教材構成の下書き |
| [contracts.ts](contracts.ts) | アトラス出典、変換履歴、核の位置・マスク・メッシュ、回路の接続・方向・左右・経由点のデータ契約 |
| [coordinates.mjs](coordinates.mjs) | 科学座標XYZ→断面上の点／既存BNM2メッシュ座標／断面スライダー位置の変換 |
| [inventory.mjs](inventory.mjs) | 既存の左右視床ラベルを読み、範囲とラベル内参照点を算出。元ファイルへの書込みなし |
| [context-inventory.json](context-inventory.json) | 入力SHA付きの左右視床の参照点スナップショット |
| [coordinates.test.mjs](coordinates.test.mjs) | 断面の左右・上下・前後、3D座標、表示条件、参照点算出の検証 |
| [SOURCES_AND_NEXT_STEPS.md](SOURCES_AND_NEXT_STEPS.md) | データ候補、導入時の照合項目、次の実装順序 |

学習テーマは視覚、聴覚、体性感覚、基底核・小脳と運動、記憶・辺縁系、注意・覚醒・視床皮質回路。核名の訳・粒度は`curriculum-draft`。アトラス固有ラベルとの対応はまだない。前核群・髄板内核群・正中核群などの群と個別核を同列の独立領域として数えない。TRN・膝状体が既存の視床全体ラベルに必ず含まれるとも仮定しない。

全下位核の`anchor`、`mask`、`mesh`は`null`、回路の`edges`は空。左の核を反転して右を作る処理や、視床の重心を個別核の位置に流用する処理はない。位置の未確定状態は学習用の表示で明示する設計とする。

## 座標を接続する約束

- 対象はこのプロジェクトのBigBrain 0.5 mm格子（XYZ=394×466×378）。名前にICBMを含む別のアトラスと同一空間だとは判断しない。
- 科学座標は既存`bigbrain-icbm500-validation.json`のaffineに従い、`XYZ = voxelXYZ × 0.5 + [-98,-134,-72]`。
- 既存の断面3Dは表示用原点`[-98,-116,-90]`を使い、ファイルにはZYX順で格納。科学座標からは`[Z-18,Y+18,X]`。この平行移動はアトラスの位置合わせではない。
- 断面は`app/segmentationGeometry.ts`と同じ方向。矢状断は前が左、後が右。2D戻り値はズーム・パン前のピクセル中心。Canvas上は`ox + pixelCenter[0] × scale`等で配置する。
- 点注釈の初期スラブは中心面から±0.25 mm。範囲外の点は非表示。将来の核マスクは点のスラブ判定ではなく、各断面とマスクの交差で表示する。
- `resolveAnchor(record, currentTargetSha256)`は未確認、証拠不足、標本ラベルのSHA不一致、左右不一致を非表示にする。別空間は例外にして位置合わせを要求する。`project-reviewed`は専門家承認を意味せず、専門家の記録は別欄。
- 座標変換関数の成功だけでは解剖学的な位置合わせを保証しない。実際のUI・描画への組込みはまだ行っていない。

```sh
# リポジトリのルートから実行
node --test research/neural-circuits/coordinates.test.mjs
node research/neural-circuits/inventory.mjs
# この準備用フォルダの参照点記録だけを更新
node research/neural-circuits/inventory.mjs --write-snapshot
```

参照点は既存の左右視床ラベル内のボクセルで、個別核や視床の生物学的中心を示すものではない。入力分節が変わったらスナップショットを再計算する。参照点記録のSHAはラベルファイルに対するもの。外部アトラス登録時は別途原画像SHAと変換ファイルSHAも保存する。

## 検証と引継ぎ

独立したNode試験11件成功。原画像メタデータのaffine・既存の三断面サンプリング関数と照合し、型契約も単独検査。現ラベルから左右視床の参照点を読み出した。合成した非凸ラベルでも参照点がラベル外へ出ないことを検証した。

本体への変更がないため、本体の全件試験・build・ブラウザの再検査はこの準備作業では実施していない。核の解剖学的精度・核間の線維走行・専門家確認は未検証。次は下記資料の取得と位置合わせ候補のレビューから開始する。分節作業の既存修正は本モジュールの成果に含めない。
