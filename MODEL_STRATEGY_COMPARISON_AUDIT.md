# 3Dモデル方針比較試作監査

更新: 2026-08-24

## 位置づけ

`BETA_ROADMAP.md` の「3Dモデル方針の比較試作」に対する最小pilotです。共同制作ページから明示的に開く寄稿者向け表示であり、通常の学習経路、既存3Dモデル、断面ラベル、構造名、由来台帳、クイズを変更しません。A/Bいずれをβ本体へ採用するかは決定しません。

比較課題は、左右側脳室と第三脳室について、全体の曲がり方と前後・下方への広がりが回転時にも追いやすいかを見ることです。

## A/Bの由来

- A「現行再構成」: 配布済みの `block-commissural-system-lateral-ventricles.mesh` と `block-diencephalon-third-ventricle.mesh` を同じ格子・同じ色で表示します。
- B「知識ベース模式」: `scripts/build_comparison_schematic_ventricle.mjs` が独立した座標列から生成する `comparison-schematic-ventricle.mesh` です。既存標本、アトラス頂点、断面ラベルを抽出・変形したものではありません。

Bは画面上で常に「模式・専門家未確認」「実標本由来ではない」と表示します。実標本由来、正解セグメンテーション、検証済み形状として扱いません。3本の独立した単純管で、連結部、個人差、形態計測に使える縮尺を表現しません。臨床・定量・研究用途の形状ではなく、学習者向けモデルの代用品でもありません。

## 操作契約

- A/Bは同じ回転状態、初期・反対側・上面・下面プリセット、同じ青緑色、同じ表示ON/OFFを共有します。
- 共同制作ページの目立つ案内と既存カードの両方から、`#workspace/collaborate/model-strategy` を開きます。このURLはdirect/reloadに対応します。
- 閉じると `#workspace/collaborate` へ戻り、画面内ボタンから開いた場合は起点へフォーカスを戻します。
- `React.lazy` と開閉条件により、比較用コードと模式メッシュはパネルを開くまで読み込みません。

## 機械可読評価

`model-comparison/deep-ventricle-evaluation.json` に次の7項目を固定しました。

1. 同定しやすさ
2. 位置関係
3. 表面品質
4. 回転時の見やすさ
5. 着色・脱着のしやすさ
6. 動作負荷
7. 制作・修正コスト

全項目のA/B点数、レビュー担当者、採否は `pending` / `null` のままです。専門家・学習者による比較記録がないため、現時点の結論は `pending-expert-review` です。

## 資産監査

- BNM2、156 vertices、300 faces、7,980 bytes
- SHA-256: `6bcf655746ed58175ebbc3ebb9068a5e82b8f52c14d5b9ce719987c415c19123`
- region IDなし、既存ラベルIDの追加・変更なし
- `public/atlas/DATA-MANIFEST.json` の `contributor-comparison-prototype-assets` に一意に対応
- 決定的生成と固定SHAを `tests/deep-model-comparison.test.mjs` で検査

## 実ブラウザ確認

Windows 11 / Chrome 151、ローカルproduction preview `http://127.0.0.1:4216/#workspace/collaborate` で確認しました。

- パネルを開く前は比較用模式メッシュの取得0件、開いた後だけ1件取得
- A/B Canvas 2件、loader残留0、画面内alert 0
- 初期・反対側の共通視点切替、構造OFF時の両画面反映
- 閉じた後もhashを維持し、起点ボタンへフォーカス復帰
- 390×768指定時の実効 `innerWidth` 295 pxで一列表示、`clientWidth` / `scrollWidth` は共同制作領域284/284、比較パネル259/259
- console error/warning 0

同じbuildのcanonical route監査は26経路×3幅×direct/reload＝156/156件に合格しました。結果は `work/browser-audit/beta-route-audit-model-strategy-2026-08-23.json` です。初回payload監査も26/26件に合格し、通常経路から比較用chunk・meshの要求は0件でした。結果は `work/performance/initial-route-payload-audit-model-strategy-2026-08-23.json` です。

自動テスト217/217、対象＋rendered HTMLテスト83/83、TypeScript型検査、通常／Pages本番ビルド、`git diff --check` に合格しました。Sol mediumの最終差分レビューでもP0/P1指摘はありませんでした。

### 2026-08-24 導線・直接URLの追試

共同制作ページの冒頭へ「M2・寄稿者向け試作」と明記した案内を追加し、比較画面を探し回らずに開けるようにしました。専用URL `#workspace/collaborate/model-strategy` はdirect/reload後も比較を開いた状態へ復元します。通常の `#workspace/collaborate` はCanvas 0で比較資産を取得せず、専用URLだけがA/BのCanvas 2件と次の3資産を読み込みます。

- `block-commissural-system-lateral-ventricles.mesh`
- `block-diencephalon-third-ventricle.mesh`
- `comparison-schematic-ventricle.mesh`

Windows Chrome 151、ローカルproduction preview `http://127.0.0.1:4312` で、案内から開く、direct/reload、閉じる、起点フォーカス復帰を確認しました。390×768指定時は実効 `innerWidth` 295 px、`clientWidth` / `scrollWidth` 284/284で一列表示となり、loader、画面内error、横overflowは0件でした。

canonical route監査は新しい専用URLを含む27経路×3幅×direct/reload＝162/162件に合格し、missing／duplicate／fail、console／request／UI error、残留loader、横overflow、WebGL fallbackは0件でした。記録は `work/browser-audit/beta-route-audit-model-strategy-discovery-2026-08-24.json` です。cold初回payload監査も27/27件に合格し、通常の共同制作ページは181,062 bytes・6 requests、専用URLは861,927 bytes・10 requestsで、上記3資産のexact allowlistに一致しました。記録は `work/performance/initial-route-payload-model-strategy-discovery-2026-08-24.json` です。これらはローカル確認であり、比較案の解剖学的妥当性や採否を示しません。

### 2026-08-24 端末内レビュー記録

専門家・学習者が後日まとまった時間で比較できるよう、同じ専用URLへ7項目×A/Bの1〜5評価、評価者の立場、全体印象、任意メモを追加しました。氏名・メールアドレス・所属は入力欄もJSON項目も設けません。下書きはversion付きkeyでブラウザ内だけに自動保存し、再読み込み後に復元します。JSON書き出しは自動送信を行わず、次を固定します。

- `status: local-unsubmitted-draft`
- `submissionStatus: not-submitted`
- `adoptionDecision: not-recorded`
- `expertReviewStatus: not-claimed`

`src/modelStrategyReview.mjs` は、7項目の順序・日本語名、1〜5または未選択、固定fieldだけを検証し、壊れた端末内データを安全な空下書きへ戻します。`scripts/audit_model_strategy_review.mjs --input <json>` は、書き出しJSONの件数・完了度を独立再計算し、個人情報fieldの追加、点数範囲外、完了度の改変、送信・採用・専門家確認済みへの昇格を拒否します。検査合格は内容の解剖学的妥当性やレビュー完了を意味しません。

Windows Chrome 151、ローカルproduction preview `http://127.0.0.1:4313` で、A/B点数、評価者区分、全体印象、メモの入力と再読み込み復元、JSON書き出し後の「送信・採用ではない」表示を実操作しました。初回実装でイベント値の遅延参照によるconsole errorを検出し、値を即時取得する実装へ修正後、error/warning 0を再確認しました。通常幅は`clientWidth` / `scrollWidth` 970/970、390×768指定時は実効`innerWidth` 295 px、文書284/284、review領域233/233、2列評価、select 44 px、操作ボタン縦積みでした。Canvas 2、loader／UI error／横overflowは0件です。

最終buildのroute監査は `work/browser-audit/beta-route-audit-model-strategy-review-2026-08-24.json` の162/162件、cold初回payload監査は `work/performance/initial-route-payload-model-strategy-review-2026-08-24.json` の27/27件に合格しました。通常の共同制作ページは181,598 bytes、専用URLは866,629 bytes・10 requestsで、比較用3資産のexact allowlistを維持しています。全自動テスト311/311件、対象テスト13/13件、TypeScript型検査、通常用・GitHub Pages用production buildにも合格しました。

## 未確認事項

- 解剖学的妥当性、実習での同定しやすさ、位置関係の正しさ
- 専門家・学習者による7項目の採点と自由記述
- 物理スマートフォン／タブレット、実機タッチ、別ブラウザ・別GPU
- β本体へ採用する基盤の決定

このpilotだけでは `BETA_ROADMAP.md` の比較試作の完了条件を満たしません。最終採用は専門家・学習者レビュー待ちです。
