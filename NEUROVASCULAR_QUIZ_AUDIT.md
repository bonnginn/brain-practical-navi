# 脳神経・主要血管 模式3Dクイズpilot監査

更新日: 2026-08-22

この文書は、既存の模式3Dオーバーレイだけを使った名称同定pilotの受入条件を記録します。研究用ground truth、専門家レビュー済み教材、起始・走行・接続の解説ではありません。公開・main統合・公開URLの更新はこの作業範囲に含めません。

## インベントリ

- 既存23問は `const quizQuestions` の内容、target、options、position、viewを別のSHA-256スナップショットで監査し、今回の18問と混ぜません。
- 新規18問は `const neurovascularQuizQuestions` に分離し、全問 `format:"neurovascular"`、`origin:"provisional"`、画面表示「模式3D・専門家未確認」です。
- 血管6対象: `ica`, `aca`, `mca`, `vertebral`, `basilar`, `pca`。
- 脳神経12対象: `cn1`, `cn2`, `cn3`–`cn12`。IIは既存の視神経・視索をまとめた模式レイヤーの名称だけを問い、`opticChiasm`、`acomm`、`pcomm`、`cerebellarArteries`は対象・選択肢に含めません。
- `cn2`の正答対象は既存overlay region ID `[23,24]`だけです。opticChiasm region ID25、旧BigBrain／断面ID33、未分節の視覚路ID36–38はこの問題へ含めません。
- 新規pilotのインベントリSHA-256: `96f557dfcc0a9dfb1e06f9baef6e8df602a05f9a4446bf91f6613d5fba356c9d`。

## 表示契約

- 問いは白色で強調した既存模式3Dの名称同定だけです。新しい解剖学的境界、幅、起始、走行、接続、手順は追加しません。
- `arteries` は血管オーバーレイ、`cranialNerves` は脳神経オーバーレイだけを必要時に読み込みます。未選択カテゴリのoverlay meshをpilotのために先読みしません。白色対象が不透明な脳表や小脳に隠れないよう、既存の神経血管学習画面と同じ透過脳表・小脳OFFを使います。
- 正答・選択肢は既存 `neurovascularStructures` registryのkindとregion IDsへ一致し、Canvasでは対象region IDsを `[255,255,255]` で強調します。
- 復習リンクは既存の脳表 `arteries` / `cranialNerves` 画面を透過表示のまま開き、該当targetを白色選択します。WebGL fallback時も通常の問題進行を止めない既存挙動を維持します。
- 試作問題は既定ONですが、試作OFFでは候補0件です。ONの候補数は全18、`arteries` 6、`cranialNerves` 12です。wrong-onlyは保存済みtargetだけを候補にします。

## 2026-08-24 bounded inventory update

既存overlayの `cn2` を1問だけ追加しました。問題文は従来の白色強調された模式3Dの名称同定で、起始・走行・視交叉・接続を判定しません。`cn2`のregistry IDsは `[23,24]` に固定し、`app-schematic-optic-nerve` を `learnerSurfaces:["surface","quiz"]`・`quizEligibility:"pilot"` として `cn2`へ解決しました。`app-schematic-optic-chiasm` と `opticChiasm` は引き続き `quizEligibility:"none"` です。メッシュ、BNM3、voxel、分節、標準クイズ23問、解剖レビュー状態は変更していません。Chrome 151のローカルpreview `http://127.0.0.1:4325` で全41問・脳神経12問、`cn2`の誤答説明と観察リンク、試作OFF時0問を実操作し、可視性監査は41 target×3幅の123/123件に合格しました。最終buildのcanonical routeは162/162、cold初回payloadは27/27件に合格しました。

## データ・名前空間監査

`scripts/audit_neurovascular_quiz.mjs` と `tests/neurovascular-quiz.test.mjs` で、次を機械検査します。

- 新規18問の数、重複、target集合、選択肢数、kind一致、prompt、provisional属性、固定SHA。
- `public/atlas/neurovascular-overlays.json` の45 region metadata、各IDの非空名、5つのBNM3 meshの有限頂点・bbox、mesh内region IDの実在。
- 旧BigBrain／断面ラベルID 33はpilotへ持ち込みません。一方、neurovascular overlayの右VI外転神経は別名前空間のregion ID 33として正当に保持されます。
- `public/atlas/structure-provenance.json` の対応entry、`learnerSurfaces:["surface","quiz"]`、`quizEligibility:"pilot"`、appKeys、18件のneurovascular quizTargets（全体41件）。

## 実ブラウザ確認記録

2026-08-22、Chrome 151のローカル本番preview `http://127.0.0.1:4196` で確認しました。

- 主要血管6問、脳神経11問（I、III–XII）を全件通過し、白色強調、透過脳表、小脳OFF、「模式3D・専門家未確認」バッジを確認しました。
- 誤答feedbackを表示し、観察画面 `#workspace/surface/arteries` へ正解構造を選択した状態で遷移できました。
- 試作OFFでは神経血管候補が0件になり、WebGL unavailable時もfallback表示と解答進行を維持しました。
- in-app Browserの390×768指定（実効 `innerWidth` 295）で `docWidth` 284、横overflowなし、console logs 0でした。
- 全経路監査は `work/browser-audit/beta-route-audit-neurovascular-quiz-final-2026-08-22.json` に保存し、156/156件成功でした。
- 神経血管監査、構造由来監査（56 entries / 51 lecture rows / 40 quiz targets）、全自動テスト147/147、TypeScript型検査、通常版とGitHub Pages版の本番ビルド、`git diff --check` に合格しました。

## 未確認事項

今回のローカル確認は、公開URL、物理端末、異なるGPU、専門家による解剖学的妥当性を証明しません。専門家レビュー、細枝・静脈・連絡動脈、視覚路の個別分節は未完了です。`cn2`は合成模式レイヤーの名称同定pilotとして追加しただけで、純粋な視神経分節や視索・視交叉の境界を主張しません。
