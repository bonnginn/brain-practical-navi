# 開発ガイド / Development guide

開発再開時には [再開メモ](RESUME_SUMMARY.md) と [AGENTS.md](../AGENTS.md) を先に確認してください。現在の追加開発は停止中です。

## 実行と検証

Node.js 22.12以降で実行します。

```sh
npm ci
npm run dev
npm test
npm run build
```

Pythonの分節検証は `requirements-test.txt` の依存を用い、リポジトリ直下から `python scripts/run_python_tests.py` を実行します。ローカル原画像が必要な検査のskipは、解剖学的な確認完了を意味しません。

## 日英フィードバックフォーム

`.env.example` を参考に、日本語は `VITE_FEEDBACK_FORM_URL`、英語は `VITE_FEEDBACK_FORM_URL_EN` に**回答者URLだけ**を設定します。編集URL・回答シートURLを公開コードへ入れないでください。英語フォームは共同制作者募集を含まず、日本語フォームへフォールバックしません。

Google Apps Script用の生成スクリプトは [日本語](../scripts/create_google_feedback_form.gs) と [英語](../scripts/create_google_feedback_form_en.gs) です。作成後に回答者の公開範囲を確認し、`RESPONDER_URL` を設定します。運用手順は [ALPHA_FEEDBACK.md](ALPHA_FEEDBACK.md) を参照してください。

## 引き継ぎと記録

- [Windows引き継ぎ](../WINDOWS_HANDOFF.md)
- [分節の変更・レビュー手順](SEGMENTATION_WORKFLOW.md)
- [資料一覧](README.md)

アプリの変更と公開は別の操作です。採用前の差分・過去の検証結果・公開済みの状態を区別してください。
