# 小脳マスクの収録範囲再確認 — 2026-09-06

## 2026-09-07：外縁1105の21290点を開発採用

統合確認：全Node529/529（work/cerebellar-1105-full-node-v1.log、149822.7962ms）、型検査、通常Vite build成功。実Chromeで新revision/raw SHAを直接配信確認し、PC三方向1366×900＋390×844水平の4画像を全個別目視。work/cerebellar-support-browser-v8.json、interceptionなし。小画面は幅検査で物理端末ではなく、全解剖境界の保証でもない。下記の検証中表記は採用時点の履歴。

元39991点の成分について500µm全364面を目視し、全成分の一括削除は不採用。300µm支持格子を用いた限定候補21290点の差分104面と、初期原画像9面、追加局所原画像54面（18PNG）を個別表示確認した。Z18の出現直前、Z63の薄い葉先、Z78/98の外縁、X310/Y207の端で、組織側を保持し空隙への過剰領域を減らす。原画像の白さ単独を組織同定の根拠としない。18701点は保持し、小脳白質・虫部の除去、小葉の新規区分は行わない。

record `segmentation-patches/review/cerebellar-support-1105-adoption-2026-09-07.json`、修正前fixture `pre-cerebellar-1105-212d`。全volume逆再生一致、28→0:55/29→0:21235、全55block mask差0。現行compressed SHA `777b76921f99e22232dfedd58a165c17544a200101d9a403adc9f16d054d89ea`、raw `d5c4f53642998009b73841a13568045f1f52c449547c71d6ffbed015a7313fa4`。28=735945、29=725004。関連10/10、型検査成功。全テストと通常build・実ブラウザは確認中。専門家未承認、main/公開変更なし。

## 2026-09-07：上部843の限定差分を開発採用

統合検証追補：全Node528/528、型検査、通常build成功。plan843の4成果物再現一致。Chrome実ブラウザで4345の新revision/rawSHAを確認し、水平・冠状・矢状1366幅＋水平390幅の4PNGを個別目視。work/cerebellar-support-browser-v7.json。物理端末・全小脳の境界確定を意味しない。

現行c9899d58…で843=7267点。500µm三方向全189面の既存レビューに加え、原300µmのX320–322/Y238–240/Z205–207全9面3PNGを個別目視した。中心付近の葉間空隙を現ラベルが橋渡しする一方、小組織・薄い葉は保持が必要。125点補間標本のみなら4222点が条件を満たすが、全支持格子の条件に限定し3353点を候補とし3914点を保持した。強度条件単独では組織同定を保証しない。

有限支持report SHA `2ba5999fa2ab1448e81d190a58983c2dc1a4bb3ece2117c1a4bd54f60855fb78`。work-only候補SHA `212df1a6130977c23eb4561a5f883a2bd7efecba5f2b870cc1bbc5eae1b80b3b`。差分の全58面20PNG（Z98–149、X163/195/222、Y107/138/178）を個別目視し、Z111–123の小組織周囲、Z124–138の外縁、Z139–148の小組織の周囲で空隙側が除かれ、信号のある組織が残ることを確認。X195/Y138の直交差分も整合する。差分report SHA `edc56ccc4998e96de2b4dab8a8da9dc0f5135fca8e4224a73395523e9e217296`。55部品の生成用mask変更0。これは全小脳の正確性や小葉分節の完成を意味しない。

生成物は `work/anatomy-review/cerebellar-{finite-843-v1,support-843-stage-v1,support-843-difference-v1}`。stageは逆適用・全volume差分3353点を検証。その後、`segmentation-patches/review/cerebellar-support-843-adoption-2026-09-07.json` に根拠を記録して開発採用した。ID28から1613点、ID29から1740点を0へ変更し、現在の個数は28=736000、29=746239。圧縮SHAは上記候補SHAと一致、raw SHA `ee92fa6340e1746da7f9697e9cf3b187d9a547c91099474b401db33db78d908c`。修正前fixtureを保存し、専門家レビューfalseを維持。関連9テスト成功、型検査成功、全テスト実行中。公開サイトは変更していない。

## 判定

ID28/29は小脳皮質だけを分節したラベルではない。生成器はCerebrAの
小脳皮質、白質、虫部区画を合成している。内部白質の収録はそれ自体では
誤分節ではなく、強度による穴あけを修正として実施しない。
葉間溝をまたぐ外縁の問題が解決したことも意味しない。

## 現物照合

現ラベルSHA e7e61a7060c7f1ddfa8106ba659c0488e077495acdd6564862db44663d233ea3。
源アトラス `work/segmentation-source-review/cerebra.nii.gz` SHA
c05df93e85b8f1c1446e56f45f0b6a28fdf6e5c8263ea8f365617254bf79ecbf。
このアトラスを現volume affineへorder=0で再標本化し、現在の各小脳
ラベル内のsource IDを実数集計した。

|現ID|source IDとvoxel数|
|---|---|
|28|97:569832、90:103984、101:31704、53:15384、71:16952、62:16|
|29|46:569832、39:103992、50:36000、2:18592、20:20544、11:20|

97/46は皮質、90/39は白質、101/50・53/2・71/20は虫部区画。
62/11の16/20点はCEREBELLAR_ISLAND_REPAIR.mdの画像レビューで
脳幹から小脳へ再分類した点数と一致する。源アトラスとの不一致だけを
理由に元へ戻さない。source対応の数値はBigBrain境界の正しさの証明ではない。

`scripts/build_bigbrain_practical_seg.py` のatlas_masksと、app/page.tsxの
小脳／小脳皮質／小脳白質／虫部の対応も照合した。教材の統合小脳表示と、
アトラスの個別分類を区別する。今回は新たな画像目視やmesh検証を行った
という記録ではなく、既存画像所見を判断するための収録範囲の確認である。

## 未解決

葉間溝・皮質厚・小脳脚移行の正確な境界を、合成アトラスの形状だけから
確定できない。細分節が必要な場合は、用途と原画像に対応する境界規約を
確定してから行う。既存の外形を収縮／平滑化して精密分節と呼ばない。
今回の変更voxel/meshは0、公開更新なし。

## 現行外縁の画像支持を再調査

現行86e3b22dc7ce69cf31c5ba821e980ce283a366fd952bf46ce880efd8f3127e14で
ID28/29と原画像の飽和值255が重なる領域を抽出した。
`audit_brainstem_bright_regions.py --cerebellum`、
`work/anatomy-review/cerebellar-bright-v1/report.json`。
104,745 voxel / 2,805個の6近傍成分。これは削除数ではなく点検対象数であり、
画像欠損・境界の部分体積・背景をこの条件だけで分類しない。

最大4成分の代表三方向12面/4枚を全個別目視した。1088/1は主に外側・下側に
薄く広がるが、一部は溝へ入る。843は上方正中のくぼみと周辺外縁、997は
下方内側の空隙に重なる。代表面のみでこれら全体を採用しない。

次に、上外側の比較的局在した成分2532（559点、XYZ273–292/131–158/91–98）を
全占有範囲＋両端隣接1面ずつで確認した。X272–293、Y130–159、Z90–99、
計62比較/16枚を全個別目視した。`cerebellar-fissure-2532-v1/region-2532-00.png`
〜`15.png`、同reportに原画像・ラベル・PNGのSHAとcropがある。

矢状断・冠状断では現行輪郭が上面のくぼみを架橋し、水平断Z93–98で対応する
空隙への張り出しが連続する。内部の白質を除去する提案ではない。
**559点を高解像度照合へ進める修正候補とするが、まだ本体へ適用しない。**
次は変換済み300 µm原画像で同範囲とvoxelの有限体積を確認し、薄い葉の組織を
巻き込む点を除外する。中心値255・連結性・表示輪郭だけで全点を承認しない。
旧大成分の一括削除や平滑化は行わない。専門家レビューではない。

## 高解像度・有限voxel照合と348点の作業候補

`audit_cerebellar_finite_support.py` は同じ変換済み300 µm原画像
（SHA ebf0e88def96476d0a32ddaff6f28e37d7afd125dec724e6d8855b12357c7e86）へ
scientific affineで559点を対応させた。各500 µm voxelの閉区間を125点で標本化すると、
全点65000以上は427 voxel。132 voxelはその条件を満たさず保持する。
さらに閉区間に寄与する全格子cornerの最小値を評価すると348 voxelのみが
65000以上となった。これは三線形補間値の下界であり、組織学的正しさの証明ではない。
追加79点も保持し、計211点を旧559点から修正対象外とした。

`cerebellar-finite-2532-v1` の三方向隣接9面/3枚を全個別目視した。
原画像で上面のくぼみに対して輪郭が架橋することを再確認した。
v2は同一図のまま全corner評価を追記した数値版であり、新規9面とは数えない。
v2 report SHA e48c578bb5fd79e31020e1ec7f321302b49c38e2b934f1382a1d24ae7e362627。
全corner関数の3テストは格子corner包含、整数端点、範囲外/異常入力と非破壊性を検査する。

`stage_cerebellar_support_candidate.py` で348点だけを28/29→0とするwork専用候補を
作成した。逆差分再生で完全復元、変更点数と入力競合を確認した。候補compressed SHA
294379b727b7263b6d60af7f693ebb27ab9e75a149844ff42535d7399dc0acae。
`work/anatomy-review/cerebellar-support-stage-v1/candidate.json` に全点before/after、
入力/出力raw/compressed SHAを保存。adopted=false。
even格子62点も変わるため、既存block meshを無変更のまま本体だけ差し替えてはいけない。
次は348点の差分画像の確認とblock mask/mesh影響の評価。配布volume/meshは不変。

## 348点の差分レビュー・3D影響確認

`review_cerebellar_support_stage.py` で原画像／旧輪郭＋除外点黄／候補輪郭を並置。
全影響Z93–98と両端Z92/99、X274/282/292、Y131/146/158の14比較5枚を
個別目視した。00はv1で、01–04はv2で確認し、両版の全図SHA一致を別途検査した。
薄い隣接葉の像を残し、上面のくぼみの空隙を戻す局所修正として348点を
AI画像レビュー上は採用可能と判断する。132＋79点の保持と他成分の不変更を維持。
まだinstaller・現行SHA監査更新・統合テスト・実ブラウザ確認前で、本体未適用。

3D影響のv1検査はXYZ配列をZYX生成器へ渡しており無効。v2では転置した配列と
生成器の直接read_volume出力の完全一致を確認してから、全55 Part.maskを比較した。
**全55部品の差は0**。even格子62点の変化だけではmesh変更を意味しない。
`build_specimen_blocks.py` はraw<252由来のtissueと小脳ラベルの積を使うため、
今回raw255の点は既に3D生成対象外である。3Dの外形改善を実施したとは説明しない。
v2 report SHA c919f87a92c447fcc5bb9ab6f45d6f591f0a472fcd35ada61b232eedf03d2b40。
軸順テスト2/2、有限支持テスト3/3成功。数値検査は解剖学的承認とは別。

## 開発版導入（後続の統合検証は下記）

固定installerで348点を本体へ導入した。全点29→0、左28=737872不変、右29=748632。
現行compressed SHA 294379b727b7263b6d60af7f693ebb27ab9e75a149844ff42535d7399dc0acae、
raw SHA fbd14d8de42324778b0f67471fd2e5637fe23396b6da5e05df0b53ca4f1d33d0。
pre-cerebellar-support-86e3 fixtureと固定採用JSONを保存し、Node独立再生で
正確な348点・その他全voxel不変・逆差分を確認した。乳頭体の旧採用テストは
このpre fixtureまでの歴史を再生し、新テストがそこから現行までを検査する。
アプリのrevision、視覚路/乳頭体客観監査、現在入力用のテスト参照を更新した。
古い監査JSONは保持。最初のfocused10件中1件はapp候補監査の旧SHA参照で失敗し、
同期修正後に全Node suiteを実行中。型検査/build/browserを完了扱いにしない。

### 統合検証の結果

全Node v2は522/523成功。残る1件はrendered-html:1081の旧SHA参照で、
これを修正後、同ファイル全78/78成功。最終修正後に全523件を一度に再実行した
という記録ではない。型検査と通常本番buildは成功（既存chunkサイズ警告のみ）。
work/cerebellar-support-full-node-v2.log、cerebellar-support-rendered-v3.log、
cerebellar-support-normal-build.logを保持。

実ブラウザ4345で現行revision要求と配信raw SHA一致を確認。v2のPC三断面と
390幅水平断の4条件はloader/UI error/overflow/WebGL fallbackなし、4PNG全個別目視。
v1水平位置25は小脳を通らず、v2で75へ訂正した。小脳選択の断面着色と3D表示を確認。
work/cerebellar-support-browser-v2.jsonおよび同接頭辞のv2 PNGを参照。
これは348点の原画像・差分図レビューを置き換える境界判定ではなく表示検証である。
全小脳境界・全3Dの専門家承認、公開サイト更新、main統合は行っていない。

## 別の上面空隙：component2274（開発採用前）

現行294379b7…を明示SHAで読み、component2274の428点、
XYZ251–262/138–160/90–106を抽出した。旧2532とは別成分である。
`cerebellar-fissure-2274-v1`の全58断面（X250–263、Y137–161、Z89–107）を
15 PNGすべて個別目視。上面から葉間へ入る細い空隙を合成外形ラベルがまたぐ。
組織内白質を同じ強度だけで除外する規則にはしない。

同じ原標本の300 µm像で三方向隣接9面・3枚も全目視した。
125標本すべて飽和の点は93だが、voxelを覆う全補間cornerで飽和を満たすのは52。
**残り376点は保持**する。原画像全域への強度閾値修正ではなく、上記の局所画像
レビューを前提とした範囲限定候補。finite report SHA
19955c3f879da17fee06dd06ae981bbce1ed5a9becae2cae83d0c3b86e518013。

`stage_cerebellar_support_candidate.py --component 2274`は52点だけの可逆候補を
`work/anatomy-review/cerebellar-support-2274-stage-v1`へ作成。
候補compressed SHA 2fc863aee8009ad9280dd2dd5fd2a9e8fa91de7f84a3ec5f59764317972c4cd9。
even格子差14点。before/raw/candidateの20比較7 PNGを全個別目視し、
除去箇所は上記空隙内・上面縁の限定範囲として確認した。
全55 Part.maskは差0（ZYX生成器直接読込との一致検査あり）。
difference report SHA 06fbde1586dd5e8bbbd309eef06e99d0240c151bda7bf1a4dab2a956a5ad4eed。

原画像表示・差分・mask影響まで確認済みだが、52点の本体導入と依存監査同期・
統合検証は未実施。製品volumeは294379b7…のまま、3D/publicサイト/main不変。
有限支持テスト3/3、明示入力SHAの異常系・読込委譲テスト2/2成功。
次はこの52点の採用record・installer・独立再生テストを整えて統合する。
既存58＋9＋20面を再生成して新規確認数として計上しない。

### 52点の開発統合

installerの固定component2274段階で本体を2fc863ae…へ更新した。
raw SHA b7cf9ea9fcf0867de9bb25038fb1bbfb4e80e6bfc1141927cb8e7be04164ecff。
pre-cerebellar-2274-2943 fixtureと固定adoption JSONを保存。
以前の348点record/metadataは保持し、新段階をcerebellarSupport2274Auditとして追記。
348点と52点は独立に全volume再生・逆差分を確認し、旧乳頭体・小脳側修正を含む
関連6/6テスト成功。TypeScript成功。全Nodeはwork/cerebellar-2274-full-node-v1.logへ実行中。
通常buildと新配信SHAでのブラウザ確認は全Node完了後に行う（dist競合を避ける）。
全体目標未完了、公開サイト/main変更なし。

### 52点統合後の確認完了

全Node **524/524成功**（work/cerebellar-2274-full-node-v1.log）、
小脳Python7/7＋入力guard2/2、TypeScript、通常本番build成功。
installer plan(2274)の全4成果物byte一致も読取りのみで確認した。
PC水平75/冠状31/矢状72および390幅水平75の実ブラウザ4条件で、
新revision要求と配信raw SHAを確認。4 PNG全個別目視、loader/UI error/
horizontal overflow/WebGL fallbackなし。work/cerebellar-support-browser-v3.json参照。
画面検証は局所差分図の代わりの全境界承認ではない。統合検証は完了したが、
他の小脳外縁・細分節・根出口などは未解決として別管理する。

## 下方内側component997の連続断・有限支持確認

現行2fc863ae…を固定SHAで読み、component997が1,007点、
XYZ174–194/135–164/27–71で従来と同じことを確認。
全体の飽和值重複は104,345点/2,833成分（400点除外で分裂した成分もある）。
成分番号が将来も不変とは仮定せず、点数・bbox・入力SHAを検査する。

`cerebellar-fissure-997-v1`の全26 PNGを目視した。
X173–195の23面、Y134–165の32面、Z26–72の47面、合計102比較。
内側の空隙と下面に沿って現輪郭の張り出しが続く一方、葉の薄い先端や縁に接する
点もある。赤は既存小脳全体、青緑は点検部分であり、承認済み削除点ではない。

`audit_cerebellar_finite_support.py --component 997`に固定条件を追加。
公式300 µm画像へ対応させると、125標本全部65000以上は402点、
閉voxelへ寄与する全格子cornerが65000以上なのは259点まで減る。
残る748点は削除対象にしない。`cerebellar-finite-997-v1/report.json`に全1,007点の
数値・画像hash・条件を保存。三方向隣接9面/3 PNGも全個別目視し、空隙と薄い葉を確認。
支持関数テスト3/3成功。数値下界は組織同定の証明ではない。

次は259点だけのwork差分と、差分を重ねた連続断・block mask影響を確認する。
現段階は候補抽出までで採用未決定、本体volume/mesh/main/公開サイト不変。

### 259点の差分・block影響確認

固定997条件でwork専用候補を作成。全259点が左小脳28→0、残る748点は保持。
input2fc863ae…、候補compressed SHA
`190f88dc05345e36b2e556829eb7882b6d01d0a67240b7738c1ab58820cd5548`。
`cerebellar-support-997-stage-v1/candidate.json`に全before/afterとraw hashを保存し、
逆差分で全volumeを完全復元、変更集合259点・重複なしを確認した。

`cerebellar-support-997-difference-v1`の全17 PNG、50比較を目視。
Z26–69の全44面とX175/184/194、Y135/141/162。
空隙内へ張り出した輪郭を局所的に戻し、中央の組織片や隣接する葉の輪郭を残す。
元の1,007点全体を削除する案ではない。現画像レビュー上は開発採用へ進められると判断。
専門家確認・全小脳境界承認ではない。

even格子28点に差があるが、XYZ→ZYXを生成器の直接読込と照合したうえで、
全55 Part.maskの変更数は0。今回の差分によるblock mesh再生成は不要。
差分report SHA `add17b5be8e679fb3669f1fd2300ff71752815361734fc4b95795c5dc124f5fe`。
次は固定採用record、installer、独立再生テスト、依存hash同期と統合検証。
まだ本体への採用なし。公開サイト/main不変。

### 259点の開発統合

固定installerの997段階で本体を190f88dc…へ更新。
raw SHA `1865ecff016976e887b000a0e437e31cdcaae1025962c2edbb900d1335585ace`、
左28=737613、右29=748580。過去の348/52点記録・metadataを保持し、
997記録・pre-cerebellar-997-2fc8 fixture・cerebellarSupport997Auditを追加。
installer planを再実行し、全4成果物のbyte一致を読取りのみで確認した。
新旧3段階の独立全volume再生/逆差分を含む関連6/6テスト成功。
現行hash依存と視覚路/乳頭体の新しい固定監査を同期し、過去監査は保持。
README日英・由来・ライセンスの開発未公開表記を同期。
全Nodeはwork/cerebellar-997-full-node-v1.logへ実行中。build/新revisionブラウザ検証はその後。

### 259点統合後の検証完了

全Node525/525成功（158794 ms、上記log）、型検査・通常本番build成功。
build記録work/cerebellar-997-normal-build.log。
4345で新revisionと配信raw SHA一致を確認し、PC三断面と390幅水平の4条件を実測。
positionは百分率で水平89/冠状30/矢状47。全v4 PNG4枚を個別目視、読み込みエラー・
loader・横overflow・WebGL fallbackなし。work/cerebellar-support-browser-v4.json参照。
画面確認は局所50差分比較の代用や全境界の承認ではない。
259点の統合検証は完了。他の未解決監査へ継続し、main/公開は変更しない。

## 下方正中近傍component1393（旧1373）の確認

現行190f88dc…で成分を再計算。旧1373の943点・bbox XYZ190–206/137–170/23–49に
一致する対象は1393になった。過去番号をそのまま使わない。
`cerebellar-fissure-1393-v1`の全21 PNG、84比較を目視した。
X189–207（19面）、Y136–171（36面）、Z22–50（29面）。
左右間の空隙と下面へ連続する張り出しを確認する一方、正中近傍に小さな組織片が残り、
全943点の一括削除は認めない。

固定入力SHA・点数・bboxでfinite scriptを拡張。300 µm画像で全125標本が65000以上は
488点、全支持cornerが65000以上は372点。残り571点は保持対象とする。
`cerebellar-finite-1393-v1`の三方向隣接9面・3 PNGも全個別目視。
特に矢状断で小さな組織片とその周囲の白い空隙が別に見えることを確認した。
report SHA `0378ec2aa96b328ccb8db4e71ed03b5da6676452f28f34a65be8cf1ac675d55e`。
支持関数テスト3/3成功。これは数値候補で、全点の解剖学的承認ではない。
次は372点だけのwork差分、差分画像と全block maskへの影響を確認する。
製品の190f88dc…、mesh、公開サイト、mainは今回不変。

### 1393候補の差分レビュー完了

work専用stageで372点すべて右小脳29→0、571点保持。逆差分で全volume完全復元。
候補SHA `09088a9cf76b8c0578e96f21b9e35077ef345fd90bebc5294308e1603262bb34`、
even格子9点差。`cerebellar-support-1393-stage-v1/candidate.json`に全点とhashを保存。

`cerebellar-support-1393-difference-v1`の全12 PNG・34比較を個別目視。
全影響水平断と両端Z22–49の28面、X196/197/202、Y137/150/170。
内側の空隙に沿う張り出しを限定除去し、X197付近の小組織片や隣接葉を保持する。
元の943点全削除ではない。AI画像レビュー上、局所外縁修正として開発採用に進める。
全小脳境界の承認・専門家レビューではない。

XYZ→ZYXを生成器の直接読込と照合し、全55block Part.mask差0を確認。
差分report SHA `2c79455c2889f6138e5371bb937f703585d398b55780248834684ac5e339a7b9`。
次は採用record・installer・独立再生テストと依存hash同期、統合検証。
本体190f88dc…はまだ変更していない。main/公開変更なし。

### 1393の開発統合

固定installerで372点を適用、現行compressed09088a9c…、
raw `ec5be45b541c3b7a1131f34bedd5be68d7786ae35a2cc2988f503d04e49f50f3`。
左28=737613、右29=748208。以前の348/52/259点記録とmetadataは保持。
1393採用記録・pre-cerebellar-1393-190f fixture・cerebellarSupport1393Audit追加。
plan(1393)で全4成果物のbyte一致を再確認。現行依存hash、optic/乳頭体の新固定監査、
全段階再生テスト、README日英・由来・権利記録を同期した。
全Node526/526成功（work/cerebellar-1393-full-node-v1.log）、型検査・通常build成功。
work/cerebellar-support-browser-v5.jsonのPC三断面と390px水平断の4条件で現行配信確認。
v5 PNG4枚を個別目視し、読み込みエラーや表示の重なりは認めなかった。
表示検証は解剖学的な全境界承認とは区別する。公開サイト/mainは不変。
### 次の局所候補1603：全連続断と有限支持の確認

**開発採用済み**：固定installerで229点を適用し、製品c9899d58…、
raw354fd83c865cd4ea3c2f078d326a56abad9cc3f16e3f6bbb618955ced5db9d8d。
左28=737613、右29=747979。1603の可逆record/変更前fixtureとmetadataを追加し、
以前の記録を保持した。独立再生を含む関連8/8と型検査成功。
全Node527/527成功（work/cerebellar-1603-full-node-v1.log）、通常build成功。
installer plan1603で全4成果物byte一致も再確認。4345で現行配信を検証し、
PC三方向＋390水平の4条件正常、v6 PNG4枚を全個別目視した。
work/cerebellar-support-browser-v6.json。描画確認は全境界の解剖学的承認ではない。
公開サイト/mainは不変。以下の未採用記述は前工程の履歴。

**後続の差分確認完了**：work/anatomy-review/cerebellar-support-1603-stage-v1の
候補c9899d58…は229点29→0、425点保持、even24、全volume逆差分復元一致。
difference-v1の全13PNG・38比較を個別目視（Z34–65全32、
X203/211/215、Y135/140/146）。空隙への張出しを局所除去し、小組織と隣接葉を保持する。
AI画像レビューとして開発採用へ進むが、専門家レビューや全小脳承認ではない。
全55Part.mask差0、XYZ→ZYX直接照合済み。
差分report SHA d93a7c5a9d170177dae5741974f8f695373ed9134932bf8b021337c5e50857db。
installerの固定1603 preflightは4成果物を検証成功したが、まだ書込み・採用実行なし。
入力guardテスト2/2成功。現行製品09088a9c…と公開サイト/mainは不変。

現行09088a9c…で再集計（work/anatomy-review/cerebellar-current-triage-v6）。
4大領域の代表12断面を全目視し、外縁・上部正中近傍に未解決範囲が残ることを確認した。
代表断面のみで大成分全体を修正済みとはしない。

右小脳の内側空隙近傍にあるcomponent1603（旧1582）は654点、
XYZ[203,133,35]–[218,147,66]。fissure-1603-v1の全18PNGを個別目視し、
X202–219（18）、Y132–148（17）、Z34–67（34）の全69面を確認。
空隙への張出しと葉・薄い組織に近接する部分が混在し、全654点除外は不採用。

固定入力SHA/count/bbox付きで有限支持監査に1603を追加した。
finite-1603-v1では125標本条件307点、全格子corner条件229点、425点保持。
300 µm原画像のX350–352/Y233–235/Z83–85の3PNG・9面も全目視。
小組織・葉先を損なわないよう229点のみ次の差分候補とする。
数値条件は組織同定や採用承認ではなく、差分図での再確認が必要。
製品09088a9c…は不変、stage・採用・追加の本体build/browserは未実施。
### 大きな上部領域843：連続断レビュー開始

**後続：全189面の目視完了**。16–47の残32PNGを個別確認し、既読分を合わせ全48枚を目視した。
X162–223（62）、Y106–180（75）、Z98–149（52）。冠状断Y132–150では正中の小組織を囲む空隙にラベルが張り出す。
水平断Z113–138でも外縁・葉間空隙への張出しが続き、Z145–148の小さな組織／信号近傍にも対象点がある。
組織を囲む領域ごとの違いがあり、7267点の全削除はしない。次は300µm原画像の有限支持と局所差分で限定する。
本体ラベルは変更していない。以下の部分目視記述は前工程の履歴。

現行c9899d58…に対し、component843=7267点、XYZ[163,107,99]–[222,179,148]を再同定した。
work/anatomy-review/cerebellar-superior-843-v1に全189面・48PNGを生成。
現時点の目視範囲は00–15の16PNG、X162–223全62面とY106/107の計64面のみ。
残り125面は生成済みだが未目視であり、全領域をレビュー済みと扱わない。
X188–201付近で葉間空隙への張出し・架橋が見え、より外側は薄い葉先との近接がある。
全7267点の一括除外は不可。冠状・水平連続断で照合してから300µm画像との支持評価を判断する。
本工程では製品ラベル・mesh・UIを変更していない。専門家承認ではない。
