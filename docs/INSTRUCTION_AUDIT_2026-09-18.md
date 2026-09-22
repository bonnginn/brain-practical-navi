# 指示・skills・関連docsの監査 — 2026-09-18

## 対象と判断基準

対象は `codex/september-resumed-anatomy`、開始HEAD `4911896`。作業ツリーはclean。ルートAGENTS.md、repo内のAGENTS／SKILL探索、再開メモ・文書索引・開発ガイド・共同制作フロー・ロードマップ・担当指示・権利資料の関連箇所と、文書検査／SHA参照を確認した。全ての解剖記録を読み直す監査ではない。

OpenAI公式資料を2026-09-18に検索・取得して照合した。always-onには安定した制約、作業別手順には条件付きの入口、状態には日付付き記録を使う。他repoとの構成統一や行数目標は採用しない。

- 短いskill発火条件、最小限のrouter、必要時の資料参照、過度な手順・反復検証の見直し：[Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)。
- AGENTSの自動読込と階層：[Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)。
- skillはdescriptionで選択され、本文を後から読む。発火条件は具体的にする：[Build skills](https://learn.chatgpt.com/docs/build-skills)。
- Astraでは曖昧な指示や矛盾したskillが不要な停止につながり得るため、ユーザー指示との関係を明確にする：[Model guidance](https://developers.openai.com/api/docs/guides/latest-model)。

## 提案と実施結果

| 区分 | 現状の問題／維持すべき制約 | 対応 |
| --- | --- | --- |
| 維持 | 原画像由来分節と模式、AI採用と専門家確認の混同リスク | AGENTSの恒常制約として保持。画像判断・旧ID33・外部背景fillの具体条件は作業ガイドへ |
| 維持 | donor dignity、患者情報、画像の権利、非公式教育用途 | AGENTSに残し、個人情報・私的フォームURLの公開禁止を明記。権利の正本は既存notice／LICENSESのまま |
| 維持 | 開発ラベルと公開ラベルの乖離、限定公開の承認境界 | AGENTSに保持。既存の明示的な公開指示は有効で、承認の取り直しを要求しない |
| 短縮 | 41行のAGENTSの約半分が期限付きチェックポイント。長い停止命令が繰り返される | 恒常制約＋5種類の作業入口へ。旧命令を実行対象から外す |
| 短縮 | 再開メモ末尾にも古い「現開発SHA」「再開に必要な情報」があり、現状と矛盾 | 現在の開発／公開SHA、差分、残件だけに整理。未実行のモンロー孔図示も残件として明記 |
| 移動 | 分節の採否・同期・検証、公開先の使い分け、文書互換性が常時指示に混在 | AGENT_TASK_GUIDEの該当節だけを参照。実行コマンドは既存DEVELOPMENT、差分schemaは既存SEGMENTATION_WORKFLOWを再利用 |
| 移動 | docs索引の「まず読む資料」が大量の段階別記録を列挙 | 4種類の作業入口を先頭へ。残りは日付付きの個別記録として保持 |
| 削除 | 期限切れの停止命令5件、単独限定と後続の複数モデル担当方針の矛盾 | 常時指示から削除。ユーザーの現指示を採用する。旧内容は保存履歴へ |
| 削除 | 毎回のREADME確認、一般的なテスト励行・二重読込、skill本文を繰り返さない等の一般論 | 作業に必要な参照と検証に集約。stack／ファイル配置はコード・package.json・CIから判断できるため追記しない |

## Skillsの監査範囲

tracked filesとhiddenを含むrepo探索ではAGENTS.mdは1件、repo所有SKILL.mdは0件。`.agents/skills`、`.codex`にもrepo固有skillはない。したがってrepo内descriptionの長さ・発火条件の修正対象はない。新しいskillは作成しない。今の反復作業は既存docsとscriptsへの条件付き参照で扱え、skill化だけを目的に入口を増やす利点はない。

このセッションに提示された外部skillsのdescriptionには、Google Docsの長い手順・制約列挙、openai-docsの広い製品対象、documentsのrender-and-verify義務などが含まれる。これらは共有プラグイン／システム配下であり、repoの所有物ではない。description上の所見で、全外部SKILL本文を監査したとの主張ではない。今回実際に使ったopenai-docs本文は確認した。将来その所有元で直すなら、descriptionは用途と具体的トリガーに絞り、レンダリング義務や対象別手順は本文へ置く。今回それらを編集・複製・repoへ導入していない。

## Progressive disclosureの動作確認

| 依頼例 | 読む入口 | 不要な読込／操作 |
| --- | --- | --- |
| 日本語ボタンの誤字 | 該当コード、必要ならDEVELOPMENT | 全解剖履歴・全volume監査 |
| 扁桃体が片側しか見えない | 作業ガイドのAnatomy and meshes、現行対応表 | 古い全分節候補の再探索 |
| 脳室境界を修正 | 再開メモ、同節、当該地域の原画像記録 | 暗さだけの自動fill、旧ID33の座標分割 |
| この修正だけ公開 | Publication、実CI、mainとの差分 | 別の開発分節の一括公開、既にある許可の取り直し |
| 停止中だった作業を再開 | 現在のユーザー指示と再開メモ | 9月12日の停止日時を再適用 |

## 保全と検証

AGENTSは5,313→2,153 bytes（41→21行）、再開メモは36,388→2,807 bytes（207→21行）。これはファイル量であり、トークン数や費用改善の実測ではない。旧全文は保存履歴へ内容を保持して移し、指示として再適用しない旨を付した。

変更は文書のみ。原画像、ラベル、メッシュ、hash固定証拠、ライセンス正本、CI、共有skillsは変更しない。共同制作フロー内の寄稿者レビュー要件・strict validatorは維持し、過去の承認を新候補へ流用しない。専門家確認が必要な境界を「モデルが賢くなった」ことを理由に完成扱いしない。

既存の文書構成試験2/2成功。変更8文書のローカルリンクと保存履歴の旧本文一致（改行を除く）を確認し、git diff --check成功。文書だけの変更に全Node／Python・build・実ブラウザ検査を追加しない。
