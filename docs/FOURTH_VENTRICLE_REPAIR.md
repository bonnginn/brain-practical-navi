# 第四脳室ラベルの混在修復候補 — 2026-09-05

## 2026-09-07：上方残8点を次回統合用の差分へ

旧336の残る上方8点は `fourth-upper-residual8-native300-v1` 全9図を目視。代表[188,189,94]・[191,176,88]・[194,190,92]は側方先細り部と屋根の腔側で、可視組織を横切る追加ではない。report SHA `726caa2140507fc74e9cf18cadb64ad1297bad630557ac4b89216ba7f564d286`。`review_fourth_remaining_posterior.py --stage-upper` で0→26の8点を可逆stageへ保存（SHA `a69a55e7fc4964d83d6cff241d8dc1810af64a6cab8dbd170cfc046690647ef3`、仮26=9008）。同じ6626f8eb入力の第三脳室下方4点除外stageと、次回まとめて統合する。今回本体/右の追加変更なし。全点全直交断・native100・専門家レビューではない。

## 2026-09-07：後方残候補を現行へ照合、下方開放域は一括採用しない

旧otherPoints336を現行6626f8ebへ照合し、12点は採用済み26、324点は0のままと確認。うちZ85未満316点、上方8点。`fourth-posterior-remaining-6626-v1.json` SHA `7f813820ff243fa17620f38bd29b145f5281679231e6d2104e2979d215d93788`。このZ区分はレビュー作業の区分であり解剖学的境界ではない。

`review_fourth_remaining_posterior.py` で現行26と下方316点を原300へ重ね、代表[191,177,58]・[183,174,68]・[184,163,79]のXYZ全9図を目視。report SHA `d4306ebd47834c69e7ceff4aa29e0d2f4958a02207ab62f145b505b76afd6174`。正中尾側では原Z96–98で小脳周囲の広い空間に連続し、後方の原Y289–291では小脳組織を取り巻く開放空間へ候補が面する。既存26の終端を種に一層ずつ足しても、解剖学的終端は決められない。したがって316点の一括追加を保留する。上方の閉じた腔縁の111点採用とは根拠が異なる。

これは代表面の再評価であり、316点すべてを誤候補と断定したものではない。膜/開口の境界根拠なしに外部を第四脳室として広く充填しない。原画像の濃度閾値を調整する反復だけでは解消しないため、当該開放部の採用を進めず、残る上方8点や第三脳室の候補へ移る。現行ラベル/右/公開はこの調査で変更なし。

## 2026-09-07：上方後壁111点の統合検証・右更新完了

全Node561/561成功（164835 ms、`work/fourth-upper-posterior111-full.log`、session43727終了0）、型検査成功、探索Python4/4成功。suite後の通常build成功（`work/fourth-upper-posterior111-build.log`）。HTTP200で展開volume全byte一致、dist圧縮byte一致。右IAB3をreloadし断面40/全脳3D初期描画、検査IAB18で後脳・間脳・内側側頭葉の3ブロック初期描画を目視確認した。読込エラー表示なし。既存の狭幅ブロック見出し上端欠けは残る。全操作・全境界の検証ではない。

README日英を同期。右は新版6626f8ebだが、表示位置40は今回の修正断面ではない。修正部位は `work/anatomy-review/fourth-upper-posterior111-comparison-z91/comparison.png` の同一断面比較で示す。この面16点、全差分111点。main/公開サイト変更なし。次は第四脳室の残る後方・外側/下方の境界と第三脳室の未解決片へ進む。

## 2026-09-07：上方後壁111点を開発本体へ採用、統合検証中

原画像300umのZ140–163全24面（8枚の連続比較図）と、[187,181,86]・[188,180,89]・[192,189,96]の代表XYZ全9図を目視。最後の上方先細り部も三方向で確認し、斜めの薄い後壁の腔側を補う111点を0→26で採用した。全点の全直交断・native100・専門家確認ではない。下方の開放域は含めない。

探索は既存26の最小Yから後方へ連続、X179–212/Z85–97。全有限支持>=65000では12点、125点の三線形サンプル中80%以上>=65000という比較条件では111点。後者は厳密な組織体積比ではなく候補抽出に限り、採否は上記画像の形態と連続性による。低支持を飛び越えない再計算を含むPython4試験成功。

locator `fourth-upper-posterior-fraction80-ad444-v1.json` SHA `3714e8abea25256d0f32050f2d0d7687d4205e814df913007390bede5af6c1ad`。連続図report SHA `d8d1c0e90fec79f9d81aa41d94b0b89313ce56cef61e5fab32cad8b7628a0da0`、代表XYZ report SHA `15d3848a2cbc09ce1b087799dc967a88e4f9c790d825185d1afe6925f203c13d`。stage SHA `c419c9439f5c548f7404016c04c5b4a92989b0197368997f77626f68e745a4ee`、全volume差分111・逆復元一致。前後比較Z91は16点変更、同一原画像/窓/切り出しで目視済み。

現行compressed `6626f8eb6da43ebd6f41e39e247c32338fb06588ee94b407549cd0a30f61aa08`、raw `5d7da928641cde99a9c4e9010e298098784303e90771b2b385cb5e0431da7044`、26=9000。mesh impact SHA `3df99d876ae8b892c025ca96ce81ff808f25190e387d425c0640a80e551048ea`、全55mask中3変更（間脳tissue-3、内側側頭葉tissue-3、後脳第四脳室+6）。変更前mesh再現一致、3部品と断面2meshを同期。型検査成功、全Nodeは `work/fourth-upper-posterior111-full.log` で実行中。suite後build/配信/実ブラウザは未実施。右の更新は検証後、main/公開変更なし。

## 2026-09-07：27点採用版の統合検証・右更新完了

全Node561中560成功・1失敗（172.5秒、session27721終了1）は旧小脳修正のpons-medulla mesh直比較。履歴SHA/復元fixtureを保持してregionalMeshSuccessorを適用、対象ファイル3/3成功（`work/fourth-depth27-rerun.log`）。全561再実行成功とは報告しない。型検査・専用Python3/3・regional2/2成功。

suite後の通常build成功（`work/fourth-depth27-build.log`）、HTTP200の展開volume全byteと本体一致、dist圧縮byte一致。右IAB3をreloadし水平断40/全脳3Dの初期描画を確認。検査タブ17で後脳→間脳→内側側頭葉を順に開き全3ブロックを目視、読込エラー表示なし。狭幅のブロック上端見出し欠けは既存残件。全操作・全境界検証ではない。README日英同期、公開/main変更なし。前方の条件内残候補0に区切りを付け、次は第四脳室後方/外側や第三脳室上方など未解決領域へ進む。

## 2026-09-07：27点を開発本体採用、前方探索の残候補0

固定stage/impactを検査して `fourth-depth27` を採用。現行compressed `ad444107086e647dc8f2816e276ffb12e4feb01a36dd7f1a8d731440e0501f31`、raw `c4608ac97355cb8daff8cebd3f1e7472736a288feecb0f83a28cdeebd990d172`、26=8889/27=249983。4ブロック部品と断面2mesh、fixture、metadata、採用記録を同期。型検査、regional2試験、専用Python3試験成功。新SHAの客観視覚路/乳頭体監査を別名保存。

採用後、同じ前方列の深さ探索を再実行した。10055点を検査、候補0・上限到達0。`fourth-anterior-depth-post-adoption-ad444-v1.json` SHA `70d9554f780c219b053d256fc91f0c2e0c5bf7173ed30cbee11a83625577289d`。これにより、対象X179–212/Z59–97の既存26前端から連続する有限支持>=65000の0/27候補は残らない。この条件の探索完了であり、未seed列、部分容積、後方/外側開放腔、全分節の解剖学的完成を証明しない。次はそちらへ進む。

全Node session27721、`work/fourth-depth27-full.log` 進行中。旧小脳修正のpons-medulla meshを現行へ直比較する1件を、既存の履歴継承helperで復元fixtureと後続SHAを検査する形へ同期、対象3試験成功。suite後build/browser未確認。本体は採用済みだが右配信更新はまだ。main/公開変更なし。

## 2026-09-07：追加27点を混在差分としてstage、全派生準備とpreflight成功

`stage_fourth_depth27.py` に0→26の16点と27→26の11点をまとめた可逆処理を実装。固定locatorと新代表画像21図（旧16候補9図＋下方3図＋11競合9図）、既閲覧の原Z106–165連続60面のSHAを保持し、各画像を照合。後者の重ね合わせは旧候補であり、新27点の全直交面確認とは扱わない。全volume差分27・逆復元一致、不正座標/誤transition/既存label競合の拒否を含む3試験成功。

stage `fourth-depth27-stage-v1/repair.json` SHA `c2f7d98fdb51559b3ff785b873d80e932d4ecfd796c9fa6e073650ec697632a7`。入力2bf9dd7d、仮出力compressed `ad444107086e647dc8f2816e276ffb12e4feb01a36dd7f1a8d731440e0501f31`、raw `c4608ac97355cb8daff8cebd3f1e7472736a288feecb0f83a28cdeebd990d172`。仮26=8889/27=249983。

全55ブロックmask比較のうち4変更：間脳tissue-2、内側側頭葉tissue-1、後脳pons-medulla-3、第四脳室+6（粗格子）。変更前mesh再現一致、installationBlocked=false。impact SHA `2b4677acd1fdeef4c94860a965527a8dc46ecb2fa550d3ee3fe27f0ed38978ff`。断面用は第四脳室/脳室系の2meshを準備。固定stage SHAでのみmixed-to-26を受け入れる共通installerのread-only preflight成功。Z68比較図を目視、この面3点の小差分を確認した。

まだ本体へapplyしていない。次は採用・現行参照と履歴試験の同期・全検証・右更新。現行/右は2bf9dd7d、README掲載機能変更なし。専門家レビュー/全脳室完成/公開ではない。

## 2026-09-07：前方の深さ探索を0/27混在に対応、残27点を比較（未採用）

一層ごとの反復を避けるため `explore_fourth_anterior_depth.py` に明示source SHA/出力名と `through_brainstem` 探索を追加。原画像支持が途切れたら停止し、低支持点を飛び越えない。元の非ゼロ停止モードと履歴JSONは維持。現行2bf9dd7dから10055点を検査し27候補（0→26が16、27→26が11）、12セル上限到達0。記録 `fourth-anterior-depth-through-brainstem-2bf9-v1.json` SHA `54a859762f5637d1ac68c359ea0464edde6ebcdc4c75437b3b0aa7d4b19ae903`。上限未到達はこの方向の探索結果で、未seed列や部分容積境界の完成証明ではない。

既存16候補の代表9図に加え、未確認だった下方[195,184,66]を `fourth-depth16-lower-native300-v1` 全3図で確認（SHA `a69bd511323ce31e49d84e5047d600abf1da2a617eaccf3f96a61743cf9a7ab7`）。原X324–326/Y306–308/Z109–111で腔の前方正中側の不足に対応する。既存27の追加11点は `fourth-depth-brainstem11-native300-v1` 全9図を確認（SHA `5063cc8a7721d064f9bfd9d659947dd9f055912f0bbda1316e924d1a12e9347d`）。参照[207,180,67]/[204,184,70]/[196,196,97]で下方左右肩と上方先細り部の腔側の点を示し、局所修正を支持。全点の全直交面を新規に閲覧したとの主張ではなく、直前の原Z106–165連続60面レビューと併用した判断。

rendererは候補集合内の任意の代表点を明示指定でき、既存labelと参照labelをreport内で区別するようにした。新27点はまだstage/本体未採用、専門家確認ではない。本体/右previewは2bf9dd7d。README掲載機能に変更なし。

## 2026-09-07：48点採用版の統合検証完了

全Node561件中558成功・3失敗（169秒、session96137終了1）は脳幹/第四脳室の旧「現行総数」参照。歴史的fixture内の総数は保持し、現行metadataの期待値だけ同期して関係3ファイル6/6成功。ログ `work/fourth-brainstem48-full.log` と `work/fourth-brainstem48-rerun.log`。全561/561の再実行成功とは表現しない。

型検査成功、suite後通常build成功（`work/fourth-brainstem48-build.log`）。HTTP200で展開volume全byte一致、dist圧縮byte一致。右IABタブ3をreloadし水平断40と3D初期描画を目視確認、読込エラー表示なし。位置40は修正面を含まないため、別途同一原画像の前後比較Z70（8点）とZ68を作成した。README日英同期、公開/main変更なし。初期描画確認を全操作/全解剖学境界の検証と扱わない。

## 2026-09-07：48点を開発本体へ統合、検証中

固定stage SHAを検査したinstallerで27→26の48点を採用。現行compressed `2bf9dd7dea088310e29ccbf72b7f78dc641346022200619e499e13b1118dbdd1`、26=8862/27=249994。前版fixture、採用記録 `segmentation-patches/review/fourth-brainstem48-adoption-2026-09-07.json`、metadataを同期。全55ブロックmask不変（impact SHA `4a707c936d8905439da00883b394c228326666a102992fe816a20d04603ed638`）を確認し、第四脳室/脳室系の断面2meshだけ変更した。

型検査とregional再生2試験成功。新SHAの視覚路/乳頭体客観監査を別名保存（旧記録保持）。全Nodeは `work/fourth-brainstem48-full.log`、session96137で実行中。suite後通常build・配信/ブラウザは未確認。原画像と前後比較Z70ではこの面8点の小さな輪郭変化を確認した。解剖学的完成/専門家レビューではなく、残る16点追加候補・後方開放域等は未解決。

## 2026-09-07：脳幹競合48点の画像判定と可逆差分（本体未反映）

既存 `fourth-brainstem-conflicts48-native300-v1` の未閲覧だったpoint-0/2全XYZを目視し、前回point-1と合わせて代表9画像を確認。さらに `fourth-brainstem-conflicts48-series-z-v1/report.json`（SHA `25ca013b63488e7162147aac7b6cd71171875852270a0dacb550486dc99be887`）の全20画像、原Z106–165の連続60面を目視した。赤い既存27の点は脳幹側の腔縁の内側にあり、下方左右の肩から上方先細り部まで局所的な過剰収録の修正を支持する。小脳側の開放腔を一括充填する根拠にはしない。

`stage_fourth_brainstem48.py` により27→26の48点をwork-only stageへ保存。入力aa3b649e、仮出力compressed `2bf9dd7dea088310e29ccbf72b7f78dc641346022200619e499e13b1118dbdd1`、raw `7f252cb4321b5d62090c6e4dd0965f48a07719cc678dbc9434d42b058cd2ebb7`。第四脳室8814→8862、脳幹250042→249994。record SHA `c88ca05bf5bc4825575204a69eed1f5ee02db951564fc35e78d30f61f97f8280`。全volume差分48・逆復元一致、入力ラベル競合/不正座標を拒否する3試験成功。専門家レビューやnative100確認ではない。

全55ブロックmaskの派生準備は終了0、変更maskなし・installationBlocked=false。これは粗いブロック格子の結果で、断面ラベル変更なしを意味しない。断面mesh同期・本体採用・採用後の全検証はまだ未実施。右previewと本体はaa3b649eのまま、main/公開変更なし。

未ラベル追加16点の代表9画像も `fourth-anterior-depth16-native300-v1` で目視（report SHA `8aade31dd61784da53136c5dc0b2a26771349a280f119238bc8050f3c67b9916`）。前方壁の不足に対応するが、代表に含まれない下方[195,184,66–67]などの候補自身の重ね合わせ確認は残る。16点はこの48点差分に混ぜず未採用。README掲載機能変更なし。

## 2026-09-07：前方の多層不足と既存脳幹ラベルの競合を切り分け

`explore_fourth_anterior_depth.py` を追加。現行aa3b649eの既存26前端から同一X/Z列を前方へ最長12セル調べ、原300有限支持>=65000が連続する未ラベルのみを比較候補化した。v1 SHA `e76f7d75559d896df87b62f451e79c82567c96372d9ccd6c30ab3afc322bb0e8`、1293点検査・追加候補16点・上限到達0。これは一層ずつ反復採用する代わりの深さ診断であり、16点は未採用。

非ゼロによる停止も記録したv2 SHA `ab98de14eb4c72f2a0082d6ad81466c7dcecc7f84db68ac1033cb8db07b9e6ca`、`work/anatomy-review/fourth-anterior-depth-aa3b-v2.json`。841の非ゼロ停止のうち48点が同じ強い原画像支持を持ち、全て既存ID27（brainstem）。未ラベルだけの補完では、この既存ラベル競合を見逃す。強い明度だけで27→26を自動適用しない。

`review_lateral_detached547.py` に明示的な既存ID27点集合の読み取り専用重ね合わせを追加。`fourth-brainstem-conflicts48-native300-v1` を生成し、point-1のXYZ全3画像だけを目視した。赤は既存27、水色は既存26。参照[205,185,73]の原X341–343/Y308–310/Z121–123では腔の前方縁に位置し、局所的な脳幹の過剰収録を疑う所見。全48点の判定ではない。point-0/2未閲覧、次は残る代表/連続断で27→26変更の根拠を確認する。今回本体・右previewはaa3b649e不変。README掲載機能変更なし。

## 2026-09-07：173点採用版の統合確認

全Node561件中558成功・3失敗は旧第四脳室meshを現行値へ直接比較する履歴試験（full.log、166.7秒、session89688終了1）。既存のregionalMeshSuccessorで各旧SHA→復元fixture→新SHAの連鎖を検査する形に同期し、関係3ファイル全6試験成功（`work/fourth-remaining-anterior173-rerun-final.log`）。全561/561の再実行成功とは表現しない。Python候補/差分2試験も成功。

型検査、suite後通常build成功、HTTP200の展開volume全byteと本体一致・dist圧縮byte一致。右IABタブ3をreload、水平断40/3D初期描画を確認。別の検査タブ16で後脳→間脳→内側側頭葉の変更3ブロックの初期描画を目視、読込エラーなし。狭幅のブロック見出し上端欠けは既存残件。Z90比較図を目視し、この面4点の前方縁補完を確認。全操作/全境界/物理端末検証ではない。README日英同期・公開/main変更なし。

## 2026-09-07：173点を開発本体へ採用、統合確認中

共通installerの固定stage/影響report検査後 `--apply` 終了0。現行compressed `aa3b649e0d43cc1ccefb095d58d0bba98578657ce812256257694a200caff442`、raw `3ce6693a9d68cf020ead0ffb38c7bea78639937eaf9ab0aaf7171ddce23392e6`、26=8814。他label総数は不変。採用JSON `segmentation-patches/review/fourth-remaining-anterior173-adoption-2026-09-07.json`、変更前fixture・3部品と断面2meshを同期。現行SHA/26総数参照と新しい客観視覚路/乳頭体監査を同期、型検査成功。全Nodeはsession89688/log `work/fourth-remaining-anterior173-full.log` で進行中。suite後build/browserは未確認。README日英へ開発限定で追記。以下の未採用記述は履歴。

## 2026-09-07：前方173点の原画像レビュー・可逆stage

`prepare_fourth_remaining_anterior.py` が親509候補を173/336に分離して保存、候補SHA `d4db863bb6d509ed2b5855c3918e09459cee17089c67bf2e84c0ea40b30ce5b5`。173点だけを重ねた `fourth-remaining-anterior173-native300-v1/report.json` SHA `300a9d68d82f71a918a54563784117c4a121e95344917ec7440edfe88ea68e53` の全9画像27代表面を目視した。親509の全57Y面レビューと併用。X306–308/313–315/324–326で脳幹側の腔縁に対応し、Z121–123/149–151/156–158で前方輪郭の不足を補う。後方の開放縁への追加は含めない。代表Yは親seriesの既閲覧面と重複し、新規連続面とは数えない。

`stage_fourth_remaining_anterior173.py` が候補/親候補/全使用画像のSHA、部分集合関係、非ゼロ保護、全差分/逆復元を検査して0→26の173点をwork-only stageへ保存。stage record SHA `c80cd6ed43817cac677c17d1ceed3c03228b4ac7c23abc02867ef9468ed09c68`、仮compressed `aa3b649e0d43cc1ccefb095d58d0bba98578657ce812256257694a200caff442`、raw `3ce6693a9d68cf020ead0ffb38c7bea78639937eaf9ab0aaf7171ddce23392e6`、仮26=8814（8641+173）。専用差分/逆復元1試験・共通stage既存3試験成功。共通writerに明示的26対応を追加し、旧lateral APIは23/24限定を維持。

派生mesh準備終了0。55mask中3変更：間脳tissue-4、内側側頭葉tissue-1、後脳第四脳室+17（粗格子）。変更前mesh再現一致、installationBlocked=false。report SHA `bf12d1d620ef4feb462d8a3b1d840a14ae4bb8eff116eb4c748de6521b432674`。断面用は第四脳室/脳室系の2meshを準備。読み取り専用preflightも終了0（`work/fourth-remaining-anterior173-preflight.log`）。本体採用・統合検証は未実施、右は31fae601のまま。残336候補・1層より遠い不足・尾側開放境界は未解決、専門家レビューではない。

## 2026-09-07：主腔全周の残存候補509点（未採用）

現行31fae601版で、主腔の全extentと1セル余白（app [178,156,58]–[213,195,98]）を探索。上方の独立2点は水道との帰属を別途扱う。`prepare_fourth_ventricle_wall_candidate.py --remaining-wall` で既存26の6近傍1層・既存0の2485点を記録、原300有限支持最小65000以上の509点を比較候補化。反復膨張・外部へのflood-fill・本体変更なし。候補SHA `0cea75569178c174e34e1aed2aabadf1a341efefc1ea93ac2de18b1297f4040e`、`work/anatomy-review/fourth-ventricle-remaining-wall31fa-candidate-v1/candidate.json`。

`fourth-remaining-wall509-series-y-v1/report.json` SHA `d86b90d638332563d407443cc3c932febd6dfbf9b812475922f664bf3338c7c6` の全19画像（原Y270–326、連続57面）を目視。`fourth-remaining-wall509-native300-v1/report.json` SHA `547454aa4f013f3f152a42ce0d6165724d54ef38053355c2df6e28a59875aade` はpoint-1のXYZとpoint-2のX/Z、計5画像を目視。未閲覧はpoint-0全3とpoint-2Y。代表Y308–310は全seriesとの重複で追加の異なる面として数えない。

主腔の脳幹側には既存輪郭と原画像の腔縁の間に不足が続く。一方、後方Y277–296の候補は小脳側の外へ開く空隙に面し、正中の組織を囲む候補もある。509点の一括採用はしない。原X311–313/324–326で前方壁の局所不足と後方・下方の開放縁を区別できる。上方Z156–158も腔の前方に未ラベル部分を認めるが、単層候補は全不足を網羅しない。

次の候補整理の読み取り専用診断：同じX/Z列に既存26があり、その前方端より前に位置する候補は173点（app [184,181,60]–[205,194,97]）、他336点。これは前方壁のレビュー対象を選ぶ幾何的手掛かりであって、その173点を採用する解剖学的判定ではない。次にこの区別を原画像の境界へ対応付け、正確な差分を決める。今回の本体/右previewは31fae601のまま。専門家確認・第四脳室完成ではない。

## 2026-09-07：前方105点を開発版へ統合、統合検証完了

`install_fourth_anterior105_repair.py` の全ファイル事前検査後にローカル採用。
入力e98cd406…から正確な105点のみ0→26、第四脳室8641 voxel。他label不変。
現在の圧縮SHAは `ffb8e56e0939f97b6bc9f8e2585bb3f74e11b525006c6f7d631ae85cd4b033c2`、
raw SHAは `60d4b7c9c98acd1ed83d935919e713430099dcdeee3e6571480a3606f993f64e`。
採用記録は `segmentation-patches/review/fourth-anterior105-adoption-2026-09-07.json`。
変更前volumeと第四脳室block meshは `tests/fixtures/*pre-fourth-anterior105-e98c*` /
`block-hindbrain-fourth-ventricle-pre-anterior105.mesh` に保存。

旧block meshを完全再現できることを確認してから新版へ更新。
全範囲section-currentの旧4meshも現在の基準labelから全byteを再現して照合し、
第四脳室・脳室系の2meshだけが変化した。側脳室・第三脳室は同一byte。
section-current-ventricles.jsonはWindows改行差のみをJSON全値比較で扱い、内容変更は拒否する。

ラベル版定数・現行SHAを検査するレビュー/パッチfixtureと視覚路/乳頭体の数値監査を同期。
旧監査JSONは保存し、新監査は `*-objective-audit-2026-09-07-fourth-anterior105.json` として追加。
旧40点採用テストは変更前fixtureへ固定し、新105点テストで最新資産までの連鎖を検証する。
関連Node11/11、Python修復/原300有限支持/全73原画像パネル検査4/4、全範囲mesh再構成2/2、
インストール事前検査Python2/2、型検査、本番buildも成功。
全Nodeは `work/fourth-anterior105-full-node-v2.log` で554/554成功。
ローカル4345の実ブラウザで水平・冠状・矢状断、分節3D、hindbrainの第四脳室単独レイヤー表示を目視確認。
ユーザーの右側プレビューをreloadし、水平断と3Dの描画を確認した。ブラウザ内の資産SHA取得は行っておらず、
資産同一性はファイル検査・再生成テストで検証した。公開/mainは未変更。残る欠損・微小片の解剖学的帰属は未完了。

## 2026-09-07：前方壁105点の全画像確認・差分ステージ（未統合）

現在のe98cd406…を基準に、`fourth-ventricle-anterior-next-candidate-v1` の105点を確認。
`fourth-ventricle-anterior-next-difference-v1` 全16PNG43面（X185–207、Y182–188、Z69–81）を目視完了。
続いて `review_fourth_ventricle_tail_native.py --anterior-next` で候補の有限範囲に交わる
登録300の全連続面と外側面を生成し、全25PNG73面を目視完了した。
範囲はX308–346、Y303–314、Z115–136。report SHAは
`d47dc1a998095b1c352efcbe90111a19545c5b9ae215771d8ea709f7d52cf386`。
原300の未着色側と赤の既存26輪郭・黄の105候補を並べて確認した。

候補は脳幹側の前方壁にある階段状の欠けで、左右の主な不足と中央付近の少数点を含む。
原画像の明るい腔側にあり、小脳側の外へ開いた空隙を追加していない。
X312–314/338–341では比較的大きな不足、Y305–311では両側の未充填部として続く。
Z117–134でも前方輪郭に沿い、見える脳幹組織を越えて延長する修復ではない。
ただし候補探索端のZ80を全体境界とはみなさず、さらに上方等の不足は残す。

別の `fourth-native100-wall-v1` は左右参照点[188,184,73]/[204,184,73]の
全6PNG18面を目視済み。native100は原空間への逆変換と輝度復号を検査した補助所見であり、
105点全体のnative100レビューではない。変換往復精度も解剖学的境界の精度ではない。

`stage_fourth_ventricle_anterior_repair.py` に固定候補・画像report/PNG SHA検査、正確な105点のみの
0→26、非ゼロ保護、復元検査を実装。work内にステージし、Python3/3成功。
修復record SHA `1c47eb7801d6c90f1d62b89401b6774a62108546c7c42c2974693380e7014e8a`。
候補volume SHA `ffb8e56e0939f97b6bc9f8e2585bb3f74e11b525006c6f7d631ae85cd4b033c2`、
候補raw SHA `60d4b7c9c98acd1ed83d935919e713430099dcdeee3e6571480a3606f993f64e`。
26は8536→8641、他ラベル不変。現在のアプリへの採用・専門家確認・公開ではない。

全55ブロックmaskを比較し、hindbrain/fourth-ventricleのみ粗格子9点変化、他54部品不変。
旧mesh再現SHAは現在のe821185c…と一致。候補mesh1212頂点/2420面、SHA
`fff082ddd40824e7e4400a90475eb1a2a17d1778a657d8faffbce7f750b38e3a`。
`fourth-ventricle-anterior105-meshes-v1` に保存。新設の全範囲section-current mesh2点の再生成、
ラベル統合・下流監査・ブラウザ確認は次の工程。現アプリの分節SHA e98cd406…は不変。

## 2026-09-07：16点開発統合の動作検証完了

全Nodeテスト533/533成功（fourth-paired-full-node-v2.log、153338.9061ms、session35216終了0）。型検査は直前のtsc-b成功、対象24/24成功。通常Vite build --configLoader runner成功、全テスト終了後にも通常distを再生成した（fourth-paired-normal-build-final.log、453ms、既存chunk容量警告のみ）。

`check_third_ventricle_core_browser.mjs --fourth-paired` がChromeで正常終了。4345の実データを使い、水平Z71/冠状Y182/矢状X188（1366×900）、水平390×844、hindbrain第四脳室単独レイヤーの5PNGを全て開いて目視した。`work/anatomy-review/fourth-paired-browser-v1` に保存。読込ラベルのraw SHA b17bcfbc…とmesh e821185c…を実responseで確認し、応答差替えなし。canvasあり、loader/UI error/WebGL fallbackなし。390pxは幅の再現であり物理スマホ検証ではない。図の解剖学的全体妥当性を動作テストから主張しない。

位置数値の長い小数表示は残件。今回の修復が第四脳室全体、脳弓・視放線、他の未解決構造の完了を意味しない。公開/mainは未変更。

## 2026-09-07：16点と対応meshの開発統合

`prepare_third_ventricle_core_meshes.py --fourth-paired` で全55部品を比較し、hindbrain/fourth-ventricleのみ2粗格子点変化。既存meshの再生成SHAは現行と完全一致し、過去の不一致はない。新mesh1220頂点/2436面、SHA e821185cbf03824d477627d35db14bfd3cdadb33a5437edf6285e13ce1910291。

固定stage/mesh reportを検査する `install_fourth_ventricle_paired_repair.py` により16点を開発ラベルへ適用し、mesh・validation・manifestを同期。第四脳室8520→8536点、他label不変、公開はしていない。変更前volume/meshはtests/fixturesへ保存、採用記録は `segmentation-patches/review/fourth-ventricle-paired-adoption-2026-09-07.json`。古い第三脳室の単独差分テストは今回の変更前fixtureで保持し、新規テストで現行までの16点を検証する。下流SHA参照と新しい視覚路/乳頭体数値監査を同期済み。統合テスト・型検査・build・実ブラウザは進行中で、未完了。

## 2026-09-07：左右前方の16点を修復差分として分離・ステージ

`--paired-holes` の登録300重ね合わせを追加し、`fourth-ventricle-paired-holes-native-v1` 全6PNG18面（X313–315/339–341、Y303–308、Z118–123）を個別目視した。Y303–305等の既閲覧面を含む。108点のうち、X187–188および203–204 × Y181–182 × Z71–72の左右各8点は、矢状断で脳幹側の輪郭の欠けに対応し、原300に組織塊を認めない。Y305以降にはそれと連なる不足が残るため、これを閉鎖穴の全修復とは呼ばない。小脳側の別の候補とは分離する。

`stage_fourth_ventricle_paired_repair.py` で固定16点のみ0→26としてworkへステージした。元108点JSONと全3組の画像レポート/PNGのSHAを検査、候補内の16点の有限300支持値65535、変更点数16、完全逆変換を確認。他92点は今回の差分に含めない。`scripts/test_fourth_ventricle_paired_repair.py` 3/3成功（正確な有限集合・逆変換・非ゼロ保護・重複/別座標拒否）。

成果物 `work/anatomy-review/fourth-ventricle-paired-stage-v1/repair.json`、`labels.bin.gz`、復元元`base.bin.gz`。出力候補圧縮SHA `d4295e7cc00edd3639b631473445d5db1bb25f9fbe18c5c7f21ff8b8471d7152`、raw SHA `b17bcfbcad38430f33d3bb6973d6ea847295e37670a4f04710d78a2986546142`。AI画像レビュー済み開発修復のステージであり、まだ製品採用・専門家レビュー・公開はしていない。次はmesh影響と下流整合性を確認して統合する。第四脳室の他の不足、脳弓等の未分節は完了扱いにしない。

## 2026-09-07：108点候補の全直交差分・登録300重ね合わせ確認

`review_third_ventricle_central_difference.py --fourth-extended` で現行9bc51ab0…と候補71517238…を固定した比較を生成。`fourth-ventricle-wall-extended-difference-v1` の全19PNG57面（X180–212、Y169–183、Z69–77）を目視完了した。最後のX204–212も個別表示で確認済み。候補は小脳側の縁・正中の小さな未ラベル部・両側の小さな未ラベル部に分かれ、単一の側壁不足ではない。

`review_fourth_ventricle_tail_native.py --candidate-overlay` を追加し、同じ固定108点を最近傍で登録300へ投影した。`fourth-ventricle-wall-extended-native-v1` 全8PNG24面を目視完了（X303–305/326–328/346–348、Y283–285/294–296/303–305、Z116–118/124–126）。原画像自体は以前の観察と重なる面を含み、新規24切片とは数えない。赤は既存26輪郭、黄は未採用候補。生成時のreport.visualReviewPendingは生成段階の記録で、この節が生成後の目視記録。

登録300でもY303–304の左右小穴とY295–296の正中小穴には明るい領域が対応する。一方、Y283–285/Z117の黄は小脳側に開く広い空隙に面し、X303–305/346–348では小脳表面付近である。X326–328の正中小穴も矢状断では外側へ開く縁として現れ、冠状断の「穴」をそのまま閉鎖空腔とみなせない。探索下限Y170/Z70が追加境界になる部分は解剖学的境界の証拠ではない。

結論：108点一括採用はしない。次は両側小穴の候補を局所連続断で切り分け、周囲組織を含まない修復集合として定義する。小脳側開放縁を同時に採用しない。明るさ・近傍条件だけでの採用も行わない。108点JSONと全画像は保存、製品ラベル9bc51ab0…/26=8520は不変。専門家確認済み・第四脳室全体完了とは扱わない。

## 2026-09-07：5点差分の全13面確認と隣接範囲の比較候補

既存差分rendererに `--fourth-wall` を追加し、候補SHA3e94ebf6…と現行9bc51ab0…を固定、0→26の5点のみメモリ内で適用した。`fourth-ventricle-wall-difference-v1` の全5PNG13面（X194–199、Y176–178、Z74–77）を目視完了。候補は主腔側壁全体でなく、小脳側へ入り込むくぼみの縁にあり、Y177では中央の未ラベル領域の一部を埋める。原画像には近接した灰色組織があり、その全未ラベル領域を空腔として埋めない。

初期箱端で候補が切れているか検討するため、同じ未ラベル0/26の6近傍1層/原300有限支持>=65000を維持して、XYZ[179,170,70]–[212,182,86]へ探索を拡張した（`prepare_fourth_ventricle_wall_candidate.py --extended`）。627点中108点の比較候補を `fourth-ventricle-wall-extended-candidate-v1/candidate.json` へ保存、SHA `7151723811e2d39e7b6b2ccb2c053c5edbfa814aa5956574a2bdcdb4b4a71e9f`。閾値緩和・複数回膨張・flood-fill・既存label置換はしていない。

108点版は差分未生成/未目視/未採用。新規範囲の全候補直交断と探索端を確認する必要がある。5点版も採用していない。製品9bc51ab0…不変。

## 2026-09-07：主腔壁の連続24面と初期候補の限界

`review_fourth_ventricle_tail_native.py --wall-series` により、登録300のY294–305とZ125–136の連続24面を `fourth-ventricle-wall-series-v1` に生成、全8PNGを目視した。Y299–301は直前資料と重複し、新規の異なる面は21。主腔の輪郭不足は続くが、後方の小脳組織と尾側開放部を分ける必要がある。Y295–296には中央の未ラベル小領域、Y302–304には両側の小領域がある。白く見えるだけで組織なしとは確定しない。

初期のwork-only抽出script `prepare_fourth_ventricle_wall_candidate.py` を追加。app XYZ[179,177,75]–[212,182,81]の未ラベルかつ既存26の6近傍1層にある82点を、登録300有限支持値で記録した。65000以上は5点のみ、残77点は不採択。支持最小49275/最大65535。候補は[195,177,75],[196,177,75],[196,177,76],[197,177,75],[198,177,75]で、すべて探索範囲のY177端に接する。`fourth-ventricle-wall-candidate-v1/candidate.json` SHA `3e94ebf6534e83ca1231169d1ac2880f1f46e5db226a13176f2364bf9046ebda`。

この5点は境界の局所レビュー用候補にすぎず、壁際不足を修復できたとは扱わない。探索範囲と既存maskの隣接1層に強く依存し、原画像で見えた広い差を十分に対象化していない。閾値を下げて無理に候補数を増やさず、まずY177端を越える実際の空隙の連続と、見かけの壁際の部分体積を区別する。差分未確認・採用なし。現製品9bc51ab0…と26=8520は不変。

## 2026-09-07：主腔・尾側の登録300µm画像による再点検

第三脳室修復後の現label9bc51ab0…を固定し、`review_fourth_ventricle_tail_native.py` で `work/anatomy-review/fourth-ventricle-tail-native-v1` に8PNG24面を生成、全8PNGを個別表示して目視した。native X323–331（9面）、Y283–285/299–301（6面）、Z89–91/99–101/109–111（9面）。原画像SHA ebf0e88d…はICBM登録300µmであり20µm未変形切片ではない。赤は既存26の投影輪郭、修正案は描いていない。

矢状断では主腔の尾側が小脳と脳幹の間の広い空隙へ連続し、この24面だけから脳室下端を閉じる膜・正確な出口境界は確定できない。Z89–91（app Z54近傍）はラベルがなくても空隙が存在するが、その全幅を第四脳室へ追加しない。Z99–101（app Z60）は正中の小ラベル、Z109–111（app Z66）は横長のラベルで、外側・後方の空白へ連続する。単純flood-fill不可を画像から再確認した。

Y299–301では主腔を囲む組織と既存輪郭の間に未ラベルの余地が見える。尾側の開放域を一括延長する課題と、主腔の壁内側の局所補完を別に扱う。次は主腔（app Y180付近）の壁際を隣接した冠状断・水平断で限定し、残す組織を避けた差分を評価する。24面は代表初期点検であり全第四脳室の監査完了ではない。現26=8520、41=16を維持、製品変更なし。

## 最新：47 voxelを開発資産へ接続（2026-09-06、未公開）

旧unreviewed候補はそのまま保存し、別の `segmentation-patches/review/ventricle-classification-project-review-2026-09-06.json` を作成した。中脳水道16 voxelはユーザーの分類指示、前方31 voxelは自律修正指示下のAIによる原画像・連続断・直交断・全体位置の点検に基づく。reviewerは `ai-assisted-project-review-under-maintainer-direction`。**ユーザーが31 voxelを個別目視承認したという記録でも専門家レビューでもない**。開発版への限定採用であり、公開・main統合の承認ではない。

[draft PR27の記録](https://github.com/bonnginn/brain-practical-navi/pull/27#issuecomment-5553267106) を追加した。現時点では未commit/push。strict approved validatorを経て `work/anatomy-review/ventricle-classification-adoption-v1/labels.bin.gz` を出力し、圧縮SHA `930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7`。`apply_approved_ventricle_classification_patch` は正確な47座標と変化先を固定し、全検査後だけ反映する。実採用JSONによるstageテスト1/1で全47箇所、第四脳室8,520／部分水道16、Z114不変、完全復元を確認した。

生成スクリプトのmain処理へ47 stageを接続し、開発assetsのvolumeと版定数を更新した（git mainへの統合ではない）。`install_ventricle_classification.py` は旧履歴fixtureから正確な差分だけを再構成し、新旧SHA以外の現行資産を上書きしない。元NIfTI入力の全処理を再実行したという意味ではない。`audit_practical_reconstruction.py` は現在のラベル生成本体を実行し、全ラベル差異0・raw SHA一致を `work/anatomy-review/practical-reconstruction-v2.json` に記録した。旧16単独stageは準備履歴であり、新47stageと重複適用しない。下記の未採用記載は個別候補を作った時点の履歴。

乳頭体・視覚路の数値監査を新volumeで再生成し、2026-09-06付の別JSONへ保存した。旧記録は変更していない。ID41はクリック同定で部分候補の説明を日英表示し、通常構造一覧／クイズには追加しない。第四脳室の説明は削除済みの前方小片と未確定の上方2 voxelを区別する。対象Nodeテスト93/93・TypeScript成功。統合後の実ブラウザ確認と全体テストは別途記録する。

`audit_classification_block_meshes.py` により全55パーツの旧新マスクを比較した。第四脳室だけ1 mm格子で6 voxel変化し、他54パーツは不変。旧第四脳室meshをSHA `e4276e536ad9cacc2dd9f1713c7410fdc349398b09214d5eb14dafe088f73fef` まで完全再現してから、当該mesh1点とmetadataだけを更新した。新SHA `1cfc2dade80d86c041f0696af721b3068c7121bfbcc77bee70c59ce717df5613`、1,228頂点／2,452面。`work/anatomy-review/classification-block-meshes-v1/report.json`。別途修正済みの中脳組織meshは保持。ここでの54パーツ不変は今回47 voxel修正による差異についてであり、以前の中脳組織修正を否定しない。

旧volumeは `tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz` にSHA照合後保存した。旧差分のPythonテストはこのfixtureへ固定し、将来の配布版変更で歴史的パッチの入力を書き換えない。移行後のPython全24/24成功。新volumeのraw SHAは `261beb616856653d4d7acd2d411a98f1435eb6beab8b91a2b8ac7b5642909d18`。

`audit_ventricle_classification_browser.mjs` は同じ通常buildでラベル応答だけを旧／新に差し替え、水平位置69の水道小片と矢状位置44の前方小片を実マウス操作で同定した。旧26→新「中脳水道候補（部分）」、旧26→新「ラベルの範囲外」、部分候補の通常クイズ除外説明、描画エラーなしを4/4確認し全4画像をAIが目視。`work/anatomy-review/ventricle-classification-browser-v1/report.json` に実応答SHAとブラウザ情報を保存。これはstaged asset overrideであり、アプリの版定数更新・配布assetsの統合検証ではない。最初は全Nodeテストが残したPages-base buildとroot serverが一致せずapp rootを読めなかったため、通常buildを再生成して成功した。今後はrunner冒頭で通常baseを要求し早期拒否する。

## 2026-09-06 採用段階の安全性準備

統合後の検証: 全Node **484/484**（`work/anatomy-classification-full-tests.log`）、Python **24/24**、型検査、通常build成功。実際のdist資産（ラベル応答の差し替えなし）で日英×水道／前方除外点のクリック同定4/4を確認し全4画像を目視した。`work/anatomy-review/ventricle-classification-browser-integrated-v1/`。第四脳室blockの新mesh実応答SHAを検証し、通常／透過×上下面の全4画像を目視した。通常は周囲組織に隠れ、透過では第四脳室主腔が見える。`work/anatomy-review/fourth-ventricle-block-browser-v1/`。これらはWindows上のローカルChromeであり、公開先・物理端末での確認ではない。

この目視で発見した既存の英語header／詳細欄の重なりは別途修正。headerの2段化を1600pxまで適用し、日英×8幅（1920/1600/1440/1366/1200/1024/768/390、mouse/desktop emulation）で要素の重なり・ページ横overflow・描画エラー0、代表4画像を目視。`work/anatomy-review/header-layout-v1/`。スマホ実機・touch検証とは扱わない。英語のアトラス由来説明とホイール操作説明の残った不自然な訳を原文に沿って訂正した。

現行作業PRは読み取り照合で#27、OPEN・draft、branch `codex/september-learning-review` と確認した。候補のreviewStatusを変更したり、PRへ採用記録を送ったり、配布volumeを変更したりはしていない。

`build_bigbrain_practical_seg.py` に未接続の `apply_approved_partial_aqueduct_patch` を準備した。mainからは呼ばない。採用後に使う場合もstrict approved／元raw SHA／正確な格子・uint8／固定16座標／全26→41だけを要求し、集計一致だけで別の16座標を許さない。全検査後の一括反映で失敗時は原volumeを保持する。

`tests/test_partial_aqueduct_stage.py` は実データと実未承認JSONの拒否、テスト内だけの模擬承認による厳密16 voxel変更・完全復元、追加／移動／別ラベルへの改変拒否を検証する。テスト内の模擬承認を実際の採用記録と扱わない。通常表示・名称・由来・クイズ除外・下流SHA監査の同期が終わるまで配布本体へ接続しない。

クリック同定の名前辞書にも41「中脳水道候補（部分）」を準備した。通常のstructure一覧・bigbrainIds・quiz targetには追加していない。候補に対応する説明は部分収録／未確定／通常クイズ対象外を日英で明記する。また未登録ラベルをクリックした時に以前の選択構造の説明が残る既存バグを修正し、クリック時の説明を独立保持した。

型検査・本番ビルド、関連日英13/13、新規静的回帰3/3成功。Chromeローカルpreview 4346、1440×1000で、断面の枠外を実クリック→詳細解説を開き、未ラベル／組織不存在とは限らない説明、エラーなしを実測・画像目視。`scripts/audit_identification_note_browser.mjs`、`work/anatomy-review/identification-note-v1/report.json` と `outside.png`。41は配布データにまだ存在しないので、今回の実ブラウザ確認は41の実クリック成功を意味しない。小画面／英語実操作は未確認。README日英に同定説明修正を同期。Sitesスキルに従い既存構成を保ち、公開はしていない。

## 更新：未ラベル化ではなく、中脳水道への分類変更

ユーザーの「①は中脳水道にぬりかえたほうがよい」という指示に従い、同じ16 voxelを26→41へ変更する新候補 `segmentation-patches/review/aqueduct-reclassification-candidate-2026-09-05.json` を作成した。旧26→0案は比較履歴として保存するが、**両方を適用してはいけない**。新候補が旧案を置き換える。

41は編集・レビュー用の「中脳水道候補（部分）」としてPython/ブラウザの差分メタデータと編集ツールのパレットに追加。通常学習・クイズ・配布volumeには未登録／未適用。全長を塗り終えた意味ではなく、境界拡張は0 voxel。元の未ラベルvoxel数は不変。`prepare_fourth_ventricle_candidate.py --aqueduct` で三方向比較と差分を再生成できる。出力先 `work/anatomy-review/aqueduct-reclassification-v1/`、赤は26、紫紅は41。X比較をAIが再目視した。

ユーザーの分類方針と、strictパッチの採用記録は区別する。PR上の正式記録と下流資産の整合更新は未実施なので、現時点のJSONはunreviewedを維持する。

今回の検証: Python候補テスト5/5、既存ventricle-adoption＋rendered-htmlテスト81/81、TypeScript型検査、本番ビルド成功。diff-checkは改行警告のみ。全Nodeテスト／実ブラウザでの編集・import・export操作は今回未実施。既存の本番bundleサイズ警告あり。公開assetsの差分はない。

### 他の修復調査：脳幹下端の判定を保留

原画像Z0–2は各断面**全体が255**で、ラベル27が608/612/612、計1,832 voxelある。Z3から画像信号が現れる（Z3の非255は断面全体で140 voxel）。したがって、この1,832 voxelは「原画像上で組織の不存在を確認した誤ラベル」とは断定できない。画像収録端・欠損／背景処理の影響を調査するまで削除しない。前回の「背景ラベル」という数値所見を解剖学的削除の根拠に転用しない。

## 結果と採否

ID26 の中脳水道付近の独立小片16 voxelを ID26→0 とする可逆候補を作成した。**未採用・専門家未確認**。0 は「未ラベル」であり、組織の不存在や背景の確定を意味しない。中脳水道全体の分節を完成させたものではない。公開ラベル・アプリ・3Dモデルは変更していない。

- 差分: `segmentation-patches/review/fourth-ventricle-exclusion-candidate-2026-09-05.json`
- 再生成: `scripts/prepare_fourth_ventricle_candidate.py`（ラベルvolumeを出力しない）
- 原画像SHA-256: `c4b69975f0dece2512adf3bcae690226492cfa66ded38380b3b94aa8dba52746`
- 元ラベルSHA-256: `b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3`
- ID26: 8,567 → 8,551 voxel（候補をメモリ上で適用した値）
- 16 voxel = 2 mm³。XYZ [195,199,116]–[196,202,123]、6近傍で単一成分。
- 全16座標は生成manifestと差分runsに保存。変更前はすべて26で、26への復元が完全一致することをテスト。

## 解剖学的判断の根拠と限界

中脳水道は中脳内を走り、第四脳室とは区別する（[NCBI Neuroscience: The Ventricular System](https://www.ncbi.nlm.nih.gov/books/NBK11083/)、[NLM MeSH: Fourth Ventricle](https://www.ncbi.nlm.nih.gov/mesh/68020546)）。これは一般的な解剖学的根拠であり、この16 voxelの境界を外部資料が保証するわけではない。

前回の全Z点検とX195の矢状断所見を再確認した。さらに今回、同一BigBrain原画像の Z115–124、X194–197、Y198–203 を修正前・候補と対にしてAIが目視した。対象は橋背側の大きな第四脳室主腔ではなく、上方の中脳内の細い腔に位置する。既存の小片を第四脳室として残さない判断には根拠があるが、0.5 mm画像の部分体積効果、近傍腔との移行部、細い腔の全長は未確定。新しい境界を描いたり空白を連結したりしていない。

seed [195,199,119] は目視した成分を再現する識別子に限る。座標・小ささ・連結性だけを解剖学的判定の代用にしていない。入力SHAと16 voxel／bboxを固定して、入力変化時の推測再生成を拒否する。

## 全成分と保留

### 2026-09-06 前方の左右小片を精査

左16・右15 voxelは、全体矢状断locatorと各占有X/Y/Z＋上下1枚を点検した結果、橋の腹外側の外部空間に位置する。橋と小脳の間の第四脳室主腔とは反対側にあり、第四脳室ラベルとして保持しない判断に根拠がある。`render_ventricle_fragment_review.py` により3 fragmentの9連続断シート・3全体locatorを生成し、全12画像をAIが開いて目視した。左14断面・右14断面・上方2 voxel片10断面、計38断面。根拠は座標上の前後だけではなく原画像での橋の外形との位置関係。

`segmentation-patches/review/fourth-ventricle-anterior-fragments-candidate-2026-09-06.json` はこの2成分31 voxelだけの26→0、medium／unreviewed。0は未ラベルであり、特定の脳槽や血管へ再分類しない。採用済みでも公開反映済みでもない。元第四脳室8,567→8,536、16 voxelの水道再分類とは非重複。Z114の上方2 voxelは中脳水道の尾側移行付近だが、この画像から分類境界を確定せず保持した。

実volume候補テスト6/6成功。2成分の座標集合と数量、上方2 voxel／水道16 voxelの不変、完全復元を検証。`work/anatomy-review/ventricle-fragments-v1/report.json` に全座標、crop、各画像SHA、候補SHAを保存。`--exclusion-candidate` でwork内へ再生成する。配布volumeは未変更。

| voxel数 | XYZ最小–最大 | 今回の扱い |
| --- | --- | --- |
| 8,518 | [179,157,59]–[212,194,97] | 主腔、変更なし |
| 16 | [171,239,73]–[174,240,74] | 前方左小片、別途原画像判定が必要 |
| 15 | [217,239,73]–[220,240,74] | 前方右小片、別途原画像判定が必要 |
| 2 | [193,195,114]–[193,196,114] | 今回の数値確認で明確化。未変更 |
| 16 | [195,199,116]–[196,202,123] | 今回の除外候補 |

前回の「Z98–115には連続ラベルなし」は、全スライスが空という意味ではない。Z114に2 voxelあり、空なのはZ98–113とZ115。今回の修正だけで ID26 全体を正しいと認定しない。

## 証拠と確認方法

生成先 `work/anatomy-review/fourth-ventricle-repair-v1/`:

- `x.png`、`y.png`、`z.png`: 左から原画像、既存ID26の赤輪郭、候補ID26の赤輪郭。最近傍拡大のみ。
- `manifest.json`: 入力／patch／PNGのSHA、全座標、画素→XYZ対応、スライス範囲。
- `fourth-ventricle-exclusion-candidate.json`: tracked差分と同一の再生成物。

`tests/test_fourth_ventricle_candidate.py` は実volumeで変更集合、主腔／Z114不変、完全復元、誤SHA拒否、6近傍を検証する。既存 `apply_segmentation_patch.py --check` でstrict整合性を検証する。正式適用は既存のapprovedレビュー手順を維持する。未承認をapprovedへ書き換えたり、適用ガードを迂回したりしない。

## 次段階

この候補の採否を確認後に生成処理・資産・下流SHA監査を一括更新する。その前に、他の小片を同じ理由で一括削除しない。脳幹／脳梁の欠け、内包・淡蒼球などの詳細化は別の修復対象であり、完了扱いにしていない。
