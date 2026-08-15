# Windows Codexへの引き継ぎ（β候補）

更新日: 2026-08-15
対象ブランチ: `codex/beta-candidate`
基準実装コミット: `957386c Validate structured device evidence`（容量保護改善の直前）

## 1. 現在地

この作業ツリーは、公開α版からβ候補へ進めるローカル開発版です。公開、GitHubへのpush、Pull Request更新、`main`統合は行っていません。公開URLは現在も既存α版であり、このローカルβ候補の検証証拠には使いません。

直近のローカル検証:

- 自動テスト: 78件全件合格
- TypeScript: 合格
- 本番Viteビルド: 合格
- `npm run audit:beta`: 10監査合格
- Go / No-Go: ローカル合格3条件、外部証拠待ち7条件
- 結論: **No-Go（β候補のローカル検証中）**

β候補の昇格は、少なくとも専門家レビュー、実スマートフォン、公開URL、管理者操作の証拠が揃った後に、プロジェクト管理者が判断します。

## 2. 再開前の確認

この作業フォルダーを引き継いだ場合は、remoteから作り直さず、最初に現在状態を確認します。

```powershell
git status --short
git branch --show-current
git log -5 --oneline
npm install
npm run audit:beta
npm test
npm run build
```

期待値:

- ブランチは `codex/beta-candidate`
- 作業ツリーはクリーン
- `38890d3` 以降のコミットが存在
- `audit:beta` は10監査に合格し、3ローカル合格／7外部証拠待ち、No-Goを表示
- テストと本番ビルドが合格

別PCへ移す場合、この文書より新しいローカルコミットがGitHubへpush済みかを管理者へ確認してください。未pushならremoteの同名ブランチだけでは現在状態を再現できません。許可なくpush、公開、PRのReady化、`main`統合を行いません。

既存の未コミット変更を見つけた場合は利用者の作業として保持します。`reset --hard`、一括削除、別ブランチでの上書きは行いません。

## 3. 継続目標と禁止事項

目標:

> `BETA_ROADMAP.md` と `BETA_GATE_AUDIT.md` に従い、公開やmain統合を行わず、ローカルで進められる高優先度課題を調査・実装・実ブラウザ検証・監査記録・自動テストまで自律的に進める。解剖学的判断が必要な課題は、対象・方向・根拠・判定形式を揃えて専門家へ渡す。

禁止事項:

- 模式形状、位置照合ラベル、画像誘導ラベルを専門家確認なしに「検証済み」へ昇格しない。
- 講義資料、教科書、標本写真、Web図版を、許諾なくアプリ、リポジトリ、Issue、レビューJSONへ転載しない。
- BigBrain由来物を含む完全版のCC BY-NC-SA 4.0非営利・継承条件を外さない。
- テストfixtureやCodexの目視を、神経解剖学専門家の判定として数えない。
- 実機相当幅のエミュレーションを、実スマートフォンのCPU・GPU・入力・回線・メモリ証拠として扱わない。
- ローカルプレビューの成功を、公開URLの成功として扱わない。

## 4. 完了済みの主要作業

### M1 実ブラウザ回帰・性能・表示安定性

- 全23経路をPC／390 px相当で巡回し、直接URL、再読み込み、主要操作、横はみ出し、Canvas、読込エラーを確認。
- 大容量アセットを必要時読込へ変更し、左右高密度脳表を内容不変のgzip配信にして公開物を70.6 MiBへ削減。経路別予算を `npm run audit:assets` で固定。
- 読込進捗、失敗時再試行、離脱時の画像・メッシュ参照解放、再訪復帰を実装。
- 操作ガイド、キーボードフォーカス、断面送り戻し、クイズから正確な復習画面へ戻る導線を追加。
- Web版をPWA化。アプリシェルと閲覧済み教材を自動キャッシュし、脳表18.6 MiB／断面39.3 MiB／局所標本18.8 MiBを選択保存できる管理画面を追加。Windows Chromiumで局所標本56ファイル保存後、通信遮断下の後脳3D再読込に合格。セット別内容ハッシュ、保存完了状態、接続・Storage Persistence・インストール状態、新旧Service Worker間のカタログ更新、共有教材を壊さない削除を実キャッシュで回帰済み。
- 資源別実サイズとキャッシュ状態から未保存量を算出し、推定空き容量不足時は保存前に停止して必要量・安全余裕・空き容量を案内。共有資源の重複計上と旧版更新の過大見積りを避け、容量超過エラーを通信エラーから分離した。実容量不足は実機待ち。

### 解剖学的整合性の機械監査

- `audit:sections`: 35断面ラベルの3方向空断面、6近傍成分、最大成分比。17ラベルは目視優先対象。
- `audit:deep`: 深部構造18方向関係。
- `audit:provenance`: 13試作ID、9画面構造、7局所標本部品の由来・保護条件。
- `audit:landmarks`: 小脳脚、菱形窩、錐体、オリーブ、丘・膝状体等の12関係。
- `audit:basal`: 脳底、脳神経I–XII、主要動脈の14関係。
- `audit:surface`: 8溝・裂とCerebrA領域境界の17関係。

これらは大きな方向関係とデータ整合の回帰であり、形状・境界・分枝・径・個体差の専門家承認ではありません。

### UI・スマートフォン方針

- 狭幅PCは省スペースPC配置、狭幅かつ `hover: none`・`pointer: coarse` のタッチ主体端末は専用スマートフォンUIへ分離。
- スマートフォンUIは6ワークスペース下部ドック、画面別設定シート、安全域、フォーカス循環・復帰、背景スクロール停止を実装。
- PCの分割表示やブラウザズームだけで電話UIへ切り替わらない。
- 実スマートフォンは未確認。PWA方針は実装済みで、iOS / Androidのホーム画面追加、キャッシュ退避、容量不足時は実機待ち。端末固有APIが必要になるまではネイティブアプリを別保守しない。

### 標本・比較・共同編集

- 内側側頭葉から根拠不足の旧海馬采・鉤近似を除外し、組織欠損を再生成。
- 後脳の標本再構成中心／模式中心を `/?m2=compare#workspace/blocks/hindbrain` で比較。PCは2 Canvas、狭幅はA/B式1 Canvas。β基盤は標本再構成、模式形状は補助という暫定判断。
- 水平断差分JSON、版固定、競合監査、三方向照合、レビュー状態、PR上の採否追跡を実装。
- Form、Issue、PRの用途を分離。公開Formは未ログインで送信直前まで確認し、実送信と二重削除は管理者待ち。

### 専門家レビュー待ち化

- A1〜D5の19対象を `app/expert-review-targets.json` へ正規化。
- `/?review=<ID>&commit=<SHA>#workspace/...` で固定画面と判定票を同時表示。
- 記名、所属、専門領域、Git SHA、判定、理由、根拠URL、画面条件をローカルJSONへ書き出す。自動保存・送信なし。
- `npm run audit:expert-review` で対象台帳、`npm run validate:expert-review -- <record.json>` で記録を検証。
- Windows Chromium 970 × 545 pxで入力制御、JSON出力、A1→A2移動、コミット維持、折りたたみを確認。加えてviewport override 390 × 844（右ペイン内の実効CSS viewport 295 × 639）でA1・A2を操作し、横はみ出し0、Canvas 1、「観察へ／レビュー票へ戻る」、未書き出し入力の画面内保護、JSON出力、前後移動を確認。

## 5. 現在のGo / No-Go

| # | 条件 | 状態 | 次に必要な証拠 |
| ---: | --- | --- | --- |
| 1 | 必修構造の確度表示 | ローカル合格 | 専門家判定後の昇格・修正 |
| 2 | 欠落・二重表示・遊離・空着色なし | 専門家待ち | 19固定画面を含む必修範囲の記名判定 |
| 3 | PC・スマートフォン中心操作 | 実機待ち | 実スマートフォン1台以上で完走 |
| 4 | 配信量・速度・メモリ | 実機待ち | 公開回線と実機ピークメモリ |
| 5 | テスト・ビルド・公開URL | 公開待ち | β候補反映後の公開全経路巡回 |
| 6 | クイズの可視性・未確認構造の隔離 | ローカル合格 | 試作問題を昇格する場合の専門家判定 |
| 7 | 権利・免責・プライバシー・ソース | ローカル合格 | 公開反映後の最終一致確認 |
| 8 | Form・Issue・PR導線 | 管理者待ち | テスト回答1件の送信とForms／回答表からの二重削除 |
| 9 | 神経解剖学専門家レビュー | 専門家待ち | 少なくとも1名の検証済み記名JSONと台帳反映 |
| 10 | 未完成項目の公開 | 公開待ち | β候補公開URLで既知の制限を確認 |

詳細と証拠は `BETA_GATE_AUDIT.md` が正本です。`npm run audit:beta` は10のローカル監査とこの状態区分を再検証しますが、外部証拠待ちを完了へ変更しません。

## 6. 次に進める順序

1. 実スマートフォンでトップ、脳表、断面、局所標本、クイズ、編集ツール、専門家票を完走し、CPU／GPU、タッチ、OS文字サイズ、安全域、回線、ピークメモリを記録する。
2. 神経解剖学の確認者へ `EXPERT_REVIEW_CHECKLIST.md` と固定URLを渡し、検証済みJSONを最低1件受領する。Codexは判定内容を代筆しない。
3. 管理者が公開Formへ個人情報を含まないテスト回答を1件送り、Formsと回答スプレッドシート双方から削除する。
4. 管理者が `CONTRIBUTING.md` の「公開前ドラフト」を正式版へするか判断する。
5. 明示的な許可後にだけbeta branchをpushし、公開URLとGitHub Actionsを巡回する。公開・`main`統合は別判断。
6. 専門家・学習者のM2比較記録から、次の比較課題または採用基盤を決定する。

外部証拠を待つ間にローカル変更を追加する場合は、上記ゲートを直接前進させるものに限り、見た目だけの模式形状追加や未検証範囲の拡大を避けます。

## 7. 実画面の基準経路

- トップ: `#workspace/home`
- 脳表: `lateral`、`superior`、`inferior`、`medial`、`arteries`、`nerves`、`free`
- 断面: `coronal`、`horizontal`、`sagittal`
- 局所標本: `lateral-ventricle`、`diencephalon`、`radiations`、`commissural-system`、`choroid-plexus`、`medial-temporal`、`midbrain-section`、`hindbrain`
- 復習クイズ: `#workspace/quiz`
- 編集ツール: `#workspace/segment`
- 操作ガイド・オフライン教材・意見・利用条件: `#workspace/help`、`#workspace/offline`、`#workspace/feedback`、`#workspace/legal`
- M2比較: `/?m2=compare#workspace/blocks/hindbrain`
- 専門家票例: `/?review=A1&commit=<SHA>#workspace/surface/lateral`

各経路で、直接URL、再読み込み、アプリ内遷移、Canvas数、読込表示、横はみ出し、回転、ズーム、選択、全解除、着脱、スライダー、キーボードフォーカスを対象に応じて確認します。

## 8. 最初に読む文書

1. `BETA_ROADMAP.md`: 優先順位と完了条件
2. `BETA_GATE_AUDIT.md`: Go / No-Goの正本
3. `KNOWN_LIMITATIONS.md`: 公開時に残す制限
4. `STRUCTURE_PROVENANCE.md`: 由来・確度・監修台帳
5. `EXPERT_REVIEW_CHECKLIST.md` と `EXPERT_REVIEW_AUDIT.md`: 専門家レビュー
6. `PERFORMANCE_AUDIT.md` と `MOBILE_UI_AUDIT.md`: 性能・実機待ち
7. `MODEL_COMPARISON_AUDIT.md`: M2比較
8. `SEGMENTATION_WORKFLOW.md`: 差分作成・監査・採否
9. `DATA_AND_LICENSES.md`: 出典・改変・ライセンス
10. `CONTRIBUTING.md` と `GOVERNANCE.md`: 共同制作と意思決定

## 9. 報告形式

各作業単位では次を記録します。

- 修正した問題と利用者への効果
- 変更ファイルとコミット
- `npm run audit:beta`、`npm test`、`npm run build` の結果
- 実ブラウザのURL、OS、ブラウザ、CSS viewport、操作、Canvas、エラー、横はみ出し
- 公開・専門家・管理者・実機で残る証拠

公開URLやGitHub Actionsを確認していない場合は、その旨を明記します。作業がローカルで完了しても、7つの外部証拠待ちが残る間はNo-Goを維持します。
# 2026-08-15 追記: 実機診断

- オフライン教材画面から `#workspace/device-check` を開けます。
- 実スマートフォンで診断を実行し、指タッチ確認後にJSONを書き出してください。詳細は `DEVICE_CHECK_AUDIT.md` です。
- Windowsのマウスではタッチ確認済みにならないのが正常です。
- 診断画面だけではGate 3・4を合格にしません。公開候補HTTPS URL、実スマートフォン一周、PWA単独起動・機内モード復帰、公開回線・ピークメモリの証拠が必要です。
- schema v2では主要7項目の完走と問題メモも保存します。受領後は `npm run validate:device-check -- <record.json>` を実行し、欠落を確認してください。検証成功はGate承認ではありません。
