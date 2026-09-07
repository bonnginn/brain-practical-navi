# 視床下部・周囲線維の追加資料調査 — 2026-09-06

目的は中脳／間脳の収載境界、視覚路・乳頭体付着部の未解決点に対して、同一標本の追加根拠が利用できるかを調べること。ユーザーの視床への発言を新しい誤り判定として扱う調査ではない。今回の採用・volume・mesh変更はない。

## 同一BigBrainを使用したJonesらの研究

[BigBrain公式コミュニティ](https://bigbrainproject.org/community.html)に2019年の手動視床下部分節の紹介がある。[2020年の著者発表資料](https://bigbrainproject.org/docs/4th-bb-workshop/20-06-26-BigBrainWorkshop-Jones.pdf)を取得し、6ページすべてをPopplerでレンダリングして個別に目視した。ローカル `work/jones-bigbrain-hypothalamus-2020.pdf`、38,261,315 bytes。

正規SHA-256: `94c85d8342915454a6d5f9728c86867fed8422cafc90dbe7635f4854ddf9e342`。

方法はBigBrain 2015の20 µm画像を用いたAtelier3Dでの注記。周囲線維と視床下部核の図が示される。ただし、この6ページにはアプリ格子へ変換可能なラベルvolume、座標変換、分節データの取得先やその再利用条件は示されていない。発表図の輪郭をトレースして現行500 µmへ貼り付けない。

この資料は「同一標本のより高解像度の確認に意味がある」ことを示す手がかりであり、500 µm/300 µmで曖昧だった境界が既に解決した証拠ではない。次の新しい画像確認では同じ解像度の繰り返しではなく、必要部位の高解像度データ取得方法を検討する。

## 別の組織学的研究

[Chervonnyyらの2023年研究機関記録](https://juser.fz-juelich.de/record/1018413)には、BigBrainの手動注記と深層学習を組み合わせた視床下部地図の作成が記載されている。この記録で直接利用可能な分節データを確認できたわけではない。研究の存在、データ取得、座標の整合、採用はそれぞれ別の段階とする。

## 名前だけで同一標本と誤認しない

[Zenodo 3942115](https://zenodo.org/records/3942115)も確認したが、これはNeudorferらの990人の生体MRIから作成した視床下部アトラスであり、JonesらのBigBrain手動分節ではない。MNIという共通名称やBigBrain背景での表示例があっても、この標本の境界ground truthとして上書きする根拠にはならない。今回データvolumeは取得・転写していない。

新たな公開データが存在しないと断定したわけではなく、上記の確認先では採用可能な同一標本ラベルを取得できていないという限定した記録である。著者への連絡や権限申請は行っていない。

## 後続：公式の100 µm局所原画像を取得

[公式ROI配布](https://ftp.bigbrainproject.org/bigbrain-ftp/BigBrainRelease.2015/3D_ROIs/Hypothalamus/mnc/)で `hypothalamus_full_100um.mnc` を発見し、`work/`へ取得した。これは分節ではなく濃度画像。SHA-256 `3a18798134c26515f0ad3543885fdbe22f25243060965611d6c9253c034c77b0`。40 µm版も掲載されるが、今回未取得。BigBrainの利用条件はOFFICIAL_TISSUE_ALIGNMENT_REVIEW.mdと同じく元データの条件を保持し、公開資産へ追加しない。

`inspect_hypothalamus_roi.py` が固定SHA、MINCのYZX格納順、各Y面のmin/max、方向余弦・mm単位を確認してXYZへ復号。XYZ shapeは474×176×390、start [-23.0666,6.34,-29.3777] mm、step各0.1 mm。min/maxは176面すべて0/65535で恒等変換。一般のMINCをこの方式で無条件に読むものではなく、非恒等な面別スケールは拒否する。軸・画素値・スケール異常・方向異常の新規Pythonテスト3/3成功。

`work/anatomy-review/hypothalamus-native100-inventory-v1/report.json` にhistory、表示濃度窓、画像SHAを保存。native Y index 0/35/70/105/140/175の6冠状面をすべて個別に目視した。これは取得範囲と細部が読めるかの初期確認であり、全176面の境界レビューではない。前後で脳室側壁・腹側組織・横走する線維束の形態が変わり、低解像度のみでは見えにくかった細部を検討する次の資料として利用できる。濃淡の極性は従来アプリ画像と異なり、黒背景で表示している。表示窓を解剖分類や分節閾値として使わない。

重要：このROIはnative座標であり、現在の改善ICBM座標ではない。現行ラベルをアフィンだけで重ねていない。公式配布にはhistological→ICBMの `bigbrain_to_icbm2009b_lin.xfm` と `bigbrain_to_icbm2009b_nl.xfm` があり、後者はidentity線形部＋grid指定。どちらをどう合成するかを名前で推測しない。[BigBrainWarp実装](https://raw.githubusercontent.com/caseypaquola/BigBrainWarp/master/scripts/bigbrain_to_icbm.sh)もhistological入力と旧sym入力で異なる変換を指定している。次はこの変換経路を確認し、対応原画像との位置・濃度照合を通してから現行ラベルを比較する。従来の3変位場だけをnative ROIへ直接使わない。

## 変換経路を実画像で照合

公式 `3D_Volumes/MNI-ICBM152_Space/transformation/` の線形・非線形XFMと変位場を取得。817,658,202 bytesの変位場はwork内にのみ保存。格子の小さな必要範囲だけを読み込み、範囲外は無変位として黙認せずエラーにする。

|資料|SHA-256|
|---|---|
|bigbrain_to_icbm2009b_lin.xfm|d2b9980b1212ed40dbe45693b548854fbf52eacd418926d31cbfb87786a56944|
|bigbrain_to_icbm2009b_nl.xfm|43ed6cff8ad7f0349981a463c97789a0fdb02f8bd5491a0e14ee3a52d0dc6a75|
|bigbrain_to_icbm2009b_nl_grid_0.mnc|03ba5b1c91d77f66f72ccbbee5044874fc45b1da6cdaffd4b2ac2111dec8f9df|

`audit_native_roi_transform.py` でnative格子の固定stride7点を抽出し、濃淡を反転して、保存済み2015 ICBM画像および改善ICBMの現行原画像へ照合した。source SHA固定。結果 `work/anatomy-review/native-roi-transform-v1.json`。共通非背景の判定は測定用であり分節用ではない。方法により共通点数が異なるため、相関値だけを同一母集団の改善率として扱わない。

|native→旧ICBMの試験経路|旧画像との相関|改善3grid後の現行画像との相関|
|---|---:|---:|
|非線形gridだけ|0.05693|0.05557|
|公式線形→非線形grid|0.88188|0.88564|
|公式線形だけ|0.38968|0.39523|

線形→非線形の共通点は旧画像61,690、現行61,686。2019のREADMEも改善変換の入力が2015 ICBM画像であることを再確認した。したがって本ROIでは **native→公式線形→公式非線形→既存の改善3grid** を比較用経路とする。MINC実行結果とのbyte同一性や境界の専門家承認ではない。補間は独立Catmull-Rom、濃度は三線形。

`render_native_roi_registered.py` により6面の100 µm原画像／対応する現行原画像／現行ラベル投影の三列図を生成。`work/anatomy-review/hypothalamus-native100-registered-v1` の全6枚を個別に目視した。nativeの冠状面が現行格子では曲面になることを明記し、単一app Y面だと称しない。6面とも脳室腔・左右腹側の組織・線維束の配置は対応する。細い裂隙・小片は現行500 µmでぼやけるため、完全同値ではない。

- native Y35の乳頭体周辺は現行39/40と局所的に対応するが、この一面で全付着境界を承認しない。
- native Y70の混合33は視床下部側へ帯状に張り出し、Y105では下方の横走組織に及ぶ。旧33をそのまま視交叉・視索として使えない所見を高解像度でも確認した。
- Y140/175では腹側に分離した組織片が見える。神経・視交叉・視索のどの区間かを単独面やY値だけで決めず、連続性を確認する。

ここまで6代表面であり、全176面の精密分節は未完了。新規安全性テスト3/3（範囲外拒否・入力SHA・変換順序）成功。先行ROI復号3/3と別。public volumeはe7e61a70…不変。次はこの新しい100 µm資料で視覚路・乳頭体周辺の局所連続断を追い、実際に確定できる修正範囲を限定する。中脳上端全域を含むROIではないので、これだけで中脳修復の完了とはしない。
