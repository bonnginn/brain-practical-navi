# 小脳葉の局所修正 — 2026-09-16

## 採用範囲

登録300 µm画像の連続冠状断、直交断とnative 100 µm画像で、既存の左右小脳ラベルへ帰属する葉内部を局所確認した。採用は明示した197点だけで、0→28が153点、0→29が38点、27→28が6点。ID0は191点減り、ID27は6点減り、ID28は159点、ID29は38点増えた。

適用前ラベルSHAは `055feec985e9b3a007e7856904cef0f36bbc7b00040061fdcba5d5d74820c491`、適用後は `cbbf21552628767d4d19a146229490ce34c661947bbc3948eac6080bae76a4f0`（raw voxel SHA `9cd07b3da5b94ce59a9fb1800ee440b120bd1da6be85fd5087eb003c59238b71`）。decision SHAは `9cfba4dbfc4efb6b28bc295787b7531a66d8aceac7e4ed66f1080a253c7ebb3e`。可逆採用記録は `segmentation-patches/review/cerebellar-folia197-adoption-2026-09-16.json`、stage生成は `scripts/stage_cerebellar_folia197.py` に固定した。

## 保留と同期

元の202候補のうち5点は、新しい孤立3成分を作るため保留した。削除した組織と断定したものではなく、周囲の葉の収載と一緒に再評価する。成分をつなぐ補間、平滑化、鏡像コピーは行っていない。55ブロックではhindbrain/cerebellumだけが粗格子22 voxel変化し、他54部品は不変。断面用の小脳・脳幹meshは0.5 mm実ラベルから更新した。

これはAI画像照合を含むプロジェクト内採用で、専門家未確認の部分修正である。公開版には未反映であり、小脳葉全体の境界完成を意味しない。

## 参照資料

- Naidich et al. (1986), “Anterior commissure: anatomic-MR correlation”: https://pubmed.ncbi.nlm.nih.gov/3941867/
- Barany et al. (2020; online 2019), “Neural and vascular architecture of the septum pellucidum”: https://pubmed.ncbi.nlm.nih.gov/31374555/
- Barany et al. (2024), “Topographical anatomy of the septum verum”: https://doi.org/10.1038/s41598-024-68464-x

上記3報は同じ作業枠で隣接する前交連・中隔領域を区別するための比較資料であり、小脳197点の個別境界を転写した出典ではない。
