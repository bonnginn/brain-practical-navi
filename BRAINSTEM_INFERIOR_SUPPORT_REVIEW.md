# 脳幹下端の画像支持範囲 — 2026-09-06

## 調査を主成分へ拡大

小さな孤立片だけでなくID27全254,513点を対象に、raw255の領域を「目視候補の抽出」に用いた。6,358点・333成分を得たが、白色は空隙・画像欠損・アーチファクトを含み得るため、分類や一括削除の規則とはしない。

audit_brainstem_bright_regions.pyで上位4成分の代表三方向12比較を生成し、4画像をAIがすべて目視した。work/anatomy-review/brainstem-bright-regions-v1/report.jsonに全333成分の件数と範囲を記録。上位は3,385点（下端）、620点（下部の横方向の空隙）、242点（上部側縁）、224点（下部背側の縁）。後3成分は代表断だけであり、まだ修正しない。腹側中脳の欠落は別件として未解決。

## 下端3,385点の全断面確認

成分112、X181–210/Y165–192/Z0–14を選び、周囲1枚込みのX180–211（32面）、Y164–193（30面）、Z0–15（16面）、計78比較を20シートへ生成した。Z=-1は画像外なので存在せず、補間・架空画像を追加していない。work/anatomy-review/brainstem-bright-112-full-v1/region-112-00.png～19.pngの全20枚をAIが目視した。report SHAはda07660070e9e5e4cbb66dbd9322fde27b2205b9be8f4b1def66193e1a263d12。

対象は撮像組織の下端より下、またはその外周にあり、Z0–2は局所に組織像がなくてもアトラスの輪郭だけが残る。Z3以降は組織像が出現し、その外側に同じ候補が連続する。矢状・冠状全断でも組織下端より外へ延びることを確認した。ここでは3,385点だけを27→0とする修正案を作る。ゼロは「この画像で支持できない未ラベル」であり、献体に組織がなかった、ここが解剖学的な延髄と脊髄の境界、という意味ではない。

## 下端単独の差分（後続で下記2領域統合に含めて導入）

- 固定入力fixture：pre-inferior-support-732b.bin.gz、compressed732bdf1996109926c516d5114d8861e338f22c414ec80804b7cd096885a25ef2。
- 出力候補：work/anatomy-review/brainstem-inferior-support-adoption-v1/labels.bin.gz、compressed7602a2738831172aff70850f9be13f2578fe1c383696808b7d4d0c3d219234de、raw4503f996c43930de3180901ff9057ca212a71f29901e5a5d36b0cd4a8322ae07。
- 固定台帳：segmentation-patches/review/brainstem-inferior-support-adoption-2026-09-06.json、SHA97a661402005bd8874aeb8ffa2062b20516fb892595a226b49d17c0f629179aa。全座標、78面の画素変換・PNG SHAと判断範囲を保持。
- ID27 254513→251128。他のラベルは不変。全volumeの順逆変換を独立Nodeで確認し、全対象点が各三方向で一度ずつ現れることも検査した。
- 実際のZYX生成格子で全block mask差0。標本部品の変更は不要。

prepare_brainstem_inferior_support.pyはこの固定対象だけをworkへ出力する。原画像と記録のSHAを照合し、他のraw255成分には変更を広げない。現行開発本体732bdf19…は変更していない。専門家承認ではなく、主成分の全境界を確認済みともしない。次工程は他の上位候補の隣接・直交断確認と、固定差分の統合検証。公開・main・commit/pushなし。

## 外表面の隙間620点を追加確認し、2領域を開発版へ統合

上記「未導入」は下端単独stage時点の履歴。後続で成分87（X177–216/Y201–214/Z39–50）について、X176–217の42面・Y200–215の16面・Z38–51の14面、計72比較を18シートに生成し、region-87-00.png～17.pngをAIが全目視した。原画像の組織外にある横方向の隙間へ脳幹ラベルが張り出す。標本に見える表面の隙間という判断にとどめ、脳室・中脳水道という帰属や、正常な溝か標本処理による離開かという原因は確定しない。

図はwork/anatomy-review/brainstem-bright-87-full-v1/。固定画像台帳brainstem-surface-gap-image-review-2026-09-06.json、SHA59884655220520e74b6a3327e6906e5265962cce276c6395b7eb238f6bde2459。残る組織内の明るい境界や、他の白色成分へ閾値処理を拡張しない。

2領域の計4,005点を27→0とし、prepare_brainstem_support_batch.pyで全volumeの再生・復元と全ZYX block mask差0を確認後、install_brainstem_support_batch.pyで開発本体・metadataへ導入した。3,385点単独の7602a273…は中間検討版であって、配布本体へ単独適用していない。

- 固定統合台帳：brainstem-support-batch-adoption-2026-09-06.json、SHAfda267537a478ecda65b592ebeeb3fd75a6fe5551e8657cde8fd07ce657a5269。
- 現行compressed50ded72a4a9b43e7c2c93b4bc5933b76680ab89e3e9eb7bb4f2cb5cfccc68d6c、rawfbfe92e8a80d8300c937732af476ac4964efbc34f097f4e60163d26c002caaf5。
- ID27=250508。対象以外のラベル・標本meshは不変。旧732bdf19…をfixtureに保持し、現行SHA監査は新規support-batch JSONとして保存する。
- 独立Nodeで2領域の和集合、全格子順逆変換、現行metadata一致、620点すべての三方向カバレッジを検証した。統合後の全Node508/508・Python118/118・TypeScript・通常/Pages buildが成功。work/support-batch-full-node.log、work/support-batch-full-python.log。既存chunk-size警告は残る。
- Chrome152、http://127.0.0.1:4345、水平1366px・冠状390px・矢状1366pxで新50ded72a4a9b43e7のラベル要求を確認。全3件stable、loader・console/request/UI error・横overflow・fallbackなし。work/support-batch-browser-*.json。これは動作確認であり、画像境界の正しさや専門家承認を自動テストから主張するものではない。

これはAI支援のプロジェクト採用であり、専門家承認ではない。腹側中脳不足・その他の側縁や背側の候補も未完了。公開・main・commit/pushなし。
