# 中脳腹側の局所補修 — 2026-09-08

開発用BigBrain ID27へ **正味14,789 voxel** を追加。大脳脚側で既存ラベルが直線的に途切れる下方の一部を補った。未公開・専門家未確認。上位の視床下部／間脳境界や脳幹全体を確定したものではない。

## 判断と保留

- 登録300 µm原画像で、既存ID27に対応する水平組織成分と0.5 mm有限セルの組織支持を探索。raw値62000未満の支持率80%以上を候補としたが、数値だけで採用していない。
- 探索v3の13図39面（全水平24面、代表矢状9面・冠状6面）を目視。左右の腹側組織に明瞭な塗り落としがある一方、右内側側頭部などへ外れた候補を認めた。
- 既存ID27との6近傍連続性で315点を除外し、残る14,803点の13図38面（水平24・矢状9・冠状5）を再確認。原画像の外縁に沿う部分補修として準備した。直交断は代表確認で全native面の監修ではない。
- 適用後の客観的な接触検査で、最上層Z115の14点が既存ID33・39・40へ新たに接することを検出。元画像で新しい付着境界を確定する対象にはしていないため、この14点は直前の0へ戻して保留。組織不存在の判定ではない。最終追加14,789点はすべて元のID27へ6近傍で連結する。
- 元の非0ラベルはすべて不変。黒質・赤核・乳頭体等の既存区画を保持し、旧混合ID33を分割したり正答対象にしたりしない。

作業範囲は app XYZ `[145,215,104]`–`[248,251,116)`。この箱は部分作業の範囲であり、解剖学的な終端ではない。より上方の大脳脚側にも不足が残る。ユーザーの参照線の押し出しやVentralDC一括合併はしていない。

## 出典と再現性

直接根拠は従来のXiao配布・登録済みBigBrain300 µm画像、SHA `ebf0e88def96476d0a32ddaff6f28e37d7afd125dec724e6d8855b12357c7e86`。原画像・ライセンスに変更なし。

参考としてIglesias et al. (2015), *Bayesian segmentation of brainstem structures in MRI*, Appendix Bを保存済み著者PDF p13で再読。[DOI](https://doi.org/10.1016/j.neuroimage.2015.02.065)。MRIの分節規約を自然な組織境界と同一視せず、補助線を本標本へ転写していない。今回、公開PDF再取得はtimeout、PMCはブラウザ確認画面となったため、既存のSHA照合済みローカルPDF・p13画像を使用した。詳細は [上位境界の既存記録](MIDBRAIN_BOUNDARY_PROTOCOL_REVIEW.md)。ブラウザ内参考文献にも日英で追加し、計12件とした。

| 段階 | 圧縮ラベルSHA-256 |
| --- | --- |
| 側脳室修正後・中脳補修前 | `976684fb22e372f3b0942190d2a8985bc41b1535cd56e332e7a055f5b6d88ffb` |
| 腹側14,803点追加 | `409dac37154b25dd6bc9caa387c4aa5a7b774cb430794c082bdfc956e874f7b5` |
| 接触部14点を保留した最終版 | `0662770388033cafa573337ab9349efd8b30888bc864566fe4d116de704a0b17` |

最終voxel列SHA `ccea376ca68aa638dd722c2279f3b624e6fafb16cd3e6f7ff73b47f77da0d24c`。ID27は249,816→264,605点。側脳室81,455／82,197、第三脳室11,853、第四脳室9,008、部分水道259を含め他IDは不変。

採用記録（両方を順に再生し、14点の保留経緯も保存）：

- `segmentation-patches/review/midbrain-ventral14803-adoption-2026-09-08.json`、SHA `fbfb4963986a67627f8b5ba8ed6a6c900768bab5bd2f75e2720246d9eb73e95e`
- `segmentation-patches/review/midbrain-interface14-adoption-2026-09-08.json`、SHA `635600b0de7bb17a96c3c61a9ca30eb4b6ad302101907a45f8dd4f444e65361d`
- 初期探索 `work/anatomy-review/lower-midbrain-ventral-tissue-2026-09-08-v3-partial-context/report.json`、SHA `492e59958130b2569ccddd7d9c3adc8b8d68e4633c2bff1c63c8454252a21ef2`
- 連結性で除外後の画像 `work/anatomy-review/midbrain-ventral-connected-v1/report.json`、SHA `ab83eea4385e33decaa7eb42cb15476bc2b5d091f51077bde9759bc54baf1bff`

旧volume・変更前meshはfixtureに保持。新規315点除外の黄色輪郭と採用候補の赤い輪郭を原画像上で区別した。最後の14点保留は上位の接触検査による追加判断で、元の候補図は履歴として変更しない。

## 3Dと検証

全55ブロックmaskを比較。変更は中脳横断の組織814格子点と、後脳ブロックの中脳1,801格子点の追加のみ。1 mm生成格子の点数で、0.5 mmラベル点数とは異なる。14点保留は既存の1 mm標本化に影響せず全55mask不変。旧mesh byteを再現し、両変更meshを同期。脳室系の断面meshと部分水道meshは全byte不変。

今回の修正対象はBigBrain断面ラベルと派生ブロックであり、脳表画面の別のMNI脳幹モデルは置換していない。模式大脳脚や模式神経の形状も未変更。

専用Python5/5、全Node591/591、全Python343/343、型検査、通常／Pages build成功。客観的な乳頭体／旧視覚路監査を最終版で再生成し、以前の接触関係を保持したことを確認。初回Nodeの旧中脳mesh固定値1件は、変更前fixtureを残し、今回の明示的な後継meshを検証するよう修正後、全件再成功した。

ローカル4346で最終圧縮ラベル・変更2meshとメタデータの配信bytesを照合。実Chromeで水平Z110の断面＋3D、中脳横断／後脳ブロックの初期描画、日英の利用条件内参考文献12件を確認。右のユーザー画面は側脳室Z156を保ち、最終revisionへ更新した。全操作・全境界の専門家監修ではない。main統合・push・公開更新なし。

検証ログ：`work/midbrain-final14789-full-node-v2.log`、`work/midbrain-final14789-full-python-v1.log`、`work/midbrain-final14789-typecheck.log`、`work/midbrain-final14789-normal-build.log`、`work/midbrain-final14789-pages-build.log`、`work/midbrain-final14789-http.log`。
