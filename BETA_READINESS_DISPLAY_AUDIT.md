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

## 2026-08-24 現行snapshot境界の固定

`BETA_CURRENT_SNAPSHOT.json` と `scripts/audit_current_beta_snapshot.mjs` を、PWAと外部確認境界の機械可読な現在値として同期した。PWAのnormal baseはID `normal`・`/`、Pages baseはID `pages`・`/brain-practical-navi/`（いずれもexpected pathnameはbase path）で、actionは次の順に固定する: `online-shell`、`online-home`、`online-visited-data`、`offline-targets`、`offline-visited-direct`、`offline-visited-reload`、`offline-navigation-fallback`、`offline-unvisited-error`、`online-restore`、`retry-unvisited`。hostは `127.0.0.1` である。

このPWA証拠は、監査runnerが所有するloopback静的serverを停止し、`ECONNREFUSED`を確認し、同じhost／portへ再listenする境界に限られる。network policyは `serverControlled: true`、`pageNavigatorState: "observed-only"`、`offlineBadgeRequired: false`、`ordinaryHttpCache: "clear-and-disable"`、`cacheStoragePreserved: true`、`networkEmulation: false`、`serviceWorkerInterception: false`。snapshotの`pwa.blockerCount`は0だが、`reportedEvidence.status`は `documented-not-recomputed` のままであり、実測成果物を自動再計算済みとは表現しない。

同snapshotの構造化`unverifiedBoundaries`は、全6件を`status: "unverified"`として記録する。専門家レビュー、公開URL／deployment、物理端末、管理者運用、物理／OSネットワーク断、インストール済みPWA・ホーム画面起動を対象とし、expert／administrator／deploymentのstate・blockingAuthority・unprovenScopeは該当する現行Go／No-Go台帳criterion 11／10／12から導出し、物理・PWAの境界は現行PWA監査節と引き継ぎsection 9から確認する。これらは公開URL、物理端末、実インストール、専門家レビュー、管理者確認の完了を意味しない。

criterion 10の追加preflight証拠は `BETA_GO_NO_GO.json` へ既に反映済みだったが、配布projectionが同期していなかったため、`app/beta-go-no-go-display.json` を台帳から再生成した。配布projectionを直接読み込む回帰テストも追加し、同様のprojection driftを監査で検出できるようにした。Go／No-Goのstateと件数は従来どおり `proven-local: 3`、`partial-local: 1`、`expert-blocked: 4`、`administrator-blocked: 1`、`deployment-blocked: 3`で、criterion 12は`deployment-blocked`のまま維持する。

この更新後、通常production preview `http://127.0.0.1:4346/#workspace/status` を親環境で確認した。PC相当表示は実効 `970×545`、documentのclient／scrollは`970/970`。requested `390×768`のin-app表示は実効inner `295×582`、document `284/284`、overlay `267/267`、feedback article `203/203`で、根拠表示は画面内にあり、loader／UI errorは0件だった。Pages buildは成功したが、Pagesのliveブラウザ表示は確認していない。

## 未完了

- 公開URLへの反映と公開環境でのdirect／reload
- 物理スマートフォン・実機タッチ・Safari等の別ブラウザ
- 専門家4件、管理者1件、公開反映3件の実判断・作業

したがって、特にcriterion 12は `deployment-blocked` のまま維持する。
