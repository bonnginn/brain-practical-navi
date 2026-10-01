# 10月1日開発成果の公開β反映

ユーザーの公開指示に従い、10時間開発の保存版 `7e74f38` を [PR #46](https://github.com/bonnginn/brain-practical-navi/pull/46) で統合した。2026-10-01 20:47 JST、mainのアプリ公開コミットは `c154e188c0f714e1a6759a962d6a95d1d6d8a280`。[Pages配信](https://github.com/bonnginn/brain-practical-navi/actions/runs/36857574485) は成功し、[公開教材](https://bonnginn.github.io/brain-practical-navi/) の配信資産と画面を確認した。正式版1.0への呼び替えではない。

## 反映内容

- 日英四択100問追加。作成済み200問、出題対象192問、既存8問は保留を維持。新しい概念問題の誤答には機能・形態・位置関係の対比を添えた。
- 同一標本の地図と原画像に基づき、小脳590点、扁桃体1,505点、海馬356点、計2,451点を補完。断面3D、関連ブロック、不透明標本、索引、日英出典を同期した。
- 視床の7核群の模式目印、一切片VIM輪郭、LGN/MGB参考形状を区別した位置ガイド。核ごとの厳密な分節としては扱わない。

公開ラベルSHA-256は `d6358cb5145bff9b861f8c885c643cea7feeec1b008d9e5afe477ba4061d87b4`。公開から取得した圧縮ラベルと海馬・扁桃体・小脳メッシュはローカル保存版とバイナリ一致。DATA-MANIFESTはCRLF/LFだけが異なり、改行を揃えた内容は一致した。

## 集計サービス

認証後、既存Cloudflare WorkerとD1を更新した。Workerの現行192問題版と互換用旧51版を配備し、既存D1へ `0002_expand_session_capacity.sql` を適用した。得点集計の上限は200問。既存カウンターをコピーして保持し、匿名集計の設計を変更していない。

Workerの有効版は `1613ea87`。公開Originから更新前後のGETを照合し、既存選択肢集計28行の値がすべて一致した。完了セットは両時点とも0件。今回、集計を汚さないため有効なテスト回答は送信しておらず、新問題版の本番POST受信まで試験したという意味ではない。生成済み配備コードとエディター内容の一致、配備成功、公開GETと日英集計画面を確認した。

更新前のWorkerソース、D1復元用bookmark、更新後のSQL定義と照合結果は `work/` に保存した。復元用bookmarkを公開文書へ転載しない。

## 検証と残件

[PR CI](https://github.com/bonnginn/brain-practical-navi/actions/runs/36856221285) とmain CIは成功。Node668件、Python439件（117件skip）、型検査、通常／Pages形式build、権利表示検査を確認した。CIの画像欠如によるskipは原画像照合の成功を意味しない。原画像の採否根拠は各分節記録を参照する。

公開実ブラウザで日本語の視床MGBガイドと現行SHAを含む観察リンク、日英の192問集計と既存数値を確認した。確認時の一時的なキャッシュ・Service Worker迂回設定は戻し、確認用タブを閉じた。通常キャッシュからの更新操作を一通り試験したという意味ではない。

証拠は `work/october1-public-assets-check.json`、`work/october1-worker-deployment-check.json`、`work/october1-public-thalamus.png`、`work/october1-public-quiz-statistics.png`、`work/october1-public-quiz-statistics-en.png` に保存した。

微細な海馬境界、脳弓終端、独立した視放線、未確証の脳室腔縁、実習スケッチ待ちのブロック再設計、専門家確認は残る。プロジェクト内採用と専門家監修を混同しない。既存の未コミット `CONTRIBUTING.md` は編集・公開に含めていない。
