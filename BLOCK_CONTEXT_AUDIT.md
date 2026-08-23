# ブロック標本・切り出し文脈監査

更新日: 2026-08-23

## 目的と範囲

教材内の8ブロック標本を対象に、局所標本を観察する前に全脳内のおおよその位置と教材内代表断面を確認できる表示へ、既存の側脳室 pilot をデータ駆動で拡張した。これは標本作製の手順、切断幅、摘出順、全切断面の再現ではない。実標本の代替、研究用 ground truth、専門家による解剖学的確定表示として扱わない。

## 実装契約

- 「全脳で位置を確認」は初期状態を OFF とし、ON のときだけ追加のコンテキスト Canvas を DOM へ生成する。閉じると追加 Canvas は破棄される。
- 全脳表示は既存の pial-left / pial-right を `view="ghost"` で描き、`specimen-blocks.json` で `material:"specimen"` の既存メッシュだけを同一格子上の「位置目安」として重ねる。頂点移動、変形、拡大縮小は行わない。後脳標本だけは既存の橋・延髄、小脳、中脳の3部品をまとめて扱う。
- 全脳表示の切断面は既存 `showCutPlane` を使い、各標本の既存 `plane` / `position` を再利用する。「代表断面」も同じ値を使い、教材内の対応確認用とする。
- コンテキストの回転状態・WebGL fallback 状態は局所標本の回転、部品着色、標本組織（透過／通常／非表示）状態と別 state に保持する。
- 対応キーは教材内の8標本だけに固定し、比較用模式モデルと未知のキーは受け付けない。
- 390 px相当以下では標本、コンテキスト、解説を縦積みにし、コンテキスト操作ボタンの最小高さを44 pxとする。

## データ監査

`public/atlas/specimen-blocks.json` の既存部品と順序は変更していない。コンテキストは次の既存値と `material:"specimen"` 部品だけを参照する。

| 標本 | 代表断面 | 位置目安メッシュ |
| --- | --- | --- |
| 側脳室の全景 | sagittal / 58 | tissue |
| 視床・視床下部 | sagittal / 50 | tissue |
| 放線・投射線維 | horizontal / 53 | tissue |
| 交連線維系 | sagittal / 50 | tissue |
| 脈絡叢と海馬 | sagittal / 55 | tissue |
| 内側側頭葉 | horizontal / 69 | tissue |
| 中脳横断 | horizontal / 67 | tissue |
| 脳幹・小脳 | horizontal / 80 | pons-medulla / cerebellum / midbrain |

自動監査では、対象8キー、既存の代表断面値、10個の標本材質メッシュの BNM ヘッダー・ファイル長・全頂点の有限値・描画に使う全脳shell（左右 pial、小脳、橋・延髄、中脳）の配布座標範囲と各軸で重なること、側脳室 pilot の左右 pial 範囲への厳密な包含、各標本材質部品のunion bboxとrenderer軸対応後の代表断面座標との交差、DATA-MANIFEST 所属、初期OFFと離脱時の全脳表示へのreset、未知キー拒否、単一部品の再利用と後脳3部品の遅延読込契約を検査する。軸対応は sagittal→raw axis 2、horizontal→raw axis 0、coronal→raw axis 1 に固定する。これは座標範囲と断面交差の監査であり、解剖学的連結性、切り出し境界、実標本の摘出範囲を証明するものではない。新しい標本 mesh や外部画像は追加していない。

自動テストだけでは保証しない Canvas の実生成・破棄、React state の DOM ライフサイクル、ブラウザの console error と実際の横はみ出しは、下記の Windows 実ブラウザ監査で補完した。

## Windows 実ブラウザ監査

2026-08-22、通常の本番 Vite build を `http://127.0.0.1:4195` で配信し、Chrome 151.0.7922.170 で確認した。

以下の5項目は拡張前の側脳室標本だけの記録である。

- 側脳室標本への入場時はコンテキスト OFF、Canvas 1。ON で Canvas 2、代表断面への切替後も Canvas 2、閉じると Canvas 1へ戻った。
- 局所標本を「通常」「反対側」「海馬 OFF」にしてからコンテキストを開閉しても、その3状態を保持した。閉じた後のフォーカスは「全脳で位置を確認」へ戻った。
- コンテキストを開いたまま Home へ離脱し、ブラウザ履歴で側脳室標本へ戻ると、コンテキストは初期 OFF に復帰した。
- 390×768相当では代表断面と説明が縦積みになり、実効 `innerWidth` 295 pxに対して `scrollWidth` 284 pxで横はみ出しはなかった。console error/warning は0件だった。
- 同じ build の26経路×3幅×direct/reload＝156/156件が合格した。console/request/UI error、残留 loader、横はみ出し、WebGL fallback は0件だった。記録は `work/browser-audit/beta-route-audit-block-context-final-2026-08-22.json`（ローカル作業用・配布対象外）。

2026-08-23、拡張後の通常production preview `http://127.0.0.1:4230/` で教材内8標本を確認した。

- Codex in-app Browser（実効970 px）で8標本すべてを順に開き、初期Canvas 1、位置表示ONで2、代表断面でも2、閉じた後は1へ戻ることを確認した。各標本の既存 plane / position 表示、loader 0、UI error 0、console error 0、横はみ出し0、閉じた後の起点フォーカス復帰も確認した。
- 代表断面を選んだ状態で別標本へ切り替えると位置表示は閉じ、再度開いたときは「全脳＋切断面」へ戻った。前標本の表示状態は持ち越さない。
- Chrome 151のCDPデスクトップemulation（390×768、`mobile:false`）でも8/8件が合格した。全件Canvas `1→2→2→1`、loader／UI／console／request error、横はみ出し、WebGL fallbackは0件だった。この一括確認では性能値を保存・比較していない。

## 側脳室ブロック context ON 性能（2026-08-23）

Windows 11、Chrome 151.0.7922.170、Node 24.19.0、ローカルpreview `http://127.0.0.1:4204/` のCDPデスクトップemulationで、既存31件＋context ON 6件の37/37件を測定した。機械可読な結果は `work/performance/performance-suite-block-context-final-v2-2026-08-23.json` に保存している。

| viewport / mode | base bytes / req / stable | ON bytes / req / stable | ON settled / samplePeak backing storage |
| --- | ---: | ---: | ---: |
| PC 1366×768 cold | `2899064 / 9 / 836.7 ms` | `33043046 / 7 / 727.8 ms` | `32653591 / 171607098` |
| PC 1366×768 warm | `1120 / 8 / 736.7 ms` | `33043046 / 7 / 729.0 ms` | `32653591 / 171607098` |
| tablet 1024×768 cold | `2899064 / 9 / 824.8 ms` | `33043046 / 7 / 776.0 ms` | `32097847 / 171607107` |
| tablet 1024×768 warm | `1120 / 8 / 777.5 ms` | `33043046 / 7 / 740.7 ms` | `32653591 / 171607098` |
| mobile 390×768 cold | `2899064 / 9 / 790.3 ms` | `33043046 / 7 / 726.5 ms` | `32653595 / 171607111` |
| mobile 390×768 warm | `1120 / 8 / 742.3 ms` | `33043046 / 7 / 758.1 ms` | `32653595 / 171607111` |

ONのフィールドは通常経路と分離し、stable時の `settled` と操作全体の `samplePeak`（JSONの `sampledPeak` alias）を別に保持した。6件すべてでCanvas `1→2→2→1`、loader／UI error／console error／request error／横はみ出し／WebGL fallbackは0件だった。cold／warmともwarm primeはベース画面だけで、context assetは初回ON時に取得した。390 pxは `mobile:false` のデスクトップemulationで実効 `clientWidth` 375 px。物理端末、公開ネットワーク、別GPU・別ブラウザ、解剖学的妥当性はこの計測の対象外である。

## 未確認事項

- コンテキストONの追加取得量・安定時間・メモリは上記のWindowsローカル計測で確認済みである。物理端末・公開ネットワークの値は別途未確認である。
- 8標本とも「全脳から切り出した実標本の範囲」や解剖学的境界の専門家レビューは完了していない。
- 側脳室以外の7標本について、追加取得量・安定時間・メモリの保存済み性能値は未作成である。
- 物理スマートフォンのタッチ操作、異なる GPU・別ブラウザ、公開 URL は未確認である。
