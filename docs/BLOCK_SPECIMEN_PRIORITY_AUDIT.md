# ブロック標本 β重点導線監査

更新日: 2026-08-24

## 目的

8標本を一律に作り替えず、`BETA_ROADMAP.md` が先行改善対象として挙げる4標本へ学習者が到達しやすい導線を設ける。これは観察順の整理であり、実習頻度、解剖学的確度、由来、専門家レビュー、標本品質の順位づけではない。

## 固定分類

| 区分 | 既存キー | 表示名 |
| --- | --- | --- |
| β重点 | `lateral-ventricle` | 側脳室の全景 |
| β重点 | `radiations` | レンズ核・投射線維 |
| β重点 | `choroid-plexus` | 脈絡叢を開く |
| β重点 | `medial-temporal` | 海馬・扁桃体標本 |
| 発展観察 | `diencephalon` | 視床・視床下部標本 |
| 発展観察 | `commissural-system` | 脳梁・脳弓標本 |
| 発展観察 | `midbrain-section` | 中脳核・大脳脚標本 |
| 発展観察 | `hindbrain` | 脳幹・小脳の脱着 |

分類は `src/blockPriority.mjs` に固定し、左レールを2群に分ける。全8標本、既存番号、直接URL、初期標本、前後移動、標本部品、代表断面、回転・カメラ、Canvasと配布assetは維持する。選択中の解説にも区分と観察理由を表示するが、同じ画面で「由来・確度・専門家レビュー状況を示さない」と明示する。

## 機械監査

`scripts/audit_block_priority.mjs` は次を検査する。

- 8キーが重点4＋発展4へ重複・欠落なく分類される。
- 重点4がロードマップの4標本と完全一致する。
- 未知キー、重複、空の理由、由来・確度・監修状態との混同、頻度や検証済みを示す表現を拒否する。
- `#workspace/blocks/<existing-key>` の8経路、初期 `lateral-ventricle`、既存番号と標本順を維持する。
- 既存のplane、position、focus、rotation、layers、tissue mode、mesh選択を維持し、優先度用mesh・voxelを追加しない。
- 学習者向け由来監査は `src/blockPriority.mjs` の同じ8キーを読み、222件の既存mappingとの対応を継続確認する。

再現:

```text
node scripts/audit_block_priority.mjs
node --test tests/block-priority.test.mjs
```

## 2026-08-24 ローカル確認

Windows Chrome 151のproduction preview `http://127.0.0.1:4315` で全8標本を順に選択し、重点4／発展4の区分、既存hash、選択中バッジ、Canvas 1、loader／UI error／横overflow 0を確認した。

同じbuildのcanonical route監査は `work/browser-audit/beta-route-audit-block-priority-2026-08-24.json` の27経路×3幅×direct/reload＝162/162件に合格した。cold初回payload監査も `work/performance/initial-route-payload-block-priority-2026-08-24.json` の27/27件に合格し、8標本は既存のexact asset allowlistとartifact-derived budgetを維持した。新しいatlas asset requestはない。

最終差分では全自動テスト323/323、TypeScript型検査、通常／Pages本番ビルド、beta status監査、Go/No-Go台帳監査、差分検査に合格した。Go/No-Goはローカル合格3、部分合格1、専門家待ち4、管理者待ち1、公開待ち3を維持し、この導線追加を専門家確認や公開完了の証拠として扱っていない。

## 未確認事項

この監査は、標本の解剖学的妥当性、切り出し範囲、切断幅、摘出順、実習頻度、専門家による優先順位、物理端末、実機タッチ、公開URL、別GPU・別ブラウザを確認するものではない。発展観察4を低品質・低優先度と判定せず、8標本すべての試作・未保証表示を維持する。
