# 解剖レビュー記録下書き監査

更新日: 2026-08-24

## 位置づけ

共同制作画面の専門家レビュー準備キューに、1項目ずつ開く「確認記録の端末内下書き」を追加した。これは後日まとまった時間で観察結果を中断・再開し、固定形式のJSONとして持ち帰るための準備機能である。`public/atlas/structure-provenance.json`、教材ラベル、境界、`expertReview`、採否、公開状態は変更しない。

下書きと書き出しJSONは、常に `local-unsubmitted-draft`、`not-submitted`、`adoptionDecision: not-recorded`、`expertReviewStatus: not-claimed` を保持する。下書きを全項目入力しても、専門家レビュー完了、解剖学的妥当性、機関承認、採用、公開可を意味しない。

## 記録範囲

- 氏名、メールアドレス、所属、評価者役割、自由記述、URLは入力・保存しない。
- 1つのprovenance stable keyにつき、表示面・表示区分の任意選択と、固定3項目（解剖学的対応・位置、名称・左右、学習者向け表示）だけを記録する。
- 結果は `not-assessed`、`no-concern-observed`、`concern-observed`、`unable-to-assess` の4値に限定する。
- 「この観察範囲では懸念を記録しない」は承認・妥当性確認ではないと画面上で明示する。
- `concern-observed` では固定8コードから1つ以上を必須とし、自由文で個人情報や未管理の判断を持ち込まない。

## 台帳照合と保存境界

再帰的にキー順を固定したcanonical JSONから、台帳全体と対象entryのSHA-256をWeb Cryptoで計算する。保存済みのpath、schema version、更新日、stable key、両SHA、`expertReview: pending` が現在の台帳と一致しない場合は、編集・自動保存・通常書き出しを停止する。古い下書きを別項目へ自動移行・結び直し・上書きしない。

保存は項目別のlocalStorage keyを用いる。JSON不正、保存領域の読取・書込・削除失敗、別タブ競合はfail closedとする。対応環境ではstorage key単位のWeb Lock内で保存前の値を再照合し、別タブ更新を上書きしない。Web Locksを利用できない環境では端末内書込みを行わず停止する。各編集に単調増加revisionを付け、古い非同期保存完了が新しい画面状態を巻き戻さない。

## ローカル実ブラウザ確認

Windows 11、Chrome 151相当のアプリ内ブラウザ、通常production preview `http://127.0.0.1:4332/` の `#workspace/collaborate` で確認した。

- review panel 75件を開き、最初の `surface-precentral-postcentral` カードだけで下書きを遅延生成した。カードを開く前のeditor生成は0件だった。
- 自由記述欄・個人情報欄は0件、固定select 5件だった。
- 表示面、表示区分、3観察項目を連続変更し、最終値を自動保存した。再読込後も同じ5値を復元した。
- `concern-observed` を選びコード0件では日本語の必須案内と書き出し無効を表示し、固定コード選択後は案内が消えて保存可能になった。
- JSON書き出し操作後、「送信・採用ではありません」の完了表示を確認した。ローカルサンプル書き出しを独立監査し、`validation.ok: true`、submitted／adoption／expert completion／provenance mutationはいずれもfalseだった。
- 390 px指定（実効 `innerWidth` 295、`clientWidth` / `scrollWidth` 284）で、カード幅233 px、select 156–158 px、操作ボタン44 px、文書横overflow 0、画面内error 0を確認した。
- console error／warningは0件だった。
- 同じ最終通常buildを27経路×3幅×direct／reloadで巡回し、162/162件に合格した。missing／duplicate／fail、console／request／UI error、残留loader、横overflow、WebGL fallbackはいずれも0件だった。結果はローカル作業用 `work/browser-audit/beta-route-audit-anatomy-review-draft-2026-08-24.json` に保存した。

## 機械検証

- focused test 9/9成功
- 全テスト357/357成功
- TypeScript型検査成功
- 通常production build成功
- `scripts/audit_anatomy_review_record_draft.mjs` による独立JSON検証成功

## 未確認・残る制約

- 実際の専門家レビュー、確認者の資格・本人性、署名、採用判断は未実施である。
- ダウンロードJSONは編集可能で署名されず、validatorは形式と現在台帳との一致を検査するが、作成者を証明しない。
- localStorageは暗号化されず、共有プロファイルから見える可能性があり、ブラウザに消去され得る。
- 台帳全体SHAを固定するため、無関係なentry変更でも既存下書きは安全側にロックされる。
- 固定選択肢だけのv1では、専門家の詳細な文章所見を保持できない。詳細所見と正式採用は別の管理された手順が必要である。
- 物理端末、Safari・別ブラウザ、公開URL、複数実ブラウザ間の同時操作は未確認である。
