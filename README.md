# 脳実習ナビ

[公開α版をブラウザで開く](https://bonnginn.github.io/brain-practical-navi/)

## 2026-09-05–06の改善候補（未公開）

生成処理の安全対策として、位置合わせ履歴に問題のある旧CLIは`--legacy-grid-reproduction`を付けたwork内新規ディレクトリでの再現専用にしました。公開用データの再生成には使用できません。The legacy builders now require explicit research-reproduction mode and a new directory under `work/`; they cannot write production assets while the registration mismatch is unresolved.

重要な追加調査: 表示画像と手動ラベルID1–22の非線形位置合わせ履歴が一致しない問題を確認しました。全22ラベルの原画像比較、小別成分・背景符号・周辺区画との競合確認を終え、構造別の結論を記録しました。数値許容差による182 voxelの違いも全点三方向で確認し、高精度な位置補正候補を作成しました。まだ本体へ採用しておらず、全境界正常・専門家承認という判定ではありません。[位置合わせの診断](MANUAL_LABEL_SPACE_REVIEW.md)・[確認の最終結論](MANUAL_REGISTERED_REVIEW_CONCLUSIONS.md)。The audit identified mismatched nonlinear-registration histories between the displayed image and manual labels 1–22. AI-assisted image review of all 22 labels, small components, background-code overlaps and neighboring-label conflicts is complete, with structure-specific conclusions and limitations recorded. All 182 voxels affected by numerical inverse tolerance were also inspected in three planes, and a tighter registration candidate was generated. It is not adopted into the app. This review does not establish that every boundary is correct or constitute expert approval.

断面のクリック同定で、ラベル未登録の場所に以前選択した別構造の説明が残る問題を修正しました。未ラベルを組織の不存在と誤解しない説明にしています（開発版のみ）。Section identification now uses the explanation for the clicked location rather than a previously selected structure; an unlabelled location is not presented as absence of tissue (development only).

開発版では第四脳室の47 voxelを修正しました。16 voxelを「中脳水道候補（部分）」へ分類し直し、橋の前方にあった誤分類の小片31 voxelを未ラベルに戻しました。原画像・連続断・直交断に基づくAI支援のプロジェクト採用であり、専門家レビューではありません。水道全長の分節ではなく、通常クイズにも追加していません。公開サイトは未変更です。The development labels contain a reversible 47-voxel correction: 16 voxels reclassified as a partial cerebral aqueduct candidate and 31 anterior fragments removed from the fourth-ventricle label. This is AI-assisted project adoption based on image review, not expert validation or a complete aqueduct segmentation. Standard quizzes and the live site are unchanged. 詳細は [修復記録](FOURTH_VENTRICLE_REPAIR.md) を参照してください。

脳梁候補も、原画像と全該当直交断を確認した局所1,605 voxel、追加1,596 voxel、下方の別の弧2,160 voxel（合計5,361）を未ラベルへ戻し、対応する3D部品を同期しました。周辺皮質・組織間隙へのはみ出しと下方の別構造の誤収録を修正したもので、脳弓への新規ラベル付けや、脳梁全境界の修復完了ではありません。AI支援のプロジェクト採用で、専門家レビューではありません。[初回修復](CALLOSUM_LOCAL_REPAIR.md)・[追加皮質修復](CALLOSUM_CORTICAL_FOLLOWUP_REPAIR.md)・[下方弧の修復](CALLOSUM_INFERIOR_REPAIR.md)。The development branch removes 1,605 initially reviewed voxels, a further 1,596 cortical spillover voxels and a separate inferior arch of 2,160 voxels (5,361 in total) from the provisional callosal label, with corresponding 3D updates. These bounded corrections address selected cortical/tissue-gap spillover and an incorrectly included inferior structure. They do not create a new fornix segmentation or establish a complete callosal boundary. This is AI-assisted project adoption, not expert review.

今回の開発ブランチには、次の改善をまとめています。mainへの統合・公開更新は別途承認後に行います。

- 問題単位の誤答履歴、問題タイプの選択、構造・トピックの偏りを減らした出題順、誤答時の説明比較。
- 教材開始ボタンを見つけやすい位置へ移動し、脳表の長い注記を折り畳み、3Dを覆っていた操作ボタンを専用欄へ移動。
- 断面方向別の位置・表示設定を端末内に保存。ラベルの版を固定した「この観察のリンク」で位置・構造・表示配分を再現（回転・拡大率は対象外）。
- 明示的なスマホUI指定とレイアウトを統一。ブロック標本を「部品ガイド付き／自由観察」として案内し、旧モデル比較は過去資料へ整理。
- 脳表・断面・8ブロック・回路ガイド・追加55問の英語を原文と照合し、欠落した位置関係・構造名・機能説明を修復。実測に基づかない「見えやすさ」バーは除去。
- レビュー台帳から、対応が明らかな既存の構造・観察位置へ移動する導線を追加。
- 下頭頂小葉の着色がアトラスの一部区画であることを明示し、脳梁の試作境界についての注意を日英で追加。
- クイズの設定欄の幅を確保し、利用可能な幅に応じて見出し・余白と3D／問題文の配置を調整。狭い断面操作欄も折り返す。
- 中間幅のPCでも上部メニューを2段に分け、英語の長いラベルが操作欄や詳細の値に重ならないよう調整。

既存100問の日本語問題文・正答キーは変更していません。開発ブランチでは上記47 voxelと対応する第四脳室メッシュを修正し、中脳標本では模式的な筒による組織の人工的な穴あけを撤回しました（未公開）。[全構造AIレビュー](FULL_ANATOMY_REVIEW.md)は、修正前の全37非空IDの全Z範囲（1,275原画像／輪郭対）、疑い箇所の直交面、自由観察72項目と全8ブロック44レイヤーの個別多方向目視まで完了しました。脳梁・脳幹の欠け／混入候補、第四脳室ラベルへの中脳水道混在、尾状核尾部の未収録などを記録し、確実な注意表示を日英で訂正しました。全境界が正常という判定ではなく、曖昧な形状の修復と専門家確認は残ります。

実装・検証記録は[全体レビュー進捗](SEPTEMBER_REVIEW_PROGRESS.md)を参照してください。保存はブラウザ単位で、自動送信やアカウント間同期は行いません。

## September 5–6 review candidate — not yet published

This development branch includes:

- Per-question mistake history, question-type filters, less repetitive ordering, and explanations comparing an incorrect choice with the correct answer.
- A more prominent learning entry, collapsible surface-label notes, and layer controls moved clear of the 3D model.
- Browser-local restoration of section positions and layout, plus revision-pinned observation links (rotation and zoom are excluded).
- Consistent explicit phone mode, guided/free block categories, and archived alternative-model proposals.
- English corrections across surface views, sections, all eight blocks, pathway guides, and the 55 additional concept questions. The unmeasured visibility rating has been removed.
- Links from supported contributor-review entries to existing structure observations.
- Clarified the limited atlas-parcel coverage of the inferior parietal overlay and added Japanese/English caveats about the provisional callosal boundary.
- Responsive quiz typography and panel layout, a wider desktop settings rail, and reflowing slice controls in narrow panels.
- Two-row navigation at intermediate desktop widths and wrapping detail labels to prevent long English text from overlapping adjacent controls or values.

The 100 Japanese questions and answer keys are unchanged. The development branch includes the 47-voxel correction above and its fourth-ventricle mesh update, and removes an artificial excavation from the midbrain tissue mesh. None of these changes is published. The [completed AI anatomical review](FULL_ANATOMY_REVIEW.md) covers the full occupied Z range of all 37 previously nonempty IDs (1,275 raw-image/outline pairs), targeted orthogonal checks, all 72 free-observation items and all 44 layers of the eight blocks in multiple views. Findings include callosal/brainstem boundary problems, an aqueduct portion mixed into the fourth-ventricle label, and incomplete caudate-tail coverage. Specific learner caveats were corrected in Japanese and English. This is not a finding that every boundary is normal: uncertain geometry repairs and expert review remain outstanding. Merge and publication require separate approval.

> **English edition (project-reviewed preview) (updated 2026-08-30):** A follow-up browser audit found residual corruption in short anatomy labels, controls, and several quiz prompts. The current candidate derives learner anatomy names from their recorded English/Latin source terms and adds regression checks for those reported failures. The paired English labels shown in the canonical Japanese edition were also re-audited for correspondence and standard anatomical wording. It has not received expert anatomical review or independent native-language proofreading; the Japanese edition remains the canonical project source. See [ENGLISH_EDITION_AUDIT.md](ENGLISH_EDITION_AUDIT.md).

脳解剖実習の予習・復習を目的とした、非営利の学習補助アプリです。単一標本の連続断面、全脳3Dモデル、構造の重ね合わせ、脳表・ブロック標本の観察、構造同定クイズを一つの画面系で扱うことを目標に開発しています。

主対象はPCと横向きタブレットです。スマートフォンでも閲覧、クイズ、基本操作を利用できますが、画面の広さが必要な全3D操作の正式な推奨端末とはしません。授業や監督下の実習を置き換えるものではありません。

現在は**公開α版**です。未収録・専門家未確認の構造を明示したうえで、神経解剖学の監修、セグメンテーション確認、3Dモデル、教材設計、Web実装の共同制作者を募集できる導線をアプリ内に用意しています。ブロック標本は位置関係を学ぶための試作教材として提供し、形状・範囲・接続関係の完全性や解剖学的正確性は保証しません。

2026-08-24時点では、公開α版へβ候補向け更新を積み上げた refresh candidate をローカルで準備中です。これはまだ公開前の更新候補であり、β版の公開や専門家による承認を意味しません。2026-08-14の初回αゲート（歴史記録）と、現行候補の状態は [ALPHA_RELEASE_AUDIT.md](ALPHA_RELEASE_AUDIT.md) で区別しています。

新規の教育用3Dモデル制作は当面見送り、現行MNI脳表を継続使用します。領域を着色しても脳回の丸みや脳溝の陰影を自然に保つ描画方法は、β版の公開条件とは分けた今後の課題として検討します。β版までの優先順位、完了条件、公開判断は [BETA_ROADMAP.md](BETA_ROADMAP.md) に整理しています。

> **公開条件（重要）**
> 現在の配布物には BigBrain 由来データが含まれるため、公開・再配布は **非営利目的に限られます**。BigBrain 由来の改変データは CC BY-NC-SA 4.0 の表示・非営利・継承条件に従う必要があります。商用利用には権利者から別途許諾を得るか、該当データを商用利用可能な素材へ差し替えてください。

## 現在の機能

- BigBrain 0.5 mm 単一標本脳を用いた冠状断・水平断・矢状断の連続観察
- 固定脳 MRI 0.444 mm、平均 T1/T2 の比較表示
- 複数構造の同時着色、クリック同定、ホイール拡大、Shift + ドラッグ移動
- 全脳3Dモデル上での切断位置確認、脳表・分節・透過・切断表示、ホイール拡大
- 脳表モデルの小脳脱着
- BigBrain 0.5 mm単一標本から1 mm形状で再構成した、側脳室、視床・視床下部、レンズ核・投射線維、脳梁・脳弓、脈絡叢、海馬・扁桃体、中脳横断、後脳の8種の局所3D標本
- 局所標本の構造部品を複数同時に着脱し、標本組織を通常・透過・非表示へ切替、選択構造だけを単独表示
- 脳幹・小脳標本と神経血管表示での小脳・橋／延髄の独立脱着（中脳は保持）
- CerebrAを高密度脳表へ対応させた、左右31ラベルを学習単位へ統合した26領域の複数選択・着色
- 自由観察モードでの3D脳表クリック同定、日本語名・ひらがなの読み・英語名・同義語の部分一致検索、分類別構造索引、選択構造だけのカード表示、複数選択・一括解除、全脳／左右半球・小脳・血管・脳神経の表示切替（Latin原語は検索互換用に内部保持）
- 中心溝、中心前溝、外側溝、上前頭溝、大脳縦裂、頭頂後頭溝、鳥距溝、嗅溝を脳回着色と独立して個別表示する模式3Dガイド
- 脳底面で視神経・視交叉・視索、漏斗（下垂体茎）、乳頭体、前有孔質を個別強調する模式3Dランドマーク
- 下面の嗅球・嗅索、大脳脚、錐体、オリーブと、内側面の脳梁・脳弓・視床・視床下部を個別に着脱する立体部品
- 大脳基底核、脳室系、辺縁系などの一括表示
- 実習講義の到達目標を基にした45表示対象・全100問の復習クイズ（名称同定45問、機能・位置関係・経路を問う試作55問。追加55問は専門家未確認）
- クイズの5/10/15/20問指定・項目指定、間違い問題の端末内保存と履歴消去
- 脳表観察内で高密度全脳モデルへ主要脳底動脈と脳神経根を重ねる、脱着・脳表透過・個別構造強調が可能な教育用模式3Dレイヤー
- 共同制作者向けの水平断手動セグメンテーション編集、ブラシ・消去・差分取消・Undo/Redo・端末内自動保存・版固定差分JSON入出力・複数差分の競合監査
- 学生向けのHome・脳表・断面・ブロック標本・復習と、匿名報告・公開相談・具体的変更・セグメンテーション編集・運営方針を整理した独立の「共同制作」ページ

Homeは約19 KBの実モデル静止プレビューだけを表示し、脳表の本格3Dメッシュは脳表観察を開いた時点で取得します。学生画面の由来表示は「標本対応」「試作」「模式」等へ短縮し、詳細表示と由来台帳では従来の根拠・確度を維持します。

本アプリは教育用です。診断、治療方針の決定、研究用の定量解析には使用できません。試作ラベルは解剖学的正解データではありません。

講義範囲に対する実装状況と、必修／発展の優先順位は [LEARNING_SCOPE.md](LEARNING_SCOPE.md) に整理しています。全6資料との構造単位の照合と、標本分節・模式表示・未収録を区別した結果は [LECTURE_COVERAGE_AUDIT.md](LECTURE_COVERAGE_AUDIT.md)、構造表示の由来・確度・監修状況は [STRUCTURE_PROVENANCE.md](STRUCTURE_PROVENANCE.md)、公開α版の監査結果は [ALPHA_RELEASE_AUDIT.md](ALPHA_RELEASE_AUDIT.md)、β版への作業計画は [BETA_ROADMAP.md](BETA_ROADMAP.md) に記録しています。

## ローカル実行

Node.js 22 以降を使用します。

```bash
npm install
npm run dev
```

日本語版と英語版には、それぞれ独立した意見募集用Google Formの回答者URLを設定済みです。別フォームへ切り替える場合は、`.env.example` を参考に日本語版を `VITE_FEEDBACK_FORM_URL`、英語版を `VITE_FEEDBACK_FORM_URL_EN` で上書きできます。英語フォームは共同制作者募集を含まず、日本語フォームへフォールバックしません。編集URLと回答スプレッドシートURLは公開コードへ設定しません。対応ソースは [bonnginn/brain-practical-navi](https://github.com/bonnginn/brain-practical-navi)、不具合・修正提案は [GitHub Issues](https://github.com/bonnginn/brain-practical-navi/issues) で公開します。

日本語フォームは `scripts/create_google_feedback_form.gs`、英語の匿名フィードバック専用フォームは `scripts/create_google_feedback_form_en.gs` をGoogle Apps Scriptで実行すると、回答スプレッドシートと運用メモを自動生成できます。作成後はGoogle Forms側で回答者の公開範囲を確認し、実行ログの `RESPONDER_URL` を対応する環境変数へ設定してください。詳しくは `ALPHA_FEEDBACK.md` を参照してください。

質問項目と運用案は [ALPHA_FEEDBACK.md](ALPHA_FEEDBACK.md) に用意しています。

手動セグメンテーションの差分形式、Pull Requestに必要な情報、検証・統合方法は [SEGMENTATION_WORKFLOW.md](SEGMENTATION_WORKFLOW.md) を参照してください。ブラウザ編集は元ラベルを直接変更せず、採用前の差分だけを作成します。

ビルド確認:

```bash
npm run build
npm test
```

Windows側のCodexへ開発を引き継ぐ場合は、取得手順、実画面の確認順、既知の注意点をまとめた [WINDOWS_HANDOFF.md](WINDOWS_HANDOFF.md) を参照してください。

## データとライセンスの要約

| アプリ内データ | 主な出典 | 適用条件 | このアプリでの変更 |
| --- | --- | --- | --- |
| BigBrain 単一標本脳 0.5 mm、固定脳 MRI 0.444 mm | BigBrain / McGill | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) | ブラウザ表示用の再標本化、圧縮、マスク、色調整 |
| BigBrain由来の局所3D標本 | BigBrain 0.5 mm＋本プロジェクトの実用分節 | CC BY-NC-SA 4.0 | 1 mm形状への再構成、組織濃淡の頂点格納、脳室腔・皮質下核・白質候補の部品分離 |
| BigBrain 手動皮質下核ラベル | Xiao et al. の BigBrain co-registration dataset | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。ただし基になる BigBrain は CC BY-NC-SA 4.0 | ラベル番号の変換、0.5 mm 格子への格納、圧縮 |
| MNI152NLin2009cSym T1/T2・組織確率・CerebrA | TemplateFlow / MNI / McGill | MNIライセンス（著作権表示を全コピーに保持） | ブラウザ表示用の8-bit化、圧縮、表示メッシュ生成 |
| 高密度白質表面 | BigBrainWarp 配布物内の MNI152 surface | 同梱 `COPYING` の MNIライセンス | 法線方向へ展開した pial-like 表面、独自バイナリ化 |
| 脳表領域ID | CerebrA / MNI152NLin2009cSym | MNIライセンス | 対応白質表面の法線方向±3 mm以内で標本化し、pial-like頂点へ格納 |
| IDs 23–29、33–35 | CerebrA由来の教育用マスク | MNIライセンス。BigBrain格子と併用する公開物全体は上記非営利条件を遵守 | 脳室・脳幹・小脳・視交叉・島皮質をBigBrain格子へ再標本化 |
| IDs 30–32 | 本プロジェクトの画像誘導試作 | 正解ラベルではない。BigBrain派生表示とともに配布する場合は CC BY-NC-SA 4.0 | 脳梁・内包候補を計算生成 |
| IDs 39–40 | BigBrain水平連続切片から作成した左右乳頭体 | BigBrainのCC BY-NC-SA 4.0 | プロジェクト内確認を経た公開教材ラベル。研究用正解マスクではなく、直交断確認で改訂可能 |
| 模式3D局所補助・脳表／脳底・神経血管 | 本プロジェクトの手作業経路・形状 | CC BY-NC-SA 4.0 | 主要な溝・裂の線状ガイド、放線群、脈絡叢、小脳脚、丘・膝状体、菱形窩・錐体・オリーブ等の位置目安、脳弓・乳頭体・中脳水道、前有孔質、嗅球を含む脳底ランドマーク・神経血管の重ね合わせ。旧海馬采・鉤近似はβ候補から除外 |

完全な出典、必須表示、改変内容、引用文献、公開前チェックは [DATA_AND_LICENSES.md](DATA_AND_LICENSES.md) を参照してください。公開配布する `public/atlas/` の全ファイルは [DATA-MANIFEST.json](public/atlas/DATA-MANIFEST.json) で出典群、改変、ライセンス、表示義務、同梱通知へ機械的に対応づけています。SNS共有画像を含む公開視覚素材は [ASSET-NOTICE.txt](public/ASSET-NOTICE.txt) と [PUBLIC_ASSET_CREATION_RECORD.md](PUBLIC_ASSET_CREATION_RECORD.md) で用途・非転載・作成履歴を明示しています。アプリ右上の「利用条件・クレジット」にも同じ要点を表示します。

公開HTTPSホストの本番版だけで、利用状況と表示性能の把握に [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/about/) を使用します。localhost、127.0.0.1、開発ビルドではビーコンを読み込みません。Cloudflareの説明ではCookieやlocalStorageを使わず、訪問者の個人データを収集・利用しません。本アプリ側でも利用者を識別する独自IDは付与しません。

クイズの間違い履歴、セグメンテーション編集差分、3DモデルA/B比較レビュー下書きは、利用中のブラウザのlocalStorageだけに保存し、自動送信しません。サイトデータを消去すると失われます。JSON書き出しは利用者が明示的に操作した場合だけ行い、提出・採用・専門家確認を意味しません。比較レビューは氏名・メールアドレス・所属を入力項目に持たず、任意メモにも個人を特定できる情報を入力しないよう画面上で案内します。

## 引用

本データを用いた成果物では、少なくとも次を引用してください。

- Amunts K, et al. *BigBrain: an ultrahigh-resolution 3D human brain model.* Science. 2013;340(6139):1472–1475. [doi:10.1126/science.1235381](https://doi.org/10.1126/science.1235381)
- Xiao Y, et al. *Bridging micro and macro: accurate registration of the BigBrain dataset with the MNI PD25 and ICBM152 atlases.* [doi:10.1101/561118](https://doi.org/10.1101/561118)
- Manera AL, et al. *CerebrA, registration and manual label correction of Mindboggle-101 atlas for MNI-ICBM152 template.* Scientific Data. 2020;7:237. [doi:10.1038/s41597-020-0557-9](https://doi.org/10.1038/s41597-020-0557-9)
- Paquola C, et al. *BigBrainWarp: Toolbox for integration of BigBrain 3D histology with multimodal neuroimaging.* eLife. 2021;10:e70119. [doi:10.7554/eLife.70119](https://doi.org/10.7554/eLife.70119)

## 参考資料

実習講義スライド、教科書『プラクティカル 解剖実習 脳』、ハインズ神経解剖学アトラス、3D Brain、病理組織センター等を、学習項目やUIの検討時に参照しています。

アプリ内の主要な溝・裂の線状ガイド、放線冠・視放線・聴放線、脈絡叢、脳弓、乳頭体、中脳水道、小脳脚と、視床下部・透明中隔・大脳脚・丘・膝状体・前有孔質・菱形窩・錐体・オリーブの位置目安、嗅球を含む視覚路・漏斗、脳底動脈、脳神経レイヤーは、本プロジェクトが主要経路と形状を標準空間へ手作業で置いて生成した模式3Dです。III–XIIの見かけの起始部は同一格子の脳幹表面へ合わせていますが、これらは正解セグメンテーションではありません。個人差、微細枝、末梢走行、頭蓋孔、正確な径は省略しています。局所標本の褐色組織、手動分節された皮質下核、試作脳室腔とは、画面・メタデータ・権利文書で出典と精度区分を分けています。旧海馬采・鉤近似は形状と連続性の根拠が不足するため配布していません。

## ライセンス

- アプリケーションコード: **AGPL-3.0-or-later**。全文は `LICENSE` を参照してください。変更したWeb版をネットワーク越しに提供する場合、利用者へその変更版の対応ソースを取得する機会を提供する必要があります。
- 本プロジェクトが作成した教材文書: **CC BY-NC-SA 4.0**。
- BigBrain、MNI、CerebrA等のデータ・派生物: 素材ごとの原ライセンス。

詳しい境界は `LICENSES.md`、データ監査は `DATA_AND_LICENSES.md` を参照してください。AGPLはオープンソースでありコードの商用利用自体は排除しませんが、現在の完全版には非営利条件を持つBigBrain由来データが含まれるため、同梱データを含む版の商用利用はできません。

共同制作の入口は `CONTRIBUTING.md`、運営と採否は `GOVERNANCE.md`、クレジットは `CONTRIBUTORS.md` に分けています。共同制作者は原則としてGitHubアカウントを持ち、本人またはCodex・Claude Code等の支援ツールを利用して変更とPull Requestを自分で管理できる人を対象とします。知見・意見のみでの継続参加は役割を個別に相談します。投稿コミットにはDCO 1.1の `Signed-off-by` を求めます。

公開時はプロジェクト管理者が公式版を統括します。将来、本格的な運営を希望し、継続実績と管理能力を確認できる人または団体が現れた場合、GitHubリポジトリや公開運用の承継、管理者保有権利の利用許諾・譲渡を別書面で協議する余地を残します。リポジトリ移管は既存Contributorの著作権移転を意味せず、第三者データには原ライセンスが残ります。

## 公開前チェック

- [x] GitHubに公開リポジトリを作成し、公開Web版から対応ソースへリンクする
- [x] 同梱データを含む公式アプリを非営利で提供する
- [x] アプリ内の「利用条件・クレジット」を維持する
- [x] `public/atlas/` のライセンス・帰属表示を同梱する
- [x] BigBrain由来データの変更点と CC BY-NC-SA 4.0 を表示する
- [x] MNI著作権表示を全コピーに保持する
- [x] 講義資料・教科書・ウェブサイトの図版をアプリへ転載していないことを確認する
- [x] コードをAGPL-3.0-or-later、自作教材文書をCC BY-NC-SA 4.0と明示する
- [x] 公開URLでデータ取得と権利表示が正常に動くことを確認する

この文書は開発上のライセンス監査結果であり、法的助言ではありません。判断が重要な公開・共同研究・商用利用では、所属機関の知財担当者または法律専門家へ確認してください。
