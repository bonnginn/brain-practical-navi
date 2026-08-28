# クイズ多角化監査

最終更新: 2026-08-28

## 現在の構成

- 表示対象: 45（断面・脳表23、模式3D神経血管22）
- 従来の名称同定: 45問
- 追加した機能・位置関係・経路問題: 55問
- 合計: 100問
- 追加問題が使う表示対象: 38

追加55問は同じ色付き構造を別の観点から反復する問題です。新しい分節、mesh、voxel、表示targetは追加していません。既存の表示対象監査45 target×3幅＝135/135件は可視性の証拠として維持しますが、55問の文章に対する専門家確認の証拠ではありません。

## 出題の種類

`app/quiz-concept-bank.json` には、機能から構造を選ぶ問題、表示構造の機能を選ぶ問題、位置関係を選ぶ問題、経路を選ぶ問題を収録しました。全問4択で、正答key、表示文、正答後の短い解説、参照先を分離しています。

画面では種類を「名称」「機能から同定」「機能」「位置関係」「経路」と表示します。追加55問はすべて `project-reviewed-expert-pending` とし、「試作・専門家未確認」または「模式3D・専門家未確認」を表示します。

## 参照資料

- プロジェクト内の構造説明・由来台帳・2026-08-28内容レビュー
- [NCBI Bookshelf: Basal Ganglia](https://www.ncbi.nlm.nih.gov/books/NBK537141/)
- [NCBI Bookshelf: Thalamus](https://www.ncbi.nlm.nih.gov/books/NBK542184/)
- [NCBI Bookshelf: Mammillary Bodies](https://www.ncbi.nlm.nih.gov/books/NBK537192/)
- [NCBI Bookshelf: Limbic System](https://www.ncbi.nlm.nih.gov/books/NBK538491/)
- [NCBI Bookshelf: Brainstem](https://www.ncbi.nlm.nih.gov/books/NBK544297/)
- [NCBI Bookshelf: Central Nervous System anatomy](https://www.ncbi.nlm.nih.gov/books/NBK542179/)

これらは文章作成の参照であり、神経解剖学専門家による教材承認、3D境界確認、研究用ground truthを意味しません。

## 自動監査

`scripts/audit_quiz_concept_bank.mjs` と `tests/quiz-concept-bank.test.mjs` は次を拒否します。

- 55問・合計100問・対象別配分の不一致
- 重複ID、未知の表示対象、未知の問題種別
- 4択でない問題、重複選択肢、正答keyの欠落
- 空の問題文・解説・選択肢、未知の参照先
- review stateの専門家確認済みへの誤格上げ
- 画面側の独立正答key・表示文・解説・試作判定契約の欠落

## 未確認事項

- 追加55問の神経解剖学専門家レビュー
- 学年・講義範囲に対する難易度と用語の最終調整
- 追加55問すべての物理端末・公開URL上の目視操作
