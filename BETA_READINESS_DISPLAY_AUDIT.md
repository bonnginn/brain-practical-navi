# β公開前チェック表示監査

更新日: 2026-08-24

## 目的と状態境界

`#workspace/status` の冒頭へ、`BETA_GO_NO_GO.json` の12基準を読み取り専用で示す「公開前チェック」を追加した。状態は台帳の5種類を変更せず、ローカル証拠あり3、ローカル部分確認1、専門家確認待ち4、管理者確認待ち1、公開反映待ち3として表示する。

件数は総合得点、合格率、β ready、公開可、専門家確認済みへ変換しない。今回の表示追加によって12基準のstateは変更していない。専門家、管理者、デプロイ担当者の判断も代行しない。

## 配布データ境界

ブラウザは台帳原本を直接bundleしない。`scripts/generate_beta_go_no_go_display.mjs` が台帳から固定見出し、state、`locallyProven`、`unprovenScope`、`nextAction`だけを決定論的に生成し、`app/beta-go-no-go-display.json` を配布用projectionとする。

`scripts/audit_beta_go_no_go_projection.mjs` は、固定12 ID、5状態順、件数3／1／4／1／3、各表示内容と台帳原本の完全一致、グループの重複・欠落、UI契約を独立再計算する。`criterionText`、`committedEvidenceRefs`、`localArtifactRefs`、`work/`パスはprojectionへ含めない。本番bundleもこれら4文字列を含まないことを確認した。

## UI

- 5状態の件数を表示し、12項目を状態別にまとめる。
- 各項目の詳細に、ローカルで確認したこと、未確認の範囲、次の操作を表示する。
- 既存の既知の制限、更新履歴、根拠参照は維持する。
- 詳細summaryは45 px以上、760 px以下では一列、長文はdialog内と公開前チェック内でスクロールする。
- direct／reload可能な `#workspace/status`、Esc、背景click、focus循環、起点focus復帰を維持する。

## ローカル実ブラウザ確認

Chrome 151の通常production previewで、direct表示の5 group・12 item、件数3／1／4／1／3、詳細3 field、内部scroll、loader／UI error／横overflow 0、配布画面の`work/`文字列0を確認した。Homeの「更新履歴・既知の制限」から開き、Escと背景clickの双方で閉じ、同じ起点buttonへfocusが戻った。Tab 36回後もfocusはdialog内だった。最終buildは `http://127.0.0.1:4324/` で再確認し、summaryの実効高さは44.99 pxだった。

390×768のviewport overrideでは実効 `innerWidth` 295、`clientWidth` 284で、一列表示、5 group・12 item、内部scroll、loader／UI error／横overflow 0を確認した。これはローカルin-app browserの表示・操作証拠で、物理端末、公開URL、別ブラウザ、専門家レビューの証拠ではない。

同じ最終buildでcanonical 27経路×3幅×direct／reload＝162/162件、cold初回payload 27/27件に合格した。全自動テスト347/347、TypeScript型検査、通常／Pages本番build、`git diff --check`も成功した。機械結果は `work/browser-audit/beta-route-audit-readiness-display-2026-08-24.json` と `work/performance/initial-route-payload-readiness-display-2026-08-24.json` に保存した。これらはローカル作業用で配布しない。

## 未完了

- 公開URLへの反映と公開環境でのdirect／reload
- 物理スマートフォン・実機タッチ・Safari等の別ブラウザ
- 専門家4件、管理者1件、公開反映3件の実判断・作業

したがって、特にcriterion 12は `deployment-blocked` のまま維持する。
