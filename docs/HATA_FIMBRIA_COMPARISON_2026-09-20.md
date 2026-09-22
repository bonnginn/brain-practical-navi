# HATA参考輪郭と海馬采前端の比較

元の脳弓・視覚路・脳室改善目標を再開し、追加取得したHATA注釈が海馬采前端の判断に使えるか確認した。扁桃体細分化への作業変更ではない。

## 新たに確認した証拠

- [HATA参考輪郭](https://doi.org/10.25493/DW5A-YMD)のZIP内28 PNGを読み、非零領域と範囲を記録した。値は0/255で、左右別の値は付いていない。注釈が片側にしかない断面を、反対側の構造が存在しない証拠にはしない。
- [公式2015再構成冠状断](https://ftp.bigbrainproject.org/bigbrain-ftp/BigBrainRelease.2015/2D_Final_Sections/Coronal/Png/Full_Resolution/)の3616・3841を取得し、引きの全体図、無注釈拡大図、HATA輪郭を比較した。
- 原画像6572×5711に対し注釈6573×5712。表示では左上を合わせて余分な端1画素を除外した。これは概略位置の比較であり、精密な画素一致を主張しない。
- [公式配信info](https://neuroglancer.humanbrainproject.eu/precomputed/BigBrainRelease.2015/8bit/info)・[transform](https://neuroglancer.humanbrainproject.eu/precomputed/BigBrainRelease.2015/8bit/transform.json)と[変換手順のRIA方向](https://neuroglancer-scripts.readthedocs.io/en/latest/examples.html#conversion-of-bigbrain)を使用。切片番号をそのままnative100のYへ割り算する方法ではない。今回の対応はnative100 Y752.6・797.6となる。
- 現行ラベルSHA `68b1c10d263f0f730334e3acbf633ef1659ab615b71dd27cdbfb312aa36d37d0` の海馬・脳弓を既存の公式変換連鎖で重ね、2比較図を目視した。黄色の現行海馬外形が概略対応する。ピンクのHATA注釈は海馬頭の組織内にあり、海馬采の表面白質帯として代用できない。

## 判断

今回の2断面・表示範囲には現行ID46がなく、HATAとの重複もない。これは海馬采前端を現在より前へ延ばしてよいという根拠にはならない。一方、HATAの名称だけから海馬采を追加する誤りを、同一標本で具体的に排除できた。

現在採用済みの左Y720・右Y730までの海馬采を維持する。今回確認したHATAは前方の位置関係を説明する比較資料とし、ID46へ転用しない。前端の未確証範囲を解消した、全長を完成した、とは扱わない。

**次の作業**：この資料を使った同じ前端探索は反復しない。視放線の標本由来部分と模式表示の範囲の整理、残る脳室小片の教材上の影響確認へ移る。概略形態を優先するが、不明な白質を接続のためだけに塗らない。

## 保存

`work/hata-fimbria-comparison-20260920/` に公式原画像、配信座標メタデータ、`render-current.py`、`current-report.json`、`current-3616.png`、`current-3841.png`。PNG一覧は `work/bigbrain-survey-verification-20260920/hata-png-inventory.json`。

今回ラベル・メッシュ・製品説明は変更なし。新しい証拠の位置比較のみなので、全件試験・buildは未実施。分節採用と最終統合・実ブラウザ確認は目標全体として未完了。
