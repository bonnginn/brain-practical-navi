# 脳梁候補の局所誤収録を除外する修正 — 2026-09-06

## 採用範囲と限界

ユーザーの「根拠が揃った箇所は止まらず修正する」という指示に基づくAI補助のプロジェクト採用。**専門家レビューでも、ユーザーが各voxelを個別に目視承認した記録でもない**。開発版のラベルと対応meshへ適用済み。公開・main統合はしていない。

ID30の全151,380 voxelのうち、次の1,605 voxelだけを30→0（未ラベル）へ変更する。周辺に実際の組織がないという意味ではない。脳梁全境界の完成ではなく、既存の「画像誘導・試作」区分を維持する。

| 対象 | voxel | 原画像と補助根拠 |
| --- | ---: | --- |
| 右前上方の3間隙 | 291 | 全97局所X/Y/Z断面＋全体位置を点検済み。別組織分類では288がCSF／背景、3が皮質I層。原画像上で組織間隙に及ぶ |
| 右周辺皮質へのはみ出し（固定成分85） | 1,314 | XYZ [205,289,176]–[216,334,210]。全占有断＋前後1枚の計99断面、21シートをAIが開いて目視。皮質／溝側の部分であり、脳梁本体を横断しない |

原画像、隣接断、直交断と、[公式組織分類の位置合わせ調査](OFFICIAL_TISSUE_ALIGNMENT_REVIEW.md)を併用。二つの変位場補間法に対して安定した皮質分類を精査の入口にしたが、閾値だけで採用したのではない。全ID30のX175–216（42矢状断、11シート）も目視して位置関係を確認した。

成分85の原画像／赤い旧ID30輪郭／緑の修正候補は `work/anatomy-review/callosum-cortical-spillover-component85-v1/`。X方向14、Y方向48、Z方向37＝99断面。冠状・水平断では溝近傍の皮質端に及び、脳梁本体から区別できる。最終段階で字幕だけを短縮し、画像画素・候補・断面範囲は変更していない。

## 保持する未解決事項

- 他の皮質候補6,528 voxelを一括削除しない。今回の1,314はその中の特定の一成分。
- 3間隙以外の原画像255重なり917 voxelは保持。
- 帯状回内の白質／帯状束らしい上方の別弧や、下面の脳弓らしい細い弧との混在はまだ残る。白質分類だけを残しても解決しない。
- 他のラベル、原画像、左右の核、乳頭体、部分中脳水道は変更しない。新規の脳梁領域を推測で追加しない。

## 再現性と適用準備

`scripts/prepare_callosal_local_repair.py` が元volumeと正確な成分同一性を検査し、work内にstrict採用記録と修正volumeを生成した。

- 入力compressed SHA：`930eaaed7eed8782b1b162f3aa5c59c2428f4062d0d2da3a9a1cb563f49b7db7`
- 入力raw voxel SHA：`261beb616856653d4d7acd2d411a98f1435eb6beab8b91a2b8ac7b5642909d18`
- 出力compressed SHA：`5348b7650a3ba28c95a00407d62cf4054fb0c670a62de717f2c572f66a51c9a3`
- 出力raw voxel SHA：`35b2a2bf42c0f045141ea51c2adf66d9daea99fcf851a6404133a52b8cbde734`
- 全1,605 indexを昇順uint32 little-endianで符号化したSHA：`3374e25c75c68b4a1b0b305655f962efc043a07cc7e9c3d1580fb8c0d4997eed`
- ID30：151,380→149,775。元volumeは `tests/fixtures/bigbrain-practical-segmentation-pre-callosum-930e.bin.gz` に保存。
- 記録：`segmentation-patches/review/callosum-local-exclusion-project-review-2026-09-06.json`。draft PR27、mergeCommit=null。3間隙の旧unreviewed候補は履歴として保持し、二重適用しない。

## 開発版への統合確認

- 生成本体の第四段階へ接続。入力raw SHA・厳密な1,605 index・原値30・採用記録が全て一致した場合だけ反映する。集計記録の作成まで成功する前に呼出元volumeを変更しない。
- 旧930e…fixtureからの差分は正確に1,605 voxel。乳頭体と視覚路の客観監査を5348…に対して再実行し、旧記録は別名のまま保持。
- 原画像／同一格子manual／公式atlas・白質からの生成本体再構成は、四採用段階の後で全voxel差異0。ただし元NIfTI取込からの全パイプライン再実行ではない。`work/anatomy-review/practical-reconstruction-v3.json`。
- 55 blockパーツの生成mask比較で、今回変化したのは脳梁1点のみ（1 mm生成格子で252 voxel）。旧meshのbyte一致再現後に同期。新SHA `ae2fd10bc23547c47dc12558acf6c8868da97de3dc369a2e665fa23cb2eb9504`、13,362頂点／26,704面。
- 実distの5348…volume・上記meshのHTTP応答SHAを確認。日本語／英語×除外・保持点4同定、mesh通常／透過×上下面4表示、計8件成功し、全8画像をAIが開いて目視。保持点XYZ[212,271,191]、除外点[212,314,196]。`scripts/audit_callosal_repair_browser.mjs`／`work/anatomy-review/callosal-repair-browser-v1/`。詳細パネルがクリックを遮る監査手順の初回失敗は、次クリック前に閉じる操作へ修正した。
- 英語の同定名も `Corpus callosum candidate (provisional)` とし、候補・試作区分を省略しない。
- Python全36/36、関係Node108/108、局所採用／履歴候補のNode7/7、統合後Node全487/487、型検査・通常build成功。PythonはCI固定依存（NumPy2.3.5/Pillow12.3.0/SciPy1.18.1/h5py3.16.0）の隔離環境でも全36/36。`.github/workflows/ci.yml` に同テストを追加した（この時点でGitHub上の実行結果は未確認）。
- 最後の英語文言補正後は対象Node15/15・型検査・通常build、実ブラウザ8/8を再確認。`callosal-repair-browser-v2` の英語2画像も目視し、試作バッジ／ホイール操作説明／名称が省略されないことを確認した。v1の8画像は全目視済み、v2の残り6画像は目視再確認なし。487件全体の結果はこの文言補正前と区別する。
- 以前の脳室修正も現行5348…の実distで日英4同定を再確認。`ventricle-classification-browser-integrated-callosal-v2`。旧47 voxelだけのstaged比較はb75a…→930e…fixtureを使い続け、歴史的な差分を新しい1605 voxelと混ぜない。

上記実ブラウザはWindowsのローカルChrome、1440×1000。物理端末・他GPU・公開URL・脳梁全境界の専門家確認を意味しない。
