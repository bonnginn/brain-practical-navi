# 解剖学レビューの残存作業 — 2026-09-06

## 現在位置（2026-09-07更新）

**一時停止（ユーザー指示）**：以下の12点統合後の全Node561/561成功、参考文献表示追加後の関連81試験・型検査・通常build・日英表示・配信一致確認まで完了。これ以降の「進行中」「次は」は履歴または再開後の予定で、現在の自律作業は停止。全体完了ではない。最新状態・公開候補は [PAUSE_CHECKPOINT_2026-09-07.md](PAUSE_CHECKPOINT_2026-09-07.md) を優先する。

最新本体3aa41278：準備済みの第四脳室8点追加と第三脳室4点除外を同じ基準から合成し、12点として採用。25=11977、26=9008。独立stageを順番に上書きせず全差分を再生・逆復元した。stage `ventricular-mixed12-stage-v1/repair.json` SHA `7d688ef29bac9d40de94bbd21e0f5a9857e9e5e2439badb83d38ffb9e933d708`、mesh impact SHA `96917c60327dfc5c9c5a983690c6afa328c46edf909f74fd34d4df6fef5d3015`。2ブロック部品（間脳tissue-1、第四脳室+3）と断面3meshを同期。型検査・Python2試験・regional2試験成功。全Node `work/ventricular-mixed12-full.log` session52366進行中、suite後build/右更新が残る。下記6626は履歴。

第三脳室のZ107比較で、除外4点とは別に残る着色小片を目視した。全volumeの26近傍成分を再計数すると、除外した4点群は消え、20点未満の独立小群は13（最大16）。145点群など大きい成分はこの集計に含まない。Z107の別小片はこの独立小群一覧に無く、大きい成分に細く連なる可能性がある。次はその下方終端の局所連続性を確認する。全小群除外/主成分全体承認とはしない。

最新本体/右は6626f8eb（第四脳室上方後壁111点採用、26=9000）。全Node561/561・型検査・通常build・配信一致・断面/関連3ブロック初期描画確認済み。前のad444107等は履歴。main/公開変更なし。

追加調査で旧後方336候補の12採用済み/324残存を照合。下方316は代表XYZ9図で外部開放空間との連続を再確認、一括充填を保留。上方残8はXYZ9図で腔縁不足を確認し `fourth-upper-residual8-stage-v1` に可逆保存（SHA `a69a55e7fc4964d83d6cff241d8dc1810af64a6cab8dbd170cfc046690647ef3`）。また第三脳室下方の独立4点を外部空間の誤ラベルとして除外stage化（`third-inferior4-stage-v1` SHA `f955eb3f0ba4619b8282067ec230ee808eddfb3a7ad7f5f165faebe42db06ba1`）。二つは同じ6626f8ebを入力にした独立stageであり、互いを順に上書きしてはいけない。次は両差分を同じ基準へ合成し、3D影響/一括検証後に右を更新する。`tests/test_ventricular_pending_batches.py` の2subcase全volume再生/逆復元1試験成功。まだ両差分とも本体/右に未反映。

第三脳室左上方10点の代表XYZ3図も確認（`third-left-roof10-current-native300-v1` SHA `0c58ef7914b13f599e378906acbc7535965192b34eb5aca70f68e8fcc731ec31`）。薄い帯の間の空隙にあり、屋根/槽と第三脳室の帰属は代表面のみでは未確定。右上方16点同様、全削除や周囲への充填をしない。これは正確性承認ではない。

27点採用・統合確認と右更新完了。現行ad444107、26=8889/27=249983。全Node561中560成功、旧mesh参照1件を履歴保持して修正し対象3/3成功。型検査・suite後build・配信一致・断面と関連3ブロック初期描画を確認。前方depth再探索は10055点検査/候補0/上限到達0（条件内のみ）。次は第四脳室の後方/外側・薄い境界、第三脳室上方など。以下の未採用/進行中は履歴、全体目標は継続。

追加27点（0→26が16、27→26が11）のwork-only可逆stageを準備し、全55ブロック比較・変更4部品/断面2mesh準備・read-only preflight成功。stage SHA c2f7d98f…、仮出力ad444107、impact SHA 2b4677ac…。詳細はFOURTH_VENTRICLE_REPAIR冒頭。本体/右は2bf9dd7dのまま。次は採用と統合検証。全体目標は未完了。

48点採用版2bf9dd7dの統合確認終了。全561中558成功、旧現行総数参照3件を修正し対象6/6成功。型検査・通常build・HTTP全byte一致・右reload後断面/3D初期描画を確認、README日英同期。全体目標は継続。次は未ラベル16点の下方代表、第四脳室の後方/外側不足と開放境界、第三脳室上方群等。以下の「実行中」は履歴。

第四脳室の脳幹競合48点を27→26へ開発本体採用。現行2bf9dd7d、第四脳室8862/脳幹249994。原300連続60Z面＋代表XYZを確認、差分/逆復元・55mask不変を検証、断面2mesh同期。型検査とregional2試験成功、全Node session96137進行中。通常build/右preview反映はその後。詳細はFOURTH_VENTRICLE_REPAIR冒頭。追加16候補、後方開放境界、第三脳室上方群、脳弓等は未解決で全体目標は継続。

前方の不足を多層で診断し、未ラベル追加候補16点に加え、既存脳幹ID27で塞がれた強支持48点を発見。単層/既存0だけの探索では見逃す競合であり、次は27→26の原画像対応を精査する。48点の代表point-1XYZは目視済み、他6図未閲覧。詳細はFOURTH_VENTRICLE_REPAIR冒頭、まだ追加採用なし・右aa3b649e。

173採用版aa3b649eを右へ反映。型検査・通常build・配信全byte一致・断面/変更3ブロックの初期描画を確認。全561中558成功、旧mesh参照3件を履歴連鎖検証へ修正し関係6試験成功（全suite再実行ではない）。詳細はFOURTH_VENTRICLE_REPAIR冒頭。次は残336候補と1層より遠い第四脳室不足、第三脳室の帰属保留を評価する。全体未完了。

第四脳室前方173点を開発本体へ採用、現行aa3b649e・26=8814。3部品と断面2mesh同期、現行参照/客観監査・型検査成功。全Node実行中session89688/log `work/fourth-remaining-anterior173-full.log`、suite後通常build/右reloadが残る。README日英同期。以下の未applyは履歴。全体目標未完了。

第四脳室前方173点を代表XYZ全9画像と既閲覧の親57Y面で確認し、0→26の可逆stageへ。詳細は `FOURTH_VENTRICLE_REPAIR.md` 冒頭。専用1/共通3試験成功、全55mask影響・3変更部品の旧mesh再現一致、断面2mesh準備とpreflight終了0。まだapplyなし。次は173採用・下流参照/試験同期・build/browser検証、その後残336/更なる不足を評価。右previewは31fae601維持、全体目標未完了。

第四脳室の残存主腔全周を探索し、1層2485点中509点を比較候補化。全Y270–326の57連続面と代表5画像を目視。前方壁の不足と、小脳側の開放縁に面する候補が混在するため一括採用しない。前方端にある173点と他336点を読み取り専用で切り分けたが、これはレビュー対象整理であり採用ではない。詳細/固定SHAは `FOURTH_VENTRICLE_REPAIR.md` 冒頭。次は前方壁と候補の直接対応を確認して差分を確定。今回追加採用なし、右は31fae601。

後方2点採用版31fae601の統合検証完了：全561テスト成功（161.7秒、session4118終了0）、型検査・suite後build成功、配信全byte一致、右タブ3の水平断40/3D初期描画を確認し更新。README日英同期。同一Z156の比較はこの面1点の白質内着色除外を示す。全体目標は未完了。次は第三脳室の上方・周辺独立群の帰属と第四脳室尾側の塗り残しを継続する。

後方2点の除外は開発本体へ採用済み。現行31fae601、23=80373/24=79082、関連断面mesh/fixture/採用記録同期。型検査・新SHA客観監査成功、全Node試験session4118実行中（log `work/posterior-ventricular-islands2-full.log`）。通常build・右reloadはsuite後に必要。下記未applyは履歴。

並行して第三脳室ID25の右上方独立16点（seed[207,219,171]）を原300で再評価。`third-right-roof16-after-islands2-native300-v1/report.json` SHA `2932c343c4d0f03f6d0247311cf95a561f14bd45f0f96717f2d90a06b38e3fb4`。point-0とpoint-2のXYZ全6図を目視（X344–346/Z284–286は重複、Y364–366と369–371）。赤は明るい空隙側で、上方の別空隙との間に薄い組織帯がある。第三脳室への帰属、屋根/槽との境界の確定にはこの代表画像だけでは足りず、全除外・周囲への充填はしない。point-1未閲覧。これは16点の正確性承認ではない。

後方の明白な脳回内白質2点を可逆stage化。`LATERAL_RESIDUAL_ISLAND_REVIEW.md` に固定SHA/差分/影響を追記。全55ブロックmask変更0、断面mesh準備とpreflight終了0、専用2試験成功。未applyなので右previewは3c4b795dのまま。次は本体採用・参照同期・統合検証後、第三/第四脳室の残存群へ継続する。

残存側脳室の未閲覧7群10点を原300の代表XYZ・各3連続面で目視し、`LATERAL_RESIDUAL_ISLAND_REVIEW.md` に根拠と報告SHAを記録。腔縁/内側移行部のため一括削除はせず保持・帰属保留とした。先行6群と合わせ13群32点の代表画像を一巡（全有限体積の精査とは別）。後方の脳回内白質2点は除外候補のまま、次は可逆差分化。今回ラベル追加採用なし、右previewは3c4b795d。全目標・全脳室レビューは未完了。

1092採用版の全Node561/561成功（170.9秒、session84161終了0）、全suite後の通常build・diff-check成功。`work/left-medial-anterior1092-{full,post-suite-build}.log`。HTTP200で取得した展開済みvolumeの全byteと本体が一致、dist圧縮byteも本体一致。右タブ3をreloadし水平断40の断面/3Dを目視、読み込みエラー表示なし（この40は変更Z151とは異なる）。旧QAタブ14は消えていたため再利用を打ち切り、別タブ15で側脳室→脈絡叢→脳梁脳弓の全3ブロック初期描画を確認。全回転/全境界の再評価ではなく、狭幅の見出し上端欠けは残る。README日英同期、main/公開変更なし。次は残る側脳室の微小独立点と第三/第四脳室の保留箇所を原画像で再評価する。

1092採用後の全格子連結在庫を再計測。`work/anatomy-review/current-ventricle-components-after1092.json` SHA `fb2bc5d646c6420b0d1f996404ae76281ff7a201e2b44343e3b9d64b72467ea4`。ID23=80374、6近傍46成分/26近傍10成分、26近傍最大80360で残14点。ID24=79083、6近傍26/26近傍5、最大79065で残18点。対角接続を連続した解剖構造の証明には用いない。左右の微小独立点は塗り残し・有限格子による分離・誤ラベルのいずれかを原画像で区別し、自動削除/橋渡ししない。ID25の独立145群、ID26の上方2点、ID41=16点は依然残る。全脳室完了ではない。

1092を開発本体へ採用、installer apply終了0。現行compressed `3c4b795d09819a7dc029ffe33fb80621fa6db81fbb7b0eb3507eaf432c29a887`、raw `88cf25f0ff9a00e3ae076656ed0579b0877b600aa1b21541c333036ab406b534`。ID23=80374、24=79083/25=11981不変。3部品・断面mesh・復元fixture・採用記録を同期。客観視覚路/乳頭体監査の新SHA再実行と型検査・通常build終了0。監査ファイルは `*-objective-audit-2026-09-07-left-medial-anterior1092.json`、新たな解剖学レビューを意味しない。全Node試験はsession84161/log `work/left-medial-anterior1092-full.log` で実行中。suite後の通常buildと右reload/関連3ブロック描画はまだ未確認。以下の未採用記述は履歴、公開/main変更なし。

1092の派生準備・読み取り専用preflight成功（applyなし）。mesh report SHA `d47ea01d1c77ad0eee6216e1b1155bd2e8daf1fbb1439a93e81c2d5afc58dee2`。55mask比較で3部品変更、旧byte再現すべて一致・installationBlocked=false：側脳室tissue-35、脳梁脳弓の側脳室+97、脈絡叢tissue-35。断面mesh準備も終了0。preflight log `work/left-medial-anterior1092-preflight.log`。同一Z151比較図を生成・目視、この面35点で内側縁の不足が減り、左右間の組織を保つ。比較はwork-stageの仮出力であり右previewへ未反映。次は本体/3部品採用と現行参照・テスト同期、型検査/build/browser。全目標は未完了。

左内側前方1092点の画像レビュー・可逆stageを完了、まだ本体未採用。series SHA `1897ab269d1a735d73b1427f4a7d3c742c3638c80190556b5195659ba89135a2` の全25contact（Y450–524、75面）を目視。native300 SHA `a601fdc9f353fe743b4b432dd42bffa902302f8cd1fa0799d9cf835a62b3cde7` はindices0,2,8（X318–320、Z251–253/256–258、計9面）を目視。残る代表X/Zは同じ断面の重複、代表Yも全series内であり、別の追加レビューとして数えない。候補は内側腔縁の段状不足を補い、左右間の薄い組織や下端の灰色組織を一括で塗らない。有限格子の境界不確実性は残す。原300のAI画像レビューであり専門家確認ではない。

stage SHA `64f91b8b7cdcb69e35d131a4c2304b862f13b330ae7ee46c1985f3e8dc3093bb`、0→23の1092点のみ・全差分と逆復元確認。仮compressed `3c4b795d09819a7dc029ffe33fb80621fa6db81fbb7b0eb3507eaf432c29a887`、raw `88cf25f0ff9a00e3ae076656ed0579b0877b600aa1b21541c333036ab406b534`、仮ID23=80374（79282から）。本体と右previewは6a536のまま。55mask/関連meshと断面mesh準備を開始、ログ `work/left-medial-anterior1092-{meshes,section-meshes}.log`。次は派生影響・preflight・一括採用・試験/build/browser。main/公開変更なし。

1092候補の連続/代表画像生成は終了0。生成しただけであり、候補境界の連続/代表画像はまだ未目視。次に継続する。直前工程は外部漏れの特定・棄却と、別区域1092候補の探索証拠を得た進捗であり、追加採用ではない。

内側前方の独立探索は終了0。`left-medial-anterior-isolated-exploration-v1/report.json` SHA `a9cef616394404307352585be60a7361b7ab1709648ed0c45303a228cab81673`。原300 low[150,450,120]–highExclusive[350,600,380]、seed[300,499,280]。64500/65000/65400すべてyminだけに接触し他5面0、65400の139840点から多数有限支持・既存0・crop面除外1092点が候補。全9探索画像（X199/249/299、Y487/524/561、Z184/249/314）を目視。既存腔の内側縁の不足を含み、左右間の薄い組織と外部皮質溝を越える広範な漏れはこの探索図では見られない。ただし候補全境界を精査したものではない。Y561は腔終端後で候補表示なし。

`left-medial-anterior1092` の全Y・代表XYZ画像を生成開始（log `work/left-medial-anterior1092-review-generation.log`）。次は候補全範囲の連続断と代表直交断の目視。1092点はまだstage・本体採用なし、右previewは6a536のまま。README掲載機能変更なし。

内側漏れの位置を絞り込み：`work/left-medial-leak-first-plane.log`。原300のX最大exclusive322では209006点・xmax/ymin接触のみ、323（X322追加）で1821084点・全6面へ拡大。新X322面上で既存腔seed成分と外部成分の間の最短閾値経路を求め、[322,438,215]→[322,441,185]、中心[322,440,200]を特定。これは明るい画素の接続経路であって、切断すべき解剖学的境界ではない。

`left-medial-bridge-x322-v2/report.json` SHA `d9b63c7593e90ad77cb0290824a367f5e7c72d7a47ebf39d97226269a4c69361` と広域 `left-medial-bridge-x322-wide-v3/report.json` SHA `95d9ddfcff31ab7b1b2a00a58499a849b4a294ee09a04958e9cecff710263511` の各XYZ3面、計18表示を目視（同じ9面の異なるcrop）。正中近傍の広い白い隙間が腹側の外部空間へ続く。資料だけで正常な脳室腔/標本の欠損等を断定せず、そこを機械的に閉じたり全体を側脳室にしない。初回v1はJSONのnumpy型で失敗・画像縦横比問題もあり、不採用の中間成果物。v2/v3は型変換・縦横比保持修正後のもの。

前方を別区域として探索：seed[300,499,280]、high[350,600,380]でlowY445は全6面漏れ、lowY450では139840点/ymin1793のみ、460では121789点/ymin1862のみ（`work/left-medial-anterior-beyond-bridge.log`）。座標は探索範囲でありラベル分割規則ではない。現行6a536版に対する `left-medial-anterior-isolated-exploration-v1` を開始、session85969/log `work/left-medial-anterior-isolated-exploration.log`。次は画像と候補を確認し、候補が残っていれば連続断レビュー。まだ製品への追加採用なし、右preview6a536維持。

右4515の全suite終了：561件中558成功、3失敗は過去のcavity21/detached547/residual80試験に残る現行ID24総数74568の参照。現在79083（+4515）へ機械同期し、対象3/3再確認成功。先行失敗logを保持し、全561/561の新規成功とは表現しない。型検査・全suite後の通常build成功、ログ `work/right-anterior-terminal4515-{count-rerun,post-suite-build}.log`。89対象成功・4ブロック描画の証拠は下記。未公開。

内側の別seedを旧探索の原300 Y499画像から[300,499,280]（raw65535）に設定した診断：同low[150,380,120]、high[xmax,600,380]でxmax330/340/350のすべてが全6面接触、2099006/2333558/2486047点に漏れる（`work/left-medial-anterior-reseed-diagnostic.log`）。この抽出を採用しない。単純なseed変更や前後box切り詰めでは内側の外部接続を解消できず、連絡部の画像評価・局所境界が必要。これは追加ラベルでも専門家判定でもない。

右4515対象試験89/89成功（27秒）。全suiteはsession60736、`work/right-anterior-terminal4515-full.log` で実行中。IAB別タブ14で側脳室→放線→脈絡叢→脳梁脳弓の4ブロックを初期描画確認、読込エラー表示なし。狭い画面の見出し上端欠けはなお残る。以下の関連ブロック未確認は確認前の記録。

次区域の切り分け：`work/left-medial-anterior-partition-diagnostic.log`。原300のlow[150,380,120]、high[xmax,600,380]、seed[209,410,175]、65400でxmax320/330/340を比較。いずれも8335点・ymin29接触のみでX側接触なし。Y380で切ると、seedが属する下部腔から内側へ接続できず、先行の広い腔全体とは異なる小領域になる。これは候補採用でも解剖境界同定でもなく、単に探索boxを狭めて外部漏れを止めても目的の腔全体を得られないという診断。次は既存広域画像から内側腔の別seed/連絡部を特定する必要がある。製品変更なし。

右4515は本体へ採用済み（以下の未apply記述は履歴）。現行compressed SHA `6a536977c03a313b7e112e21d31ef800363da2e7dca5edc060ed0df138109287`、raw `b3a058a42418d2d0a9997166251965b81bc262f58849ff4c0af2a3f19959e98f`。0→24の4515点、ID23=79282/24=79083/25=11981。7部品と断面2mesh、復元fixture・採用記録を同期。installer/buildログは `work/right-anterior-terminal4515-{install,build}.log`。distと本体圧縮byte一致、HTTP200の展開後全byte一致を再確認し、右タブ3をreload、水平断60と3Dの初期描画を目視。関連ブロックの今回の再描画・全suiteは未確認。対象試験は `work/right-anterior-terminal4515-focused.log` で実行中。

同一Z150比較 `work/anatomy-review/right-anterior-terminal4515-comparison-z150/comparison.png` を生成・目視。この面65点の補完で前方へ伸びる腔の上外側縁の段状不足が減る。中央の灰色組織全体は塗らない。原画像は腔が白く見える表示で、教材の黒い腔と階調が異なる。全脳室の完成・専門家レビュー・公開更新ではない。

右4515の派生準備・読み取り専用preflight完了、まだapplyなし。mesh report SHA `132be77f0458e0d771a834d6df831572b58a4ea4eb99d9789c31585d9b79d512`、全55mask比較・旧mesh再現一致・installationBlocked=false。変更7部品：側脳室tissue+1361/-102・腔+497、放線tissue-166、脳梁脳弓tissue+26・側脳室+497、脈絡叢tissue+406/-57・腔+402。断面2mesh準備も終了0。preflight log `work/right-anterior-terminal4515-preflight.log`。次は本体/7部品一括採用、SHA/count/対象試験同期、build/browser。未採用候補と配信済みfa88版を混同しない。

右4515候補の代表XZ確認と可逆stageを完了。native300 report SHA `8ecc0b7ea08ed3877cf358c6e1a745e191965a7ab0c131958f4b7ac81c5129d9`、indices0,2,3,5,6,8を目視。X351–353は重複、X379–381、Z261–263/236–238/249–251。上外側腔縁・下方の細い延長・前方終端に沿い、灰色核を一括で埋めない所見。全Y105面と合わせて地域補完を支持するAIレビュー、専門家確認ではない。stage SHA `c7f8a4a8da76262bbf6b2b5b19b328fdecc82262fdb610bfd17118b4bb597aae`、0→24の4515点のみで全差分・逆復元を確認。仮compressed `6a536977c03a313b7e112e21d31ef800363da2e7dca5edc060ed0df138109287`、raw `b3a058a42418d2d0a9997166251965b81bc262f58849ff4c0af2a3f19959e98f`、仮ID24=79083。まだ本体未採用、右previewはfa88版。派生mesh準備を開始、log `work/right-anterior-terminal4515-{meshes,section-meshes}.log`。

採用済み左3341版の全Node試験561/561成功（178秒、session31811終了0）。全suite終了後の通常buildも成功：`work/left-anterior-terminal3341-post-suite-build.log`。途中に行ったfinal-buildはsuite終了前だったため最終確認扱いにせず、このpost-suite記録を用いる。右4515全Y画像report SHA `1f38676926c1b492ec65e94664c239c85207d901bb08e7e1265cdf9df7ec15b6`。右候補は未採用で本体fa88維持。

右4515候補の全Y451–555（35contact・105面）を目視完了。腔の上外側縁、後半の下端の細い延長、前方終端の不足に沿う。隣接灰色核や外部皮質溝へまとまって越える候補は見られず、Y550–551で小さくなり後続面で閉じる。代表XZはまだ未目視のため、stage/採用は行わない。次はnative300-v1の代表XZ indices0,2,3,5,6,8（X351–353重複）を確認して地域差分化する。

右4515点の全Y/代表直交画像生成は終了0。候補app bbox[211,272,134]–[232,330,197]。全Yは35contact・Y451–555。実際に目視したのはindices0–2（Y451–459）のみで、腔外側縁の薄い不足を補う所見。indices3–34およびnative300代表9contactは未目視、次に継続する。生成完了をレビュー完了・採用と混同しない。

右前方の独立探索：現行fa88から原300 crop[350,200,120]–[490,600,380]、seed[415,410,184]、threshold65400で実施。`right-anterior-terminal-65400-exploration-v1/report.json` SHA `89cb046861fe8c1900a5c617f1f08f3f56a06d3f7e0eb43922dc653e71772497`。原格子272235・xmin接触5559のみ、他5面0。多数支持・既存0・crop面除外4515点が候補。全9探索図（X384/419/454、Y299/399/499、Z184/249/314）を目視、広範な脳室外漏れは認めないが、これだけで候補境界承認とはしない。前方腔縁の不足が見える一方、下部の細い腔の不足はなお残る。左側の反転コピーではない。`right-anterior-terminal4515` の全Y/代表直交画像生成をsession20116、log `work/right-anterior-terminal4515-review-generation.log` で開始。生成画像はまだ未目視・未採用。

採用済み3341版の全Node試験をsession31811、log `work/left-anterior-terminal3341-full.log` で開始。全suiteがPages向けdistを書き換える場合があるため、終了後は通常buildを再実行して右previewを保つ。

rendered-html再実行は終了0で成功。上記のファイル名不一致は解消。対象101件の失敗項目は再確認済みで残存失敗なし（全suiteを新規実行した意味ではない）。3341版は型検査・通常build・右断面/関連4ブロック初期描画・配信全byte一致まで確認済み。次は残る左右側脳室の内側crop継続と下部の塗り残しを地域単位で再評価する。

3341版の関連4ブロックも実ブラウザで確認：IABタブ13で脳梁脳弓→側脳室→間脳→脈絡叢を順に初期描画、読込エラー表示なし。見出し上端の欠けは既知UI課題として残る。対象試験101件中100成功、1件は乳頭体監査report出力名の `bodies-` 欠落によるENOENT。正しい名前で監査を再生成し、rendered-htmlをsession75019/log `work/left-anterior-terminal3341-rendered-rerun.log` で再実行中。先行失敗logは保持、全suite成功とは報告しない。

3341点を開発本体へ採用。現行compressed SHA `fa88f7561ea92250685a340a8e22f4f805af5b60f743d5829ac679446c21f01f`、raw `3f53b81a39549af8cd149c99c2765bf50cc84fe04735a85f0b2e13c811ad3144`、ID23=79282、ID24=74568/ID25=11981不変。復元fixture・採用記録を保存、installer apply成功。型検査・通常build成功。HTTP200で配信ラベルを取得し、展開後の全byteが本体と一致。IABタブ3を再読込し水平断54の断面/3D初期描画を目視、読み込みエラー表示なし。これは全境界・全回転確認ではない。同一Z153比較図も目視し、この面60点の補完で前方の腔縁の不足が減ることを確認。対象試験はsession23471で進行中（log `work/left-anterior-terminal3341-focused.log`）。関連4ブロックの今回の実描画・全suiteはまだ未確認。main/公開変更なし。以下の未採用記述は履歴。

3341点の派生mesh準備・読み取り専用installer preflightも成功。stage SHA `7564a5f03650110fe7edc311ad3073802d1fda17279dadcaa2982ebdd513d0ed`、mesh report SHA `622077e5c939988541b338865e8cb43769092194bfcdada070f6518cc4031a7f`。全55mask比較で5部品変更：側脳室tissue-4、間脳tissue-16、脳梁脳弓tissue+369/-102・側脳室+434、脈絡叢tissue-4。変更対象の旧mesh byte再現はすべて一致。断面の側脳室/全脳室2meshを生成、旧断面資産も再現一致。両処理終了0、ログ `work/left-anterior-terminal3341-{meshes,section-meshes}.log`。installerは20ファイル計画を検証したがapplyなし。ラベル本体・右previewはfbabのまま。次は一括採用と参照/回帰試験同期、build/browser確認。

左前方終端3341点の画像レビューと可逆stage完了、まだ本体未採用。`left-anterior-terminal3341-series-y-v1/report.json` SHA `e26f5410d5e13a10ef3f8f8d874aabdc518a25557c1ab986f26300acb0058a6d` の全20contact（Y496–555、60面）を目視。`left-anterior-terminal3341-native300-v1/report.json` SHA `08e269456991302094a32ec1fe88f37505515d313d8985225e62365458688dda` のindices0,2,3,5,6,8を目視（X264–266/271–273/269–271、Z254–256/269–271/248–250、X271重複）。腔の縁と前方終端の不足を補い、隣接灰色核や皮質溝との間の組織を越える明らかな逸脱は見られない。Y551付近で細隙となり後続面で閉じる。原300のAI画像レビューでありnative100追加・専門家確認ではない。stageで0→23の3341点のみの全差分と逆復元を確認、仮compressed `fa88f7561ea92250685a340a8e22f4f805af5b60f743d5829ac679446c21f01f`、仮ID23=79282。次は派生mesh影響・一括採用・検証。右previewは検証済みfbab版のまま。以下の終端未レビュー記述は履歴。

2224点を開発本体へ採用済み。現行compressed SHA `fbabf09f866aa5c96d8f3f22f11ff8f7f9ccdabf22cf0f1044dab5ed9eb9f2a4`、raw `6acf03e7d24a3952166fd78717f865037d6ed676d8bc40305e0f064a5b228062`。ID23=75941、ID24=74568・ID25=11981不変。`left-anterior2224-adoption-2026-09-07.json` と変更前volume/5mesh fixtureを保存しinstaller apply成功。対象87/87、全561/561、型検査、通常build（全suite後の再build含む）成功。ログ `work/left-anterior2224-{install,focused,full,build,final-build}.log`。視覚路/乳頭体の客観監査を新SHAで再実行、新たな解剖学レビューではない。

右タブ3をreloadし水平断78・19構造・1面を維持して初期描画を確認。配信HTTP200、volume全byteが現行本体に一致。別IABタブ12で側脳室・間脳・脳梁脳弓・脈絡叢の4ブロック初期描画を目視、読込エラー表示なし（全回転/全境界評価ではない）。同一Z183比較図 `work/anatomy-review/left-anterior2224-comparison-z183/comparison.png` を目視、この面101点の補完で上縁の段状不足が減る。右78そのものは修正断面ではない。main/公開変更なし。以下の2224未採用記述は採用前履歴。

次の前方終端探索は処理完了、画像はまだ未レビュー：X320を維持しY600へ拡張。`work/left-anterior-extension-limit.log` ではhighY550で原格子356288/ymax接触96、highY600で356295/ymax接触0、いずれもxmax4753は残る。これは探索領域の終端確認であり解剖境界の証明ではない。`left-anterior-terminal-65400-exploration-v1` をfbab版で生成。次は原画像レビュー、未採用のため右表示には未反映。

2224点の派生準備も完了（まだ本体未採用）。mesh report SHA `4f2e2ad2aff7781d4a0f5fba9a178feee7f2f1ea2353d2d1e3b00c0c243dd889`。全55mask比較で5部品変更、旧meshの再現は全一致：側脳室tissue-10、間脳tissue-19、脳梁脳弓tissue+293/-61・側脳室+312、脈絡叢tissue-10。断面の側脳室と全脳室meshも生成し、旧版再現一致。ログ `work/left-anterior2224-{meshes,section-meshes}.log`、両処理終了0。diff-check成功。次はinstaller preflight→本体一括採用→参照/試験同期→型検査/build/実ブラウザ。公開・mainなし。現在右へ配信されるのは検証済み5757採用版であり、2224点の仮出力ではない。

次候補2224点は画像レビュー・可逆stageまで完了、未採用。`left-anterior-continuation-65400-exploration-v1/report.json` SHA `1543829244869ea8527dcb3f247810402534010df26367504568ddce8512ca1f` の全9探索図を目視。X320を保ちY500へ延長、65400で原格子305427・多数支持の未label2224点。先行の広範な外部漏れは見られない。`left-anterior2224-series-y-v1/report.json` SHA `30ec56e7339a22ff5f70a20f3552dc537b9e9879dbe8ac1d3b40462625645b6f` の全17contact（Y451–501の51面）を目視。候補は三角形の腔の上縁・外側縁・下端の不足を補い、隣接する灰色核を一括で埋めない。`left-anterior2224-native300-v1/report.json` SHA `bada3cc6e130ffe16d26647bc42511e932c68c0dd19bec6f7051372af283b3f0` のindices0,2,3,5,8を目視。X273–275と274–276は重複あり、Z324–326/314–316/304–306。残4contactは生成のみ。native100追加・専門家確認ではない。

stage SHA `5f053f5c0888fcf0ba15568673fd683a5cd9c880ac9bfef0afddaa51534e56b8`、0→23の2224点、全差分・逆復元を確認。仮compressed `fbabf09f866aa5c96d8f3f22f11ff8f7f9ccdabf22cf0f1044dab5ed9eb9f2a4`、raw `6acf03e7d24a3952166fd78717f865037d6ed676d8bc40305e0f064a5b228062`、仮ID23=75941。まだ本体は8b9f版。次は55mask/派生meshの影響確認と採用・検証。X320/Y500より先の腔は残る。全脳室完成としない。

5757採用後の継続探索：原300 cropを[150,200,120]–[350,500,380]へ拡大した65400候補は棄却。`left-cavity-continuation-65400-exploration-v1/report.json` SHA `5fb430ddf13fa3da0f1abf096370a7a441b658b435b0241414c18ee6764ec90b`。原格子2292489、mapped559904、全支持未label259076だが全6面に接触。X249/Y349/Z249の3図を目視し、皮質溝と脳室外空間を大量に含むことを確認。残6図は未目視、棄却のために追加閲覧しない。原画像の明るさのみで全脳室を抽出しない。

切り分け `work/left-continuation-leak-localization.log`：同seed/65400でhigh[350,455,380]は1633548・全6面接触、[330,455,380]も1319881・全6面接触。一方[320,500,380]は305427、接触xmax4074/ymax1172のみ。[320,475,380]は272647でxmax/ymaxのみ。この数値は解剖同定ではなく、X内側拡大で外部接続が生じる位置の切り分け。次はX320を維持したY500延長を独立探索・画像レビューする。採用済み5757と混同しない。製品変更なし。

左5757点を開発本体へ採用済み。現行compressed SHA `8b9fa8660ebee796df69f91c78efa56a88c4779c56fc6152ef948ffe4941dcc2`、raw `f33fb81f12a8ec00799f870ab4c8553683ce450d0ca1a614eed264085cb50a86`、ID23=73717、ID24=74568、ID25=11981。全差分は0→23の5757点のみ。stage SHA `cb9809e14fa616d88fa11e7e4d7d61dc954eb63166edd5eb973ec5d7c2ccb9b9`、採用記録 `segmentation-patches/review/left-posterior-superior5757-adoption-2026-09-07.json`。変更前volumeと5meshのfixtureを保存。mesh report SHA `15810a4e533385547abc31c7dd96df05203240760fd24c75afb4a8647dbccac2`、55mask比較・旧mesh再現一致後に5部品と断面meshを同期。

対象87/87、全Node561/561、型検査・通常build成功。ログ `work/left-posterior-superior5757-{focused,full,build,final-build}.log`。全suite後に通常buildを再実行。HTTP200の配信volumeと現行本体は全byte一致。右タブ3の水平断78の描画を確認したが、修正断面とは区別する。別IABタブ11で側脳室・間脳・脳梁脳弓・脈絡叢の4ブロック初期描画を目視し、読込エラー表示なし。全回転や全境界の評価ではない。狭い画面でブロック見出し上端の欠けは残存UI課題。

同一Z192・crop/windowの比較図 `work/anatomy-review/left-posterior-superior5757-comparison-z192/comparison.png` を目視・ユーザーへ提示済み。この面の116追加点は腔外縁の不足を減らす。専門家レビュー・全脳室完成ではなく、main/公開変更なし。次は既存cropの継続部分と残る下部腔を調べる。以下の5757未採用・b545現行という記述は採用前の履歴。

左側脳室の広域候補5757点を原画像レビュー済み、まだstage/本体採用なし。製品・右previewは引き続きb545版。まず `left-posterior-superior-wide-exploration-v1/report.json`（SHA `a65fdfe6b58df42f9383838310a76d135c0d45eec5b05d96c2ee2453e4f5de32`）の65000閾値領域を棄却：X234/Y327/Z249で脳室外の皮質溝・外部空間への漏れを目視。159302多数支持候補を採用しない。残6探索図は未目視で、棄却に追加閲覧は不要。

同じ原300 crop[150,200,120]–[320,455,380]・seed[209,410,175]で65400を独立探索。`left-posterior-superior-65400-exploration-v1/report.json` SHA `62636d84dbdd239037937119f2f3677ee12e20762bbefd36ebea2a7c339502ed`。全9探索図を目視し、先行65000の広範な外部漏れがなくなることを確認。原格子239178、mapped57847、全支持未label881、多数支持50%以上・既存0・crop面非接触5757点。xmax1502/ymax1639のcrop接触は残り、脳室全体の完成maskではない。閾値はあくまで候補抽出であり、画像レビューと区別する。

`left-posterior-superior5757-series-x-v1/report.json` SHA `e2ce4cf75e9c2925b2363d382e9c5c158ba3515866882c5aa44090333efad039`：全35contact indices0–34、X215–319の全105面を目視。候補は白い腔の外縁、細い端部、内部房状組織の周囲の不足を補い、房状灰色組織全体は埋めない。近接する皮質溝との間の組織を越える明らかな候補逸脱は認めない。`left-posterior-superior5757-native300-v1/report.json` SHA `fde976569e815ad026c0cb3adf0dd4475468f1d335ac211d351991366ede6a1f` のindices1,2,4,5,7,8も目視（YZ計18面、Y271–273/366–368/451–453、Z246–248/319–321/324–326）。代表X3contactは生成のみで追加レビュー数に含めない。原300上のこの区域の補完を支持、専門家確認・native100追加確認ではない。次は5757点の可逆stage、派生mesh一括同期、対象試験/buildと変更断面比較。未採用候補を右へ反映済みとは報告しない。

探索器の既定65000は維持し、独立regional prefixでのみ65400等を選べる小拡張を追加。実際に選んだ値をreportへ記録。既存探索再現＋不正閾値/旧出力経路拒否のPython2/2成功。先行native100投影の非可換変換順序テストも追加済みで3/3成功（以前の2/2は追加前の履歴）。今回は教材コード・ラベル・README掲載機能の変更なし。

7160版の全Node suiteは561/561成功（`work/right-posterior-superior7160-full.log`、session69291終了0）。全suite後に通常buildを再実行して成功（`work/right-posterior-superior7160-final-build.log`）。これで以下の「全suite実行中」は完了済み履歴。

7160点を開発本体へ採用済み。現行compressed SHA `b5456693b562deda334a0e9f4c6be5f4cc21afdd7a6324e40938cf4d38b952ef`、raw `74bc290742e25ef04694a4d19187e604086599e6f56cd9cd2aab68ce8a32708d`、ID24=74568、ID23=67960・ID25=11981不変。採用記録 `segmentation-patches/review/right-posterior-superior7160-adoption-2026-09-07.json` と変更前ラベル・9meshの復元fixtureを保存。installer apply成功、対象Node104/104成功（`work/right-posterior-superior7160-focused.log`）、型検査・通常build成功。客観視覚路/乳頭体監査を新SHAで別reportへ再実行したが、新しい解剖学レビューを意味しない。

右タブ3をreloadし水平断78・19構造・1面の描画を確認。HTTP200で取得したBBS1は現行本体と全byte一致。別IABタブ10で側脳室・放線・脈絡叢・内側側頭・脳梁脳弓の全5ブロック初期描画を目視、読込エラー表示なし。全回転・全境界評価ではない。比較図 `work/anatomy-review/right-posterior-superior7160-comparison-z180/comparison.png` は同一raw/crop/windowでbefore/afterを比較し、この断面273追加点を表示。腔縁と房状組織の間の不足が減ったことを確認。全Node suiteは `work/right-posterior-superior7160-full.log` で実行中（session62631は対象104終了、全suiteは別session）。以下の未採用記述は採用前の履歴。公開・main変更なし。

追加7160点は原画像レビュー・可逆stage・mesh影響・読み取り専用preflightまで完了、まだ本体未採用。現行本体と右previewは下記85bd版のまま。探索 `right-posterior-superior-wide-exploration-v1/report.json` SHA `3e236de8f2a6030d85f1e730968f475fc65797507b7e8c639133db09ab929beb`。全9探索図に続き、連続X350–451の全102面（34contact、indices0–33）を目視完了。連続report SHA `01b6ea4cf8de8757773952ba8560fbb536671018df37f1be1720b9033e1e577e`。代表YZは `right-posterior-superior7160-native300-v1/report.json` SHA `9247c1f1c3126f03ab1cf25fcb22c93a3a1364dae17dc7023c23ac429008d0f0` のindices1,2,4,5,7,8（18面）を目視。代表X画像は生成のみで追加確認として数えない。

候補は広い腔の外縁と、外側へ狭くなる終端の不足を補う。内部の房状灰色組織は一括で埋めず、周辺皮質溝との間の組織を越えない所見。50%以上の有限支持は候補抽出規則であって解剖同定の証明ではない。既存8/18/22など非zeroラベルは不変。native100追加確認・専門家レビューではない。

stage `right-posterior-superior7160-stage-v1/repair.json` SHA `8457024e64060fdc0e20b286eb5da28bfd24c07f704ead3c638f6c6507ab62b2`、0→24の7160点を全配列差分・逆復元で確認。仮出力compressed `b5456693b562deda334a0e9f4c6be5f4cc21afdd7a6324e40938cf4d38b952ef`、raw `74bc290742e25ef04694a4d19187e604086599e6f56cd9cd2aab68ce8a32708d`、ID24=67408→74568。まだpublic assetは変更していない。

mesh impact `right-posterior-superior7160-meshes-v1/report.json` SHA `3c6ab3734b6494d48ae54d7d0f8de0bf6553f95c669c0fa36ded43dc0eb890ed`。55mask比較・旧mesh再現一致、変更9部品：側脳室tissue+619/-152・腔+760、放線tissue-547、脳梁脳弓tissue+167・側脳室+389、脈絡叢tissue+191/-56・腔+760、内側側頭tissue-10・下角+12。断面2mesh変更。installerの非apply preflight成功。次は本体・9部品の一括採用、現行SHA/count参照・回帰試験の同期、型検査・build・ブラウザ確認・同一断面before/after提示。公開・main変更なし。この段階では新しい本体に対する試験/build/browser成功とは報告しない。

右側脳室の後方延長2308点を開発本体へ採用。現在compressed SHA `85bd4b18f8a7c03b79e54e5905077fd1222b804968ec9980a94339120c3129d4`、raw voxel SHA `1c776d91100dae44bc0fce1bc5c0f28bbcc84c94409205f9fd64e2856c5d7fd9`、ID24=67408（65100から+2308）。全Y300–416の117面・39contactを目視、代表XZ contact indices0,2,3,5,6,8も確認（X453–455は重複）。層状海馬の外側に続く腔と後方腔縁の不足を補完し、房状組織全体を塗りつぶさない。既存18/22の8/2点は対象外、他の非zeroラベルは不変。native100追加確認・専門家レビューではない。

連続report SHA `0443ac1a7b371479446d808790f10c4e27b9b5311b9fa19ae84cc44d50668820`、代表report SHA `0a875d5e156db0689914aa04b11f9fd3248cbd45ac9f207adb12a80cd1166eac`。stage `right-posterior2308-stage-v1/repair.json` SHA `af88b8924a765184a3b06890c433196f9b6810e8ee9841b691781f7583b29481`、adoption `segmentation-patches/review/right-posterior2308-adoption-2026-09-07.json`。stage由来のlimitation末尾のpendingは、この採用・同期記録で更新された履歴文である。

55mask比較で8部品変更、旧mesh再現は全一致。impact SHA `be18f06d770797e7ca59db32ba344b269e1db0f7bc4625d3f4233c6cb7c3d5b6`。側脳室tissue+370/-51、腔+271、放線tissue-193、脳梁脳弓の側脳室+14、脈絡叢tissue+141/-23・腔+239、内側側頭tissue-92・下角+125。断面2meshも同期。変更前ラベルと8meshをfixtureへ保存し、installerで全配列差分・復元・影響を確認。

型検査・通常build成功。右タブ3をreloadし水平断72・脳室3/3・1面の描画を目視。HTTP200の配信BBS1は現行データと全byte一致。別タブ9で側脳室→放線→脈絡叢→内側側頭→脳梁脳弓の5ブロック初期描画を目視、読込エラー表示なし（全回転・境界の専門家評価ではない）。同一Z120のraw/before/after比較図を作成・目視し、この断面の29追加点が腔幅を補うことを確認。対象Node suiteは104/104成功（session77107終了）、ログ `work/right-posterior2308-focused.log`。git diff --checkも成功（CRLF警告のみ）。全suiteを今回再実行したものではない。未公開・main変更なし。

次は後方/上方cropの継続部分と第三脳室上方145点の再評価。2308点の採用は脳室全体の完成や残る飛び地の全解消を意味しない。以下は過去checkpointの履歴。

830版の残ブロック確認を完了：IAB別タブ8で側脳室→脈絡叢→内側側頭→間脳へ遷移し、全4モデルを目視、読込エラー表示なし。今回の形状差を含む初期描画確認であり全回転・専門家境界評価ではない。ユーザーのタブ3は動かしていない。

次の後方延長：現在a6fcから原300 crop[370,300,120]–[490,455,280]へ広げ、同じseed[415,410,184]で探索。`right-horn-posterior-extension-exploration-v1/report.json` SHA `89f5f43c84e311239a6803a821c49260d735f11835cdffb82e36bd1d8baba398`。65000の領域43789原格子、ymin1379/zmax1045接触、x境界接触は解消。有限支持50%以上・未label0・crop境界非接触2308点が次候補（完全支持173点）。50%以上で既存18/22に重なる8/2点は含めない。全9代表探索図を目視し、層状組織の外側に続く腔・その周囲のラベル不足を確認。閾値領域を脳室全体や解剖学的確定として採用したのではない。

`right-posterior2308-series-y-v1` の連続冠状図を生成開始。次はその全候補範囲の画像確認と代表直交断を行い、可逆stageへ進む。2308点は未採用、製品・右previewはa6fcのまま。既に見た探索9枚を連続断確認済みと数えない。

830点を開発本体へ採用済み：`right-inferior-wide830-adoption-2026-09-07.json`、現在SHA `a6fc44913b87273b30bcb627d5df91ea8270fcc8b27ec958e83ebfc7bbf8c3dc`、ID24=65100。旧ラベル/変更7meshを復元fixtureへ保存。全55mask影響report SHA `be6bb6ab75312aa24ae8f4c6361971e791f4cd5b3b6407c93a0a793bbbaf85ab`、側脳室tissue+911/-78・腔+88、間脳tissue-5、脈絡叢tissue+727/-78・腔+88、内側側頭tissue-78・下角+88、旧mesh再現すべて一致。断面2meshと7部品同期、独立installer全byte再構成・現行meta整合成功。Node対象92/92、型検査、通常build成功。全561件を今回再実行したものではない。視覚路/乳頭体の客観配列監査を現行SHAで別reportへ実行保存。

右4345のタブ3をreload、水平断72・脳室3/3・1面の着色と3D描画を目視確認。配信BBS1全byteはローカルa6fcと一致。比較図 `right-inferior-wide830-comparison-z106/comparison.png` を生成・目視（同断面35追加点）。先行421修正版を中央、今回830修正版を右に表示し、外側へ回り込む腔ラベルの補完を確認。旧ブロックQAタブ7は存在しなかったため、この版の4ブロック実描画再確認は未実施。次はその確認と、crop外へ続く下角後方・残る第三脳室境界の監査を進める。公開・main変更なし。

右下角の広域830点：421採用後のd5df本体から原300 crop[370,365,120]–[455,455,220]へ範囲を広げ、同じ腔のseed[415,410,184]を探索。65000連結領域13222原格子、cropのxmax409/ymin43接触が残る（腔全体の完成ではない）。未label0・有限体積支持50%以上・crop境界非接触830点を抽出。既存18の8点/22の2点は候補外。全9広域探索図、Y365–433全69連続面（23contact）、代表XZ18面（native300 report indices0,2,3,5,6,8）をAIが目視。外側縁・下端の明るい腔を補う所見で、層状海馬組織・房状組織を一括で埋めない。正中側最小X参照点も小腔内の所見を確認。原画像は登録300で、今回native100追加確認なし。

`right-inferior-wide830-stage-v1` に0→24の可逆仮適用を作成済み。stage SHA `211158467e67407d19338578d4d86d582f365f04defa9797e330af967696e7a4`、仮出力 `a6fc44913b87273b30bcb627d5df91ea8270fcc8b27ec958e83ebfc7bbf8c3dc`、raw `8aec0fa4dedd831f2e8dc8cdaf4141f46d050d6e2921382127f3cac64295b502`、ID24は64270→65100予定。探索SHA `180e704360002105acf3353c101e8df4c2100e928373a3fc34d7d509a1ef61b4`、連続Y SHA `9fc3aec4a312eea9600ff2184c71dcd7e47101f94a768ca3521260315b05de91`、代表直交SHA `a6be45e6952216de3108bef2f9179b6c825302f6e41197c2313355be5721d4be`。断面mesh再生成と55ブロック影響検査を開始。未採用で製品・右previewはd5dfのまま。次は影響結果と可逆検査を確認し、関連meshと一括採用・対象テスト・build・比較表示へ進む。

全Node最終集計は561件中558成功/3失敗。終了時にlateral-cavity21でも同じ旧count参照を確認したため修正し、上記2件と合わせ3/3再検証成功。全561再実行済みという意味ではない。

421点の統合追補：旧ラベル数63849を現行値としていたlateral-detached547/lateral-residual80の2試験を64270へ同期し、対象2/2再実行成功。過去の差分・復元fixtureは変更なし。全Node session20485は終了（詳細集計はwork/right-inferior-gap421-full-node-v1.log）。全試験後の通常buildも再実行した。別IABタブ7で側脳室・脈絡叢・内側側頭・間脳の4ブロックへ順に遷移し、変更7部品を含む各モデルの描画を目視。初期表示の確認であり全回転角・境界正確性の再認定ではない。ユーザーのタブ3は水平断72のまま維持。

同一画像比較を `scripts/render_staged_label_comparison.py` で再利用可能にした。固定stage SHAからbefore/afterと同一BBV1原画像を読取り、同一crop/window・同一色で3列表示し、出力は上書きしない。`right-inferior-gap421-comparison-z106/comparison.png` を実行・目視し、水平断72に対応するZ106の44変更点を確認。左＝原画像、中央＝修正前、右＝修正後。海馬上方の水色ラベルは広がったが未着色腔は残る。比較図の生成は新しい境界判定や全脳室完成ではない。

右下部421点を開発採用：`right-inferior-gap421-adoption-2026-09-07.json`、56dc→`d5dfda6603389b6d981d958045948bf8fee5716d9be5b5ea2e47ad4fbc1382c3`、raw `8013e94d015a0fbf28286b56dd79da6c7ab8333f63435af68b913d22b3362999`。全421点0→24、右側脳室63849→64270、他label変更なし。142点seedは26近傍で本体64222点へ接続、全右側脳室成分19→15（接続性は解剖学的正確性の代用ではない）。中央矢状X402–404/411–413/420–422も追加目視し、限定腔内補完を支持。stage SHA `68e936ccfbe413d8e2a86f0882b4bc92621020407640696fd3bcdd5bbe849a4f`、55ブロック影響report SHA `9b47ece7f71b0d6309f6225e66ba64050d59f188532eb3adda057eb8994990bc`。断面2mesh・ブロック7部品を同期し、変更前assetをfixtureへ保存。ブロック変化は側脳室tissue+350/-59・腔+61、間脳tissue-6、脈絡叢tissue+236/-59・腔+61、内側側頭tissue-59・下角+61。旧mesh再現は全一致。

共通stage writerを左右対応へ小拡張（既定は左のまま）。左右別代入・既存label保護・不正ID拒否を含むPython3/3、Node対象89/89、型検査、通常build成功。視覚路/乳頭体の客観配列監査も現行SHAで実行し、過去reportを上書きせずright-inferior-gap421版を保存。右4345を水平断72へ移動してreloadし、原画像・着色・脳室3Dの描画を目視。全Node検証は `work/right-inferior-gap421-full-node-v1.log` で実行中。全試験後に通常buildを再実行する必要あり（Pages試験がdistを書き換えるため）。7ブロックの実ブラウザ確認、修正前後の同一断面比較図は残る。専門家レビュー・全脳室完成・公開変更ではない。

右側脳室下部の独立142点（seed238,249,107）を現行56dcで再評価。`right-inferior142-current-native300-v1` のpoint-0 XYZ各3面を目視し、単純な誤分類除外ではなく腔内の塗り残しによる分断を疑う所見を得た。原300の限定crop [390,395,160]–[435,430,200]、seed[415,410,184]で既存探索器を再利用し、未着色の有限体積支持50%以上・crop境界非接触421点を抽出した。探索report SHA `81632b540609a2423117f614c4d30b846ba1995d13ef287b83878a9b949ac4fb`。閾値65000の連結領域3306原格子は複数crop面へ達するため、腔全体の完成maskではない。他label18の4点/22の1点にも50%以上の支持があるが、今回の421候補は全て既存0であり、これらを上書きしない。

`right-inferior-gap421-series-y-v1` の全12contact、Y395–430の36連続面をAIが目視（report SHA `07650f6c1d1efcafa9931e3432ab71f2892c5122a7e31f5e199db5f0d2e8b698`）。海馬様の層状組織の上・外側に沿う明るい腔内を主体とし、内部の房状組織を丸ごと埋める候補ではない。`right-inferior-gap421-native300-v1` のpoint-0/2 XZ計4contactも確認し、候補両端を直交確認した。探索図で目視したのはx-412/y-412/z-179のみで、残6枚を確認済みと扱わない。次は中央接続部の直交確認と可逆stageによる142点の接続変化・派生mesh影響を検査して採否を決める。まだ421点の採用・build・右preview変更はなく、現行56dcを維持。脳弓の同じ付着部の微小再調査は繰り返さない。

46点除外チェックポイント：全561件は558成功/3失敗で終了。失敗は旧第三脳室count/mesh参照の3件で、既に修正した対象3/3再検証で解消（全561の再実行ではない）。採用後の読み取り専用installer検査1/1も成功。通常build index-AcLs0Fbm.js、CSS index-Cz5Qpye1.css。右4345をreloadし、水平断50・脳室3/3・1面・境界40を維持して原画像/着色/脳室3Dの描画を目視、読込エラー表示なし。配信ラベルの展開後全byteが56dc開発本体と一致。水平断50そのものは今回の除外点の断面ではなく、個々の除外境界の再判定には使わない。間脳変更meshの今回のブラウザ再確認は残る。README日英同期。main/公開なし。

46点除外を開発本体へ採用済み（56dcff45…、raw d38cd6a7…）。ID23=67960、ID25=11981、ID24=63849不変。元ラベルと間脳第三脳室meshの復元fixtureを保存し、3断面meshと1ブロックmeshを同期。混合除外の全byte再構成を含む関連5/5、第三脳室の履歴・後続mesh3/3、型検査成功。全Nodeは `work/ventricular-exclusions46-full-node-v1.log` で進行中（session63089、観測の無出力は停止と扱わない）。旧第三脳室の履歴比較は旧fixtureを保持して後続meshへ追跡する形に修正済み。通常build/右reloadは全試験のPages出力終了後に実施する。現在のdistはまだc26版。main/公開なし。

46点除外の可逆stageと派生mesh計算完了。stage repair SHA `df144c3615712322e24abe0b7809a85093ea36191b28dd9a42e10bec050b3fe4`、c26→`56dcff45e44fbcc40f59a4e6e06bf707e49dcdeee86f8b16bd169b81bc472c91`、raw `d38cd6a74c6b4d51dfb02c8b8c5f664f689ee07f54821728994bbb5f02875144`。証拠・ラベル競合・全差分・復元を確認。断面用3Dは側脳室/第三脳室/脳室系の3mesh、55ブロック中は間脳の第三脳室5粗格子除外のみ変化。元mesh再現は一致。影響report SHA `e21033c73247c0fcd1418123cb2b24e6a8467c68aae078fc8fb79163f8c99618`。共通stage/installerを混合除外へ拡張し、読み取り専用preflightテストを追加。まだ製品未採用。次にテスト結果確認・採用・現行SHA参照と履歴テスト同期・build/browserをまとめて行う。

第三脳室の右20/左14点（seed209,205,142 / 177,205,141）を続けて確認。各Y340–348全9面、代表XZ、右側を中心とした広域冠状/水平6面から、正中腔から外側に離れた組織表面側の空隙へのラベル逸脱と判断し除外候補化。具体的な脳槽名や欠損膜を推定していない。左側脳室12点と計46点の混合23→0/25→0可逆候補を `ventricular-exclusions46-candidate-2026-09-07.json` にまとめた。証拠report/目視した図のSHAを記録。既存原画像rendererへcontext_marginだけ追加し広域照合に再利用、デフォルトは変更なし。旧677レビュー3テスト成功。次はこのまとめた候補のstage/replayと派生mesh影響確認、採用。現時点の製品はc26のまま。

左ID23の独立12点（seed137,139,153）を区域文脈で再評価。原300のY230–241全12面、代表XZ、広めのX219/Y237/Z264を目視し、脳室から組織を隔てた皮質帯に沿う溝状間隙と判断。具体的な溝名は付けない。65000連結閾値の1576原格子は腔の同定根拠にならず、この領域の補完候補は採用しない。12点の23→0除外候補をSHA付きで保存（left-posterior12-exclusion-candidate-2026-09-07.json）。全volume・派生mesh・右previewはまだ変更せず、次のまとまった修正batchへ含める。微小候補だけのための全テスト再実行は行わない。

ブロック標本の操作枠重なりを修正。組織透過・視点・着脱・選択数をドラッグ領域の外のtoolbarへ移し、重複する標本名/凡例を隠した。画像行は最低280px、toolbarは折返し・44px操作。短い画面はカード内スクロールで操作へ到達する（画像と全操作が同時に常時見える保証ではない）。分節・meshは不変。型検査・通常build成功、既存rendered対象試験と追加toolbar回帰試験を実行。英語の969×545相当の実ブラウザで脳梁・脳弓が大きな説明枠に隠れず描画され、上面ボタンで選択状態/描画が変化することを確認。全幅・全ブロック・物理phoneの操作確認は未実施。元のユーザー断面タブは変更していない。公開なし。

動眼神経IIIの既知の組織内走行について、日英の選択説明を原画像レビュー結果へ同期した。脳内線維束の追跡結果ではなく、脳外近位経路も未確定と明記。形状変更ではない。関連8/8・型検査・通常build成功、別のローカル確認タブで日英の選択時本文を確認。元の断面タブは動かしていない。
同じ確認タブでc26版の間脳・脳梁脳弓ブロックの実描画を目視し、読込エラー表示はなかった。ただし969×545相当の狭い画面では、モデル上の説明・操作枠が大きく重なり、背景meshの細かな形を十分見渡せない。読込確認は完了、全方向の形状確認とはしない。この表示面積不足は別のUI改善対象として残す。

### 第三脳室上方の独立145 voxel：局所レビュー後の保留

輪郭付きnative100照合まで実施：既存rendererに明示的な`--third-mask --labels-sha`を追加し、native格子→線形→native非線形→公開改良gridの順写像で現行ID25/145成分をnearest投影した。新規分節や点の投影からの穴埋めではない。`third-superior145-native100-mask-v1/report.json` SHA `7c4f1457e47093801794356a5057e993b046ff1929ad9b6fe4e432e677ea4b17`、全6図18面を目視。赤い成分輪郭の大半は白い空隙にあり、冠状断では薄い房状組織の上側、矢状断では斜めの帯に沿う。局所の組織との重なりと腔間の薄い隔たりはあるが、成分全体を組織誤収録と判定できない。今回の処置は既存145点を保持し、全削除も主腔への橋渡し追加も行わない。全145点の正確性を保証する結論ではなく、この同じ代表点の調査は繰り返さず他区域を優先する。

投影helperの数値試験2/2成功（線形・native grid・後続gridの順序と非zero原点/spacing、範囲外zero、入力不変）。6図の原画像は旧参照図と同じraw座標/ウィンドウ、右側のみ輪郭を追加。MINC byte同等性や新しい位置合わせ精度を主張しない。現行ラベルはb545不変。全Node561の結果はこの後追加したPython helper試験を含まない。

追補（7160採用後）：現行b545で同じseedの26近傍成分が145点、以前の連続Xレビューのpoints配列と完全一致することを再確認。既存native100 bundle `third-detached137-native100-v1/report.json`（SHA `2640ad4d9d2051ff375d137c2de30a82f09631a68a97f0cb8c0b3152683bf9f0`）を再利用し、全6図18面を目視した。参照[193,248,168]と[193,241,172]はともに現行25。nativeの参照中心は白い空隙側にあり、周囲には薄い帯状・房状組織が存在する。したがって全145点を「飛び地だから誤り」と削除する根拠にはならない。一方、この図は参照点のみで145点の非線形変換後の輪郭を描いておらず、全境界の正しさや橋渡し追加の根拠にもならない。次の判断に必要なのは同じ図の再生成ではなく、現行145点の輪郭と薄い屋根側組織の直接対応。既存reportのhistorical label SHA/visualReviewPendingは書き換えず、この追補をレビュー記録とする。今回の確認でラベル変更なし。

c26版のID25、seed [193,248,168]、26近傍145点を確認。代表XYZ9図27面（X面は代表点間で重複）に加え、成分の有限格子範囲＋余白を覆うX320–334の全15面を目視した。登録300µm原画像で、X322–326では細長い輪郭が白い腔側だけでなく灰色の帯にも重なり、X327–331では組織様の濃淡を含む小点として残る。代表冠状断・水平断でも腔内だけの成分とは断定できない。したがって「飛び地なので全削除」「主腔まで自動で橋渡し」のどちらも行わない。145点がすべて正しいという判断でもない。native100で屋根側の薄い組織と空隙を再照合する対象として保留し、他区域の作業は止めない。

証拠：`work/anatomy-review/third-superior145-native300-v1/report.json` SHA `349f306f76eed0ae17ec6b3a53a4d31cad3c42a1a9f35dc244e9d5156814284a`、`third-superior145-series-x-v1/report.json` SHA `43e2c03b6df58a84b1585411593b0cdd4e3fade9fddef0f2915ae0b4cd4f7951`。原画像SHA・ラベルSHA・各図SHAはレポート内。今回のレビューによるラベル変更なし、専門家確認ではない。既存レンダラーを再利用し、専用の新規監査スクリプトは追加していない。

右タブは次の確認時に水平断50へ変わっていた（変更主体は未確認）。利用者の閲覧と競合しないよう追加の画面移動は行わず、変更2ブロックの目視は未実施のまま残す。

1396点を開発本体へ採用（c26c0a6d…、raw9a026da1…、ID23 67972）。0→23差分・復元ラベル・変更2部品の復元meshを保存。断面3D2meshと背景2mesh、manifestを同期した。
脳梁・脳弓背景の41格子増は全点で旧距離13.0384–14.5258mmから新距離11.5758–12.9615mmとなり、既存の13mm表示条件をまたぐ。全41点の分節ラベル自体は不変（`work/left-lower-posterior1396-context-proof.log`）。組織の解剖学的境界追加ではない。
全Node検証は560件中558成功、2件は脳梁・脳弓背景meshの旧履歴を現行ファイルへ直接比較していた参照不整合。旧復元meshと共通後続履歴の検証へ修正し、該当2ファイル＋regional採用の6/6再検証成功。全560の修正後再実行ではない。通常build成功（index-CiP3zKLH.js）。右4345を実際にreloadし水平断52/63と脳室3Dを目視、配信ラベルの展開後全byteがc26開発本体と一致した。現在位置52には今回の1396点差分が0点（差分Z132–169、52はZ181）だったため、修正範囲の位置63へ移した。変更2ブロックの更新後目視は残る。公開/main変更なし。

次区域1396点の画像レビューと可逆stageを準備。原crop [180,275,188]–[245,355,285)、seed [200,345,209]、65000集合45731原格子。既存0のみの50%以上占有1396点を対象に、Y275–334全60面と代表XZ18面を目視。腔の縁と海馬付近の移行部の未着色を補う所見。原集合の他label重なり（占有50%以上）は0件だった。crop xmax/ymin/ymax/zmaxに接触が残るため全域完了ではない。
派生mesh計算完了：断面用側脳室/脳室系2meshの旧版再現成功。55ブロックmask中、間脳tissue58格子減と脳梁・脳弓tissue41格子増のみ変化。両方とも旧mesh完全再現成功。後者は表示用背景の生成範囲の変化であり、腔補完により組織が増えたという解剖学的主張ではない。次に派生範囲の理由をコードと照合して採用・検証へ進む。
stage `left-lower-posterior1396-stage-v1/repair.json` SHA `fdd404f103ca8afb5cdcb5288613bbff42ce5f3313361b5d530d5c208a5a516a`、0c976207→c26c0a6d…、raw9a026da1…、ID23 66576→67972の候補。未採用、製品/右previewは0c976207を維持。派生mesh影響計算を進めている。
**方向表記の訂正**：科学座標affineはY間隔+0.5mmで、低Y側への延長は後方側。以前の`left-lower-anterior397`という識別名と「前方crop延長」という記述は不適切だった。識別子・固定証拠は改名せず履歴として保持するが、位置の説明は低Y（後方）側と読む。今回のposterior識別名はこの方向に合わせた。ラベル座標・左右・画像投影の変更ではない。

左下角前方397点を一括採用：daae0550→0c976207…、raw `3fb8bbe38efc6d3e1644ef82fcedea382ec4c9b90f5c49ece99613a99d8b29dc`、ID23 66179→66576。0→23以外の変更なし、復元fixtureあり。
固定候補のY320–361全42面、代表XZ6PNG18面、追加X202–204/211–213/220–225の12面を目視。疎な代表図の重複面を含み、全XYZ連続面やnative100レビューではない。海馬周囲の腔内の未着色を補う判断であり、50%占有だけの自動採用ではない。
共通stage関数を利用。stage repair SHA `b3db1ab4801eefae58eb9e87933a5120c83759937f991c2a6e318aa4749ce74f`、採用記録 `segmentation-patches/review/left-lower-anterior397-adoption-2026-09-07.json`。断面側脳室・脳室系の2mesh同期、55ブロックmaskは全不変。
関連101/101テスト（`work/left-lower-anterior397-focused-v1.log`、28393ms）、型検査・通常build成功（index-BpuL_dcQ.js）。右4345 reload後に水平断69＋脳室3Dを目視、読込エラー表示なし。今回の全560再実行や全画面QAではない。元の69・脳室系3/3・1面・境界40を維持。README日英同期。main/公開未変更。
前方crop延長と他の独立成分などは引き続き確認対象。以下は先行工程の履歴。

daae版の全脳室6/26近傍成分を再集計（`work/anatomy-review/current-ventricle-components-daae-v1.json`）。左ID23は66179、26近傍20成分。下角成分は2026点、主部64046点と未接続。接続数だけで妥当性は判断しない。
次の左49点成分 [119,210,124] の代表XYZ9PNG27面を全目視（`left-lateral49-native300-v1`）。腔の縁に沿う所見があり一律削除せず、その周囲の未着色域を区域探索した。
既存探索関数を明示的な区域設定で再利用可能にした。原crop [180,320,188]–[228,381,243)、seed [200,345,209]。最初のseed [199,345,209] は原値59835で閾値集合外のため正常に拒否。原値照合後、隣接する腔側セルに変更した。
`left-lower-anterior-exploration-v1/report.json` SHA `9f987f81518d1fc92046b286a1f1be925703667812bd9de624b6e230891b8c7f`。65000集合3468原格子、全支持未着色52点・50%以上占有未着色397点。候補抽出のみで未採用。
区域代表9PNGを全目視。腔と周囲組織の区別を保つ傾向だがY両端にcrop接触が残るため全域完成とはしない。固定397点のY連続図を次に確認し、必要な直交部を照合する。幾何テスト5/5成功。製品・右previewは先行daae版を維持。

1108点チェックポイントの表示確認完了。初回全560は557成功/3失敗/skip0（179967ms）。3件は旧記録参照の修正後、該当ファイルを含む9/9成功で解消。修正後の全560を再実行したという意味ではない。型検査・通常build成功（index-BRJUPgrg.js）。
右4345をreloadし、水平断69/76の原画像・着色・透過脳表内の脳室3D、間脳ブロックの描画を実目視。読み込みエラー表示なし。元の水平断69・脳室系3/3・1面・境界40へ戻した。現在の幅での局所描画確認であり、全画面/物理端末や各境界の再保証ではない。
配信ラベルもHTTP gzip展開後のBBS1全byteが開発本体と一致（raw c23a40e5…）。最初の圧縮SHA比較はHTTP自動展開のため不一致となったので、展開後同士で再確認した。README日英を同期。main・公開変更なし。次は残る脳室区域と独立成分の確認を続ける。

1108点を開発本体へ採用済み（daae0550…、raw c23a40e5…）。断面3D2meshと間脳背景組織1meshを同期し、元ラベル・元meshを復元fixtureへ保存した。関連9テストは再検証で全成功、型検査成功。
統合テストは `work/left-lower-majority-full-node-v1.log` で実行。初回に旧objective report参照2件と間脳mesh履歴参照1件の不整合を検出し、旧証拠を保持したまま現行レポート／共通後続mesh追跡へ修正。修正対象を含む9/9再検証は `work/left-lower-majority-focused-v3.log`。
通常buildと右preview表示確認はこの記録時点で未実施。以下の未適用記述は前工程の履歴。

左下角1108点の区域差分と派生mesh準備を完了。Y358–435の全78面と代表XYZ27面を目視済み（全X/Z連続面やnative100を追加確認した意味ではない）。
`left-lower-majority-stage-v1/repair.json` SHA `e094c70de4401800e7c838e0ba83df8638a9b4eafde283b722a062ad5317ca31`、41481fc2→daae0550、0→23のみ1108点、ID23は65071→66179。
断面用側脳室・脳室系meshの旧版再現成功。55ブロックmaskのうち間脳tissueのみ4格子減、他54不変。旧meshの完全再現に成功し、派生meshを生成済み。
共通installerを、固定SHAの影響reportを必須とするブロック変更にも対応させ、復元mesh・manifestを含む12ファイルの読み取り専用preflight成功。
まだ製品へ適用していない。次は履歴テストの共通後続mesh対応、採用・参照SHA同期、区切りの統合検証と右preview更新。前方crop延長・他脳室区域は引き続き未完了。

次の区域調査：左下角cropを0/8/16原格子広げて再計算。16ではxmax/zmaxの切断が解消し、yminのみ接触を残す。
従来の「触れる原セルが全て腔内」という条件が境界を過度に控えめにするため、原セルとの実体積重なりを用いる占有率を追加した。
幾何計算5テスト成功（0.75/0.5占有、crop外を分母から除かない、平行移動、異常間隔）。従来の全支持候補は27点、65000集合の50%以上占有候補は1108点。自動採用の閾値ではなく、画像レビュー対象の抽出条件である。
`left-lower-cavity-weighted-extension-v1.json` SHA `02c4d5d301aa87f593b467fcdabf39edad2aed7c123e599212a6f7f9f9942355`。
`left-lower-majority-native300-v1` の3代表地点9PNG27面を全目視し、主部の腔内の未着色帯と下端を補うことを支持。上方の細い連絡部・全境界は連続図で照合する。固定1108点のY連続図を生成し、次に目視する。
本体・右previewは検証済み41481fc2のまま。この調査では製品に変更なし。

233点一括補完の統合検証完了：全Node560/560（178263ms、`work/left-lower-cavity-full-node-v1.log`、exit0）、型検査、本番build成功。
右4345を41481fc2版へreloadし、水平断72/76＋透過脳表内の脳室3Dを目視。読込エラー表示なし。確認前の位置56、脳室系3/3・1面・境界40を維持して戻した。
ブラウザ確認は現在の幅での水平断/3D表示に限定し、全画面・物理端末・233点各境界のブラウザ保証ではない。画像判断は原画像レビューに基づく。
次は残る脳室の窓外延長・部分容積の塗り残しと他の独立成分を、区域単位で整理・修正する。全体目標は未完了、main統合・公開更新なし。

左下角233点を開発本体へ一括適用（41481fc2…）。復元fixtureと `left-lower-cavity-adoption-2026-09-07.json` を保存。
断面用3D同期済み、ブロック55mask不変。関連採用テスト11/11成功・型検査成功。全Node検証は `work/left-lower-cavity-full-node-v1.log` で実行中。
以前の採用履歴の接続を共通helperで検証するようにし、区域修正のたびに履歴チェーンを各テストへ追記する方式を止めた。
次は全体結果→通常build→右previewの更新と断面/3D確認。以下のa2ce維持・未適用は各時点の履歴。

左下角233点の一括差分を作成済み：`left-lower-cavity-stage-v1`、0→23、64838→65071、出力41481fc2、raw d39b2d83。
全volume差分233点と逆適用一致を確認。repair SHA `e43881ec68fcf14875b0988a94d1813883f4a2c34758cfb0d62426b019ddca1e`。
候補のY375–434全60面と、X/Zの端・中央・細部30面を目視。全生成189面を見たという意味ではない。先行677点の全3軸レビューも参照した。
断面meshの旧版再現成功・側脳室/脳室系の2meshだけ更新候補を生成。55ブロックmaskは全て不変（再計算exit0）。
既存mesh準備処理を固定SHA付きstage入力に対応させ、修正ごとのフラグ追加を不要にした。既存stageテスト2/2成功。
次は本体と参照SHAの一括同期・統合検証・右preview更新。現時点ではまだ本体a2ceを維持、main/公開変更なし。

作業粒度を変更：点数の小さい修正ごとに専用処理・専用テストを増やさず、一区域の差分をまとめて画像確認・導入検証する。
既存探索scriptへ `--left-lower` を追加。原crop [190,375,130]–[252,443,203)、seed[209,410,175]で左下角の未着色233点を抽出した（未採用）。
9代表図を目視し、主に海馬周囲の腔を追う。crop xmax/ymin/zmaxに接触するため、窓外まで完了とはしない。固定233点の直交投影確認を次に行う。
report `work/anatomy-review/left-lower-cavity-exploration-v1/report.json` SHA `a4f2263620c91113d93a4caeaf596bb67588db91e965f3ace2d22781ab4e7715`。
64500/65000/65400の原集合9492/9000/8267格子。233点は65000集合による有限セル全支持かつ既存ID0だけで、他labelの上書きなし。幾何支持は採用判断ではない。

左677点の全3軸連続図49PNG147面を目視完了（X200–241、Y383–433、Z140–193）。
主部は下角腔内を支持し、一括削除しない。X224–241とZ142–175などで周囲の腔に大きな未着色部分を認める。
上端Z176–191は海馬側の薄い腔に沿い、局所境界の部分容積はなお注意が必要。全677点の厳密な境界承認とはしない。
次はこの既存ラベルの周囲に限定した補完候補を抽出し、脈絡裂側への流出と原crop端の切断を検査する。
全3軸の幾何被覆・座標一致・PNG SHA検査は関連3/3成功済み。製品/右表示a2ceは不変。

最新a2ceの脳室全体を再集計。次の対象は左ID23の独立26近傍成分677点（seed[121,231,112]）。
代表3地点9PNG27原300面を目視し、下角の腔内を支持するため一括削除しない。
成分一致/図SHA/ラベルID拒否テスト2/2成功。全軸連続図49PNG147面の生成時点では未目視だったが、上記のとおり目視を完了した。
製品/右表示は検証済みa2ceを維持。

34点補完の統合検証完了：全559/559（164663ms）、型検査、適用後導入3/3、本番build成功。
右4345をa2ceb264版へreloadし、水平断72/76＋3Dと関連3ブロックの描画を目視。確認前の水平断45へ復帰。
次は残る窓端/部分支持候補・他の独立成分を継続監査する。全体目標未完了、main/公開変更なし。

34点補完を開発版へ適用し、現labelはa2ceb264…、ID24=63849。旧3849・5旧mesh・採用記録を保持。
新旧採用テスト10/10成功。現SHAの視覚路/乳頭体監査を新記録へ再計算済み。
全Nodeはwork/lateral-crop34-full-node-v1.logで進行中。型検査・適用後導入テストも確認中。
次は全体結果確認・本番build・実ブラウザ・右表示更新。全体目標未完了、main/公開変更なし。

34点作業差分の断面4mesh・ブロック全55maskを比較済み。断面は側脳室/全体系のみ34追加、
ブロックは5部品変更/50不変、変更前byte再現一致。腔3部品は各5追加、周囲切り出し組織は394/281追加。
増減の再計算も一致。差分/mesh検査2/2、20ファイルの読取専用採用計画・異常系3/3成功。
次は開発採用と現SHA/履歴テスト同期、統合検証、右表示更新。まだ製品/右は3849、未採用。

窓拡張候補34点を全3軸44PNG/132原300面で目視し、native100代表3点27面も確認。
腔内を支持するため0→24の可逆作業差分を作成した（a2ceb264…、ID24=63849）。
被覆/図SHA検査1/1、native画素照合含む9/9、全差分/逆適用/競合検査1/1成功。
次は断面・ブロック3Dへの影響確認と採用・統合検証。製品/右表示は3849のままで未採用。
全体目標は継続、専門家レビュー/公開反映ではない。以下は工程履歴。

3849版で右下角周囲の探索窓を各軸8/16原300セル（2.4/4.8mm）拡張して再計算。
65000閾値の有限支持・未ラベル候補は0→9→34点。窓拡張で旧窓内にも7原300セルが再接続し、
広げた窓も端へ達するため自動補完しない。次は34点の原画像・連続直交断レビュー。
探索のみで製品/右表示は検証済み3849を維持。以下は工程履歴。

21点補完の統合検証完了：全558/558・型検査・本番build成功。右4345を3849版へ更新し、
水平断45/70/72＋3D・関連3ブロックを目視。確認前の水平断45へ戻した。次は残る窓端/部分支持の欠損や
他の独立成分等の原画像監査を継続する。全体目標未完了、専門家レビュー/公開反映ではない。以下は工程履歴。

21点補完を開発版へ採用し、現labelは3849b1bd…、ID24=63815。旧a512/6旧mesh/採用記録を保存。
新旧採用テスト9/9、現SHAの視索/乳頭体監査再計算成功。全Nodeはlateral-cavity21-full-node-v1.logで進行中。
右の更新は統合検証後。全体目標未完了、main/公開変更なし。以下の未採用表記は直前工程の履歴。

21点補完の全55mask増減を再計算し、腔3部品は各3追加/0削除、周囲実質3部品は表示範囲の調整のみ。
採用前の22ファイル計画と異常系検査3/3成功。次は開発採用・履歴/現SHA監査同期・統合検証・右表示更新。
まだ採用操作を実行しておらず、製品ラベル/右表示はa512。3849は作業領域だけにある。

21点を0→24へ補完する可逆ステージを作成（作業版3849、ID24=63815）。断面2meshとブロック6部品に影響し、
55部品全比較/変更前byte一致を確認。差分・逆適用・断面/ブロック検査3/3成功。
次はmask追加/削除方向の検査と採用前整合性確認。製品/右表示はa512を維持、まだ3849を採用していない。

21追加候補は全3軸78原300面とnative100の2代表点18面を目視し、補完差分作成へ進める判断。
内側寄り5点もnative100では腔内を支持。被覆/候補一致1/1・native画素照合を含む8/8成功。
差分/3D影響/採用は次工程、右a512は維持。全体の完成や専門家確認ではない。

116点周囲の未着色腔を作業領域で探索し、有限セル支持を満たす追加候補21点を抽出した。
閾値領域が調査窓の全6面へ達することを記録し、全領域の自動採用はしない。
位置確認9図は全目視、探索再計算テスト1/1成功。次は21点自体の全連続・直交断の境界レビュー。
製品ラベル/3D/右表示はa512のまま。詳細・report SHAはLATERAL_VENTRICLE_FRINGE_REVIEW.md。

116点の残存成分はa512上で再同定し、原300全3軸27PNG81面を目視した。海馬上方の腔として保持する判断で、
一括削除しない。周囲の未着色腔の補完候補抽出が次工程。薄い境界/脈絡叢様組織との区別は継続して検討する。
被覆・全成分座標・図SHA検査2/2成功。製品変更なし、右は先のa512検証済み表示を維持。

80点除外の統合検証完了：全557/557（lateral-residual80-full-node-v2.log）・型検査・本番build成功。
右4345をa512版へ更新し、水平断69＋3D・側脳室/脈絡叢/内側側頭葉3ブロックを目視した。
現在の表示は水平断69、脳室系3/3、3D1面。次は保持した116点と他の残存欠損/小片の原画像監査を継続する。
以下の進行中表記は履歴。全体目標は未完了、main/公開変更なし。

80点除外を開発データへ適用：現label a512880c…、ID24=63794。原300全66面＋native100代表点で側脳室ではない空隙として除外し、5ブロック部品/断面2meshを同期。隣の116点は保持し、全域の確認は次工程。導入3/3・新旧採用8/8成功。全Node初回の旧監査参照1件は修正し、全体再検証中（lateral-residual80-full-node-v2.log）。右プレビュー更新は統合検証後。以下は過去段階の履歴で、全体目標や専門家レビューの完了ではない。

547点除外の統合検証完了：全Node556/556・Python6/6・型検査・本番build成功。右4345を7d2b版へ更新し、水平断59/60と3D・側脳室/脈絡叢block描画を目視確認。右は水平断59・脳室系3/3表示。次は残る独立116/80点などの画像監査を継続する。全分節完成・専門家レビュー完了ではない。以下の実行中は履歴。

側脳室の独立547点を3方向117原300面で確認し、溝状空隙の誤分類として24→0へ除外。最新開発labelは7d2b88c3…、ID24=63874。復元用b45c・3ブロック旧mesh・採用記録を保存し、断面2mesh/ブロック3部品を同期。Python6/6・型検査成功、全Node/本番build/ブラウザを実施中。残る別小片や脳室の塗り残しを一括解決したものではない。詳細はLATERAL_VENTRICLE_FRINGE_REVIEW.md。以下の「最新」は過去段階の履歴。

第三脳室8点の統合検証完了：全Node555/555、Python2+3+1、型検査・本番build成功。右4345を最新b45c版へreloadし、第三脳室選択・水平断54・透過3Dを目視確認。残存飛び地/欠損の全解決ではない。次は他の独立成分の原画像監査を継続する。以下の実行中は履歴。

最新はb45c0669…（第三脳室の局所8点追加、ID25=12015）。復帰用ffb8と採用記録を保存し、断面用の第三脳室/脳室系meshを同期。55ブロックmask不変。型検査、導入2/2・差分/mesh3/3・画像被覆1/1成功。全Nodeはwork/third-detached8-full-node-v1.logで実行中。ブラウザの右側は前回のffb8検証済みビルドを維持。全体目標未完了、main/公開未変更。詳細はSECTION_VENTRICLE_MESH_SYNC.md。以下は工程履歴。

最新の開発labelはffb8e56e…（第四脳室前方105点を追加、ID26=8641）。全Node554/554、Python修復4/4・導入2/2・全範囲mesh2/2、型検査・本番build成功。ローカルの3直交断・分節3D・第四脳室block表示を目視し、右プレビューを更新した。根拠はFOURTH_VENTRICLE_REPAIR.md。残る脳室欠損・飛び地の帰属や下記の白質束・神経等は未完了。以下e98cの段落は直前工程の履歴。main/公開は変更していない。

現在の開発labelはe98cd406…（下角追加19点・40点を含む後続段階）。`work/inferior-outer40-full-node-v2.log` の全Node 550/550、現資産SHA、同段階ブラウザの保存目視記録を再読確認した。これは過去の統合検証結果の照合であり、この段落を追記した時点で全試験・ブラウザを再実行したという意味ではない。下のba31c7b/547等はそれ以前の工程履歴。

その後、native100によるV近位部・脳弓接続部・内包前方の追加照合を実施したが、それらから新たな分節・神経meshを採用していない。内包は広域水平9面＋直交9面を全目視し、原画素・投影位置等の3テスト成功。前脚/膝/後脚の厳密な細分化は未完了。聴覚路アトラスは著者の表示問題報告と添付図まで確認し、番号キーと補正空間の未解決を維持した。詳細は各構造の監査文書とSEGMENTATION_REFERENCES.mdを参照。全体の未完了項目は下表のとおりで、main/公開更新なし。

## これまでの工程履歴

53点修正の統合検証完了：全Node 547/547（work/inferior-residual53-full-node-v1.log、session30969 exit0）、型検査、本番build、実ブラウザ12/12と全12PNG目視成功。現ラベルba31c7b…、未完了項目の監査は継続。全分節完成・専門家レビュー・公開反映ではない。以下の実行中/未検証表記は工程履歴。現在live検証jobなし。

53点組込みの検証進捗：旧57点は復帰用681fで厳密に再生検査し、mesh履歴に53点の後続段階を追加。対象12/12・本番build成功。視索/乳頭体の客観監査はinferior-residual53 JSONへ再計算済み。実ブラウザ5断面/7部品12/12成功、全12PNG目視済み（inferior-residual53-browser-v1/visual-review.md）。全Nodeはwork/inferior-residual53-full-node-v1.logへ実行中、session30969を継続確認する。新しい分節の完全性・専門家レビューは証明しない。公開変更なし。下記未更新/未検証の記載は直前工程の履歴。

2026-09-07 ローカル開発版：追加53 voxel（0→24）と関連5meshを組込み。現label SHA ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb、raw SHA 2b870431f39cb214d01a8cfc49bbd37f0cb5f23b23264615bbb256329f112d6a、ID24=64362。inferior-residual53-adoption-2026-09-07.jsonとpre-inferior-residual53復帰ファイルに根拠/差分を保存。新採用テスト2/2・型検査成功。過去57点の現行値テスト、SHA依存の客観監査、全テスト/build/実ブラウザは新段階では未更新・未完了。下記681f/545成功は直前段階の履歴。全目標は継続、main/公開変更なし。

57点修正の検証完了：全Node 545/545（work/inferior-residual-full-node-v1.log、session15367はexit0で終了）、型検査・本番build・Chrome152の5断面/7部品検査・全12PNG目視成功。現在live jobなし。今回の局所修正の統合確認であって、全脳室・脳弓・視放線・後付け神経モデルの課題完了ではない。下角の残存不連続等の原画像監査を継続する。main/公開変更なし。下記の実行中表記は履歴。

57点組込み後の検証進捗：過去304点のラベル検査は復帰用5f18 fixtureへ固定し、旧mesh→304点→57点の連鎖を復帰meshとともに維持。現在値のテスト/合成fixtureを681fへ同期し、視索・乳頭体の客観監査は新しいinferior-residual JSONへ実再計算した。履歴・新採用の対象10/10成功。Chrome152/4345の5断面＋7部品は12/12で表示/配信hash一致、全12PNGを目視済み。work/anatomy-review/inferior-residual-browser-v1/report.jsonとvisual-review.mdを参照。全Nodeはwork/inferior-residual-full-node-v1.logへ実行中（session15367）。全脳室完成・専門家確認・物理端末・公開反映の証明ではない。

2026-09-07 最新ローカル組込み：下角の追加57 voxel（0→24）と関連6meshを適用。現compressed SHA `681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88`、raw `eaee5e5809932b06e8b497c4b195edf659438e2a6d0fdb823b55ea2dea2b3086`、ID24=64309。可逆記録 `segmentation-patches/review/inferior-residual-adoption-2026-09-07.json`、変更前label/6meshはtests/fixturesのpre-inferior-residual系列に保存。新採用テスト2/2・型検査・本番build成功。過去採用meshの現行値照合・全体回帰・実ブラウザは次工程で未完了。全分節完成・専門家レビュー・公開反映ではない。以下の5f18等は過去段階。

57点stageの全55部品比較完了：変更6meshは修正前byte再現が一致。周囲組織259差分（244はlabel不変の距離cutoff流入、15は脳室化による組織除外）を全座標で説明し、関連5テスト成功。次は可逆的なローカル組込みと一連の検証。教材5f18/公開はまだ不変。mesh/context reportはinferior-horn-residual-51-*内。

最新：下角の追加57点について全72差分/隣接面を目視し、可逆work stage（出力681fb599…）へ保存。独立decode/全差分/逆適用を含む3テスト成功。まだ教材へ適用していない。次は全55部品のmask影響とmesh再現、その後に統合検証。現教材は5f18のまま。詳細はLATERAL_VENTRICLE_FRINGE_REVIEW。

51点孤立領域周囲の次段階：原300 Y409–421の連続13面と閾値探索20図を全目視。既存別labelとの中心競合があるため全探索の採用は不可。既存label0かつ全有限セル支持の57 app voxelを別の未採用候補として記録した。次は実候補の全直交差分/隣接面を確認する。現5f18ラベル、mesh、公開は不変。詳しくはLATERAL_VENTRICLE_FRINGE_REVIEW。

下角接続の更新：304点修正後、以前の大きな下角成分は26近傍では側脳室本体へ接続。ただし6近傍の途切れは残る。別の独立51点領域と本体の間を原300代表11面で目視し、腔内の塗り残しと内部組織を確認。次は連続冠状面の追跡・直交候補照合であり、距離だけで自動接続しない。詳細はLATERAL_VENTRICLE_FRINGE_REVIEWの「採用後の残存接続」。現5f18ラベルは不変。

2026-09-07 下角304点の検証完了：全Node 543/543（`work/inferior-horn-full-node-v2.log`）、型検査・本番build成功。Chrome152/4345で5断面＋7部品の表示・配信データを検査し、全12PNGを目視した（`work/anatomy-review/inferior-horn-browser-v1/report.json` と `visual-review.md`）。初回全試験の2失敗は過去meshと現meshの照合更新漏れで、復帰fixtureと各採用段階の連鎖を保持して修正し、v1ログも保存。下角の途切れ、脳弓・視放線の独立分節はなお未完了。断面位置の小数表示が長すぎるUI課題も記録。全解剖学的正確性・物理端末確認・専門家確認を保証する結果ではない。main/公開変更なし。下記の実行中表記は過去の状態。

2026-09-07 下角修正の開発統合：原画像の全差分164面と広域14面を確認した304 voxel（0→右側脳室ID24）を採用し、関連7部品を同期。現圧縮SHA `5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba`、raw SHA `6335e0b37e926a9523a1c4d451104157e044a968bddfcaadd069f0c1b7f471dd`、ID24は64252 voxel。可逆記録は `segmentation-patches/review/inferior-horn-adoption-2026-09-07.json`、変更前ラベルと7meshはtests/fixturesに保存。以下の0d31等は過去段階の記録。AI画像レビューによる局所修正で、専門家確認・全脳室完成・公開反映ではない。脳弓・視放線の独立分節は未完了のまま。

下角の断片を全ID24と照合済み。crop内26近傍C1=148/C9=158は範囲外で同じ全体成分につながるが、最大C8=1587は全体でも独立しcrop端非接触。接続課題と切り出しの見かけを区別した。最近点は探索位置として保存し、自動接続しない。次の原画像範囲はX265付近/Y188–198/Z129–141。診断2テスト成功、製品変更なし。

開発検証の更新：867 voxel修正は全Node 541/541（`work/lateral-medium-full-node-v2.log`）、型検査、本番build、Chrome152の5断面＋7部品の実ブラウザ検査と全12PNG目視を通過。旧v1の10失敗は保存し、修正後v2で全成功を確認した。下角の残る断片化は別の未解決項目で、今回の検証は全脳室・脳弓の完成や専門家確認を意味しない。公開更新なし。Development verification: the 867-voxel repair passed all 541 Node tests, type checking, the build, and local browser checks of five section views and seven model parts. Residual inferior-horn fragmentation remains under review; this is not complete segmentation, expert validation, or publication.

側脳室の中規模局所修正を開発版に適用：31領域867 voxel（左555・右312）と関連7部品。現ラベル圧縮SHA `0d31037722a8a31eee3ff6feed49dc076ece3d6c864297240c687cd1526cc229`、raw SHA `b36c2bc3f2ceb8701283dde2cfdd47305b8861e11d357762bd1c160e9dafaa9d`。採用記録は `segmentation-patches/review/lateral-medium-adoption-2026-09-07.json`、旧b473ラベルと変更前7meshはtests/fixturesへ保存。原画像・個別/統合差分・有限セル支持を照合したAI画像レビューによる局所補完であり、専門家監修・全脳室完成ではない。新旧採用テスト4/4、型検査、本番build成功。全Node試験は実行中、今回の実ブラウザ確認は未完了。main/公開変更なし。

側脳室867点stageの全55部品比較完了、変更7meshは既存beforeを完全再現。周囲組織269差分はすべてlabel不変・距離閾値への流入で説明できた。対象6テスト成功、生成物はwork内のみ。次は局所組込み・監査同期・全検証・実ブラウザ。main/公開変更なし。

側脳室867点を可逆作業stageへ保存（左555/右312、出力0d310377、未適用）。原画像/個別/統合全図hashと有限支持座標一致を検査、独立decode全差分/逆適用と不正patch拒否の2テスト成功。次は依存mesh差分と局所組込み一式の検証。現教材b473と公開サイトは不変。

側脳室31成分867点の有限原300セル強度支持を検査完了。全交差セルの最小65083、65000未満を含む候補0。全体積被覆・重み計算の3テスト成功。これは既完了の原画像/個別/統合目視を補助する数値証拠であって腔の組織同定ではない。次は可逆stage、依存meshの差分、採用後の一連の検証。製品・公開変更なし。

側脳室31成分の統合全357パネル（60contact）を目視完了。隣接暗色組織を大きく跨ぐ新しい統合充填は今回認めない。右C402/404など狭い腔の不足はなお残る。個別と不変の388パネルは既確認の個別図へ対応する。統合台帳を全範囲に更新し、次は867候補voxelの有限原300支持検査。採用・製品・公開変更なし。以下の部分件数は中間履歴。

側脳室31成分の統合図はcontact-00〜20、126/357パネルまで目視。複数追加が接する左C86/252/98/87などで暗い壁組織を大きく横断する新規充填は見られない。統合台帳に範囲を固定し、全元図/contactのSHA・357図の対応を検証済み。残りcontact-21〜59の231パネルと有限voxel支持は未完了。867点は未採用のまま、製品・公開変更なし。

側脳室31成分の個別全差分確認完了：最後の左C158/99/333・右C42/329/98を含む285PNG/745 appパネルを全目視。台帳の31成分867点と固定inventory全対象の完全一致、一意性、点数、report/全画像SHA、成分別被覆数を照合成功。統合357PNG目視・有限voxel支持は未完了で、全案は候補保持のみ。個別目視完了を採用・脳室全体完成としない。製品b473・mesh・公開不変。次は統合影響と原画像支持を確認する。

側脳室個別レビュー：左C92/103/288の全27PNG/67パネルを追加目視。累計25成分741点・238PNG/625パネル、残6成分47PNG/120パネル。全3成分は腔側の不足を補う候補として保持し、採用なし。固定inventory/report/全画像SHA・点数・成分一意性・全図数の照合成功。統合357PNG目視と有限支持が未完了、製品・公開変更なし。

側脳室個別レビュー：右C222/194/296の全25PNG/68パネルを目視追加。累計22成分667点・211PNG/558パネル、残9成分74PNG/187パネル。C222/C194は近接するため統合輪郭評価を保留。台帳の成分一意性/点数/全図数と固定inventory/report/全画像SHA照合成功。統合357PNG目視・有限支持は引き続き未完了、採用・製品・公開変更なし。

側脳室個別レビュー：左C81/74/139の全29PNG/76パネルを目視追加。累計19成分588点・186PNG/490パネル、残12成分99PNG/255パネル。腔端候補の先の未着色腔は別途未解決で、候補末端を脳室終端としない。台帳の一意性/点数/全図数と固定inventory/report/全画像SHAの照合成功。統合357PNG目視・有限支持も未完了。採用・製品・公開変更なし。

側脳室個別レビュー：左C98/87・右C76の全30PNG/82パネルを目視追加。累計16成分500点・157PNG/414パネル、残15成分128PNG/331パネル。いずれも腔側不足の候補として保持し、候補外の腔端不足は未解決。台帳と固定inventory/report/全画像のSHA・点数・一意性・被覆数の照合成功。統合357PNG目視と有限支持は未完了。製品・公開変更なし。

側脳室の現在位置：左C86/252・右C326の全36PNG/98パネルを追加目視。個別確認は13成分399点・127PNG/332パネル、残18成分158PNG/413パネル。候補は腔側不足として保持し、周辺の暗い組織の名称は確定しない。台帳の成分点数/一意性/report・全画像SHA/図数を照合して成功。統合357PNG目視と有限支持も未完了のため、採用・製品・公開変更なし。以下の小さい累計は工程履歴。

側脳室：左C135/166の全24PNG/64パネルを追加目視し、累計10成分272点、91PNG/234パネル。個別の残21成分194PNG/511パネル。31候補を同時仮適用した統合比較を生成し、全745パネル中357が個別像と変化、388がlabel完全一致。統合357PNGは未目視。全key被覆/画像SHA・構文チェック成功。これは確認対象の抽出であり採用ではない。製品b473不変。詳細LATERAL_VENTRICLE_FRINGE_REVIEW.md。

側脳室全差分：右C402/404・左C75/80の全32PNG/80パネルを追加目視。累計8成分176点、67PNG/170パネルを記録し、成分別全画像のSHA/数を検査。残23成分218PNG/575パネルと統合/有限支持が未完了。右X275には今回の候補外の未着色腔も残る。全体の不足解消とは扱わず、今の8成分は未採用候補を維持。機械可読の視認記録はsegmentation-patches/review/lateral-medium-visual-review-2026-09-07.json。製品b473・公開不変。

側脳室の全差分レビュー着手：組織突出近傍の左C192/224・右C149/72（92点）について全35PNG/90パネルを目視。壁側組織を大きく跨がない補完候補として保持したが、採用なし。残250PNG/655パネル・近接候補統合・有限voxel支持の確認を継続する。35PNGの保存SHA検査不一致0。製品b473不変。以下の全差分未目視表記は開始前の履歴。詳細LATERAL_VENTRICLE_FRINGE_REVIEW.md。

最新進捗：側脳室31成分867点の原300代表93PNGは全目視完了。全差分285PNG/745パネルを生成済み、そちらはまだ未目視。左C192/224・右C149/72の組織突出近傍、右C402/404の狭い腔を重点確認する。全差分・近接成分の統合確認前のため採用なし。製品b473不変、live jobなし。下の93PNG中9枚のみ確認という記述は過去の工程履歴。

現在の自律作業：側脳室20–49点の未採用31成分867点を原300比較へ展開。93PNG中、左C135/C166と右C326の9PNGを目視、残84PNG未確認。代表面は腔側不足を支持するが、全差分・端部・統合確認前なので採用なし。現在label b473のまま。詳細LATERAL_VENTRICLE_FRINGE_REVIEW.md。

右脳弓接続部：X328–335の全8矢状画像で局所変化を確認。X331–333にわたる明るい斜走領域の扱いが未確定のため、候補の自動接続を不採用とした。内部案の微小追加は保留し、全体同定・外縁の追加根拠を要する項目へ整理。脳室等の別項目の修正は継続する。

脳弓接続部の新しい具体的制約：原300[331,422,291]は明るい小領域に重なるため接続起点として不採用。左[322,422,291]の組織内所見を右へ対称転用しない。座標拡大7PNG＋直交2PNG確認済み。次は右側の隣接矢状断で小領域を避けて追える組織の連続性を確認。教材資産変更なし。

脳弓追補：体部/屈曲部の同時連続表示Y416–434（19面、7PNG）を全目視。候補の段差は2種類の内部案の切替によるもので、組織断裂とは判断しない。全外縁・接続の採用根拠はまだ不足。次の局所追跡はY419–425の拡大外縁と矢状照合。1228原点は未採用のまま、公開label変更なし。詳細FORNIX_SEGMENTATION_REVIEW.md。

現チェックポイント：側脳室630点は個別308面・変化する統合124面の確認後、開発採用済み。現b473、6mesh同期、系列累計1203点。全539/539・型/build・実Chrome152の11表示/配信SHA/全PNG目視を確認。初回ブラウザ起動失敗はテスト出力先との干渉で、通常base復帰＋テスト出力分離により対処（分離検査1/1、型成功）。live jobなし。残る小成分・この一層候補では覆わない腔の不足、第三/第四脳室端部、脳弓の体部接続/脚/柱、視放線などは未完了。観察リンクの小数位置表示も長いためUI改善候補。下の未採用・実行中表記は履歴。

側脳室の次工程：未採用50点以上の8成分計630点を原300代表24PNG/72面で確認。全差分114PNG/308面は生成済み・未目視。端部・小組織との境界確認と採否判断が残る。製品7c54fdd2…不変、前回採用573点と混同しない。

最終検証：全Node537/537成功（work/lateral-next-full-node-v2.log、session36979終了）。型検査・通常build・diff-check成功、実Chrome152/4345の9表示を全目視。今回の265点統合は確認済み。現在live検証ジョブなし。以下の実行中表記は検証途中の履歴であり、全解剖学目標の完了ではない。

最新：追加側脳室265点と4meshを開発採用し、現label7c54fdd2…、系列累計573点。対象7/7・型検査・build成功、実ブラウザ9画像確認。全Nodeは実行中。脳室の残りの候補、脳弓・視覚路・後付けモデル等は未完了で全目標を継続。以下は各工程時点の履歴。

側脳室265点の周囲組織1点は既存距離cutoffの表示範囲変更と判明（ID8不変）。4mesh同期installerのpreflight成功、製品未適用。次は採用/参照テスト同期と全検証。LATERAL_VENTRICLE_FRINGE_REVIEW.mdの統合preflight節参照。

次の側脳室265点：全差分96面確認・可逆stage済み、製品未適用。55mask中4部品変化（脳室3個各11粗格子点、choroid周囲組織1点）、修正前mesh再生成は全一致。周囲組織1点の対応確認と統合/検証が次。LATERAL_VENTRICLE_FRINGE_REVIEW.md参照。以下の89面未確認という記録は前段の履歴。

更新：83dcbdda…の実ブラウザ8画面（5断面＋3block）をChrome152/4345で確認し全PNG目視、新label/3meshの配信SHA一致。全535テスト・型検査・build成功。次候補は左C334/119＋右C66/146=265点、原300代表18面と矢状差分7面を確認、残る冠状55＋水平34面は未確認・未採用。詳細はLATERAL_VENTRICLE_FRINGE_REVIEW.md。以下の検証未実施表記は前段の履歴。main/公開変更なし。

側脳室採用後の最新検証：全Nodeテスト535/535成功、型検査・通常build・diff-check成功。全テストログは `work/lateral-fringe-full-node-v1.log`。新資産の実ブラウザ確認は未実施。以下の実行中・未完了表記は前段の履歴。

これは全体の完了宣言ではなく、局所修正後にも残る問題を取り落とさないための作業表である。開発volume 83dcbdda…時点（左乳頭体下端2点修正、小脳外縁7領域の累計25903点除外、第三脳室1587点・第四脳室16点・側脳室308点補完まで）。側脳室段階は対象12テスト・型検査成功、全テスト/build/実ブラウザの新資産確認は未完了。前段の第四脳室時点では全533テスト・型検査・通常build・実ブラウザ5画面確認済みだった。専門家承認・main統合・公開更新はしていない。

再開後：中脳上端のユーザー線は受領済み。14比較5枚の隣接・直交照合を完了したが、3D補修範囲は未確定（MIDBRAIN_BOUNDARY_PROTOCOL_REVIEW.md）。新しい同一標本の研究資料6ページを確認し、より高解像度の局所データを次の調査候補とした。MRI集団アトラスとの取り違えを避ける判断と、取得できたもの／未取得の区別はHYPOTHALAMUS_EXTERNAL_REFERENCE_REVIEW.md参照。

|対象|現在の判断と次の確認|
|---|---|
|脳弓（ユーザー追加重点）|模式3Dはあるが独立分節は未実装。原300で体部内部1098点・屈曲部内部130点の未採用案を作り、連続/直交表示を確認。両案の間の未分節部分と外縁・脚/柱全長は未完了で、1228点を完成ラベルとして採用しない。FORNIX_SEGMENTATION_REVIEW.md参照。次は接続部の画像境界を優先し、内部点の微小追加だけを進捗目標にしない。|
|脳室系（ユーザー追加重点）|中脳水道16点の分類変更、第四脳室前方31点除外、第三脳室中央1587点補完、第四脳室左右16点補完を開発採用。全腔の分節完了ではない。過去の穴候補193点は一括補完不採用。第三脳室の残る上縁・周辺、第四脳室の輪郭不足・尾側、中脳水道全長・移行と側脳室を継続確認する。SEPTEMBER_VENTRICLE_REVIEW.md・FOURTH_VENTRICLE_REPAIR.md参照。|
|視放線・放線冠・聴放線（未分節の収載構造）|app/page.tsxのradiationsブロックでは3系統とも模式補助。視放線はoptic-radiation層とvisual経路にあるが、組織像由来の分節ではない。未収載と誤記せず、実画像同定の未完了として扱う。外側膝状体などの起終点と利用可能な原画像/線維資料の対応から検討し、白質の濃淡だけで線維束名を割り当てない。|
|手動由来ID1–22|位置補正と関連22 meshは採用済み。核内部の線維帯や海馬亜区分の精密分節を完了したわけではない。REGISTERED_LABELS_ADOPTION.md参照。|
|脳幹の過剰範囲|孤立部、小脳側、正中表面、下端支持範囲外、外表面・側縁・背側を局所修正済み。未点検の境界を含む全体へ白色閾値を適用しない。BRAINSTEM_LATERAL_DORSAL_REVIEW.md参照。|
|脳幹腹側不足|元アトラスのBrainstemとVentralDCの範囲差が残る。VentralDC全体の合併・固定水平slabは不採用。原画像で連続境界を限定する必要がある。BRAINSTEM_SOURCE_EXTENT_REVIEW.md参照。|
|視交叉・左右視索|旧ID33は混合領域。現volumeで51比較を目視し、不一致の位置を記録。ID36–38の個別分節は未完了。座標だけの分割はしない。OPTIC_CURRENT_CONTINUITY_REVIEW.md・OPTIC_PATHWAY_AUDIT.md参照。|
|乳頭体|native100局所18面と全1290点の照合後、低信号82点を有限voxelと直交断で追加検討し、左下端2点だけ除外して統合済み（左559・右729）。残り80点は維持。視床下部付着境界は別途未確定。MAMMILLARY_NATIVE_SUPPORT_REVIEW.md参照。|
|島皮質|既存全Z点検に加え左右の300 µm局所18比較を確認。溝側・深部側の不一致は残るが、この局所に完全背景値255のラベル点はなく、自動削除は不採用。INSULA_BOUNDARY_REVIEW.md参照。|
|小脳の外縁|7つの領域を原画像・連続直交断・300 µm画像の有限支持と差分図で確認し、348＋52＋259＋372＋229＋3353＋21290点を開発採用。各領域の211/376/748/571/425/3914/18701点は保持し、全55block mask不変。他の大成分や全葉間溝の修正は未完了。ID28/29は皮質・白質・虫部の合成で、内部白質は削除対象ではない。CEREBELLUM_MASK_SCOPE_REVIEW.md参照。|
|内包|旧除外候補の再点検では残存1,395点を一括削除できない。前脚・膝・後脚の細分類や上方の移行は未確定。INTERNAL_CAPSULE_REPAIR.md参照。|
|後付け神経・血管|後交通動脈の模式接続と未選択大脳脚補助部品によるCN III遮蔽は修正済み。全20始点60面＋III/IV広域12面を目視。VII/VIIIの側頭葉への遠位侵入部分は除去し、元の近位部分だけ保持（表示切り詰めであり根出口の確定ではない）。Vの側頭葉、IX/X/XIの小脳組織への侵入は未修正で関連8問保留/出題92。IIIは実際の脳内束との混同を避け真の出現部を特定する必要がある。根糸・XI脊髄根は未収載。NERVE_ORIGIN_IMAGE_REVIEW.md・NEUROVASCULAR_TOPOLOGY_REPAIR.md参照。|
|溝の色付け|試した2方式は連続性・自然さを満たさず不採用。新モデルを完成した扱いにしない。ALL_STRUCTURE_ANATOMY_REVIEW.md参照。|

## CN IIIの再表示確認

**後続修正**：未選択の大脳脚位置目安が遮蔽する問題を切り分け、選択時だけ描画するよう変更した。PEDUNCLE_VISIBILITY_REPAIR.md参照。以下は修正前の所見。画像work/cn3-current-*.pngは後続実行で修正後へ更新されており、修正前の固定証拠として引用しない。

Chrome152、localhost:4345、1366×900、脳神経・脳幹ページでIIIを選択した。初期方向に加え、実マウスドラッグで左右の斜め方向へ回転し、3枚の実スクリーンショットをAIが目視した。選択箇所の短い白い部分は見えるが、脳幹との出現位置から経路を連続して追える表示とは判断できない。「何も描画されない」不具合とは区別する。血管は非表示で、血管の重なりだけが原因ではない。

画像：work/cn3-current-initial.png、cn3-current-oblique.png、cn3-current-opposite.png。再現：work/check-cn3-current.mjs。初期READY_PROBEはrootあり、canvas1、loading0、UI error0、横overflowなし、WebGL fallbackなし。画面の健全性は神経位置の正しさを保証しない。

次に調べるのは模式神経の座標と、表示中の脳幹・大脳脚部品の遮蔽関係である。見えるまで神経を外側へ移動する、脳幹を消す、深度を無視して前面へ描く、といった方法を解剖学的修正の代用にはしない。今回は神経geometryを変更していない。
