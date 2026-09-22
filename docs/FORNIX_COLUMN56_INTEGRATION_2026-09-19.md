# 脳弓柱上部内部56点：採否と統合

## 画像判断

[58候補の作成記録](FORNIX_COLUMN_INTERIOR_DRAFT_2026-09-19.md)の未確認100 µm断面56図を確認し、全59図の隣接水平断・直交断の照合を終えた。原画像と候補の拡大比較は `work/fornix-column-interior-draft-20260919/inspection/`。元の全範囲図を保持し、拡大比較はその候補周辺を切り出したもの。

右側 `[197,270,154]`・`[197,270,155]` はnative100 Z577〜583で内側・後方の組織端に接する。40 µmの単独候補表示X577・Z710・Z720・Y294でも隙間際のvoxel端を確認し、今回は追加から除外した。濃さだけによる分類ではなく、組織と間隙の外縁への重なりを理由とする。除外2点を「組織がない」と確定したわけではない。

残る56点（左31・右25）は、既存ID46から下方へ続く左右の柱上部の内部として採用する範囲に選んだ。前交連・第三脳室との位置関係を同一標本で追い、広い前方付着部と正中間隙は含めない。収載端は範囲の区切りであり、真の解剖境界ではない。柱下部、脚、乳頭体・海馬との連続性は未完成。判断はAIによるプロジェクト内の判断で、専門家確認ではない。

## 可逆差分とモデル

- 入力ラベルSHA：`cb0e727292c6d677e26063a506b07dee793a7b5058f6bf8fb820d0dfbc106c74`。
- 出力ラベルSHA：`2cdba3f15427af2fdb5b9bcdb9b1b9904f6fcc5199fc1bfa4b76b2bfbbe6e8da`。
- 全56点が0→46。ID46は1,630→1,686点、左右の6近傍成分は894・792点。他ラベルは不変。除外2点は0のまま。
- 脳弓meshは2,688頂点・5,428面。平滑化・穴埋めは行わず、現行ラベルの全範囲から再構成する。
- 選択範囲は `work/fornix-column-interior-draft-20260919/selected56.json`。`scripts/stage_fornix_column56.py` が入力根拠SHA・既存mesh一致・逆適用を検査する。stageは `work/anatomy-review/fornix-column56-stage-v1/`。

旧108点追加の採用記録・installerは変更しない。履歴試験は保存したpre-column56ラベル・mesh・metadataに対して行う。

## 統合状態

開発版への適用・同期・検証を完了した。教材表示は「脳弓体部・柱上部（部分） / Fornix body and upper columns (partial)」とし、柱下部など未収録範囲を日英で明示する。構造の内部識別子は維持する。公開更新は行わない。


- 画像根拠はnative100の59図、native40の既確認21図と除外2点用4図の計84図。採用記録は `segmentation-patches/review/fornix-column56-adoption-2026-09-19.json`。
- 55ブロック部品・4高精細部品の対象maskは不変。14核構造の資産検査も通過。脳弓以外の形状を変更せず、現行ラベルSHAを関連metadataへ同期した。
- Node全628/628、Python全438/438、型検査が成功。初回Nodeで見つかった索引リンク・現行hash・部分範囲の期待文言の3件を修正し、対象検査と全体再試験を通した。
- 通常build `work/fornix-column56-build-v2`、Pages形式build `work/fornix-column56-pages-build-v2` が成功。source・両buildの出典／配布検査も通過。既存のchunk容量警告は残る。
- 検証ログは `work/fornix-column-interior-draft-20260919/` の `node-final-v2.log`、`python-final.log`、`build-final-v2.log`、`build-pages-final-v2.log`、`rights-*.log`、`nuclei-final.log`。
- 4346の配信先を最終buildへ更新し、既存reviewページを保持。実ブラウザで左右の柱上部3D・2面の拡大同期・日英説明・左右の追加voxelのクリック同定を確認した。ブラウザconsole errorはなし。

[ローカル観察位置（冠状断Y271）](http://127.0.0.1:4346/?review=fornix-column56#workspace/sections/coronal/observe?v=1&revision=2cdba3f15427af2fdb5b9bcdb9b1b9904f6fcc5199fc1bfa4b76b2bfbbe6e8da&position=58.27956989247312&visible=fornixBodyPartial&selected=fornixBodyPartial&layout=both&views=2&share=50)。脳弓全体の完成ではなく、次はnative40 Z650より下方の付着・走行の照合が必要。
