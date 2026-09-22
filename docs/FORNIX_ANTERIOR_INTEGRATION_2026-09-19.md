# 脳弓体部の前方延長 — 開発版への統合

同一BigBrain標本で追跡した脳弓体部の前方内部266点（左159・右107）を開発版に追加した。ID46は1,253点（左623・右630）。専門家確認済みの全脳弓ではなく、脚・柱・海馬／乳頭体までの連続分節は未完成。

## 採用の範囲と根拠

[候補作成と原画像照合](FORNIX_ANTERIOR_DRAFT_2026-09-19.md)のnative100 Y860–880、約2 mmの前方延長。既存体部と合わせてnative Y780–880の約10 mmを収載する。25冠状断と8直交断で実際の0.5 mm候補格子を原画像へ戻して確認した。今回の採用は束内部の追跡可能部分に限り、透明中隔への付着部と部分収載の切り口を解剖学的境界として確定していない。

初案293点のうち、部分体積の確認フラグ23点と面接続を欠く端部4点は保留のまま。暗さや連結性だけで帰属を決めたものではない。原画像の細い裂隙を0.5 mm格子で完全に表現できるとは限らない。

## 同期と復元

- 採用記録：`segmentation-patches/review/fornix-anterior266-adoption-2026-09-19.json`。全266座標、元値／適用値、原画像確認図のSHAを保持。
- 適用前SHA：`5211664518129297bbf78d1d536004e540e721615a88007ecf1459d18fb97a96`。
- 適用後SHA：`d815aaff6b98c95109cdd7c052a29871d49cc9cdf463bcb3db7e28a1497c2392`。
- 適用前ラベル・脳弓3D・メタデータは `tests/fixtures/*pre-fornix-anterior266*`。過去の987点採用記録は変更しない。
- `scripts/install_fornix_anterior266.py` は現行入力SHA、可逆性、ステージ、既存3Dとの一致を検証してから適用する。旧入力で現行版へ再適用しない。
- 断面用脳弓3Dは1,887頂点・3,806面、左右2成分。平滑化・穴埋めなし。ブロック55部品と高解像度脳室4部品はマスク不変。断面の他構造と14構造の全範囲3Dも形状不変で、現行ラベルの出典SHAを同期。
- 日英の構造説明を「前方延長を含む約10 mmの体部内部」に更新。新しい文献の追加はなく、既存BigBrain資料を使用。公開版は更新しない。

## 統合確認

- Node全体試験628/628、Python全体試験430/430（skipなし）、型検査成功。
- `scripts/build_section_current_nuclei.py` で14構造の全範囲3Dを再生成照合し、形状・現在の出典メタデータとも一致。`scripts/refresh_segmentation_measurements.mjs --write` で現行計測を再計算し、対応試験で再現性を確認。権利・出典検査も成功。
- 通常buildとGitHub Pages形式build成功。既存の500 kB超chunk警告は残る。ログは `work/fornix-anterior-followup-20260919/` の `node-final.log`、`python-integration.log`、`nuclei-check.log`、`build.log`、`build-pages.log`、`rights-check.log`。
- 初回Node試験で旧ラベルSHA／raw SHAの期待値、人工パッチfixtureの版、現行計測、文書索引の不足を検出して修正した。人工fixtureの編集対象voxelが前後で不変なことを確認して版だけを更新。過去の採用記録のハッシュや期待値は維持した。再試験は全件成功。
- `127.0.0.1:4346` の配信先 `work/september14-function-circuit-preview` を更新。実ブラウザで冠状断Y254からY257への移動、脳弓のみ／側脳室併記、1方向／2方向3D、日英の約10 mm説明を確認。2方向表示で左右の脳弓部分と切断位置を確認し、ブラウザエラーログは0件。
- 既存の視覚路レビュー3ページは原本からローカル配信先へ復元。観察リンクの配信コピーのみ新revisionへ更新（脳弓以外のラベルは不変）。原本・過去の確認図は保持した。

[追加領域の冠状断Y257を開く](http://127.0.0.1:4346/?review=fornix-anterior266#workspace/sections/coronal/observe?v=1&revision=d815aaff6b98c95109cdd7c052a29871d49cc9cdf463bcb3db7e28a1497c2392&position=55.26881720430107&visible=fornixBodyPartial&selected=fornixBodyPartial&layout=both&views=2&share=50)

## 残件

脳弓の脚・柱と上下の付着境界、視交叉・視索・視放線、脳室の名称移行境界と全外縁は引き続き作業対象。今回の局所延長をもって全体の完了とはしない。脳弓の次の前方区間はnative Y880–900とし、既存Y900原画像を位置目安に、現在のcropを下方へ越える束を含む原画像を取得して隣接・直交断で確認する。今回保留した27点を同じ根拠で機械的に追加しない。
