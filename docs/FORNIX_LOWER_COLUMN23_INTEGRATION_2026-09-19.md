# 脳弓柱の内部23点：統合記録

[原画像照合と候補](FORNIX_LOWER_COLUMN_DRAFT_2026-09-19.md)の全23点（左13・右10）を既存柱上部の下方へ続く内部として開発版に採用した。前交連より下方・乳頭体への連続性や全外縁は未完成。専門家確認ではない。

- 入力SHA：`2cdba3f15427af2fdb5b9bcdb9b1b9904f6fcc5199fc1bfa4b76b2bfbbe6e8da`
- 出力SHA：`c3ffa981882eb6faae62a9bd7ef35b420ae6e19155c27440b1e3789bf2e00c42`
- ID46：1,686→1,709点。左右6近傍成分907・802点。全23点が0→46で、他voxelは不変。
- 有効stage v3のbefore/afterから55ブロック部品・4高精細部品を再計算し、対象mask不変を確認。v1/v2は統合に使わない。
- installer：`scripts/install_fornix_lower_column23.py`。採用記録：`segmentation-patches/review/fornix-lower-column23-adoption-2026-09-19.json`。
- 原画像55図、5,500画素の独立照合、23点の各1,000サブポイント・8角点と可逆性の検証を採用根拠の補助として使用。明度・連結性だけの分類ではない。

「脳弓体部・柱上部（部分） / Fornix body and upper columns (partial)」という名称と部分収録の説明を維持する。新たな下方接続の完成とは表示しない。断面mesh・関連metadataを同期済み。公開更新は行わない。

統合後の全体試験・build・実ブラウザ確認を完了した。これは実装と表示の検証であり、未収録の解剖境界の完成や専門家確認を意味しない。


## 統合後の確認

- 新旧の脳弓採用試験4/4、関連Node83/83、型検査成功。
- 統合後の全体試験：Node628/628、Python440/440成功。
- 通常build `work/fornix-lower-column23-build` とPages形式build `work/fornix-lower-column23-pages-build` 成功。両出力の出典・配布検査も成功。14核構造の現行資産検査も通過した。
- プレビュー `work/september14-function-circuit-preview` を更新し、既存の原画像reviewページは保持した。
- 実ブラウザで左右の柱、2方向3Dの拡大、Y271の追加voxel `[193,271,145]` と `[199,271,145]` のクリック同定、日英の名称・機能・未収録範囲を確認。console errorなし。
- 最終ログは `work/fornix-lower-column-draft-20260919/` の `node-final.log`、`python-final.log`、`build.log`、`build-pages.log`、`rights-normal.json`、`rights-pages.json`、`nuclei-final.log`。

[ローカルの観察位置](http://127.0.0.1:4346/?review=fornix-lower-column23#workspace/sections/coronal/observe?v=1&revision=c3ffa981882eb6faae62a9bd7ef35b420ae6e19155c27440b1e3789bf2e00c42&position=58.27956989247312&visible=fornixBodyPartial&selected=fornixBodyPartial&layout=both&views=2&share=50)
