# Windows Codex への引き継ぎ（β改修）

更新日: 2026-08-24
引き継ぎ基準コミット: `9c1a962 Add segmentation review metadata`

この文書だけで、Windows側のCodexが公開α版の現在地を確認し、β候補版への改修を再開できるようにしています。Mac側では、この基準コミット以降の実装作業を中断しています。

## 1. 目標

> 脳実習ナビをβ候補版へ進めるため、`BETA_ROADMAP.md` のうち専門家監修を必要としないP0・P1項目を自律的に監査・実装・検証・公開し、解剖学的監修が必要な残課題を、根拠・対象画面・確認方法が明確なレビュー待ち状態まで整備する。

「項目を1つずつ指示待ちで直す」のではなく、ロードマップを作業台帳として使い、複数の関連項目を一つのマイルストーンにまとめて進めます。ただし、模式形状を解剖学的に正しいものと断定したり、専門家確認なしに「検証済み」へ昇格したりしません。

## 2026-08-23 PWA・オフライン基盤

Web App Manifestとbase-path対応Service Workerを追加しました。初回は約629–634 kBのアプリシェル5件だけを保存し、約92.4 MBの公開教材を一括取得しません。同一サイト内の教材資産はオンラインで利用した時点でrelease別data cacheへ保存します。通常／Pages buildと生成物監査、両baseでのmanifest・active worker・controller・scope・shell 5件、Pages baseの代表教材の利用時cache 5件、PWA追加後の通常build全経路156/156件を確認しました。2026-08-23の通常base再監査ではChrome 151のmanifest parse／installability errorが0件でした。v10後の最終生成物監査は、通常buildがshell 5件・633,527 bytes、Pages buildがshell 5件・633,760 bytesです。ただし実際のホーム画面追加と追加後起動は未確認です。

Codex内蔵ブラウザの安全ポリシーが通信遮断後の再読込を拒否した記録はv10以前の履歴です。同じ操作を別経路で迂回して完了扱いにはせず、下記のrunner所有server停止監査とは区別します。公開URL、物理端末、Safari・別ブラウザは未確認です。

### 2026-08-23 PWA v10 ローカルserver-unavailability受入

権威ある結果は `work/browser-audit/pwa-offline-recovery-v10-2026-08-23.json` です。`scripts/audit_pwa_offline_browser.mjs` がnormal／Pagesの既存build rootごとにloopback静的serverを所有し、停止時にlistenerを閉じ、追跡socket 6件を破棄し、TCP `ECONNREFUSED`を確認した後、同じhost／portへ再listenしました。Windows 11／Chrome 151／Node 24でnormal／Pages各10 action（合計20/20）、blocker 0、独立validator passです。通常HTTP cacheはclear＋disable ACK、Cache Storageは保持しました。

訪問済み経路は停止中もService Workerからdirect／reload／`about:blank`→hash routeでCanvas 1へ復帰し、未訪問のBigBrain assetは停止前に未cache、停止中は既存error／retry UI、再listen後は対象GET 200・11,904,805 bytes、Cache Storage +1、Canvas 3を確認しました。`navigator.onLine`はtrueのままで、オフラインバッジを証拠にしていません。

この結果はrunner所有のローカルHTTP listener停止による回復性の証拠であり、物理／OSネットワーク断、公開URL、物理端末、Safari・別ブラウザ、インストール済みPWA、ホーム画面追加後の起動の証拠ではありません。PWA全体の公開／インストール判定は未完了のままです。再現手順とmutationを含む契約は `tests/pwa-offline-browser-audit.test.mjs` にあります。

## 2026-08-23 数値読込進捗

断面画像、手動ラベル、3Dメッシュをstreamで読み、実測byteを複数資産で集約する数値進捗を追加しました。全資産の `Content-Length` が取得できる場合だけ総量と整数％を表示し、一つでも不明なら受信済みbyteと「総量不明」を表示して推定％を出しません。受信後の展開・解析を別表示にし、再試行時は進捗を初期化して旧試行の遅延イベントを世代tokenで無視します。

Chrome 151のPages想定buildで総量不明表示、総量既知の `12 MB / 12 MB（100%）` とバー値の一致、390 px相当の横はみ出しなし、完了後loader／alert 0を確認しました。全経路は `work/browser-audit/beta-route-audit-download-progress-2026-08-23.json` の156/156件、全テスト227/227、型検査、通常／Pages buildに合格しています。公開URL、物理端末、別ブラウザ、実公開回線は未確認です。詳細は [DOWNLOAD_PROGRESS_AUDIT.md](DOWNLOAD_PROGRESS_AUDIT.md) を参照してください。

## 2026-08-23 来歴表示監査の現在値

機械台帳は registry 75件、expert pending 75件、表示面フィルタ（脳表／断面／ブロック標本／復習）54／16／30／21件です。学習者向けmappingは222/222件が解決済みで、family別は sections21／surface52／free75／neurovascular22／blocks52です。アプリ在庫は regions26／landmarks8／deep5／basal13／neurovascular22／sections21／block specimens8／layers44／pathways3です。

現行Go / No-Goの12項目とsourceCounts（provenance／expert pending 75件、unique quiz targets 40件＝既存23件＋模式3D pilot 17件、learner mapping 222/222件）は [BETA_GO_NO_GO_AUDIT.md](BETA_GO_NO_GO_AUDIT.md) と [BETA_GO_NO_GO.json](BETA_GO_NO_GO.json) を基準にします。ローカル確認を公開・専門家確認・デプロイ完了とは扱いません。

56件から75件への19件追加（surface／block app-only 18行とoptic nerve `cn2`行1件）、旧ID33と`cn2`／`opticChiasm`の分離、ID39・40のexpert pending維持は [LEARNER_PROVENANCE_DISPLAY_AUDIT.md](LEARNER_PROVENANCE_DISPLAY_AUDIT.md) に固定しています。

最終ローカル実ブラウザ確認として、Chrome 151のin-app browserで`http://127.0.0.1:4201`を確認し、review panel 75/75、filter surface54／sections16／blocks30／quiz21／all75、app-onlyカードの日本語見出し、縁上回の「試作」＋CerebrA詳細、`cn2`／`opticChiasm`の「模式」、block choroid plexusの「模式」＋未保証説明を確認しました。route auditは `work/browser-audit/beta-route-audit-learner-provenance-final-2026-08-23.json` に保存し、26経路×3幅×direct/reload＝156/156、`allPassed: true`。390 px設定の`clientWidth`は375 pxで、overflow／error／loader／WebGL fallbackはありませんでした。これは表示回帰の確認であり、解剖学的妥当性の検証ではありません。公開URL、物理端末、別GPU、専門家レビューは未確認です。

2026-08-22の全56件・表示面36／16／29／21件・route156/156の実測履歴は変更せず保持します。

同日、通常クイズの標準／試作判定を正答targetだけでなく全選択肢の由来へ拡張しました。既存23問は標準7件・試作16件となり、模式3D pilot 17件を含む画面上の全40問は標準7件・試作33件です。問題本文・正答target・選択肢・position/viewのSHA-256は変更していません。Chrome 151のローカルpreview `http://127.0.0.1:4214/` で試作ON/OFF、標準7問queue、乳頭体問題の試作バッジを実操作し、最終route監査も156/156件に合格しました。詳細は [QUIZ_GRANULARITY_AUDIT.md](QUIZ_GRANULARITY_AUDIT.md) と `work/browser-audit/beta-route-audit-option-provenance-2026-08-23.json` に記録しています。専門家確認は未完了で、Go / No-Go criterion 07は `expert-blocked` のままです。

旧視覚路混合領域ID33には、現行配布ボリュームを変更しない客観直交断監査を追加しました。現在値は8,482 voxel、12個の6近傍成分で、全軸の占有断面・全境界面接触・代表候補X187／Y262／Z114を固定JSONへ保存しています。乳頭体採用前の9,013 voxelという歴史値と混同しません。これは専門家レビューの準備資料で、ID36–38への機械分割、解剖学的妥当性、クイズ復帰を意味しません。詳細は [OPTIC_PATHWAY_AUDIT.md](OPTIC_PATHWAY_AUDIT.md) を参照してください。

上記3候補は寄稿者ツールの専用パネルから直接開けます。ボタンは表示位置・zoom・pan・cursorだけを変更し、編集差分や履歴、端末内ドラフトを変更しません。Chrome 151の `http://127.0.0.1:4215/` で3位置、表示数、差分0の維持、矢状・冠状の編集無効を実操作し、全経路監査も156/156件に合格しました。全テスト211/211、型検査、通常／Pagesビルドも成功しています。公開URL、物理端末、専門家確認は未完了です。

2026-08-24、脳室ラベルの黒い内部欠損を保守的に補修しました。背景値255を一括充填すると脳外背景へ漏れるため不採用とし、X・Y・Z各軸で同じ脳室ラベルに挟まれ、別ラベルと6近傍接触しない未ラベルvoxelだけを1回抽出しました。三断面の局所プレビューで既存ラベル内部の小欠損と確認した33 voxel（左側脳室14、右15、第三4、第四0）を、PR #14のproject-reviewed strict patchとして公開教材ラベルへ適用しています。採用後圧縮ラベルSHA-256は `b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3`、raw voxel SHA-256は `b1105fd3a11fab27d3b1bac60d4d989386e4ef49a41151f5b684d984f72aaaa9` です。ローカルには元NIfTI一式がなかったため、採用前公開artifactを固定fixture化し、公式buildのapproved patch段階だけを決定論的に再実行しました。テストは採用前後でこの33 voxel以外が変わらないことを検証します。通常production previewで3脳室の同時表示と側脳室クイズを実確認し、全テスト304/304、型検査、通常／Pages build、Go/No-Go台帳監査に合格しました。これは専門家レビュー、脳室全体の境界確定、研究用ground truth、機関承認ではありません。詳細は [VENTRICLE_CAVITY_AUDIT.md](VENTRICLE_CAVITY_AUDIT.md) を参照してください。

同日、M2の最小単位として、共同制作ページへ脳室系の3Dモデル方針A/B比較pilotを追加しました。現行同一格子の左右側脳室＋第三脳室と、既存標本・アトラス頂点・ラベルを使わない寄稿者作成の模式案を、同じ回転・視点・色・表示ON/OFFで比較します。Bは常に「模式・専門家未確認」「実標本由来ではない」と表示し、通常教材・ラベル・由来台帳・クイズを変更しません。比較用chunkと7,980 bytesのmeshは明示的に開くまで取得しません。Chrome 151でPC・390 px相当の開閉、共通操作、フォーカス復帰、横overflow 0を確認し、canonical全経路156/156、初回payload 26/26、全テスト217/217、型検査、通常／Pages本番ビルドに合格しました。評価7項目と未確認事項は [MODEL_STRATEGY_COMPARISON_AUDIT.md](MODEL_STRATEGY_COMPARISON_AUDIT.md) に記録し、採否は専門家・学習者レビュー待ちです。

2026-08-24、比較pilotの発見性を改善し、共同制作ページ冒頭へ「M2・寄稿者向け試作」の案内と、direct/reload可能な専用URL `#workspace/collaborate/model-strategy` を追加しました。通常の共同制作ページはCanvas 0・比較資産0のまま、専用URLだけがCanvas 2と比較用3資産を取得します。Chrome 151の `http://127.0.0.1:4312` で案内からの開閉、直接表示、reload、起点focus復帰、390 px相当の一列表示と横overflow 0を確認しました。canonical route監査は27経路×3幅×direct/reload＝162/162、cold初回payload監査は27/27に合格しました。A/Bは引き続き「模式・専門家未確認」で、採否は変更していません。

同日、専門家レビューを後日まとめて行えるよう、専用URLへ7項目×A/B採点の端末内下書きとJSON書き出しを追加しました。氏名・メール・所属は収集せず、送信機能もありません。JSONは `local-unsubmitted-draft`、`not-submitted`、`not-recorded`、`not-claimed` を固定し、`scripts/audit_model_strategy_review.mjs` が項目・点数・完了度を再計算して個人情報fieldや送信・採用・expert完了への昇格を拒否します。Chrome 151の `http://127.0.0.1:4313` で入力、reload復元、書き出し、小画面を確認し、修正後console error/warning、loader、UI error、横overflowは0件です。最終route 162/162、cold payload 27/27に合格しています。これはレビュー準備で、実際の専門家・学習者評価や採否ではありません。

同日、自由観察のPapez回路を由来別6段階のステッパーへ拡張しました。海馬・乳頭体・視床だけ既存クイズ断面ラベルを表示し、脳弓は模式3Dのみ、帯状回・海馬傍回・嗅内野はアトラス3Dのみです。乳頭体には原画像由来3Dメッシュがないため「断面ラベルのみ」とし、旧模式乳頭体で代用しません。視床は全体ラベルで、前部核は未分節と明記します。Chrome 151の `http://127.0.0.1:4314` で6段階、再生、最終停止、別回路への切替を実操作し、route 162/162、cold payload 27/27に合格しました。新規asset request、mesh、voxel、経路線はありません。視覚路ステッパーはID36–38未分節のため保留し、専門家レビュー待ちです。

## 2. 取得とブランチ

Git、Node.js 22以降、npmをインストールしたPowerShellで実行します。

```powershell
git clone https://github.com/bonnginn/brain-practical-navi.git
cd brain-practical-navi
git switch main
git pull --ff-only
git log -1 --oneline
git switch -c codex/beta-candidate
npm install
```

`git log -1` が少なくとも `9c1a962` 以降であることを確認してください。既存のWindows作業フォルダを使う場合は、未コミット変更を確認してから `git pull --ff-only` します。上書き・resetはしません。

通常は環境変数なしで動作します。意見フォームを変更する場合だけ `.env.example` から `.env.local` を作ります。`.env.local` はコミットしません。

## 3. 起動と基準検証

```powershell
npm test
npm run build
npm run dev -- --host 127.0.0.1
```

基準コミットでは、自動テスト **40件**、TypeScript、本番ビルドが成功しています。Viteが表示したURLをブラウザで開いてください。公開α版は次です。

- 公開アプリ: https://bonnginn.github.io/brain-practical-navi/
- 対応ソース: https://github.com/bonnginn/brain-practical-navi

## 4. 直前までに完了したβ向け変更

- 公開配布物を139.9 MiBから78.5 MiBへ削減し、100 MiB上限の自動テストを追加。
- 血管、脳神経、脳底・深部・溝、局所標本を必要時読込へ変更。
- 断面の通常画面に、ラベル由来を表示。
  - `標本同一格子・手動分節`
  - `アトラス照合・試作`
  - `画像誘導・試作`
- 由来・確度・専門家確認欄を `STRUCTURE_PROVENANCE.md` に集約。
- アトラス取得失敗時に、失敗したキャッシュを破棄してその場で再試行できるようにした。
- 自由観察へ「視覚路」「Papez回路」「大脳基底核回路」の経路観察プリセットを追加。既存構造をまとめて選ぶ模式表示で、教科書本文の代替にはしていない。
- クイズの今回の誤答一覧から、対象構造を着色した正確な観察画面へ戻れるようにした。
- 手動セグメンテーション差分JSONへ、左右、根拠、確度、`unreviewed`状態を追加。旧差分との互換性は維持。
- 差分適用監査と複数差分の競合検査スクリプトへ上記メタデータを反映。

## 5. Windows側で最初に行うマイルストーン

### M1: 実ブラウザ回帰と性能実測

Windows側でブラウザ操作が使える利点を最優先します。

1. 全経路を直接URL、アプリ内遷移、再読み込みで巡回する。
2. 通常デスクトップ幅、1366 × 768、760 / 761 px境界、390 px前後で確認する。
3. クリック、ドラッグ回転、ホイール拡大、複数選択、全解除、着脱、断面スライダーを実操作する。
4. DevToolsのNetworkとPerformance/Memoryで、初回転送量、再訪時転送量、初回描画、メモリを記録する。
5. 黒画面、空着色、重複部品、遊離ポリゴン、無反応ボタン、文字切れ、観察対象を隠すUIをIssueまたは監査表へ記録し、非解剖学的な不具合は修正する。

結果は `PRESENTATION_AUDIT.md` と `PERFORMANCE_AUDIT.md` へ、環境、URL、画面幅、再現手順、修正コミットとともに追記します。

2026-08-14時点で、M1の全経路回帰、代表経路の性能実測、読込進捗・一括再試行、共通操作ガイドまで完了しています。操作ガイドは `#workspace/help` の永続URL、キーボードフォーカス、390 / 760 / 761 pxの狭幅表示をWindows実ブラウザで確認済みです。20構造の断面・透過3D同時表示時に見つかった旧メッシュ面数の互換問題も修正し、透過・単独表示・後脳脱着を実操作しています。小画面の断面実習は3D比較を必要時読込とし、初期データセットから左右脳表17.5 MiBを外しました。PCでは従来どおり2方向3Dを同時表示し、表示切替も実操作しています。断面クイズには1断面ずつの送り／戻しを追加し、通常幅と390 pxで表示値・見出し・Canvasの同期を確認しました。標準クイズは同一格子の公開手動分節だけに限定し、位置照合・画像誘導・脳表問題を既定OFFの試作枠へ分離しています。内包は隣接する橙色の基底核群と区別できる淡色へ変更し、冠状断と透過3Dで確認しています。断面・編集ツールでは離脱後に大容量画像キャッシュへの参照を解放し、再訪時にも各Canvasが読込エラーなく復帰することを確認しました。権利監査では全配布データを機械可読マニフェストへ対応づけ、公開画像の非転載通知を追加し、解析ビーコンを公開HTTPS本番ホストだけへ限定しました。共同制作はForm・Issue・PRの3入口へ分離し、未ログインのForm経路を送信直前まで確認しました。自動テスト、型検査、本番Viteビルドは本ブランチの最終状態で再検証します。

追記: スマートフォン専用UIは、幅だけでなく `hover: none` と `pointer: coarse` を満たす端末だけへ適用する実装へ整理しました。Chrome 151のローカル通常production preview `http://127.0.0.1:4198` で、coarse touch phoneの5導線dock、single settings dialog、sections rail操作、segment編集Canvas非生成、fine-pointer狭幅のcompact desktop維持を確認しました。coarse 26経路52/52、fine/non-touch 26経路×3幅×direct/reload 156/156に合格しています。公開URL、物理端末、実機タッチ、Safari・別ブラウザ、別GPU、専門家レビューは未確認です。内側側頭葉の海馬采・鉤の表示除外判断は [MEDIAL_TEMPORAL_AUDIT.md](MEDIAL_TEMPORAL_AUDIT.md) に、phone UIの詳細確認項目と記録は [MOBILE_UI_AUDIT.md](MOBILE_UI_AUDIT.md) に分離しています。

### 2026-08-23 側脳室ブロック context ON 性能同期

Windows 11／Chrome 151.0.7922.170／Node 24.19.0、ローカルpreview `http://127.0.0.1:4204/` で、既存31件＋context ON 6件の性能マトリクス37/37件を確認した。PC 1366×768、tablet 1024×768、390×768相当のcold/warmを対象に、baseとONのencoded bytes・unique request count・stable time、ON stable時のsettled backing storage、操作全体のsamplePeak backing storageを別フィールドで保存した。全件Canvas `1→2→2→1`、loader／UI／console／request error、overflow、WebGL fallbackは0件。warm primeはベース画面だけで、context assetは初回ON時に取得した。結果は `work/performance/performance-suite-block-context-final-v2-2026-08-23.json`、値の詳細は [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) を参照する。390 pxは `mobile:false` のデスクトップemulationでclientWidth 375 px。物理端末、公開ネットワーク、別GPU・別ブラウザ、解剖学的妥当性は未確認である。

追記: 同じ初期OFFの位置コンテキストを教材内8ブロック標本へデータ駆動で拡張した。既存 `material: specimen` メッシュと既存 plane / position だけを使い、後脳標本は既存3部品をまとめて遅延読込する。新しい形状・切断幅・摘出順・実習手順は追加していない。通常production preview `http://127.0.0.1:4230/` で、Codex in-app BrowserのPC相当8/8件とChrome 151の390×768デスクトップemulation 8/8件を確認し、全件Canvas `1→2→2→1`、loader／UI／console／request error、横はみ出し、WebGL fallbackは0件だった。標本切替時はOFFかつ全脳表示へresetした。物理端末、公開URL、別GPU・別ブラウザ、専門家レビューは未確認である。契約と監査範囲は [BLOCK_CONTEXT_AUDIT.md](BLOCK_CONTEXT_AUDIT.md) を参照する。

性能追記: `http://127.0.0.1:4232/` で基礎31件＋8標本×3幅×cold/warmのcontext ON 48件＝79/79件を保存した。計測用ChromeだけService Workerを迂回し、48件すべて7 request／24,795,951 byte、Canvas `1→2→2→1`、error／loader／overflow／WebGL fallback 0。安定時間最大828.9 ms、settled backing最大61,288,760 byte、sampled peak最大240,644,605 byteで、実資産statと固定上限を使う独立監査にも合格した。結果は `work/performance/performance-suite-block-context-all-specimens-2026-08-23.json`、監査は `work/performance/block-context-performance-audit-all-specimens-2026-08-23.json`。追加7標本の保存済み性能値は完了し、物理端末、公開URL、別GPU・別ブラウザ、専門家レビューは未確認のままである。

中心操作追記: Chrome 151の通常production preview `http://127.0.0.1:4236/` で、脳表・水平断・自由観察・クイズ×PC 1366×768／横向きタブレット幅1024×768の8/8件、計40操作を確認した。独立validatorが実測viewport、操作前後、5問queue生成、回答対象から導出した復習先、error／loader／overflow／WebGL fallbackを再計算し、全件に合格した。結果は `work/browser-audit/core-interactions-pc-tablet-2026-08-23.json`、契約は [CORE_INTERACTION_AUDIT.md](CORE_INTERACTION_AUDIT.md)。両条件は `mobile:false`・`touch:false` のデスクトップエミュレーションであり、物理タブレット、実機タッチ、公開URL、別ブラウザ・GPU、画素・解剖学的妥当性は未確認である。

### 2026-08-23 coarse-touch phone中心操作

Chrome 151の通常production preview `http://127.0.0.1:4250/` で、Windows 11 Home／Node 24.19.0のローカル実ブラウザに、390×768、DPR1、`mobile:true`、`touch:true`、最大同時タッチ5、縦向き、`hover:none`、`pointer:coarse`を設定した。最終結果 `work/browser-audit/phone-core-interactions-v16-2026-08-23.json` は、下部dock、脳表・左外側面、水平断、復習の4 journeyを実タッチイベント列で確認し、`allPassed: true`、独立validator failure 0となった。44 px以上の操作対象、画面内・hit-test、settings sheetのfocus復帰、脳表の内側面→左外側面の実設定遷移・target key／選択状態の連続・ドラッグ回転・reset、水平断の矢状断→水平断の実設定遷移・52→53・表示値一致・レイアウト切替、復習5問queue・wrong-answerからreview-linkまでのquestion target連続・回答対象由来の観察先一致を含む。Solレビュー後のvalidatorはsummary/probe、touch geometry／primaryTouchId／target・touch ID、tap 1→0／drag 1→1→0のtouchPoints、sequence、実設定遷移を独立検証する。loader、UI／console／request error、横overflow、WebGL fallbackは0件だった。v12／v13の失敗artifactは成果根拠に含めない。

これはcoarse-touch emulationによるローカル導線・状態遷移の確認であり、スマートフォンUI全体のβ完了、画素・解剖学的妥当性、専門家レビューを意味しない。物理スマートフォン、実機タッチ、Safari・別ブラウザ、別GPU、公開URL・公開回線、インストール済みPWAとホーム画面追加後の起動は未確認である。詳細は [PHONE_CORE_INTERACTION_AUDIT.md](PHONE_CORE_INTERACTION_AUDIT.md) と [MOBILE_UI_AUDIT.md](MOBILE_UI_AUDIT.md) を参照する。

### M2: β公開条件の機械化

- 主要経路の表示条件とURL復元をテストで固定する。
- クイズ対象の着色面積、未確認構造の通常問題除外、断面スライダー操作を監査する。
  - 2026-08-24、40 target×3幅の実ブラウザ可視性監査は120/120件合格。半透明神経血管のdepth・描画順・alpha合成を独立再計算し、PCAを含め十分な着色変化、解除、完全再現を確認した。詳細は `QUIZ_TARGET_VISIBILITY_AUDIT.md`。専門家による形状・境界・問題採否の確認は別途必要。
- 配布物全体だけでなく、トップ、脳表、断面、各局所標本の取得量予算を再現可能なスクリプトへする。
- 初回画面の取得量を経路別に自動集計する監査スクリプトは完了。Windows 11／Chrome 151.0.7922.170／Node 24.19.0、ローカルpreview `http://127.0.0.1:4211/`、requested desktop 1366×768のcold loadでcanonical 26経路を測定し、26/26件、topology 0、console／request／UI error・loader・overflow・WebGL fallback 0。圧縮pial物理パスだけを要求し、raw要求は0件だった。結果は `work/performance/initial-route-payload-audit-pial-gzip-2026-08-23.json`、設計とroute表は `PERFORMANCE_AUDIT.md` に記録した。sectionsは26,441,013 Bで旧34,688,033 B（34.69 MB）から23.8%減ったが、旧値は履歴として保持する。
- 読込中の対象が分かる表示を整え、失敗時再試行を実画面で確認する。
- 「人が目視した項目」と「テストで保証する項目」を分ける。

### 2026-08-23 pial gzip 現在確認

`work/performance/performance-suite-pial-gzip-2026-08-23.json` は37/37件、関連stable-time回帰は1%未満、sampledPeak backing storage最大増加は2.0%（レビュー閾値25%）だった。`work/browser-audit/beta-route-audit-pial-gzip-2026-08-23.json` は26経路×3幅×direct/reloadの156/156件で、error／loader／overflow／WebGL fallbackは各0件だった。

同じ `http://127.0.0.1:4211` の視覚確認では、PCはcombined押下時Canvas 3、狭幅は初期section-only Canvas 1からcombined Canvas 3、2つの3D view描画、console warning/error 0を確認した。requested 1366 px時のin-app browser実効`clientWidth`は1035 px、requested 390 px時は284 pxであり、物理viewportの寸法としては扱わない。

### M3: 共同編集と公開運用

- 水平断編集の差分JSONを実際に1件書き出し、`--check`、競合検査、別ファイルへの適用を通す。
- 冠状断・矢状断を少なくとも確認用の照合表示として追加する。
- Google Form、GitHub Issues、Pull Requestの用途を入口画面と文書で一致させる。
- 権利、クレジット、免責、Cloudflare Web Analytics、対応ソースの相互リンクを公開画面で巡回する。
- βの既知の制限と変更履歴を作る。

### M4: 比較試作と専門家レビュー待ち化

- 現行再構成モデルと、知識ベースで一から造形する教育用モデルを、代表課題1つで小さく比較試作する。
- 最初から全脳を作り直さない。外側溝周辺、脳底、脳室系、内側側頭葉のいずれか1課題で比較可能にする。
- 同定しやすさ、位置関係、表面品質、操作、負荷、修正コストを同じ尺度で記録する。
- 解剖学的判断が必要な項目は、`STRUCTURE_PROVENANCE.md` の監修欄とGitHub Issueへ、対象URL・角度・構造・根拠・スクリーンショットを揃えて渡す。

## 6. 実画面の確認順

ハッシュURLは再読み込み後も同じ教材を維持する必要があります。

1. `#workspace/home`
2. 脳表観察
   - `#workspace/surface/lateral`
   - `#workspace/surface/superior`
   - `#workspace/surface/inferior`
   - `#workspace/surface/medial`
   - `#workspace/surface/arteries`
   - `#workspace/surface/nerves`
   - `#workspace/surface/free`
3. 断面観察
   - `#workspace/sections/coronal`
   - `#workspace/sections/horizontal`
   - `#workspace/sections/sagittal`
4. ブロック標本
   - `lateral-ventricle`
   - `diencephalon`
   - `radiations`
   - `commissural-system`
   - `choroid-plexus`
   - `medial-temporal`
   - `midbrain-section`
   - `hindbrain`
5. 復習テスト
6. 手動セグメンテーション編集
7. 利用条件・クレジット、意見送信、対応ソース

各画面で、選択した全構造の同時着色、透過／単独表示、全解除、回転、ズーム、スライダー、着脱を確認します。橋・延髄を外したとき、錐体・オリーブの補助ポリゴンだけが残らないことは要注意です。

## 7. 触る前に読む文書

優先順は次です。

1. `BETA_ROADMAP.md`: 作業台帳とGo / No-Go条件
2. `STRUCTURE_PROVENANCE.md`: 表示の由来、確度、専門家レビュー欄
3. `PERFORMANCE_AUDIT.md`: 配信量と未計測項目
4. `PRESENTATION_AUDIT.md`: 既存の画面幅別QA
5. `LECTURE_COVERAGE_AUDIT.md` と `LEARNING_SCOPE.md`: 学習対象
6. `SEGMENTATION_WORKFLOW.md`: 差分の作成・監査・統合
7. `DATA_AND_LICENSES.md`: 出典、改変、ライセンス
8. `CONTRIBUTING.md` と `GOVERNANCE.md`: 共同制作と採否

## 8. 重要な制約と注意点

- 神経血管、脳底ランドマーク、溝・裂、深部構造の一部は教育用の模式表示で、正解セグメンテーションではありません。
- 模式表示や画像誘導候補を、専門家確認なしに「検証済み」と表示しません。
- `プラクティカル 解剖実習 脳`、講義資料、標本写真、ウェブ図版は参照に留め、許諾なくアプリやIssueへ転載しません。
- BigBrain由来物を含む現在の完全版は CC BY-NC-SA 4.0 の非営利・継承条件があります。
- アプリコードはAGPL-3.0-or-later、自作教材文書はCC BY-NC-SA 4.0です。
- 既存データ、他の人の変更、作業用ファイルを破壊する `reset --hard` や一括削除をしません。
- 解剖学的に判断できない問題を、見た目だけで修正しません。表示区分を下げ、レビュー待ちにします。
- 小脳の表示平滑化は `MESH_VISIBILITY_AUDIT.md` に記録済みです。元の1 mmアトラス境界は変更せず、細かな小脳葉・裂と小脳核は専門家レビュー待ちのままです。
- ブロック標本はβでも「試作・未保証」を維持して構いません。

## 9. Mac側で残した未着手事項

- 公開URL・物理端末・別GPU・別ブラウザの性能計測（ローカルWindows Chromeの基礎31件＋全8標本context ON 48件＝79/79件は完了）。
- 冠状断・矢状断のセグメンテーション照合表示。
- 現行再構成モデルと知識ベースモデルの比較試作。
- 専門家による構造位置・範囲・連続性の確認。
- 権利文書、Google Form、公開画面をまたぐ最終実ブラウザ巡回。
- スマートフォン専用UIのローカル親確認は完了（`MOBILE_UI_AUDIT.md`）。Chrome 151・`http://127.0.0.1:4198`で、coarse touch phoneの5件dock、native settings dialog、focus／背景scroll、sectionsの既存rail操作、rangeとpage scroll、segment直接URLのCanvas非生成を確認し、coarse 26経路52/52、fine/non-touch 26経路×3幅×direct/reload 156/156に合格した。fine-pointer狭幅ではphoneMode=false、dockなし、既存sections／segment workbenchを確認した。公開URL、物理端末、実機タッチ、Safari・別ブラウザ、別GPU、専門家レビューは未確認である。詳細な画像・probe・監査JSONは `MOBILE_UI_AUDIT.md` を参照する。
- 専門家レビュー準備キューは `ANATOMY_REVIEW_HANDOFF.md` に沿った読み取り専用の準備段階であり、provenance台帳のexpert pending 75件を共同制作画面へ表示する。一般のForm・Issue・PR入口の後ろで既定閉鎖にし、観察リンクは対象を自動選択しない一般workspace入口だけに限定する。Chrome 151のローカル通常buildで全75件、表示面フィルタ54／16／30／21件、複合フィルタ、ID39・40、旧ID33、390 px相当の横はみ出しなし・内側スクロールなしを親確認し、通常26経路×3幅×direct/reloadも156/156件に合格した。専門家確認、解剖学的妥当性、採否は未完了で、ID39・40もexpert pending、旧ID33は断面／通常クイズ正答と分節入口から除外したままである。

2026-08-23追加: `ORTHOGONAL_REVIEW_BUNDLE_AUDIT.md` に、WindowsローカルのGit管理外 `work/anatomy-review/orthogonal-review-bundle-v3/`（固定入力SHA・BBS1寸法・ID33/39/40の全占有断面、ID39/40の外側断面、ID27のcrop内context-only、期待161 PNG＋manifest）を記録した。PNG／pixel SHA、空metadata、flat anchor、exact file/schema、link境界まで独立検証済みだが、`review.status=unreviewed` であり、ラベル本体・公開資産・ID36–38は変更していない。乳頭体付着部と視交叉・左右視索境界の解剖判断、専門家確認、公開URL・物理端末確認は残る。

Mac側のブラウザ操作は、アプリの不具合ではなくCodex内蔵ブラウザの管理ポリシーにより公開URL操作が拒否されました。そのため、上記の実画面計測を推測で完了扱いにはしていません。

## 10. Windows Codexへ渡す開始指示

以下をそのまま新しいWindows側のタスクへ貼り付けられます。

```text
https://github.com/bonnginn/brain-practical-navi を取得し、WINDOWS_HANDOFF.md、BETA_ROADMAP.md、STRUCTURE_PROVENANCE.md を最初に通読してください。

目標は、専門家監修を必要としないP0・P1項目を自律的に監査・実装・検証・公開し、解剖学的判断が必要な課題を、対象URL・角度・構造・根拠・スクリーンショットが揃ったレビュー待ち状態へ整備することです。1項目ずつ指示待ちにせず、WINDOWS_HANDOFF.md のM1から関連作業をまとめて進めてください。

開始時に main をgit pull --ff-onlyし、新しい codex/ ブランチを作り、npm test と npm run build を実行してください。ブラウザ操作が使えるWindows環境なので、全経路の実画面回帰とNetwork/Performance計測を最優先してください。模式表示を専門家確認なしに検証済みへ変更せず、第三者の教科書・講義・標本画像をリポジトリやIssueへ転載しないでください。完了した作業はBETA_ROADMAP.mdと各監査文書へ証拠つきで反映し、テスト・ビルド・公開確認まで行ってください。
```

## 11. 完了の報告形式

各マイルストーン終了時は、次だけを簡潔に残します。

- 修正した問題と利用者への効果
- 変更ファイルとコミット
- 自動テスト、本番ビルド、実画面確認の結果
- 公開URLとGitHub Actionsの結果
- 専門家・管理者・実機での確認が残る項目

β版への昇格は、`BETA_ROADMAP.md` のGo / No-Goを満たし、少なくとも1名の神経解剖学に詳しい確認者の記録を得た後に、プロジェクト管理者が決定します。
