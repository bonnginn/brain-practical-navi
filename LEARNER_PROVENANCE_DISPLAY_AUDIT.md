# 学習者向け来歴表示監査

更新日: 2026-08-23

## 目的

`public/atlas/structure-provenance.json` の由来台帳と、アプリの学習者向け表示キー（断面、脳表、自由観察、脳神経・血管、ブロック標本）との対応を、機械的に追跡できる状態へ保つ。表示上の短い来歴バッジ、表示面フィルタ、共同制作画面の読み取り専用キューが、同じ台帳を参照し、アプリ側のキー追加・削除を取りこぼさないことを監査する。

## 非目的と状態の境界

- この監査は解剖学的妥当性、構造の位置・範囲・連続性、研究用ground truth、専門家の最終承認を検証するものではない。
- `expertReview: "pending"` と `projectReview` の状態は、機械的な対応が解決していても昇格しない。2026-08-23現在、registry 75件はすべて expert pending である。
- 2026-08-23の数値は台帳・対応表・アプリソースの機械監査結果であり、下記の実ブラウザ確認とは別に集計する。解剖学的妥当性や専門家レビューの完了は意味しない。

## 2026-08-23現在の機械結果

| 監査対象 | 結果 |
| --- | ---: |
| provenance registry entries | 75 |
| expert pending | 75 |
| review filter（surface / sections / blocks / quiz） | 54 / 16 / 30 / 21 |
| learner provenance mapping（resolved / total） | 222 / 222 |
| learner family（sections / surface / free / neurovascular / blocks） | 21 / 52 / 75 / 22 / 52 |
| app inventory（regions / landmarks / deep / basal） | 26 / 8 / 5 / 13 |
| app inventory（neurovascular / sections / block specimens / block layers / pathways） | 22 / 21 / 8 / 44 / 3 |

未解決 mapping は 0件で、全222件が台帳 entry へ解決する。`free` は独立した registry learner surface ではなく、脳表 `surface` を介して解決する仕様である。

## 2026-08-23 最終ローカル実ブラウザ確認

Chrome 151のin-app browserで、ローカルproduction preview `http://127.0.0.1:4201` を確認した。review panelは75/75件を表示し、filterはsurface54／sections16／blocks30／quiz21／all75だった。app-onlyカードでは日本語見出し（縁上回、II 視神経・視索）を確認し、自由観察の縁上回は「試作」バッジとCerebrA詳細を表示した。`cn2` と`opticChiasm`はそれぞれ「模式」、blockのchoroid plexusは「模式」と未保証説明を表示した。

同じローカルbuildのroute auditは `work/browser-audit/beta-route-audit-learner-provenance-final-2026-08-23.json` に保存し、26経路×3幅×direct/reload＝156/156、`allPassed: true` だった。390 px設定時の`clientWidth`は375 pxで、overflow、画面内error、残留loader、WebGL fallbackはいずれもなかった。

これは来歴表示・導線・レイアウトのローカル確認であり、解剖学的妥当性の検証ではない。公開URL、物理端末、別GPU、別ブラウザ、専門家レビューは未確認で、75件のexpert pending状態は維持する。

## 56件から75件への台帳追加

2026-08-23の同期では、既存56件に、app-onlyの18行（脳表16行、ブロック1行、`opticChiasm`の模式脳表1行）と、`cn2` の optic nerve 行1行を加えた。増分は合計19行であり、解剖学的な採否や専門家レビュー完了を意味しない。

追加した脳表16行は、`app-surface-rostral-middle-frontal`、`app-surface-caudal-middle-frontal`、`app-surface-pars-orbitalis`、`app-surface-middle-temporal`、`app-surface-inferior-temporal`、`app-surface-transverse-temporal`、`app-surface-supramarginal`、`app-surface-superior-parietal`、`app-surface-inferior-parietal`、`app-surface-paracentral`、`app-surface-pericalcarine`、`app-surface-lingual`、`app-surface-parahippocampal`、`app-surface-entorhinal`、`app-surface-orbitofrontal`、`app-surface-lateral-occipital` である。ブロック追加は `app-block-choroid-plexus`、視交叉の模式脳表行は `app-schematic-optic-chiasm`、optic nerve 行は `app-schematic-optic-nerve` である。

## IDとアプリキーの分離

- 旧BigBrain／CerebrAの解剖ラベルID33（`visual-pathway-legacy-optic-label`）は、視交叉と視索を分離できない混合領域である。断面学習、通常クイズの正答、分節編集入口へは結ばず、`opticChiasm` のアプリキーも持たない。
- `cn2` は `app-schematic-optic-nerve`、`opticChiasm` は `app-schematic-optic-chiasm` にそれぞれ対応する、学習画面上の模式3Dキーである。両者を旧ID33の解剖ラベルと同一視しない。アプリのoverlay region ID33があっても、registryの旧解剖ラベルID33とは別名前空間として扱う。
- ID39・40は `section-mammillary-bodies` の1台帳行（`labelIds: [39, 40]`）を維持する。プロジェクト内レビュー済み・専門家レビュー pending、通常クイズ対象という既存の状態を変更しない。

## 監査コマンド

リポジトリルートで次を実行する。いずれも台帳・対応表・アプリ在庫の整合を読む監査であり、ブラウザを起動しない。

```text
node scripts/audit_learner_provenance.mjs
node scripts/audit_anatomy_review_queue.mjs --no-page
node scripts/audit_structure_provenance.mjs
node scripts/audit_beta_status.mjs
```

期待する主要結果は `entryCount: 75`、`pendingCount: 75`、review filter の `54 / 16 / 30 / 21`、mapping `222 / 222` resolved、unresolved `0` である。実ブラウザでの表示面フィルタ、カード、リンク、狭幅レイアウトの再確認は別作業として残す。

## 履歴の扱い

2026-08-22に実ブラウザで確認した全56件、filter `36 / 16 / 29 / 21`、および同日のroute `156/156` は履歴記録として書き換えない。2026-08-23の75件は機械台帳の現在値と最終ローカル実ブラウザ確認を別記し、公開URL等の未確認範囲は維持する。
