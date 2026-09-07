# 脳実習ナビ / Brain Practical Navigator

脳の断面と3Dモデルを見比べながら学ぶ、神経解剖学の教育・自主学習用Webアプリです。

**[日本語版を開く](https://bonnginn.github.io/brain-practical-navi/) · [Open in English](https://bonnginn.github.io/brain-practical-navi/?lang=en#workspace/home)**

## できること

- 脳表の着色・構造同定、主要脳底動脈と脳神経根を重ねる模式表示
- 水平断・冠状断・矢状断と3Dの比較、表示境界のドラッグ調整
- 8種類のブロック標本と、名称・機能・位置関係を学ぶ復習クイズ
- PC・タブレット・スマートフォン、日本語・英語に対応

現在は**公開α版**です。クイズは全100問を作成済みですが、模型の配置に課題がある8問を保留し、現在の出題対象は92問です。設定により実際の出題範囲は変わります。

分節・模式表示には未完成の部分があり、専門家レビューは完了していません。教科書等と照合して使用してください。診断・治療・手術計画・定量研究には使用できません。特定の大学・部局の公式教材や承認済み事業ではありません。

## English

**English edition (project-reviewed preview)** — explore brain surfaces, three orthogonal section planes, eight specimen-block views, and quizzes on identification, function and anatomical relationships. The interface supports desktop, tablet and phone screens. The English edition does not recruit collaborators.

This is a **public alpha**, not an expert-validated atlas. Of 100 authored questions, 92 are currently eligible; eight are withheld because of model-placement limitations. Available questions also depend on quiz settings. Segmentations and schematic models remain incomplete and must be checked against reliable teaching references. Do not use this app for clinical decisions, surgical planning or quantitative research. It is not an officially endorsed university resource.

## 出典・利用条件 / Sources and terms

主なデータはBigBrain、MNI、CerebrAに由来します。アプリ内「利用条件・クレジット」にも参考文献を掲載しています。

- [データの出典・引用 / Data sources and citations](DATA_AND_LICENSES.md)
- [分節に用いた参考文献 / Segmentation references](docs/SEGMENTATION_REFERENCES.md)
- [ライセンスの区分 / Licence boundaries](LICENSES.md)

コードは [AGPL-3.0-or-later](LICENSE)、本プロジェクトの教材文書はCC BY-NC-SA 4.0、外部素材には各原ライセンスが適用されます。BigBrain由来データを含む完全版の利用は**非営利目的に限られます**。

Code is licensed under AGPL-3.0-or-later; project teaching documents under CC BY-NC-SA 4.0. Third-party data retain their original licences. The complete package containing BigBrain-derived data is restricted to non-commercial use.

公開HTTPSホストの本番版だけでCloudflare Web Analyticsを使用します。同社の説明ではCookieやlocalStorageを使わず、訪問者の個人データを収集・利用しません。クイズ履歴や編集下書きは端末内に保存され、自動送信されません。

## ローカル実行 / Run locally

Node.js 22.12以降を使用します。

```sh
npm ci
npm run dev
```

設定・テスト・日英フォームの運用は [開発ガイド / Development guide](docs/DEVELOPMENT.md) を参照してください。

## 詳しい資料 / Further documentation

**[文書案内 / Documentation index](docs/README.md)** · [短い再開メモ](docs/RESUME_SUMMARY.md) · [変更・開発記録](docs/README_DEVELOPMENT_LOG_2026-09-07.md)

不具合や修正提案は [GitHub Issues](https://github.com/bonnginn/brain-practical-navi/issues)、参加方法は [CONTRIBUTING](CONTRIBUTING.md) を参照してください。報告には個人情報や標本写真を含めないでください。
