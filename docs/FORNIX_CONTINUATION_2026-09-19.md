# 脳弓体部・前方移行部：269点の追加

同一BigBrain native100原画像で追跡した内部269点（左174・右95）を開発版へ追加した。ID46は1,253→1,522点（左797・右725）。体部と前方移行部を前後約12 mmの範囲で部分収載する。脚・柱全体、乳頭体／海馬までの連続分節の完成ではない。

## 採用の根拠と限界

[下方ランドマーク確認](FORNIX_ANTERIOR_CONTEXT_2026-09-19.md)を起点に、native Y880–900の束内部を輪郭化した。Y880は前回の輪郭を引き継ぎ、Y890・900の原画像から左右の内部を下書きし、間を補間した。上端・前端は部分収載の切り口であり、透明中隔との解剖学的境界や体部／柱の名称移行面を確定する線ではない。

274点の格子候補はすべて元値0で、他ラベルとの衝突はない。各voxel内1,000点、計274,000点を公式の全逆変換でnative原画像へ戻した。全標本点がcrop内で、最大往復残差は `3.411e-6 mm`。これは変換の数値整合性であり、解剖学的精度の指標ではない。

原画像値60,000超が30%を超える5点を部分体積の確認保留とし、残る269点を採用した。明暗の閾値による自動帰属ではなく、既存体部からの走行、冠状断Y877–903の27面、矢状6面・水平5面で実際のvoxel範囲を原画像へ再投影して判断した。5点の座標は `refined269-v2/candidate.json` に保持。前回の27保留点もそのまま残る。

微細な内部裂隙を0.5 mmの格子で完全に表現できるとは限らない。右束の細い裂隙と外縁には部分体積が残る。面接続は整理の補助に使い、つながっていること自体を帰属の根拠とはしない。現在の2成分を、全脳弓が左右で常に分離するという主張にしない。

体部から柱への追跡に冠状・矢状・水平断と前交連・乳頭体の目印を使う方針は、既存の[Alkemadeらの手順](https://link.springer.com/article/10.1007/s00429-021-02400-x)と[境界判断資料](FIBER_BOUNDARY_METHODS_2026-09-16.md)を参照。MRIの信号条件を組織像へ転用していない。文献はブラウザの日英参考文献に既掲載。

## 保存・同期

- 変更前SHA：`d815aaff6b98c95109cdd7c052a29871d49cc9cdf463bcb3db7e28a1497c2392`。
- 変更後SHA：`a009c09fbcf2d13eb28de9a27830c6bcd0572d3b825cf9554b5879ca11efb707`。
- 採用記録：`segmentation-patches/review/fornix-continuation269-adoption-2026-09-19.json`。全269座標・元値／適用値・目視確認38図のSHAを保持。輪郭specも同ディレクトリの `fornix-continuation-draft-2026-09-19.json` に保存。
- 作業原本：`work/fornix-continuation-draft-20260919/`。`sampling-v1/`、`refined269-v2/`、`refined269-closeup-v2/` が最終測定・確認図。原画像は前回の検証済みcropを再利用。
- 拡大図v1ではZ反転後の切り出しに座標ずれがあったため採用根拠から除外。v2はXYZ原配列からの独立期待値と保存PNGの原画像矩形を全27図で照合。本体38図の画像矩形114箇所はv1/v2一致を検証し、原画像の内容が変わっていないことを確認した。誤った図も履歴として残す。
- `scripts/stage_fornix_continuation269.py` と `scripts/install_fornix_continuation269.py` は入力SHA、可逆性、既存mesh一致を確認。変更前ラベル・脳弓mesh・関連metadataは `tests/fixtures/*pre-fornix-continuation269*`。
- 新しい脳弓3Dは2,318頂点・4,672面、面接続2成分。平滑化・穴埋めなし。既存ブロック55部品と高解像度脳室4部品のマスクは前後で不変。脳弓以外の断面構造も形状不変で、出典SHAを同期した。
- 日英の説明を体部・前方移行部の前後約12 mmへ更新。実測収載範囲と全脳弓の模式モデルを区別し、通常クイズへの追加はしていない。公開更新なし。

## 統合検証

- Node全体試験628/628、Python全体試験432/432（skipなし、418.274秒）、型検査成功。
- 可逆適用・全非対象voxel不変・現行脳弓mesh一致を確認。適用済みラベルへのinstaller再適用は書込前に拒否される。
- 現行計測を再生成し、ブロック55部品＋高解像度4部品のマスク不変を確認。14構造の断面3D再生成照合、出典・権利検査も成功。
- 通常build・GitHub Pages形式build成功。既存の500 kB超chunk警告は残る。ログは作業原本内の `node-integration.log`、`python-integration.log`、`nuclei-check.log`、`build.log`、`build-pages.log`、`rights-check.log`。
- 配信先 `work/september14-function-circuit-preview` を更新。実ブラウザで新しい日本語／英語の約12 mm説明、冠状断Y264→265の1枚送りと3D切断位置の同期、1面／2面切替、3Dのみ2面で左右の脳弓部分を目視確認。コンソールエラー0件。
- 既存の視覚路レビュー3ページもローカル配信先へ復元。原本は保持し、配信HTMLの観察リンクだけ新revisionへ更新した。視覚路ラベル自体は今回不変。

[追加区間の冠状断Y264を開く](http://127.0.0.1:4346/?review=fornix-continuation269#workspace/sections/coronal/observe?v=1&revision=a009c09fbcf2d13eb28de9a27830c6bcd0572d3b825cf9554b5879ca11efb707&position=56.774193548387096&visible=fornixBodyPartial&selected=fornixBodyPartial&layout=both&views=2&share=50)

## 残件

今回の次はY900以降で、前交連後方へ下降する柱を広域cropと照合する。周囲へ付着する組織全体や、乳頭体までの直線経路を塗らない。脳弓脚、視交叉・視索・視放線、脳室の名称移行境界・全外縁の残件は継続する。
