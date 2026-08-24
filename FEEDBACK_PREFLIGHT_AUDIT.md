# Google Form読み取り専用preflight監査

最終更新: 2026-08-24

## 目的

既存Google Formへ更新を加える前に、質問順、必須性、ページ分岐、匿名性、回答シートの運用見出しがリポジトリ内の契約と一致するかを確認します。外部フォームのID、編集URL、回答シートURL、回答内容はリポジトリや監査出力へ記録しません。

機械可読な正本は [feedback-form-contract.json](feedback-form-contract.json) です。`scripts/audit_feedback_form_preflight.mjs` は契約、生成スクリプト、読み取り専用Apps Scriptの安全条件をローカルで監査します。`scripts/preflight_google_feedback_form.gs` は、フォーム管理者が後日Google Apps Script上で明示的に実行するための読み取り専用点検です。

## 安全境界

- preflightはフォームと運用シートの設定・構造だけを読みます。
- 回答一覧を読みません。回答を作成・送信・削除しません。
- フォーム、質問、共有範囲、回答受付状態、回答シートを書き換えません。
- 出力は契約SHA-256、差分コード、差分件数、項目数だけです。ID、URL、回答値を出力しません。
- preflightは契約に列挙したフォーム説明、確認メッセージ、設定、2つのpage break、全20質問の順序・所属page・型・題名・help text・必須性・全選択肢・「その他」、分岐値・遷移種別・遷移先、運用シート名・見出しを一致照合します。
- JSON正本からApps Script内の契約descriptorとSHA-256を決定論的に生成し、ローカル監査で正本とのdeep equalityを確認します。手編集による二重管理のずれは拒否します。
- 既存フォームの再利用経路は、preflightの結果にかかわらずフォームやシートを自動更新しません。差分時は停止し、契約descriptorが一致した場合も既存URLを管理者ログへ再表示するだけです。

## ローカル確認

2026-08-24、契約の匿名性、版名非依存表記、20質問、3ページ、分岐、任意の個人情報欄、ファイルアップロード禁止、管理者確認の残件を固定しました。さらに、JSON正本へ全help textと「その他」の状態を明記し、Apps Script内の契約descriptorを生成する `scripts/generate_feedback_preflight_contract.mjs` を追加しました。異常系では、メール収集、ログイン制限、必須の返信先、ファイルアップロード、誤分岐、選択肢・help text・確認文・page navigation・「その他」のdrift、α／β固定表記、非公開Google URL、回答読み取り、フォーム変更APIを拒否します。

このローカル監査は、実際のGoogle Formが一致することを証明しません。外部フォームに対するpreflightの実行、版名非依存表記への移行、ログアウト状態の全3ページ、テスト回答、Formsと回答シート双方からの削除は、引き続き管理者確認待ちです。

## 管理者が後日行う次の一操作

既存のGoogle Apps Scriptプロジェクトへ `scripts/preflight_google_feedback_form.gs` を追加し、`preflightBrainPracticalFeedbackForm` を実行して、個人情報を含まない差分コードを確認します。生成スクリプトを再実行しても既存フォームは自動更新されません。契約descriptorとの差分を管理者が確認した後、表記移行は別の明示的な手順として行います。
