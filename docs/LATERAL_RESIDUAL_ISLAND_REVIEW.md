# 側脳室の残存独立成分：原画像レビュー（2026-09-07）

対象版 compressed SHA `3c4b795d09819a7dc029ffe33fb80621fa6db81fbb7b0eb3507eaf432c29a887`。
原画像は登録済み BigBrain 300 µm、SHA `ebf0e88def96476d0a32ddaff6f28e37d7afd125dec724e6d8855b12357c7e86`。画像の左が原画像、右の赤が対象既存ラベル、水色が同じ脳室IDの既存ラベル。原画像では腔も白質も明るくなり得るため、明度だけでは帰属を決めない。

## 今回実際に見た範囲

以下7報告の `point-0-x.png`、`point-0-y.png`、`point-0-z.png` をすべて目視した（21コンタクト画像、各3連続面）。それ以外の重複参照画像は追加レビューとして数えない。対象10点の全有限体積を網羅した保証ではなく、代表直交断の評価である。先行の出力切り詰めで見えなかった画像は今回開き直した。

| prefix | 対象seed XYZ / 点数 | 判断・次の扱い |
|---|---|---|
| left-posterior-rim2 | 155,200,165 / 2 | 腔に面する細かな組織と明るい隙間の境界。単純な脳室外白質の飛び地とは異なる。除外せず保持、細部境界は保留。 |
| left-outer1 | 119,194,132 / 1 | 下角側の細い明るい腔の縁。有限格子で分離した可能性があり保持。 |
| left-rim-a1 | 145,198,157 / 1 | 腔から続く細い明るい帯の縁。孤立を理由に削除しない。 |
| left-rim-b1 | 149,200,161 / 1 | 同様に腔縁・組織との混在部。保持、周囲の一括充填もしない。 |
| left-medial-lower1 | 190,267,145 / 1 | 内側の大きな明るい空間との接続部。腔の存在とID23への帰属は別問題であり、外部接続の保留区域として残す。 |
| left-medial-upper1 | 191,263,159 / 1 | 内側の組織房に接する明るい隙間。左右/第三脳室への境界を座標だけで付け替えず保留。 |
| right-medial-upper3 | 201,263,164 / 3 | 内側の組織と腔の移行部。代表XYZでは白質内部の明白な誤島と断定できない。全3点の細部帰属は保留。 |

「保持」は正確な分節・専門家確認済みを意味しない。今回の画像だけで削除する根拠がないという判断である。

## 証拠位置と固定値

報告は `work/anatomy-review/<prefix>-after1092-native300-v1/report.json`。各報告内に元画像の由来、対象点、連続面番号、各画像SHAを保存している。

| prefix | report SHA-256 |
|---|---|
| left-posterior-rim2 | 4ebf106a236c275cd406de37a394399efbeb6bfd7b2f40de955e39252e519545 |
| left-outer1 | 79069cdcd496cdefb93f0bc77a7855e7163261e7eb88b728f71a5300b773a2ce |
| left-rim-a1 | e924a30b5b94188a1ec691fce3f7f8a3e667d463d893d986ba1126e678b65dba |
| left-rim-b1 | b5b083d792ce9680c782a345a453e3edb054c40ca3718a4ad4a604d36ad85b53 |
| left-medial-lower1 | 17caf7b8680342ad3e4015af38ebaf578d0750e394588f0ca0de566e789a78a0 |
| left-medial-upper1 | d565f869f40daa77d8df84e814bfa5baf992fdb2c160fd8451a473b685729695 |
| right-medial-upper3 | 1ed86da49a6fbba7550a15883bbab4c0ed6f8399a6f08d1a223d1e1f4f7a8955 |

## 製品への影響と残作業

### 開発本体への採用

統合検証完了：全561/561成功（161.7秒、session4118終了0）、型検査とsuite後の通常build終了0。HTTP200の展開後全byteと本体一致、dist圧縮byteと本体一致。右IABタブ3をreloadし水平断40/3Dを目視、読み込みエラーなし。全境界・全操作の再確認ではない。比較 `work/anatomy-review/posterior-ventricular-islands2-comparison-z156/comparison.png` を目視し、この面1点の白質内着色除外を確認。公開/mainは変更なし。以下の試験中は履歴。

後方2点のinstaller `--apply` 終了0。現行compressedは `31fae601d232e7d93ee4af5c02bde9d007e3e916d9f5905cfc1a364ac6856ddc`、23=80373/24=79082。固定変更前fixtureと採用JSON、断面2mesh、メタデータを同期。過去の「未採用」は下記履歴。現行SHA/count参照、視覚路/乳頭体の客観監査を同期し型検査成功。全Node試験 `work/posterior-ventricular-islands2-full.log` は実行中、終了後build/browserが必要。専門家レビュー・公開更新ではない。

### 後方2点の可逆差分（未採用）

`scripts/stage_posterior_ventricular_islands2.py` で原画像報告を固定し、23→0 [151,111,156] と24→0 [237,120,158] のみをstage化。全配列差分と逆復元を確認。stage `work/anatomy-review/posterior-ventricular-islands2-stage-v1/repair.json` SHA `639a0987e78af5a9e46b6db4fddd126c1c2a677612cb647563f6669f476833a0`。仮出力compressed `31fae601d232e7d93ee4af5c02bde9d007e3e916d9f5905cfc1a364ac6856ddc`、raw `10bea06b126606c294d7245b616b8fd6bf6c7ce7342ffa97f06e521606c101ca`、仮count23=80373/24=79082。

55ブロックmaskの差分はすべて0、影響report SHA `3129fb4de556349724851d55c8f937c8ecc732ec41c1d265ec1d42e54434031f`。断面用meshの準備とinstaller読み取り専用preflight終了0、ログ `work/posterior-ventricular-islands2-{meshes,section-meshes,preflight}.log`。専用差分/逆復元/全55maskテスト2/2成功。まだapplyなし、本体/右previewは3c4b795d。次は採用・参照同期・統合検証。局所2点の修正を全脳室完成と扱わない。

今回製品ラベル・3D・READMEの掲載機能に変更なし。右previewは3c4b795dのまま。先行レビューの後方2点（ID23 [151,111,156]、ID24 [237,120,158]）は脳回内部白質として除外候補、まだ可逆stage・本体採用なし。先行の下角4群20点も単純削除はしない。これで残存13群32点の代表画像を一巡したが、全脳室の境界確認完了ではない。次は後方2点を可逆差分化し、第三・第四脳室の残存項目へ進む。
