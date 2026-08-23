# PC・横向きタブレット幅の中心操作監査

更新日: 2026-08-23

## 目的と範囲

β候補の脳表・断面・自由観察・クイズについて、利用者の中心操作がローカル本番成果物で完遂できることを、Chrome DevTools Protocolによる意味的な状態変化として確認する。画素や解剖学的妥当性は判定しない。

対象はWindows 11 Home、Node 24.19.0、Chrome 151.0.7922.170、通常production preview `http://127.0.0.1:4236/`。PC 1366×768と横向きタブレット幅1024×768の2条件を使った。いずれも `mobile:false`、`touch:false` のデスクトップエミュレーションであり、物理タブレットや実機タッチの確認ではない。

## 操作契約

`scripts/audit_core_interactions.mjs` は4導線×2幅の固定8件を実行する。

- 脳表・左外側面: 構造選択、小脳表示切替、キーボード回転、拡大、向きと倍率のリセット。
- 水平断: スライダーを1断面進めて戻し、表示値との一致を確認。断面のみ、3Dのみ、断面＋3Dへ切り替える。
- 自由観察: 視覚路プリセット、構造索引からの追加、全解除、回転、既定方向へのリセット。
- クイズ: 試作OFF・断面形式・5問へ設定し、新しい5問キューを開始。解答とfeedbackを確認し、誤答時の観察リンクが回答対象から導出した断面・位置・構造へ遷移することを確認する。

全導線で、初期・最終URL、見出し、実測viewport幅・高さ、Canvas数、loader、UI／console／request error、横はみ出し、WebGL fallbackを記録する。回転・倍率、構造キー、クイズ対象は利用者向け表示を変えない読み取り専用data属性から取得する。

## 保存結果

最終結果は `work/browser-audit/core-interactions-pc-tablet-2026-08-23.json`（ローカル作業用・配布対象外）。8/8件、計40操作が合格した。初期・最終の観測寸法はPC全件1366×768、横向きタブレット幅全件1024×768。console／request／UI error、残留loader、横はみ出し、WebGL fallbackは全件0だった。

クイズ2件では、設定変更前後の問題signatureと5問キュー生成を確認し、回答した問題から期待復習先を独立に導出した。期待値と実測値はともに冠状断の同じ位置・同じ構造で一致し、最終Canvasは1から3へ遷移した。

`validateCoreInteractionReport()` は保存JSONの自己申告を信用せず、固定8件、schema／tool／時刻、loopback base、Windows／Node 24／Chrome 151、8件のブラウザ同一性、デスクトップ・非タッチ方針、要求値と観測値のviewport一致、probe schema、各操作のbefore／after、クイズの質問から復習先までの連鎖を再計算する。欠落・重複・未知キー、環境やブラウザの改変、viewport不一致、操作詳細の矛盾、Start無操作、誤った復習先を異常系テストで拒否する。

## 未確認事項

- 物理PC・物理タブレットの機種差、実機タッチ、別ブラウザ・別GPU、公開URL・公開回線は未確認。
- この監査は表示と操作の成立を確認するもので、構造の位置、境界、名称、問題内容の解剖学的妥当性や専門家レビューを証明しない。
- スマートフォン専用UIは [MOBILE_UI_AUDIT.md](MOBILE_UI_AUDIT.md)、全経路のdirect／reloadは [PRESENTATION_AUDIT.md](PRESENTATION_AUDIT.md) の別監査を参照する。
