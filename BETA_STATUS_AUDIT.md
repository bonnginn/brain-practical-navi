# β候補 更新履歴・既知の制限監査

更新日: 2026-08-23

## 掲載範囲

`app/beta-status.json`を、アプリ内の「更新履歴・既知の制限」画面の単一データ源とする。`#workspace/status`への直接アクセスと再読み込みで同じ画面を復元できる候補実装を用意する。状態は「公開α／β候補・公開判断前」であり、公開済みβ版、大学公式教材、専門家による最終確認済み資料を意味しない。

掲載する制限は、専門家レビュー未完了、視覚路ID36–38の未分節と旧ID33の正答対象外、乳頭体ID39・40のプロジェクト内レビュー済み・専門家レビュー未完了・付着境界継続確認、模式表示（ブロック、神経血管、脳溝など）、未収録項目（海馬采・鉤、XI脊髄根、閂・薄束・楔状束詳細、静脈系など）、ローカル検証範囲である。

## 2026-08-23 台帳同期理由

`public/atlas/structure-provenance.json` の現行registryが56件から75件へ増えたため、現行の由来監査説明を `app/beta-status.json` の `change-provenance-audit` と同期した。増分はsurface／block app-only 18行とoptic nerve `cn2`行1件の計19件で、ID33と`cn2`／`opticChiasm`の名前空間分離を維持し、ID39・40のプロジェクト内レビュー済み・expert pending状態も維持する。

同日の機械結果は、expert pending 75件、表示面フィルタ54／16／30／21件、学習者向けmapping 222/222件解決済みである。構造由来監査のクイズ正答対象は既存23件と模式3D pilot 17件の合計40件なので、status本文も40件へ同期する。この同期自体は解剖学的妥当性の検証や実ブラウザ確認ではなく、最終ローカル確認は下記に別記する。2026-08-22に確認した全56件・表示面36／16／29／21件・route156/156の歴史記録と、公開URL未確認の記述は変更しない。

Go / No-Go 12項目の現行状態とcriterionTextの突合は [BETA_GO_NO_GO.json](BETA_GO_NO_GO.json) と [BETA_GO_NO_GO_AUDIT.md](BETA_GO_NO_GO_AUDIT.md) を基準にする。sourceCountsは provenance／expert pending 75件、unique quiz targets 40件（標準23件＋模式3D pilot 17件）、learner mapping 222/222件であり、statusのローカル確認を公開・専門家確認・デプロイ完了とは扱わない。

## 2026-08-23 最終ローカル実ブラウザ確認

Chrome 151のin-app browserでローカルproduction preview `http://127.0.0.1:4201`を確認し、review panel 75/75、filter surface54／sections16／blocks30／quiz21／all75を表示した。app-onlyカードの日本語見出し（縁上回、II 視神経・視索）、自由観察の縁上回「試作」＋CerebrA詳細、`cn2`／`opticChiasm`の「模式」、block choroid plexusの「模式」＋未保証説明を確認した。route auditは `work/browser-audit/beta-route-audit-learner-provenance-final-2026-08-23.json` に保存し、26経路×3幅×direct/reload＝156/156、`allPassed: true`。390 px設定の`clientWidth`は375 pxで、overflow／error／loader／WebGL fallbackはなかった。

これはstatus・来歴表示・導線のローカル確認であり、解剖学的妥当性の検証ではない。公開URL、物理端末、別GPU、別ブラウザ、専門家レビューは未確認で、expert pending 75件は維持する。2026-08-22の全56件・表示面36／16／29／21件・route156/156の歴史記録は変更しない。

## 最新性能証拠の境界

2026-08-23のpial-gzip成果物は、route `156/156`（`work/browser-audit/beta-route-audit-pial-gzip-2026-08-23.json`）、初回payload `26/26`（`work/performance/initial-route-payload-audit-pial-gzip-2026-08-23.json`）、性能suite `37/37`（`work/performance/performance-suite-pial-gzip-2026-08-23.json`）である。いずれもローカル確認の証拠であり、公開URL、公開回線、物理端末、別GPU／別ブラウザでの検証や、専門家確認を意味しない。

## 根拠と更新方法

- 各項目の`evidenceRefs`は、リポジトリ内の監査文書、アプリ実装、または機械可読な由来索引を参照する。
- `scripts/audit_beta_status.mjs`は、項目IDの一意性、日付、本文・根拠、根拠ファイルの存在、禁止表現、旧ID33・ID39/40・未収録項目の由来キーを確認する。
- 由来や解剖学的確度を変更するときは、先に対応する監査文書と`public/atlas/structure-provenance.json`を更新し、専門家未確認の内容を検証済みと表現しない。
- 実ブラウザ確認後も、確認していない端末・公開URL・GPU・物理タッチの結果を推測で記録しない。

## 公開前チェック

- [x] 利用条件の記述とstatus JSONの掲載範囲を同期した。
- [x] `#workspace/status`のdirect/reloadを、Windows Chrome 151（`http://127.0.0.1:4190`）で26経路×3幅×direct/reload＝156/156件として確認した。
- [x] Homeと利用条件のstatus入口、Esc、背景クリック、focus trap、起点復帰を、overlay切替focus修正後の実ブラウザで確認した。
- [x] 390px幅（実効clientWidth 375px）でカードが一列になり、ダイアログ内部だけがスクロールし、横はみ出しがないことをChrome CDPで確認した。
- [ ] 公開URLでの反映を確認した。
- [x] 物理タッチ端末・別GPU・別ブラウザ・公開URLが未確認であることを明記した。

## 実ブラウザ結果

2026-08-22、Windows Chrome 151、`http://127.0.0.1:4190`でstatusを含む26経路×3幅×direct/reloadを実施し、156/156件が合格した。missing/duplicate/fail=0、console/request/UI error、loader、overflow、WebGL fallbackも0件だった。修正後のアプリ内ブラウザではHomeと利用条件の両入口、初期focus、Shift+Tab／Tab循環、Esc、起点復帰を実操作し、Chrome CDPでは390px幅の一列表示、内部スクロール、背景クリックによる閉鎖、横はみ出しなしを確認した。公開URL、物理タッチ端末、別GPU・別ブラウザは未確認のまま保持する。

保存した機械監査結果: `work/browser-audit/beta-route-audit-status-2026-08-22.json`。

## 実装検証

- 全自動テスト: 2026-08-23の現行作業ツリーで205/205成功（Go / No-Go台帳の異常系を含む）。
- TypeScript型検査: 成功。
- 通常本番ビルド: 成功。
- GitHub Pages向けビルド: 成功。
- 上記の結果はローカル作業ツリーでの検証記録であり、公開URLの反映確認ではない。
