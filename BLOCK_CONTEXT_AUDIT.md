# ブロック標本・切り出し文脈監査

更新日: 2026-08-22

## 目的と範囲

側脳室の全景標本だけを対象に、局所標本を観察する前に全脳内のおおよその位置と代表断面を確認できる pilot を追加した。これは標本作製の手順、切断幅、摘出順、全切断面の再現ではない。実標本の代替、研究用 ground truth、専門家による解剖学的確定表示として扱わない。

## 実装契約

- 「全脳で位置を確認」は初期状態を OFF とし、ON のときだけ追加のコンテキスト Canvas を DOM へ生成する。閉じると追加 Canvas は破棄される。
- 全脳表示は既存の pial-left / pial-right を `view="ghost"` で描き、既存の `block-lateral-ventricle-tissue.mesh` を同一格子上の「位置目安」として重ねる。頂点移動、変形、拡大縮小は行わない。
- 全脳表示の切断面は既存 `showCutPlane` を使い、標本メタデータの `plane:"sagittal"`、`position:58` を再利用する。
- 「代表断面」へ切り替える表示も同じ metadata の矢状断58を使う。断面画像は教材内の対応確認用である。
- コンテキストの回転状態・WebGL fallback 状態は局所標本の回転、部品着色、標本組織（透過／通常／非表示）状態と別 state に保持する。
- 対応するのは `lateral-ventricle` のみ。他7標本へ自動展開しない。
- 390 px相当以下では標本、コンテキスト、解説を縦積みにし、コンテキスト操作ボタンの最小高さを44 pxとする。

## データ監査

`public/atlas/specimen-blocks.json` の側脳室標本は、既存の5部品と順序を維持している。コンテキストに使う tissue 部品は次の記録済みデータである。

| 項目 | 値 |
| --- | --- |
| ファイル | `block-lateral-ventricle-tissue.mesh` |
| sourceType | `specimen-derived` |
| material | `specimen` |
| 頂点 / 面 | 34,252 / 67,900 |
| 代表断面 | sagittal / 58 |

自動監査では、tissue mesh と pial-left / pial-right の BNM ヘッダー、ファイル長、全頂点の有限値、tissue の bounding box が左右 pial の配布座標範囲に内包されること、既存の sagittal 58 切断座標がその bounding box と交差すること、DATA-MANIFEST の specimen-block-assets 所属を検査する。これは座標範囲と断面交差の監査であり、解剖学的連結性、切り出し境界、実標本の摘出範囲を証明するものではない。新しい標本 mesh や外部画像は追加していない。

自動テストだけでは保証しない Canvas の実生成・破棄、React state の DOM ライフサイクル、ブラウザの console error と実際の横はみ出しは、下記の Windows 実ブラウザ監査で補完した。

## Windows 実ブラウザ監査

2026-08-22、通常の本番 Vite build を `http://127.0.0.1:4195` で配信し、Chrome 151.0.7922.170 で確認した。

- 側脳室標本への入場時はコンテキスト OFF、Canvas 1。ON で Canvas 2、代表断面への切替後も Canvas 2、閉じると Canvas 1へ戻った。
- 局所標本を「通常」「反対側」「海馬 OFF」にしてからコンテキストを開閉しても、その3状態を保持した。閉じた後のフォーカスは「全脳で位置を確認」へ戻った。
- コンテキストを開いたまま Home へ離脱し、ブラウザ履歴で側脳室標本へ戻ると、コンテキストは初期 OFF に復帰した。
- 390×768相当では代表断面と説明が縦積みになり、実効 `innerWidth` 295 pxに対して `scrollWidth` 284 pxで横はみ出しはなかった。console error/warning は0件だった。
- 同じ build の26経路×3幅×direct/reload＝156/156件が合格した。console/request/UI error、残留 loader、横はみ出し、WebGL fallback は0件だった。記録は `work/browser-audit/beta-route-audit-block-context-final-2026-08-22.json`（ローカル作業用・配布対象外）。

## 未確認事項

- コンテキスト ON 時の追加取得量・安定時間は、通常の側脳室標本（Canvas 1）とは別に実ブラウザで測定する。
- 「全脳から切り出した実標本の範囲」や解剖学的境界の専門家レビューは、この pilot では完了していない。
- 物理スマートフォンのタッチ操作、異なる GPU・別ブラウザ、公開 URL は未確認である。
