# クイズ正答対象の実描画可視性監査

更新日: 2026-08-24

## 目的

クイズで正答対象を着色したとき、断面、脳表、神経血管のいずれでも十分な画面上の変化が生じ、着色解除と再着色が同じ結果へ戻ることを実ブラウザで確認する。これは表示上の可視性監査であり、構造名、形状、境界、正答条件の解剖学的妥当性を専門家が承認したことは意味しない。

## 固定した対象と環境

- 対象: 断面17、脳表6、神経血管17、計40 target。
- 画面: PC 1366×768、横向きタブレット1024×768、phone 390×768。計120件。
- ブラウザ: Chrome 151.0.7922.170。
- OS／実行環境: Windows `10.0.26200`、Node 24.19.0。
- ローカルproduction preview: `http://127.0.0.1:4296/`。
- 証拠: `work/quiz-visibility-formal-v4-20260824/report.json` と同階層のRGBA／mask artifact（local-only）。

各targetで、着色H1、無着色C、再着色H2を取得した。H1とH2のRGBA完全一致、対象別の表示状態・ID・表示形式、viewport、回転・倍率、loader、console／request／UI error、横overflow、WebGL fallback、artifact SHAとbyte数を独立validatorが再計算する。

## 結果

120/120件に合格した。missing、duplicate、validation errorは0で、全件でH1とH2が完全一致した。

| 形式 | 件数 | 最小coverage | 最大outside ratio | 着色変化面積の範囲 |
| --- | ---: | ---: | ---: | ---: |
| 断面 | 51 | 0.9501 | 0.0183 | 66–17,978 px |
| 脳表 | 18 | 0.9622 | 0.0005 | 2,065–25,453 px |
| 神経血管 | 51 | 0.9762 | 0.0357 | 93–2,967 px |

後大脳動脈（PCA）は、PC coverage 0.9936／outside 0、横向きタブレット0.9942／0、phone 0.9917／0だった。

## 半透明重なりの監査修正

初回の正式実測では、PCAのPCと横向きタブレットだけ、実描画の着色差159／87 pxが期待mask外と判定された。対象は見えておりcoverageは1だったため、1 px許容を広げず原因を調べた。

神経血管overlayはalpha 0.78、depth write有効、`LEQUAL`で順に描画する。先に通過したselected fragmentの色は、後続の半透明unselected fragmentが重なっても22%残る。一方、旧CPU evidenceは後続unselected fragmentでmaskを0へ戻し、実際には残るselected寄与を消していた。修正後は、神経血管について通過したselected寄与を描画順にOR保持する。脳表の不透明描画、depth更新、shaderのalpha閾値、1 px境界許容、合格閾値は変更していない。

アプリ側と独立validatorは、異なる実装で同じBNM3 source、回転、倍率、depth、描画順、半透明合成契約からmaskを再構築する。全画面着色、改変mask、誤ったmesh SHA、誤ったdepth／合成policy、coverage集計の改変は異常系テストで拒否する。

## 未確認範囲

- 公開URL、公開回線、物理スマートフォン／タブレット、Safari、別ブラウザ・別GPU。
- 3D形状と断面境界の解剖学的妥当性。
- 標準問題への採否、正答・誤答選択肢の全範囲についての専門家判断。

したがって、この監査はβ候補のローカル表示品質を満たすが、`BETA_GO_NO_GO.json` の専門家レビュー待ちを解除しない。

## 再現

```bash
node scripts/audit_quiz_target_visibility_browser.mjs \
  --base-url http://127.0.0.1:4296/ \
  --output-dir work/quiz-visibility-formal-v4-20260824
```
