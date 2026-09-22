# 第四脳室上縁の補完 — 2026-09-15

## 採用範囲と根拠

第四脳室の上縁158点を補完する。内訳は未ラベル0から57点、脳幹27から101点を第四脳室26へ変更。範囲は教材格子XYZ [188,188,94]–[202,199,101]。側脳室・第三脳室・脳梁・内包・中脳水道部分は変更しない。

既存161候補は探索用の明度閾値で得た位置候補であり、それ自体を採用根拠にしない。登録300 µmの原画像・現行輪郭・候補輪郭を18図（軸位9、矢状4、冠状5）で確認し、native100 µmは採用範囲内の5参照位置×3方向×3隣接断＝45面を確認した。選択範囲は脳幹側の底と小脳側の屋根に囲まれる腔内および既存腔縁にある。Z111の3候補は外部空間側のため除外した。これはAIによるプロジェクト内採用であり、専門家確認ではない。

採否・確認した図のパスとSHAは `work/ventricle-gap-20260915-continuation/decision-adopt158.json`。登録画像全34図のうち確認した18図だけを採用記録に数える。nativeの採用輪郭図は `work/upper-fourth-native158-20260915/` の15図。別途生成した位置探索図は採用範囲の境界レビューに置き換えない。

位置関係の比較資料は [The Superior Transvelar Approach to the Fourth Ventricle and Brainstem](https://pmc.ncbi.nlm.nih.gov/articles/PMC3424008/)。第四脳室上部と上髄帆・上小脳脚の関係を参照し、別標本の境界や座標は転写しない。ブラウザ参考文献へ日英で追加した。

## 差分と表示同期

変更前圧縮SHA `d7fc87b5b18e1221c2979aeab9d6fefeefcfd4d353cfc78cab782930f32f8e29`、変更後 `055feec985e9b3a007e7856904cef0f36bbc7b00040061fdcba5d5d74820c491`。第四脳室9,008→9,166点、脳幹264,605→264,504点。左側脳室81,670、右82,250、第三11,837、中脳水道部分259点は不変。

断面3Dは第四脳室と脳室系全体の2メッシュ、ブロックは間脳組織、内側側頭組織、後脳の橋・延髄／中脳／第四脳室の5部品が変わる。直前に精細化した側脳室4部品の圧縮メッシュは同一バイトを保つ。可逆差分は `segmentation-patches/review/upper-fourth-gap-adoption-2026-09-15.json`、変更前資産は `tests/fixtures/*-pre-upper-fourth-gap.*` に保存する。

比較図は `work/ventricle-regional-20260915/upper-fourth-adopted-comparison-v2/x195-before-after.png` と `z98-before-after.png`。左から原画像／変更前／変更後。第四脳室は青、中脳水道部分は桃、第三脳室は緑、今回追加部分は黄色。画像上の範囲を示すもので、黄色を別の構造として追加したわけではない。

## 残る境界

Z102–110の薄い腔と部分体積の区間は採用しない。中脳水道との連続性は未完成。主成分間の最短中心距離は約8.86→6.58 mmになるが、この距離は解剖境界を決める根拠ではない。158点はすべて第四脳室の既存主成分につながり、主成分9,006→9,164点、既存の孤立2点は維持する。孤立点は原画像に照合せず一括削除しない。

下方の既存316候補、脳室間孔周辺597候補、脳弓・透明中隔など未収録構造も今回の完成範囲に含めない。次回は未確認の境界根拠を補い、同じ158点を再探索しない。

## 統合検証

型検査・通常build・GitHub Pages形式build成功。4346の出力 `work/september14-function-circuit-preview` を更新した。矢状断X195で第四脳室と中脳水道部分の同時表示、断面と1方向3Dの描画、console warning/error 0を実ブラウザで確認。ラベル・第四脳室／脳室系断面3D・後脳ブロック第四脳室のHTTP配信バイトはpublic資産と一致（`work/ventricle-gap-20260915-continuation/served-assets.json`）。

全体試験で測定metadataの更新漏れを検出し、既存の `refresh_segmentation_measurements.mjs --write` で現行ラベルと組織画像から再計算した。脳室系185,182点、符号化された非背景画素との重なり20,463点。これは画像符号値の測定であり、腔の解剖学的正しさを証明する値ではない。測定更新後に両形式buildも再生成した。

全Python405件を導入後に1回実行し402件成功、3件は現行入力SHA・過去の脳幹集合との比較で失敗。現行生成ツールのSHA／脳幹点数を更新し、歴史照合を復元fixtureに固定した後、対象32/32成功（`python-full-after-install.log`、`python-affected-final.log`）。新しい試験は復元fixture・導入record・現行ラベルで実行でき、ローカル原画像に依存する採否記録の照合だけ、資料がない環境では明示的にskipする。新たな独立metadata試験1件も対象群に含むため、全体405件をそのまま最終総数とはしない。

全Nodeの初回は611件として集計され587成功・24失敗（原画像照合bundleのファイル初期化失敗を含む）。過去のmeshをたどる補助処理の重複を取り除き、現行SHA／点数と合成patch fixtureを更新した。fixtureの対象voxelは変更前後で不変と確認し、歴史の採用記録は変更しない。失敗対象を含む117件を再実行し113成功、残る4件は合成fixtureの古いSHAが原因で、更新後にブラウザ関連79/79成功。別途、aqueduct・roof8・third-inferiorの8/8、採用・参考文献など12/12も成功。未解消失敗0。全件を一度に成功で再実行したという意味ではない。

初回Nodeログは `work/ventricle-regional-20260915/node-full-after-upper.log`、対象群は同フォルダ `node-upper-targeted-final.log` と `work/ventricle-gap-20260915-continuation/node-remaining-final.log`、`node-owned-three.log`、`node-rendered-final.log`。ローカル開発のみで、新しい公開更新は行わない。
