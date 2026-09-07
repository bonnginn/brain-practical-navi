# 大容量教材データの読込進捗監査

更新日: 2026-08-23

## 目的と表示方針

断面画像、手動ラベル、3Dメッシュの取得中に、利用者が待機理由と実測済みの進み具合を確認できるようにする。HTTP応答から正の `Content-Length` を取得できた資産だけを総量既知として扱い、複数資産の受信byteを合算して整数％を表示する。いずれかの総量を取得できない間は、受信済みbyteだけを表示して不定進捗バーを維持し、推定総量や推定％を作らない。

受信完了後のgzip展開・形式検査・TypedArray生成は通信とは別の処理なので、「受信完了・展開中」と区別する。失敗時は従来の全Canvas一括再試行を維持し、再試行時に集約値を初期化する。各取得には世代tokenを割り当て、失敗した旧取得の遅延イベントが新しい試行の値を上書きしない。

## 実装範囲

- `src/downloadProgress.mjs`: 複数資産の受信量・総量・整数％・受信／処理phaseを集約する。資産単位の受信量は後退させない。
- `app/AtlasVolumeCanvas.tsx`: `ReadableStream` が利用できる応答をchunk単位で読み、断面画像、手動ラベル、全3Dメッシュを同じ計測経路へ通す。streamがない場合も一括取得後の実byteだけを記録する。
- `app/canvas.css`: 数値をtabular表示し、狭幅では折り返してCanvas領域から横にはみ出さない。
- `tests/download-progress.test.mjs`: 総量既知、総量不明、複数資産、単調増加、展開phase、失敗後のreset、旧世代無視、byte表記を固定する。

## 2026-08-23 実ブラウザ結果

Windows 11／Chrome 151のCodex内蔵ブラウザで、Pages想定buildを `http://127.0.0.1:4197/brain-practical-navi/#workspace/sections/horizontal` から確認した。100 ms遅延・512 KiB/s相当の一時的な通信制限とキャッシュ無効化を使用し、次を確認した。

- 総量不明時: `9.4 MB 受信済み（総量不明）`、`progress` の `value`／`max`なし。
- 総量既知時: `12 MB / 12 MB（100%）`、`value=12161658` と `max=12161658` が一致。
- 390 px設定時の内蔵ブラウザ実効 `innerWidth` は295 pxだったが、数値表示の横はみ出し、画面内alertは0。
- 低速取得完了後はCanvas 1、残留loader 0、画面内alert 0、横はみ出し0。

同じPages想定buildの全経路回帰は `work/browser-audit/beta-route-audit-download-progress-2026-08-23.json` に保存した。26経路×3幅×direct/reloadの156/156件が合格し、missing／duplicateは0、console／request／UI error、残留loader、横はみ出し、WebGL fallbackも0だった。

## 自動検証

- 全自動テスト: 227/227成功。
- TypeScript型検査: 成功。
- 通常本番ビルド: 成功。
- GitHub Pages向け本番ビルド: 成功。
- `git diff --check`: 成功。

## 確認範囲の限界

これはローカル配信とデスクトップChromeのviewport模擬による確認であり、公開URL、実際の公開回線、物理スマートフォン、Safari・別ブラウザ、別GPUでの速度や表示を保証しない。サーバーが `Content-Length` を公開しない場合は、意図どおり％を表示しない。
