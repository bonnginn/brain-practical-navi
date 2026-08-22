# スマートフォン専用UI監査

更新日: 2026-08-22

## 対象と境界

この監査は、既存の教材データ、メッシュ、Canvas描画、クイズ内容、回転、教材状態、URL hashを変更せず、スマートフォンでの導線と設定操作を分離する実装を対象とします。phone判定は `width <= 760`、`hover: none`、`pointer: coarse` の3条件を同時に満たす場合だけです。狭いfine-pointer PCはphone扱いにせず、既存のcompact desktopを維持します。

phoneでは、Home・脳表・断面・ブロック標本・復習をsafe-area対応の下部dockへ置き、上部の教材横スクロールナビを隠します。workspace固有の既存 `leftRail` は1つだけをsettings `dialog` 内へ置き、別の設定DOMは生成しません。dialogは `showModal()` / `close()` と `cancel` で開閉し、44px以上の操作対象、背景クリック、Esc、focus trap、起点focus復帰、`html` と `body` の背景scroll固定を備えます。dialogの上端とrailはsafe-area上端を考慮します。

既存の幅だけで決まるcompact desktop向け `max-width:760px` CSSは維持し、phone専用のdock・settings sheet・segment guardだけを `max-width:760px`、`hover:none`、`pointer:coarse` の複合条件へ限定します。JavaScriptもresize/orientationだけでなく、3つのMediaQueryListの `change` を購読して能力判定を同期します。

`#workspace/segment` のphone表示では `ManualSegmentationWorkbench` を生成せず、「編集ツールはPCで利用」の案内と共同制作・学習画面への導線だけを表示します。fine-pointerまたは幅761px以上では既存の編集画面を維持します。

## 自動監査

- `tests/mobile-ui.test.mjs` がphone / compact-desktop / desktopの能力判定、5導線dock、単一rail、segment guard、settings dialogのfocus・scroll・history契約、safe-area、44px操作対象、横overflow対策を静的・純関数テストします。
- `tests/rendered-html.test.mjs` と既存の全監査テストは、既存Canvas・hash・教材内容の契約を引き続き検査します。
- 2026-08-22時点で `mobile-ui.test.mjs` と `rendered-html.test.mjs` を含む全テスト152/152、型検査、通常／Pages本番ビルド、`git diff --check` が成功しています。

## 2026-08-22 親実ブラウザ確認

Chrome 151のローカル通常production preview `http://127.0.0.1:4198` で、fine-pointer狭幅とcoarse touch emulationを確認した。公開URLへは反映していない。

### A. fine-pointer狭幅

in-app Browserの実効 `innerWidth` は295、`clientWidth` は284。`hover` と `pointer` はともにfalseで、`phoneMode=false`、phone dockなし、`docWidth=clientWidth`、sectionsのCanvas 1を確認した。`#workspace/segment` では既存workbenchあり、phone guardなし、Canvas 1で、個別確認のconsole logsは0件だった。

### B. coarse touch emulation

CDPでwidth / clientWidth / scrollWidth は390、`mobile:true`、`touch:true`、`hover:none`、`pointer:coarse`となり、`phoneMode=true`、5件dock、sections Canvas 1を確認した。settingsはnative dialog roleで、閉じた直後の初期focus、structure buttons 21件、structure groups 1件、全解除の表示、`html` / `body` のoverflow hidden、Shift+Tab後もdialog内に留まること、Esc／背景クリックで閉じて起点のphoneRailToggleへfocus復帰することを確認した。断面rangeは52→53、同時にpage scrollY 220を確認した。

`#workspace/segment` directではguard=true、workbench=false、Canvas 0、dock 5件、横overflow 0だった。画面記録は `work/browser-audit/mobile-ui-settings-390.png` と `work/browser-audit/mobile-ui-segment-390.png`、probe結果は `work/browser-audit/mobile-ui-coarse-probe-2026-08-22.json` に保存した。

### C. 経路監査

coarse phoneは26経路×direct/reload＝52/52件に合格し、segmentはCanvas 0を期待値として監査した。結果は `work/browser-audit/mobile-ui-route-audit-2026-08-22.json` に保存した。通常fine/non-touchは26経路×3幅×direct/reload＝156/156件に合格し、`work/browser-audit/beta-route-audit-mobile-ui-final-2026-08-22.json` に保存した。両reportでmissing/duplicate/fail、console/request/UI error、残留loader、横overflow、WebGL fallbackは0件だった。

公開URL、物理端末、実機タッチ、Safari・別ブラウザ、別GPU、専門家レビューは未確認である。
