# β候補 更新履歴・既知の制限監査

更新日: 2026-08-24

## 掲載範囲

`app/beta-status.json`を、アプリ内の「更新履歴・既知の制限」画面の単一データ源とする。`#workspace/status`への直接アクセスと再読み込みで同じ画面を復元できる候補実装を用意する。状態は「公開α／β候補・公開判断前」であり、公開済みβ版、大学公式教材、専門家による最終確認済み資料を意味しない。

2026-08-24、同じstatus dialogの冒頭へ `BETA_GO_NO_GO.json` 由来の「公開前チェック」を追加した。更新履歴・既知の制限は引き続き `app/beta-status.json`、12基準の状態は `BETA_GO_NO_GO.json` をそれぞれ唯一の原本とし、状態をstatus JSONへ複製しない。配布用projectionは原本と完全一致を独立監査し、local-only証拠パスを含めない。詳細は [BETA_READINESS_DISPLAY_AUDIT.md](BETA_READINESS_DISPLAY_AUDIT.md)。

掲載する制限は、専門家レビュー未完了、視覚路ID36–38の未分節と旧ID33の正答対象外、乳頭体ID39・40のプロジェクト内レビュー済み・専門家レビュー未完了・付着境界継続確認、模式表示（ブロック、神経血管、脳溝など）、未収録項目（海馬采・鉤、XI脊髄根、閂・薄束・楔状束詳細、静脈系など）、ローカル検証範囲である。

## 2026-08-23 台帳同期理由

`public/atlas/structure-provenance.json` の現行registryが56件から75件へ増えたため、現行の由来監査説明を `app/beta-status.json` の `change-provenance-audit` と同期した。増分はsurface／block app-only 18行とoptic nerve `cn2`行1件の計19件で、ID33と`cn2`／`opticChiasm`の名前空間分離を維持し、ID39・40のプロジェクト内レビュー済み・expert pending状態も維持する。

2026-08-23、教材内8ブロック標本へ既存メッシュだけを使う位置確認表示を拡張したため、`change-block-context-all-specimens` を追加した。切り出し範囲・解剖学的境界の専門家レビュー未完了と、新しい形状・切断幅・摘出順・実習手順を追加していないことを利用者向け本文にも残す。

同日の機械結果は、expert pending 75件、表示面フィルタ54／16／30／22件、学習者向けmapping 222/222件解決済みである。構造由来監査のクイズ正答対象は既存23件と模式3D pilot 18件の合計41件なので、status本文も41件へ同期する。この同期自体は解剖学的妥当性の検証や実ブラウザ確認ではなく、最終ローカル確認は下記に別記する。2026-08-22に確認した全56件・表示面36／16／29／21件・route156/156の歴史記録と、公開URL未確認の記述は変更しない。

Go / No-Go 12項目の現行状態とcriterionTextの突合は [BETA_GO_NO_GO.json](BETA_GO_NO_GO.json) と [BETA_GO_NO_GO_AUDIT.md](BETA_GO_NO_GO_AUDIT.md) を基準にする。sourceCountsは provenance／expert pending 75件、unique quiz targets 41件（既存23件＋模式3D pilot 18件）、learner mapping 222/222件であり、statusのローカル確認を公開・専門家確認・デプロイ完了とは扱わない。

2026-08-24のbounded更新では、既存の `cn2` 模式レイヤーを名称同定pilotへ1問追加した。`cn2`はoverlay region ID23・24だけを使う合成模式レイヤーで、`opticChiasm`のquizEligibilityは`none`のまま、解剖レビュー状態・専門家pending状態・Go / No-Go状態（3／1／4／1／3）は変更していない。Chrome 151のローカルpreview `http://127.0.0.1:4325` で全41問・脳神経12問、誤答後の`cn2`観察リンク、試作OFF時0問、review filter復習22件を確認し、3幅の可視性監査も123/123件に合格した。最終build `http://127.0.0.1:4326` のcanonical routeは162/162、cold初回payloadは27/27件に合格した。

## 2026-08-23 最終ローカル実ブラウザ確認

Chrome 151のin-app browserでローカルproduction preview `http://127.0.0.1:4201`を確認し、review panel 75/75、filter surface54／sections16／blocks30／quiz21／all75を表示した。app-onlyカードの日本語見出し（縁上回、II 視神経・視索）、自由観察の縁上回「試作」＋CerebrA詳細、`cn2`／`opticChiasm`の「模式」、block choroid plexusの「模式」＋未保証説明を確認した。route auditは `work/browser-audit/beta-route-audit-learner-provenance-final-2026-08-23.json` に保存し、26経路×3幅×direct/reload＝156/156、`allPassed: true`。390 px設定の`clientWidth`は375 pxで、overflow／error／loader／WebGL fallbackはなかった。

これはstatus・来歴表示・導線のローカル確認であり、解剖学的妥当性の検証ではない。公開URL、物理端末、別GPU、別ブラウザ、専門家レビューは未確認で、expert pending 75件は維持する。2026-08-22の全56件・表示面36／16／29／21件・route156/156の歴史記録は変更しない。

## 最新性能証拠の境界

2026-08-23のpial-gzip成果物は、route `156/156`（`work/browser-audit/beta-route-audit-pial-gzip-2026-08-23.json`）、初回payload `26/26`（`work/performance/initial-route-payload-audit-pial-gzip-2026-08-23.json`）、性能suite `37/37`（`work/performance/performance-suite-pial-gzip-2026-08-23.json`）である。いずれもローカル確認の証拠であり、公開URL、公開回線、物理端末、別GPU／別ブラウザでの検証や、専門家確認を意味しない。

同日、8ブロック標本への位置コンテキスト拡張後は、基礎31件＋context ON 48件の `work/performance/performance-suite-block-context-all-specimens-2026-08-23.json` が79/79件合格した。計測用ChromeだけService Workerを迂回し、7資産の実ファイルサイズと固定上限を使う独立監査も合格しているため、`change-performance-local` を79件へ同期した。物理端末、公開URL、公開回線、別GPU／別ブラウザ、専門家レビューは未確認のままである。

同日、数値読込進捗を追加したPages想定buildでも `work/browser-audit/beta-route-audit-download-progress-2026-08-23.json` の156/156件が合格した。総量既知／不明の両表示と390 px相当の横はみ出しなしを実ブラウザで確認したが、公開URLや物理端末の保証ではない。詳細は [DOWNLOAD_PROGRESS_AUDIT.md](DOWNLOAD_PROGRESS_AUDIT.md) に分離した。

2026-08-24、M2比較専用URL `#workspace/collaborate/model-strategy` をcanonical routeへ追加したため、利用者向けローカル検証範囲と経路監査を現行27経路へ同期した。Windows Chrome 151のローカルproduction preview `http://127.0.0.1:4312` で、27経路×3幅×direct/reload＝162/162件が合格し、missing／duplicate／fail、console／request／UI error、残留loader、横overflow、WebGL fallbackは0件だった。cold初回payloadも27/27件に合格した。旧26経路156/156件は歴史記録として残す。公開URL、物理端末、別GPU／別ブラウザ、専門家レビューは未確認である。

同日、利用者向け変更履歴へ、左右側脳室・第三脳室の内部欠損33 voxelだけを採用した保守的補修と、Papez回路の由来別6段階観察を追加した。脳室項目は黒背景の一括塗り・境界自動確定・ground truthを否定し、Papez項目は乳頭体の断面限定、視床前部核未分節、視覚路ID36–38保留、新しい経路線・mesh・voxelなしを明記する。これは変更内容の公開準備であり、専門家確認や公開URLへの反映を意味しない。

同日、8ブロック標本をβ重点4／発展観察4へ分ける観察導線を追加したため、`change-block-priority-routing` を追加した。区分はロードマップ上の改善順であり、実習頻度、由来、確度、専門家レビュー、品質の順位ではない。全8標本・既存URL・機能を維持し、形状や境界を変更していないことを利用者向け本文にも残す。

2026-08-24、`CONTENT_ACCURACY_REVIEW.md` に基づく文言・分類・由来注記の反映を `change-content-accuracy-review` として更新履歴へ追加した。STN、淡蒼球、尾状核と側脳室、第三脳室、脳梁・脳弓、脳表5領域の説明を同期したが、構造ID・分節形状・座標・色・クイズ在庫は変更していない。これは参照資料に基づくプロジェクト内レビューであり、専門家確認・境界確認・Go / No-Goの完了や、所属機関による承認を意味しない。

同項目追加後の通常production preview `http://127.0.0.1:4340/#workspace/status` をCodex内蔵ブラウザで確認した。390×768指定時の実効document client／scroll widthは284／284 px、dialog client／scroll widthは267／267 px、追加カード幅は223.22 pxで横overflowはなかった。追加見出し・本文、専門家確認と境界確認の未完了、所属機関による承認を意味しない記述を表示し、loader／UI error／console warning・errorは0件、Escでdialogが閉じてHomeへ戻ることを確認した。これは表示と操作のローカル確認であり、専門家確認や公開URL反映ではない。

## 根拠と更新方法

- 各項目の`evidenceRefs`は、リポジトリ内の監査文書、アプリ実装、または機械可読な由来索引を参照する。
- `scripts/audit_beta_status.mjs`は、項目IDの一意性、日付、本文・根拠、根拠ファイルの存在、禁止表現、旧ID33・ID39/40・未収録項目の由来キーを確認する。
- 由来や解剖学的確度を変更するときは、先に対応する監査文書と`public/atlas/structure-provenance.json`を更新し、専門家未確認の内容を検証済みと表現しない。
- 実ブラウザ確認後も、確認していない端末・公開URL・GPU・物理タッチの結果を推測で記録しない。

## 公開前チェック

- [x] 利用条件の記述とstatus JSONの掲載範囲を同期した。
- [x] `#workspace/status`を含む現行27経路のdirect/reloadを、Windows Chrome 151の最終ローカルbuildで3幅×direct/reload＝162/162件として確認した。
- [x] Homeと利用条件のstatus入口、Esc、背景クリック、focus trap、起点復帰を、overlay切替focus修正後の実ブラウザで確認した。
- [x] 390px幅（実効clientWidth 375px）でカードが一列になり、ダイアログ内部だけがスクロールし、横はみ出しがないことをChrome CDPで確認した。
- [ ] 公開URLでの反映を確認した。
- [x] 物理タッチ端末・別GPU・別ブラウザ・公開URLが未確認であることを明記した。

## 実ブラウザ結果

2026-08-22、Windows Chrome 151、`http://127.0.0.1:4190`でstatusを含む26経路×3幅×direct/reloadを実施し、156/156件が合格した。missing/duplicate/fail=0、console/request/UI error、loader、overflow、WebGL fallbackも0件だった。修正後のアプリ内ブラウザではHomeと利用条件の両入口、初期focus、Shift+Tab／Tab循環、Esc、起点復帰を実操作し、Chrome CDPでは390px幅の一列表示、内部スクロール、背景クリックによる閉鎖、横はみ出しなしを確認した。公開URL、物理タッチ端末、別GPU・別ブラウザは未確認のまま保持する。

保存した機械監査結果: `work/browser-audit/beta-route-audit-status-2026-08-22.json`。

## 実装検証

- 全自動テスト: 2026-08-24の現行作業ツリーで398/398成功（変更履歴、内容正確性、lockfile、ブロック標本、由来・Go / No-Go台帳、クイズ全選択肢由来の異常系を含む）。
- TypeScript型検査: 成功。
- 通常本番ビルド: 成功。
- GitHub Pages向けビルド: 成功。
- 上記の結果はローカル作業ツリーでの検証記録であり、公開URLの反映確認ではない。
