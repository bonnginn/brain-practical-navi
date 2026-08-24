# β版ロードマップ

更新日: 2026-08-23

この文書は、公開α版への意見と利用状況を踏まえ、β版までに行う作業を優先度と完了条件つきで整理したものです。β版の目標は「すべての構造を完全に再現すること」ではなく、実習で重要な構造を誤解しにくい形で観察でき、模式表示・推定ラベル・検証済みデータの違いが利用者に明確な教材にすることです。

## 2026-08-23 来歴表示監査の現在値

機械台帳の現在値は registry 75件、expert pending 75件、表示面フィルタ（脳表／断面／ブロック標本／復習）54／16／30／22件です。学習者向けmappingは222/222件が解決済みで、family別は sections21／surface52／free75／neurovascular22／blocks52です。アプリ在庫は regions26／landmarks8／deep5／basal13／neurovascular22／sections21／block specimens8／layers44／pathways3です。

12項目の現行Go / No-Go状態と本文の機械突合は [BETA_GO_NO_GO_AUDIT.md](BETA_GO_NO_GO_AUDIT.md) と [BETA_GO_NO_GO.json](BETA_GO_NO_GO.json) に固定しています。ここでのローカル確認は、公開・専門家確認・デプロイ完了を意味しません。

これは来歴表示の機械監査であり、解剖学的妥当性の検証や専門家レビュー完了を示しません。56件からの19件追加（surface／block app-only 18行とoptic nerve `cn2`行1件）、旧ID33と`cn2`／`opticChiasm`の分離、ID39・40のexpert pending維持は [LEARNER_PROVENANCE_DISPLAY_AUDIT.md](LEARNER_PROVENANCE_DISPLAY_AUDIT.md) に記録しています。2026-08-22の全56件・表示面36／16／29／21件およびroute156/156の実測履歴は、下記の既存記録を書き換えず保持します。

### 2026-08-23 source-backed コンテンツレビュー

視床下核の分類を「間脳の視床下域」として表示し、quiz／構造グループの見出しを「中脳・視床下域」「中脳核・視床下域」へ整理した。淡蒼球は外節（GPe）の内部中継・調節と内節（GPi）の主要出力を区別し、側脳室と尾状核、第三脳室の位置関係、脳梁・脳弓標本の英見出し、脳表5領域のCerebrA／Desikan-style由来注記も同期した。詳細は [CONTENT_ACCURACY_REVIEW.md](CONTENT_ACCURACY_REVIEW.md) に記録する。これは資料照合に基づくプロジェクト内レビューであり、専門家レビュー完了・機関承認・解剖学的境界の確定を意味しない。`expertReview` と該当項目のGo/No-Goは未完了のまま維持する。

### 2026-08-23 最終ローカル実ブラウザ確認

Chrome 151のin-app browserで`http://127.0.0.1:4201`を確認し、review panel 75/75、filter surface54／sections16／blocks30／quiz21／all75、app-onlyカードの日本語見出し（縁上回、II 視神経・視索）、自由観察の縁上回「試作」＋CerebrA詳細、`cn2`／`opticChiasm`の「模式」、block choroid plexusの「模式」＋未保証説明を確認した。route auditは`work/browser-audit/beta-route-audit-learner-provenance-final-2026-08-23.json`に保存し、26経路×3幅×direct/reload＝156/156、`allPassed: true`。390 px設定の`clientWidth`は375 pxで、overflow／error／loader／WebGL fallbackはなかった。これは表示回帰の確認であり、解剖学的妥当性の検証ではない。公開URL、物理端末、別GPU、専門家レビューは未確認である。

## 優先度

- **P0（β公開条件）**: 未達ならβ版にしない項目
- **P1（βで改善）**: 教材としての完成度を大きく上げる項目
- **P2（発展）**: 有用だがβ公開を妨げない項目

## P0: β公開条件

### 1. 解剖学的妥当性の監査

- [ ] 脳表の8本の溝・裂とCerebrA由来領域境界を、神経解剖学に詳しい協力者が方向別に確認する。
- [ ] 脳底面の嗅覚路、視神経系、乳頭体、漏斗、前有孔質、中脳・橋・延髄の位置関係を確認する。
- [ ] 脳神経I–XIIの見かけの起始部と主要脳底動脈の走行を確認する。
- [ ] 断面の必修構造について、冠状・水平・矢状の連続断でラベルの位置と連続性を確認する。
- [ ] 脳梁・内包、視交叉・島皮質、脳室・脳幹・小脳候補の由来と確度を再確認する。
  - 2026-08-24 脳室部分監査: BigBrain背景値255へ連結する空隙の単純3D補完は、左右側脳室・第三・第四脳室のすべてで外側背景へ漏れるため不採用。X・Y・Z各軸で現行の同一脳室ラベルに挟まれ、別ラベルと6近傍接触しない未ラベル背景だけを抽出し、左14、右15、第三4、第四0 voxelの計33 voxelへ固定した。ローカル三断面で既存ラベル内の小欠損と確認し、PR #14のstrict approved教育用修正として公開ラベルへ適用。新SHAは `b75a2490…b176f3`。通常production previewで3脳室同時表示と側脳室クイズを確認し、Canvas／loader／error／overflowは正常。全テスト304/304、型検査、通常／Pages build、Go/No-Go台帳監査に合格した。専門家レビュー・ground truthではない。詳細は [VENTRICLE_CAVITY_AUDIT.md](VENTRICLE_CAVITY_AUDIT.md)。
- [ ] 視索・視床下部・乳頭体について、断面ラベル、画像上の構造、模式3Dレイヤーの重複・取り違えを連続断と表示モード別に確認する。（客観資料追加: 現行旧ID33を変更せず、8,482 voxel、bbox、12個の6近傍成分、全X/Y/Z占有断面、全境界面接触、代表候補X187／Y262／Z114を固定JSONへ記録し、寄稿者ツールから3候補へ編集を作らず移動できるようにした。Chrome 151で3位置と表示数を確認し、最終route監査156/156件に合格。これは専門家の画像確認を支援する格子監査で、ID36–38への機械分割や解剖学的検証ではない。）
追加監査記録（2026-08-23）: [ORTHOGONAL_REVIEW_BUNDLE_AUDIT.md](ORTHOGONAL_REVIEW_BUNDLE_AUDIT.md) に、現行ラベルを変更しないローカル証拠束 v3（manifest＋期待161 PNG）を記録した。固定入力SHA・BBS1寸法、ID39・40の全X/Y/Z占有と両端外側、ID33の全占有断面、ID27のcrop内context-only、pixel／PNG SHA、空metadata、flat anchor、exact schema/file/link境界を検査済みである。`review.status=unreviewed` で、これは本チェック項目やβ Go/No-Goの完了を意味しない。乳頭体の視床下部付着部と、旧ID33内の視交叉・左右視索境界は、ユーザー／専門家による原画像・隣接断確認が必要である。

- [ ] 小脳脚、菱形窩、錐体、オリーブ、丘・膝状体、脚間窩を確認する。

完了条件: 必修構造ごとに「検証済み」「模式表示」「推定」「未収録」のいずれかが記録され、未確認の表示を検証済みと誤認させない。明らかな位置誤り、二重表示、構造から遊離した部品を残さない。

由来・確度の表示区分と監修台帳は [STRUCTURE_PROVENANCE.md](STRUCTURE_PROVENANCE.md) に集約します。学生向け通常画面では「標本対応」「試作」「模式」等の短い区分を示し、詳細表示、共同制作ページ、編集ツール、監査台帳では「標本同一格子・手動分節」「アトラス照合・試作」「画像誘導・試作」等を確認できるようにします。短縮表示は確度の昇格を意味せず、専門家確認欄が埋まるまでは「検証済み」と表記しません。

### 2. 3Dモデル方針の比較試作

現行モデルを全面的に作り直す前に、次の代表課題で二方式を比較します。

1. 断面・アトラス再構成モデルを改善する方式
2. 解剖知識に基づく教育用モデルを一から造形する方式

比較対象:

- 外側面: 中心溝、外側溝と周囲の脳回
- 下面: 脳底構造、脳神経、主要動脈
- 深部: 脳室系または大脳基底核
- 局所標本: 内側側頭葉または脳室全景

評価項目は、同定しやすさ、位置関係、表面品質、回転時の見やすさ、着色・脱着のしやすさ、動作負荷、制作・修正コストです。

完了条件: 同じ観察課題を両方式で比較できる試作品と評価記録を残し、β本体で採用する基盤を決定する。知識ベースモデルは「実標本由来」「正解セグメンテーション」と表記しない。

2026-08-23 部分実装: 共同制作ページへ、左右側脳室と第三脳室を対象にした寄稿者限定のA/B比較pilotを追加した。Aは配布済み同一格子メッシュ、Bは既存標本・アトラス頂点・ラベルを使わない7,980 bytesの独立した模式メッシュで、画面上に「模式・専門家未確認」「実標本由来ではない」を常時表示する。同じ回転・視点・色・表示ON/OFFを共有し、通常経路では比較用chunk・meshを取得しない。7評価項目は `model-comparison/deep-ventricle-evaluation.json` に未採点で固定し、採否は `pending-expert-review` のままとした。Chrome 151でPC・390 px相当を実操作し、canonical全経路156/156、初回payload 26/26、全テスト217/217、型検査、通常／Pages本番ビルドに合格。詳細は [MODEL_STRATEGY_COMPARISON_AUDIT.md](MODEL_STRATEGY_COMPARISON_AUDIT.md)。専門家・学習者評価とβ本体の基盤決定は未完了である。

2026-08-24 追記: 共同制作ページ冒頭へ寄稿者向けM2案内を追加し、専用URL `#workspace/collaborate/model-strategy` のdirect/reloadを可能にした。通常の共同制作ページは比較資産を読み込まずCanvas 0、専用URLはCanvas 2と比較用3資産だけをexact allowlistで取得する。Windows Chrome 151のローカル確認で開閉・起点focus・390 px相当の一列表示を確認し、canonical 27経路×3幅×direct/reload＝162/162、cold初回payload 27/27に合格した。比較案は引き続き「模式・専門家未確認」で、採否とβ本体の基盤決定は未完了である。

同日、後日の専門家・学習者レビュー準備として、7項目×A/Bの1〜5評価、評価者の立場、全体印象、任意メモを専用URLへ追加した。氏名・メール・所属は収集せず、version付き端末内下書きとJSON書き出しだけを行う。JSONは未送信・非採用・専門家確認未主張を固定し、独立validatorが点数、項目順、完了度、余分な個人情報field、送信・採用・expert完了への昇格を拒否する。Chrome 151で入力・reload復元・書き出し、390 px相当の2列評価と44 px操作、error／loader／overflow 0を確認し、最終route 162/162、cold payload 27/27に合格した。実際の評価、内容の妥当性、採否は未完了である。

### 3. 表示品質と操作の回帰確認

- [x] 選択した全構造が断面と透過3Dの双方で同時表示される（20構造の一括表示をWindows実ブラウザで確認。旧メッシュ面数の互換読込も追加）。
- [x] 構造が周囲に埋もれる場合に、透過・単独表示・脱着で観察できる（レンズ核標本の透過／選択だけ／組織非表示と、後脳標本の小脳・橋延髄脱着を実操作）。
- [x] クイズでは正解対象が十分な面積で表示され、断面問題ではスライダーを動かせる（全断面問題の着色面積を自動検査し、スライダーに1断面ずつの送り／戻しを追加。通常幅・390 pxで実操作）。2026-08-24、断面17・脳表6・神経血管18 targetをPC／横向きタブレット／phoneの計123件で着色→解除→再着色し、Chrome 151の独立validatorで123/123件に合格した。半透明神経血管はdepth・描画順・selected色の残存を再現し、PCAも3幅すべてoutside 0。1 px許容・合格閾値は緩和していない。詳細は [QUIZ_TARGET_VISIBILITY_AUDIT.md](QUIZ_TARGET_VISIBILITY_AUDIT.md)。
- [x] 脳表、断面、局所標本、クイズ、自由観察、権利表示の全経路を直アクセスと再読み込みで維持する（M1 Windows実ブラウザで全23経路を確認）。
- [x] 小画面でも閲覧、クイズ、基本操作が画面外へ消えず、デスクトップでは観察領域を不必要に縮めない（1366、760 / 761、390 pxで確認）。主対象はPCと横向きタブレットとし、スマートフォンの全3D操作完遂はβ公開条件にしない。
- [x] 3D、断面、着色・脱着、クイズ復習、編集ツールのマウス・タッチ・キーボード操作を共通ガイドへ集約し、`#workspace/help` の直接URLと再読み込みで維持する（390、760 / 761 pxで横はみ出し、フォーカス循環、元画面への復帰を確認）。

完了条件: 主要経路の自動テストと実画面確認に合格し、無反応なボタン、空ラベル、黒画面、重複部品、リロード時のページ移動を残さない。

### 4. 公開データ量と性能

- [x] 断面、全脳、脳表、局所標本の取得単位を調べ、脳表の神経血管・脳底・深部・溝と局所標本を必要時読込にする。
- [x] 開発用・比較用の画像や未使用データを公開配布物から除外する（第1回監査で139.9 MiBから78.5 MiBへ削減）。
- [x] 圧縮後転送量、ブラウザキャッシュ有効時の再訪転送量、初回表示時間、メモリ使用量をPCと横向きタブレット相当で計測し、スマートフォンでは閲覧・クイズ・基本操作の破綻がないことを確認する（Windows desktop ChromeのDevTools Protocol、`Emulation.setDeviceMetricsOverride` は `mobile:false`、デスクトップUA・タッチエミュレーションなし、viewport 390 pxの実効 `clientWidth` 375 px。DOMイベント操作でクイズ回答・水平断range・表示切替を確認し、backing storageはcold／warmペアの `sampledPeak` 最大値として記録。物理スマートフォン、公開回線、OS全体メモリの測定ではない）。
- [x] Homeは実モデルの軽量静止プレビューだけを取得し、本格3Dメッシュを脳表観察の開始まで遅延する。
- [x] 大容量データの取得中、実測byte・総量・整数％（総量取得可能時のみ）と失敗時の再試行を明示する（2026-08-23、全資産のstream計測、複数資産集約、受信／展開phase、再試行世代分離を実装。総量不明時は推定％を出さない。Chrome 151で既知／未知表示、390 px相当の横はみ出しなし、完了後loader 0を確認し、route 156/156、全テスト227/227、型検査、通常／Pages buildに合格。詳細は [DOWNLOAD_PROGRESS_AUDIT.md](DOWNLOAD_PROGRESS_AUDIT.md)）。
- [ ] PWAとしてホーム画面へ追加でき、オンラインで一度開いた主要教材をオフラインでも再利用できるようにする（2026-08-24、manifest、base-path対応Service Worker、release別shell／data cache、オフライン表示、runner所有server停止・復帰に加え、Homeへ明示クリック式の端末追加案内を実装。合成 `beforeinstallprompt` のUI状態はPC／390 px相当×3状態＝6/6、通常／Pages停止・復帰は各10 action＝20/20、blocker 0、route 162/162、cold payload 27/27。約92 MBの一括保存を行わず、未訪問・保存削除後は通信が必要と画面で明示する。ただし合成イベントは実インストールではなく、ホーム画面追加・追加後起動、公開URL、物理端末、Safari・別ブラウザ、インストール済みPWAは未確認のため、このPWA Go/No-Go項目は未完了のまま維持する）。

暫定目標: 公開物全体は100 MB未満を目指し、通常の1観察セッションでの初回転送量は20–30 MB程度を目安にする。教材品質を損なう場合は数値を固定せず、実測値と理由を公開する。

計測記録は [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) に残します。

PWAのキャッシュ境界、更新方針、未確認項目は [PWA_OFFLINE_AUDIT.md](PWA_OFFLINE_AUDIT.md) に分離して記録します。ローカルのService Worker登録やv10のlistener停止監査を、公開URL、物理端末、物理／OSネットワーク断でのオフライン保証として扱いません。

2026-08-23実測状況: 既存の左右pial `.mesh` を保持したまま決定的なlossless `.mesh.gz` sidecarを配信し、初回payload監査は圧縮物理パスだけを観測した。`work/performance/performance-suite-pial-gzip-2026-08-23.json` は37/37件、関連stable-time回帰は1%未満、sampledPeak backing storage最大増加は2.0%（レビュー閾値25%）だった。`work/browser-audit/beta-route-audit-pial-gzip-2026-08-23.json` は156/156件で、error／loader／overflow／WebGL fallbackは各0件。視覚確認ではPC combined Canvas 3、狭幅のsection-only Canvas 1→combined Canvas 3、2つの3D view、console warning/error 0を確認した。requested 1366 px時の実効clientWidthは1035 px、requested 390 px時は284 pxで、物理viewport値とは扱わない。

2026-08-23の従来context ON計測（既存31件＋context ON 6件）は履歴として保持し、今回のpial gzip性能suiteとは別artifactである。

同日、初回ルートpayloadは `http://127.0.0.1:4211/` のcanonical 26経路cold loadで26/26件がstable・validation passedとなった。結果は `work/performance/initial-route-payload-audit-pial-gzip-2026-08-23.json` に固定し、圧縮pial物理パスだけを要求してraw要求0件だった。sectionsは26,441,013 Bで、旧34,688,033 B（34.69 MB）から8,247,020 B（23.8%）減った。旧34.69 MBはsupersededな実測履歴として残し、現在値とは扱わない。全26経路の表とbudgetは [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) に同期した。

### 5. 権利・公開運用

- [x] すべての配布データについて、出典、改変内容、ライセンス、表示義務を再監査する（`public/atlas/DATA-MANIFEST.json` で全ファイルを一意に分類し、同梱通知と個別メタデータを自動照合）。
- [x] 実習書、講義資料、ウェブ上の標本写真を許諾なく転載しない（公開物のラスター／文書を全監査し、画像はプロジェクト用SNSカード1点のみ。`public/ASSET-NOTICE.txt` で用途と非転載を明示）。
- [x] BigBrain由来データの非営利・継承条件と教育用免責を、READMEとアプリ内で一致させる（BigBrain公式ライセンス掲示を再確認し、README、利用条件、同梱通知、データ監査を照合）。
- [x] Cloudflare Web Analyticsの利用をプライバシー説明へ明記し、収集内容を必要最小限にする（公式説明を再確認し、公開HTTPS本番ホストだけでビーコンを読込。localhost、127.0.0.1、開発ビルドは除外）。
- [ ] Google Formを公開版の表記へ同期し、ログイン不要のテスト回答と削除手順を確認する。（2026-08-24、ログアウト状態で現行回答者URLが開き、ログインは回答保存の任意導線、匿名分岐とGitHub Issuesリンクが表示されることを再確認。現行フォームはまだ「α版」表記のため、版名非依存の「教育用試作教材」へ更新した生成スクリプトを管理者が既存フォームへ再適用し、全3ページ・送信・Formsと回答シート双方からの削除を確認するまで未完了。）
- [ ] `CONTRIBUTING.md` の共同制作条件を管理者が確認し、「公開前ドラフト」を正式版へ更新する。

完了条件: 公開URL、対応ソース、フォーム、利用条件、クレジット、プライバシー説明が相互に到達でき、第三者素材の条件と表示が一致する。

## P1: βで改善する項目

### 6. 脳表と全脳の視認性

- [x] 小脳メッシュを、葉・裂を潰さない範囲でスムージングする（CerebrA境界の頂点は動かさず、深い葉間を越えない表示法線のみ4回平滑化）。
- [x] 大脳と小脳の色を分けつつ、脳溝の陰影が読める配色へ調整する（大脳を明るい中性色、小脳を低彩度の黄褐色とし、同じ2灯陰影を維持）。
- [x] 溝・裂は厳密な分節面と混同させず、脳回間の位置関係が読める教材表現へ統一する（全8ガイドを「模式ガイド」「位置目安」とし、仮想色面は厳密な輪郭・分節境界ではないと画面上で明記）。
- [x] 選択構造の色が互いに区別でき、背景・文字とのコントラストを保つ（方向別の同時選択色を監査し、最小sRGB距離35以上、暗背景との元色比3:1以上を自動検査。名称・選択状態も併記）。
- [x] 脳表を透過した際の神経・血管・模式レイヤーの奥行きと不透明度を、細い構造の可読性を保ちながら統一する（`TRANSPARENCY_VISIBILITY_AUDIT.md` に、全表面 `0.18`、通常補助 `0.78`、選択時 `0.98`、深度テスト優先の描画順を記録。動脈・脳神経・自由観察で通常／透過切替、回転、個別選択、Papez回路の色と非透過時の可視性を実操作し、最終ビルドの26経路×3幅×direct/reload＝156/156に合格。全テスト118/118、型検査・本番ビルド・差分検査も成功）。

### 7. セグメンテーション共同編集

- [x] 現在の水平断エディタを実際の修正作業で試し、差分JSON、版固定、競合検査の運用を確認する（`SEGMENTATION_WORKFLOW.md`、`tests/rendered-html.test.mjs`のBBS1版固定・legacy/strict validator・競合検査回帰）。
- [x] 冠状断・矢状断で同じラベルを確認できる照合表示を追加する（`app/ManualSegmentationWorkbench.tsx`の直交断照合専用表示、同一原画像・ラベル・端末差分、1 voxel移動の実ブラウザ回帰）。
- [x] 構造、左右、断面範囲、根拠資料、確認者、確度を差分に付与する（差分JSON v1の`workflowMetadataVersion`、`targetStructures`、`sliceRanges`、`changeSummary`、`review`と、入力ラベルからのstrict再計算。公式buildも適用前volume bytes・dimsへ同じvalidatorを実行し、型・テスト・buildを通過）。
- [x] 採用前後の比較と、差し戻し理由をPull Request上で追跡できるようにする（PRテンプレートの提出者情報・競合・メンテナー決定欄、`review.decision`、理由、PR番号・40桁hex merge commit、`--output`のapproved限定、review matrixとallowlist移行拒否テスト）。

### 8. 学習内容とクイズ

- [ ] 講義資料の必修構造を再照合し、未収録と模式表示を区別する。（部分記録: `LECTURE_COVERAGE_AUDIT.md` の51行を `public/atlas/structure-provenance.json` へ機械可読化。専門家による必修範囲レビューと最終的な欠落判定は未完了。）
- [ ] 脳神経と主要血管の同定問題を追加する。（部分完了: 既存模式3Dだけを使う18問のpilot（血管6・脳神経I–XII）へ`cn2`の1問を追加し、`neurovascular`／`arteries`／`cranialNerves`の候補数、wrong-only、復習リンク、由来台帳、overlay region ID、既存23問の別SHAを監査。`cn2`はoverlay region ID23・24だけを使う合成模式レイヤーで、opticChiasm ID25、旧断面ID33、未分節の視覚路ID36–38を含めず、問いは白色強調の名称同定のみ。Chrome 151のローカルpreviewで全41問・脳神経12問、誤答後の`cn2`観察リンク、試作OFF時0問、review filter復習22件を実操作し、全41 target×3幅の可視性監査も123/123件に合格した。2026-08-22の17問記録は履歴として保持する。公開URL、物理端末、別GPU、専門家レビュー、細枝・静脈・連絡動脈、視覚路の個別分節は未完了。）
- [ ] 断面方向・脳表・脳底・深部構造など、項目別出題の粒度を整える（部分完了: 既存23問を変更せず、トピックと独立した「すべて／断面・深部／脳表」＋断面3方向／脳表4方向の候補数付きフィルタに加え、脳神経・主要血管の模式3D pilotを `NEUROVASCULAR_QUIZ_AUDIT.md` へ分離して固定。由来区分、候補数連動の問題数、候補0件の設定欄説明、wrong-only、復習リンクを実装。Chrome 151のローカルpreviewで操作確認済み。公開URL、物理端末、別GPU、専門家レビュー、細枝・視覚路の個別分節は未完了。）
- [x] 正答率だけでなく、誤答した構造と再学習先を示す（今回の誤答一覧と、対象を着色した観察画面へのリンクを実装）。
- [x] 専門家未確認の構造を通常問題へ混ぜない（標準出題は同一格子の公開手動分節だけに限定し、位置照合・画像誘導・脳表問題は既定ONの「試作問題を含む」へ分離して常時警告表示）。
- [ ] 3Dと断面を同期し、段階的な回路観察（再生、一時停止、前後移動）を試作する。（部分完了: 大脳基底核5段階に加え、Papez回路を由来別6段階へ拡張した。海馬ID17/18・乳頭体ID39/40・視床ID15/16は既存クイズ断面位置を再利用し、脳弓は模式3Dのみ、帯状回・海馬傍回・嗅内野はCerebrA／Desikan系アトラス3Dのみと明示する。乳頭体は原画像由来3Dメッシュがないため「断面ラベルのみ」、視床前部核は未分節と表示し、3D専用段階では断面Canvasを生成しない。前／次／再生／一時停止／最初へ戻る、最終自動停止、プリセット切替cleanupを実装し、Papez断面画素は1,400／120／2,398。Chrome 151の実操作、canonical route 162/162、cold payload 27/27に合格し、新規asset requestは0。新しい境界・mesh・voxel・線維路・投射方向・興奮性／抑制性は追加していない。専門家レビューと、ID36–38未分節のため保留した視覚路ステッパーは未完了。詳細は `PATHWAY_STEPPER_AUDIT.md`。）

### 9. 局所標本

- [x] 8標本を一律に磨くのではなく、改善対象の優先順位をつける（2026-08-24、ロードマップが既に挙げる側脳室、レンズ核・投射線維、脈絡叢、内側側頭葉を「β重点4」、残る4標本を「発展観察4」として導線を分離。これは実習頻度、解剖学的確度、由来、専門家レビューの順位ではなく、全8標本・既存番号・URL・機能を維持する。詳細は [BLOCK_SPECIMEN_PRIORITY_AUDIT.md](BLOCK_SPECIMEN_PRIORITY_AUDIT.md)）。
- [ ] 脳室全景、レンズ核と投射線維、脈絡叢、内側側頭葉など、切り出す意味が明確な標本から改善する。（部分完了: β重点4の入口、観察理由、既存layerを単独表示して最終段階だけ全表示する部品確認ガイド、手動表示の終了・標本切替・workspace離脱時復元、独立監査、全tests 330/330、型検査、通常／Pages buildを完了。Chrome 151 production preview `http://127.0.0.1:4316`でfocus4の開始→全single→final all→終了後manual復元、側脳室からdiencephalonへのactive切替cleanup、発展4のguide count 0を確認し、PC Canvas 1・loader／UI error／overflow 0。canonical route 162/162、cold payload 27/27、390 px相当のroute health／overflow 0・CSS 44 px契約も確認した。これはUI上の確認順であり、解剖・摘出順や実習手順ではない。390 px相当の実クリック、物理端末・タッチ、公開URL、別ブラウザ／GPU、形状・境界・切り出しの専門家確認は未完了。詳細は [BLOCK_GUIDED_OBSERVATION_AUDIT.md](BLOCK_GUIDED_OBSERVATION_AUDIT.md)。）
- [x] 内側側頭葉の海馬采・鉤の位置と連続性を再検討する（一次資料と現行生成式を照合し、4点線と楕円では連続性を保持できないためβ候補の3Dから除外。海馬・扁桃体・下角だけを残し、未収録を画面表示。`MEDIAL_TEMPORAL_AUDIT.md` に判断を記録）。
- [x] 正当に利用できる資料と監修がない限り、実標本らしい質感を正確性の代用にしない（全8標本の共通注意へ、褐色表示は湿潤感・線維感・切断面を再現せず、実在感を正確性の根拠にしないと明記）。
- [x] βでも検証が不足する標本には「試作・未保証」を継続表示する（入口、上部固定バッジ、標本別注意、利用条件の4箇所で表示し、β重点／発展枠の双方に適用）。

### 10. 共同制作とフィードバック運用

- [x] Google Form、GitHub Issues、Pull Requestの用途を整理し、投稿者が迷わない入口にする（非公開・匿名のForm、公開相談のIssue、変更提案のPRをアプリ内で別カード化）。
- [x] 解剖監修、セグメンテーション、3D造形、Web実装の募集項目を分ける（Formの共同制作分岐とアプリ入口で分野を列挙）。
- [x] 軽微な修正と継続的な共同制作を、貢献量だけで機械的に分けず、実績に応じてクレジットする（`CONTRIBUTING.md` と `GOVERNANCE.md` に累積効果・役割・説明責任を基準とする方針を明記）。
- [ ] α版のアクセス状況と意見を定期的に確認し、個人を追跡せず優先順位の判断材料にする。
- [ ] 変更履歴と、βで修正した既知の問題を公開する。（部分的な根拠: ローカル候補へ実装、公開URL反映確認待ち。）

### 11. ブロック標本の切り出し文脈

- [ ] 各ブロック標本に、透過した全脳、切り出し範囲、切断面、方向を重ねる表示を追加する。（部分完了: 教材内8標本へ、既存の収録済み標本材質メッシュを位置目安として重ねる全脳／教材内代表断面表示を実装し、PC相当と390×768相当の実ブラウザで確認。新しい切り出し範囲・方向・手順は作らず、専門家レビューは未完了。）
- [ ] 全脳からブロック標本へ至る切り出し段階を、観察を妨げないオン・オフ可能な形で示す。（部分完了: 「全脳で位置を確認」は初期OFF、ON時だけ追加Canvas、閉じると破棄。切断幅・摘出順・実習手順は表示しない。）
- [ ] 実習で頻出する標本から優先し、切り出しの意味と対応を確認者が記録する。（部分完了: 8標本の実装契約・既存データ範囲・未確認事項を `BLOCK_CONTEXT_AUDIT.md` に記録。8標本のCanvas生成／破棄、代表断面切替、標本切替時の初期OFF・全脳表示復帰、フォーカス復帰、小画面を確認し、基礎31件＋context ON 48件の性能監査79/79件にも合格。専門家レビューは未完了。）

完了条件: 利用者が全脳上の位置と切断の向きを確認してから標本を観察でき、未検証の切り出しを正確な実標本手順として表示しない。

## P2: β公開を妨げない発展項目

- XI脳神経の脊髄根、脳神経核、頭蓋孔、遠位走行
- 表在・深部脳静脈、硬膜静脈洞、穿通枝、血管支配領域
- 小脳葉・小脳核、視床核群、細い交連、手綱系
- 個体差表示、微細血管、研究・手術用途の定量精度
- 英語UI、多言語教材、教員向け問題編集
- Brodmann分類の教育用オーバーレイ（データの権利、標準脳との対応、表示上の注意を確認してから採用）
- 断面位置・幅とブロック切り出しを練習する事前学習モード（実習担当者の監修と、献体への敬意を含む表現を前提とする）

これらは根拠資料、権利、監修、維持コストが揃ったものから扱い、β公開のために無理に追加しません。

## マイルストーン

| 段階 | 主な成果 | 移行条件 |
| --- | --- | --- |
| M0 α観察期間 | フィードバック、アクセス傾向、重大不具合の整理 | 意見の入口と分析が稼働し、P0をIssue化できる |
| M1 根拠・性能整理 | 構造ごとの確度表、表示回帰修正、配信量の実測 | 誤認につながる問題を解消し、性能基準を決める |
| M2 3D比較試作 | 現行改善版と知識ベース版の代表課題 | 専門家・学習者による比較記録から基盤を選ぶ |
| M3 β候補版 | 必修範囲、クイズ、権利、共同編集、公開運用を統合 | 下記のGo/No-Go確認にすべて合格する |

## β版 Go / No-Go

- [ ] 必修構造は、検証済みか、模式・推定であることが画面上で判別できる。（部分的な根拠: 由来区分・表示面・既知の制限を監査索引へ記録し、既存23件と模式3D pilot 18件の一意な41件の正答対象をアプリ実装と照合した。画面全必修範囲のGo/No-Go判定は未実施。）
- [ ] 学習対象の明らかな欠落、二重表示、遊離、空着色がない。（部分的な客観資料: 現行旧ID33は8,482 voxel、6近傍12成分で、全占有断面・境界面接触・代表候補を固定JSONへ記録した。脳室は三軸で同一ラベルに挟まれた内部欠損33 voxelだけをプロジェクト内レビュー済み修正として採用した。これらを全構造の解剖学的確認とは扱わず、専門家確認は未完了。）
- [x] 脳表・断面・自由観察・クイズの中心操作がPCと横向きタブレット幅で完了できる。（2026-08-23、Windows Chrome 151の通常production previewで、脳表・水平断・自由観察・クイズ×PC 1366×768／横向きタブレット幅1024×768の8/8件、計40操作が合格。独立validatorが実測viewport、操作前後、5問キュー生成、回答対象から導出した復習先、Canvas、error／loader／overflow／WebGL fallbackを再計算。`mobile:false`・`touch:false` のローカルデスクトップエミュレーションであり、物理タブレット、実機タッチ、公開URL、別ブラウザ・GPUは未確認。詳細は [CORE_INTERACTION_AUDIT.md](CORE_INTERACTION_AUDIT.md)。）
- [ ] スマートフォンで閲覧、クイズ、基本操作が破綻しない。全3D操作の完遂はβ公開条件にしない。（部分実装: `MOBILE_UI_AUDIT.md` に沿って、coarse touch phoneだけへ5導線dock、単一settings dialog、編集Canvasを生成しないsegment案内を追加。Chrome 151のローカル通常production preview `http://127.0.0.1:4198` でcoarse touchのsettings／segment／range操作と、fine-pointer狭幅のcompact desktop／segment維持を確認。coarse 26経路52/52、fine/non-touch 26経路×3幅×direct/reload 156/156も合格。公開URL、物理端末、実機タッチ、Safari・別ブラウザ、別GPU、専門家レビューは未確認。）

追加確認（2026-08-24）: phone中心操作の最終保存結果は `work/browser-audit/phone-core-interactions-v17-block-guided-2026-08-24.json` である。Windows 11／Node 24／Chrome 151、通常production preview `http://127.0.0.1:4329/`、390×768・DPR1・`mobile:true`・`touch:true`・最大同時タッチ5・縦向きで、dock／脳表・左外側面／水平断／復習／側脳室ブロック標本ガイドの5 journeyを実タッチイベント列で確認し、`allPassed: true`、独立validator failure 0だった。Solレビュー後のvalidatorは、action summaryとprobeの対応、surface target keyと選択状態の連続性、wrong-answerからreview-linkまでのquestion target連続性、touch targetのgeometry・primaryTouchId・target/touch ID対応、tapのtouchPoints 1→0／dragの1→1→0、実設定遷移を独立に再計算する。脳表は初期の内側面から設定sheetの実タッチで左外側面へ、断面は初期の矢状断から実タッチで水平断へ移り、blocksは試作introを閉じてガイド開始→次へ→終了し、手動4 layerへ復元した。これはcoarse-touch emulationの部分確認であり、スマートフォンUI全体の完了扱い、解剖学的順序の検証、物理端末・実機タッチ、公開URL、Safari・別ブラウザ、別GPU、専門家レビューの確認を意味しない。）
- [x] 公開データ量と初回表示時間を実測し、過大な取得を減らしている。（2026-08-24、M2比較レビュー記録追加後のcanonical 27経路cold payload監査は27/27件、route監査は27経路×3幅×direct/reload＝162/162件。通常の共同制作ページは比較資産を取得せず、専用URLだけが比較用3資産のexact allowlistに一致した。2026-08-23のpial gzip性能suite 37/37件、圧縮pial物理パスのみ、raw要求0件、Home・static経路のatlasなし、surface／sections／blocks／segment／quizのexact初回allowlistとartifact-derived budgetも維持した。stable-time回帰は1%未満、sampledPeak backing storage最大増加は2.0%。`public/` 全体はPWA用PNGアイコン追加後92,446,938 B（88.16 MiB）で100 MiB未満、sectionsは26,441,013 Bで旧34,688,033 B（34.69 MB）から23.8%減り、20–30 MB暫定目安内。結果は [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md)、`work/performance/initial-route-payload-model-strategy-review-2026-08-24.json`、`work/browser-audit/beta-route-audit-model-strategy-review-2026-08-24.json`、`work/performance/performance-suite-pial-gzip-2026-08-23.json` に記録。公開URL・公開回線・物理端末・別GPU／別ブラウザは未確認。）
- [ ] 自動テスト、本番ビルド、公開URLの全経路巡回に合格する。（2026-08-24、M2比較レビュー記録を含むcanonical route監査で27経路×3幅×direct/reload＝162/162件をWindows Chrome 151（`http://127.0.0.1:4313`）で確認。`work/browser-audit/beta-route-audit-model-strategy-review-2026-08-24.json` に固定し、missing/duplicate/fail=0、console/request/UI error・loader・overflow・WebGL fallback=0。公開URL反映確認待ち。2026-08-23の26経路156/156件と2026-08-22のstatus追加前25経路150/150件は履歴として保持。）
- [ ] クイズ対象は画面上で十分に確認でき、未確認構造を正答として要求しない。（粒度監査で既存23問を標準7件・試作16件、模式3D pilot 18件の一意な41件として形式・詳細・トピック・由来へ分類し、targetと全選択肢の由来を照合。provisional選択肢を含むpallidum・accumbens・hippocampus・mammillaryBodyを試作へ分類し、試作OFF時の候補除外、標準回答セットの全件解決、unknown由来の拒否を自動検査。Chrome 151のローカルpreviewで試作ON時41件（標準7・試作34）、OFF時7件（標準7・試作0）、標準queue、乳頭体問題の試作バッジを実操作し、最終route監査162/162件に合格。旧ID33の正答対象外、II視神経・視索はID23・24だけを使う合成模式レイヤーとして名称のみを扱い、誤答から観察画面への復帰も確認済み。標準採用基準の解剖学的妥当性と未確認構造が選択肢へ現れないことの専門家確認は未完了。）
- [ ] 専門家レビューの対象と根拠を引き継げる。（準備のみ: `ANATOMY_REVIEW_HANDOFF.md` と共同制作画面の読み取り専用キューで、provenance台帳のexpert pending 75件を表示。パネルは一般のForm・Issue・PR入口の後ろで既定閉鎖、開いたときだけフィルタと一覧を表示する。観察リンクは対象を自動選択しない一般workspace入口に限定。Chrome 151のローカル通常buildで表示面別54／16／30／22件を確認し、既存の複合フィルタ、ID39・40、旧ID33、狭幅回帰記録も維持する。専門家確認、解剖学的妥当性、採否は未完了。ID39・40はプロジェクト内レビュー済みだがexpert pending、旧ID33混合領域は断面／通常クイズ正答と分節入口から除外。）
- [ ] ライセンス、クレジット、免責、プライバシー、対応ソースが公開版と一致する。（部分的な根拠: 由来参照は既存DATA-MANIFESTグループまたは配布ファイルへ解決。公開版との最終一致確認は未実施。）
- [ ] Google FormとGitHubのフィードバック導線が機能する。
- [ ] 少なくとも1名の神経解剖学に詳しい確認者による必修範囲のレビュー記録がある。
- [ ] βで未完成の項目を既知の制限として公開する。（部分的な根拠: 各講義行・グループとローカル候補のstatus画面へ既知の制限を記録。ローカル候補へ実装、公開URL反映確認待ち。専門家レビューは未完了。）

2026-08-24 追記: `#workspace/status` へ12件の公開前チェックを追加し、Go／No-Go台帳から状態別件数、ローカル確認範囲、未確認範囲、次操作を読み取り専用で表示した。件数3／1／4／1／3と各stateは変更せず、総合合格・公開可・専門家確認済みとは表示しない。Chrome 151でdirect、詳細、focus／Esc／背景click、390 px相当一列、error／loader／overflow 0を確認した。公開URL反映待ちのため、本項目とcriterion 12は未完了のまま維持する。詳細は [BETA_READINESS_DISPLAY_AUDIT.md](BETA_READINESS_DISPLAY_AUDIT.md)。

## 関連文書

- [ALPHA_RELEASE_AUDIT.md](ALPHA_RELEASE_AUDIT.md): α版で達成した項目と既知の不足
- [LEARNING_SCOPE.md](LEARNING_SCOPE.md): 必修・発展構造の範囲
- [LECTURE_COVERAGE_AUDIT.md](LECTURE_COVERAGE_AUDIT.md): 講義資料との照合
- [SEGMENTATION_WORKFLOW.md](SEGMENTATION_WORKFLOW.md): 手動ラベル修正の手順
- [ACCURACY_AND_VIEWER_RESEARCH.md](ACCURACY_AND_VIEWER_RESEARCH.md): 正確性と3D閲覧方式の調査
- [DATA_AND_LICENSES.md](DATA_AND_LICENSES.md): データと権利の監査
- [STRUCTURE_PROVENANCE.md](STRUCTURE_PROVENANCE.md): 構造表示の由来・確度・監修台帳
- [VISUAL_CONTRAST_AUDIT.md](VISUAL_CONTRAST_AUDIT.md): 3D選択色と暗背景の可読性監査
- [MESH_VISIBILITY_AUDIT.md](MESH_VISIBILITY_AUDIT.md): 小脳法線平滑化と大脳・小脳配色の監査
- [TRANSPARENCY_VISIBILITY_AUDIT.md](TRANSPARENCY_VISIBILITY_AUDIT.md): 脳表透過時の奥行き・不透明度・選択強調の監査
- [CONTRIBUTING.md](CONTRIBUTING.md): 共同制作の入口
- [MEDIAL_TEMPORAL_AUDIT.md](MEDIAL_TEMPORAL_AUDIT.md): 海馬采・鉤の表示除外判断と根拠
- [QUIZ_GRANULARITY_AUDIT.md](QUIZ_GRANULARITY_AUDIT.md): クイズ23問の形式・方向・トピック・由来分類と候補数フィルタの監査
- [BETA_OBSERVATION_NOTES.md](BETA_OBSERVATION_NOTES.md): 利用観察から得た次期改善候補と実装・監修上の注意
- [MOBILE_UI_AUDIT.md](MOBILE_UI_AUDIT.md): phone能力判定、専用dock、設定dialog、編集画面ガードの監査
- [PHONE_CORE_INTERACTION_AUDIT.md](PHONE_CORE_INTERACTION_AUDIT.md): coarse-touch phoneの中心操作5 journeyと未確認範囲
- [ANATOMY_REVIEW_HANDOFF.md](ANATOMY_REVIEW_HANDOFF.md): 専門家レビュー準備キューの範囲、導線、監査
