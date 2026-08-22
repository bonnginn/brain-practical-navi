# 脳神経・主要血管 模式3Dクイズpilot監査

更新日: 2026-08-22

この文書は、既存の模式3Dオーバーレイだけを使った名称同定pilotの受入条件を記録します。研究用ground truth、専門家レビュー済み教材、起始・走行・接続の解説ではありません。公開・main統合・公開URLの更新はこの作業範囲に含めません。

## インベントリ

- 既存23問は `const quizQuestions` の内容、target、options、position、viewを別のSHA-256スナップショットで監査し、今回の17問と混ぜません。
- 新規17問は `const neurovascularQuizQuestions` に分離し、全問 `format:"neurovascular"`、`origin:"provisional"`、画面表示「模式3D・専門家未確認」です。
- 血管6対象: `ica`, `aca`, `mca`, `vertebral`, `basilar`, `pca`。
- 脳神経11対象: `cn1`, `cn3`–`cn12`。`cn2`、`opticChiasm`、`acomm`、`pcomm`、`cerebellarArteries`は対象・選択肢に含めません。
- 新規pilotのインベントリSHA-256: `eab57546bcd84d17eb24929b309a84db945ca8c0e6fa75a6a77531e865a9c08f`。

## 表示契約

- 問いは白色で強調した既存模式3Dの名称同定だけです。新しい解剖学的境界、幅、起始、走行、接続、手順は追加しません。
- `arteries` は血管オーバーレイ、`cranialNerves` は脳神経オーバーレイだけを必要時に読み込みます。未選択カテゴリのoverlay meshをpilotのために先読みしません。白色対象が不透明な脳表や小脳に隠れないよう、既存の神経血管学習画面と同じ透過脳表・小脳OFFを使います。
- 正答・選択肢は既存 `neurovascularStructures` registryのkindとregion IDsへ一致し、Canvasでは対象region IDsを `[255,255,255]` で強調します。
- 復習リンクは既存の脳表 `arteries` / `cranialNerves` 画面を透過表示のまま開き、該当targetを白色選択します。WebGL fallback時も通常の問題進行を止めない既存挙動を維持します。
- 試作問題は既定ONですが、試作OFFでは候補0件です。ONの候補数は全17、`arteries` 6、`cranialNerves` 11です。wrong-onlyは保存済みtargetだけを候補にします。

## データ・名前空間監査

`scripts/audit_neurovascular_quiz.mjs` と `tests/neurovascular-quiz.test.mjs` で、次を機械検査します。

- 新規17問の数、重複、target集合、選択肢数、kind一致、prompt、provisional属性、固定SHA。
- `public/atlas/neurovascular-overlays.json` の45 region metadata、各IDの非空名、5つのBNM3 meshの有限頂点・bbox、mesh内region IDの実在。
- 旧BigBrain／断面ラベルID 33はpilotへ持ち込みません。一方、neurovascular overlayの右VI外転神経は別名前空間のregion ID 33として正当に保持されます。
- `public/atlas/structure-provenance.json` の対応entry、`learnerSurfaces:["surface","quiz"]`、`quizEligibility:"pilot"`、appKeys、17件のquizTargets。

## 実ブラウザ確認記録

2026-08-22、Chrome 151のローカル本番preview `http://127.0.0.1:4196` で確認しました。

- 主要血管6問、脳神経11問（I、III–XII）を全件通過し、白色強調、透過脳表、小脳OFF、「模式3D・専門家未確認」バッジを確認しました。
- 誤答feedbackを表示し、観察画面 `#workspace/surface/arteries` へ正解構造を選択した状態で遷移できました。
- 試作OFFでは神経血管候補が0件になり、WebGL unavailable時もfallback表示と解答進行を維持しました。
- in-app Browserの390×768指定（実効 `innerWidth` 295）で `docWidth` 284、横overflowなし、console logs 0でした。
- 全経路監査は `work/browser-audit/beta-route-audit-neurovascular-quiz-final-2026-08-22.json` に保存し、156/156件成功でした。
- 神経血管監査、構造由来監査（56 entries / 51 lecture rows / 40 quiz targets）、全自動テスト147/147、TypeScript型検査、通常版とGitHub Pages版の本番ビルド、`git diff --check` に合格しました。

## 未確認事項

今回のローカル確認は、公開URL、物理端末、異なるGPU、専門家による解剖学的妥当性を証明しません。専門家レビュー、細枝・静脈・連絡動脈、`cn2`、視覚路の個別分節は未完了です。
