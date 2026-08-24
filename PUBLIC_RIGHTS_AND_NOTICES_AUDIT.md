# Public rights and notices audit

更新日: 2026-08-24

この監査は、既存の出典・ライセンス・表示義務を `DATA-MANIFEST.json`、同梱通知、利用条件表示へ機械的に対応づけるものです。新しい許諾条件や法的判断を追加するものではありません。

## ローカルで確認した範囲

`public/atlas/` の `DATA-MANIFEST.json` は、旧単数 `bundledNotice` を使わず、各群の既存表示義務から導いた `bundledNotices:string[]` を持ちます。8つの配布群と1つの通知メタ群、5つの同梱通知を確認し、マニフェストを除く配布ファイル110件が正規表現へちょうど1群ずつ一致することを独立validatorで検査します。5通知は空でなく、通知メタ群へちょうど1件ずつ一致し、少なくとも1つの非通知群から逆参照されます。

| 出典群 | 同梱通知 |
| --- | --- |
| BigBrain browser derivatives | `BIGBRAIN-DATA-LICENSE.txt` |
| BigBrain manual labels | `BIGBRAIN-MANUAL-LICENSE.txt`, `BIGBRAIN-DATA-LICENSE.txt` |
| Combined practical segmentation | `ATTRIBUTION.txt`, `BIGBRAIN-DATA-LICENSE.txt`, `BIGBRAIN-MANUAL-LICENSE.txt`, `LICENSE.txt`, `PROCEDURAL-NEUROVASCULAR-NOTICE.txt` |
| MNI / CerebrA browser assets | `LICENSE.txt`, `ATTRIBUTION.txt` |
| Specimen block assets | `ATTRIBUTION.txt`, `BIGBRAIN-DATA-LICENSE.txt`, `BIGBRAIN-MANUAL-LICENSE.txt`, `LICENSE.txt`, `PROCEDURAL-NEUROVASCULAR-NOTICE.txt` |
| Project-authored teaching overlays | `PROCEDURAL-NEUROVASCULAR-NOTICE.txt`, `ATTRIBUTION.txt` |
| Contributor comparison prototype | `PROCEDURAL-NEUROVASCULAR-NOTICE.txt`, `ATTRIBUTION.txt` |
| Structure-provenance audit | `ATTRIBUTION.txt` |

`PROCEDURAL-NEUROVASCULAR-NOTICE.txt` の対象一覧は、manifestの project-authored 群と同じ21ファイルへ同期しています。通知群自身は通知を自己参照しません。

2026-08-24のローカル実行では、source監査、通常base `/` のdist監査、GitHub Pages base `/brain-practical-navi/` のdist監査がそれぞれ `ok: true`（110ファイル、5通知、21件、エラー0）になりました。dist監査は、source `public/atlas/` と dist `atlas/` の111パス（manifestを含む）の存在・余分なファイル・バイト列を完全一致で比較し、通常版とPages版のbase pathを混同しないことを検査します。build-timeの `brain-practical-corresponding-source` meta は1件だけで、`VITE_SOURCE_REPOSITORY_URL` と同じ対応ソースURLへ一致します。これは公開hostの確認ではありません。

利用条件には、クイズの誤答履歴、分節差分、M2比較の下書き、解剖レビューの下書きが端末内 `localStorage` に保存され、自動送信されず、サイトデータの消去で失われる方針を同期しました。また、原著者やデータ提供機関の推奨・承認を示さないことを明記しています。法的表示は `source-credit`、`license-boundaries`、`modifications`、`no-endorsement`、`educational-nonclinical`、`privacy-analytics`、`privacy-local-storage`、`corresponding-source` の8つの一意な `data-legal-disclosure` markerとして既存の利用条件dialog内に置き、各marker自身の要素内に必要な説明語を含め、固定の兄弟パネルを作らないことをsource validatorとrendered-html testで確認します。dist validatorも8 markerをそれぞれ1件ずつ要求します。

同日のローカル通常buildを実ブラウザで開き、利用条件dialogに8 markerと `https://github.com/bonnginn/brain-practical-navi` の対応ソースリンクが表示されることを確認しました。小画面確認はブラウザ制御上のviewport cap 390×844（実測 `innerWidth=295`、`innerHeight=639`）で行い、旧キャッシュを除いた修正後生成物ではroot、dialog、footer、footer link列のいずれも `scrollWidth === clientWidth`、loader 0、UI error 0でした。これは物理端末や公開hostの確認ではありません。

## 再現コマンド

```text
node scripts/audit_public_rights_notices.mjs --mode source --root . --output work/public-rights-notices-source-YYYY-MM-DD.json
node scripts/audit_public_rights_notices.mjs --mode dist --dist-root dist --expected-base / --expected-source-url https://github.com/bonnginn/brain-practical-navi --output work/public-rights-notices-dist-normal-YYYY-MM-DD.json
node scripts/audit_public_rights_notices.mjs --mode dist --dist-root dist --expected-base /brain-practical-navi/ --expected-source-url https://github.com/bonnginn/brain-practical-navi --output work/public-rights-notices-dist-pages-YYYY-MM-DD.json
```

`source` と `dist` は別の検査です。`dist` では期待するbase pathと対応ソースURLを必須入力とし、indexの一意な対応ソースmetaが期待URLへ一致すること、indexの全origin-relative local参照を期待base pathから解決してdist内に実在すること、対応ソースanchor markerが存在すること、source/distのatlasバイト列が一致すること、bundle内の8つの法的markerが各1件ずつ存在することを確認します。CIの通常buildとPages buildは同じ公式 `VITE_SOURCE_REPOSITORY_URL` を明示的に渡します。fixture/mutationテストは旧単数schema、固定manifest群のfield/pattern改変、欠落・重複・未一致、通知の欠落・空、privacy/endorsement表示欠落、source URL/base不一致、任意prefixの参照、atlasの1バイト差分・missing・extraを拒否します。

## 未確認範囲

今回のローカル監査は公開リポジトリの作業ツリーとローカルbuildの対応だけを扱います。公開host上の最終URL、CDNキャッシュ、公開版bundleへの反映は未確認であり、Go/No-Goでは `deployment-blocked` を維持します。表示義務の法的判断、第三者の推薦・承認、専門家レビューをこの監査から主張しません。
