# 公開データ量・性能監査

更新日: 2026-08-23

<!-- beta-current-snapshot:start -->
Current machine-readable values: [BETA_CURRENT_SNAPSHOT.json](BETA_CURRENT_SNAPSHOT.json). All other counts in this document are dated historical evidence, not current inventory or approval.
<!-- beta-current-snapshot:end -->

本書の転送量・経路数・ローカルserver停止によるPWA回復性は、各節の日付時点の再現履歴です。公開回線、物理端末、OS全体の通信断、実インストール、Safari・別ブラウザは未確認です。

## 目的

高解像度断面と3Dモデルを維持しつつ、閲覧しないデータまで利用者へ配信しないことを公開条件とします。ここでいう「公開物全体」はGitHub Pagesのビルドへ入る `public/` 以下の合計であり、1回の閲覧ですべてを取得する量とは異なります。

## 2026-08-24 公開前チェックprojection

Go／No-Go台帳原本をbrowser bundleへ直接含めず、安全な表示projectionだけを生成した。直前のPWA導線buildに対し、最終通常buildのentry JavaScriptは537.08 kB／gzip 157.48 kBから560.34 kB／162.05 kB、CSSは136.83 kB／28.25 kBから140.00 kB／28.87 kBとなった。増分は既存12基準の表示文とCSSで、新しい画像・mesh・volume・atlas requestはない。本番bundleに `work/browser-audit`、`localArtifactRefs`、`committedEvidenceRefs`、`criterionText` がないことを確認した。最終buildのcanonical cold初回payloadは27/27件、route監査は162/162件に合格した。

## 2026-08-23 数値読込進捗

断面画像、手動ラベル、3Dメッシュの応答bodyをstreamで読み、複数資産の実受信byteを集約するよう変更した。全資産から正の `Content-Length` を取得できる場合だけ総量と整数％を表示し、一つでも不明なら受信済みbyteのみを示す。gzip展開・形式検査は受信後の処理として区別し、再試行では集約値をresetする。旧試行の遅延chunkが新試行へ混ざらないよう資産ごとの世代tokenも固定した。

Chrome 151のPages想定buildで、総量不明の `9.4 MB 受信済み（総量不明）`、総量既知の `12 MB / 12 MB（100%）` と `progress value=max=12161658`、390 px相当の横はみ出しなし、低速読込完了後loader／alert 0を確認した。全経路回帰は `work/browser-audit/beta-route-audit-download-progress-2026-08-23.json` の156/156件に合格した。公開URL・実公開回線・物理端末の性能値ではない。詳細は [DOWNLOAD_PROGRESS_AUDIT.md](DOWNLOAD_PROGRESS_AUDIT.md)。

## 2026-08-23 pialメッシュ圧縮の実測状況

左右pialの既存 `.mesh` は保持したまま、決定的なlossless gzip sidecar（`pial-left.mesh.gz`／`pial-right.mesh.gz`）を追加しました。ローダーはこの2つの論理メッシュだけを圧縮物理パスへ対応づけ、gzip magicのときだけ展開して既存のBNM解析へ渡します。初回route payload監査は圧縮物理パスだけを観測し、raw `.mesh` 要求は0件でした。

新しい初回payload監査は `work/performance/initial-route-payload-audit-pial-gzip-2026-08-23.json` に保存し、canonical 26/26経路が合格しました。sectionsは26,441,013 Bで、旧監査の34,688,033 Bから8,247,020 B（23.8%）減り、surface-lateralは12,804,281 Bで旧監査の21,051,301 Bから減りました。旧34.69 MBは前回実測の履歴として残し、現在値とは扱いません。性能suiteは `work/performance/performance-suite-pial-gzip-2026-08-23.json` の37/37件が合格し、関連経路のstable-time回帰はすべて1%未満、sampledPeak backing storageの最大増加は2.0%でした（レビュー閾値25%未満）。route監査は `work/browser-audit/beta-route-audit-pial-gzip-2026-08-23.json` の156/156件が合格し、error／loader／overflow／WebGL fallbackは各0件です。`public/` 全体はPWA用PNGアイコン追加後92,446,938 B（88.16 MiB）で、100 MiB上限まで11.84 MiBを残します。

同じローカルpreview（`http://127.0.0.1:4211`）の視覚確認では、PCはcombinedを押した状態でCanvas 3、狭幅は初期section-onlyでCanvas 1からcombinedでCanvas 3、2つの3D view描画、console warning/error 0を確認しました。要求1366 px時のin-app browser実効`clientWidth`は1035 px、要求390 px時は284 pxであり、物理viewportの寸法としては扱いません。

## 第1回監査

| 項目 | 変更前 | 変更後 |
| --- | ---: | ---: |
| Git管理された `public/` 合計 | 139.9 MiB | 78.5 MiB |
| 削減量 | － | 61.3 MiB（43.9%） |
| 自動上限 | なし | 100 MiB未満 |

アプリから参照されていなかった次の旧比較・試作出力を公開物から除外しました。

- `bigbrain-400um.bin.gz`: 旧解像度の比較用組織データ
- `brain-practical-segmented-v2.glb`: 現行描画器で使用しない一体型GLB
- `segment-cortex.mesh`: 現行の左右高密度脳表で代替済み
- `brain.mesh`: 現行の左右高密度脳表・分節モデルで代替済み

ローカルに残っていた未圧縮の `mni-cerebra-1mm.bin` はGit管理・GitHub Pages配備の対象外でしたが、ローカルビルドの肥大化を防ぐため生成対象からも外しました。必要な1 mmデータは圧縮版 `mni-cerebra-1mm.bin.gz` を使用します。

## 保全策

- `npm test` で `public/` が100 MiB未満であることを確認する。
- 除外した旧ファイルが再生成・再同梱された場合はテストを失敗させる。
- アトラス再生成スクリプトも旧出力を削除し、圧縮版と現行メッシュだけを生成する。
- 画質のために上限を超える必要が生じた場合は、無断で緩和せず、転送量と教材上の理由を本書へ記録する。

## 次の計測

- 初回のトップ表示、脳表観察、断面実習、局所標本ごとの実転送量
- キャッシュ済み再訪時の転送量
- PC・スマートフォンの初回描画時間とピークメモリ
- 読み込み失敗時の再試行

脳表3Dでは、主要な左右脳表・小脳・脳幹だけを基礎読込とし、血管、脳神経、脳底ランドマーク、深部構造、溝メッシュは実際に表示する時だけ取得する方式へ変更しました。次段階では、公開物全体の大きさだけでなく「利用者が選択した教材で実際に取得される量」を実ブラウザで計測します。

## M1 Windows実ブラウザ計測

計測日: 2026-08-14

### 環境と方法

- Windows Chromium 151（UA: Windows NT 10.0 / Chrome 151.0.0.0）、16論理コア、端末メモリ32 GB、DPR 1
- 本番Viteビルドを `http://localhost:4173/` で配信し、通常幅1366 × 768 pxとスマートフォン相当390 × 768 pxで計測
- 初回はDevTools Protocolでブラウザキャッシュを無効化し、再訪はキャッシュを有効化。転送量は `Network.loadingFinished.encodedDataLength` の合計
- 表示安定時間は、直接URL遷移から読込表示とエラー表示がなくなり、Canvasが揃うまで。ローカル配信値のため、公開回線の待ち時間を表すものではない
- メモリは経路ごとに新規タブを作り、表示完了後の `Runtime.getHeapUsage` を記録。ピーク値ではなく、描画直後の常駐量

### 1366 × 768 px・初回

| 経路 | 転送量 | 要求数 | DCL | 表示安定 | JS処理時間 | JS heap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| トップ `#workspace/home` | 20.1 MiB | 10 | 67 ms | 0.73 s | 162 ms | 19.1 MiB |
| 脳表 `#workspace/surface/lateral` | 20.1 MiB | 10 | 65 ms | 0.68 s | 164 ms | 14.9 MiB |
| 水平断 `#workspace/sections/horizontal` | 33.1 MiB | 14 | 71 ms | 0.70 s | 418 ms | 9.3 MiB |
| 側脳室標本 `#workspace/blocks/lateral-ventricle` | 2.7 MiB | 10 | 70 ms | 0.96 s | 130 ms | 19.2 MiB |
| クイズ `#workspace/quiz` | 11.7 MiB | 7 | 64 ms | 0.68 s | 213 ms | 17.6 MiB |
| 編集 `#workspace/segment` | 11.7 MiB | 7 | 58 ms | 0.68 s | 232 ms | 9.7 MiB |

水平断だけ暫定目安20–30 MBを約3.1 MiB超えます。単一標本画像、手動ラベル、左右脳表と切断位置用3Dを同時に用いる教材上の構成が理由です。現段階では画質や照合可能性を落として削減せず、M2で初期表示に不要な3D取得をさらに分離できるか検討します。

### キャッシュ済み再訪

| 経路 | 実転送量 | DCL | 表示安定 |
| --- | ---: | ---: | ---: |
| トップ | 2.0 KiB | 71 ms | 0.68 s |
| 脳表 | 2.0 KiB | 46 ms | 0.68 s |
| 水平断 | 2.5 KiB | 37 ms | 0.67 s |
| 編集 | 1.6 KiB | 35 ms | 0.67 s |

再訪時は大容量アセットがブラウザキャッシュから供給され、ネットワーク再転送はHTML等の確認分だけでした。

### 390 × 768 px・初回

トップは20.1 MiB、DCL 66 ms、JS処理161 ms、水平断は33.1 MiB、DCL 64 ms、JS処理329 msでした。両方ともCanvas描画、読込完了、横はみ出しなしを確認しました。これはWindows Chromiumのviewport模擬であり、実スマートフォン実機のCPU・GPU・回線・ピークメモリ計測は未完了です。

この計測後、小画面の断面実習は「断面のみ」を初期値とし、左右脳表3Dを「断面＋3D」または「3Dのみ」を選ぶまで取得しないよう変更しました。PCでは従来どおり断面と3Dを同時表示します。初期データセットから左右脳表だけで17.5 MiBが外れ、断面画像と手動ラベルは合計11.6 MiBです。Windows実ブラウザでは「断面のみ」で3D DOMが0件、「断面＋3D」へ切り替えると2方向Canvasが現れることを確認しました。公開回線を含む実転送量と実スマートフォンのピークメモリは引き続き未計測です。

### 描画直後のメモリ内訳

| 経路 | JS heap | ArrayBuffer等のbacking storage | embedder heap |
| --- | ---: | ---: | ---: |
| トップ | 7.6 MiB | 26.8 MiB | 2.7 MiB |
| 脳表 | 7.7 MiB | 26.8 MiB | 3.5 MiB |
| 水平断 | 7.1 MiB | 161.9 MiB | 4.0 MiB |
| 編集 | 6.9 MiB | 134.4 MiB | 5.2 MiB |

断面・編集は展開後の0.5 mm画像・ラベル配列を保持するため、転送量よりbacking storageが大きくなります。実機ピークの採取と、断面を離れた後の回収確認は次回計測へ残します。

断面Canvasの最後の1枚が破棄されて750 ms経過すると、展開済みT1/T2・BigBrain・固定脳MRI・手動ラベルへのモジュール参照を解放するよう変更しました。編集ツールの別キャッシュも画面離脱時に解放します。短時間のCanvas組み替えではタイマーを取り消し、ブラウザのHTTPキャッシュは消さないため、再訪時のネットワーク再転送は増やしません。JavaScriptからGC実行時刻は指定できないため、実際の回収量は次回の実機・DevTools計測で確認します。

Windows実ブラウザで断面3 Canvasを表示後、トップへ移動して1秒待ち、同じ水平断へ再訪しました。断面1枚と2方向3Dが読込エラーなく復帰しました。編集ツールも同様に離脱・再訪し、水平・冠状・矢状の3 Canvasが復帰しました。参照解放後の再展開経路は成立しています。

3Dについても、最後のsurface Canvasが破棄されて750 ms経過すると、読み込み済みメッシュのPromiseキャッシュを解放します。短時間のCanvas組み替えではタイマーを取り消し、ブラウザのHTTPキャッシュと表示中Canvasの参照は維持します。これにより、脳表・全脳・局所標本を離れて編集ツール等へ移った後、未使用メッシュがモジュールキャッシュだけを理由に残り続ける状態を避けます。

Windows実ブラウザで側脳室標本（Canvas 1）から編集ツール（Canvas 3）へ移り、1.1秒後に同じ標本へ戻しました。標本はCanvas 1、読込残り0、画面内エラー0で再構成され、console error/warningも0でした。JavaScriptからGC完了量を断定はせず、参照解放と再訪可能性の確認として記録します。

### 読込失敗・再試行回帰

`pial-right.mesh` を一時的にブロックして水平断を直接読み込み、2個の全脳インセットがエラーになる条件を再現しました。ブロック解除後、一方の「再読み込み」を1回押すだけで両方が再取得され、Canvas 3枚、読込残り0、エラー0へ復帰しました。修正コミットは `c0a3482` です。

4 MiB/s・100 ms遅延を模擬した初回トップ表示では、取得中に「組織切片データを読み込み中…」と読込進捗バーが表示され、完了後に消えることも確認しました。通常速度での水平断再読込は3回連続で成功しました。短時間に全経路を強制再読込した負荷試験時だけ旧版で見えた一過性エラーは、通常操作では再現していません。

## 2026-08-21 Home軽量化実測

キャッシュとService Workerのない新規localhost originをChrome DevTools Protocolで計測しました。HomeはHTML、CSS、JavaScript、favicon、実モデル静止プレビューの5要求だけで、encoded転送量は合計164,926 bytes（約161 KiB）、Canvasは0、本格3D mesh要求は0でした。内訳はJavaScript 123,064 bytes、CSS 21,333 bytes、静止プレビュー19,509 bytes、その他1,020 bytesです。

同じタブで「脳表」を開くとCanvasが1つ生成され、左右pial、小脳、橋・延髄、中脳の5 meshを20,880,768 bytes（約19.9 MiB）取得しました。したがって、旧トップ実測20.1 MiB相当の本格3D取得はHomeから分離され、脳表観察の開始時まで遅延しています。

## 2026-08-23 PWA・オフライン基盤

Web App Manifestとbuild revision付きService Workerを追加した。`public/` 約92.4 MBをinstall時に全量取得せず、最終通常buildのshellは628,809 bytes、Pages buildは629,042 bytesで、各5件（index、entry JavaScript、CSS、manifest、favicon）だけだった。同一origin・同一scope内の成功した静的GETは、利用時にrelease別data cacheへ保存する。外部origin、`/cdn-cgi/`、GET以外、Range要求、不透明応答、非2xx応答は保存しない。

Chrome 151のローカルPages build `http://127.0.0.1:4219/brain-practical-navi/` で、manifest URL、Service Worker URLとscope、active/controller、shell cache 5件を確認した。脳表・左外側面をオンラインで開いた後はCanvas 1、loader／alert 0、data cache 5件だった。通信遮断後の再読込はCodex内蔵ブラウザのURL安全ポリシーに拒否されたため、同じ結果を別手段で迂回せず未確認とした。これはアプリの失敗判定ではなく、offline direct/reload、未訪問時の表示、オンライン復帰後の再試行に実測証拠がないという意味である。詳細は [PWA_OFFLINE_AUDIT.md](PWA_OFFLINE_AUDIT.md)。

PWA追加後の最終通常buildは `http://127.0.0.1:4221/` で全26経路をPC／tablet landscape／390 px相当のdirect／reloadで再監査し、`work/browser-audit/beta-route-audit-pwa-final-2026-08-23.json` の156/156件が合格した。

2026-08-24、Homeの端末追加導線後にcanonical 27経路を再測定し、route監査162/162件、cold初期payload 27/27件が合格した。新しい画像、mesh、volumeなどのネットワーク資産は追加していない。実インストールや公開回線の性能証拠ではない。

## 再現可能なローカル計測方法

本番Viteビルドをローカルのpreviewサーバーで配信し、次のスクリプトを同じWindows端末で実行します。計測値をこの文書へ転記する場合は、実行日時、端末、Chromeバージョン、viewport、経路、`cold`／`warm`の別を併記し、実測していない値は補いません。

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4173

node scripts/measure_browser_performance.mjs `
  --base-url http://localhost:4173 `
  --route '#workspace/home' `
  --width 1366 --height 768 `
  --mode cold `
  --output work/performance/home-cold.json
```

固定したβ候補版マトリクス（PC 1366×768・タブレット横 1024×768は6経路のcold／warm、モバイル390×768はトップ・水平断・クイズのcold／warmとbasic-mobile操作確認）を一括計測する場合は、次を実行します。出力JSONにはマトリクス定義と各計測結果を含め、1件でも失敗すればJSONを書き出した上で終了コードを非0にします。

```powershell
node scripts/measure_browser_performance_suite.mjs `
  --base-url http://localhost:4173 `
  --output work/performance/suite.json
```

`scripts/measure_browser_performance.mjs` は、外部npm依存なしで、同梱Nodeの `fetch` と `WebSocket` を使ってインストール済みChromeをDevTools Protocolへ接続します。計測ごとに一時プロファイルを作成し、`cold` はキャッシュ無効化・消去後の1回、`warm` は同じ経路を一度表示してからキャッシュを有効にした2回目を記録します。`--route` はハッシュ経路または相対URLを受け付けますが、誤って公開サイトを計測しないよう `--base-url` はlocalhost／ループバックに限定しています。

Viteの通常ビルドはルート（`http://localhost:4173/` など）で配信し、`DEPLOY_GITHUB_PAGES=true` のPages向けビルドは `/brain-practical-navi/` のbase pathを含むURLで計測します。base pathと`--base-url`が一致しない場合、HTMLだけが返ってアプリのJavaScriptが読み込まれないため、出力の `appRootPresent` と `measurementPassed` を確認します。画面内ローダー、アプリroot欠落、console／要求エラー、画面内エラー、basic-mobileシナリオの失敗はいずれも実行失敗として扱い、JSONを保存した上で終了コードを非0にします。

一括計測では、ブロック標本の注意画面にある「試作品を確認する」を測定中に押して、代表標本のCanvasと遅延アセットまで取得対象に含めます。クイズは初回問題の違いでcold／warmの取得対象が変わらないよう、隔離した測定用Chrome内だけで乱数列を固定します。アプリ本体の通常動作や利用者の出題順は変更しません。

出力JSONには、`Network.loadingFinished.encodedDataLength` の合計、ユニーク要求数、DOMContentLoaded、ネットワーク要求と画面内ローダーが安定した時刻、console／要求エラー、Canvas数、画面内エラー要約、水平スクロールの有無、`Runtime.getHeapUsage` の安定時値と計測中サンプルの最大値（`usedSize`、`backingStorageSize`、`embedderHeapUsedSize` 等）を記録します。通常閲覧の `.atlasLoading` と共同編集の `.segLoading` をともに監視し、編集データの読込完了前にwarm準備を打ち切りません。`work/` はローカル計測結果の置き場であり、計測値を作成者の実測なしに監査表へ追加しません。

## 2026-08-22 β候補版の固定マトリクス実測

通常の本番ビルドを `http://127.0.0.1:4176/` で配信し、固定31件を再実行しました。環境は Windows 11 Home 10.0.26200、16論理CPU、31.6 GiB RAM、Chrome 151.0.7922.170、Node 24.19.0 です。31/31件で `measurementPassed: true` となり、console error、要求失敗、画面内エラー、残留ローダー、水平はみ出しはいずれも0件でした。

計測はChrome DevTools Protocolのデスクトップ用条件で、`Emulation.setDeviceMetricsOverride` の `mobile:false`、デスクトップUA、タッチエミュレーションなしを使用しました。したがってスマートフォン相当390×768の実効 `clientWidth` は、デスクトップスクロールバーを含むChromeでは375 pxです。操作確認はDOMイベントとして、ボタンのクリック、range入力の `input`／`change`／`keydown`、表示切替後のCanvas・選択状態を実行しました。表の `backingStorageSize` は、同じ経路・viewportのcold／warmペアで採取した `Runtime.getHeapUsage` の `sampledPeak` の大きい方を記載しています。

| viewport | 経路 | cold転送 | warm転送 | 安定時間 cold / warm | sampled peak backing storage | Canvas |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| PC 1366×768 | Home | 0.14 MiB | 0.5 KiB | 689 / 683 ms | 0.4 MiB | 0 |
| PC 1366×768 | 脳表・左外側面 | 20.06 MiB | 1.1 KiB | 875 / 798 ms | 27.5 MiB | 1 |
| PC 1366×768 | 水平断 | 33.06 MiB | 1.6 KiB | 1,073 / 1,007 ms | 162.8 MiB | 3 |
| PC 1366×768 | 側脳室ブロック標本 | 2.74 MiB | 1.1 KiB | 851 / 719 ms | 4.0 MiB | 1 |
| PC 1366×768 | クイズ | 11.74 MiB | 0.7 KiB | 928 / 821 ms | 133.3 MiB | 1 |
| PC 1366×768 | 共同編集 | 11.74 MiB | 0.7 KiB | 1,003 / 884 ms | 133.4 MiB | 1 |
| タブレット横 1024×768 | Home | 0.14 MiB | 0.5 KiB | 688 / 671 ms | 0.4 MiB | 0 |
| タブレット横 1024×768 | 脳表・左外側面 | 20.06 MiB | 1.1 KiB | 848 / 801 ms | 26.9 MiB | 1 |
| タブレット横 1024×768 | 水平断 | 33.06 MiB | 1.6 KiB | 1,064 / 1,036 ms | 162.1 MiB | 3 |
| タブレット横 1024×768 | 側脳室ブロック標本 | 2.74 MiB | 1.1 KiB | 792 / 744 ms | 4.0 MiB | 1 |
| タブレット横 1024×768 | クイズ | 11.74 MiB | 0.7 KiB | 929 / 827 ms | 133.3 MiB | 1 |
| タブレット横 1024×768 | 共同編集 | 11.74 MiB | 0.7 KiB | 988 / 865 ms | 133.4 MiB | 1 |
| スマートフォン相当 390×768 | Home | 0.14 MiB | 0.5 KiB | 765 / 668 ms | 0.4 MiB | 0 |
| スマートフォン相当 390×768 | 水平断（初期は断面のみ） | 11.74 MiB | 0.7 KiB | 866 / 795 ms | 133.4 MiB | 1 |
| スマートフォン相当 390×768 | クイズ | 11.74 MiB | 0.7 KiB | 911 / 763 ms | 133.3 MiB | 1 |

ブロック標本は注意画面を閉じてからCanvas 1と遅延アセットを測っており、入口だけの値ではありません。スマートフォン相当では、クイズの回答からフィードバック表示、水平断スライダーの52→53移動、「断面＋3D」への切替とCanvas 1→3への増加をCDPからDOMイベントで操作し、各段階でローダー0、画面内エラー0、水平はみ出しなしを確認しました。

### 2026-08-22 側脳室全脳内位置 pilot の追加計測待ち

側脳室標本の「全脳で位置を確認」は初期OFFで、ON時だけ全脳表面メッシュと既存 `block-lateral-ventricle-tissue.mesh` を使う追加Canvasを生成します。さらに代表断面へ切り替えた場合は、既存メタデータの矢状断58を使う断面Canvasへ切り替えます。したがって、既存の側脳室標本（Canvas 1）の転送量・安定時間をこの pilot ON 時の値として流用しません。

Chrome 151の実操作ではCanvas 1→2→1、代表断面切替、閉じた後のローダー・console error/warning 0を確認しました。2026-08-22時点ではコンテキストON時の転送量、要求数、安定時間、メモリを個別計測していませんでしたが、下記の2026-08-23計測で追加しました。

## 2026-08-23 側脳室ブロック context ON の追加計測

通常の本番ビルドを `http://127.0.0.1:4204/` で配信し、既存31件に側脳室ブロック context ON の6件を加えた37件を同じ隔離Chrome条件で測定しました。環境は Windows 11、Chrome 151.0.7922.170、Node 24.19.0 です。結果は `work/performance/performance-suite-block-context-final-v2-2026-08-23.json` に保存し、`entryCount: 37`、`allPassed: true`、`measurementPassed: true` は37/37件でした。

| viewport | mode | base encoded bytes / unique requests / stable time | context ON encoded bytes / unique requests / stable time | ON settled `backingStorageSize` | ON samplePeak `backingStorageSize` |
| --- | --- | ---: | ---: | ---: | ---: |
| PC 1366×768 | cold | `2899064 / 9 / 836.7 ms` | `33043046 / 7 / 727.8 ms` | `32653591` | `171607098` |
| PC 1366×768 | warm | `1120 / 8 / 736.7 ms` | `33043046 / 7 / 729.0 ms` | `32653591` | `171607098` |
| tablet 1024×768 | cold | `2899064 / 9 / 824.8 ms` | `33043046 / 7 / 776.0 ms` | `32097847` | `171607107` |
| tablet 1024×768 | warm | `1120 / 8 / 777.5 ms` | `33043046 / 7 / 740.7 ms` | `32653591` | `171607098` |
| mobile 390×768 | cold | `2899064 / 9 / 790.3 ms` | `33043046 / 7 / 726.5 ms` | `32653595` | `171607111` |
| mobile 390×768 | warm | `1120 / 8 / 742.3 ms` | `33043046 / 7 / 758.1 ms` | `32653595` | `171607111` |

JSONでは `blockContextOnEncodedBytes`、`blockContextOnUniqueRequestCount`、`blockContextOnStableTimeMs` を通常経路の値と別フィールドにし、`blockContextOnHeap.settled.backingStorageSize` はON安定時の `Runtime.getHeapUsage`、`blockContextOnHeap.sampledPeak.backingStorageSize`（同値の `samplePeak` alias）は操作全体のサンプル最大値として記録しました。6件すべてでCanvasは `1→2→2→1`（入場→ON→代表断面切替後→close）、loader／UI error／console error／request error／横はみ出し／WebGL fallbackは0件です。

cold／warmとも、warmのprimeはベース画面だけに留め、context assetは「全脳で位置を確認」を初めてONにした時に取得しました。390×768は `mobile:false` のデスクトップemulationで、実効 `clientWidth` は375 pxです。これはWindowsローカルpreviewの測定であり、物理端末、公開ネットワーク、別GPU・別ブラウザは確認していません。解剖学的妥当性の検証でもありません。

同じ最終通常buildを `http://127.0.0.1:4205/` で26経路×3幅×direct/reloadの156通りに再監査し、156/156件が合格した。console／request／UI error、残留loader、横はみ出し、WebGL fallbackは0件で、記録は `work/browser-audit/beta-route-audit-block-context-performance-final-2026-08-23.json`（ローカル作業用・配布対象外）に保存した。

warm転送は同じ隔離プロファイル内で1回表示してから再訪した値で、ローカルpreviewの再検証要求を含みます。これにより主要な大容量アセットがブラウザキャッシュから再利用されることを確認しました。`backingStorageSize` は100 ms間隔で取得したChrome Runtimeのサンプル最大値であり、OS全体のプロセスメモリや測定間隔より短い瞬間ピークではありません。上表ではこの値をcold／warmペアの最大値として扱っています。

この監査はWindows上のviewport模擬とローカル配信です。物理スマートフォン／タブレットのCPU・GPU・メモリ圧迫、公開回線・公開CDNの待ち時間やcache headerを実測したものではありません。したがって、これらを実機値・公開回線値とは表現せず、公開後の任意フォローアップとして残します。

## 2026-08-23 全8ブロック context ON の保存済み計測

位置コンテキストを教材内8標本へ拡張した後、通常production preview `http://127.0.0.1:4232/` を Windows 11、Chrome 151.0.7922.170、Node 24.19.0 で再計測した。基礎31件と、8標本×PC 1366／tablet 1024／390 px相当×cold／warmのcontext ON 48件を合わせた79/79件が `measurementPassed: true` となった。結果は `work/performance/performance-suite-block-context-all-specimens-2026-08-23.json`、独立監査は `work/performance/block-context-performance-audit-all-specimens-2026-08-23.json` に保存した（いずれもローカル作業用・配布対象外）。

PWAのService Workerを通る取得はページtargetのCDPで `encodedDataLength: 0` になる場合があり、初回試行では7 requestを0 byteと誤計上した。この試行は性能証拠として採用せず、計測専用の隔離Chromeだけ `Network.setBypassServiceWorker({bypass:true})` を必須にした。通常ブラウザのPWA挙動やHTTP cacheは変更していない。各結果は `networkPolicy.serviceWorkerBypass: true` を保持し、context ONのrequest pathも基礎画面と分離して記録する。0 byte、0 request、空pathは成功にしない。

48件すべてのcontext ONは同じ7資産を要求し、実ファイル本体合計24,793,927 byteに対してencoded 24,795,951 byte（overhead 2,024 byte）、unique request 7だった。Canvasは全件 `1→2→2→1`、loader／UI／console／request error、横はみ出し、WebGL fallbackは0件。安定時間は698.6–828.9 ms、settled `backingStorageSize` 最大61,288,760 byte（58.45 MiB）、操作中sampled peak最大240,644,605 byte（229.50 MiB）だった。

`scripts/audit_block_context_performance.mjs` は79件の順序・一意性と8×3×2の網羅を再計算し、7資産を実際にstatしてbody byte下限を導出する。encoded上限はbody＋8 KiB、安定時間1,500 ms以下、settled 80 MiB以下、sampled peak 300 MiB以下をローカル回帰の明示閾値とする。欠落、重複、誤path、0 byte、閾値超過を異常系テストで拒否する。

側脳室PC coldを同条件で5回反復すると、安定時間726.8–801.3 ms、settled 35,033,022–38,637,681 byte、sampled peak 171,616,285–236,683,398 byteだった。sampled peak中央値は187,851,689 byteで、pial-gzip直後の保存値171,607,622 byteより9.5%高い一方、単発最大は37.9%高かった。転送量は5回とも24,795,951 byteで一致した。sampled peakは100 ms標本化とGCタイミングで揺れるため、単発最大の差を隠さず記録しつつ、今回の回帰判定は上記固定上限と全48件の値で行う。これは物理端末、公開回線、別GPU・別ブラウザの性能保証ではない。

## 2026-08-23 M2 初回ルートpayload監査（pial gzip現在値）

初回画面で不要な大容量アセットを取得しないことを、canonical 26経路のcold loadで監査した。権威結果は `work/performance/initial-route-payload-audit-pial-gzip-2026-08-23.json`（ローカル作業用・配布対象外）であり、各結果に正規化済みの `requestPaths`（URLのpathname＋search）を観測順で保存している。Windows 11、Chrome 151.0.7922.170、Node 24.19.0、ローカルpreview `http://127.0.0.1:4211/`、requested desktop 1366×768を使用した。これは公開URL、物理端末、別ブラウザ、別GPU、解剖学的妥当性を検証する計測ではない。

初回asset allowlistは次のとおりで、同じfamilyでもallowlist外の大容量要求は失敗とする。pial左右は物理パス `pial-left.mesh.gz`／`pial-right.mesh.gz`だけを許可し、raw `.mesh` 要求は0件だった。

- Home、共同制作、status、help、feedback、legalはatlasなし（static/applicationのみ）。
- 通常のsurface lateral／superior／medialは、圧縮pial左右、cerebellum、pons-medulla、midbrainのbase 5件だけ。
- surface inferior／nerves／freeはbase 5件、basal landmark 5件、midbrain-section cerebral-peduncles、hindbrain pyramids、hindbrain olives、teaching overlayとしてのdiencephalon hypothalamus、nerve overlay 3件。血管overlayは含めない。
- surface arteriesは上記にartery overlay 2件を加え、nerve overlay 3件も含む。
- sectionsは `bigbrain-icbm500.bin.gz`、`bigbrain-practical-segmentation-icbm500.bin.gz`、圧縮pialを含むsurface base 5件、`ventricle.mesh`、`caudate.mesh` の9件。
- blocksは各経路の `block-<route-family>-*.mesh` に対応するJSON内のexact pathだけ。segmentはBigBrain本体＋practical segmentationの2件だけ。
- quizは固定seedで実測した圧縮pialを含むsurface base 5件＋nerve overlay 3件に一致する。将来用のsurface／vessel／section alternativesもJSONに保持し、該当alternativeの `validation.appliedBudget` を適用する。

結果は26/26件がstable・validation passed・`allPassed: true`。missing／duplicate／unexpected route key、console／request／UI error、残留loader、overflow、WebGL fallbackは各0だった。

2026-08-23の3Dモデル方針比較pilot追加後も、`work/performance/initial-route-payload-audit-model-strategy-2026-08-23.json` で同じ26/26件に合格した。比較UIはdynamic import、7,980 bytesの模式meshはパネル開放後のfetchとし、canonical初回経路から `ModelStrategyComparison` chunk と `comparison-schematic-ventricle.mesh` の要求は0件だった。これはローカルproduction previewのcold監査であり、公開回線・物理端末の性能値ではない。

同じ最終通常buildを26経路×3幅×direct/reloadの156通りで再監査し、156/156件が合格した。console／request／UI error、残留loader、横はみ出し、WebGL fallbackは0件で、記録は `work/browser-audit/beta-route-audit-pial-gzip-2026-08-23.json`（ローカル作業用・配布対象外）に保存した。

| route key | encodedBytes | uniqueRequestCount | stableTimeMs | applied budget (bytes) |
| --- | ---: | ---: | ---: | ---: |
| home | 170,608 | 4 | 673.2 | 898,896 |
| surface-lateral | 12,804,281 | 9 | 885.7 | 13,531,165 |
| surface-superior | 12,804,281 | 9 | 824.3 | 13,531,165 |
| surface-inferior | 13,810,497 | 21 | 874.2 | 14,534,157 |
| surface-medial | 12,804,281 | 9 | 849.3 | 13,531,165 |
| surface-arteries | 14,013,459 | 23 | 868.5 | 14,736,581 |
| surface-nerves | 13,810,497 | 21 | 887.6 | 14,534,157 |
| surface-free | 13,810,497 | 21 | 934.2 | 14,534,157 |
| sections-coronal | 26,441,013 | 13 | 1,040.7 | 27,166,735 |
| sections-horizontal | 26,441,013 | 13 | 1,095.5 | 27,166,735 |
| sections-sagittal | 26,441,013 | 13 | 1,020.9 | 27,166,735 |
| blocks-lateral-ventricle | 2,899,300 | 9 | 822.3 | 3,626,236 |
| blocks-diencephalon | 2,413,750 | 10 | 757.1 | 3,140,420 |
| blocks-radiations | 5,002,120 | 12 | 767.9 | 5,728,252 |
| blocks-commissural-system | 2,612,778 | 9 | 816.1 | 3,339,716 |
| blocks-choroid-plexus | 1,767,262 | 8 | 818.1 | 2,494,472 |
| blocks-medial-temporal | 1,924,106 | 8 | 763.4 | 2,651,316 |
| blocks-midbrain-section | 685,928 | 14 | 825.5 | 1,411,532 |
| blocks-hindbrain | 3,815,660 | 17 | 931.6 | 4,540,452 |
| quiz | 13,053,923 | 12 | 904.8 | 13,780,001 |
| collaborate | 170,608 | 4 | 860.6 | 898,896 |
| segment | 12,332,886 | 6 | 964.5 | 13,060,554 |
| status | 170,608 | 4 | 760.8 | 898,896 |
| help | 170,608 | 4 | 727.9 | 898,896 |
| feedback | 170,608 | 4 | 710.6 | 898,896 |
| legal | 170,608 | 4 | 771.7 | 898,896 |

sectionsの現在の初回転送は26,441,013 Bで、旧監査の34,688,033 B（34.69 MB）から8,247,020 B（23.8%）減った。surface-lateralも12,804,281 Bで、旧21,051,301 Bから圧縮pial分だけ減った。34.69 MBと21,051,301 Bはsupersededな前回値として履歴に残し、現在値や今回のallowlistを緩める根拠にはしない。

## 2026-08-23 pial gzip性能suite・視覚確認

`work/performance/performance-suite-pial-gzip-2026-08-23.json` の37/37件（PC・tablet landscape・requested 390×768相当のcold/warm、block-context 6件を含む）が合格した。関連経路のstable-time回帰はすべて1%未満、sampledPeak backing storageの最大増加は2.0%で、レビュー閾値25%を大きく下回る。

`work/browser-audit/beta-route-audit-pial-gzip-2026-08-23.json` の156/156件も合格し、error／loader／overflow／WebGL fallbackは各0件だった。`http://127.0.0.1:4211` の視覚確認では、PCはcombined押下時Canvas 3、狭幅は初期section-only Canvas 1からcombined Canvas 3、2つの3D view描画、console warning/error 0を確認した。requested 1366 px時のin-app browser実効`clientWidth`は1035 px、requested 390 px時は284 pxであり、物理viewportの寸法としては扱わない。

## 2026-08-24 M2比較専用URL追加後の初回payload

寄稿者向けA/B比較の専用URL `#workspace/collaborate/model-strategy` をcanonical routeへ追加し、Windows Chrome 151のローカルproduction preview `http://127.0.0.1:4312` でcold初回payload 27/27件を再測定した。通常の `collaborate` は181,062 encoded bytes・6 requests・5 unique requestsでatlas資産0、`collaborate-model-strategy` は861,927 encoded bytes・10 requests・9 unique requestsで、次の3資産だけをexact allowlistとして取得した。

- `block-commissural-system-lateral-ventricles.mesh`
- `block-diencephalon-third-ventricle.mesh`
- `comparison-schematic-ventricle.mesh`

missing／duplicate／unexpected route key、console／request／UI error、残留loader、overflow、WebGL fallbackは各0で、27/27件がstable・validation passed・`allPassed: true` だった。記録は `work/performance/initial-route-payload-model-strategy-discovery-2026-08-24.json`（ローカル作業用・配布対象外）。通常学習経路の既存allowlistとbudgetは変更していない。canonical route監査も27経路×3幅×direct/reload＝162/162件に合格した。これらはローカルデスクトップChromeの記録であり、公開回線・物理端末・別GPU／別ブラウザの性能保証ではない。

### 端末内レビュー記録追加後

同日のレビュー記録UI追加後、`work/performance/initial-route-payload-model-strategy-review-2026-08-24.json` でcanonical 27/27件を再測定した。通常の `collaborate` は181,598 encoded bytes・6 requests、`collaborate-model-strategy` は866,629 encoded bytes・10 requestsで、比較用3資産のexact allowlistに一致した。比較専用chunkは17.28 kB（gzip 6.65 kB）で、通常の共同制作ページでは取得しない。missing／duplicate／unexpected、console／request／UI error、loader、overflow、WebGL fallbackは0件で、artifact-derived budget 1,624,375 bytes内だった。route監査も `work/browser-audit/beta-route-audit-model-strategy-review-2026-08-24.json` の162/162件に合格した。

### Papez由来別ステッパー追加後

`work/performance/initial-route-payload-papez-stepper-2026-08-24.json` でcanonical 27/27件を再測定した。`surface-free` は13,823,419 encoded bytes・23 requestsで、既存のexact allowlistだけを取得し、artifact-derived budget 14,591,337 bytes内だった。段階定義とUIだけを追加し、新しいatlas asset requestは0件である。missing／duplicate／unexpected、console／request／UI error、loader、overflow、WebGL fallbackは0件だった。route監査も `work/browser-audit/beta-route-audit-papez-stepper-2026-08-24.json` の162/162件に合格した。公開回線、物理端末、別GPU／別ブラウザの性能は未確認である。

### ブロック標本のβ重点導線追加後

`work/performance/initial-route-payload-block-priority-2026-08-24.json` でcanonical 27/27件を再測定した。優先度契約、左レール区分、説明だけを追加し、8標本の既存exact asset allowlistとartifact-derived budgetはすべて維持された。新しいatlas asset request、missing／duplicate／unexpected、console／request／UI error、loader、overflow、WebGL fallbackは0件だった。route監査も `work/browser-audit/beta-route-audit-block-priority-2026-08-24.json` の162/162件に合格した。公開回線、物理端末、別GPU／別ブラウザの性能は未確認である。

### β重点4の部品確認ガイド追加後

`work/performance/initial-route-payload-block-guided-observation-2026-08-24.json` でcanonical 27/27件を再測定した。既存lesson layerを順に切り替えるUIと状態契約だけを追加し、8標本の既存exact asset allowlistとartifact-derived budgetはすべて維持された。新しいatlas asset request、missing／duplicate／unexpected、console／request／UI error、loader、overflow、WebGL fallbackは0件だった。route監査も `work/browser-audit/beta-route-audit-block-guided-observation-2026-08-24.json` のPC・tablet・390 px相当、direct／reload計162/162件に合格した。ガイドの実クリック確認はPCで行い、390 px相当はroute health、overflow 0、CSS 44 px操作契約までを確認した。公開回線、物理端末・タッチ、別GPU／別ブラウザの性能は未確認である。

### 第II脳神経名称同定pilot追加後

`work/performance/initial-route-payload-cn2-quiz-2026-08-24.json` でcanonical 27/27件を再測定した。既存の模式`cn2`をクイズ在庫へ加えただけで、新しい画像、mesh、volume、atlas requestは追加していない。全経路でexact allowlistとartifact-derived budgetを維持し、missing／duplicate／unexpected、console／request／UI error、loader、overflow、WebGL fallbackは0件だった。route監査も `work/browser-audit/beta-route-audit-cn2-quiz-2026-08-24.json` のPC・tablet・390 px相当、direct／reload計162/162件に合格した。公開回線、物理端末・タッチ、別GPU／別ブラウザの性能は未確認である。

## 2026-09-01 利用時読込によるJavaScript分離

日本語版でも常に描画していた `EnglishLocalization` のlazy boundaryを、`lang=en` の場合だけ描画する条件へ移した。さらに、寄稿者専用の `ManualSegmentationWorkbench` と、個別項目を開いた時だけ必要な `AnatomyReviewRecordDraftCard` をdynamic importへ分離した。教材データ、表示内容、操作仕様、atlas requestは変更していない。

通常buildの共通entry JavaScriptは635.65 kB／gzip 181.97 kBから587.82 kB／166.88 kBへ減少した（47.83 kB、gzip 15.09 kB減）。分離後の遅延chunkは、分節ツール28.05 kB／gzip 10.15 kB、確認記録20.33 kB／6.78 kBで、対象UIを開くまで取得しない。英語辞書chunk 236.70 kB／gzip 83.19 kBは英語版だけが取得する。

Windows Chrome 151のローカルproduction previewで、PC相当coldの日本語Homeは205,931 encoded bytes・8 requests、英語Homeは289,132 bytes・9 requestsとなり、差83,201 bytesは英語辞書chunkの取得分と一致した。日本語Home、英語Home、分節ツールはいずれもstable、console／request／UI error 0、残留loader 0だった。記録は `work/performance/optimization-ja-home.json`、`optimization-en-home.json`、`optimization-segment.json`（ローカル作業用・配布対象外）。公開回線・物理端末・別ブラウザでの性能値ではない。
