# β版 Go / No-Go 台帳監査

更新日: 2026-08-28

この文書は、`BETA_GO_NO_GO.json` と `BETA_ROADMAP.md` の12項目を機械的に突合するための監査索引です。`proven-local` はローカル確認の範囲だけを示し、公開版・全体品質・専門家確認の合格を意味しません。専門家、管理者、デプロイが必要なゲートは未通過のまま記録します。

## 2026-08-24 アプリ内公開前チェック

`#workspace/status` に12基準の読み取り専用projectionを追加した。5状態と件数は3／1／4／1／3のままで、今回の表示追加によるstate変更はない。criterion 08には専門家確認待ち4件の引継ぎ表示、criterion 12には未確認範囲と次操作の表示をローカル根拠として追記したが、criterion 12は公開URL未反映のため `deployment-blocked` を維持する。配布projectionと独立監査の境界は [BETA_READINESS_DISPLAY_AUDIT.md](BETA_READINESS_DISPLAY_AUDIT.md) に記録する。

同日、criterion 08の引き継ぎ準備へ1項目単位の構造化された端末内下書きを追加した。現在台帳と対象entryのSHA-256、固定3観察項目、固定懸念コード、未提出・未採用・expert未主張を検査し、台帳不一致、JSON不正、保存障害、別タブ競合ではロックする。Chrome 151相当のローカル通常buildで連続変更、再読込復元、JSON書き出し表示、390 px相当を確認した。criterion 08は引き継ぎ準備の `proven-local` を維持するが、criterion 11の専門家レビュー記録は未取得で `expert-blocked` のままである。詳細は [ANATOMY_REVIEW_RECORD_DRAFT_AUDIT.md](ANATOMY_REVIEW_RECORD_DRAFT_AUDIT.md)。

## 現在の分類

| 状態 | 項目 | 解釈 |
| --- | --- | --- |
| `proven-local` | 03, 05, 08 | 対応するローカル基準を満たす根拠を確認。公開・外部・専門家の範囲は未確認。 |
| `partial-local` | 04 | ローカル根拠はあるが、物理端末で未完了。 |
| `expert-blocked` | 01, 02, 07, 11 | 神経解剖学の専門家による確認・採否・レビュー記録が必要。 |
| `administrator-blocked` | 10 | 外部フィードバック導線の運用確認を管理者が行う必要がある。 |
| `deployment-blocked` | 06, 09, 12 | 公開ホストへの反映、公開URL巡回、公開版表示の確認が必要。 |

criterion 10は、2026-08-24にログアウト状態の実ブラウザで現行Google Formと公開GitHub Issuesへの到達を再確認した。Googleへのログインは回答保存の任意導線で、匿名分岐は表示された。一方、外部フォームは「α版」表記のままである。生成スクリプトは版名非依存の「教育用試作教材」表記へ更新したが、既存フォームへの適用、全3ページ、テスト回答、Google Formsと回答シート双方からの削除は管理者操作が必要なため、`administrator-blocked` を維持する。外部回答は作成していない。更新後のPages buildをローカルpreview `http://127.0.0.1:4328/brain-practical-navi/#workspace/status` で直接開き、「フィードバック運用」に同じ確認範囲・未確認範囲・次操作が表示され、console error／warning 0件であることも確認した。

## 現行ソースからの集計

監査スクリプトは台帳本文や説明文の数値を信用せず、次のソースを読み取って集計します。

- `public/atlas/structure-provenance.json`: `entryCount = 75`, `expertPendingCount = 75`
- `app/page.tsx`: 既存23問と模式3D pilot 22問の一意な `quizTargetCount = 45`
- `src/learnerProvenance.mjs` と同台帳監査: `mappingCount = 222`, `resolvedMappingCount = 222`

現行のローカル表示・初回payload証拠は、2026-08-24の`cn2`名称同定pilot追加後の成果物（route `162/162`: `work/browser-audit/beta-route-audit-cn2-quiz-2026-08-24.json`、初回payload `27/27`: `work/performance/initial-route-payload-cn2-quiz-2026-08-24.json`）を参照します。性能suiteは2026-08-23のpial-gzip成果物 `37/37`（`work/performance/performance-suite-pial-gzip-2026-08-23.json`）を維持します。これらは公開URL・デプロイ・専門家確認の証拠ではありません。旧26経路156/156件と2026-08-22の56件・filter36／16／29／21件は、各文書に残す歴史記録です。

criterion 03の中心操作証拠は、`work/browser-audit/core-interactions-pc-tablet-2026-08-23.json` の脳表・水平断・自由観察・クイズ×PC 1366×768／横向きタブレット幅1024×768＝8/8件・40操作です。独立validatorが実測viewport、操作前後、5問queue、回答対象から導出した復習先、error／loader／overflow／fallbackを再計算しています。両条件は `mobile:false`・`touch:false` のローカルデスクトップエミュレーションであり、公開URL、物理端末、実機タッチの証拠ではありません。

criterion 04の現在の中心操作証拠は、`work/browser-audit/phone-core-interactions-v18-focus4-guided-2026-08-24.json`（local-only）です。Windows Chrome 151の390×768、DPR1、`mobile:true`・`touch:true`・coarse pointerで、dock／surface-lateral／sections-horizontal／quiz／β重点4 block guideの5 journeyをCDP `Input.dispatchTouchEvent`で実行しました。block guideでは4標本、合計17 single-layer段階、4 final all、段階番号、終了後の手動layer復元を含め、44 px以上・画面内・hit-test可能な操作対象、意味キーと状態連続性、loader／UI・console・request error／横overflow／WebGL fallback 0件を独立validatorで確認しています。旧mobile route記録は履歴として残しますが、監査は `PHONE_CORE_INTERACTION_AUDIT.md`、`BLOCK_GUIDED_OBSERVATION_AUDIT.md`、`scripts/audit_phone_core_interactions.mjs`、`tests/phone-core-interaction-audit.test.mjs` と、このv18 artifactの併記をcriterion 04の必須条件とします。物理スマートフォン、実機タッチ、Safari・別ブラウザ・別GPU、公開URLは未確認です。

criterion 02へは、`work/anatomy-review/orthogonal-review-bundle-v3/manifest.json`（local-only）と、それが参照する161枚のPNGを直交断の客観資料として同期しています。ID33・39・40の全占有X/Y/Z断面、ID39・40の外側endpoint、raw grayscale+outline、manifest schema・入力／画素／PNG hash・pixel-to-voxel geometry・Fortran anchorのstrict validator再計算を記録します。manifestの `review.status` は `unreviewed` であり、この資料は解剖学的妥当性、境界、採用、専門家確認、ground truthを証明しません。必須の追跡可能な根拠は `ORTHOGONAL_REVIEW_BUNDLE_AUDIT.md`、`scripts/build_orthogonal_review_bundle.py`、`tests/orthogonal-review-bundle.test.mjs` です。ignoredなbundleの存在はCIで要求しません。

## 検査内容

`node scripts/audit_beta_go_no_go.mjs` は、次を確認します。

- ロードマップの Go / No-Go セクションとの完全一致、12件の安定ID・本文・項目別状態の固定契約
- 5状態と `locallyProven` のローカル主張配列、`blockingAuthority`、未確認範囲の整合
- `locallyProven` の非空文字列・重複なし、`committedEvidenceRefs` の存在・追跡対象・非 `work/`
- 更新日のISO形式、任意の `localArtifactRefs` の重複なし・`work/`・`localOnly: true`・`label: local-only`
- criterion 04のphone v18必須refs（phone／block監査文書・runner・focused test）と、`work/browser-audit/phone-core-interactions-v18-focus4-guided-2026-08-24.json` のexact local-only path。旧mobile route refsだけへの退行を拒否
- criterion 02のorthogonal review bundle v3必須refs（監査文書・生成／strict validator・focused test）と、`work/anatomy-review/orthogonal-review-bundle-v3/manifest.json` のexact local-only path。旧objective auditだけ、欠落、v2等の誤ったbundle pathへの退行を拒否
- criterion 02の `review.status=unreviewed`、解剖学的妥当性・境界・採用が未証明であることを確認し、`reviewed`／`verified`／`検証済み`／`専門家確認済み` 等の過剰主張だけを拒否する（`未確認` 等の否定記録は拒否しない）
- criterionTextを含め、公開・専門家・全体・β readyをローカル根拠から主張していないこと
- 上記5つのソース集計値と台帳値の一致

`localArtifactRefs` は補助的なローカル記録であり、存在しなくても監査は成立します。CIで ignored な `work/` 成果物を要求しません。学習者向けUIの追加は行っていません。
