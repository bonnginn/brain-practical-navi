# BigBrain聴覚路アトラスの利用可能性 — 2026-09-06

## 2026-09-07 著者の表示問題報告を追加確認

[著者のIssue #2](https://github.com/sitek/subcortical-auditory-atlas/issues/2) と [解決コメント](https://github.com/sitek/subcortical-auditory-atlas/issues/2#issuecomment-832022372) を読み取り専用で確認した。最初はBigBrainの左蝸牛神経核が見えないと報告されていたが、著者は後にFSLeyesで表示でき、Freeviewに固有の表示問題と判断して閉じている。これを原アトラスの左側ラベル欠損の根拠にしない。

Issueに添付されたBigBrain表示図と数値一覧図をブラウザで実際に目視した。後者は `sub-bigbrain_MNI_conjunction_rois.nii.gz` の数値0–8の存在を示すが、番号と名称の表ではない。前者も全8値の名前を確定できる注記を持たない。したがって今回も正式番号キーの未確認は解消しない。現アプリへの位置合わせや全連続境界の確認を代用する資料でもない。

固定commitの `atlases/README.md` はBigBrain組織、in-vivo機能MRI、別標本postmortem MRIの3ファイルを区別している。OSF公開APIでderivatives/MNI_spaceの一覧も再確認できたが、この一覧には番号キーも独自補正warpもない。他標本の線維路や番号配列をBigBrainの聴放線分節として採用しない。今回の追加確認でアプリ・label・meshを変更していない。

## 新しい根拠と、直ちに採用しない理由

[Sitek et al. 2019, eLife](https://elifesciences.org/articles/48932)の
BigBrain histology segmentation、BigBrain data、Correction of the alignment、
Data availabilityを確認した。蝸牛神経核・上オリーブ複合体・下丘・内側膝状体の
同一BigBrain標本由来ラベルがある。VIII神経の一部は標本に残るが切断されており、
**著者はVIIIを組織アトラスにラベル化していない**。別標本の死後MRI版にある
VIIIラベルをBigBrain由来と取り違えない。

著者は下丘周辺の元MNI登録の問題を検出し、局所置換とFNIRTによる独自の
再登録を実施している。したがって名前がMNIであっても、現教材のXiao補正空間へ
そのまま貼る根拠にならない。まず対応する原画像・変換の照合が必要。
これは前回のVII/VIII短縮を解剖学的に承認する資料ではない。

## 取得したファイル

[著者リポジトリ](https://github.com/sitek/subcortical-auditory-atlas)の固定commit
`2b73fb3e1f0afef8c3c487bf86c9bf61f6b04d51`、
`atlases/sub-bigbrain_MNI_conjunction_rois.nii.gz`をworkのみへ取得。
OSFページはweb取得エラーだったが、著者READMEに同じデータをGitHubにも
複製したと明記されているため、その公開ファイルを使用した。

- 圧縮サイズ1,467,841 B、SHA256 `4327588dc0d2beae92a4f47d48af674235bfcd8742ca71a2592a91aa46994e91`
- NIfTI-1 float32、720×600×840、0.1 mm、sform原点約[-38.2284,-54.2106,-56.1836]
- nibabelヘッダ読みと独立structヘッダ読みで形状・affine一致
- `audit_external_auditory_atlas.py`はスライス単位で全データを読み、非有限値・非整数値・切断payloadを拒否
- `work/auditory-atlas-sitek/inventory-v1.json`に数値IDごとの点数とbboxを保存

|数値ID|voxel数|
|---|---:|
|1|34448|
|2|29422|
|3|4170|
|4|7953|
|5|56701|
|6|69628|
|7|86972|
|8|62857|

**名称対応表は未確認**。座標から名称を推定して承認しない。
`code/invivo/diffusion/02_analysis/dipy_atlas_target.py`のROI配列は
in-vivo解析用であり、このhistology多値volumeの番号表とは認めない。

## 権利と次の作業

リポジトリLICENSE.md全文を確認：Sitek/Gulban 2019 BSD-3-Clause。
BigBrain原資料の条件が消えるとは解釈せず、現段階では比較調査用work保存のみ。
アプリ・配布資産・クイズ・公開サイトへの採用なし。READMEの公開機能にも追加しない。

次は著者の数値ラベル対応表と、corrected-MNI原画像／変換の所在を確認する。
その後、局所対応が検証できた範囲だけ原画像と比較する。VIII根そのもの、V/IX–XI
の根出口、全神経根糸の解決策としてこのデータを過大評価しない。

## 対応する補正原画像の取得・表示確認

OSF公開APIでData→derivatives→MNI_spaceを確認できた。通常webページの取得失敗を
データ全体の利用不可とは扱わない。[著者原画像](https://osf.io/v32ft)は
`sub-bigbrain_MNI_100um_bstem_corrected.nii.gz`、282,998,996 B。
OSFのversion1 metadataにあるSHA256と取得ファイルが一致：
`756f6bad1b3a7a0c1abd1fb1e34089d45c1b20ea346fda23835fbfe268c9f7ff`。
work/auditory-atlas-sitekへ保存。721等への丸めではなく720×600×840、0.1 mm。
int16にscl_inter=32768を加える必要があり、符号をそのまま輝度にしない。
画像とconjunction labelのsformは全要素完全一致（現教材との一致ではない）。

`render_external_auditory_context.py`は全量展開せず、各ROIをスライス読みで切り出す。
8数値ID×三方向中央面=24比較、8 PNGをすべて個別目視した。
ID1/2は表面近傍の曲がった帯、3/4は細い深部帯、5/6は濃染中心をもつ背側隆起、
7/8は上位外側の淡い組織領域を囲む。これは中央面での形状所見であり、正式番号表の
代用・全連続境界レビュー・現教材への位置合わせ成功ではない。

`work/verify-auditory-context.py`で別のnibabel読込とスケール処理を使い、全8水平面の
raw表示画素をPNGと完全比較して一致。図SHAとaffineも一致。
`work/auditory-atlas-sitek/context-v1/report.json`とpixel-verification.json参照。
冠状・矢状の画素全比較はこの独立検査には含めず、画像目視24面と区別する。

番号表はなお未確認。OSF親wiki（home version10）とMNI_space/atlases全3ファイル一覧に
対応表はなかった。Dataノードwikiはdisabled。別raterのOFG02/KRS02も存在するが未取得。
次は補正原画像と現300 µm原画像の局所対応の診断が可能になった。
名称未確認のラベルを新規教材構造として採用しない。アプリ・volume・mesh・公開は不変。

## 同じ物理座標での直接比較：直接転用を不採用

`compare_auditory_registration.py`で著者100 µm像と現教材に対応する公式Xiao300 µm像
（SHA ebf0e88d…）を、同じ物理座標で並べた。右側は300 µm像の三線形補間であり、
100 µm原画像とは呼ばない。外部8 ROI×中央三方向24比較・8 PNGを全個別目視。
`work/auditory-atlas-sitek/same-world-v1/report.json`に原画像hash・crop・面・図hashを保存。

ID1/2近傍では表面突起や隣接小脳の位置、3/4近傍では細い濃染帯、5/6近傍では
背側隆起と濃染中心にずれがある。7/8でも外縁・内部目印が完全には対応しない。
解像度差に伴うぼけはあるが、ぼけだけを理由に位置差を無視できない。
各面の背景寄与を抑えた強度相関は0.0825–0.7579で、これは診断用の数値であり
精度・解剖学的正解・変形誤差(mm)の指標ではない。

**同じMNI座標だからそのまま移す方式は不採用**。原画像同士の局所変形の検証が必要。
単一平行移動で全領域が一致する証拠もない。現時点でlabel/key対応未確認を維持し、
外部ラベルから神経根を置き直す変更は行わない。取得済み原画像は追加の比較に利用可能。
既存24中央面の表示成功を全連続断の境界承認として扱わない。

## 局所平行移動の診断（不採用）

`fit_auditory_local_translation.py`で画像のみを用い、各ROIを0.4 mmで標本化し、
±4 mmの平行移動を2つの初期位置から推定した。チェッカーボード状に分けた
半数の画素で最適化し、もう半数で相関を確認。背景・低信号除外の規則は固定。
隣接画素のholdoutは独立した解剖学的検証ではない。

|数値ID|未使用画素の相関：前→後|
|---|---|
|1|0.378→0.411|
|2|0.398→0.452|
|3|0.299→0.470|
|4|0.108→0.538|
|5|0.196→0.223|
|6|0.139→0.295|
|7|0.651→0.663|
|8|0.598→0.691|

全8件でoptimizerは終了し、探索端には接触しないが、特に5/6は一致度が低い。
1/3は初期位置による推定差も約0.282/0.102 mmある。局所の別々の平行移動は
連続した変形場ではなく、推定値をラベル／神経の移動量として採用しない。
`work/auditory-atlas-sitek/translation-v1.json`に全値と条件、2初期位置の結果を保存。
全体の回転・局所変形や補間差を未検証のまま「位置合わせ済み」としない。
次の候補は公式Xiao変換と著者補正の関係の照合。単純shiftの再試行を繰り返さない。

## 公開Xiao変換の直接適用仮説：部分的対応、全域採用不可

`compare_auditory_registration.py --published-chain`で公開XFMの3グリッドを
順方向に合成し、著者補正空間の座標へ直接適用する仮説を調べた。
XFMと全グリッドの固定SHAを確認し、Catmull–Rom補間を使用。
著者の独自補正の逆変換は未取得・未適用で、入力空間の互換性は未確定。
`work/auditory-atlas-sitek/published-chain-v1/report.json`に条件と図hashを保存。

全8 PNG・三方向中央24面を個別目視した。ID1/2は表面の小突起と隣接小脳、
3/4は細い内部濃染帯、7/8は外縁と内部目印の対応が改善して見える。
しかし5/6は背側隆起と濃染中心が大きくずれ、同じ部位を比較できていない。
数値IDを正式名称へ割り当てる証拠とはしない。

面ごとの強度相関は1–4で0.9072–0.9827、7/8で0.8609–0.9766に対し、
5/6は0.0282–0.4240。これらは診断値であり、境界精度や解剖学的正解率ではない。
外部画像の補正が局所で異なる可能性と整合するが、この実験だけで原因を断定しない。
**この変換による全8領域の一括転用は不採用**。良好に見える6領域も中央面のみであり、
名称対応表・連続断・境界の位置合わせ検証を省略して教材ラベルに採用しない。
次は著者補正の変換／範囲情報と番号キーを調べ、未取得なら未解決事項として明示する。
製品のvolume・mesh・アプリ、main、公開サイトの変更なし。

## 著者の処理経路・ヘッダを追加確認

固定commitのGitHub再帰treeを確認した。`code/histology`には説明1行のREADMEのみで、
このtreeにhistologyの補正warp・mask・番号対応表は見つからなかった。
`flowcharts/histology/bigbrain-mni_correct_colliculi.dia`をメモリ内で展開し、
XMLの全textを読んだ。手動対応mask→convex hull→transport map→移植画像→
topology-preserving warp→100 µm補正という工程は記載されるが、
`*_mask1.nii`、`*_OTMwarp.nii`、`*_cout.nii`等は名前の型であって取得可能な変換実体ではない。
TODO表記も残っているため、図を完成済み再現コードとは扱わない。

一方、[著者のヘッダ修正コード](https://github.com/sitek/subcortical-auditory-atlas/blob/2b73fb3e1f0afef8c3c487bf86c9bf61f6b04d51/code/MNI/nii_fix_header_100um_bstem_MNI.py)
は0.1 mmと原点[-38.2284,-54.2106,-56.1836]を明記している。
取得ファイルのsformと丸め精度で対応し、今回の座標原点が独自推測ではないことを確認。
ただしこれはcropped MNIのヘッダ配置であり、著者の下丘補正の逆変換ではない。
原点を手動調整して5/6の残る不一致を解消したことにしない。

この調査で取得できる範囲では、番号キーと補正の実体不足は未解決。
外部atlasの一括採用を保留し、既存原画像で進められる他の境界監査へ戻る。
追加の取得・ユーザーへの連絡依頼なし。既存の比較画像とレポートは保持する。
