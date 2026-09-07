# 手動22ラベルの位置合わせ採用（2026-09-06、開発版）

赤核ID1・2に続き、黒質、視床下核、尾状核、被殻、淡蒼球内節・外節、視床、海馬、側坐核、扁桃体の左右ID3–22を採用した。既に完了した原画像・連続断・直交断・高精度差分レビューに基づく、公式変位場による元手動区画の位置補正である。新規の独立分節、専門家レビュー、研究ground truthではない。根拠は MANUAL_REGISTERED_REVIEW_CONCLUSIONS.md と同文書が参照する図・監査記録。

## 変更と保持

- 赤核のみ採用したcec9…版から137,228 voxel変更。既にレビューした全22合成候補とraw全格子一致。
- 旧位置の48,893 voxelは未ラベルへ戻す。組織不存在や画像背景という意味ではない。
- 粗い脳幹・内包27/31/32との2,522点は、レビュー済み元手動区画を優先。内包・脳幹全体の境界修正完了を意味しない。
- 左側脳室との競合1点 XYZ [173,262,184] はID23のまま保持。
- 赤核、脳室、乳頭体、脳梁を含む保護対象マスクは完全一致。内部の白い帯を輝度しきい値で切り抜かず、新たな亜核・線維境界を推測しない。
- 関連する21ブロック部品と側坐核部品、計22 meshを既存生成条件で同期。変更前meshの再生成が全件byte一致することを確認してから置換。周辺組織の切り抜きも既存規則を維持した。
- 別由来のMNI/CerebrA全脳3Dモデルまで全て再分節したわけではない。粗い内包、視覚路の混合ID33、海馬亜区分、溝の着色、模式神経根・血管の限界は残る。
- ID33自体は不変だが、隣接する左扁桃体の位置補正で両者の6面接触6点が解消した。現行客観監査は別名で保存し、過去監査を上書きしていない。

## 固定版・再現

- 入力fixture: tests/fixtures/bigbrain-practical-segmentation-pre-remaining-registration-cec9.bin.gz
- 出力compressed SHA-256: `7ebed144c2b200233ad1389d3288b2407edcb542fe46eaf8626ef872522f8c3f`
- 出力raw SHA-256: `153ba1ede7988736785a127f42b50793427e50e6f029e46bd9a69218a3920834`
- 可逆RLE差分: segmentation-patches/review/remaining-manual-registration-project-adoption-2026-09-06.json
- mesh前後SHA台帳: segmentation-patches/review/registered-dependent-meshes-2026-09-06.json
- `scripts/adopt_remaining_registered_labels.py --install-development` は版固定入力・差分・出力・逆再生を検証する。
- `scripts/prepare_registered_label_meshes.py --output work/<new-directory>` でmeshを生成し、`scripts/install_registered_label_meshes.py --staged work/<new-directory>` で全件事前検証後に導入する。生成にはローカルBigBrain画像とNumPy/SciPy/scikit-imageが必要。
- MINC nativeとのbyte同値性は未確認。変換残差の小ささは解剖学的誤差の保証ではない。

元データ、ライセンス、帰属条件は不変。main統合・公開サイト更新は行っていない。

## 今回の検証結果

- Python全91/91成功、Node全493/493成功、TypeScript型検査成功。
- 通常・Pagesベース本番build成功。既存の500 kB超chunk警告は残る。
- 導入後に22 meshを再生成し、全前後SHA・頂点数・面数を含むmanifestがbyte一致（SHA `9f963ddc75101adaf23832a3af326e260bfaab06340b6c62ba145fb457225f24`）。
- Windows / Chrome152、loopback4345で12件の実ブラウザ読み込み確認成功。PC1366×768: 3方向断面、関連7ブロック、クイズ。390×844: 水平断。canvasはPC断面3、他1。全件loader終了、request/UI errorなし、WebGL fallbackなし、横overflowなし。
- 生データは `work/remaining-browser-v2-*.json`。これは起動・読込健全性確認であり、全ボタン操作、ピクセル単位の解剖学的正しさ、物理スマートフォン確認の代わりではない。
- 初回ブラウザ失敗 `work/remaining-browser-sections-horizontal.json` は保存。並行NodeテストのPages buildがdistを置換していたためローカルroot配信で資産パスが不一致となった。通常buildを復元後、別名v2で上記12件を確認。公開サイトの障害ではない。
- 旧固定検査値は、新しい固定RLE差分とmesh台帳に照合して更新。基底核経路の断面対象7項目とPapezの断面対象3項目は全て画素を保持。乳頭体120画素は不変。
- `git diff --check` 成功（WindowsのCRLF変換警告のみ）。未コミット・未push。

旧研究スクリプトの098edf…入力固定は意図的に履歴のまま残る。現在volumeをその旧入力として渡さず、保存したpre-red fixtureで再現する。上記の新規採用・mesh手順は別の版固定工程であり、元NIfTIからの一括buildへ暗黙に混ぜていない。
