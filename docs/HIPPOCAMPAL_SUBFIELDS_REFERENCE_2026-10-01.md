# 海馬の細区分を使った同一標本比較

2026-10-01、現行SHA84f56821を、BigBrain公式配布の左右CA1・CA2・CA3・CA4・歯状回（DG）・海馬台（Sub）の12表面モデルと比較した。以前の体部18図と同じ原画像を再発見した作業ではなく、組織層・海馬台の区分を示す新しい資料を加えた比較である。今回ラベル・mesh・ブロックは変更していない。

## 資料と実際に確認した範囲

- [公式配布ReadMe](https://ftp.bigbrainproject.org/bigbrain-ftp/BigBrainRelease.2015/Hippocampus_Segmentation/ReadMe.txt)は、CA1〜CA4・DG・Sub・中間面を列挙し、[DeKraker et al., 2020](https://doi.org/10.1016/j.neuroimage.2019.116328)を出典としている。論文抄録・ReadMe・実ファイルを確認。論文全文の閲覧は取得先403で完了していない。
- 各GIfTIの実座標と三角形からnative100断面との交線を計算し、原画像・公開細区分輪郭・嗅内皮質輪郭・現行海馬17/18／扁桃体21/22／脳弓46を4列で比較した。GIfTIの座標系メタデータはunknown-to-unknownであり、形式だけでnative座標だと断定しない。実際の原画像との位置・折りたたみの対応を確認した。
- 左X478/504/538、Y611/692/742、Z422/459/518。右X906/949/982、Y655/727/763、Z432/468/534。6枚の三面組、計18面を全目視した。軸ごとの頂点分布25/50/75%の代表面であり、全連続面・全外縁の確認ではない。
- 同一標本の嗅内皮質左右2配信も実解像度・transformを保持して取得し、公式登録列で現行格子へ投影した。左10,315点のうち現行海馬との交差57点、右11,262点は交差0点。座標の一致率だけで採用／除外はしない。嗅内皮質は海馬本体へ一括追加する資料ではない。
- 嗅内皮質の位置と層構造は[Behuet et al., 2021](https://doi.org/10.1007/978-3-030-82427-3_1)の本文Methods・導入と図説明を確認。[Kedoら2025の学会資料](https://juser.fz-juelich.de/record/1048413/)には新しい12区分の構築が記載されるが、今回取得した2020年の6表面と同一のラベルセットではない。新12区分の実配布・境界照合が完了したとは扱わない。

## 判断

公開CA・DGの輪郭は、原画像の巻き込む海馬の層に対応する。現行の海馬はこの本体を概ね含む。一方、Subの帯は現行輪郭の外へ続く面があり、単に暗い未着色組織をすべて塗り残しとすることはできない。海馬台を海馬本体と一体で収録するか、別構造として扱うかという教材上の範囲を先に定める必要がある。嗅内皮質はさらに下方の海馬傍回側に位置し、CA・DGと区別される。

海馬上縁の白板・海馬采を、CA/DGの灰白質表面または海馬台と同じものとして追加しない。新しい細区分モデルは、この区別のための比較資料として使えるが、脳弓・海馬采の未収録端部を直接分節した資料ではない。現時点では新規採用0点、専門家確認ではない。

公式BigBrainサイトは配布volume・surfaceと[CC BY-NC-SA 4.0の表示](https://ftp.bigbrainproject.org/bigbrain-ftp/License.txt)を案内する。今回の取得物・比較画像はwork内に保持し、新たにアプリ配布する表面モデルや嗅内皮質ラベルは追加していない。アプリの日英参考文献には、海馬細区分と嗅内皮質の読書案内を追加した。

## 保存と次の作業

- `work/hippocampal-subfields-reference-2026-10-01/sources.json`：12ファイルのURL・SHA・頂点／面・座標範囲。
- `work/entorhinal-same-specimen-2026-10-01/provider-volumes.json`、`projection-report.json`、`entorhinal-app500-reference.npz`：左右独立の配信・原点・解像度・公式変換・交差数。
- `work/anatomy-review/hippocampal-subfields-native100-2026-10-01-v2/report.json`：18面の原画像SHA、現行ラベルSHA、crop、画像SHA。原画像全体を展開せず、1 native面ずつ読む。最初の実行はcrop上限で停止し、空の旧出力を削除せず保持した。
- `work/october1-fetch-hippo-all-surfaces.py`、`october1-project-entorhinal.py`、`october1-review-hippo-subfields-native100.py`：再現用コード。

次は海馬の範囲を無条件に広げず、白板と海馬采を示す別の直接資料、または海馬台を独立して教える必要性に照らして検討する。既存保留の薄い帯を同じ根拠だけで再採用しない。ラベル変更なしのため全件試験・再メッシュは行わない。

### 「with_white」配布物の実体確認

公式JSON目録のhippocampus_with_white_left.jsonを取得し、実際のshapeを確認した。140,128,511 bytes、SHA-256 523cc1d5d290a4efbcd866931f0938d8bbee5c9e7f9e1920b6b4dff2ffd92522。7 shapeは左CA1〜CA4・歯状回・海馬台と「Left white」。後者は163,842頂点／327,680面、座標範囲[-62.1607,-68.8546,-34.6825]〜[3.78936,77.4745,53.5233]で、海馬局所の白板・海馬采ラベルではなく半球全体を覆う参照表面である。ファイル名のwhiteを根拠に脳弓の追加分節へ使わない。実ファイルとshape別範囲は同じworkディレクトリのwhite-left-inspection.jsonに保持。アプリ配布物への追加はしない。

## 2023年の二つの手動地図を追加比較

[DeKraker et al., 2023](https://doi.org/10.7554/eLife.88404)の公開最終PDFのMethods（主に2〜4頁）と、[Zenodo 7757416](https://zenodo.org/records/7757416)の実データ・著者コードを確認した。論文全20頁を精読したという記録ではない。2025年の新12区分とは別資料である。

JD-OK_comparison.tar.gz（656,233,630 bytes）の公開MD5 30915bd0eaafd649291d55c366558bfdと取得物の一致を確認。全592エントリを目録化し、比較用のKedo_100um.nii.gz、JDKF_100um.nii.gz、二つの著者スクリプトと図だけを抽出した。10.3 GBのBIDS全体や4.2 GBの派生物は取得していない。float64のJD volumeは全配列をメモリ展開せず、gzipを順に読んで海馬周囲の限定cropを保存した。

著者のRecon3D.mによりKedo値は1 PaS、2 Sub、3 PreS、4 ProS、5 CA1、6 CA2、7 CA3、8 CA4、9 FD。JDは1 Sub系、2 CA1、3 CA2、4 CA3、5 CA4/DG。Kedoは元の離散的な組織切片から再構成した地図で、間の未ラベル断面を組織の欠如と扱わない。著者の一致率計算は外縁を共通範囲へ切り詰めるため、高い一致率を外縁全体の保証と解釈しない。論文のSRLM等の混合領域も、白板・海馬采の代わりにはならない。

両volumeの実affineはnative世界座標、0.1 mm、原点[-70.6666030884,-72.9700012207,-58.7776985168]。公式登録列の逆写像で現行0.5 mm voxel中心へ参照投影した（往復最大誤差7.133e-6 mm）。二資料がCA/DGを示し現行が0の点は356、26近傍で157成分。この一致だけで採用しない。三つのまとまった左の候補領域（16・12・12点）の周囲を、原画像／Kedo／JD／現行＋候補の4列で比較し、各軸の隣接3面、計27面を全目視した。

確認面は体部X488〜490・Y642〜644・Z451〜453、頭部側X440〜442・Y742〜744・Z412〜414、移行域X469〜471・Y693〜695・Z432〜434。原画像で巻き込む灰白質の帯と小さな島状の断面が連続し、現行境界の局所的不足を支持する面がある。一方、Kedoの離散面とJDの連続地図では外縁の広さが異なる。今回の27面は356点全体・左右全域の採否確認ではない。海馬台・嗅内皮質への無条件の拡張や、元々含まれている白質の一括除外は行わない。

この段階では海馬変更0点。次は157小片を一つずつ再発見するのではなく、この同一標本資料を使って頭部・体部・尾部ごとに収録する灰白質と周囲白質の範囲を定め、まとまった補完として確認する。候補の支持があることと、label・3D・ブロックの同期まで採用を完了したことを区別する。

取得資料のZenodo記録にはCC BY 4.0の記載があるが、BigBrain原資料のCC BY-NC-SA 4.0を置き換えない。今回のvolume・crop・比較図はwork内に保持し、アプリでは日英の論文リンクと学習目的だけを掲載する。

保存先はwork/hippocampal-subfields-reference-2026-10-01/manual-comparisonのbounded-crop-report.json、projection-report.json、manual-app500-reference.npz、core-agreement-zero-candidates.npz。原画像27面とSHA・範囲はwork/anatomy-review/hippo-manual-agreement-native100-2026-10-01/report.json。再現コードはwork/october1-crop-hippo-manual.py、october1-project-hippo-manual.py、october1-review-hippo-manual.py。アーカイブと失敗時の出力を削除していない。
