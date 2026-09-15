# ブロードマン分類による脳表観察 / Brodmann surface observation

2026-09-08、開発版のみ。main統合・公開更新はしていない。進行中のBigBrain分節作業とは独立した参照脳表。

## 使い方

「脳表観察」→「ブロードマン領野で観察」を選ぶ。収録41領野を全着色、番号を選択して単独強調、または着色なしで観察できる。左右の外側面・内側面と、両半球の上面・下面を用意。ドラッグ／矢印キーで回転、拡大縮小、向き・拡大のリセットに対応する。

「溝の奥を見る（膨張表示）」で同じ頂点ラベルを保った膨張脳表へ切り替える。左右の間隔と縮尺は画面用の調整であり、実際の半球間距離や登録座標ではない。脳回・構造の従来表示へ戻れる。BAモード中は従来の基底核・Papezステッパーを停止する。

**English:** Open Surface observation → Brodmann areas. Explore 41 supplied areas on pial or inflated reference surfaces, select one area, change views, rotate and zoom. This is an unpublished development feature. The map is not a subject-specific measurement or a BigBrain registration.

## 原データと解釈

- [FreeSurfer / PALS-B12](https://surfer.nmr.mgh.harvard.edu/fswiki/PALS_B12)：歴史的Brodmann地図を脳溝・脳回の対応で転写したもの。配布GIFTIの対象マップ名は `Brodmann - BOTH (from colin RIGHT)`。Colin右半球由来の地図を両側に対応づけている。
- [fsaverageの配布元](https://www.freesurfer.net/pub/dist/freesurfer/tutorial_versions_centos6/freesurfer/subjects/fsaverage/)：左右の `PALS_B12.labels.gii`、`pial`、`inflated`、`sulc` を利用。2026-09-08取得、入力URL・バイト数・SHA-256を [source lock](../scripts/brodmann-source-lock.json) に固定。
- [Van Essen (2005), NeuroImage 28:635–662](https://doi.org/10.1016/j.neuroimage.2005.06.058)：PALS標準表面とアトラスの背景。
- [FreeSurfer Brodmann area maps](https://freesurfer.net/fswiki/BrodmannAreaMaps)：一部の機能説明の参照。ここにある別の確率地図を、本表示の形状・ラベルの由来として扱わない。

個人の細胞構築境界、実際の左右差、機能局在を測定した結果ではない。既存CerebrAの脳回をBA番号に読み替えていない。BigBrain断面との位置合わせは未実施で、BAから視床への実測線維路も表示しない。専門家レビューは未実施。

番号は `1–11, 17–33, 35–47` の41領野。欠番を補完せず、3a/3bや4a/4pも作らない。未割当とmedial wallは0（灰色）。元データで同色のBA 3とBA 33を混同しないよう、RGBではなくGIFTIの整数インデックスとラベル名からBA番号を取得する。

## 再現と軽量化

[変換スクリプト](../scripts/build_brodmann_surface.py) はnumpyのみを追加依存とし、固定した入力と違う場合は中断する。`work/brodmann-source/` にロック記載の入力を置き、次で再生成する。原入力はローカル専用で、公開配布物には追加しない。

```sh
python scripts/build_brodmann_surface.py --write
python tests/test_brodmann_surface.py
node --test tests/brodmann-surface.test.mjs
```

左右各163,842頂点・327,680三角形を保持する。通常と膨張で領野配列・面配列が完全一致。境界の描き直し、ラベル補間、穴埋め、頂点削減は行わない。色は画面表示用であり、原図の配色の再現ではない。

BNM4はgzip圧縮前に表示座標を0.01単位のint16、法線をint8、陰影・領野番号をuint8にする。デコード時に法線を正規化する。表示変換後の座標誤差は最大0.00502以内。これは丸め誤差の上限であり、解剖学的位置の精度ではない。元の整数面インデックス・BA番号は完全保持。通常面のXYZ移動は `[0,18,-18]`、膨張面は0.8倍の一様拡大率と左 `[-36,0,-16]`／右 `[36,0,-16]` の移動。格納順はZYXで、いずれも既存描画器に合わせる表示変換のみ。

4メッシュと来歴・ライセンスの計6ファイルは11,754,389 bytes（約11.21 MiB）。脳表観察を選ぶまで専用コンポーネントを読み込まず、通常面と膨張面の各ペアは切替時に読み込む。容量試験は従来資産の100 MiB枠を保持し、Brodmann分に12 MiBを追加、全体112 MiB未満を検査する。既存脳表や分節のメッシュを軽量化のために変更しない。

出力の圧縮前後SHA、領野別頂点数、表示変換は [brodmann-surface.json](../public/atlas/brodmann-surface.json)。新形式のデコーダーは [brodmannMesh.ts](../app/brodmannMesh.ts)。入力破損・長さ・座標スケール・法線・面範囲を検査する。

## 出典表示と権利

[FreeSurfer Software License Agreement](https://surfer.nmr.mgh.harvard.edu/fswiki/FreeSurferSoftwareLicense) のダウンロード契約全文と指定前文、PALS-B12 / Van Essenの帰属、改変の説明を [BRODMANN-FREESURFER-NOTICE.txt](../public/atlas/BRODMANN-FREESURFER-NOTICE.txt) に同梱する。画面内から出典・原論文・利用条件を開ける。

`DATA-MANIFEST.json` の専用グループと権利監査を更新した。第三者素材のライセンスを本プロジェクトのコード／教材ライセンスで上書きしない。

## 検証記録

- Brodmann Node 8件：全41番号と頂点数、BA 3/33の区別、通常／膨張の対応、圧縮前後SHA、壊れた入力の拒否、日英初期表示、独立読込み、容量を確認。
- Python 5件：元入力から全配布バイトを再現、表示座標の丸め誤差、元ラベル・面の完全保持を確認。ローカルではskipなし。
- 関連Node 24件＋`rendered-html`該当2件通過。型検査成功。通常ビルドとGitHub Pages形式ビルド成功。Pagesの権利監査で123資産・10群・6通知と配布バイト一致を確認。
- 初回全Nodeは590件中586件成功、4件は新形式・モード追加に伴う旧ソース文字列契約と旧一律容量枠。該当契約を更新後、対象試験は全て成功。修正後の全件再実行は、並行する分節差替えとの競合を避けて途中停止し、分節タスクの最終統合検証へ引き継いだ。全件再成功をここでは主張しない。
- 実ブラウザでの操作・表示確認、個別領野境界の専門家レビューは未実施。機械的な一致を教材・解剖学的な検証完了とは扱わない。

## 体系的な学習コースへの接続

[神経解剖学コース全体の設計](../research/neuroanatomy-course/README.md)を優先し、[6段階のBrodmann観察原稿](../research/guided-tours/BRODMANN_PILOT.md)をその中の演習素材として利用する。コースの本文・演習・進捗管理は未実装。[視床・神経回路の下準備](../research/neural-circuits/README.md)とは座標系と出典を分け、核ごとの根拠・位置合わせが整ってから接続を検討する。


## 2026-09-15 着色不具合の修正

領野色を0–1で渡す一方、共通HighlightLayerは0–255として正規化していたため、着色領野が黒く見えていた。Brodmannの色関数と色見本をRGB byteへ統一した。描画propsと色見本の一致・正規化後の輝度を回帰試験で確認。対象Node9/9、型検査、build成功。実ブラウザで全領野・BA5単独、左右・膨張表示を確認し4346を更新。分節・mesh変更、公開更新なし。
