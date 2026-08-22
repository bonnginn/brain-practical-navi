## 変更内容

何を、なぜ変更したかを簡潔に記載してください。

## 対象

- [ ] 解剖学的内容・ラベル
- [ ] セグメンテーション差分JSON
- [ ] 断面・3D表示
- [ ] 脳表・ブロック標本
- [ ] クイズ・教材文
- [ ] UI・アクセシビリティ
- [ ] データ・ライセンス
- [ ] その他

## 根拠と権利

- 解剖学的変更の根拠（書誌情報または公開URL）:
- 追加素材の出典・ライセンス:
- 第三者の標本写真、教科書・講義図版を含まない: [ ]
- 試作／未確認と検証済みの区別を維持した: [ ]
- AI支援ツールを使った場合の用途と、本人が確認した範囲:

## セグメンテーション変更時

- 提出者が記載した対象構造（ID・名称）:
- 提出者が記載した元ラベルSHA-256:
- 対象構造・左右・水平断Z範囲:
- 添付した差分JSON:
- 差分JSONの`targetStructures` / `sliceRanges` / `changeSummary`:
- `apply_segmentation_patch.py --check` の結果:
- 他の差分と組み合わせる場合の競合検査結果:
- 競合がないこと、または競合箇所と採否方針:
- 隣接断面で連続性を確認した: [ ]
- 意図しない変更前→変更後ラベルがないことを確認した: [ ]

## メンテナーの採否記録（セグメンテーション変更時）

- `review.decision`: `unreviewed` / `approved` / `rejected`
- `review.reviewer`（`kind`: `github` または `project-role`、`id`）:
- `review.decidedAt`（YYYY-MM-DDまたはRFC3339）:
- `review.reason`（採用・差戻し理由。差戻し時は不足確認事項を明記）:
- `review.pullRequest`（正の番号、40桁hexのmerge commitまたは`null`）:
- 更新後JSONの`workflowMetadataVersion`、対象構造、断面範囲、変更内訳を再確認した: [ ]

## 確認

- [ ] `npm run build`
- [ ] `npm test`
- [ ] UI変更を該当画面で確認した
- [ ] DCO 1.1に同意し、コミットへ `Signed-off-by` を付けた

## クレジット

採用時の希望表示名・担当分野（任意）:
