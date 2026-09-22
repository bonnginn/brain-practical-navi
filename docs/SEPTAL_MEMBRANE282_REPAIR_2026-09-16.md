# 透明中隔（部分）の採用記録 — 2026-09-16

## 採用範囲

左右側脳室前角間の薄い正中壁について、登録300 µmの冠状31面・直交33面とnative 100 µmの候補輪郭18面を確認し、内部282点だけを0→新ID43「透明中隔（部分）」へ変更した。広い下方付着部、Y301–305の脳梁付着候補、中隔核、脳弓は含めない。

適用前ラベルSHAは小脳修正後の `cbbf21552628767d4d19a146229490ce34c661947bbc3948eac6080bae76a4f0`、この修正の適用後SHAは `4e9b48aa687e21f38d140dd4745319875112130c84301434e68ce4713ba27b5f`（raw voxel SHA `fa6fb2208dffbc12ed725c4b2f092a0e80da0667b0dfa5a8eff6a828283bcc31`）。decision SHAは `7b0dd21728b4fbffcfab68c6ffb87a1128daf370a678b0ce5e3073631b82fe2a`。可逆採用記録は `segmentation-patches/review/septal-membrane282-adoption-2026-09-16.json`、stage生成は `scripts/stage_septal_membrane282.py` に固定した。

## 原画像資料の採否

`work/nonventricular-20260915/white-band/septum-native100-v3/` はnative変換の欠落、`septum-candidates-v1/native-sampling-v1/` は登録300 µm値をnative値として扱った誤りがあり、採用根拠から除外した。削除せず保存しているが再利用しない。実native画像から再計算した主担当の `septum-candidates-v1/native-sampling-root-v2/` と `native282-review-v2/` を用いた。原判断 `primary-decision282.json` に採用資料と除外資料を固定している。

## 形状と限界

282点は8成分（181、71、12、7、5、3、2、1点）。0.5 mm実ラベルから無平滑・無穴埋めで独立断面meshを再構成し、8成分間を補間していない。したがって、間隙を解剖学的な開窓の完全地図とは扱わず、透明中隔全体の完成分節とも扱わない。既存55ブロックのmaskと既存断面mesh形状は不変で、独立した部分meshだけを追加した。

これはAI画像照合を含むプロジェクト内採用で、専門家未確認。通常クイズ対象外で、公開版には未反映である。前交連はその後、別の416点部分採用として記録した。[前交連の記録](ANTERIOR_COMMISSURE_CORE416_REPAIR_2026-09-16.md)。

## 参照資料

- Naidich et al. (1986), “Anterior commissure: anatomic-MR correlation”: https://pubmed.ncbi.nlm.nih.gov/3941867/
- Barany et al. (2020; online 2019), “Neural and vascular architecture of the septum pellucidum”: https://pubmed.ncbi.nlm.nih.gov/31374555/
- Barany et al. (2024), “Topographical anatomy of the septum verum”: https://doi.org/10.1038/s41598-024-68464-x

Naidich 1986は前交連の正中部と左右走行を比較する資料、Barany 2020は透明中隔・下方中隔領域・脳弓の位置関係、Barany 2024は中隔領域と下方付着部の組織学的文脈として参照した。別標本の境界は今回の282点へ転写していない。
