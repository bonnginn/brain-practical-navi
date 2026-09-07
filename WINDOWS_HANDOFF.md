# Windows Codex への引き継ぎ（β改修）

2026-09-07公開作業：ユーザーが採用済み修正の公開差し替えとREADME更新を承認。現行ラベルは3aa4127843d1ca59ee4fa2d542632748ec542958c76329b627b3968b6d53f45e。日英ブラウザ参考文献8件・更新履歴・英語クレジットを整備。公開作業以外の自律的な解剖学レビューは停止を維持する。README冒頭とRELEASE_2026-09-07.mdを優先し、下記の「未公開」「現行」等は過去の工程記録として読む。

最新状態（2026-09-07）：外側40点は全49原画像確認・可逆stage・55部品mask不変確認後に開発採用済み。現ラベルe98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3、raw9a524981ddf521236b8fec835aef04891fa2b6ef58d22a2b5f03ca1a9f68d64d、ID24=64421。全Node550/550（work/inferior-outer40-full-node-v2.log、session14421 exit0）、型検査/build、ブラウザ12/12・全12PNG目視成功。位置数値の長い小数表示は残るUI課題。現在live検証jobなし。main/公開更新なし。

原画像追加：公式full16_100um_optbal.mncを取得・per-Y scaling読取検証済み（NATIVE100_BOUNDARY_REVIEW）。三叉神経模式4点×直交隣接36面を2窓で全目視したが、新根走行は確定できず変更なし。脳弓左右接続参照点をnative100へ移した6PNG/18パネルも全目視。右点付近の明るい小領域は残り、単純接続/充填不採用を維持。FORNIX_SEGMENTATION_REVIEWへ追記、独立decode原画素保持テスト1/1成功。脳弓1228点は未採用、次は上方付着部と外縁の広い連続追跡が必要。以下の58d80440・未目視・未採用記載は工程履歴。

次工程：外側crop[436,397,158]–[466,421,201)の探索11面は全目視済み。有限支持の新候補40点を生成（grid f07efa84…）。inferior-horn-outer-after19-finite-v1の49原PNG/13contactは生成しただけで全未目視。次に全差分を目視し、支持される場合のみstageへ進める。探索/有限支持4/4成功。製品58d80440は不変。live jobなし。詳細はLATERAL_VENTRICLE_FRINGE_REVIEW。

次工程の進捗：原Y398–418連続21面（wide-series全6contact）と広域直交8面（wide-orthogonal全2contact）を全目視済み。上方介在組織を避ける必要があり、内側の明るい開放領域は一括採用しない。次は既存外側腔の原X440近傍〜旧crop上限X445より外側の未着色帯を境界付きで確認する。LATERAL_VENTRICLE_FRINGE_REVIEWの追補に根拠・report SHAを記録。coverage/pixel保持テスト2/2。現58d80440、追加採用なし、live jobなし。

最新確認：session24197はexit0、全Node549/549（v2 log、skip/fail0）。19点組込みは型検査/build/ブラウザ12件と全画像目視まで検証済み。現在live jobなし。次は原Y398–418の広域分岐を連続・直交確認する（LATERAL_VENTRICLE_FRINGE_REVIEW参照）。広域8PNGは全目視済み、report c64cb7a8…。現58d80440のまま。以下の実行中記載は履歴。

全Node v2の実行ハンドルはsession24197（最後の確認時点で実行中）。同ハンドルをpollし、終了コードとv2 log末尾を確認する。session59659のv1はexit1、session73499の関連83件はexit0、ブラウザsession86234はexit0で終了済み。

19点検証の後続：現在SHA依存の3監査スクリプト/テスト/4合成fixtureを58d80440へ同期し、optic/mammillaryのinferior-partial19 JSONを実再計算済み。対象採用16/16、本番build成功。Chrome152/4345の5断面・7部品12/12成功、全12PNG目視済み（inferior-partial19-browser-v1/visual-review.md）。全Node初回は546/549で、3失敗は旧監査JSON参照だった。新JSONへ参照を変更し関連83/83成功。全体再実行はwork/inferior-partial19-full-node-v2.logを確認し、実行ハンドルが終了するまで再起動しない。初回失敗logはv1として保持。長小数の位置表示のクリップを次のUI修正候補として記録。main/公開変更なし。

最新：19点修正を開発版へ組込み済み。現compressed SHA `58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7`、raw `94a8a3edd960256d0fc22e2c5fff2085d88e3f3e8fcc1415ae112b37c2d794f1`、ID24=64381。`inferior-partial19-adoption-2026-09-07.json`とpre-inferior-partial19復元データに根拠保存。installer preflight/apply成功（17ファイル）、新19点/旧53点Node4/4・型検査成功。旧mesh successor helperへ19点を接続済み。ただし他の現行SHA依存テスト/合成fixture/監査スクリプト更新と実監査、全テスト/build/browserは未完了。旧証拠の固定SHAは機械置換しない。現在live jobなし。main/公開未変更。以下の53点以前の状態は履歴。

53点修正の統合検証完了：全Node 547/547（work/inferior-residual53-full-node-v1.log、session30969 exit0）、型検査、本番build、実ブラウザ12/12と全12PNG目視成功。現ラベルba31c7b…、未完了項目の監査は継続。全分節完成・専門家レビュー・公開反映ではない。以下の実行中/未検証表記は工程履歴。現在live検証jobなし。

53点組込みの検証進捗：旧57点は復帰用681fで厳密に再生検査し、mesh履歴に53点の後続段階を追加。対象12/12・本番build成功。視索/乳頭体の客観監査はinferior-residual53 JSONへ再計算済み。実ブラウザ5断面/7部品12/12成功、全12PNG目視済み（inferior-residual53-browser-v1/visual-review.md）。全Nodeはwork/inferior-residual53-full-node-v1.logへ実行中、session30969を継続確認する。新しい分節の完全性・専門家レビューは証明しない。公開変更なし。下記未更新/未検証の記載は直前工程の履歴。

2026-09-07 ローカル開発版：追加53 voxel（0→24）と関連5meshを組込み。現label SHA ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb、raw SHA 2b870431f39cb214d01a8cfc49bbd37f0cb5f23b23264615bbb256329f112d6a、ID24=64362。inferior-residual53-adoption-2026-09-07.jsonとpre-inferior-residual53復帰ファイルに根拠/差分を保存。新採用テスト2/2・型検査成功。過去57点の現行値テスト、SHA依存の客観監査、全テスト/build/実ブラウザは新段階では未更新・未完了。下記681f/545成功は直前段階の履歴。全目標は継続、main/公開変更なし。

57点修正の検証完了：全Node 545/545（work/inferior-residual-full-node-v1.log、session15367はexit0で終了）、型検査・本番build・Chrome152の5断面/7部品検査・全12PNG目視成功。現在live jobなし。今回の局所修正の統合確認であって、全脳室・脳弓・視放線・後付け神経モデルの課題完了ではない。下角の残存不連続等の原画像監査を継続する。main/公開変更なし。下記の実行中表記は履歴。

57点組込み後の検証進捗：過去304点のラベル検査は復帰用5f18 fixtureへ固定し、旧mesh→304点→57点の連鎖を復帰meshとともに維持。現在値のテスト/合成fixtureを681fへ同期し、視索・乳頭体の客観監査は新しいinferior-residual JSONへ実再計算した。履歴・新採用の対象10/10成功。Chrome152/4345の5断面＋7部品は12/12で表示/配信hash一致、全12PNGを目視済み。work/anatomy-review/inferior-residual-browser-v1/report.jsonとvisual-review.mdを参照。全Nodeはwork/inferior-residual-full-node-v1.logへ実行中（session15367）。全脳室完成・専門家確認・物理端末・公開反映の証明ではない。

2026-09-07 最新ローカル組込み：下角の追加57 voxel（0→24）と関連6meshを適用。現compressed SHA `681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88`、raw `eaee5e5809932b06e8b497c4b195edf659438e2a6d0fdb823b55ea2dea2b3086`、ID24=64309。可逆記録 `segmentation-patches/review/inferior-residual-adoption-2026-09-07.json`、変更前label/6meshはtests/fixturesのpre-inferior-residual系列に保存。新採用テスト2/2・型検査・本番build成功。過去採用meshの現行値照合・全体回帰・実ブラウザは次工程で未完了。全分節完成・専門家レビュー・公開反映ではない。以下の5f18等は過去段階。

2026-09-07 下角304点の検証完了：全Node 543/543（`work/inferior-horn-full-node-v2.log`）、型検査・本番build成功。Chrome152/4345で5断面＋7部品の表示・配信データを検査し、全12PNGを目視した（`work/anatomy-review/inferior-horn-browser-v1/report.json` と `visual-review.md`）。初回全試験の2失敗は過去meshと現meshの照合更新漏れで、復帰fixtureと各採用段階の連鎖を保持して修正し、v1ログも保存。下角の途切れ、脳弓・視放線の独立分節はなお未完了。断面位置の小数表示が長すぎるUI課題も記録。全解剖学的正確性・物理端末確認・専門家確認を保証する結果ではない。main/公開変更なし。下記の実行中表記は過去の状態。

最新ローカル組み込み：下角付近304 voxel（0→24）と関連7meshを適用。現compressed SHA `5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba`、raw `6335e0b37e926a9523a1c4d451104157e044a968bddfcaadd069f0c1b7f471dd`。ID24=64252。旧0d31ラベルと7meshは `tests/fixtures/pre-inferior-horn-*` 等へ保存。採用記録 `segmentation-patches/review/inferior-horn-adoption-2026-09-07.json`。型検査/build、新旧採用4/4成功。視索/乳頭体の客観監査を `*-2026-09-07-inferior-horn.json` として再生成。全体回帰と今回のブラウザ検証は未完了。下記の0d31等は過去チェックポイント。main統合/公開変更なし。

開発検証の更新：867 voxel修正は全Node 541/541（`work/lateral-medium-full-node-v2.log`）、型検査、本番build、Chrome152の5断面＋7部品の実ブラウザ検査と全12PNG目視を通過。旧v1の10失敗は保存し、修正後v2で全成功を確認した。下角の残る断片化は別の未解決項目で、今回の検証は全脳室・脳弓の完成や専門家確認を意味しない。公開更新なし。Development verification: the 867-voxel repair passed all 541 Node tests, type checking, the build, and local browser checks of five section views and seven model parts. Residual inferior-horn fragmentation remains under review; this is not complete segmentation, expert validation, or publication.

側脳室の中規模局所修正を開発版に適用：31領域867 voxel（左555・右312）と関連7部品。現ラベル圧縮SHA `0d31037722a8a31eee3ff6feed49dc076ece3d6c864297240c687cd1526cc229`、raw SHA `b36c2bc3f2ceb8701283dde2cfdd47305b8861e11d357762bd1c160e9dafaa9d`。採用記録は `segmentation-patches/review/lateral-medium-adoption-2026-09-07.json`、旧b473ラベルと変更前7meshはtests/fixturesへ保存。原画像・個別/統合差分・有限セル支持を照合したAI画像レビューによる局所補完であり、専門家監修・全脳室完成ではない。新旧採用テスト4/4、型検査、本番build成功。全Node試験は実行中、今回の実ブラウザ確認は未完了。main/公開変更なし。

## 現在の優先チェックポイント：630点適用後

更新：session63037終了、全539/539成功。Chrome152/4345のbrowser-v2は11/11表示・配信SHA確認、全PNG目視済み。初回browser-v1失敗はテストのPagesビルドがdistを置換したことによる。通常baseへ戻し、検査outDir分離とSites plugin outDir対応を実装。分離検査1/1・型成功、差分チェックはCRLF警告のみ。現在live jobなし。次は脳弓の接続・外縁／脚・柱や未解決脳室等の原画像レビュー。全目標は未完了。下の古いhandle・実行中表記は履歴。

現開発labelはb473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567（旧7c54から630点追加）、6mesh同期済み。対象9/9・型/build成功。全suite session82411/work/lateral-remaining-full-node-v1.logを確認し、完了まで同じhandleで待つ。初回途中で旧optic監査JSON参照の2失敗を確認し、新lateral-remaining JSONへ更新済み。新SHAのoptic/mammillary客観監査JSON生成済み。全体再検証・実ブラウザ・文書同期は残る。下の「630点未採用」は履歴。LATERAL_VENTRICLE_FRINGE_REVIEW.md先頭が現状。

## 最新：側脳室残余8成分630点の代表原画像を確認

左C59/61・C278/61・C297/51、右C88/132・C103/123・C52/84・C124/66・C21/52。50点以上の未採用成分全8個。--remaining-largeで原300全24PNG/72代表面を目視。全差分114PNG/308面はlateral-fringe-remaining-large-difference-v1へ生成したが、まだ未目視。次はこの差分全体の確認（各成分ごとの仮適用）。630点未採用、製品7c54fdd2…維持。新規live jobなし、構文/diff-check成功。詳細LATERAL_VENTRICLE_FRINGE_REVIEW.md先頭。

## 最新：追加側脳室265点＋4mesh適用済み

最終検証：全Node537/537成功（work/lateral-next-full-node-v2.log、session36979終了）。型検査・通常build・diff-check成功、実Chrome152/4345の9表示を全目視。今回の265点統合は確認済み。現在live検証ジョブなし。以下の実行中表記は検証途中の履歴であり、全解剖学目標の完了ではない。

全テスト初回62385は終了（536/537、旧登録meshのSHA参照1件）。履歴fixture＋新採用記録へ検査を接続し、関連4/4成功。現在の全体再実行handleは36979、ログwork/lateral-next-full-node-v2.log。下記62385実行中表記は旧状態。原画像や製品資産の再変更なし。

現label7c54fdd2…、左64110/右63179、この系列計573点。lateral-next-adoption recordと変更前83dc/4mesh fixtures保持。対象7/7・型検査・通常build・diff-check成功、実4345の5断面＋4block＝9PNG全目視/配信SHA一致。全Node実行中session62385、ログwork/lateral-next-full-node-v1.log（再開時は必ず生存/完了確認）。詳細LATERAL_VENTRICLE_FRINGE_REVIEW.md先頭。公開/mainなし。以下の未適用表記は履歴。

## 最新：次の側脳室265点のstage・4mesh影響

追補：choroid/tissue1点はapp[216,300,130]の右尾状核ID8を保持したcontext追加。右側脳室からの距離8.602325→8.306624 mmが既存cutoff8.5を跨ぐためで、解剖label変更なし。diagnose_lateral_next_support.pyのv2と固定SHAを保存。install_lateral_next_repair.pyの読み取り専用preflight成功（13ファイル、未適用）。次は--apply＋現行SHA/採用テスト同期＋全検証。製品83dcbdda…維持、jobsなし。

全34差分PNG/96面を目視完了。左C334/119・右C66/146をlateral-fringe-next-stage-v1へ可逆stage（未設置、新SHA7c54fdd2…、repair SHA90fd67a9…）。--lateral-nextで55mask比較：3脳室部品各11粗格子点＋choroid/tissue1点、他51不変、4mesh全てbefore再生成一致。次は周囲組織1点の対応確認→4mesh/label統合→検証。製品83dcbdda…のまま。replay3/3・diff-check成功。詳細LATERAL_VENTRICLE_FRINGE_REVIEW.md。jobsなし、公開/mainなし。

## 最新：側脳室308点と3meshを開発採用

更新：83dcbdda…の実ブラウザ8画面（5断面＋3block）をChrome152/4345で確認し全PNG目視、新label/3meshの配信SHA一致。全535テスト・型検査・build成功。次候補は左C334/119＋右C66/146=265点、原300代表18面と矢状差分7面を確認、残る冠状55＋水平34面は未確認・未採用。詳細はLATERAL_VENTRICLE_FRINGE_REVIEW.md。以下の検証未実施表記は前段の履歴。main/公開変更なし。

側脳室採用後の最新検証：全Nodeテスト535/535成功、型検査・通常build・diff-check成功。全テストログは `work/lateral-fringe-full-node-v1.log`。新資産の実ブラウザ確認は未実施。以下の実行中・未完了表記は前段の履歴。

現label83dcbdda…、左63991/右63033。可逆記録lateral-fringe-adoption-2026-09-07.json、旧D429 labelと旧3mesh fixture保持。対象Node12/12・型検査成功、全テスト/build/実ブラウザ新資産確認は未完了。LATERAL_VENTRICLE_FRINGE_REVIEW.md参照。公開/main変更なし。

脳弓は体部1098＋屈曲部130原300点の内部試案を直交表示まで確認したが、間の接続と外縁・脚/柱全長は未完了で、いずれも未採用。FORNIX_SEGMENTATION_REVIEW.mdの先頭が最新。以下の「最新」見出しは過去工程の履歴。

## 最新：脳弓内部下書き前後18面へ延長、v2を保持

render_fornix_core_draft.py --extend-body/--refine-extension追加。body-extension-v1の全7contact20面(Y403–422)目視済み。Y404–408左内縁のはみ出しを確認してv2へ調整、変更5面をcontact-0/1で再目視。他PNG SHA不変。fornix-core-draft-body-extension-v2/report.jsonは1098原300点、既存app中心ラベル全0、原値51888–65422。次はこの延長v2の直交差分と有限app支持を検査。まだ未採用、脳弓全体ではない。前回のgrid-v1は3面183点版なので新案の結果と混同しない。public d4295e7c…不変、jobsなし、公開/mainなし。

## 最新：脳弓下書きのapp格子対応を検査

audit_fornix_draft_grid.py追加、v2 report SHA bed75030ea37e67ad069fc214d70261a58ccd90e48f3c1362116fb80ba2ac5a6固定。183原300点→中心丸め81 app voxel、既存label競合0。ただしvoxel全体が下書き原セル集合に収まるのは8個のみ。他73は採用不可という意味ではなく、この小下書きだけでは支持が足りない。fornix-draft-grid-v1/report.jsonに全81座標/支持/原値記録。test_fornix_draft_grid.py3/3。次は包含8点の直交画像確認と、原画像での体部前後方向の下書き拡張。8点で脳弓完成としない。製品d4295e7c…不変、jobsなし、main公開なし。

## 最新：脳弓内部下書きv2を原画像で確認

render_fornix_core_draft.py追加。固定draft SHA9a82db81…をラスタ化v1=219原300点、中心appラベル全0だが左内縁に白い裂隙へのはみ出しを検出。--trim-inner-edgeで左polygonを縮めたv2=183点、原値53226–63102。v1/v2各5PNG(Y410–414)を全目視済み。work/anatomy-review/fornix-core-draft-overlay-v2/report.jsonに実polygon/全点保存。旧v1保持、まだ未採用。次はv2の点集合を直交面で確認し、app500へ変換したvoxelの有限支持/既存label競合を調べる。3面内部下書きで全脳弓とは称さない。public d4295e7c…不変、jobsなし、main公開なし。

## 最新：脳弓参照点の直交12面・内部下書き

review_fornix_native300.py --seed-orthogonal追加。fornix-native300-seed-orthogonal-v1全4PNG12面(X320–322/332–334,Z295–297/300–302)目視済み。左右の弧状組織への連続を確認、全外縁/脚/柱確定ではない。fornix-body-core-draft-2026-09-07.jsonに原300Y411–413/XZ内部polygon各2を下書き。旧mask転写ではなく参照点周辺の小範囲案。**次はpolygonをラスタ化し原画像/隣接面へ重ねて確認**、まだ下書き未検証・未採用・app未変換。製品d4295e7c…不変、jobsなし、公開/mainなし。

## 最新：脳弓の拡大座標図・追跡参照点

review_fornix_native300.py --coordinate-details追加、全3PNG9面を目視済み（以前の面の拡大）。fornix-native300-coordinate-details-v1、report SHAfc168302…、原300 index軸付き。Y419–421で旧locatorが正中白色裂隙へ重なることを確認。fornix-body-localization-2026-09-07.jsonに原300組織内参照点[321,412,296]/[333,412,296]、裂隙参照[326,420,296]を保存。分節/採用ではない。次はこの参照点の矢状/水平連続を追う。旧2160点流用・自動boxfill不可。製品d4295e7c…不変、jobsなし、公開/mainなし。

## 最新：脳弓体付近の連続18面を確認

review_fornix_native300.py --body-series追加。fornix-native300-body-series-v1全6PNG/Y404–421の18面を個別目視済み、初期との重複3面を除く新規15面。旧2160点locatorのY418–421上方突起は薄い正中組織への接続部分を含むため全体採用しない。体部中央と上方付着部を分けて候補を作るのが次段階。脚/柱全長も未完了。FORNIX_SEGMENTATION_REVIEW.md参照。製品d4295e7c…不変、jobsなし。公開/mainなし、目標active。

## 最新：脳弓の登録300µm初期レビューへ移行

FORNIX_SEGMENTATION_REVIEW.md追加。review_fornix_native300.pyで旧脳梁除外2160点をlocatorにし、現d4295e7c…脳梁輪郭と原300へ投影。fornix-native300-initial-v1全3PNG9面（X326–328/Y411–413/Z289–291）を個別目視完了。脳梁下の弧状部・正中両側の組織を追う手がかりはあるが、透明中隔の付着部、脚/柱の全連続は未確認。2160点を脳弓へ自動再分類しない。次は前後連続を追い、必要に応じnative100視床下部ROIで柱を局所確認（全脳弓を含むと仮定しない）。Jones資料は既調査、同一標本の脳弓volumeを新規取得したわけではない。原画像/製品変更なし、jobsなし、公開/mainなし。

## 最新：第四脳室16点の統合検証完了、他構造へ継続

全体v2 session35216終了0、533/533成功。通常Vitebuild最終453ms成功、全テスト後に通常dist復元済み。型検査/対象24件も成功済み。4345実ブラウザrunner --fourth-paired終了0、fourth-paired-browser-v1の全5PNG目視済み（3断面1366、水平390、hindbrain第四脳室）。実response raw b17bcfbc…/mesh e821185c…確認、差替えなし。詳細FOURTH_VENTRICLE_REPAIR先頭。稼働テストjobなし。現label d4295e7c…/26=8536、開発のみ、main/公開なし。

次：脳室の残る前方輪郭不足・尾側、脳弓の体/脚/柱の独立分節等へ継続。位置小数表示のUI残件もある。今回の16点は全腔完成ではない。既生成第四脳室57差分面/登録300投影24面/局所18面は目視済みのため理由なく全再閲覧しない。脳弓/視放線は模式表示と実画像同定を分ける。目標active。

## 最新：第四脳室16点を開発統合、全体テスト再実行中

製品labelはd4295e7cc00edd3639b631473445d5db1bb25f9fbe18c5c7f21ff8b8471d7152、raw b17bcfbcad38430f33d3bb6973d6ea847295e37670a4f04710d78a2986546142、26=8536へ更新済み。install_fourth_ventricle_paired_repair.pyは固定stage/mesh reportと逆変換を検査して7ファイルを統合。全55部品で第四脳室のみ2粗格子点変更、旧mesh完全再現、新mesh e821185c…/1220頂点2436面。採用記録fourth-ventricle-paired-adoption-2026-09-07.json、旧volume/mesh fixture保存。下流SHA13箇所同期、新視覚路/乳頭体auditは末尾2026-09-07-fourth-paired.json。歴史的third-core reportは保存。

focused24/24とtsc-b成功（session42743終了）。全体v1は533中530成功、3失敗は旧26=8520と旧mesh固定期待値。分類変更47点保持検証は残し、旧mesh fixtureも検証したうえ現行8536/e821へ同期。**全体v2はsession35216で実行中**、ログwork/fourth-paired-full-node-v2.log。再起動せず同handleをpollする。v1ログも保持。次は全体結果確認→通常Vite build --configLoader runner→check_third_ventricle_core_browser.mjs --fourth-paired（4345、出力fourth-paired-browser-v1）→全5PNG目視。ブラウザscriptは追加済みだが未実行、buildも今回未実行。公開/main変更なし。README JP/ENと由来/データ/残作業表同期。目標active。

## 最新：第四脳室の左右16点修復をステージ

paired-holes native全6PNG18面を目視。X187–188/203–204 × Y181–182 × Z71–72（左右各8）を他92候補から分離し、stage_fourth_ventricle_paired_repair.pyでwork-only差分を作成。fourth-ventricle-paired-stage-v1にbase/labels/repair保存。候補圧縮d4295e7cc00edd3639b631473445d5db1bb25f9fbe18c5c7f21ff8b8471d7152、raw b17bcfbcad38430f33d3bb6973d6ea847295e37670a4f04710d78a2986546142。対象unit3/3、実volume16点差分/逆変換成功。製品9bc51ab0…は不変、未統合。次はmesh影響と下流SHA整合性を確認して統合。Y183以降の広い輪郭不足は別途残る。詳しくはFOURTH_VENTRICLE_REPAIR先頭。全jobs終了、main/公開なし、目標active。

## 最新：第四脳室108点の全差分と登録300重ね合わせを確認

fourth-ventricle-wall-extended-difference-v1全19PNG57面を目視完了。review_fourth_ventricle_tail_native.py --candidate-overlay追加、fourth-ventricle-wall-extended-native-v1全8PNG24面も個別目視済み。候補71517238…は未採用のまま。左右小穴と小脳側開放縁を区別する必要があり、一括適用しない。次はY303–304登録300で見える左右小穴の局所連続性を候補座標に対応させ、修復集合を分離する。詳細FOURTH_VENTRICLE_REPAIR先頭。製品9bc51ab0…、26=8520不変。脳弓の独立分節も未完了項目のまま保持。main/公開変更なし。

## 最新：第四脳室5点全差分確認、108点比較候補を生成

review_third_ventricle_central_difference.pyに--fourth-wall追加（他旧分岐の入力固定維持）。fourth-ventricle-wall-difference-v1の全5PNG13面X194–199/Y176–178/Z74–77を個別目視済み。5点は小脳側くぼみの縁で、主腔側壁全体の不足を埋めるものではない。近接灰色組織を全穴埋めしない。

prepare_fourth_ventricle_wall_candidate.py --extendedで同じ判定をXYZ[179,170,70]–[212,182,86]へ広げ、627検討/108選択。fourth-ventricle-wall-extended-candidate-v1/candidate.json、SHA7151723811e2d39e7b6b2ccb2c053c5edbfa814aa5956574a2bdcdb4b4a71e9f。**108点版は差分未生成/未目視/未採用**。次はこの固定JSONの全直交差分を生成して確認する。5点旧図は再閲覧不要。全jobs終了、製品9bc51ab0…不変、main公開なし、goal active。

## 最新：第四脳室主腔の連続24面確認、初期5点候補は未採用

wall-seriesモード追加、fourth-ventricle-wall-series-v1全8PNG24面を個別目視完了。native Y294–305/Z125–136、前回との重複Y299–301を除く新規21面。主腔壁際と小さい未ラベル領域を確認。prepare_fourth_ventricle_wall_candidate.pyで1層6近傍・既存0・有限300支持>=65000の初期候補生成。82検討点のうち5点、すべてY177探索端。candidate SHA3e94ebf6534e83ca1231169d1ac2880f1f46e5db226a13176f2364bf9046ebda、fourth-ventricle-wall-candidate-v1。未差分確認、未採用。5点修正で広い不足解消とは扱わない。

次：5点が接するY177端の前後連続と、壁際の部分体積/既存mask制約を点検して候補範囲を見直す。閾値だけ緩めない、探索端を解剖境界にしない。製品9bc51ab0…/26=8520不変、全jobs終了。UI小数表示も残件。main公開なし、全体active。

## 最新：第四脳室の主腔・尾側24面を原300で点検

第三脳室統合検証後、UI小数修正より解剖学的残件を優先。review_fourth_ventricle_tail_native.py追加、fourth-ventricle-tail-native-v1全8PNG24面を生成・すべて個別目視。native X323–331、Y283–285/299–301、Z89–91/99–101/109–111。主腔尾側は周囲空隙へ開放し、この画像だけで下端膜/出口境界は確定できない。app Z54の未ラベル空白全体へ拡張しない。Y180近傍の主腔壁内側にはラベル不足が見える。

次：第四脳室主腔の壁際を、尾側開放域とは分けて連続冠状断・水平断で限定・候補化。生成24面を全域確認とは扱わない。26=8520/41=16は不変、製品9bc51ab0…不変。脚/出口/全中脳水道等は未完了。全jobs終了、公開なし、goal active。第三脳室全531テスト成功・5画面確認の成果は維持。

## 最新：第三脳室修復の統合検証完了、次の修正へ

全suite v2 session42280は531/531成功exit0、162633ms。normal build成功（445ms、work/third-core-normal-build-v1.log）。型検査も前工程成功。scripts/check_third_ventricle_core_browser.mjs追加、work/anatomy-review/third-core-browser-v1に5画面保存、すべて表示目視済み：水平Z153/冠状Y240/矢状X196 1366×900、水平390×844 mobile:false、block/diencephalon第三脳室単独。新raw f5d552ac…とmesh47c1ec43…実取得一致。browser script exit0、全jobs終了。4345は新normaldistを配信中。旧review/annotation59161は操作していない。

次の実装候補：観察リンクが正確なslice位置を小数で保持するため、page.tsxの位置表示・3D右上・timeline outputに長い小数が露出している。**表示だけ丸め、状態/URL/断面インデックス精度は維持**する。次いで脳室残部・脳弓/視放線等の未分節へ続行。第三脳室中央補完は完了したが全脳室完了ではなく、全体goal active。main/公開なし。

最終実行状態：rendered-html限定session55968は78/78成功・exit0。修正後全suiteは **session42280、work/third-core-full-node-v2.log** へ開始済み。同sessionをpollし、未完中は再起動しない。終了後normal build→実ブラウザが次。下記v1失敗は保持済み。

## 検証追補：全531件中528成功、旧監査記録参照3件を修正

全suite session97630はexit1で終了、531件/528pass/3fail。失敗はoptic2件とmammillary1件が旧777b監査recordを比較していたことによる。両監査を現9bc51ab0から再生成し、旧recordは保存、新しい `*-orthogonal-objective-audit-2026-09-07-third-core.json` を作成。tests/optic-orthogonal-audit.test.mjs と rendered-html の参照を新recordへ更新。optic対象5/5再通過。

現在 **rendered-html限定再実行session55968、work/third-core-rendered-tests-v1.log**。同sessionをpollする。これの成功を確認して全suiteを別v2ログへ再実行し、正常dist build→ブラウザへ進める。旧full v1は失敗記録のまま保持。型検査/関連採用12件は成功済み。全体完了ではない。

## 最新：第三脳室1587点を開発採用・全テスト実行中

installerと採用record/変更前label・mesh fixtureを追加、製品データ適用済み。新label SHA9bc51ab0b0f6932871a93a0d225491ed0649ef827012a7db41d3f3e049b166a8、raw f5d552ac7856dfb5bb555e289f16c5d1f0dfa918107af2b567491202dba54fbe。25=12007、他label不変。第三脳室mesh47c1ec43…2210v4344fも同期。metadata/manifest/revision/現行SHA依存13ファイル同期。旧小脳1105のテスト終点はpre-third-core-777b fixtureに変更。新adoption tests2本を追加。

関連12/12・tsc -b成功。**全Node suite session97630、work/third-core-full-node-v1.logへ実行開始。再起動せず同sessionをpollする**。終了後に正常dist buildを行い（テストがPages distを作る場合がある）、第三脳室の断面とblockの実ブラウザ検証へ。4345プレビューはまだ新build未確認。既存work/check-cerebellar-support-browser.mjsのv8出力を上書きしない。README日英・由来・権利・脳室監査更新済み。公開なし、全体active。

## 最新：第三脳室mesh影響179点、旧同期漏れ1点の原因確定

今回進捗：prepare_third_ventricle_core_meshes.py追加。全55 mask比較でdiencephalon/third-ventricleのみ179粗格子点変化。他54不変。work/anatomy-review/third-ventricle-core-meshes-v1にinstalled/reproduced-before/new meshとreport保存。新mesh47c1ec43e59f7303954a510d111d9cc19a62adc5338deb9d9716a6e079e87f1a、2210頂点4344面。初回非再現で停止、2回目は不一致を記録してwork出力だけ生成（不一致を合格にしていない）。

diagnose_third_ventricle_mesh_baseline.pyで原因確定：旧commit a6b2809befd895253af2db2d4efc181f8d9a3f0a のラベルから現mesh5e0b4a740d3a732b1697349d864041bbec14ed25028659325c20380ff08b58d5を完全再現。現ラベルとの差は粗ZYX[70,127,99]1点=XYZ[198,254,140]。flat25804834は8月33点補完patchの25へのrunと一致。独立mesh編集ではなく過去のラベル修正同期漏れ。診断third-ventricle-mesh-baseline-v1.json保存。全jobs exit0、初回失敗は既知・解決方向確定。

次はこの旧baselineを明示したinstaller/採用record/fixtureを作り、今回1587 label点と3Dの旧同期漏れ1＋新179粗格子点を統合。metadata/revision/固定SHA依存/test/build/browserはまだこれから。製品777b7692…不変、main公開なし、goal active。

## 最新：第三脳室中央1587点の可逆修復stage完成（製品未適用）

前工程/今回とも進捗。原300の端部候補overlay全4PNG12面を目視完了（直前と同じ面、重複を新規面数としない）。core-edge-overlay-v1 report SHA9f80e7eedc28bac4e5c93bc85a43eadd1dd2321d538a5b84681919aabb495ef3。全83面difference report SHA28674c8783f73df1b9ede7f596d3377c494f6c240bcdb9a51d1c5a0a99aa27aa。候補は組織ではなく空隙内、Z135は腔の終端とは解釈しない。

新script stage_third_ventricle_core_repair.py でwork/anatomy-review/third-ventricle-core-stage-v1にbase.bin.gz/labels.bin.gz/repair.json生成済み。0→25のみ1587点、全volume逆適用一致、限定テスト2/2成功。stage compressed9bc51ab0b0f6932871a93a0d225491ed0649ef827012a7db41d3f3e049b166a8、raw f5d552ac7856dfb5bb555e289f16c5d1f0dfa918107af2b567491202dba54fbe。製品777b7692…不変。stage再生成は既存拒否、上書きしない。

次：block mask/mesh影響を調べ、採用record/fixtureとinstaller、metadata/revision/固定SHA依存を統合して検証。まだ製品・ブラウザへ反映したと報告しない。全体active、main/公開なし。

## 最新：中央1587点の全83面確認・原300端部12面確認

前回ユーザーへの脳弓回答は状態説明のみ（no progress）。今回はcentral-core-difference-v1の残z-04〜10を個別表示し、先行63面と合わせ全29PNG83面の目視を完了。Z146–164で中央空隙の連続補完を確認。core-edgeモードを原300レビューscriptへ追加、third-ventricle-core-edge-native-v1の4PNG12面（X319–321、333–335、Z224–226、273–275）を生成・全目視。下端の腔は続き、Z135は解剖学的終端ではない。左右端/上端に残す組織あり。

原300端部図は現行ラベル投影のみで候補overlayなし。次はこの端部に固定1587点候補を投影して対応を明示し、可逆patch採用・統合検証へ進める。全83面を再度一から閲覧しない。候補/製品777b7692…は不変、公開なし。脳弓・視放線・他の脳室を含む全体目標は未完了でactive。

## 最新：support全106面確認完了、中央1587点を別候補へ抽出

今回support-difference-v1の残34PNG全100面を表示確認し、前回x-02/z-06の6面と合わせ全36PNG106面目視完了。X189–203/Y214–271/Z134–166。中央は空隙内連続を改善する一方、Y215–218やZ161–165の周辺追加はROI端に沿う四角い形状。2072全採用はしない。

prepare_third_ventricle_support_candidate.pyに--central-core追加、原画像で確認したseed[196,240,153]を含む6近傍成分を抽出。最大成分自動採用ではない。1587点（旧1224のうち1200＋新387）、bbox[192,223,135]–[200,260,164]、他485点を候補から外す。core candidate SHA cf3ccf9f1415bf798fe659f353c0b646f42ce022db73a413606ff49f17a6f1fd。seed/missing/diagonal含むPython6/6成功。

renderer --central-coreでthird-ventricle-central-core-difference-v1全83面29PNG生成exit0。**まだこの29PNGは未閲覧**。次は全差分を確認して、Z135の探索箱接触部や上方組織近傍で必要な原300照合を行い、可逆patch採用工程へ進める。中央修復は第三脳室全境界/他脳室/脳弓完成ではない。旧候補はすべて保存、製品777b7692…不変、main公開なし、全体active。前工程・今回とも具体的進捗。

## 最新：第三脳室support候補2072点生成・代表6面確認、未採用

前工程は進捗。prepare_third_ventricle_support_candidate.py追加：旧1224の固定JSONの原300支持測定を再利用し、Y挟み込みを必須条件から外したwork-only別候補2072点（追加848）。既存構造上書き禁止・支持65000以上・既知別ラベル介在拒否を維持。focused Python4/4成功。candidate SHA60b8910bdb0d0cf94e704192fee98b9437d0f8e5003677b55f0aa4ce7121cde9。元JSONは不変。

review_third_ventricle_central_difference.py --supportを追加、third-ventricle-support-difference-v1全106面36PNG生成exit0、bbox[190,215,135]–[202,270,165]。x-02（X195–197）とz-06（Z152–154）のみ目視済み。中央欠落とZ152/153断絶は改善するが、ROI端の別空隙まで小候補が出るため2072全点は採用しない。候補単独の6近傍は31成分、中央成分5は1587点bbox[192,223,135]–[200,260,164]、他485点。最大成分だから解剖学的に正しいとは判定しない。次は中央成分を原画像の壁/上方組織と対応づけ、別空隙の321点（[190,215,151]–[202,223,165]）等を分離して評価。未閲覧の34PNGを閲覧済みとしない。製品777b7692…不変、main公開なし、全体active。

## 最新：第三脳室1224点候補の全82面レビュー完了・抽出条件の途切れを特定

expanded-difference-v1のy-00..12全38面、z-00..10全33面をすべて表示目視済み。前回X11面と合わせ全82面28PNG完了。Y231–249の孤立点/細帯、Z153–158の候補消失を確認。X196/Y240の原300最小支持値65535が続くのに、既存25のY方向挟み込みだけがZ153–158/161–163でfalseになる。1224点を完成修復として採用しない。候補箱端3点、8958支持値不足/848挟み込みなし/30別ラベル/1224選択。

native300 scriptに--expanded-checks追加しthird-ventricle-expanded-native-checks-v1へ10PNG30表示面を生成exit0、全10PNG目視完了。重複Z254/255を除き28面、X9面は既確認範囲も含む。中央空隙の連続と上方灰色組織を確認。次は既存Y挟み込みに依存しない、画像の壁と上方組織除外に基づく別候補を作る。全白領域補完は禁止、1224旧成果物を上書きしない。SEPTEMBER_VENTRICLE_REVIEWに詳細追記。製品777b7692…不変、main/公開なし、全体active。前ターンは状態照会のみで新規解剖進捗なし、今回は71差分面確認・抽出欠陥特定・原300追加照合という具体的進捗。

## 最新：22点は不足解消として不十分、拡大1224点候補を評価中

central-difference-v1の全7PNG18面を個別目視。22点は小さな段差を埋めるだけで中央欠落をほとんど解消しないため、単独採用しない。元候補・証拠は保存。

prepare_third_ventricle_central_candidate.pyに--expandedを追加、探索箱[190,215,135]–[202,270,165]内未ラベル11060点から、同じ原300支持格子・既存25の前後挟み込み・途中別ラベルなしで1224点をwork-only保存。全拡大範囲の原画像レビュー済みとは扱わない。candidate SHA80a54c322225cf60592a1419073264e35d3d346d1c58c47d28084f036eeab84a。selectedOnBoxBoundaryも記録し、箱切断は解剖境界ではない。

review_third_ventricle_central_difference.py --expandedでthird-ventricle-expanded-difference-v1に全82面28PNG生成exit0。点bbox[192,227,135]–[200,262,165]。x-00..03全4PNG（X191–201全11面）を個別目視：中央空隙への拡大は前進するがX196の水平帯・X198の突出など閾値/候補箱由来の形状があり、未採用。次はy-00..12（Y226–263全38面）、z-00..10（Z134–166全33面）の残24PNG71面。必要箇所は300µmで追加照合し、島/箱端/直線的境界をそのまま採用しない。全volumeへの変化数確認は1224点で既存ラベル上書きなし。製品777b7692…不変、main/公開なし、全体active。

## 最新：第三脳室22点の差分図生成済み・未閲覧、脳弓追加指示

readonly scripts/review_third_ventricle_central_difference.pyを追加、候補SHA54499864775c71dd9242deb0c7c2f11947c6b8129bf2998adafe4f3a85d7e07cと現行777b7692…を固定。22点のみ0→25をメモリで適用検証し、third-ventricle-central-difference-v1に全影響直交＋前後の18面7PNGを生成、exit0。点bbox[194,233,143]–[198,235,146]。次はx-00/01/02、y-00/01、z-00/01の全7PNGを目視（まだ未閲覧）、箱端・保持2点・周囲へのつながりを確認。製品不変。

ユーザーが「脳弓とかもないか」と追加。コードapp/page.tsxとLECTURE_COVERAGE_AUDITを照合し、模式3Dはあるが独立分節は未実装と確認。ANATOMY_REMAINING_WORKへ脳弓体・脚・柱と脳梁/透明中隔との分離を追加。脳室系と関連付けて調べる。main/公開なし、全体active。

## 最新：第三脳室中央45連続面目視、22点のwork-only候補（2026-09-07）

review_third_ventricle_native300.pyに--central-seriesを追加、別フォルダthird-ventricle-central-series-v1へ15PNG45面生成exit0、全15枚個別目視。native X323–331全9、Y373–393全21、Z232–246全15。Y385以降とZ238以降でラベルの中央欠落が続くが、原画像中央腔は連続。X方向では上方組織と未収載空隙が混在し、屋根・外部空間まで一括追加しない。

新readonly prepare_third_ventricle_central_candidate.pyでapp[194,224,140]–[198,235,146]内の未ラベル24点を調査。既存25によるY方向挟み込み・途中別ラベルなし・原300全支持格子>=65000で22点をwork候補へ選択、2点は選択せず。work/anatomy-review/third-ventricle-central-candidate-v1/candidate.json、exit0。これは中央の限定候補で、全脳室不足を22点で解決する意味ではない。ラベル本体・meshは不変、まだ差分画像未生成/未レビュー。次は22点の全影響断面を原画像+前後差分で確認し、候補箱端と周囲の保持を点検する。必要なら有限の確認範囲を拡張するが全空隙flood-fillはしない。全体active/main公開なし。

## 最新：第三脳室の300µm初回18面を目視、中央不足を確認（2026-09-07）

前工程は進捗あり。新readonly scripts/review_third_ventricle_native300.pyで現行777b7692…固定、app箱[180,195,125]–[212,285,180]を300µm原画像へ対応し、6PNG18面生成exit0。`work/anatomy-review/third-ventricle-native300-v1`全6PNGを目視済み、再生成不要。native X324–326/328–330,Y383–385/439–441,Z236–238/258–260。Y385/Z238の中央でラベルが途切れる一方、原画像の正中空隙が続く。Z258–260は片端しか収載されていない。上方には組織もあり全空隙補完は不可。SEPTEMBER_VENTRICLE_REVIEWに所見を追記。

次は中央くびれのapp Y230/Z142周辺の連続断を範囲で確認し、壁・上方組織・下方外部空間を避けた補完候補を限定する。まだ脳室patchなし。現行小脳統合済み777b7692…不変。main/公開なし、全体active、59161保持。新スクリプトは実生成成功、既存全テスト529は直前小脳統合時の結果で今回新コード全検証とは区別する。

## 最新：1105統合確認完了、脳室系・未分節構造へ（2026-09-07）

session82730はexit0終了、全Node529/529、149822.7962ms。通常buildを復元し成功（work/cerebellar-1105-normal-build.log）。型検査成功。work/check-cerebellar-support-browser.mjsを現行777b7692…/rawd5c4f536…/新v8保存先へ更新して実行、4/4成功。水平/冠状/矢状1366×900と水平390×844の4PNGを全個別目視。v8は完成済みで再実行しない。直接配信でoverrideなし。CEREBELLUM_MASK_SCOPE_REVIEW・DATA_AND_LICENSES・STRUCTURE_PROVENANCEの1105追補も同期した。

ユーザー追加指示：脳室系の改善、視放線など未同定構造。ANATOMY_REMAINING_WORKに記録。SEPTEMBER_VENTRICLE_REVIEW/FOURTH_VENTRICLE_REPAIR全文を再読済み。次は第三脳室中央/上縁、第四脳室尾側不足や中脳水道全長を現行原画像で再検討する。過去193穴候補の一括補完は不採用、同じ代表画像を再度確認しただけで新規修正としない。視放線はapp/page.tsx radiationsのoptic-radiation層とvisual経路に既存の模式表示があるため、未収載ではなく実画像分節未完了。放線冠/聴放線も同様。新規分節の根拠はまだ未調査。全体active、main/公開なし、59161保持。

## 最新：1105開発採用・全テスト実行中、次は脳室系を重点確認（2026-09-07）

1105の21290点（28→0:55、29→0:21235）を採用し18701点保持。製品compressed 777b76921f99e22232dfedd58a165c17544a200101d9a403adc9f16d054d89ea、raw d5c4f53642998009b73841a13568045f1f52c449547c71d6ffbed015a7313fa4。28=735945、29=725004。record/修正前fixture/meta保存、7段chain回帰10/10成功。npxはPATH不在のため型検査をnode node_modules/typescript/bin/tsc -bで実行し成功。全Nodeはsession82730で開始、ログwork/cerebellar-1105-full-node-v1.log。再起動しない。

現行SHA依存・新optic/MB客観監査・README日英・残存作業表を同期済み。CEREBELLUM_MASK_SCOPE_REVIEW/STRUCTURE_PROVENANCE/DATA_AND_LICENSESの1105追補、全テスト結果確認、通常build、v8実ブラウザ確認は残る。browser helperはまだv7旧版であり、変更して新v8ファイルへ保存してから使う。ユーザーが脳室系にも改善必要と指摘したため、この統合検証後は側脳室・第三脳室・中脳水道・第四脳室の連続性・塗り残し・はみ出しを優先する。位置は未特定のため特定箇所の誤りを断定しない。59161保持、main/公開なし。

## 最新：1105 native全54面目視・採用preflight成功、未導入（2026-09-07）

前工程は進捗あり。native-v1全18PNG54面を個別目視完了。Z18の小信号周辺は保持、Z63では葉先と小組織を囲む空隙側を除去、Z78/98は外縁の張り出し削減、X310/Y207では組織消失側の余分なラベルを削減。残存赤輪郭すべてが正しいという判断ではない。diff全104面・元500全364面・初期native9面と合わせ、21290点の限定差分を開発採用工程へ進める判断。

installerに1105固定設定と追加native report/18画像のSHA照合を追加。`plan(1105)`が全4成果物の全volume再生・55mask・証拠検証成功、まだ書込みなし。diff SHA a1bf732509730e93fb9aff4cdf390b852e7332d4c35c34f96dce7c29a0379e2a、native SHA 6bf64dd26589f3407e304b3f4742b51408587ac9333af74d597e1b3f363b99ee。変更script diff-check成功。次は採用実行とchain回帰テスト・現行SHA依存・README等の同期、統合検証。製品212df1a6…のまま。ユーザーが現状閲覧を希望したため4345の採用済み開発版を案内。59161は保持、main/公開なし。

## 最新：1105差分全104面目視完了、局所native図生成済み（2026-09-07）

`cerebellar-support-1105-difference-v1` の00–34全35PNG・104比較を個別表示して目視完了。外縁と葉間空隙の張り出しを減らし、薄い組織を保持する候補。ただしZ18の小信号、Z61–65の葉先、Z76–80の葉間、Z97–98の縮小端は300µm局所比較を追加してから採用判断する。X312/Y81の空隙側除去は確認。全体の小脳境界承認ではない。

読み取り専用 `scripts/review_cerebellar_1105_native.py` を追加し、固定base/candidate SHA・21290点28/29→0を検証した上で `work/anatomy-review/cerebellar-support-1105-native-v1` へ18PNG54面を生成、exit0。Z18/63/78/98、X310、Y207上の変更点から局所中心を決め、各中心のnative三方向各3面で原画像/修正前+黄色差分/候補を表示する。まだこの18PNGは未閲覧。次はz18-x/y/z.pngから全18PNGを目視し、必要なら中心を追加する。生成を閲覧済みと扱わない。製品212df1a6…のまま、1105未採用、main/公開変更なし。

ユーザーから全体進捗の質問が入り、採用済み・確認のみ・未解決を区別して報告する段階。目標はactiveのまま。59161の記入図は保持。

## 最新：1105の作業用差分生成、未採用（2026-09-07）

finite-1105-v1の3PNG全9面を表示確認（native X408–410、Y240–242、Z90–92）。外周の組織信号を越えるラベルとくぼみへの張り出しが見える一方、薄い葉・白質は存在する。中央9面だけで全境界の確定とはしない。finite report SHA `eec46be33247d158332d2d8ecb9b57fa144aa28c0e7e8a99071f0059b1ac433c`。

固定SHA/点数の1105設定をstage/reviewへ追加。`work/anatomy-review/cerebellar-support-1105-stage-v1` に21290点のみ28/29→0の可逆候補を生成、全volume逆適用一致、18701点保持、偶数格子2142点。候補SHA `777b76921f99e22232dfedd58a165c17544a200101d9a403adc9f16d054d89ea`。製品は212df1a6…のまま。

`cerebellar-support-1105-difference-v1` の全104比較35PNG生成完了。session22964はexit0、全55block mask変更0、再実行不要。00–02 PNGのZ6–14全9面を表示確認：組織出現前の空隙ラベルを除き、Z11–14の小組織信号は保持。次は03.pngから34.pngの残95面を比較し、必要な300µm局所図を追加して採用可否判断。まだ採用installerも製品変更もなし。finiteテスト4/4、変更script diff-check成功。前工程は具体的進捗、全体active/main公開なし。

## 最新：1105の全364面確認、300µm数値候補を生成（2026-09-07）

前工程は進捗あり。今回43–90の48PNG192面をすべて表示確認し、outer-1105-v1の全91PNG364面（X178–313、Y80–209、Z6–103）の500µm比較を完了。Y116–163では外周と外側葉間のくぼみ、Y180–199では縮小する薄い葉先の周辺、Y202–208では組織信号が消えた後にも候補が残る。Z7–10と17–18は明瞭な組織信号より先にラベルが現れ、以降は組織外周・葉間空隙に連続。Z45–56と61–71には小さい葉先近傍もあり全成分削除不可。Z88–102は正中に近い端と外縁に候補が残る。赤の全ラベルと水色の1105だけを混同しない。

finite scriptに現行SHA212df1a6…・1105=39991・bbox[179,81,7]–[312,208,102]固定設定を追加。最初の実行は図の4mm余白だけが原画像範囲を越えて終了（成果物作成前）。計算対象の原画像範囲検証は保持し、表示余白のみclip、requested/actual cropとclip有無を記録する修正後にexit0。`work/anatomy-review/cerebellar-finite-1105-v1/report.json` と3PNGを生成済み、再実行不要。125標本条件24785、全支持格子条件21290、18701点保持、最小値166.0524139404297。数値候補は解剖承認ではない。

次はfinite-1105-v1の高解像度PNGを実際に目視する（まだ未閲覧）。広い成分なので必要な拡大・複数位置の原画像図を追加し、差分候補を評価する。stage/採用は未実施、製品不変。支持格子と表示余白clipの単体テスト4/4成功。全体active、main・公開変更なし。下記の確認途中記述は履歴。

## 最新：1105のX全断面とY80–115を確認（2026-09-07）

ユーザーは視床の濃淡・視床下部との区別についての発言を疑問の補足と説明し、目標の再開を指示。境界の誤りの断定でも承認でもない。59161の記入済み判断を保存し、目標はactiveのまま継続する。

`work/anatomy-review/cerebellar-outer-1105-v1` のPNG00–42を個別に表示確認済み。X178–313全136面とY80–115の36面、計172/364面。次は43.png（Y116–119）、未確認は43–90の48PNG192面。生成済み画像を再生成しない。

X方向では外縁の張り出しと葉間のくぼみに候補が連続するが、薄い葉先に近接する部分もある。Y81/82では明瞭な組織信号より手前にラベルが残り、Y83以降は小さな組織断面を囲む。Y84–103は主に外周、Y104–115では外側の葉間空隙と正中近傍にも候補が見える。これは500µm画像での候補確認であり、白い領域全体の除去や全39,991点の採用を認めるものではない。300µm支持・差分作成・採用は未実施。製品SHA212df1a6…不変。main・公開サイト変更なし。

## 最新：843の統合検証完了、外縁1105へ継続

全Node528/528成功（work/cerebellar-843-full-node-v1.log、187644.8663ms、session21805終了済）。型検査・通常Vite build成功（work/cerebellar-843-normal-build.log）。installer plan843の全4成果物byte一致を読み取り専用で再確認。4345で現行212df1a6…/raw ee92fa63…を直接配信、PC三方向1366×900と390×844水平断の4条件で正常。work/cerebellar-support-browser-v7.jsonと4PNGを全個別目視済み。位置66/30/50は百分率。390は幅確認（mobile:false）、物理端末検証ではない。配信・描画確認は全解剖境界の承認を意味しない。

現行再集計 work/anatomy-review/cerebellar-after-843-inventory-v1 の4代表PNG12面を全個別目視。残存の大成分1105=39991点 bbox[179,81,7]–[312,208,102]、1=39778点 bbox[79,81,7]–[194,208,110]は外縁の薄い組織・空隙に沿っており一括削除不可。843の保持点は複数成分へ分かれ、現843=2876点であり3914保持との矛盾ではない。1580=500点も代表3面のみで未確定。

次の1105全連続直交画像を work/anatomy-review/cerebellar-outer-1105-v1 へ生成完了、session68175はexit0終了済。全364面91PNG（X178–313:136面、Y80–209:130面、Z6–103:98面）。00/01の2PNG・X178–185の8面を個別目視し、候補の内側端が葉間の狭い空隙に続くことを確認。次は02.pngから90.pngまで残356面。300µm支持・新たな採用は未実施。図再生成不要、ログwork/cerebellar-outer-1105-v1.log。全体active/main公開なし。

## 最新：843を開発採用、統合検証中（2026-09-07）

3353点を開発採用済み。現在compressed SHA `212df1a6130977c23eb4561a5f883a2bd7efecba5f2b870cc1bbc5eae1b80b3b`、raw `ee92fa6340e1746da7f9697e9cf3b187d9a547c91099474b401db33db78d908c`、28=736000、29=746239。843の保持3914点、変更28→0:1613/29→0:1740、55block mask不変。採用record `cerebellar-support-843-adoption-2026-09-07.json`、修正前fixture `pre-cerebellar-843-c989`を保存。固定SHA依存・新optic/MB監査・README日英・由来・残存作業表同期済み。関連9/9、型検査成功。全Nodeはsession21805で実行開始、ログwork/cerebellar-843-full-node-v1.log。完了を同じsessionで確認するまで再起動しない。その後通常buildと新v7実ブラウザが必要。以下の未採用記述は履歴。目標active、main/公開なし。

## 最新：843の限定候補3,353点、差分58面の目視完了（2026-09-07）

有限支持 `cerebellar-finite-843-v1` は終了済。125標本条件4222点、全支持格子条件3353点、元7267点から3914点を保持。report SHA `2ba5999fa2ab1448e81d190a58983c2dc1a4bb3ece2117c1a4bd54f60855fb78`。300µm原画像のx/y/z PNGを全3枚9面個別目視（X320–322、Y238–240、Z205–207）。以下の有限支持未実施記述は履歴。

work-only stage `cerebellar-support-843-stage-v1` を生成。候補SHA `212df1a6130977c23eb4561a5f883a2bd7efecba5f2b870cc1bbc5eae1b80b3b`、3353点のみ28/29→0、逆適用一致、偶数格子445点。差分 `cerebellar-support-843-difference-v1` は58面20PNGを全00–19個別目視済み（Z98–149とX163/195/222、Y107/138/178）。report SHA `edc56ccc4998e96de2b4dab8a8da9dc0f5135fca8e4224a73395523e9e217296`。55部品mask変更0。session89441終了済で再生成不要。

所見：Z111–123は小組織周囲の空隙、Z124–138は外縁の張り出し、Z139–148は小組織の周囲を除去し、画像信号のある中央部を保持。X195/Y138でも葉間空隙の除去と薄い組織の保持を確認。全面的な葉間溝分節や小脳脚境界の解決とは扱わない。採用installer・固定SHA依存・回帰テストへの統合はまだ未実施。製品はc9899d58…のまま。次はこの差分を根拠付き開発採用へ統合し、検証する。全体目標active、main/公開不変。ユーザーの視床への疑問は修正指示・境界承認ではなく、59161の記入図は保存継続。

## 最新：843の三方向全189面を目視完了

superior-843-v1の16–47 PNGをこの工程で個別目視し、既読00–15と合わせ全48枚189面（X162–223:62、Y106–180:75、Z98–149:52）完了。葉間空隙・正中の小組織周囲・上端への過剰領域を確認。小組織や薄い葉先もあるため7267点全除外は不可。次は現行c9899d58…、843=7267、bbox[163,107,99]–[222,179,148]を固定して300um有限支持を追加評価し、局所差分候補を限定する。有限支持は未実施、図再生成不要。製品不変、全体active/main公開なし。

## 現在：大きな小脳上部候補843の連続断レビュー中

製品c9899d58…でcomponent843=7267点、XYZ[163,107,99]–[222,179,148]を再確認。work/anatomy-review/cerebellar-superior-843-v1へ全189面48PNG生成完了（終了済、再生成不要）。この工程で00–15の16PNGを個別目視済み：X162–223全62面＋Y106/107。正中付近の葉間空隙をまたぐラベル、外側の薄い葉先との近接が混在。全7267点削除は認めない。次は16.pngから順に47.pngまで残125面を目視し、その後300um有限支持の対象判断。まだfinite/stage/採用なし、製品不変。全体active/main公開なし。

## 最新：1603統合検証完了

全Node527/527成功（work/cerebellar-1603-full-node-v1.log、153687ms、session6337終了済）。通常build成功（work/cerebellar-1603-normal-build.log）、型検査は前工程で成功。installer plan1603全4成果物byte一致を読み取り専用再確認。4345で現行c9899d58…/raw354fd83c…配信、PC三方向＋390水平4条件正常、v6 PNG4枚全個別目視。work/cerebellar-support-browser-v6.json。位置91/32/50は百分率。小画面は縦スクロール。これは配信・描画確認で全解剖境界の承認ではない。次は残る大きな小脳外縁・脳幹不足・根出口の未解決項目へ。全体active、main/公開不変。以下の実行中記述は履歴。

## 現在：小脳1603を開発採用、全テスト実行中

製品c9899d58afb39c1eb4b9873b0a39ecb5e44c7e0de895874a2284cfa8bd627f56、raw354fd83c865cd4ea3c2f078d326a56abad9cc3f16e3f6bbb618955ced5db9d8d。左28=737613、右29=747979。229点29→0、425保持、record/fixture/metadata保持。関連8/8、tsc成功。現行hash依存と新optic/MB監査、README日英・由来・権利・残存台帳同期。全Nodeはsession6337で実行中、work/cerebellar-1603-full-node-v1.log。再起動せず同sessionを確認する。終了後、通常build→work/check-cerebellar-support-browser.mjs（v6、現行raw対応済み）→4PNG個別目視。v6未実行。以下の採用前記述は履歴。全体active/main公開なし。

## 最新：小脳1603の229点は差分レビュー完了、採用前

stage/difference/installerへ固定1603追加。候補c9899d58afb39c1eb4b9873b0a39ecb5e44c7e0de895874a2284cfa8bd627f56、229点29→0、425保持、even24。stage全volume逆差分一致。difference-v1全13PNG38比較（Z34–65全32、X203/211/215,Y135/140/146）を全個別目視。小組織と隣接葉を保持する空隙側の局所修正として採用へ進む。全55block mask差0、XYZ→ZYX直接照合済。report d93a7c5a9d170177dae5741974f8f695373ed9134932bf8b021337c5e50857db。installer plan(1603)は4成果物preflight成功、書込みなし。guard2/2成功。次は採用実行・独立再生テスト追加・現行hash依存とREADME同期・統合検証。製品09088a9c…は不変。session18605はexit0終了、図再生成不要。全目標active、main/公開なし。

## 次：小脳1603の229点を差分確認へ

現行09088a9c…で再集計、旧1582は1603=654点/XYZ203–218,133–147,35–66。current-triage-v6の4PNG12代表面、fissure-1603-v1の全18PNG69面、finite-1603-v1の全3PNG9面を個別目視済み。125標本307→全corner229点、425保持。固定SHA/count/bbox付きfinite script追加。次は229点work stageと差分図、全55mask影響を確認する。まだstage/採用なし、製品09088a9c…不変。全目標active、main/公開なし。図生成プロセスは終了済み、再生成不要。

## 最新：小脳1393の372点は開発統合・検証完了

現行製品09088a9c…、raw ec5be45b…（以下の採用準備記述は履歴）。全Node526/526成功、型検査、通常build成功。work/cerebellar-1393-full-node-v1.log / cerebellar-1393-normal-build.log。4345のPC三方向＋390px水平断の4条件で新revision/raw配信確認、v5 PNG4枚を個別目視。work/cerebellar-support-browser-v5.json。位置91/32/50は百分率。表示エラーはなく、小画面は縦スクロール構成。これは配信・表示検証で全境界の解剖学的承認ではない。main/公開変更なし、全体目標active。

ユーザーの視床濃淡への発言は疑問の補足であり、誤りの断定でも境界承認でもない。記入済みの線は保存し、視床・視床下部境界の未確定事項を維持して残る監査へ進む。

## 小脳1393：372点の差分確認完了、採用準備へ

stage/reviewへ固定1393追加。候補09088a9cf76b8c0578e96f21b9e35077ef345fd90bebc5294308e1603262bb34、全372点29→0、571保持、even9。全volume逆差分復元。difference-v1全12PNG/34比較全目視（Z22–49,X196/197/202,Y137/150/170）。小組織片・隣接葉を残し内側空隙への張出しを限定除去、開発採用へ進める。全55block mask差0、軸契約直接照合済。report2c79455c…、stageとdifferenceはwork/anatomy-review/cerebellar-support-1393-*。session83595終了済み、再実行不要。次はinstaller/record/独立testと依存同期・全検証。製品190f88dc…のまま、全体active、main/公開なし。

## 次の候補：小脳1393（旧1373）の372点

現行190f88dc…で旧1373位置943点/XYZ190–206,137–170,23–49を照合、番号は1393へ変化。fissure-1393-v1全21PNG/84面を全目視（X189–207,Y136–171,Z22–50）。正中近傍の空隙・下面への張り出しに小組織片が混在。finite scriptへ固定1393追加、finite-1393-v1の300um9面3PNG全目視、125標本488→全corner372点、571保持。report0378ec2a…、supportテスト3/3成功。次は372点work差分＋差分図/全55mask影響、stage/採用はまだ。すべてwork/anatomy-review内。生成プロセス終了済み、図再生成不要。製品190f88dc…不変、全体active、main/公開なし。

## 最新：小脳997の259点統合検証まで完了

全Node525/525成功（work/cerebellar-997-full-node-v1.log、158794ms、session24173終了済み）、tsc成功、通常build成功（work/cerebellar-997-normal-build.log）。4345でPC三断面＋390水平の4条件、配信raw1865ecff…確認、v4 PNG4枚全個別目視。loader/UIerror/横overflow/WebGLfallbackなし。work/cerebellar-support-browser-v4.json。位置は百分率89/30/47。997の統合待ちは解消、次は残る小脳外縁・脳幹不足・神経根等の未解決監査へ。全体active、main/公開不変。今の製品190f88dc…を起点とし、2fc863ae…を現行と誤認しない。

## 小脳997を開発統合、全テスト確認中

製品190f88dc…、raw1865ecff016976e887b000a0e437e31cdcaae1025962c2edbb900d1335585ace。左28=737613/右29=748580。installer997採用済み、record abede031…とfixturepre-cerebellar-997-2fc8追加、plan4成果物byte一致確認。関連6/6成功、現行hash依存/新optic+MB監査同期、README日英/由来/権利同期。全Nodeはsession24173（work/cerebellar-997-full-node-v1.log）、最後の観測時まだlive。必ず同sessionを確認、再起動しない。通常build/browserはまだ未実行。work/check-cerebellar-support-browser.mjsは新hash/raw/v4排他出力と位置horizontal89/coronal30/sagittal47へ更新済み（positionはvoxel番号でなく百分率）。全Node完了後通常build→4345でv4実行→4PNG目視。過去524は新版本体の全検証結果ではない。全体active/main公開なし。

## 小脳997：259点の差分レビュー完了、次は開発統合

stage/review scriptへ固定997分岐を追加。work/cerebellar-support-997-stage-v1ではなくwork/anatomy-review/cerebellar-support-997-stage-v1。候補190f88dc05345e36b2e556829eb7882b6d01d0a67240b7738c1ab58820cd5548、全259点28→0、748保持、even28。逆差分全volume復元確認。difference-v1全17PNG/50比較を全目視（Z26–69全44面＋X175/184/194,Y135/141/162）。薄い葉・中央組織を残す局所外縁修正として開発採用へ進める。全55block mask差0、軸契約照合済み。report SHA add17b5b…、CEREBELLUM_MASK_SCOPE_REVIEW末尾参照。session1275終了済み、再実行不要。次はinstaller/record/独立testとhash依存同期・統合検証。現製品は2fc863ae…のまま、全目標active、main/公開なし。

## 次の候補：小脳997の259点（未採用）

現2fc863ae…でcomponent997=1007点/XYZ174–194,135–164,27–71を照合。cerebellar-fissure-997-v1全26PNG/102面を全目視（X173–195,Y134–165,Z26–72）。内側空隙・下面への張り出しと薄い葉近傍が混在。finite scriptに固定997条件を追加、cerebellar-finite-997-v1生成完了（process terminal）：125標本402点→全corner259点、748保持。300um三方向9面3PNG全目視、supportテスト3/3成功。次は259点のみwork差分＋差分図/全55block mask検査、まだstage/採用なし。既存102＋9面を再生成不要。製品2fc863ae…不変、全体active、main/公開変更なし。

## 外部atlasの追加探索を区切り、既存原画像監査へ

Sitek固定commitの再帰tree/histology README/Dia全text/MNIヘッダコードを確認。histologyコードはREADMEのみ、flowchartはmask/transport/transplant/topology warp工程とTODOを含むがwarp実体/番号キーなし。ヘッダコードは0.1mm原点[-38.2284,-54.2106,-56.1836]で取得sformと対応：原点誤設定の疑いを減らすが独自補正の逆変換ではない。AUDITORY_ATLAS_REFERENCE_REVIEW末尾参照。追加閾値・shift・原点手調整で5/6を強制一致しない。外部atlasの採用は保留、次はANATOMY_REMAINING_WORKの既存原画像で進める他境界（例：小脳の未点検外縁）へ戻る。全体active、製品/main/公開不変。

## 外部聴覚路：公開変換仮説の目視完了

compare_auditory_registration.py --published-chainのpublished-chain-v1は生成終了済み。8 PNG/24中央面を全個別目視。ID1–4/7–8は内部帯・外縁の対応改善、5/6は背側隆起と濃染中心に大きなずれが残る。面相関1–4=0.9072–0.9827、7/8=0.8609–0.9766、5/6=0.0282–0.4240。著者補正の逆変換未適用、数値ID名称キー未確定、全領域一括転用は不採用。良好な中央面も境界承認ではない。AUDITORY_ATLAS_REFERENCE_REVIEW末尾参照。次は著者補正変換／範囲と番号キーの所在確認、または別の未解決監査へ。既存図の再生成不要。現製品hash2fc863ae…不変。全体目標active、main/公開変更なし。

ユーザーの視床濃淡に関するコメントは疑問であり、誤り断定・視床下部境界承認ではない。59161の記入内容を保持し、判断不可欠な場合だけ図で一操作を依頼する。

## 外部聴覚路の局所translation実験も未採用

fit_auditory_local_translation.pyで8ROI/0.4mm/±4mm/Powell2開始点/空間checkerboard holdoutを実行完了。translation-v1.jsonとwork/auditory-translation-v1.log。session45153終了済。全8optimizer成功・探索端なし、heldout相関は0.223–0.691に留まり、特に5/6低い。1/3の開始点差0.282/0.102mm。局所別shiftを連続warp/解剖承認としない。ラベル/mesh移動なし。次は公式Xiao変換と著者補正の関係を調べるか別未解決項目へ進み、単純shift再試行を繰り返さない。AUDITORY_ATLAS_REFERENCE_REVIEW末尾に表。新規相関関数の異常入力guard/test追加。全体active、main/公開なし。

## 外部聴覚路の同座標転用は不採用と確定

compare_auditory_registration.pyでSitek100と現公式Xiao300を同じ物理座標で比較し、same-world-v1の24中央面8 PNGを全個別目視。表面突起・小脳位置・深部濃染帯・背側隆起などにずれがあり直接転用を不採用。各面相関0.0825–0.7579は診断値で精度保証ではない。右画像は300umの補間と明示。AUDITORY_ATLAS_REFERENCE_REVIEW末尾参照。新原画像/atlasはworkに揃い、次は位置合わせを独立検証するか、別の自律修正可能項目へ進む。番号key未確認のまま、名称推測や無検証の神経根置換は不可。今回製品変更なし、前回全524は製品不変の履歴として有効。全目標active、main/公開不変。

## 外部聴覚路の対応原画像を確保・目視済み

OSF APIで著者corrected-MNI 100um原画像を発見、work/auditory-atlas-sitek/sub-bigbrain_MNI_100um_bstem_corrected.nii.gz取得成功。SHA756f6bad…はOSF公表hashと一致、282,998,996B。int16＋32768、720×600×840、atlasとのsform完全一致。render_external_auditory_context.pyで数値ID1–8の三方向中央24面8枚を全個別目視。work/verify-auditory-context.pyの独立nibabelで8水平面rawPNG全画素一致・affine一致。context-v1/report.json/pixel-verification.json。正式番号keyは未確認（OSF wiki/atlas一覧に無し）、in-vivo配列や形だけで名称を確定しない。次はこの原画像と現300um原画像の局所対応診断。既存24面の再生成は不要。補正MNI≠現Xiaoの注意を維持。データ再取得不要、アプリ/mesh/volume不変。全体目標active、main/公開なし。

## 新しい調査先：Sitek同一BigBrain聴覚路ラベル

AUDITORY_ATLAS_REFERENCE_REVIEW.mdを追加。Sitek2019原著の該当本文を確認し、同一標本の蝸牛核/SOC/IC/MGBラベルを著者GitHub固定commit2b73fb3e…からwork/auditory-atlas-sitekへ取得。SHA4327588d…、720×600×840 float32 0.1mm。全スライスstream監査で数値ID1–8の点数/bboxをinventory-v1.jsonに保存。名称keyは未確認、in-vivoコード配列をhistology番号表に転用しない。著者corrected-MNIは現Xiao空間と未照合、直接貼付け不可。原著は切断VIII根をhistologyでlabel化しないと明記。次は正規IDキーとcorrected原画像/変換の所在を確認してから局所比較。アプリ/volume/mesh不変、前回524/524とbuild/browserはそのまま。全目標active、main/公開なし。

## 最新：52点も開発統合・全検証完了

小脳component2274の52点を固定installerで開発本体へ採用。現行compressed2fc863aee8009ad9280dd2dd5fd2a9e8fa91de7f84a3ec5f59764317972c4cd9、rawb7cf9ea9fcf0867de9bb25038fb1bbfb4e80e6bfc1141927cb8e7be04164ecff。過去348点のfixture/record/metadataを保持、新しい2274 recordとpre-cerebellar-2274-2943 fixture追加。全Node524/524成功（work/cerebellar-2274-full-node-v1.log、session31962終了済）、Python小脳7＋guard2成功、tsc成功、通常build成功。installer plan(2274)は4成果物byte一致、書込みなしで再確認済。ブラウザ4345新配信rawSHA一致、PC3断面＋390水平の4条件health正常、v3 PNG4枚全個別目視（work/cerebellar-support-browser-v3.json）。README日英/由来/ライセンス同期。52点の統合待ちは解消、次は他の未解決境界・神経配置の調査へ。小脳全域の精密分節完了・専門家承認ではない。main/公開なし、全体目標active。

## 次の統合対象：小脳component2274の52点

現行294379b7…から別成分428点（XYZ251–262/138–160/90–106）を全隣接直交58面15枚で全目視。300 µm原画像9面3枚も全目視し、有限全corner支持で52点まで限定、376点保持。work/anatomy-review/cerebellar-support-2274-stage-v1候補SHA2fc863ae…、可逆差分52、even差14。difference-v1の20比較7枚も全目視、全55Part.mask差0。finite3/3＋input guard2/2成功。本体は294379b7…のまま。次は52点の固定採用record/installer/独立テストと依存監査同期、統合検証。CEREBELLUM_MASK_SCOPE_REVIEW末尾にreport SHAあり。今回4既存scriptに固定component2274分岐/明示SHA読込を追加、歴史default保持。全体目標active、main/公開なし。同図再生成・目視済み図の重複coverage計上はしない。

## 最新チェックポイント：小脳348点の開発統合・画面確認完了

全Node v2は522/523成功、唯一残ったrendered-html:1081の旧SHAを修正後、同ファイル全78/78成功（work/cerebellar-support-rendered-v3.log）。修正後の単一全523/523 runを実施したとは称さない。型検査・通常本番build成功。4345 previewは停止を確認して再起動済み。work/cerebellar-support-browser-v2.jsonの4条件（水平/冠状/矢状1366幅、水平390幅）で現行raw SHAを配信確認、health正常、4PNG全個別目視。v1水平位置25は小脳断面外のため、v2では75へ訂正して小脳断面表示も確認した。ブラウザ確認は描画・配信・レイアウトの検証で、全境界の解剖承認ではない。publicディレクトリ内の開発資産のみ更新、公開サイト/main変更なし。以下の実行中session記述は履歴。次はANATOMY_REMAINING_WORKの未解決境界・神経配置から独立根拠を追加できる対象へ進む。全体目標はactive。

## 現在位置：2026-09-06 側縁・背側466点まで開発版へ統合

全Node v1終了：523件中520成功/3失敗。旧小脳点数（修正済）、神経注意文の「未再現」を受理しない旧regex、rendered-htmlの旧MB監査JSON参照。後者2件も現行意味/新固定監査へ同期し、v2全再実行中session46884、work/cerebellar-support-full-node-v2.log。直近失敗なし、処理生存確認済み。型検査は成功済、installer plan再実行の4成果物byte一致（読み取りのみ）確認。実ブラウザrunner work/check-cerebellar-support-browser.mjs追加済みだが未実行。全Node完了後通常buildを戻して4345で4条件実行・画像目視する。旧session24684は終了済、再pollしない。

統合検証の追補：tsc -b成功。全Node v1/session24684はまだ実行中（直近で生存確認、stdoutはlogへ）。途中で旧cerebellar-islandの「現行点数=過去点数」1件が失敗したため、新採用recordの差分点数を加味する検査へ修正し、現行全voxelから28/29数を独立集計する検査も追加、関連4/4再成功。v1全体結果にはこの後続修正を含めない。次は同session終了を待ち、全結果を確認して必要ならv2全再実行。その後通常buildを戻して実ブラウザ（fullNodeはdistを書き換える）。diff-check成功。build/browser未完了。

最新：小脳348点を開発本体へ導入。compressed294379b7…、rawfbd14d8d…、ID29=748632/28=737872。install_cerebellar_support_repair.py、pre-cerebellar-support-86e3 fixture、固定採用record追加。独立Node新旧採用2/2成功。revision/客観optic・MB監査と現行入力fixture同期。初回focused10中1はapp/opticReviewCandidatesの旧SHAで失敗後修正。全Node実行中session24684、log work/cerebellar-support-full-node-v1.log。次はこのhandle/ログ確認、実際の失敗修正、型検査・通常build（fullNode後）・実ブラウザ。55block mask差0なのでmesh変更なし。README日英/由来/ライセンス同期済み。公開・mainなし。

小脳348点の採用前検証：差分14比較5枚を個別目視（00はv1、残りv2、図SHA全一致）。局所空隙への過剰ラベル除去としてAI画像レビュー上は採用可能。review_cerebellar_support_stage.pyのv1軸順不一致を修正し、v2でZYXを生成器直接読込と照合、全55 Part.mask差0を確認（raw255は既にtissueから除外）。mesh更新は不要。v2 report SHA c919f87a…、軸順2/2・有限支持3/3。次は348点の本体導入installerと固定記録、SHA監査・テスト同期、統合検証・実ブラウザ。本体86e3b22dのまま。全体目標未完了、main/公開なし。

小脳559点の後続：300 µm原画像の三方向隣接9面3枚を全目視。125標本/voxelでは427点が全飽和だが、補間に寄与する全格子cornerで348点まで限定、残る211点を保持。cerebellar-finite-2532-v2/report.json SHA e48c578b…、関数テスト3/3。stage_cerebellar_support_candidate.pyで348点除外のwork候補294379b7…を作成、可逆性/正確な差分確認。even格子62点が変化するので次は差分図と全block mask/mesh影響を確認し、その後統合判断。本体は86e3b22dのまま。候補未採用、公開なし。最初のprocess56870はhandle消失・python不存在・出力不存在を確認後一度再実行し成功。v1/v2の同一図を二重に新規coverage計上しない。

小脳外縁を新規点検：現行86e3b22dでID28/29内raw255を104745点/2805成分抽出（削除候補の自動承認ではない）。最大4成分の代表三方向12面4枚を全目視後、上外側成分2532/559点（XYZ273–292/131–158/91–98）を全隣接直交62面16枚で全目視。上面くぼみを埋める過剰ラベルとして高解像度確認へ進める。次は300 µm画像と有限voxelで薄い葉の巻込みを除外してから差分作成。まだ本体未変更。CEREBELLUM_MASK_SCOPE_REVIEW末尾、work/anatomy-review/cerebellar-bright-v1、cerebellar-fissure-2532-v1参照。全16枚確認済み、同じ図を再生成しない。

後続：視覚路後方の直交15面5枚を全目視（native-optic-posterior-orthogonal-v1）。上位断面で周囲との付着が広がり、完全分離境界は未確定。この局所調査は保留として、同じ図の再作成を避け内包へ進めた。内包旧候補の現存点[155,299,159]/[235,299,159]を300 µm原画像・三方向隣接18面6枚で全目視（capsule-native300-v1）。核縁の細い明暗帯が入り組み、一括削除不採用を維持。新規採用差分なし。両監査文書末尾参照。次は他の未解決項目のうち独立根拠を追加できる対象を選ぶ。未解決境界を正常・完成としない。

視覚路後方追跡を追加：native Y0–84の85連続冠状面22枚を全個別目視し、前回のY85–175と合わせてROI全Yを一巡（Z窓/中央系列X窓は限定、全視覚路完了ではない）。後方で左右候補は薄い斜め帯に変化し、周辺濃染組織との付着・終端は未確定。ROI端Y0を解剖学的終端にしない。直接MINC YZXから全85panel画素一致を独立確認。OPTIC_CURRENT_CONTINUITY_REVIEW末尾、native-optic-posterior-continuity-v1参照。次は斜めの外側付着の直交追跡であり、同じ冠状断の再生成・閾値component再試行はしない。ラベル/mesh/製品変更なし。視床に関するユーザーの感想は誤りの断定・境界承認ではない。

視覚路追跡の後続：49新規冠状面の全画素をnative MINCの直接YZX読みと独立比較し一致（work/verify-native-anterior.py、同evidence/pixel-verification.json）。旧Z89–91図を再読後、新規Z49–51/64–66/79–81計9水平面3枚も全個別目視（renderer --anterior-orthogonal）。下位の左右別断面からZ79–81の細い横走連結と裂隙へ連続し、単一Y境界で切れないことを確認。次は後方・外側への継続と上方付着の画像追跡。旧閾値component不採用維持。検証/実装済みだったと称する範囲を拡大しない。今回製品変更なし。

追加原画像レビュー：IX/X/XI全6始点の隣接直交54面（6枚）を全個別目視し、特にIXでは始点直後も組織内のためVII/VIII同様の単純短縮を不採用。次にnative100視覚路をY127–175まで49連続面/13枚、全X0–473・Z0–220で全目視。Y129から横走体の上方分離、Y139付近から左右二断面化、Y173/174一側淡化、他側は最終Y175にも残る。ROI端を神経終端としない。次はこの新規Y127–146付着/分離部の直交追跡。以前の閾値連結candidate不採用は維持。rendererの--anterior、work/anatomy-review/native-optic-anterior-continuity-v1、OPTIC_CURRENT_CONTINUITY_REVIEW末尾参照。今回はラベル/mesh/アプリ不変、目標active。

検証済み最新：VII/VIII採用後、全Node521/521（初回の旧URL/旧最小vertex数2件失敗は正確な新仕様検査へ修正後再実行）、Python crop4＋origin/path5、tsc、通常build成功。served SHA1244f483…を非interceptのactual browserで確認、日英VII/VIII4件正常・4PNG全目視。続けてV/IX/X/XIの既知配置欠陥を観察ページの説明にも日英明示し、クイズ保留との整合を取った。この後続文章修正は18/18・tsc・通常build・日英全4神経8DOMチェック、V/XI計4PNG全目視。全521には後続文章変更を含めない。work/pontine-adopted-browser-v1.json、nerve-placement-notes-browser-v1.json。V近位始点/ring4の左右4枚36面も全目視し、表面strip2から既に組織侵入を数値確認。Vは短縮採用せず、V/IX–XI8問保留/出題92継続。未解決geometryを追跡する目標はactive、main/公開不変。旧quiz visibility live manifestはさらに古いlabel/meshをpinしており現行live検証と称さない。詳細NERVE_ORIGIN_IMAGE_REVIEW末尾。

最新：VII/VIII近位表示短縮を開発版へ採用。右VIII接触9面とv3斜めブラウザ4枚を全個別目視。接触は脳幹外縁近傍の小組織で、既知の遠位側頭葉侵入とは区別。真の根出現位置は未確定。generatorのdisplay_rings=8で元全曲線の接線を維持し、候補SHA1244f483…を完全再現。他4overlay mesh不変、pre fixture保存、adoption JSON・日英注意・metadata・cache revision同期。V/IX–XI保留8問/出題92は維持。Python4/4・関連Node20/20・tsc成功。全体テストと採用後ブラウザはこれから。以下の「候補未採用」は経過記録。

VII/VIII短縮候補の続き：audit_proximal_pontine_surface.pyで三角面の0.2mm刻み相当有限サンプルを追加。raw<250はVII左右/左VIIIの最初strip0、右VIIIのstrip0–2のみ。右VIII最小はapp232.11,222.97,68.33。次はここを原画像直交で目視し付着/貫入を区別する。候補SHA1244f483…のlocal4345実ブラウザ表示をFetchで当該mesh一件のみ差替、公開ファイル不変。VII/VIII各選択、v1/v2計4PNGを全個別目視。v1は脳幹未選択、v2は中脳/橋/延髄を選択。短い白い部分は見えるが初期下面方向では付着が一部隠れるため、次に斜め方向の確認も必要。work/proximal-crop-browser-v2.json、health正常。候補未採用、geometry修正完了ではない。NERVE_ORIGIN_IMAGE_REVIEW末尾。

次の実装候補：VI/VII/VIII/XIIの残8経路72面を全8枚個別目視（renderer --remaining）。VI ring4は背景、XII ring4は表面近接で全面正解承認ではない。VII/VIII遠位ring12は左右とも側頭葉組織内（label0）と確認。stage_proximal_pontine_nerve_crop.pyでVII/VIIIだけ既存rings0–7を完全保持し8–15を除く候補をwork/anatomy-review/proximal-pontine-crop-v1へ保存。V/VI不変、各末端10頂点はraw255。残存ring1–7では右VIII ring1/2の4/2頂点だけ<250なので、根接触か侵入か画像確認が次。頂点間の面の全clearanceとは称しない。始点/半径/法線を移動せず、解剖学的神経終端ではなく近位表示範囲の候補。2/2。未採用・未ブラウザ候補表示・metadata未同期。現在出題92のまま（VII/VIIIの新欠陥の対応は次工程に残る）。同等候補再生成を繰り返さず接触確認→表示→採否へ。NERVE_ORIGIN_IMAGE_REVIEW末尾。

直近：IV/V側頭部4経路の36隣接・直交面を全4枚個別目視（medullary renderer --temporal）。IVは境界近接だけで深部貫入と同一断定しない。Vは左右ring12が側頭葉組織内、さらに数値でring4以降既に組織内、右終端ID24へ到達。cn5の同定＋機能2問も保留し、現在保存100／出題92、保留8（V/IX/X/XI）。監査・README同期、13/13・tsc・通常build成功。browser-v2日1366英390で92/8問注意/health正常、v2 PNGは保存のみ未目視。全518は前段階であり今回追加後の全体再実行ではない。geometry/label不変。次はVI/VII/VIII/XII残経路の原画像確認、0ラベルを組織外と誤認しない。出現点が未確定の神経は推測で移動しない。NERVE_ORIGIN_IMAGE_REVIEW.md末尾。

クイズ保留の検証完了：session55193はexit0、全Node518/518。後続でaudit_neurovascular_quizとaudit_quiz_concept_bankへ保存inventoryとeligibilityの分離を追加し、対象一致・runtime filter欠落・wrong履歴復活・不正collectionを検査。関連13/13成功。後続audit変更まで全518に含めたとは称さない。通常distを再buildで復元済み（work/quiz-anatomy-hold-final-normal-build.log）。現在の全bankは保存100/出題94、視覚neurovascular22/19（神経13/10）。下の「全Node実行中」は履歴。次は神経経路の修正を再開、保留だけで全目標完了にしない。

最新の暫定安全対策：取得済み300µm原画像で延髄周辺5枚15隣接面を全目視（render_medullary_native300.py）。実神経根の出口までは確定せず、geometry変更なし。一方、確認済みのIX/X/XI貫入を同定教材に使わないよう、src/quizAnatomyHold.mjsで対象3神経の同定3問＋機能3問をruntime poolから除外。保存bank100は維持、出題94。日英注意文・README更新。5/5・tsc・通常build成功。Chrome152/4345日1366・英390で94候補/注意文/health正常を確認、2枚目視。全Nodeはsession55193、work/quiz-anatomy-hold-full-node.logで実行中（終了時再確認し通常distへ戻す）。旧bank/pilot auditの100/22は保存inventoryであって現在のeligible countとは区別する。次はこの区別の監査同期と神経経路そのものの修正。公開・main不変。

続き：medullary rendererの--overviewでZ28/40/56/60/72/88の広域raw/label6枚を全目視。IXの既存始点の前後・高さにも疑義があり、最初の点を固定して遠位だけ曲げる修正は未採用。2003年原著abstractでpostolivary→flocculus/choroid plexus腹側の関係を確認（NERVE_ORIGIN_IMAGE_REVIEW末尾）。舌下神経旧英語catalogのcone olivesをmedullary pyramids and olivesへ訂正、英語4/4・tsc・通常build成功。ただし現行神経画面はその旧グループ見出しをrenderせず、ブラウザの見出し存在assertはv1/v2とも失敗（healthは正常）。視認成功と称さない。神経geometry・volume不変、根出口特定と経路修正が未完了。

次の修正対象を原画像で確定：render_medullary_path_review.py、work/anatomy-review/medullary-path-sections-v1。IX/X/XI左右mesh IDs38–43の小脳mask内最深ring中心を対象に、各3軸×隣接3面、6枚54面を全個別目視。IXは淡い内部、X/XIは葉状組織を実際に模式管が通る。単なるlabel空隙への張出しではなく神経の模式配置側の欠陥として扱う。volume/meshは今回不変。小脳を削って管を通さず、出現部と組織外の近位経路を次に定義する。6点の座標・mask距離はNERVE_ORIGIN_IMAGE_REVIEW.md末尾。この6局所確認を全経路の連続目視とは称しない。

神経の経路側も診断：audit_nerve_path_tissue.pyでIII–XII全20既存meshのring中心を原画像・現86ラベルへ照合。III各16点のRN4/SN4/0ラベル8、Z118/120の2図を個別目視。RNを通る実際の動眼神経束もあることを原著abstract（PMID23242853）で確認し、重複だけを誤りと断定しない。ただし既存模式根を実追跡した脳内束と読み替えない。IX/X/XIにも小脳重複を数値検出、これら遠位経路の図上追跡は次工程。NERVE_ORIGIN_IMAGE_REVIEW.md末尾参照。公開volume/mesh変更なし。真のIII腹側出現部はID27全補完を待たず原画像から調査可能。既存v1 evidenceは上書きせず保持。

神経始点の原画像照合を実施：NERVE_ORIGIN_IMAGE_REVIEW.md。全20始点3軸60面10枚を全個別目視、III/IVは広域12面2枚も目視。IIIの始点付近はID27縁が原画像の連続組織内を横切り、前回「境界から約1 mm以内」は正しい出現部の証拠にならない。次は動眼神経／脳幹腹側不足の依存関係を先に解決。すべて中心面比較で隣接断全追跡・全経路・根糸復元ではない。他の始点も一括正解にしない。script render_nerve_origin_sections.py、source/label/mesh/figure SHAをwork各reportへ記録、volume/mesh不変。

直近の神経診断：NEUROVASCULAR_TOPOLOGY_REPAIR.md冒頭。audit_nerve_origin_context.pyで実mesh IDs26–45全20始点を現ID27と表示座標で比較。結果0〜約1 mmで、一括表面移動の根拠なし。native原画像原点[-98,-134,-72]ではなく表示原点[-98,-116,-90]を使う必要があり、v1は誤座標比較として不採用、v2が有効。新規2/2、volume/mesh不変。root-exit解剖精度や根糸再現の承認ではない。次は各始点の周辺部位・模式経路の個別照合。旧654件は前回統合checkpoint。

乳頭体2点統合の全体確認完了：Node516/516、Python138/138、tsc、通常build成功。work/mammillary-tip-full-*。Chrome152 localhost4345で新revision読込＋配信rawSHA一致、乳頭体単独選択・水平位置70を1366/390幅で目視、loader/UI error/overflow/fallbackなし。詳細MAMMILLARY_NATIVE_SUPPORT_REVIEW.md。全NodeテストがdistをPages版へ変更するため、並行ブラウザ失敗を記録しテスト終了後に通常版へ復元した。v4が成功証拠（v3は旧badge期待失敗）。これは全解剖目標の完了ではない。残り80低信号中心点は部分容積等で維持、視覚路と乳頭体上方付着、脳幹腹側、根糸形状等はANATOMY_REMAINING_WORK.mdどおり未解決。

最新統合：左乳頭体の下端2点39→0を開発volumeへ導入。現SHA86e3b22dc7ce69cf31c5ba821e980ce283a366fd952bf46ce880efd8f3127e14、raw1f826fc89569429efd9e8cc322bdce49a28f1d1012e93ea419487afcc9d405aa。左559右729。install_mammillary_tip_repair.py、固定adoption record、pre-mammillary-tip-e7e6 fixture、独立Node全voxel差分テスト追加。版番号と現行auditのSHA/countを同期。左bbox下端108、接触面数と代表断不変。下のstage未統合は過去段階。関連テスト・buildはsession20063で進行、work/mammillary-tip-focused-v2.log等。実ブラウザ未確認。公開・main不変。

次の統合対象：乳頭体左下端2点の修正stage完成。MAMMILLARY_NATIVE_SUPPORT_REVIEW.md末尾。82点×125サンプルで74点は組織信号を含むため維持、全低信号は[193,252,107],[193,253,107]のみ。点別6枚全目視（app各3軸隣接＋native各3軸隣接）、2点39→0をwork/anatomy-review/mammillary-tip-stage-v1へhash固定・逆差分付きで生成。候補SHA86e3b22d…、左559右729、1 mm block入力完全不変。publicはまだe7e61a70、統合・依存audit更新・実ブラウザ確認は次工程。新規extent1/1・repair2/2。native-tip-context-v1はROI境界guardで失敗、v2が6枚完走証拠。上方付着の変更ではない。

最新の独立進捗：MAMMILLARY_NATIVE_SUPPORT_REVIEW.md。乳頭体native100の18局所比較6枚を全目視し、さらに現ID39/40全1290voxel中心を公式逆変換でnativeへ照合。全点ROI内、往復誤差最大3.14e-6 mm（解剖位置精度ではない）。native低信号の左40・右42点を座標付きJSONへ抽出。ただしapp原画像は216–250/217–250で255点なし、部分容積と位置合わせ残差があり82点一括削除不可。次はこの特定82点のvoxel体積と直交原画像を照合し外縁修正を判断。上方付着を解決した扱いにしない。新規renderer2/2、public不変。

最新：100 µm視交叉中央の連結成分候補を実作成したが採用不可。OPTIC_CURRENT_CONTINUITY_REVIEW.mdの「Native connected-support experiment」参照。v1は切り出し端で切断、v2はJSON保存失敗の不完全run、v3は完走したが上方付着から周囲組織へ広がる。v3目視は05/10/11のみで全枚確認とはしない。基準305811点・閾値感受性9087点・crop接触24070点はnative100 µm値。直交図もY97–126の3 mm slabに限定。ID33不使用、ID36–38未採用、public不変。閾値やboxを変えて解剖境界を作らず、画像上の付着部と端点を独立に定義する必要がある。下の「候補mask生成なし」はこの実験前の履歴。

次の再開点：視交叉中央候補を100 µm原画像から構成する段階。`render_native_roi_continuity.py` の冠状Y85–126全42面11枚、直交24面8枚を全て個別に目視。全42面の表示pixelも原画像と一致。OPTIC_CURRENT_CONTINUITY_REVIEW.md末尾のnative所見を読む。中央横走組織の外縁は明瞭になった一方、上方付着と前後端は可変。ID33補間・固定XY柱は不可。まだ候補mask生成・public変更なし。既存42+24の同図生成・同図目視を繰り返すのではなく、候補外縁の具体化と未確定部の分離へ進む。

100 µm ROIの変換比較が前進：`audit_native_roi_transform.py` と `render_native_roi_registered.py`。native→公式線形→公式非線形→改善3gridの経路で現行画像相関0.88564、非線形だけ0.05557。6三列比較図を全目視、構造の配置対応を確認。HYPOTHALAMUS_EXTERNAL_REFERENCE_REVIEW.md末尾。公式817 MB grid取得済み（SHA03ba5b1c…）、再取得不要。位置合わせは比較用で専門家承認ではない。新規3/3、public不変。次は視覚路・乳頭体の100 µm局所連続断。下の「変換経路の取得・検証」はこの後続記録に置き換わる。

新しい実作業の再開点：HYPOTHALAMUS_EXTERNAL_REFERENCE_REVIEW.md末尾。公式 `work/hypothalamus_full_100um.mnc`（SHA3a187981…）取得済み。独立したnative座標100 µmの局所原画像で、YZX復号・面別恒等スケール検査・Python3/3、6代表冠状面を全目視。Jones2020発表PDFも6/6目視。現在ラベルへ未投影・未採用。次はhistological→旧ICBM→改善ICBMの正しい変換経路の取得・検証。既存の3gridだけをnativeへ直に適用しない。100 µmデータの再取得や同じ6図の再生成は不要。

再開後の最優先補足：ユーザーの視床への発言は誤りの断定ではなく、一断面では濃淡・視床下部との区別を判断できなかった趣旨。視床の承認とも扱わない。目標を再開し、受領線はX180だけの参考として隣接・直交14比較5枚を全て個別に目視済み（MIDBRAIN_BOUNDARY_PROTOCOL_REVIEW.md冒頭）。線の全3D投影・ラベル変更なし。以下の「回答なし」「境界確認待ち」は受領前の履歴であり、現在の停止理由ではない。同じ質問を繰り返さない。

ユーザーの境界線を受領（回答待ち状態は解消）：work/image-review-responses/2026-09-06T09-11-18.521Z-b219c5b5-03f9-46f0-86ee-eb54b1a88fd9。元の近接X180図の右パネルへ緑1本197点、メモ空。ユーザーは視床の同定にも疑問を表明しており、視床承認と扱わない。scripts/import_midbrain_review_line.pyで元PNG SHA・再符号化sourceのpixel一致・保存両PNG SHAを検証し、連続voxel-center座標へ変換。segmentation-patches/review/user-midbrain-upper-reference-2026-09-06.jsonへ保存。X180、Y218.587–256.271、Z135.770–139.473の上端目安。全3Dへの投影・塗布・専門家承認なし。変換テスト2/2。次はこの線と原画像上の視床下縁を区別し、近傍断・直交断で再評価する。同じ確認依頼を繰り返さない。

ユーザー依頼でブラウザ画像注記ツール追加。IMAGE_REVIEW_TOOL.md。起動node scripts/serve_image_review.mjs、今回session10383、http://127.0.0.1:59161/ 。元中脳図を初期表示し青紫=視床、水色=赤核の凡例を付与。ユーザーが「確認を保存」した結果はwork/image-review-responses/の新規annotation.jsonを読む。試験専用work/image-review-browser-test-v1と混同しない。2/2単体・実Chrome1366/390の描画/保存/Undo確認済み。公開・main・ラベル変更なし。解剖目標は境界確認待ちのまま。

小脳の収録範囲を現物再照合：CEREBELLUM_MASK_SCOPE_REVIEW.md。ID28/29は皮質・白質・虫部の合成。内部白質を誤分節として削らない。源アトラスとの不一致16/20点は既採用の小脳再分類であり元へ戻さない。外縁・葉間溝の精密化は未解決。今回は画像追加やvolume変更なし。既存の画像・来歴・全体テストで支持できる修正は適用済みで、残存項目の多くは境界規約や画像上の帰属が決まらないという同じ制約に達している。新しい根拠がないまま画像生成・同一テスト・同一保留記録を循環させない。中脳の既存確認図への回答もまだなし。

残存表の欠落を補完：島皮質と小脳外縁を復帰。島は現volume＋公式300 µmの左右局所18比較6枚を全目視、INSULA_BOUNDARY_REVIEW.md。溝側の輪郭過剰を疑うが、当該局所に255のID34/35は0点で、以前の空隙内孤立点除去を転用しない。変更0点。単なる閾値調整・収縮は不採用。全体検証635件は直前checkpointで、新規rendererの--insula追加後の全体再実行とは数えない。

全体検証checkpoint：ANATOMY_INTEGRATION_CHECKPOINT.md。Node全513/513、Python全122/122、型検査、通常/Pages build成功。通常distを最後に復元。Chrome152・4345で水平1366、冠状390、脳神経390の3経路stable/error0/overflowなし。これは読込健全性であり新規の全面目視・解剖承認ではない。README/由来文書の旧「起始部を表面へ合わせている」を現行の精度未検証へ訂正。main/公開未変更。

視覚路の後続確認済み：直交連続42比較14枚＋保存済み公式300 µm画像の27比較9枚を全目視。OPTIC_CURRENT_CONTINUITY_REVIEW.md末尾にsource/report SHAと所見。旧ID33中央の欠損は原画像の組織欠損ではない。一方、視交叉→視索の移行・後端はこの局所資料でも確定できず、36–38は空のまま。同じID33の補間修復を繰り返さない。新規rendererはraw300を表示し、labels500の最近傍投影は比較用のみ。public変更なし。次は独立課題または蓄積変更の全体検証へ進む。

視覚路の現volume再点検：optic-current-continuity-v1の17枚・51比較を全て実際に目視（Z85–123連続39面＋直交12面）。OPTIC_CURRENT_CONTINUITY_REVIEW.mdに位置別所見を記録。ID33の中央欠損・段差を解剖境界として流用しない。36–38の分節は未完了、volume/mesh変更なし。rendererに33/39/40のcrop包含検査を追加、対象Python4/4成功。次は横走組織と外側への連続性を直交連続断で絞る。中脳上端の質問を繰り返さない。

独立課題の進行：神経metadataの未再現範囲とgeneratorコメントをUIへ同期。旧2 mm保証・serial rootlets表現を訂正。NEUROVASCULAR_TOPOLOGY_REPAIR.md冒頭参照。全5mesh byte不変、生成public JSON一致、新規関連4/4・型検査・通常build・rendered対象80/80成功（work/neurovascular-metadata-focused.log、session22794終了）。390幅ブラウザstable、loader/error/overflow/fallbackなし。中脳上端はユーザーの図示待ちのまま。公開なし。

最新：中脳上端について左右12面4枚を追加目視したが、安全な上限は確定できず、work/user-review-midbrain-limit.pngでユーザーへ線一本の確認を依頼。MIDBRAIN_BOUNDARY_PROTOCOL_REVIEW.md末尾。ここだけ確認待ち。回答なしで同じ領域の再描画を繰り返さず、次の独立課題（視覚路・後付け根糸等）へ進む。推測の中脳拡張はしない。全体目標は未完了。

中脳規約の取得は解決：著者PDF13ページのAppendix B全8項目を通読・ページ目視した。MIDBRAIN_BOUNDARY_PROTOCOL_REVIEW.md。視床15/16を表示した追加15比較5枚も全目視。元の外縁と規約上の内部境界を分離する必要がある。次は左右の乳頭体後方・上丘上端・狭い視床接続部の局所連続断からアンカーを限定する。代表面だけで境界を採用しない。volume/meshは不変、renderer対象3/3。

レビュー図の後続修正：ID41の色と全点crop内検査を追加しcurrent-ventral-midbrain-v3生成（63比較21枚）。06/07/18/19だけ新たに目視、Python3/3。その他v3画像は未読として保持。次は中脳上位境界の分節規約（Iglesias2015 Appendix B候補）の全文確認と、原画像の対応ランドマークを先に照合する。外縁だけで間脳を中脳へ合併しない。volume/meshはe7e61a70のまま。

最新の追加診断：audit_midbrain_discontinuity.pyでZ102→103の局所ID27消失1,182点のうち1,152が元Ventral DCへ切り替わることを確認。BRAINSTEM_SOURCE_EXTENT_REVIEW.md末尾。アプリvolumeは不変。前面コピーの採用根拠ではない。current-ventral-midbrain-v1図はID41輪郭を含まないことも明記した。次は水道表示を補った資料で局所境界追跡を進める。

追加：CN III説明の日英同期、対象9/9・型検査・通常build・実DOM日英確認を完了。中脳腹側は現行e7e61a70で水平49連続面＋直交代表10面＝59比較20シートを全目視。Z102→103のラベル後退と組織連続を確認。BRAINSTEM_SOURCE_EXTENT_REVIEW.md末尾参照。次はこの下位不連続の外縁を局所追跡し、上位の不確定な間脳境界とは分ける。新たなvolume/mesh変更なし。下の「次はCN III説明」は履歴。

後続：大脳脚位置目安の未選択描画がCN IIIを覆う原因を確認し、明示選択時だけ描画する修正を追加。PEDUNCLE_VISIBILITY_REPAIR.md。型検査・通常／Pages build・関連79/79・全Node511/511、初期/斜め目視、1366/390幅の選択→解除4枚目視まで成功。神経meshとvolumeは不変。次は古いCN III説明文の遮蔽原因表現を日英で同期し、根糸・出現位置の未再現を明示する。全体目標は未完了。

全体の残存作業とCN IIIの新しい3方向表示確認はANATOMY_REMAINING_WORK.md。次は神経と脳幹・大脳脚の遮蔽関係の切り分け。短い白い部分は表示されるが出現位置からの連続経路は未確認で、神経geometryは変更していない。

現行volumeはe7e61a7060c7f1ddfa8106ba659c0488e077495acdd6564862db44663d233ea3、ID27は250,042点。全22手動ラベルの位置補正・関連mesh同期、局所脳幹／小脳修正に続き、画像確認済み466点を27→0として導入した。詳細はBRAINSTEM_LATERAL_DORSAL_REVIEW.md。全Node510/510、Python118/118、型検査、通常／Pagesビルドと3断面の実ブラウザ確認に成功。main・公開は変更していない。

以下の「完了」は各時点の限定した工程の履歴であり、全解剖学レビューの完了ではない。次は後付け神経・血管の表示／接続、脳幹腹側の欠落と視覚路などの残存課題を継続する。曖昧な境界は推測で採用しない。MANUAL_REGISTERED_REVIEW_CONCLUSIONS.md冒頭の旧「20ラベル未採用」は訂正済み。

## 2026-09-06 期限なしの確認 — 完了

ユーザーが期限を撤回した後、残りの画像・数値精度・可逆合成の確認を完了した。**最初に [MANUAL_REGISTERED_REVIEW_CONCLUSIONS.md](MANUAL_REGISTERED_REVIEW_CONCLUSIONS.md) を読む。** 全19非手動競合425シート1,253比較、左右GPi／内包・側坐核後縁の公式300 µm追加12シート36比較を目視。旧候補は同一実装の別実行でNPZ SHA62c8…まで完全再現（別実装の同値検証ではない）。

数値精度依存が見つかったため全2,840,840点を `--precision tight` で再計算済み。NPZ fdf1ac…、raw86ee9c…、476,608 voxel、最大合成残差4.60451e-6 mm。旧版から変わる182点を全23シート546 XYZ比較で目視、新規5競合も全15シート45比較を目視。work合成7ebed1…／raw153ba1…は139,452変更点を正逆全格子再生して一致、左側脳室1点と既存保護IDを保持。全Python86/86（49.694秒）、図841シート2,667比較のSHA監査、追加差分／競合図SHA、diff-check成功。3 reportの固定コピーをsegmentation-patches/reviewへ保存。**確認は完了、実用版への採用は別工程**。native MINC同値・候補のmesh／実ブラウザは未検証、境界不確実性は構造別に明記。開発volume098edf…、main、公開は不変。下の10時終了・未読記録は前回の履歴で、次の作業開始位置ではない。

## 2026-09-06 10:00 JSTまでの自律作業

**終了チェックポイント**: 指定期限10:00 JSTを過ぎ、再開時刻確認が10:47 JSTとなったため追加調査は停止し、記録と保存だけを行った。非手動競合は16組377シート1,112断面、2,298 voxel（499成分）まで全図目視済み。右視床16／右内包32は01–18だけ確認済み、**次はpair-16-over-32-19**（19–22未読）。その後19-over-31、20-over-32の各13シートが未着手。全22ラベルの第一巡210シート810比較は完了しているが、全境界の正常判定・本体採用は未完了。内節／内包の薄い縁など追加照合を残す。原300 µm照合・可逆合成・複数ラベル図のbadca63 CI34003846813成功を確認。最新の全Python78/78と区別し、追加目視を新しいテスト成功とは数えない。候補はwork内のみ、開発volume098edf…不変、main・公開更新なし。以下は途中到達点の履歴。

**09:31 JST追加**: pair-10-over-32の全58シート172断面、pair-11-over-31の全36シート107断面を目視完了。競合の完了は10組276シート817断面、1,917 voxel（395成分）。次はpair-12-over-32-01、残り9組。元ラベルは不変。原300 µm照合・可逆合成・複数ラベル図の実装と78/78テスト記録はbadca63でcommit/push済み。図の追加目視を新しい自動テストとは数えない。

**現在位置（09:25 JST頃）**: 左被殻9／内包31の全58シート172断面を追加目視。競合完了は8組182シート538断面、1,155 voxel（240成分）。**次はpair-10-over-32-01、残り11組**。複数ラベル合成比較を新設し、6群の代表全18シート54断面を目視、内外節・被殻・内包、海馬・扁桃体、赤核・黒質・視床下核を同時確認。凡例の切れを修正したv2も生成し、2図の凡例を再確認。元データへの追加採用なし、volume098edf…不変。原300 µm照合／可逆合成／合成図の新規スクリプトとテストを含め全Python78/78成功。詳細・SHAはMANUAL_REGISTERED_CANDIDATE_REVIEW.md。7438cc6 CI33992967259成功。以下は途中到達点の履歴。

**現在位置（06:45 JST頃）**: 公式300 µm原画像へ5部位を追加照合。manual-fine-boundaries-v2の全15シート45断面を目視。元300 µm手動区画を独立逆変換で元画像格子へ採取し、500 µm候補の拡大と区別した。尾状核の脳室1 voxelは依然壁際なので上書き保留、左右視床の白い局所と右海馬の白い帯は原画像にもあり一括背景削除しない。新規スクリプト対象3/3成功。競合pairは07-over-31全40、08-over-32全39も読み、完了7組124シート366断面370 voxel。**次は09-over-31の01から、残り12組**。work専用のcompose_registered_practical_candidate.pyを追加し、manual-practical-composite-v1へ可逆候補を生成（候補raw ac1548…、139,447変更、旧位置49,233は未ラベル、脳室1点保持、27/31/32競合2,524は比較用核優先）。対象4/4成功、正逆全voxel再生一致。volume／meshは098edf…不変、採用経路未接続。次は合成原画像比較と、残り競合の原画像レビュー。詳細・SHAはMANUAL_REGISTERED_CANDIDATE_REVIEW.md。

**背景・小成分図の目視を完了（06:20 JST頃）**: manual-all22-conflicts-background-v1の全35成分45 voxel、112シート324断面比較と、manual-all22-conflicts-small-v1の全16成分17 voxel、49シート145比較を実際に目視した。視床499・537は内部の白い領域、右海馬569–572も内部の白い帯にあり、他は主に輪郭端。小成分も本体近傍の灰白質／線維帯の縁であり、背景値や小さい6近傍成分だけで削除・橋渡ししない。詳細はMANUAL_REGISTERED_CANDIDATE_REVIEW.md。**次は非手動ID競合**。audit_registered_manual_conflicts.pyに表示専用--group-by-pairを追加、全キー・全点・全XYZ範囲を保持。対象7/7成功。manual-all22-conflicts-pairs-v1へ生成中、まだ目視数へ加算しない。cb58777・c1074bd・76ac4e8のCI成功。assetsは098edf…不変。以下は途中到達点の履歴。

**競合列挙・再発防止を追加**: audit_registered_manual_conflicts.pyとテスト5件。背景35成分45 voxel、小別成分16成分17 voxel、非手動ID競合540成分2,525 voxel。背景局所図324断面112シートをwork/anatomy-review/manual-all22-conflicts-background-v1へ生成、読んだのは018-image-background-code-07の3シート9断面のみ。次は残りから。manual/practical旧CLIは--legacy-grid-reproduction＋work内新規出力を必須化し、入力ロード前にpublic更新を拒否。metadataもspatialAlignmentValidated:false。既存6段階パッチ関数・SHAは保持。ガード3/3、競合5/5、全Python66/66、関連Node81/81成功。新しい実ブラウザ判定・asset採用はまだなし。

**全22候補の第一巡目視を完了**: 視床・海馬・側坐核・扁桃体の残り84シート324断面比較を読み、総計210シート810断面比較まで到達した。全占有Z＋前後1断、X/Yは代表5位置±1断であり全直交断ではない。海馬では特に左の旧下内側の張り出しが減り、扁桃体では海馬側への旧延長が減る。視床上後方の欠落も改善。側坐核／尾状核の連続灰白質、海馬亜区分等は未確定。MANUAL_REGISTERED_CANDIDATE_REVIEW.mdに全11群の所見を記録。**次は背景45・小成分・他ID重複2,525の局所比較と生成経路修復**。研究候補のまま、assets・main・公開未変更。以下の時刻付き到達点は途中経過の履歴。

**05:45 JST頃の追加目視**: 全22候補のうち尾状核・被殻・淡蒼球外節／内節の全84シート324断面比較を追加で実際に目視。先の赤核・黒質・視床下核と合わせID1–14、126シート486断面比較まで完了。詳細はMANUAL_REGISTERED_CANDIDATE_REVIEW.md。白い線維帯への旧張り出しが減ることや、灰白質側の欠落が改善する比較を確認。ただし尾状核／側坐核などの連続灰白質の境界は転送だけで確定せず、候補の採用・assets変更はまだなし。**次はID15–22（視床、海馬、側坐核、扁桃体）の図から続行**、その後に背景45・小成分・他ID重複2,525の局所比較と生成経路修復。候補実装1549b5d CI33990603872成功。今回追加は目視記録のみ、既存テストを再実行したとは数えない。公開・main未変更。

**05:35 JST頃の追加到達点**: `MANUAL_REGISTERED_CANDIDATE_REVIEW.md`。元300 µm手動全22 IDを公式3gridで表示画像へ逆変換採取したwork候補を作成。候補476,590 voxel、最大計算残差0.004252 mm、旧手動から外れる49,233、他ID重複2,525、原画像255重なり45。NPZはwork/anatomy-review/manual-all22-registered-v1、raw SHA89f62f…、研究reportの固定コピーはsegmentation-patches/review/manual-all22-registered-candidate-2026-09-06.json（adopted:false）。810比較断面210シートを生成し、赤核・黒質・視床下核の全42シート162断面だけ実際に目視済み。特に赤核上端の欠落・位置ずれが改善。他ID7–22はまだ図未読、次にそこから続ける。図はmanual-all22-registered-review-v1。新規対象5/5、全Python58/58成功。アプリassetsは098edf…のまま、公開・main未変更。直前ab50be3 CI33989762171成功。

**新しい最優先事項（05:20 JST頃）**: `MANUAL_LABEL_SPACE_REVIEW.md`。公式20190708 MINCを取得し、現在の画像は非線形変換済み画像と全voxel一致、ID1–22全446,874 voxelは未変形の手動500 µmと全voxel一致することを確認した。manual historyは300→500の`--like`だけでtransformなし。shape/affine一致だけでは座標空間の同一性を保証しなかった。公式3gridの独立逆変換で淡蒼球だけwork候補を作り、29比較図を全目視。右上後方の淡い帯への張り出しが減る。まだassetsへ採用なし。次は全22 ID候補の変換・原画像レビュー・重複と生成規約の修復を優先する。源流を直さず局所を閾値で切り続けない。診断JSONはsegmentation-patches/review/manual-label-space-diagnostic-2026-09-06.json、adopted:false。0.3 mm変換済み原画像も取得済みだが未目視。別の古い18ラベル版は不採用でworkにのみ保存。

保存ab87b57（追加淡蒼球点検）のCI run33989040958成功。新しい診断はその後の作業。

追加の淡蒼球精査: `PALLIDAL_BOUNDARY_REVIEW.md`。左右全X/Y＋上方Z147–160の230原画像対／78シートと全体付き3図をAIが目視。手動由来ID11–14の位置・値が旧b75a…と不変であることも確認。主たる内外関係は追えるが、右外節の上後方の淡い帯は境界未確定、追加採用なし。原画像パネル947,114 pixel block照合成功、対象Python3/3・全Python50/50成功。元volume098edf…／全mesh不変。単なるwhite閾値や左右鏡映で切り取らない。

脳室穴調査を88df796でcommit/push済み、CI run33988477329成功。ここまで公開・main未変更、draft PR27。

最新の段階: `CALLOSUM_INFERIOR_REPAIR.md`。固定下方弧2,160 voxelを全114占有／隣接断面24シート＋3全体図でAIが確認し、第6段階で30→0へ除外した。**開発volumeは098edf…／raw afc550…、ID30=146,019**。脳梁局所除外の合計5,361。新しい脳弓ラベルへ塗り替えたわけではない。旧8cc65e…fixtureとstrict採用記録を保存。55 block比較では脳梁mask270格子voxelだけ変更、他54不変。新脳梁mesh c9e416…、13,022頂点／26,012面。Python全44/44・全Node489/489・型検査・通常build・6段階全voxel再構成差異0。実ブラウザ24/24、新規同定6＋block8画像を目視。全体ログwork/callosal-inferior-full-node.log。公開未変更、保存先は作業ブランチ／draft PR27のみ。

読み取り専用の脳室穴調査: 098edf…でID23/24/25/26の補集合6近傍では170/22/1/0 voxel、18近傍では118/2/1/0、26近傍では116/0/1/0。すべて未ラベル・原画像非255。大きい7成分の代表±1断を三方向、計63対／21シートでAIが目視した。小島状の濃淡や壁際の境界で、一律の空隙埋めを支持せず追加採用0。全候補の逐一精査／全境界の正常判定ではない。`audit_ventricle_enclosed_holes.py`、`SEPTEMBER_VENTRICLE_REVIEW.md`追補、work/anatomy-review/ventricle-enclosed-holes-v2参照。元volume不変。既存の背景255候補と混同しない。

直近保存efdd314のCI run33987894400はverify／verify-pages-baseとも成功。公開・mainは未変更、draft PR27を維持。

直前の追加皮質修復8cc65e…はf8581a2としてcommit/push済み、CI run33986940472はverify／verify-pages-baseとも成功。draft PR27 OPENのまま。

直近保存: 0580e5aを作業ブランチへcommit/push済み。draft PR27へチェックポイントコメントを追加し、GitHub CIのverify（Python36件を含む）／verify-pages-baseとも成功。公開・mainは未変更。以下のcommit/push未実施記載は保存前の履歴。

追加修復: `CALLOSUM_CORTICAL_FOLLOWUP_REPAIR.md`。固定成分15/76/83の全39シート・182局所断面をAIが目視し、左297＋右682＋右617＝1,596 voxelの30→0を別strict採用記録・生成本体第5段階へ接続した。**開発volumeは8cc65e…／raw3c9d95…、ID30=148,179へ更新済み**。入力5348…をfixtureに保存し、旧1605の履歴を保持。55 mask比較で脳梁223格子voxel除外・標本組織34格子voxel復帰の2 meshだけ変更、他53は不変。日英10同定＋block8視点の実ブラウザ18/18と全画像目視、Python40/40（追加補強後4/4）、型検査・通常build成功。全Node初回487/488の旧乳頭体監査参照1件を修正し、再実行488/488成功。脳室4同定も現行distで成功。生成5段階の全voxel再構成差異0。公開・main未変更。保存は作業ブランチ／draft PR27のみ。

次の画像調査: 現行8cc65e…のID30固定成分4（2,160 voxel、[187,219,147]–[204,274,180]）を `render_callosal_inferior_component.py` で可視化。全114占有／隣接断面24シートと3全体図をAIが目視。脳梁本体の下にある別の細い弧で、脳弓体／柱付近との混在を疑う。まだこの成分の採用記録・label変更はしていない。work/anatomy-review/callosal-inferior-component-v1。成分番号はこの入力にだけ属する。

最新: 既存の脳室47 voxel修正（26→0:31、26→41:16）を保持し、脳梁局所1,605 voxel（30→0）をAI補助プロジェクト採用した。開発volumeは5348b765…、raw35b2a2bf…、ID30=149,775。`CALLOSUM_LOCAL_REPAIR.md` 参照。旧b75a…と930e…をtests/fixturesへ固定保存。生成本体の第四段階、版定数、metadata、日英説明、乳頭体／視覚路の新監査を同期し、四段階の全voxel再構成差異0。55 blockパーツ比較で今回変化した脳梁mesh1点を同期した（前段の第四脳室・中脳meshも保持）。実distの除外／保持点日英4同定＋mesh4表示の計8件成功・全画像目視。Python全36/36、関連Node108/108、型検査・通常build成功。統合後全Nodeは再実行中。CIにもPython単体テストを追加し、固定依存の隔離環境で確認中。公開サイト・main・commit/pushは未変更。draft PR27を維持。preview4346は次利用時に生存確認する。

追補チェックポイント（03:50 JST頃）: 5348…統合後Node全487/487成功、固定CI依存の隔離Python全36/36成功。最後の英語8文言補正後は対象Node15/15・型検査・通常buildと実ブラウザ8/8再確認。英語2画像の試作バッジ等を追加目視。脳室修正も現行distで日英4/4再確認。前文の「再実行中／確認中」は完了。文言補正前の全487と、補正後の対象15を区別する。次は脳梁の残り皮質混入候補を原画像で局所点検する。6,528の一括削除はしない。

ユーザー指定の終了時刻は本日10:00 JST。開始確認は01:09 JST。公開・main統合は行わず、根拠が揃った分節／3D修正と検証を進める。曖昧な境界は図付き候補として保持し、別作業へ進む。

統合チェックポイント追補: Node全484/484、Python全24/24、型検査／通常build成功。新ラベル実distで日英クリック同定4/4、第四脳室mesh通常／透過×上下4画像を全目視済み。headerと詳細欄の重なりも修正し日英×8幅16件で重なり0・代表4画像目視。後続の監査レポート作成失敗時にもvolumeを変更しない修正ではPython全26/26、履歴CLI入力固定の追加テストは7/7。以後の対象Node14/14＋脳梁候補1/1成功。全484件は後続Python安全性修正前の結果と区別する。

脳梁の調査履歴: `CALLOSUM_EMPTY_SPACE_REVIEW.md` の3成分291 voxelは、その後の皮質はみ出し固定成分85（1,314 voxel）と合わせて別のstrict採用記録へ移した。旧候補はunreviewed履歴として保持。291の全97局所断面、1,314の全99局所断面、全ID30の42矢状断をAIが目視。残り917 raw255重なりや他の皮質候補を一括削除していない。帯状回／帯状束・脳弓との混在は未解決で、脳梁全体の正常判定ではない。

公式組織分類の追加根拠: `OFFICIAL_TISSUE_ALIGNMENT_REVIEW.md`。BigBrain2015の0.4 mm組織分類と対応原画像、Xiao2019のMINC変換3段をwork内へ取得。アフィンだけの転送は不採用。公開変位場による逆変換後は元画像と相関約0.969（324,324固定点）、5断面を三線形・Catmull-Romの各方法で目視。どちらも未解決点0。組織分類は領域ground truthではなく、volume自体の再配布・自動置換はしない。今回の脳梁局所修復の補助根拠としてのみ使用。h5py 3.16.0をwork/segmentation-depsへ隔離追加。中脳も353,642点・18三方向画像を確認したが、分類8/9は中脳を網羅しないため一括修復に使わない。`BRAINSTEM_SOURCE_EXTENT_REVIEW.md` 追補参照。

履歴用候補の再生成CLI（第四脳室・そのlocator・前方小片・内包）は、共通の現行SHAを参照すると新版で元成分が消えて再現不能になるため、旧b75a…fixtureへ明示固定した。過去候補のinputや採否を変更せず、現在版の監査と区別する。

最初の安全性修正: `apply_approved_patch` と `apply_approved_ventricle_patch` は全編集と集計検査が成功した後だけ呼出元volumeへ反映する。従来は遅い段階のエラーで部分変更が残り得た。拒否時不変の新規Pythonテスト5/5、既存の実データ脳室採用テスト3/3成功。これは境界変更ではなく、配布ラベルのSHAも未変更。全体検証は後続のまとまった変更後に実施する。

## 継続作業の運用・実データ検証（2026-09-06）

最新到達点: 中脳組織mesh1点を開発assetsへ反映し、metadataの頂点／面数を同期。旧meshの完全再現を確認した上で変更。旧新×通常／組織のみ／透過×上下の12実ブラウザ画像を目視済み。通常では模式水道が隠れ得るが透過で見えることを確認。README日英・ライセンス記録を同期。公開・main統合・commit/pushはしていない。以下の「公開mesh未変更」はオンライン公開版については引き続き正しいが、開発作業ツリー内の1資産は変更済み。

ユーザー指示: 確認が必要な時だけ、全体位置・修正前後の図を添えて具体的に依頼する。それ以外は小変更ごとの承認で止めない。

- 内包は公式CerebrA/WMを再取得して実SciPyで再生成比較。左856・右760 voxelのstrict未採用差分を保存。全影響Z87＋直交20対を目視したが、白質らしい帯も含むため一括削除しない。`INTERNAL_CAPSULE_REPAIR.md`。
- 中脳標本は、模式中脳水道の筒で原画像由来組織を削る処理を撤回。1 mm生成格子で226 voxelを保持するlocal meshを生成し、11生成断面を目視。公開meshは未変更。`MIDBRAIN_CONTEXT_REPAIR.md`。
- 元NIfTI/依存はwork内だけ。入力SHAガードや採用レビューを弱めない。候補を採用済みと扱わず、次はlocal meshの3D表示と模式部品との遮蔽確認を行う。

## 最新: 2026-09-06 内包候補の生成規約修復

`INTERNAL_CAPSULE_REPAIR.md` を参照。内包生成のclosing後に隣接核の除外を再適用した。合成テスト2件（8核ID×左右を含む）と既存脳室採用3件成功。実アトラス再生成・配布資産変更は未実施。前下方の帽状領域は原画像を再点検したが、削除境界の根拠不足のため未変更。前脚・膝・後脚の分割も未完了。READMEの配布ラベル未変更の記載は引き続き正しい。

## 最新: 2026-09-05 全体レビュー候補

最新追加指示により、16 voxelの26→0除外案は26→41「中脳水道候補（部分）」への再分類案へ変更した。新旧差分を同時適用しない。編集ツール・差分validatorに41を追加したが、公開volumeは未変更。脳幹Z0–2は画像全体が255なので、1,832 voxelの削除は根拠不足として保留。詳細・再生成方法は `FOURTH_VENTRICLE_REPAIR.md`。

分節修復に着手し、第四脳室ID26の中脳水道付近16 voxelを外すstrict未採用差分と三方向の比較画像を作成した。詳細は [FOURTH_VENTRICLE_REPAIR.md](FOURTH_VENTRICLE_REPAIR.md)。本体・生成本処理・公開は未変更。Z114の別2 voxelと主腔は保持。正式適用前に採否を確認し、未承認パッチの出力ガードを維持する。READMEは配布ラベル未変更の現状と一致するため今回の内部候補作成では変更不要。

追加依頼「全構造を確認」のAI先行精査は [FULL_ANATOMY_REVIEW.md](FULL_ANATOMY_REVIEW.md) で完了。全37非空IDの全Z範囲1,275原画像／輪郭対と直交51対、自由観察72項目、全8ブロック44レイヤーを個別目視した。脳梁・脳幹・脳室・海馬・内包などの具体的な問題と判定不能な境界を記録した。「全構造に問題なし」や専門家承認ではない。尾状核尾部未収録、第四脳室と中脳水道の混在、中脳標本組織不足、動眼神経の遮蔽を日英文言に反映。配布分節／メッシュ・公開は変更していない。旧 [ALL_STRUCTURE_ANATOMY_REVIEW.md](ALL_STRUCTURE_ANATOMY_REVIEW.md) は一次点検時点の履歴。

続く修正依頼では、下頭頂区画の着色範囲説明と脳梁の境界注意を日英で更新。溝描画2方式を実装比較したが、標準上面で着色の連続性が悪化したため撤去し、従来描画を維持した。詳細は上記台帳末尾。分節形状はまだ修正していない。

作業ブランチは `codex/september-learning-review`。正規公開先は https://bonnginn.github.io/brain-practical-navi/ です。今回の改善・検証・残る専門家確認は [SEPTEMBER_RELEASE_REVIEW.md](SEPTEMBER_RELEASE_REVIEW.md) と [SEPTEMBER_REVIEW_PROGRESS.md](SEPTEMBER_REVIEW_PROGRESS.md) を優先してください。下記の過去PR番号・旧ブランチは履歴です。mainへのマージと公開更新は改めてユーザー承認が必要です。完了報告では重要な変更を一度に並べず、一つずつ確認を案内します。

更新日: 2026-08-24
引き継ぎ基準コミット: `6f13cd58 public alpha refresh merge`

<!-- beta-current-snapshot:start -->
Current machine-readable values: [BETA_CURRENT_SNAPSHOT.json](BETA_CURRENT_SNAPSHOT.json). All other counts in this document are dated historical evidence, not current inventory or approval.
<!-- beta-current-snapshot:end -->

ローカル確認済み範囲と、専門家・管理者・公開・物理端末待ちの境界も同snapshotから確認します。

この文書だけで、Windows側のCodexが公開α refresh後の実装・監査状況を確認し、β候補版への作業を継続できるようにしています。PR #14は2026-08-24にmainへ統合済みで、GitHub Pagesの公開αも差し替え済みです。以後のmain統合や再公開は、今回の一回限りの承認を継続承認とみなさず、改めてユーザーの明示承認を得ます。

### 2026-08-24 公開α refresh

PR #14はmerge commit `6f13cd58e3e6450049e02be04c320a4e9abc1fc3` でmainへ統合し、GitHub Pages run `32711938345` が成功しました。公開URL限定read-only監査は、canonical 27経路×3幅×direct/reload＝162/162件で合格し、主文書HTTP 2xx、公式origin・path、missing／duplicate／fail 0、console／request／UI error・loader・overflow・WebGL fallback 0を確認しています。証拠は `work/browser-audit/alpha-public-refresh-2026-08-24.json`、公開判断の境界は [ALPHA_RELEASE_AUDIT.md](ALPHA_RELEASE_AUDIT.md) を参照してください。β公開、専門家承認、物理端末・別ブラウザ確認は未完了です。

## 1. 目標

> 脳実習ナビをβ候補版へ進めるため、`BETA_ROADMAP.md` のうち専門家監修を必要としないP0・P1項目を自律的に監査・実装・検証し、解剖学的監修が必要な残課題を、根拠・対象画面・確認方法が明確なレビュー待ち状態まで整備する。

「項目を1つずつ指示待ちで直す」のではなく、ロードマップを作業台帳として使い、複数の関連項目を一つのマイルストーンにまとめて進めます。ただし、模式形状を解剖学的に正しいものと断定したり、専門家確認なしに「検証済み」へ昇格したりしません。

## 2026-08-23 PWA・オフライン基盤

Web App Manifestとbase-path対応Service Workerを追加しました。初回は約629–634 kBのアプリシェル5件だけを保存し、約92.4 MBの公開教材を一括取得しません。同一サイト内の教材資産はオンラインで利用した時点でrelease別data cacheへ保存します。通常／Pages buildと生成物監査、両baseでのmanifest・active worker・controller・scope・shell 5件、Pages baseの代表教材の利用時cache 5件、PWA追加後の通常build全経路156/156件を確認しました。2026-08-23の通常base再監査ではChrome 151のmanifest parse／installability errorが0件でした。v10後の最終生成物監査は、通常buildがshell 5件・633,527 bytes、Pages buildがshell 5件・633,760 bytesです。ただし実際のホーム画面追加と追加後起動は未確認です。

Codex内蔵ブラウザの安全ポリシーが通信遮断後の再読込を拒否した記録はv10以前の履歴です。同じ操作を別経路で迂回して完了扱いにはせず、下記のrunner所有server停止監査とは区別します。公開URL、物理端末、Safari・別ブラウザは未確認です。

### 2026-08-23 PWA v10 ローカルserver-unavailability受入

権威ある結果は `work/browser-audit/pwa-offline-recovery-v10-2026-08-23.json` です。`scripts/audit_pwa_offline_browser.mjs` がnormal／Pagesの既存build rootごとにloopback静的serverを所有し、停止時にlistenerを閉じ、追跡socket 6件を破棄し、TCP `ECONNREFUSED`を確認した後、同じhost／portへ再listenしました。Windows 11／Chrome 151／Node 24でnormal／Pages各10 action（合計20/20）、blocker 0、独立validator passです。通常HTTP cacheはclear＋disable ACK、Cache Storageは保持しました。

訪問済み経路は停止中もService Workerからdirect／reload／`about:blank`→hash routeでCanvas 1へ復帰し、未訪問のBigBrain assetは停止前に未cache、停止中は既存error／retry UI、再listen後は対象GET 200・11,904,805 bytes、Cache Storage +1、Canvas 3を確認しました。`navigator.onLine`はtrueのままで、オフラインバッジを証拠にしていません。

この結果はrunner所有のローカルHTTP listener停止による回復性の証拠であり、物理／OSネットワーク断、公開URL、物理端末、Safari・別ブラウザ、インストール済みPWA、ホーム画面追加後の起動の証拠ではありません。PWA全体の公開／インストール判定は未完了のままです。再現手順とmutationを含む契約は `tests/pwa-offline-browser-audit.test.mjs` にあります。

2026-08-24、コミット `63e6974` の通常／Pages本番生成物で同じ監査を再実行し、各10 action、合計20/20、blocker 0、独立validator passを確認しました。両baseでsocket 6件破棄、TCP `ECONNREFUSED`、HTTP cache clear＋disable ACK、訪問済み経路のService Worker direct／reload／`about:blank`復帰、未訪問11,904,805 byte教材の停止中error／retryと再listen後GET 200・Cache Storage +1・Canvas 3を再確認しています。成果物は `work/browser-audit/pwa-offline-recovery-current-head-63e6974-2026-08-24.json` です。公開URL、物理端末、実インストール等の未確認境界は変更していません。

### 2026-08-24 Homeの端末追加導線

Homeへ、対応ブラウザがpromptを提供した場合だけ利用者の明示クリックで開始する端末追加カードを追加しました。非対応環境の控えめなメニュー案内と、約92 MBを一括保存せず利用時cacheに限定する説明を同じカードへ置いています。合成イベントによるPC／390 px相当6/6、通常／Pages停止・復帰20/20、canonical route 162/162、cold payload 27/27に合格しました。実際のホーム画面追加、追加後起動、公開URL、物理端末、Safariは未確認です。詳細は [PWA_INSTALL_AFFORDANCE_AUDIT.md](PWA_INSTALL_AFFORDANCE_AUDIT.md) を参照してください。

### 2026-08-24 公開前チェック表示

`#workspace/status` 冒頭へ、Go／No-Go台帳12件の状態、ローカル確認範囲、未確認範囲、次操作を読み取り専用で表示しました。件数はローカル証拠あり3、部分確認1、専門家待ち4、管理者待ち1、公開反映待ち3で、stateは変更していません。ブラウザへは安全な生成projectionだけを表示し、local-only証拠パスや台帳原文はbundleしません。Chrome 151でdirect、詳細、Esc、背景click、Tab循環、起点focus、小画面一列、error／loader／overflow 0、summary実効高さ44.99 pxを確認しました。最終buildのroute監査162/162、cold payload 27/27、全tests 347/347、型検査、通常／Pages buildも成功しました。公開URL、物理端末、実際の専門家・管理者・公開作業は未完了です。詳細は [BETA_READINESS_DISPLAY_AUDIT.md](BETA_READINESS_DISPLAY_AUDIT.md) を参照してください。

## 2026-08-23 数値読込進捗

断面画像、手動ラベル、3Dメッシュをstreamで読み、実測byteを複数資産で集約する数値進捗を追加しました。全資産の `Content-Length` が取得できる場合だけ総量と整数％を表示し、一つでも不明なら受信済みbyteと「総量不明」を表示して推定％を出しません。受信後の展開・解析を別表示にし、再試行時は進捗を初期化して旧試行の遅延イベントを世代tokenで無視します。

Chrome 151のPages想定buildで総量不明表示、総量既知の `12 MB / 12 MB（100%）` とバー値の一致、390 px相当の横はみ出しなし、完了後loader／alert 0を確認しました。全経路は `work/browser-audit/beta-route-audit-download-progress-2026-08-23.json` の156/156件、全テスト227/227、型検査、通常／Pages buildに合格しています。公開URL、物理端末、別ブラウザ、実公開回線は未確認です。詳細は [DOWNLOAD_PROGRESS_AUDIT.md](DOWNLOAD_PROGRESS_AUDIT.md) を参照してください。

## 2026-08-24 来歴表示台帳の現在値

機械台帳は registry 75件、expert pending 75件、表示面フィルタ（脳表／断面／ブロック標本／復習）54／16／30／22件です。学習者向けmappingは222/222件が解決済みで、family別は sections21／surface52／free75／neurovascular22／blocks52です。アプリ在庫は regions26／landmarks8／deep5／basal13／neurovascular22／sections21／block specimens8／layers44／pathways3です。

現行Go / No-Goの12項目とsourceCounts（provenance／expert pending 75件、unique quiz targets 45件＝既存23件＋模式3D pilot 22件、learner mapping 222/222件）は [BETA_GO_NO_GO_AUDIT.md](BETA_GO_NO_GO_AUDIT.md) と [BETA_GO_NO_GO.json](BETA_GO_NO_GO.json) を基準にします。ローカル確認を公開・専門家確認・デプロイ完了とは扱いません。

2026-08-28、脳神経クイズは大脳半球を透過したまま中脳・橋・延髄を不透明な位置基準として残すよう変更し、前交通動脈・後交通動脈・小脳動脈群・視交叉を追加した。表示対象は45（神経血管22）のまま、同じ色付き構造について機能・位置関係・経路を問う55問を加え、現行は全100問とした。追加55問はプロジェクト内レビュー・専門家未確認の試作である。視交叉はoverlay ID25だけを使い、旧断面ID33・未分節ID36–38を使わない。Chrome 152のローカルproduction previewで45 target×3幅＝135/135件に合格した。この可視性監査は追加55問の専門家確認を意味しない。公開URL、物理端末、別GPU、専門家レビューは未確認。

56件から75件への19件追加（surface／block app-only 18行とoptic nerve `cn2`行1件）、旧ID33と`cn2`／`opticChiasm`の分離、ID39・40のexpert pending維持は [LEARNER_PROVENANCE_DISPLAY_AUDIT.md](LEARNER_PROVENANCE_DISPLAY_AUDIT.md) に固定しています。

### 2026-08-23 実ブラウザ履歴

最終ローカル実ブラウザ確認として、Chrome 151のin-app browserで`http://127.0.0.1:4201`を確認し、review panel 75/75、filter surface54／sections16／blocks30／quiz21／all75、app-onlyカードの日本語見出し、縁上回の「試作」＋CerebrA詳細、`cn2`／`opticChiasm`の「模式」、block choroid plexusの「模式」＋未保証説明を確認しました。route auditは `work/browser-audit/beta-route-audit-learner-provenance-final-2026-08-23.json` に保存し、26経路×3幅×direct/reload＝156/156、`allPassed: true`。390 px設定の`clientWidth`は375 pxで、overflow／error／loader／WebGL fallbackはありませんでした。これは表示回帰の確認であり、解剖学的妥当性の検証ではありません。公開URL、物理端末、別GPU、専門家レビューは未確認です。

2026-08-22の全56件・表示面36／16／29／21件・route156/156の実測履歴は変更せず保持します。

同日、通常クイズの標準／試作判定を正答targetだけでなく全選択肢の由来へ拡張しました。既存23問は標準7件・試作16件となり、模式3D pilot 17件を含む画面上の全40問は標準7件・試作33件です。問題本文・正答target・選択肢・position/viewのSHA-256は変更していません。Chrome 151のローカルpreview `http://127.0.0.1:4214/` で試作ON/OFF、標準7問queue、乳頭体問題の試作バッジを実操作し、最終route監査も156/156件に合格しました。詳細は [QUIZ_GRANULARITY_AUDIT.md](QUIZ_GRANULARITY_AUDIT.md) と `work/browser-audit/beta-route-audit-option-provenance-2026-08-23.json` に記録しています。専門家確認は未完了で、Go / No-Go criterion 07は `expert-blocked` のままです。

旧視覚路混合領域ID33には、現行配布ボリュームを変更しない客観直交断監査を追加しました。現在値は8,482 voxel、12個の6近傍成分で、全軸の占有断面・全境界面接触・代表候補X187／Y262／Z114を固定JSONへ保存しています。乳頭体採用前の9,013 voxelという歴史値と混同しません。これは専門家レビューの準備資料で、ID36–38への機械分割、解剖学的妥当性、クイズ復帰を意味しません。詳細は [OPTIC_PATHWAY_AUDIT.md](OPTIC_PATHWAY_AUDIT.md) を参照してください。

上記3候補は寄稿者ツールの専用パネルから直接開けます。ボタンは表示位置・zoom・pan・cursorだけを変更し、編集差分や履歴、端末内ドラフトを変更しません。Chrome 151の `http://127.0.0.1:4215/` で3位置、表示数、差分0の維持、矢状・冠状の編集無効を実操作し、全経路監査も156/156件に合格しました。全テスト211/211、型検査、通常／Pagesビルドも成功しています。公開URL、物理端末、専門家確認は未完了です。

2026-08-24、脳室ラベルの黒い内部欠損を保守的に補修しました。背景値255を一括充填すると脳外背景へ漏れるため不採用とし、X・Y・Z各軸で同じ脳室ラベルに挟まれ、別ラベルと6近傍接触しない未ラベルvoxelだけを1回抽出しました。三断面の局所プレビューで既存ラベル内部の小欠損と確認した33 voxel（左側脳室14、右15、第三4、第四0）を、PR #14のproject-reviewed strict patchとして配布対象の教材ラベルへ適用しています。採用後圧縮ラベルSHA-256は `b75a24903ec08526b3e7f08df9efc8cee15af80d86bb96a821260913a2b176f3`、raw voxel SHA-256は `b1105fd3a11fab27d3b1bac60d4d989386e4ef49a41151f5b684d984f72aaaa9` です。ローカルには元NIfTI一式がなかったため、採用前の配布artifactを固定fixture化し、公式buildのapproved patch段階だけを決定論的に再実行しました。テストは採用前後でこの33 voxel以外が変わらないことを検証します。通常production previewで3脳室の同時表示と側脳室クイズを実確認し、全テスト304/304、型検査、通常／Pages build、Go/No-Go台帳監査に合格しました。これは専門家レビュー、脳室全体の境界確定、研究用ground truth、機関承認ではありません。詳細は [VENTRICLE_CAVITY_AUDIT.md](VENTRICLE_CAVITY_AUDIT.md) を参照してください。

同日、M2の最小単位として、共同制作ページへ脳室系の3Dモデル方針A/B比較pilotを追加しました。現行同一格子の左右側脳室＋第三脳室と、既存標本・アトラス頂点・ラベルを使わない寄稿者作成の模式案を、同じ回転・視点・色・表示ON/OFFで比較します。Bは常に「模式・専門家未確認」「実標本由来ではない」と表示し、通常教材・ラベル・由来台帳・クイズを変更しません。比較用chunkと7,980 bytesのmeshは明示的に開くまで取得しません。Chrome 151でPC・390 px相当の開閉、共通操作、フォーカス復帰、横overflow 0を確認し、canonical全経路156/156、初回payload 26/26、全テスト217/217、型検査、通常／Pages本番ビルドに合格しました。評価7項目と未確認事項は [MODEL_STRATEGY_COMPARISON_AUDIT.md](MODEL_STRATEGY_COMPARISON_AUDIT.md) に記録し、採否は専門家・学習者レビュー待ちです。

2026-08-24、比較pilotの発見性を改善し、共同制作ページ冒頭へ「M2・寄稿者向け試作」の案内と、direct/reload可能な専用URL `#workspace/collaborate/model-strategy` を追加しました。通常の共同制作ページはCanvas 0・比較資産0のまま、専用URLだけがCanvas 2と比較用3資産を取得します。Chrome 151の `http://127.0.0.1:4312` で案内からの開閉、直接表示、reload、起点focus復帰、390 px相当の一列表示と横overflow 0を確認しました。canonical route監査は27経路×3幅×direct/reload＝162/162、cold初回payload監査は27/27に合格しました。A/Bは引き続き「模式・専門家未確認」で、採否は変更していません。

同日、専門家レビューを後日まとめて行えるよう、専用URLへ7項目×A/B採点の端末内下書きとJSON書き出しを追加しました。氏名・メール・所属は収集せず、送信機能もありません。JSONは `local-unsubmitted-draft`、`not-submitted`、`not-recorded`、`not-claimed` を固定し、`scripts/audit_model_strategy_review.mjs` が項目・点数・完了度を再計算して個人情報fieldや送信・採用・expert完了への昇格を拒否します。Chrome 151の `http://127.0.0.1:4313` で入力、reload復元、書き出し、小画面を確認し、修正後console error/warning、loader、UI error、横overflowは0件です。最終route 162/162、cold payload 27/27に合格しています。これはレビュー準備で、実際の専門家・学習者評価や採否ではありません。

同日、自由観察のPapez回路を由来別6段階のステッパーへ拡張しました。海馬・乳頭体・視床だけ既存クイズ断面ラベルを表示し、脳弓は模式3Dのみ、帯状回・海馬傍回・嗅内野はアトラス3Dのみです。乳頭体には原画像由来3Dメッシュがないため「断面ラベルのみ」とし、旧模式乳頭体で代用しません。視床は全体ラベルで、前部核は未分節と明記します。Chrome 151の `http://127.0.0.1:4314` で6段階、再生、最終停止、別回路への切替を実操作し、route 162/162、cold payload 27/27に合格しました。新規asset request、mesh、voxel、経路線はありません。視覚路ステッパーはID36–38未分節のため保留し、専門家レビュー待ちです。

## 2. 取得とブランチ

Git、Node.js 22以降、npmをインストールしたPowerShellで実行します。

```powershell
git clone https://github.com/bonnginn/brain-practical-navi.git
cd brain-practical-navi
git fetch origin
git switch main
git pull --ff-only
git status
git log -5 --oneline
git log -1 --oneline
npm install
```

PR #14はmerge済みです。新しい作業は、まずmainが `6f13cd58` 以降であることを確認し、mainから新しい作業ブランチを作成します。既存のWindows作業フォルダを使う場合は、未コミット変更を確認してから `git pull --ff-only` します。上書き・resetはしません。ユーザーの明示承認なしにmainへマージせず、公開サイトも更新しません。

通常は環境変数なしで動作します。意見フォームを変更する場合だけ `.env.example` から `.env.local` を作ります。`.env.local` はコミットしません。

## 3. 起動と基準検証

```powershell
npm test
npm run build
npm run dev -- --host 127.0.0.1
```

公開α refreshでは自動テスト404/404、TypeScript、通常／Pages本番ビルド、source／dist権利監査、GitHub Actions、公開27経路162/162件が成功しています。テスト件数は追加監査ごとに増えるため固定値とせず、現在の全件結果を再実行して確認してください。Viteが表示したURLをブラウザで開いてください。

- 公開アプリ: https://bonnginn.github.io/brain-practical-navi/
- 対応ソース: https://github.com/bonnginn/brain-practical-navi

## 4. 直前までに完了したβ向け変更

- 配布対象データを139.9 MiBから78.5 MiBへ削減し、100 MiB上限の自動テストを追加。
- 血管、脳神経、脳底・深部・溝、局所標本を必要時読込へ変更。
- 断面の通常画面に、ラベル由来を表示。
  - `標本同一格子・手動分節`
  - `アトラス照合・試作`
  - `画像誘導・試作`
- 由来・確度・専門家確認欄を `STRUCTURE_PROVENANCE.md` に集約。
- アトラス取得失敗時に、失敗したキャッシュを破棄してその場で再試行できるようにした。
- 自由観察へ「視覚路」「Papez回路」「大脳基底核回路」の経路観察プリセットを追加。既存構造をまとめて選ぶ模式表示で、教科書本文の代替にはしていない。
- クイズの今回の誤答一覧から、対象構造を着色した正確な観察画面へ戻れるようにした。
- 手動セグメンテーション差分JSONへ、左右、根拠、確度、`unreviewed`状態を追加。旧差分との互換性は維持。
- 差分適用監査と複数差分の競合検査スクリプトへ上記メタデータを反映。

## 5. Windows側で最初に行うマイルストーン

### M1: 実ブラウザ回帰と性能実測

Windows側でブラウザ操作が使える利点を最優先します。

1. 全経路を直接URL、アプリ内遷移、再読み込みで巡回する。
2. 通常デスクトップ幅、1366 × 768、760 / 761 px境界、390 px前後で確認する。
3. クリック、ドラッグ回転、ホイール拡大、複数選択、全解除、着脱、断面スライダーを実操作する。
4. DevToolsのNetworkとPerformance/Memoryで、初回転送量、再訪時転送量、初回描画、メモリを記録する。
5. 黒画面、空着色、重複部品、遊離ポリゴン、無反応ボタン、文字切れ、観察対象を隠すUIをIssueまたは監査表へ記録し、非解剖学的な不具合は修正する。

結果は `PRESENTATION_AUDIT.md` と `PERFORMANCE_AUDIT.md` へ、環境、URL、画面幅、再現手順、修正コミットとともに追記します。

2026-08-14時点で、M1の全経路回帰、代表経路の性能実測、読込進捗・一括再試行、共通操作ガイドまで完了しています。操作ガイドは `#workspace/help` の永続URL、キーボードフォーカス、390 / 760 / 761 pxの狭幅表示をWindows実ブラウザで確認済みです。20構造の断面・透過3D同時表示時に見つかった旧メッシュ面数の互換問題も修正し、透過・単独表示・後脳脱着を実操作しています。小画面の断面実習は3D比較を必要時読込とし、初期データセットから左右脳表17.5 MiBを外しました。PCでは従来どおり2方向3Dを同時表示し、表示切替も実操作しています。断面クイズには1断面ずつの送り／戻しを追加し、通常幅と390 pxで表示値・見出し・Canvasの同期を確認しました。標準クイズは同一格子の公開手動分節だけに限定し、位置照合・画像誘導・脳表問題を既定OFFの試作枠へ分離しています。内包は隣接する橙色の基底核群と区別できる淡色へ変更し、冠状断と透過3Dで確認しています。断面・編集ツールでは離脱後に大容量画像キャッシュへの参照を解放し、再訪時にも各Canvasが読込エラーなく復帰することを確認しました。権利監査では全配布データを機械可読マニフェストへ対応づけ、公開画像の非転載通知を追加し、解析ビーコンを公開HTTPS本番ホストだけへ限定しました。共同制作はForm・Issue・PRの3入口へ分離し、未ログインのForm経路を送信直前まで確認しました。自動テスト、型検査、本番Viteビルドは本ブランチの最終状態で再検証します。

追記: スマートフォン専用UIは、幅だけでなく `hover: none` と `pointer: coarse` を満たす端末だけへ適用する実装へ整理しました。Chrome 151のローカル通常production preview `http://127.0.0.1:4198` で、coarse touch phoneの5導線dock、single settings dialog、sections rail操作、segment編集Canvas非生成、fine-pointer狭幅のcompact desktop維持を確認しました。coarse 26経路52/52、fine/non-touch 26経路×3幅×direct/reload 156/156に合格しています。公開URL、物理端末、実機タッチ、Safari・別ブラウザ、別GPU、専門家レビューは未確認です。内側側頭葉の海馬采・鉤の表示除外判断は [MEDIAL_TEMPORAL_AUDIT.md](MEDIAL_TEMPORAL_AUDIT.md) に、phone UIの詳細確認項目と記録は [MOBILE_UI_AUDIT.md](MOBILE_UI_AUDIT.md) に分離しています。

### 2026-08-23 側脳室ブロック context ON 性能同期

Windows 11／Chrome 151.0.7922.170／Node 24.19.0、ローカルpreview `http://127.0.0.1:4204/` で、既存31件＋context ON 6件の性能マトリクス37/37件を確認した。PC 1366×768、tablet 1024×768、390×768相当のcold/warmを対象に、baseとONのencoded bytes・unique request count・stable time、ON stable時のsettled backing storage、操作全体のsamplePeak backing storageを別フィールドで保存した。全件Canvas `1→2→2→1`、loader／UI／console／request error、overflow、WebGL fallbackは0件。warm primeはベース画面だけで、context assetは初回ON時に取得した。結果は `work/performance/performance-suite-block-context-final-v2-2026-08-23.json`、値の詳細は [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md) を参照する。390 pxは `mobile:false` のデスクトップemulationでclientWidth 375 px。物理端末、公開ネットワーク、別GPU・別ブラウザ、解剖学的妥当性は未確認である。

追記: 同じ初期OFFの位置コンテキストを教材内8ブロック標本へデータ駆動で拡張した。既存 `material: specimen` メッシュと既存 plane / position だけを使い、後脳標本は既存3部品をまとめて遅延読込する。新しい形状・切断幅・摘出順・実習手順は追加していない。通常production preview `http://127.0.0.1:4230/` で、Codex in-app BrowserのPC相当8/8件とChrome 151の390×768デスクトップemulation 8/8件を確認し、全件Canvas `1→2→2→1`、loader／UI／console／request error、横はみ出し、WebGL fallbackは0件だった。標本切替時はOFFかつ全脳表示へresetした。物理端末、公開URL、別GPU・別ブラウザ、専門家レビューは未確認である。契約と監査範囲は [BLOCK_CONTEXT_AUDIT.md](BLOCK_CONTEXT_AUDIT.md) を参照する。

性能追記: `http://127.0.0.1:4232/` で基礎31件＋8標本×3幅×cold/warmのcontext ON 48件＝79/79件を保存した。計測用ChromeだけService Workerを迂回し、48件すべて7 request／24,795,951 byte、Canvas `1→2→2→1`、error／loader／overflow／WebGL fallback 0。安定時間最大828.9 ms、settled backing最大61,288,760 byte、sampled peak最大240,644,605 byteで、実資産statと固定上限を使う独立監査にも合格した。結果は `work/performance/performance-suite-block-context-all-specimens-2026-08-23.json`、監査は `work/performance/block-context-performance-audit-all-specimens-2026-08-23.json`。追加7標本の保存済み性能値は完了し、物理端末、公開URL、別GPU・別ブラウザ、専門家レビューは未確認のままである。

2026-08-24、8標本の形状を一律に変更せず、ロードマップが先行対象として挙げる側脳室、レンズ核・投射線維、脈絡叢、内側側頭葉を「β重点4」、残る4標本を「発展観察4」として左レールと選択中解説へ表示した。これは観察導線だけの区分で、実習頻度、由来、確度、専門家レビュー、品質の順位ではない。全8標本、既存番号、hash、初期標本、部品・代表断面・Canvas契約を維持する。Chrome 151で全8標本を順に確認し、canonical route 162/162、cold payload 27/27に合格した。詳細は [BLOCK_SPECIMEN_PRIORITY_AUDIT.md](BLOCK_SPECIMEN_PRIORITY_AUDIT.md)。

同日、β重点4だけへ既存部品の確認ガイドを追加した。各lessonの既存layerを1件ずつ単独表示し、最終段階だけ全layerを表示する。開始前の手動選択は終了・標本切替・block workspace離脱・unmountで復元し、mesh、voxel、label、plane、rotation、camera、color、provenanceは変更しない。これはUI上の部品確認順であり、解剖・摘出順や実習手順ではない。Chrome 151 production previewでPCのfocus4全件、active切替cleanup、発展4のguide count 0を確認し、canonical route 162/162、cold payload 27/27に合格した。さらに390×768 coarse-touch相当で側脳室4、レンズ核・投射線維7、脈絡叢3、内側側頭葉3の全single layer、4 final all、終了後manual復元を実タッチし、独立validator failure 0だった。物理端末・タッチ、公開URL、別browser／GPU、専門家レビューは未確認。詳細は [BLOCK_GUIDED_OBSERVATION_AUDIT.md](BLOCK_GUIDED_OBSERVATION_AUDIT.md)。

中心操作追記: Chrome 151の通常production preview `http://127.0.0.1:4236/` で、脳表・水平断・自由観察・クイズ×PC 1366×768／横向きタブレット幅1024×768の8/8件、計40操作を確認した。独立validatorが実測viewport、操作前後、5問queue生成、回答対象から導出した復習先、error／loader／overflow／WebGL fallbackを再計算し、全件に合格した。結果は `work/browser-audit/core-interactions-pc-tablet-2026-08-23.json`、契約は [CORE_INTERACTION_AUDIT.md](CORE_INTERACTION_AUDIT.md)。両条件は `mobile:false`・`touch:false` のデスクトップエミュレーションであり、物理タブレット、実機タッチ、公開URL、別ブラウザ・GPU、画素・解剖学的妥当性は未確認である。

### 2026-08-23 coarse-touch phone中心操作

Chrome 151の通常production preview `http://127.0.0.1:4330/` で、Windows 11 Home／Node 24.19.0のローカル実ブラウザに、390×768、DPR1、`mobile:true`、`touch:true`、最大同時タッチ5、縦向き、`hover:none`、`pointer:coarse`を設定した。最終結果 `work/browser-audit/phone-core-interactions-v18-focus4-guided-2026-08-24.json` は、下部dock、脳表・左外側面、水平断、復習、β重点4ブロック標本ガイドの5 journeyを実タッチイベント列で確認し、`allPassed: true`、独立validator failure 0となった。blocksでは4標本をfresh direct routeで開き、合計17 single-layer段階、4 final all、段階番号、終了後manual layer復元を含む。Solレビュー後のvalidatorはsummary/probe、touch geometry／primaryTouchId／target・touch ID、tap 1→0／drag 1→1→0のtouchPoints、sequence、実設定遷移を独立検証する。loader、UI／console／request error、横overflow、WebGL fallbackは0件だった。v12／v13の失敗artifactは成果根拠に含めない。

これはcoarse-touch emulationによるローカル導線・状態遷移の確認であり、スマートフォンUI全体のβ完了、画素・解剖学的妥当性、専門家レビューを意味しない。物理スマートフォン、実機タッチ、Safari・別ブラウザ、別GPU、公開URL・公開回線、インストール済みPWAとホーム画面追加後の起動は未確認である。詳細は [PHONE_CORE_INTERACTION_AUDIT.md](PHONE_CORE_INTERACTION_AUDIT.md) と [MOBILE_UI_AUDIT.md](MOBILE_UI_AUDIT.md) を参照する。

### M2: β公開条件の機械化

- 主要経路の表示条件とURL復元をテストで固定する。
- クイズ対象の着色面積、未確認構造の通常問題除外、断面スライダー操作を監査する。
  - 2026-08-24、`cn2`追加後の41 target×3幅＝123/123件がChrome 151で合格した。半透明神経血管のdepth・描画順・alpha合成を独立再計算し、PCAと`cn2`を含む着色変化、解除、完全再現を確認した。証拠は `work/browser-audit/quiz-target-visibility-cn2-v2-2026-08-24/report.json`、詳細は `QUIZ_TARGET_VISIBILITY_AUDIT.md` に保持する。専門家による形状・境界・問題採否の確認は別途必要。
- 配布物全体だけでなく、トップ、脳表、断面、各局所標本の取得量予算を再現可能なスクリプトへする。
- 初回画面の取得量を経路別に自動集計する監査スクリプトは完了。Windows 11／Chrome 151.0.7922.170／Node 24.19.0、ローカルpreview `http://127.0.0.1:4211/`、requested desktop 1366×768のcold loadでcanonical 26経路を測定し、26/26件、topology 0、console／request／UI error・loader・overflow・WebGL fallback 0。圧縮pial物理パスだけを要求し、raw要求は0件だった。結果は `work/performance/initial-route-payload-audit-pial-gzip-2026-08-23.json`、設計とroute表は `PERFORMANCE_AUDIT.md` に記録した。sectionsは26,441,013 Bで旧34,688,033 B（34.69 MB）から23.8%減ったが、旧値は履歴として保持する。
- 読込中の対象が分かる表示を整え、失敗時再試行を実画面で確認する。
- 「人が目視した項目」と「テストで保証する項目」を分ける。

### 2026-08-23 pial gzip 現在確認

`work/performance/performance-suite-pial-gzip-2026-08-23.json` は37/37件、関連stable-time回帰は1%未満、sampledPeak backing storage最大増加は2.0%（レビュー閾値25%）だった。`work/browser-audit/beta-route-audit-pial-gzip-2026-08-23.json` は26経路×3幅×direct/reloadの156/156件で、error／loader／overflow／WebGL fallbackは各0件だった。

同じ `http://127.0.0.1:4211` の視覚確認では、PCはcombined押下時Canvas 3、狭幅は初期section-only Canvas 1からcombined Canvas 3、2つの3D view描画、console warning/error 0を確認した。requested 1366 px時のin-app browser実効`clientWidth`は1035 px、requested 390 px時は284 pxであり、物理viewportの寸法としては扱わない。

### M3: 共同編集と公開運用

- 水平断編集の差分JSONを実際に1件書き出し、`--check`、競合検査、別ファイルへの適用を通す。
- 冠状断・矢状断を少なくとも確認用の照合表示として追加する。
- Google Form、GitHub Issues、Pull Requestの用途を入口画面と文書で一致させる。
- 権利、クレジット、免責、Cloudflare Web Analytics、対応ソースの相互リンクを公開画面で巡回する。
- βの既知の制限と変更履歴を作る。

### M4: 比較試作と専門家レビュー待ち化

- 現行再構成モデルと、知識ベースで一から造形する教育用モデルを、代表課題1つで小さく比較試作する。
- 最初から全脳を作り直さない。外側溝周辺、脳底、脳室系、内側側頭葉のいずれか1課題で比較可能にする。
- 同定しやすさ、位置関係、表面品質、操作、負荷、修正コストを同じ尺度で記録する。
- 解剖学的判断が必要な項目は、`STRUCTURE_PROVENANCE.md` の監修欄とGitHub Issueへ、対象URL・角度・構造・根拠・スクリーンショットを揃えて渡す。

## 6. 実画面の確認順

ハッシュURLは再読み込み後も同じ教材を維持する必要があります。

1. `#workspace/home`
2. 脳表観察
   - `#workspace/surface/lateral`
   - `#workspace/surface/superior`
   - `#workspace/surface/inferior`
   - `#workspace/surface/medial`
   - `#workspace/surface/arteries`
   - `#workspace/surface/nerves`
   - `#workspace/surface/free`
3. 断面観察
   - `#workspace/sections/coronal`
   - `#workspace/sections/horizontal`
   - `#workspace/sections/sagittal`
4. ブロック標本
   - `lateral-ventricle`
   - `diencephalon`
   - `radiations`
   - `commissural-system`
   - `choroid-plexus`
   - `medial-temporal`
   - `midbrain-section`
   - `hindbrain`
5. 復習テスト
6. 手動セグメンテーション編集
7. 利用条件・クレジット、意見送信、対応ソース

各画面で、選択した全構造の同時着色、透過／単独表示、全解除、回転、ズーム、スライダー、着脱を確認します。橋・延髄を外したとき、錐体・オリーブの補助ポリゴンだけが残らないことは要注意です。

## 7. 触る前に読む文書

優先順は次です。

1. `BETA_ROADMAP.md`: 作業台帳とGo / No-Go条件
2. `STRUCTURE_PROVENANCE.md`: 表示の由来、確度、専門家レビュー欄
3. `PERFORMANCE_AUDIT.md`: 配信量と未計測項目
4. `PRESENTATION_AUDIT.md`: 既存の画面幅別QA
5. `LECTURE_COVERAGE_AUDIT.md` と `LEARNING_SCOPE.md`: 学習対象
6. `SEGMENTATION_WORKFLOW.md`: 差分の作成・監査・統合
7. `DATA_AND_LICENSES.md`: 出典、改変、ライセンス
8. `CONTRIBUTING.md` と `GOVERNANCE.md`: 共同制作と採否

## 8. 重要な制約と注意点

- 神経血管、脳底ランドマーク、溝・裂、深部構造の一部は教育用の模式表示で、正解セグメンテーションではありません。
- 模式表示や画像誘導候補を、専門家確認なしに「検証済み」と表示しません。
- `プラクティカル 解剖実習 脳`、講義資料、標本写真、ウェブ図版は参照に留め、許諾なくアプリやIssueへ転載しません。
- BigBrain由来物を含む現在の完全版は CC BY-NC-SA 4.0 の非営利・継承条件があります。
- アプリコードはAGPL-3.0-or-later、自作教材文書はCC BY-NC-SA 4.0です。
- 既存データ、他の人の変更、作業用ファイルを破壊する `reset --hard` や一括削除をしません。
- 解剖学的に判断できない問題を、見た目だけで修正しません。表示区分を下げ、レビュー待ちにします。
- 小脳の表示平滑化は `MESH_VISIBILITY_AUDIT.md` に記録済みです。元の1 mmアトラス境界は変更せず、細かな小脳葉・裂と小脳核は専門家レビュー待ちのままです。
- ブロック標本はβでも「試作・未保証」を維持して構いません。

## 9. 残る確認・承認事項

### ローカルで整備済み（未承認）

- 冠状断・矢状断の同一ラベル照合表示は、`app/ManualSegmentationWorkbench.tsx`の直交断表示と、`ORTHOGONAL_REVIEW_BUNDLE_AUDIT.md`のローカル証拠束・独立監査まで整備済みです。この照合表示・証拠束による新たなラベル採用や境界確定、専門家確認は行っていません。既存のプロジェクト内レビュー済みID39・40と33 voxelの脳室補修は、その採用記録を維持します。
- 現行再構成モデルと知識ベース模式モデルの比較pilotは、専用URL、A/B操作、端末内レビュー下書き、`MODEL_STRATEGY_COMPARISON_AUDIT.md`のローカル監査まで整備済みです。専門家・学習者の採点、β本体への採否は行っていません。

### 残る外部確認・承認

- 公開URLの全27経路表示はChrome 151で162/162件を確認済みです。ただし、公開回線の性能、物理端末、別GPU・別ブラウザの性能計測は未確認です（ローカルWindows Chromeの基礎31件＋全8標本context ON 48件＝79/79件は完了）。
- 専門家による構造位置・範囲・連続性の確認。
- 管理者による権利文書、Google Form、公開画面をまたぐ最終実ブラウザ巡回は未完了です。
- スマートフォン専用UIのローカル親確認は完了（`MOBILE_UI_AUDIT.md`）。Chrome 151・`http://127.0.0.1:4198`で、coarse touch phoneの5件dock、native settings dialog、focus／背景scroll、sectionsの既存rail操作、rangeとpage scroll、segment直接URLのCanvas非生成を確認し、coarse 26経路52/52、fine/non-touch 26経路×3幅×direct/reload 156/156に合格した。fine-pointer狭幅ではphoneMode=false、dockなし、既存sections／segment workbenchを確認した。公開URL、物理端末、実機タッチ、Safari・別ブラウザ、別GPU、専門家レビューは未確認である。詳細な画像・probe・監査JSONは `MOBILE_UI_AUDIT.md` を参照する。
- 専門家レビュー準備キューは `ANATOMY_REVIEW_HANDOFF.md` に沿った読み取り専用台帳で、provenance台帳のexpert pending 75件を共同制作画面へ表示する。2026-08-24、各カードへ1項目単位の構造化された端末内下書きを追加した。氏名・所属・連絡先・自由記述は保存せず、台帳全体・対象entryのSHA-256、固定3観察項目、固定懸念コード、未提出・未採用・expert未主張を独立検査する。古い台帳、JSON不正、保存障害、別タブ競合はfail closedとする。Chrome 151のローカル通常build `http://127.0.0.1:4332/` で連続変更、再読込復元、懸念コード必須、JSON書き出し表示、390 px相当の横overflow 0・44 px操作を確認した。最終canonical route監査は27経路×3幅×direct／reload＝162/162件に合格し、error／loader／overflow／WebGL fallbackは0件だった。これは準備記録で、専門家確認、本人性・署名、解剖学的妥当性、採否は未完了である。詳細は `ANATOMY_REVIEW_RECORD_DRAFT_AUDIT.md`。

2026-08-23追加: `ORTHOGONAL_REVIEW_BUNDLE_AUDIT.md` に、WindowsローカルのGit管理外 `work/anatomy-review/orthogonal-review-bundle-v3/`（固定入力SHA・BBS1寸法・ID33/39/40の全占有断面、ID39/40の外側断面、ID27のcrop内context-only、期待161 PNG＋manifest）を記録した。PNG／pixel SHA、空metadata、flat anchor、exact file/schema、link境界まで独立検証済みだが、`review.status=unreviewed` であり、ラベル本体・公開資産・ID36–38は変更していない。乳頭体付着部と視交叉・左右視索境界の解剖判断、専門家確認、公開URL・物理端末確認は残る。

公開環境のroute表示は `work/browser-audit/alpha-public-refresh-2026-08-24.json` の実測だけを証拠とし、物理端末、別ブラウザ・GPU、公開回線性能、β版としての公開判断へは拡張しません。

## 10. Windows Codexへ渡す開始指示

以下をそのまま新しいWindows側のタスクへ貼り付けられます。

```text
https://github.com/bonnginn/brain-practical-navi を取得し、WINDOWS_HANDOFF.md、BETA_ROADMAP.md、STRUCTURE_PROVENANCE.md を最初に通読してください。

目標は、専門家監修を必要としないP0・P1項目を自律的に監査・実装・検証し、解剖学的判断が必要な課題を、対象URL・角度・構造・根拠・スクリーンショットが揃ったレビュー待ち状態へ整備することです。1項目ずつ指示待ちにせず、WINDOWS_HANDOFF.md のM1から関連作業をまとめて進めてください。成果はmainから作る新しい作業ブランチとPRへ記録します。

開始時に `git fetch origin`、`git switch main`、`git pull --ff-only`、`git status`、`git log -5 --oneline` を実行し、mainから新しい作業ブランチを作成してください。npm test と npm run build を実行し、ブラウザ操作が使えるWindows環境では全経路の実画面回帰とNetwork/Performance計測を優先します。模式表示を専門家確認なしに検証済みへ変更せず、第三者の教科書・講義・標本画像をリポジトリやIssueへ転載しないでください。完了した作業はBETA_ROADMAP.mdと各監査文書へ証拠つきで反映し、テスト・ビルド・新しいPR更新まで行ってください。main統合・公開サイト更新・公開環境の確認は、管理者の明示承認なしに行わないでください。
```

## 11. 完了の報告形式

各マイルストーン終了時は、次だけを簡潔に残します。

- 修正した問題と利用者への効果
- 変更ファイルとコミット
- 自動テスト、本番ビルド、実画面確認の結果
- 公開URLとGitHub Actionsの結果
- 専門家・管理者・実機での確認が残る項目

β版への昇格は、`BETA_ROADMAP.md` のGo / No-Goを満たし、少なくとも1名の神経解剖学に詳しい確認者の記録を得た後に、プロジェクト管理者が決定します。
# English edition checkpoint (2026-08-29)

- English learner mode: `?lang=en`
- Japanese remains the default and canonical content source.
- Same learner structure: Home, surface, sections, blocks, quiz, help, feedback, status, and terms.
- Collaboration recruitment and contributor segmentation are not exposed in English mode; direct routes return to Home.
- Translation catalogue and route tests are in `app/english-catalog.json`, `app/EnglishLocalization.tsx`, `src/locale.mjs`, and `tests/english-edition.test.mjs`.
- Expert/native-language review and post-deployment device checks remain pending. See `ENGLISH_EDITION_AUDIT.md`.
# 2026-09-06 赤核のみ採用（後続更新）

ユーザーの修正依頼により赤核ID1・2を開発版で位置補正。現行compressed SHAは `cec9c331d2a8e77bba1e79226c1d630905f2b7e89db7032cdc6e3db0e114dca8`。左2887／右2888 voxel、差分2224。他ID不変、赤核block mesh同期。内部白帯は切り抜かず核全体の領域とし、灰白質・特定線維の確定とはしない。[採用記録](RED_NUCLEUS_REGISTRATION_ADOPTION.md)。下記の098edf…や全22未採用は以前の到達点。公開・main未変更。

## 2026-09-06 後続更新：手動22ラベルを開発版へ採用

前項の赤核のみ採用は履歴。現行は全22の位置補正版7ebed144…で、追加差分137,228 voxel、関連22 mesh同期済み。公開・main未変更。再現手順と残る問題は REGISTERED_LABELS_ADOPTION.md。次の作業で旧cec9…や098edf…へ戻さないこと。

## 2026-09-06 後続：模式神経・血管と内包の再評価

後交通動脈の接続修正、神経7項目と視交叉の注意説明、日本語・英語の同期まで開発反映。NEUROVASCULAR_TOPOLOGY_REPAIR.md。内包旧削除候補は221点が現行核へ変化しているため、そのまま適用しない。内包・脳幹の一括境界修復は未完了。

## 2026-09-06 継続中：脳幹の孤立40点の修正

最新：下端3385＋外表面の隙間620＝4005点を2領域の固定台帳（SHAfda26753…）から開発本体へ導入した。現行compressed50ded72a4a9b43e7c2c93b4bc5933b76680ab89e3e9eb7bb4f2cb5cfccc68d6c、rawfbfe92e8a80d8300c937732af476ac4964efbc34f097f4e60163d26c002caaf5、ID27=250508。全block mask差0、全Node508/508・Python118/118・TypeScript・通常/Pages build・Chrome152の3断面で新版要求/エラー0。BRAINSTEM_INFERIOR_SUPPORT_REVIEW.md、work/support-batch-full-*、support-batch-browser-*参照。公開なし。

次の466点（側縁242・背側224）はBRAINSTEM_LATERAL_DORSAL_REVIEW.mdに記録済み。57＋52面の全28枚を目視し、背側cropに旧版の別修正が残る事前検査失敗を受け、現行50deで背側13枚を作り直して全再目視。最新候補はwork/anatomy-review/brainstem-lateral-dorsal-v2/labels.bin.gz、e7e61a70…/raw816be7e8…、固定差分SHAa0909129…、全mask差0、独立Node2/2成功。本体は未変更。次はこの差分の導入と統合検証、その後残る他の候補・腹側不足・視覚路へ継続。stage v1は出力前の停止で有効成果物なし。以下は過去の記録。

最新（この段落を優先）：正中表面4点を本体へ導入、現行compressed732bdf1996109926c516d5114d8861e338f22c414ec80804b7cd096885a25ef2、raw487250d2e46e5cbd7aff0991377bf1bd42018aceadd3163def582acef720224d、ID27=254513。全Node504/504・Python118/118・型検査・通常/Pages build・実Chrome3断面で新SHA要求/エラー0を確認。初回全Nodeの旧監査JSON参照3件の失敗は旧成果物を残して参照先を更新しv2全合格。MIDLINE_SURFACE_REPAIR.md参照。

次に主成分のraw255を目視候補として調査（6358点333成分、一括削除不可）。上位4成分の代表三方向を全目視し、最大112番3385点を全隣接三方向78面20シートで全目視。画像組織下端の外へアトラスだけ延びる範囲なので未ラベルへ戻すstageを作成。BRAINSTEM_INFERIOR_SUPPORT_REVIEW.mdを読むこと。固定台帳SHA97a66140…、候補7602a273…/raw4503f996…、ID27=251128、全block mask差0、対象独立Node2/2成功。まだ本体未導入。prepare_brainstem_inferior_support.pyは入力fixture732b固定。次は上位620点（成分87）等の全隣接・直交断確認と差分の統合。332成分を確認済み扱いにしない。腹側不足・視覚路・他の未解決事項も継続。公開・main・commit/pushなし。以下は過去のチェックポイント。

最新チェックポイント：小脳側64点の開発統合2a73ff56…は全Node502/502・Python115/115・型検査・通常/Pages build・実Chrome152の5条件（断面3方向＋後脳block PC/phone）まで成功。CEREBELLAR_ISLAND_REPAIR.md参照。次のmid-low16点は8面2シートと広域3方向を目視し、外側空隙のY242・4点だけ27→0のstageを作成。12点は保持（うちY241の4点は境界不確定）。MIDLINE_SURFACE_REPAIR.md、prepare_midline_surface_repair.py、固定台帳SHA59f6aa6d…、候補732bdf19…、raw487250d2…を参照。全block mask差0、対象Python3/3・独立Node2/2成功。4点は本体未導入。次はこの固定差分の本体導入と統合確認、その後も主成分の境界・腹側不足・視覚路等へ継続する。以下の旧「次工程」は履歴。

最新後続：小脳側64点を開発本体へ導入済み。現行compressed2a73ff567741aa9b7965eef645765bfc0d87b3cad80d789d5512cabf4ffc2ed2、raw8276db63377bb3f8738d8b062678b46d1af8f0b09c9691f5caf4d5fd5e1783e3。ID27=254517、28=737872、29=748980。36点を小脳へ再分類、28点を未ラベルへ（うち24点は帰属未確定）。hindbrain/pons-medullaとcerebellumの2 meshも同期。CEREBELLAR_ISLAND_REPAIR.md参照。以下の未導入記載は履歴。残るleft-upper6点は保持、mid-low16点は点別評価を続ける。主成分の境界・腹側欠落・視覚路なども未完了。公開・main・commit/pushなし。

次工程（64点）：全点の濃淡を隠さない三方向32面・8枚を全目視し、小脳へ36点（28へ16／29へ20）、未ラベルへ28点（明瞭な空隙4＋帰属未確定境界24）の固定差分を作成済み。本体はまだ82384fa6…、出力候補2a73ff56…はwork/anatomy-review/cerebellar-island-adoption-v3/labels.bin.gz。採用台帳SHA85bc0bdf…、mesh台帳SHAb5db21e6…。影響2部品はhindbrain/pons-medullaとcerebellum、旧部品の完全再現を確認済み、新部品はwork/anatomy-review/cerebellar-island-meshes-v2/。XYZ/ZYX影響判定バグを修正し、過去83点のmask差0も再検証（16/27点台帳SHA不変）。CEREBELLAR_ISLAND_REPAIR.mdを通読してから、volume・2 mesh・metadata・現行SHA監査・テストを一体で導入すること。v1/v2候補や失敗mesh出力を使わない。公開なし。対象Python3＋軸順2、独立Node再生/画像coverage2成功。新統合後の全テスト・ブラウザは未実施。

27点統合の検証完了：Node全499/499、Python全109/109、型検査・通常/Pages build、実Chrome152の断面3方向（1366/390/1366px）で新版82384fa6…読込とエラー0を確認。work/three-island-full-node-v2.log等を参照。接触数の旧期待値で失敗した初回ログは保存し、差分点から33:3面、39:11面、40:7面の減少を独立検証して修正した。次は64点の小脳側帰属確認。残る他の構造監査は未完了、目標は継続。

最新：27点も固定installerで本体へ導入済み。現行compressed82384fa6961b4eb6aa272aa556f76febd4027cf1f67937504ee227ac0a8e4726、raw4550dd6ddf6272dde98253f1fc18484b48dd06970a5ee0a42ebfb382a22a7ac8、ID27=254581。小片除外は計83点。乳頭体・ID33自体は保持するが接触数が減少し、独立再計算で監査更新（ID27↔39:58、40:31、33:29）。以下の「27点は未適用」は履歴。次は64点の小脳側帰属と空隙を点別評価する。脳幹腹側不足・主成分境界・視覚路等の残る課題も未完了。公開・mainは変更しない。

次工程用追補：27点の修正は固定台帳とwork出力まで作成済み。本体は189fbd26…のまま。台帳brainstem-three-islands-adoption-2026-09-06.json SHA9c7b14f4…、出力82384fa6…、raw4550dd6d…、全block Part.mask差0、関連Python11/11・独立Node再生/カバレッジ2/2成功。pre-three-islands-189f fixtureを保存した。次は27点の本体導入・現行SHA監査同期・検証。その後、広域18比較を全目視した64点（左右low/inferior）を小脳組織側と空隙に点別分類する。画像確認はBRAINSTEM_ISLAND_REPAIR.md末尾。left-upper6点は保持、mid-low16点は混在のため保留。公開しない。

最新後続：さらに三方向全24比較で確認した左右16点を除外。現行は189fbd26080448aa7813918dae6f17bdfed11a5ca15a12211cadfa3a6a5723d8、raw0e3e5f0e…、ID27=254608。c58f8beb…はpre-paired-islands fixtureに保持。固定台帳とinstallerで可逆再生、既存全block part.mask差0。残る9小成分も121比較・34画像を全目視し、次の明瞭な除外対象はleft/right-posterior各8点＋mid-upper11点の計27点。本体未適用。他86点は組織と重なりや境界混在があるため一括削除不可。BRAINSTEM_ISLAND_REPAIR.mdの最終節に全9成分の採否理由。公開・main・commit/pushなし。以下のc58f…は直前stageの履歴。

腹側中脳の再点検63比較から、別問題として上端の孤立40点を発見。20局所比較を全て目視し、27→0をプロジェクト採用判断。BRAINSTEM_ISLAND_REPAIR.md と固定台帳を参照。固定台帳を再生して開発版本体へ導入済み、現行はc58f8beb…、raw47965fba…。7ebed144…は修正前fixtureとして保持。全ブロックPart.mask比較は差0、mesh更新不要。専門家レビュー・脳幹全体修復完了ではない。公開しない。
# 2026-09-07 側脳室630点の開発適用チェックポイント

現在label compressed SHA b473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567、raw 3c295bb532aacc1654f44fd20d2c6524644ef42e83d0ac44f8078607bffaf922。左64283/右63636、今回630点・系列累計1203点。6mesh同期、旧7c54/6meshをfixture保存、lateral-remaining-adoption-2026-09-07.jsonに可逆記録。全候補個別308面＋変化する統合124面を目視。対象9テスト/typecheck/build成功。全suiteはwork/lateral-remaining-full-node-v1.log（session82411）実行中なので同じhandleを確認し、静かなだけで再起動しない。新SHAの客観監査JSON、実4345ブラウザ検証、残る文書同期が次。公開/main未変更。脳弓など全目標は未完了。詳しくはLATERAL_VENTRICLE_FRINGE_REVIEW.mdの先頭。
