# コンテンツ正確性レビュー

更新日: 2026-08-23

## 状態と範囲

これは、公開教材の文言・分類・由来注記を一次資料に照合した本プロジェクト内の source-backed review です。専門家による最終確認、所属機関の承認、研究用 ground truth の確定ではありません。`expertReview` は既存の来歴台帳どおり pending のままです。

今回の変更は、構造ラベルのID、分節形状、座標、色、内部キーを変更せず、利用者が解剖学的な分類や機能を取り違えにくくする説明に限定しました。

## 反映内容

| 対象 | 反映した内容 | 状態 |
| --- | --- | --- |
| 視床下核 | 「中脳・視床下部」「中脳核」だけで分類せず、表示上は「中脳・視床下域」「中脳核・視床下域」とした。視床下核を間脳の視床下域として説明し、視床下部・中脳そのものと区別した。内部の quiz category key は維持した。 | source-backed project review、expert pending |
| 淡蒼球 | 淡蒼球外節（GPe）を内部の中継・調節部、淡蒼球内節（GPi）を主要な出力部として説明し、淡蒼球全体の機能説明にも両者の差を反映した。 | source-backed project review、expert pending |
| 側脳室と尾状核 | 尾状核頭・体・尾を、側脳室前角の外側壁・体部の外側・下角の上方（天井側）という部位別の関係として注記した。 | source-backed project review、expert pending |
| 第三脳室 | 左右の視床・視床下部に囲まれる正中腔として、上方が視床、下方（底側）が視床下部という教材上の位置関係を表示した。 | source-backed project review、expert pending |
| 脳梁・脳弓標本 | 英見出しを `CORPUS CALLOSUM AND FORNIX` に統一した。標本の形状・由来は変更していない。 | 表記修正 |
| 脳表5領域 | 中前頭回前部・中前頭回後部・鳥距溝周囲皮質・外側後頭皮質・眼窩前頭皮質を、CerebrA／Desikan-style の区画名を教材上で対応づけた表示として明示した。併記する英語・Latinはアトラス表示用の文字列で、FIPAT／TNAの国際標準用語だとは主張せず、標準語への置換も行っていない。 | source-backed project review、expert pending |

## 照合した資料

- [FIPAT Terminologia Neuroanatomica, Chapter 1](https://cdn.dal.ca/content/dam/dalhousie/pdf/library/FIPAT/TNA/FIPAT-TNA-Ch1.pdf) — `Subthalamus → Nucleus subthalamicus` と `Hypothalamus` が別項目であること、および国際標準用語の位置づけを確認した。アプリの脳表Latin文字列をTNAの確定同義語とは扱わない。
- [NCBI Bookshelf: Neuroanatomy, Globus Pallidus](https://www.ncbi.nlm.nih.gov/books/NBK557755/) — GPeをintrinsic／relay側、GPiをoutput側として説明する根拠を照合した。
- [NCBI Bookshelf: Neuroanatomy, Nucleus Caudate](https://www.ncbi.nlm.nih.gov/books/NBK557407/) — 尾状核の頭部・体部・尾部と側脳室前角・体部・下角との部位別関係を照合した。
- [NCBI Bookshelf: The Anatomy of the Hippocampus](https://www.ncbi.nlm.nih.gov/books/NBK575732/) — 脳弓が主として海馬の遠心性投射線維を形成し、一部に交連線維を含むことを照合した。
- [NCBI Bookshelf: Neuroanatomy, Ventricular System](https://www.ncbi.nlm.nih.gov/books/NBK532932/) — 第三脳室側壁上部が視床、下部が視床下部である位置関係を照合した。

## 監査上の注意

このレビューは文言の誤解を減らすための根拠整理であり、BigBrain画像上の境界、手動分節の正確性、標本形状、個体差を検証したものではありません。視床下核、淡蒼球、脳室、脳表対応領域の専門家レビュー欄は未完了のまま維持します。出典に基づく説明と、プロジェクト固有の教材表示・アトラス対応・試作分節を混同しないでください。

## 実装確認

2026-08-23のローカルproduction previewで、クイズ分類、視床下核、淡蒼球外節・内節、尾状核、第三脳室、脳梁・脳弓標本、脳表5領域の注意書きを実ブラウザ確認しました。確認中のconsole error／warningは0件でした。専用回帰テスト、構造来歴台帳監査、TypeScript型検査、本番ビルドも成功しています。
