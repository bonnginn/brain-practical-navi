# BLOCK_GUIDED_OBSERVATION_AUDIT

## 目的

β重点4の既存ブロック標本レイヤーを、学習者が画面上の部品確認順に一つずつ確認できる導線を監査する。対象は次の4標本に限定する。

- `lateral-ventricle`
- `radiations`
- `choroid-plexus`
- `medial-temporal`

残る`diencephalon`、`commissural-system`、`midbrain-section`、`hindbrain`は発展観察として既存UIを維持し、このガイドの対象にしない。8標本はすべて通常の標本観察入口から利用できる。

## 固定した表示契約

各標本の既存`blockSpecimens.layers`をデータ源とし、ガイド側に解剖学的な説明文や構造コピーを複製しない。既存layer順に、次の段階を導出する。

1. 既存layerを1件だけ表示する段階
2. 次の既存layerを1件だけ表示する段階
3. 全既存layerを表示する最終段階

最終段階の画面見出しは「全ての部品」とし、全layer noteを連結した長文は表示しない。stepの`name`、`note`、`source`、`layerKeys`は既存lessonから導出し、`src/blockGuidedObservation.mjs`のvalidatorで順序・重複・欠落・最終allを再計算する。

開始前の手動`blockLayers`を保存し、ガイド終了時、標本切替時、block workspace離脱時、unmount時に復元する。ガイドOFFでは従来の個別layer選択、選択だけ、すべて表示、標本context、route、Canvasを維持する。

画面には、この順番がUI上の部品確認順であり、解剖学的な順序・摘出順・実習手順ではないことを明示する。このガイドは由来、確度、専門家レビュー、品質の順位を示さず、mesh、voxel、label、plane、rotation、camera、color、provenanceを変更しない。

## 独立監査

`node scripts/audit_block_guided_observation.mjs` は、`app/page.tsx`の既存layer records、`src/blockGuidedObservation.mjs`、`src/blockPriority.mjs`、`scripts/audit_beta_routes.mjs`を別々に読み、次を検査する。

- β重点4の完全なキー、既存layer順、layer数、単独step数、最終allのキーとテキスト
- 発展4がguided contractおよびfocus-only UIへ漏れていないこと
- 開始OFF、段階数、前後移動、最初へ、終了、短い最終表示、UI確認順の注意書き
- 手動選択保存、step layer適用、終了・workspace/specimen cleanup
- 既存のCanvas、context、hash route、初期標本、標本メッシュ・voxel契約
- 昇格、promotion、dissection orderなどの禁止表現

2026-08-24の独立静的監査結果は次のとおり。

- `ok: true`
- 側脳室: 4 layer、5 step
- レンズ核・投射線維: 7 layer、8 step
- 脈絡叢: 3 layer、4 step
- 内側側頭葉: 3 layer、4 step
- ブラウザ確認前の静的監査: `ok: true`

関連unit testは、既存lessonからの導出、manual layer復元、development4非対象、UI静的契約、layer順・禁止語・route・focus UIのmutationを検査する。focused/statusを含む全testsは330/330、TypeScript`tsc -b`、通常build、Pages buildが成功し、`git diff --check`はCRLF警告以外問題なし。

親タスクのChrome 151 production preview `http://127.0.0.1:4316`で、β重点4について開始→各single layer→final all→ガイド終了後のmanual selection復元を確認した。側脳室ではactive途中の`diencephalon`への標本切替cleanupも確認し、発展4は全件guide count 0だった。PCではCanvas 1、loader／UI error／横overflow 0。canonical routeはPC・tablet・390 px相当のdirect/reloadで162/162、cold payloadは27/27で、記録はそれぞれ `work/browser-audit/beta-route-audit-block-guided-observation-2026-08-24.json` と `work/performance/initial-route-payload-block-guided-observation-2026-08-24.json` に保存した。390 px相当ではroute health／横overflow 0とCSS 44 px契約を確認した。さらに通常production preview `http://127.0.0.1:4329/`を390×768、`mobile:true`、`touch:true`、`pointer:coarse`相当にし、側脳室標本でdock→試作intro閉鎖→ガイド開始→次へ→終了をCDPの実タッチイベント列で確認した。開始時は`ventricular-cavity`単独、次は`caudate`単独、終了後は開始前の4 layer選択へ復元され、Canvas、loader、UI／console／request error、横overflow、WebGL fallbackにも異常はなかった。保存結果は `work/browser-audit/phone-core-interactions-v17-block-guided-2026-08-24.json` である。

## 未確認事項

この記録にはPC Chromeでのβ重点4ガイド操作と、390 px coarse-touch相当での側脳室ガイド操作、route health／overflow／44 px契約確認を含む。残る3標本の390 px実タッチ完走、物理端末・物理タッチ、公開URL・公開回線、別ブラウザ／GPU、インストール済みPWA、専門家による解剖学的妥当性は未確認である。
