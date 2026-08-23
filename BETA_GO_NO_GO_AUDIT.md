# β版 Go / No-Go 台帳監査

更新日: 2026-08-23

この文書は、`BETA_GO_NO_GO.json` と `BETA_ROADMAP.md` の12項目を機械的に突合するための監査索引です。`proven-local` はローカル確認の範囲だけを示し、公開版・全体品質・専門家確認の合格を意味しません。専門家、管理者、デプロイが必要なゲートは未通過のまま記録します。

## 現在の分類

| 状態 | 項目 | 解釈 |
| --- | --- | --- |
| `proven-local` | 03, 05, 08 | 対応するローカル基準を満たす根拠を確認。公開・外部・専門家の範囲は未確認。 |
| `partial-local` | 04 | ローカル根拠はあるが、物理端末で未完了。 |
| `expert-blocked` | 01, 02, 07, 11 | 神経解剖学の専門家による確認・採否・レビュー記録が必要。 |
| `administrator-blocked` | 10 | 外部フィードバック導線の運用確認を管理者が行う必要がある。 |
| `deployment-blocked` | 06, 09, 12 | 公開ホストへの反映、公開URL巡回、公開版表示の確認が必要。 |

## 現行ソースからの集計

監査スクリプトは台帳本文や説明文の数値を信用せず、次のソースを読み取って集計します。

- `public/atlas/structure-provenance.json`: `entryCount = 75`, `expertPendingCount = 75`
- `app/page.tsx`: 既存23問と模式3D pilot 17問の一意な `quizTargetCount = 40`
- `src/learnerProvenance.mjs` と同台帳監査: `mappingCount = 222`, `resolvedMappingCount = 222`

現行のローカル性能証拠は、2026-08-23のpial-gzip成果物（route `156/156`: `work/browser-audit/beta-route-audit-pial-gzip-2026-08-23.json`、初回payload `26/26`: `work/performance/initial-route-payload-audit-pial-gzip-2026-08-23.json`、性能suite `37/37`: `work/performance/performance-suite-pial-gzip-2026-08-23.json`）を参照します。これらは公開URL・デプロイ・専門家確認の証拠ではありません。2026-08-22の56件・filter36／16／29／21件・route156/156は、各文書に残す歴史記録です。

criterion 03の中心操作証拠は、`work/browser-audit/core-interactions-pc-tablet-2026-08-23.json` の脳表・水平断・自由観察・クイズ×PC 1366×768／横向きタブレット幅1024×768＝8/8件・40操作です。独立validatorが実測viewport、操作前後、5問queue、回答対象から導出した復習先、error／loader／overflow／fallbackを再計算しています。両条件は `mobile:false`・`touch:false` のローカルデスクトップエミュレーションであり、公開URL、物理端末、実機タッチの証拠ではありません。

criterion 04の現在の中心操作証拠は、`work/browser-audit/phone-core-interactions-v16-2026-08-23.json`（local-only）です。Windows Chrome 151の390×768、DPR1、`mobile:true`・`touch:true`・coarse pointerで、dock／surface-lateral／sections-horizontal／quizの4 journeyをCDP `Input.dispatchTouchEvent`で実行し、44 px以上・画面内・hit-test可能な操作対象、意味キーと状態連続性、loader／UI・console・request error／横overflow／WebGL fallback 0件を独立validatorで確認しています。旧mobile route記録は履歴として残しますが、監査は `PHONE_CORE_INTERACTION_AUDIT.md`、`scripts/audit_phone_core_interactions.mjs`、`tests/phone-core-interaction-audit.test.mjs` と、このv16 artifactの併記をcriterion 04の必須条件とします。物理スマートフォン、実機タッチ、Safari・別ブラウザ・別GPU、公開URLは未確認です。

## 検査内容

`node scripts/audit_beta_go_no_go.mjs` は、次を確認します。

- ロードマップの Go / No-Go セクションとの完全一致、12件の安定ID・本文・項目別状態の固定契約
- 5状態と `locallyProven` のローカル主張配列、`blockingAuthority`、未確認範囲の整合
- `locallyProven` の非空文字列・重複なし、`committedEvidenceRefs` の存在・追跡対象・非 `work/`
- 更新日のISO形式、任意の `localArtifactRefs` の重複なし・`work/`・`localOnly: true`・`label: local-only`
- criterion 04のphone v16必須refs（監査文書・runner・focused test）と、`work/browser-audit/phone-core-interactions-v16-2026-08-23.json` のexact local-only path。旧mobile route refsだけへの退行を拒否
- criterionTextを含め、公開・専門家・全体・β readyをローカル根拠から主張していないこと
- 上記5つのソース集計値と台帳値の一致

`localArtifactRefs` は補助的なローカル記録であり、存在しなくても監査は成立します。CIで ignored な `work/` 成果物を要求しません。学習者向けUIの追加は行っていません。
