# 脳実習ナビ

## 2026-09-07 α更新 / Alpha update

[日本語の教材](https://bonnginn.github.io/brain-practical-navi/) · [English edition](https://bonnginn.github.io/brain-practical-navi/?lang=en) · [参考文献 / References](https://bonnginn.github.io/brain-practical-navi/#workspace/legal)

採用済みの原画像に基づく脳室等の塗り残し・誤収録修正、位置合わせを見直した皮質下核ラベル、関連3D・ブロック部品の同期を含むα更新です。利用条件・クレジットには、用途と限界を添えた参考文献8件を日英で掲載しています。ブロック操作部の重なり回避、模式神経血管の表示・説明とクイズの扱いも改善しています。分節全体や専門家レビューは未完了で、脳弓・視放線等の未採用候補を新たな確定ラベルとして追加していません。

This alpha update includes adopted source-image-based repairs to ventricular and other labels, subcortical labels with reviewed registration, and synchronized section meshes and block components. Terms and Credits lists eight references in Japanese and English with their uses and limitations. Block controls, schematic neurovascular displays and explanations, and their treatment in quizzes have also been improved. Segmentation and expert review remain incomplete; unadopted fornix, optic-radiation and other candidates have not been added as established labels.

ユーザー承認によりこの範囲を公開対象としました。追加の自律的な解剖学レビューは停止中です。以下の「未公開」「進行中」は各作業時点の履歴であり、最新の公開状態は [Pages履歴](https://github.com/bonnginn/brain-practical-navi/actions/workflows/pages.yml) で確認できます。

The user authorized publication of this scope. Further autonomous anatomical review remains paused. “Unpublished” and “in progress” statements below are historical checkpoints; see [Pages deployments](https://github.com/bonnginn/brain-practical-navi/actions/workflows/pages.yml) for the current publication status.

開発状況（2026-09-07・一時停止）：第四脳室8 voxel追加と第三脳室4 voxel除外を採用し、関連3Dを同期しました。分節統合後の全561テスト成功。さらに「利用条件・クレジット」へ用途・限界付きの参考文献8件を日英で追加し、関連81テスト・型検査・通常ビルド・日英ブラウザ表示・配信データ一致を確認しました。ユーザー指示で自律作業を停止し、再開待ちです。専門家確認・全体完成・公開更新ではありません。[停止時点と公開候補](PAUSE_CHECKPOINT_2026-09-07.md)。以下は過去の工程記録です。

Development checkpoint (2026-09-07; paused): eight fourth-ventricle voxels were added and four third-ventricle voxels removed, with related 3D data synchronized. All 561 tests passed after segmentation integration. Eight references with their uses and limitations were then added to Terms and Credits in Japanese and English; 81 related tests, type checking, the normal build, bilingual browser checks, and served-data equality passed. Autonomous work is paused at the user's request, awaiting explicit resumption. This is not expert approval, completion of the overall review, or a public update. See the [checkpoint and publication candidates](PAUSE_CHECKPOINT_2026-09-07.md). Earlier development records follow.

最新の開発状況（上方後壁）：第四脳室の未着色111 voxelを、連続24面と代表直交断の原画像レビューに基づいて補完し、関連3部品と断面3Dを同期しました。全561テスト・型検査・ビルド・配信データ一致・断面と関連3ブロックの初期描画を確認し、ローカル表示を更新しました。下方の開放域などは未解決で、専門家確認・公開更新ではありません。

Latest development status (upper posterior margin): 111 omitted fourth-ventricle voxels were filled after reviewing 24 consecutive source planes and representative orthogonal views. Three related parts and section meshes were synchronized. All 561 tests, type checking, build, served-data equality and initial rendering of the section and three affected blocks passed; the local preview was refreshed. Lower open spaces and other unresolved boundaries remain; this is neither expert review nor a public update.

最新の開発状況：第四脳室の前方に残る27点（未着色16点・脳幹からの再分類11点）を修正し、関連4部品と断面3Dを同期しました。同じ前方探索条件で残候補0を確認していますが、後方の開放域や薄い境界の確認は継続中です。型検査・ビルド・配信一致・断面/関連3ブロックの初期描画を確認。全561試験中560成功、旧mesh参照1件は修正後に対象3試験成功。ローカル表示のみ更新、専門家確認・公開更新ではありません。

Latest development status: 27 remaining anterior fourth-ventricle cells were corrected (16 omissions and 11 brainstem reclassifications), with four related parts and section meshes synchronized. The same anterior search now finds no remaining candidates; posterior open spaces and thin boundaries still require review. Type checking, build, served-data equality and initial rendering of the section and three affected blocks passed. The full run passed 560 of 561 tests; one historical mesh-reference assertion was corrected and all three targeted tests passed. Local preview only; not expert review or a public update.

最新の開発追補：第四脳室の腔縁で脳幹と誤分類されていた48 voxelを第四脳室へ修正し、断面用3Dを同期しました。原画像の連続60面と代表直交断によるAIレビューで、専門家確認ではありません。型検査・ビルド・配信データ一致・断面/3D初期描画を確認し、ローカル表示を更新。全561試験中558成功、旧総数参照の3件は修正後に対象6試験成功。全体の分節確認は継続中、未公開です。

Latest development follow-up: 48 voxels misclassified as brainstem along the fourth-ventricle lumen margin were reassigned to the fourth ventricle, with section meshes synchronized. This is AI review of 60 consecutive source planes and representative orthogonal views, not expert review. Type checking, the build, served-data equality and initial section/3D rendering passed; the local preview was refreshed. The full run passed 558 of 561 tests; three outdated current-count assertions were updated and all six targeted tests then passed. The broader segmentation review remains ongoing. Not published.

開発追補：第四脳室の脳幹側の塗り残し173 voxelを補完しました。原画像の連続断と代表直交断に基づく局所修復で、小脳側の開放域は拡張していません。型検査・ビルド・配信一致・断面と関連3ブロックの描画を確認し、ローカル表示を更新しました。全561試験中558成功、古いmesh参照の3件は履歴を保持して修正し対象6試験成功。専門家確認・全脳室完成ではなく、未公開です。

Development follow-up: 173 omitted voxels along the brainstem-facing fourth-ventricle margin were filled after contiguous and representative orthogonal source-image review. The cerebellar-facing open region was not extended. Type checking, the build, served-data equality and initial rendering of the section and three affected blocks passed; the local preview was refreshed. The full run passed 558 of 561 tests; three historical mesh-reference assertions were corrected while preserving their original evidence, and all six targeted tests passed. Not expert review, completed ventricular segmentation or a public update.

開発追補：脳回内の白質にあった側脳室の誤ラベルを左右各1点除外し、断面用3Dを同期しました。腔縁にある他の小片は一律削除していません。原画像に基づくAIレビューであり、専門家確認ではありません。全561テスト・型検査・ビルド・配信データ一致・断面と3Dの初期描画を確認し、ローカル表示を更新しました。未公開です。

Development follow-up: one false lateral-ventricle voxel within gyral white matter was removed on each side, with section meshes synchronized. Other fragments along cavity margins were not indiscriminately deleted. This is source-image-based AI review, not expert review. All 561 tests, type checking, the build, served-data equality and initial section/3D rendering passed; the local preview was refreshed. Not published.

開発追補：左側脳室の内側・前方の塗り残し1,092 voxelを補完し、関連3部品と断面3Dを同期しました。左右の腔の間にある薄い組織は残しています。原画像の連続75面・代表直交9面に基づくAI画像レビューで、専門家確認・全脳室の完成ではありません。全561テスト・型検査・ビルド・配信データ一致と断面/関連3ブロックの初期描画を確認し、ローカルプレビューを更新しました。未公開です。

Development follow-up: 1,092 omitted voxels along the medial anterior left lateral ventricle were filled, with three related parts and section meshes synchronized. The thin tissue separating the two cavities is retained. This is AI image review of 75 contiguous source planes and nine representative orthogonal planes, not expert review or completed ventricular segmentation. All 561 tests, type checking, the build, served-data equality and initial rendering of the section and three affected blocks passed. The local preview was updated. Not published.

開発追補：右側脳室の前方領域の塗り残し4,515 voxelを補完し、関連7部品と断面3Dを同期しました。型検査・ビルド・配信データ一致、断面と関連4ブロックの初期描画を確認。同一断面の修正前後比較も用意しています。対象89件成功、全561件中558成功・古い総数参照の3件は修正後3/3再確認済みです。原画像の連続105面と代表直交断に基づくAI画像レビューであり、専門家確認・全脳室の完成ではありません。未公開です。

Development follow-up: 4,515 omitted voxels in the anterior right lateral ventricle were filled, with seven related parts and section meshes synchronized. Type checking, the build, served-data equality and initial rendering of the section and four affected blocks were checked. A same-slice before/after comparison is available. All 89 focused tests passed. The full run passed 558 of 561 tests; three outdated total-count assertions were corrected and passed on targeted rerun. This is AI image review of 105 contiguous source planes and representative orthogonal views, not expert review or completed ventricular segmentation. Not published.

開発追補：左側脳室の前方終端の塗り残し3,341 voxelを追加補完し、関連5部品と断面3Dを同期しました。対象試験（監査ファイル名修正後の再試験を含む）・型検査・ビルド、断面と関連4ブロックの初期描画、配信データ一致を確認しました。連続60面と代表直交断に基づくAI画像レビューであり、専門家確認・全脳室の完成・公開更新ではありません。以下は先行工程の履歴です。

Development follow-up: 3,341 omitted voxels at the anterior end of the left lateral ventricle were filled, with five related parts and section meshes synchronized. Focused tests (including a rerun after correcting an audit filename), type checking, the build, initial rendering of the section and four affected blocks, and served-data equality passed. This is AI image review of 60 contiguous source planes and representative orthogonal views, not expert review, completed ventricular segmentation, or a public update. Earlier checkpoints follow.

開発追補：左側脳室の前方へ続く腔の塗り残し2,224 voxelも補完しました。関連5部品と断面3Dを同期し、全561テスト・型検査・ビルド、断面と関連4ブロックの初期描画、配信データ一致を確認済みです。原画像の連続51面と代表直交断に基づくAIレビューであり、専門家レビュー・全脳室の完成ではありません。未公開です。

Development follow-up: another 2,224 omitted voxels in the anterior continuation of the left lateral ventricle were filled. Five related parts and section meshes were synchronized. All 561 tests, type checking, the build, initial rendering of the section and four affected blocks, and served-data equality passed. This is AI review of 51 contiguous source planes and representative orthogonal views, not expert review or completed ventricular segmentation. Not published.

開発追補：左側脳室の塗り残し5,757 voxelを追加補完し、断面3Dと関連5部品を同期しました。全561テスト・型検査・ビルド、ローカル断面と関連4ブロックの初期描画を確認済みです。同じ断面の修正前後比較も用意しました。原画像の連続断・代表直交断に基づくAIレビューであり、専門家確認・全脳室の完成ではありません。未公開です。以下は先行工程の履歴です。

Development follow-up: 5,757 additional omitted voxels in the left lateral ventricle were filled, with section meshes and five related parts synchronized. All 561 tests, type checking, the build, and initial local rendering of the section and four affected blocks passed. A same-slice before/after comparison is available. This is AI review of contiguous and representative orthogonal source images, not expert review or completed ventricular segmentation. Not published. Earlier checkpoints follow.

開発追補：右側脳室の後方・上方の塗り残し7,160 voxelを追加補完し、断面3Dと関連9部品を同期しました。全561テスト、型検査、ビルド、ローカル断面と関連5ブロックの初期描画を確認し、プレビューを更新しました。連続断・代表直交断に基づくAI画像レビューであり、専門家レビューや全脳室の完成ではありません。未公開です。以下は先行工程の履歴です。

Development follow-up: 7,160 additional omitted voxels in the posterior and superior right lateral ventricle were filled, with section meshes and nine related parts synchronized. All 561 tests, type checking, the build, and initial local rendering of the section and five affected blocks passed; the preview was refreshed. This is AI review of contiguous and representative orthogonal images, not expert review or completed ventricular segmentation. Not published. Earlier checkpoints follow.

開発追補：右側脳室の後方へ続く腔をさらに2,308 voxel補完しました（先行421・830 voxelとは別）。連続断面・代表直交断に基づく修正で、断面用3Dと関連8部品を同期しました。型検査・ビルド・ローカル断面/3D・関連5ブロックの初期描画と配信データ一致を確認済みです。専門家レビュー・全脳室の完成ではなく、未公開です。

Development follow-up: a further 2,308 omitted voxels in the posterior continuation of the right lateral ventricular cavity were filled, in addition to the earlier 421 and 830. The repair used contiguous and representative orthogonal image review; section meshes and eight related parts were synchronized. Type checking, the build, local section/3D rendering, initial rendering of five affected blocks and served-data equality were checked. This is not expert review or completed ventricular segmentation and is not published.

最新の開発分節：右側脳室下部の塗り残し421 voxelを原画像の連続断・代表直交断に基づき補完し、孤立していた142 voxelが本体へ接続しました。断面用3Dと関連7ブロック部品を同期。対象89テスト・型検査・ビルド・ローカル水平断72と関連4ブロックの描画を確認しました。全561件中558成功、旧count参照の3件は修正後3/3再検証成功です。専門家レビューや全脳室の完成ではなく、公開サイトは未変更です。以下は先行工程の記録です。

Latest development segmentation: 421 omitted voxels in the lower right lateral ventricle were filled following contiguous and representative orthogonal source-image review, connecting a previously isolated 142-voxel fragment to the main component. Section meshes and seven related block parts were synchronized. All 89 targeted tests, type checking, the build and local rendering of horizontal position 72 and four affected blocks passed. The full run passed 558 of 561 tests; three outdated count references were corrected and all three passed on targeted rerun. This is neither expert review nor completed ventricular segmentation; the public site is unchanged. Earlier checkpoints follow.

開発UI：ブロック標本の操作・選択数を3D画像の外へ移し、狭い画面でモデルが説明枠に隠れる問題を軽減しました。短い画面では操作欄までカード内をスクロールします。形状・分節は変更していません。未公開です。

Development UI: block-specimen controls and the selected-layer count now sit outside the 3D image, reducing model obstruction in narrow views. Short views require scrolling within the card to reach the controls. Geometry and segmentation are unchanged. Not yet published.

開発版の説明訂正：動眼神経の模式管を、原画像から追跡した脳内線維束や確定した脳外経路と誤解しないよう日英の注意を具体化しました。形状の修正や専門家確認を意味しません。

Development clarification: the Japanese and English oculomotor-nerve notes now explicitly distinguish the authored tube from image-traced intramesencephalic fascicles or an established extra-axial course. This is not a geometry repair or expert validation.

最新の開発版：原画像で脳室外と判断した飛び地46 voxel（左側脳室12、第三脳室34）を除外し、関連3Dを同期しました。全561件中558成功、旧履歴参照の3件は修正後の対象再検証で成功。型検査・通常ビルド・ローカル断面/3D描画と配信データ一致を確認し、右プレビューを更新しました。専門家レビューと全脳室の分節は未完了、公開サイトは未変更です。以下は先行工程の記録です。

Latest development checkpoint: 46 isolated voxels judged outside the ventricles on source images (12 left lateral, 34 third ventricular) were excluded, with related 3D meshes synchronized. The full run passed 558 of 561 tests; three historical-reference failures passed targeted reruns after correction. Type checking, the normal build, local section/3D rendering and served-data equality checks passed, and the preview was refreshed. Expert review and complete ventricular segmentation remain unfinished. The public site is unchanged. Earlier checkpoints follow.

開発版：左側脳室下角の塗り残しを、先行233 voxelに加えて1108 voxel補完しました。断面用3Dと関連する間脳背景組織を同期し、ローカルプレビューを更新しています。全560テストの実行で見つかった履歴参照3件を修正し、対象を含む9テストの再検証、型検査、ビルド、水平断/3D・間脳ブロックの表示確認を終えました。原画像の連続断と代表直交断によるAIレビューであり、専門家レビューや全脳室の完成ではありません。公開サイトは未変更です。[進捗](ANATOMY_REMAINING_WORK.md)。以下は過去のチェックポイントです。

Development: a further 1,108 missing voxels in the inferior horn of the left lateral ventricle were filled after the earlier 233-voxel repair. Section-view meshes and the affected diencephalic context mesh were synchronized, and the local preview was refreshed. The 560-test run identified three historical-reference mismatches; these were corrected and all nine targeted tests passed on rerun. Type checking, the build and local visual checks of horizontal sections, ventricular 3D and the diencephalic block also passed. This is AI review of contiguous and representative orthogonal source images, not expert review or completed ventricular segmentation. The public site is unchanged. [Progress](ANATOMY_REMAINING_WORK.md). The entries below are historical checkpoints.

最新の開発変更：右側脳室の塗り残し34 voxelを、連続直交断と高解像度原画像の確認後に補完しました。断面3D・関連5ブロック部品を同期し、旧データを保存しています。全559テスト・型検査・ビルドとローカル断面/3D・関連3ブロックの描画確認を終え、右プレビューを更新しました。公開サイトは未変更、専門家レビューではありません。[根拠・進捗](LATERAL_VENTRICLE_FRINGE_REVIEW.md)。以下は過去の検証履歴です。

Latest development change: 34 omissions in the right lateral ventricle were filled after contiguous orthogonal and representative high-resolution source-image review. Section-view meshes and five related block parts were synchronized, with recovery data retained. All 559 tests, type checking, the build and local section/3D and three-block visual checks passed; the preview was refreshed. The public site is unchanged. This is not expert review. [Evidence and progress](LATERAL_VENTRICLE_FRINGE_REVIEW.md). Results below describe earlier checkpoints.

最新の開発変更：右側脳室の画像確認済みの塗り残し21 voxelを補完し、断面3D・関連6ブロック部品を同期しました。全558テスト・型検査・ビルドとローカル水平断/3D・関連3ブロックの描画確認を終え、右プレビューを更新しました。公開サイトは未変更で、全脳室の分節完成や専門家レビューではありません。[根拠・進捗](LATERAL_VENTRICLE_FRINGE_REVIEW.md)

Latest development change: 21 image-reviewed label omissions in the right lateral ventricle were filled, with section-view meshes and six related block parts synchronized. All 558 tests, type checking, the build and local visual checks of the horizontal section/3D view and three affected blocks passed; the preview was refreshed. Recovery data and evidence are retained. The public site is unchanged. This is not complete ventricular segmentation or expert review. [Evidence and progress](LATERAL_VENTRICLE_FRINGE_REVIEW.md)

開発版の最新変更：右側脳室へ誤分類された脳槽側の空隙80 voxelを、原画像3方向66面とnative100代表点の照合後に未ラベルへ戻しました。断面3D・関連5部品を同期し、復元データを保存。全557テスト・型検査・ビルドとローカル水平断/3D・関連3ブロックの描画確認を終え、右プレビューを更新しました。専門家レビュー・全脳室の分節完成・公開更新ではありません。[根拠・進捗](LATERAL_VENTRICLE_FRINGE_REVIEW.md)。以下の検証結果は各時点の履歴です。

Latest development change: 80 voxels in a cisternal-side gap, previously assigned to the right lateral ventricle, were returned to the unlabeled class after reviewing 66 source-image planes across three axes and representative native100 images. Section-view meshes and five affected block parts were synchronized, with recovery data retained. All 557 tests, type checking, the build and local visual checks of the horizontal section/3D view and three affected blocks passed; the preview was refreshed. This is not expert review, complete ventricular segmentation or a public release. [Evidence and progress](LATERAL_VENTRICLE_FRINGE_REVIEW.md). Verification results below describe earlier checkpoints.

開発版：側脳室に誤分類されていた溝状空隙547 voxelを、3方向117原画像面の確認後に未ラベルへ戻しました。断面用3Dと影響するブロック3部品を同期し、復元データを保存しています。全556テスト・型検査・本番ビルドとローカル断面/3D・関連2ブロックの表示確認を終え、右プレビューを更新しました。公開版は未変更です。[根拠・進捗](LATERAL_VENTRICLE_FRINGE_REVIEW.md)

Development: 547 voxels in a sulcal gap had been assigned to the lateral ventricle. After review of 117 source-image planes across three axes, they were returned to the unlabeled class. Section-view meshes and three affected block parts were synchronized, with recovery data retained. All 556 tests, type checking, the production build and local visual checks of the section/3D view and two affected blocks passed; the preview was refreshed. The public site is unchanged. [Evidence and progress](LATERAL_VENTRICLE_FRINGE_REVIEW.md)

開発版：第三脳室の局所的な塗り残し8 voxelを補完し、対応する全範囲3Dを同期しました。全555テスト・型検査・本番ビルドとローカル水平断/3D表示確認を終え、開発プレビューを更新しました。公開版は未変更、脳室全体の完成ではありません。[監査記録](SECTION_VENTRICLE_MESH_SYNC.md)

Development: eight local third-ventricular label omissions were filled and the corresponding full-extent 3D meshes synchronized. All 555 tests, type checking, the production build and a local horizontal-section/3D display check passed; the development preview was refreshed. The public site is unchanged, and ventricular segmentation remains incomplete. [Audit](SECTION_VENTRICLE_MESH_SYNC.md)

開発版：第四脳室の前方壁に残った未着色105 voxelを画像照合後に補完し、断面・ブロック部品・全範囲3Dを同期しました。全554テスト・型検査・本番ビルドとローカル実画面確認を終え、開発プレビューを更新しました。公開サイトの更新や全脳室の分節完成ではありません。[根拠・進捗](FOURTH_VENTRICLE_REPAIR.md)

Development: 105 image-reviewed omissions along the anterior fourth-ventricular wall were filled, with section labels, the block part and full-extent 3D meshes synchronized. All 554 tests, type checking, the production build and local visual browser checks passed; the development preview was refreshed. This is neither a public release nor complete ventricular segmentation. [Evidence and progress](FOURTH_VENTRICLE_REPAIR.md)

開発版：BigBrain断面の脳室3Dを現在の断面ラベルから再生成し、旧アトラスモデルとの参照不一致を修正しました。塗り残し・小片の検討は継続中で、ラベル本体の追加修正や公開更新ではありません。[確認範囲](SECTION_VENTRICLE_MESH_SYNC.md)

Development only: ventricular 3D selections in BigBrain section views now use meshes reconstructed from the current section labels. Remaining gaps and disconnected components still require review; this is not an additional label repair or a public release. [Scope](SECTION_VENTRICLE_MESH_SYNC.md)

開発版の更新：原画像で確認した側脳室の未着色40 voxelを補完しました。復元データと出典を保存し、全550テスト・型検査・本番ビルド・ローカル12表示のブラウザ確認と全画像目視は成功しました。脳室の残存不連続や未完成の白質束分節は残っており、専門家確認・公開反映を意味しません。

Development update: 40 image-reviewed unlabeled ventricular voxels have been added, with recovery data and provenance retained. All 550 tests, type checking, the production build and 12 local browser checks with screenshot review pass. Residual ventricular gaps and incomplete white-matter tract segmentation remain. This is neither expert validation nor a public release.

分節の参考文献・使用データ / [Segmentation references and data sources](SEGMENTATION_REFERENCES.md)（開発監査用 / development audit）。直接使用したデータと、説明・照合用の参考資料を区別しています。

最新検証：19点の局所修正は全549テスト、型検査、本番ビルド、ローカル12表示の実ブラウザ確認を通過しました。脳室の残存不連続、脳弓・視放線等の未完成分節は引き続き調査中です。専門家検証や公開反映ではありません。以下の進行中表記は履歴です。

Latest verification: the 19-voxel local repair passes all 549 tests, type checking, the production build and 12 local browser checks. Residual ventricular gaps and incomplete segmentation of structures such as the fornix and optic radiation remain under investigation. This is neither expert validation nor a public release; progress statements below are historical.

19点修正の続報：関連テスト・本番ビルド・ローカル12表示の実ブラウザ確認と全画像目視は成功しました。全テスト初回の旧監査参照3件を修正し、全体再検証中です。脳室の残存不連続は未解決で、公開版は変更していません。

19-voxel update: focused tests, the production build and 12 local browser checks with screenshot review pass. Three stale audit references found in the first full test run have been corrected; the full suite is running again. Residual ventricular discontinuities remain unresolved. No public release.

最新の開発状態：原画像で個別確認した脳室内19 voxelと関連6部品を追加修正しました。復元データ・採用記録を保存し、新旧採用テスト4件と型検査は成功。全回帰テスト・SHA依存監査の更新・ビルド・実ブラウザ確認はこの19点段階では未完了です。公開版は変更していません。以下の53点段階以前の検証結果は履歴です。

Latest local development: 19 individually image-reviewed ventricular voxels and six dependent model parts have been updated, with recovery data and an adoption record. Four adoption tests and type checking pass; full regression tests, refreshed hash-dependent audits, build and browser verification are pending for this stage. The public site is unchanged. Earlier verification results below are historical.

53点修正の統合検証完了：全Node 547/547（work/inferior-residual53-full-node-v1.log、session30969 exit0）、型検査、本番build、実ブラウザ12/12と全12PNG目視成功。現ラベルba31c7b…、未完了項目の監査は継続。全分節完成・専門家レビュー・公開反映ではない。以下の実行中/未検証表記は工程履歴。現在live検証jobなし。

The 53-voxel local repair now passes all 547 Node tests, type checking, production build, and 12 browser checks with screenshot review. Remaining anatomical and segmentation issues are still open; this is not expert validation or a public release.

53点組込みの検証進捗：旧57点は復帰用681fで厳密に再生検査し、mesh履歴に53点の後続段階を追加。対象12/12・本番build成功。視索/乳頭体の客観監査はinferior-residual53 JSONへ再計算済み。実ブラウザ5断面/7部品12/12成功、全12PNG目視済み（inferior-residual53-browser-v1/visual-review.md）。全Nodeはwork/inferior-residual53-full-node-v1.logへ実行中、session30969を継続確認する。新しい分節の完全性・専門家レビューは証明しない。公開変更なし。下記未更新/未検証の記載は直前工程の履歴。

2026-09-07 ローカル開発版：追加53 voxel（0→24）と関連5meshを組込み。現label SHA ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb、raw SHA 2b870431f39cb214d01a8cfc49bbd37f0cb5f23b23264615bbb256329f112d6a、ID24=64362。inferior-residual53-adoption-2026-09-07.jsonとpre-inferior-residual53復帰ファイルに根拠/差分を保存。新採用テスト2/2・型検査成功。過去57点の現行値テスト、SHA依存の客観監査、全テスト/build/実ブラウザは新段階では未更新・未完了。下記681f/545成功は直前段階の履歴。全目標は継続、main/公開変更なし。

Local development only: a further 53 unlabelled right-ventricular voxels and five dependent meshes have been integrated with recovery artifacts. The new adoption tests and type check pass; full regression, refreshed SHA-dependent audits, build and browser verification are still pending. Not expert-reviewed or published.

最新の開発検証：追加57 voxel修正は全545テスト、型検査、ビルド、ローカルの5断面・7部品の表示確認を通過しました。全脳室・脳弓・視放線の分節完成や専門家確認ではありません。公開サイトは未変更です。Latest development verification: the additional 57-voxel repair passed all 545 tests, type checking, the build, and local display checks of five section views and seven model parts. This is not complete ventricular, fornix or optic-radiation segmentation, or expert validation. The public site is unchanged. 以下の進行中表記は過去の状態です。Progress statements below describe earlier checkpoints.

開発版のみ：右側脳室下角周囲をさらに57 voxel補完し、関連6部品を同期しました。この側脳室修正系列は累計2,431 voxelです。対象テスト・型検査・ビルドは成功、全体回帰と実画面確認は継続中です。Development only: 57 additional label voxels near the right inferior horn were repaired and six related parts synchronized, bringing this lateral-ventricle repair series to 2,431 voxels. Targeted tests, type checking and the build passed; full regression and browser verification remain pending. Not expert validation or publication.

最新の開発検証：下角304 voxel修正は全543テストとローカルの5断面・7部品の表示確認を通過しました。下角の途切れや脳弓・視放線の独立分節は未完了です。公開サイトは変更していません。Latest development verification: the 304-voxel inferior-horn repair passed all 543 tests and local display checks of five section views and seven model parts. Inferior-horn discontinuities and independent fornix/optic-radiation segmentation remain unresolved. The public site is unchanged. 以下の進行中表記は各時点の履歴です。Progress statements below describe earlier checkpoints.

開発版・未公開：右側脳室下角付近の塗り残し304 voxelを画像照合後に補完し、関連7部品を同期しました。この側脳室修正系列の累計は2,374 voxelです。型検査・ビルドと対象テストは通過し、全体回帰・実画面の確認を継続中です。全脳室の分節完成や専門家確認を意味しません。Development only, not published: 304 image-reviewed label omissions near the right inferior horn were repaired and seven related model parts synchronized. This lateral-ventricle repair series now totals 2,374 voxels. Type checking, the build and targeted adoption tests passed; full regression and browser verification remain in progress. This is not complete ventricular segmentation or expert validation. [範囲・記録 / Scope and evidence](LATERAL_VENTRICLE_FRINGE_REVIEW.md)

開発検証の更新：867 voxel修正は全Node 541/541（`work/lateral-medium-full-node-v2.log`）、型検査、本番build、Chrome152の5断面＋7部品の実ブラウザ検査と全12PNG目視を通過。旧v1の10失敗は保存し、修正後v2で全成功を確認した。下角の残る断片化は別の未解決項目で、今回の検証は全脳室・脳弓の完成や専門家確認を意味しない。公開更新なし。Development verification: the 867-voxel repair passed all 541 Node tests, type checking, the build, and local browser checks of five section views and seven model parts. Residual inferior-horn fragmentation remains under review; this is not complete segmentation, expert validation, or publication.

開発版・未公開：側脳室の追加31領域867 voxel（左555・右312）を画像照合後に補完し、関連7部品を同期しました。この系列の累計は2,070 voxelです。全体回帰・実画面の確認は進行中で、全脳室分節や専門家確認の完了を意味しません。Development only, not published: an image-reviewed repair adds 867 missing lateral-ventricle label voxels across 31 regions (555 left, 312 right) and synchronizes seven related parts. This repair series totals 2,070 voxels. Full regression and browser verification are in progress; complete ventricular segmentation and expert review remain pending. [範囲・記録 / Scope and evidence](LATERAL_VENTRICLE_FRINGE_REVIEW.md)

開発検証の更新：下記630 voxel修正は全539テスト・型検査・ビルドと、5断面＋6部品のローカル実ブラウザ確認を通過しました。全脳室や脳弓の分節完了・専門家確認・公開反映を意味しません。Development verification update: the 630-voxel repair below passed all 539 tests, type checking, the build, and local browser checks of five section views and six model parts. This does not establish complete ventricular or fornix segmentation, expert validation, or publication. The earlier “in progress” note below describes the preceding checkpoint.

開発版・未公開の追補：側脳室の8領域で塗り残し630 voxel（左173・右457）を補完し、関連6部品を同期しました。この系列の累計は1,203 voxelです。統合画像まで確認済みで、全体テスト・実画面の確認は進行中です。Development only, not published: 630 missing lateral-ventricle label voxels in eight regions (173 left, 457 right) were restored, with six related parts synchronized. This repair series now totals 1,203 voxels. Combined-image review is complete; full regression and browser verification are in progress. This is not complete segmentation or expert validation. [範囲・記録 / Scope and evidence](LATERAL_VENTRICLE_FRINGE_REVIEW.md)

開発版・未公開の追補：側脳室の別の塗り残し265 voxel（左119・右146）を補完し、脳室3D部品3個と周囲組織の表示範囲を同期しました。この系列の補完は計573 voxelです。Development only, not published: another 265 missing lateral-ventricle label voxels (119 left, 146 right) were restored. Three ventricular meshes and the context-tissue crop were synchronized, bringing this repair series to 573 voxels. This is not complete segmentation or expert validation. [範囲・記録 / Scope and evidence](LATERAL_VENTRICLE_FRINGE_REVIEW.md)

開発版・未公開の追補：側脳室の局所的な塗り残し308 voxel（左144・右164）を補完し、関連3D部品3個を同期しました。全脳室の境界確認は継続中です。Development only, not published: 308 missing label voxels in two localized lateral-ventricle regions were restored (144 left, 164 right), with three related 3D parts synchronized. This is not complete ventricular segmentation or expert validation. [範囲・記録 / Scope and evidence](LATERAL_VENTRICLE_FRINGE_REVIEW.md)

開発版・未公開の追補：第四脳室の左右の局所的な塗り残し計16 voxelを補完し、対応3D部品を同期しました。脳室全体の輪郭修正は継続中です。Development only, not published: 16 voxels in two localized fourth-ventricle label omissions were restored, with the corresponding 3D part synchronized. Review of the remaining ventricular boundaries is ongoing; this is not expert validation. [範囲・記録 / Scope and evidence](FOURTH_VENTRICLE_REPAIR.md)

開発版・未公開の追補：第三脳室中央の塗り残し1,587 voxelを画像照合後に補完し、対応する3D部品も同期しました。第三脳室全体の分節完了や専門家確認を意味しません。Development only, not published: an image-reviewed repair adds 1,587 missing central third-ventricle label voxels and synchronizes the corresponding 3D part. This is neither complete ventricular segmentation nor expert validation. [範囲・記録 / Scope and evidence](SEPTEMBER_VENTRICLE_REVIEW.md)

開発版・未公開の追補：小脳外縁の塗り過ぎ21,290 voxelを追加修正し、今回の候補内の不確かな18,701点は保持しました。この系列の小脳局所修正は累計25,903点です。3Dブロックのマスクは不変、専門家確認は未完了です。Development follow-up, not published: 21,290 additional label voxels were removed from overextended cerebellar edges and surface spaces; 18,701 uncertain voxels in this candidate region were retained. This series of local cerebellar corrections totals 25,903 voxels. Block-model masks are unchanged; expert review remains pending.

開発版・未公開の追補：右小脳内側・下面でも372 voxelを追加修正し、571点を保持しました。以下の修正と合わせて1,031点の局所修正です。ブロック標本マスクは不変、専門家確認は未完了です。Development follow-up, not published: 372 additional label voxels were removed from spaces along the right inferomedial cerebellar surface, with 571 candidate voxels retained. The local corrections below now total 1,031 voxels. Block-model masks are unchanged; expert review remains pending.

開発版・未公開の追補：左小脳の内側・下面で、空隙へ張り出す259 voxelを追加修正し、候補の748点は保持しました。過去の400点と合わせて659点の局所修正です。ブロック標本のマスクは不変、専門家確認は未完了です。Development follow-up, not published: 259 additional label voxels extending into spaces along the left inferomedial cerebellar surface were removed; 748 candidate voxels were retained. This brings the local corrections to 659 voxels. Block-model masks are unchanged; expert review remains pending.

開発版・未公開の追補：別の小脳上面空隙でも52 voxelを除外し、同候補の376点は保持しました。下記348点と合わせて400点の局所修正です。3Dマスク不変、専門家確認は未完了です。Development follow-up, not published: 52 additional voxels were removed from a separate superior cerebellar gap, while 376 voxels from that candidate region were retained. Together with the 348 below, this totals 400 local corrections. The 3D masks are unchanged; expert review remains pending.

開発版・未公開：小脳上外側の空隙へ張り出していた断面ラベル348 voxelを、原画像・隣接直交断・300 µm画像支持の確認後に除外しました。境界付近211点は保持しています。3Dブロックの生成マスクは変わりません。専門家検証ではありません。[範囲と限界](CEREBELLUM_MASK_SCOPE_REVIEW.md)。Development only, not published: 348 section-label voxels extending into a superior-lateral cerebellar gap were removed after source-image and adjacent/orthogonal review with 300 µm image-support checks. Another 211 edge voxels were retained. Block-model masks are unchanged; this is not expert validation.

開発版・未公開：V・IX〜XIの模式神経経路に原画像との配置不一致を確認したため、関連8問を一時的に出題から除外しています。保存問題100問のうち、現在の出題候補は92問です。経路の修正完了ではありません。[監査と制限](NERVE_ORIGIN_IMAGE_REVIEW.md)。Development only, not published: eight questions using the V and IX–XI nerve models are temporarily withheld because their placement conflicts with source images. The authored bank retains 100 questions; 92 are currently eligible. Geometry repair is still pending.

[公開α版をブラウザで開く](https://bonnginn.github.io/brain-practical-navi/)

## 2026-09-05–06の改善候補（未公開）

V・IX〜XIの既知の配置不一致と関連クイズの保留を、神経の観察画面にも日英で明記しました。修正済みの形状として扱わないでください。The surface-page notes now explicitly disclose the known V and IX–XI model-placement defects and associated quiz holds in both languages; these models must not be treated as corrected nerve courses.

顔面神経・内耳神経の模式模型は、側頭葉へ入り込んでいた遠位部分を除き、既存の近位部分だけを保持しました。表示の先端は神経の終端ではなく、正確な出現部・内耳道までの経路は未再現です。The schematic VII/VIII models now omit unsupported distal extensions into temporal tissue, preserving the existing proximal segments. Their tips are display cutoffs, not anatomical endpoints; exact root exits and the course to the internal acoustic meatus are not reconstructed. Development only; the live site is unchanged.

左乳頭体の最下端で原画像の組織外へ出ていた2 voxelを、100 µm原画像・隣接断・直交断の照合後に開発ラベルから除外しました。視床下部との付着境界は変更していません。[確認範囲](MAMMILLARY_NATIVE_SUPPORT_REVIEW.md)。Two inferior-tip voxels were removed from the left mammillary development label after native 100 µm and adjacent/orthogonal image review. The hypothalamic attachment is unchanged. This is not expert validation; the live site is unchanged.

境界確認用の[ローカル画像注記ツール](IMAGE_REVIEW_TOOL.md)を追加しました。ブラウザで線を描き、元画像・注記PNG・座標をこのPCに保存できます。教材ラベルを自動変更せず、公開サイトには含めません。A local browser annotation tool saves reference images, annotated PNGs and stroke coordinates on this PC; it does not change segmentation labels or form part of the public site.

神経根の省略範囲を配布用metadataにも同期しました。根糸・三叉神経の感覚根と運動根・副神経脊髄根などは未再現です。新しい神経形状を追加した変更ではありません。The asset metadata now also states the omitted rootlets, separate trigeminal sensory/motor roots, and accessory spinal root. No new nerve geometry is claimed.

動眼神経の説明は、見やすさの修正後も根糸・正確な出現境界を再現していないことを日英で明記しています。The oculomotor-nerve note now explicitly distinguishes its schematic proximal course from unrepresented rootlets and the precise root exit zone, even after the visibility improvement.

脳神経観察では、大脳脚の位置目安を選択時だけ表示する修正を検証中です。実際の脳幹を消さず、補助部品に隠れていた動眼神経の経路を見やすくします。In development, the approximate peduncular guide is shown only when selected, reducing occlusion of the oculomotor nerve without removing the underlying brainstem. This does not validate nerve anatomy. [修正と確認範囲](PEDUNCLE_VISIBILITY_REPAIR.md)。

最新の追加修正：脳幹側縁・背側の組織外へ張り出す466点を、隣接断・三方向の画像確認後に未ラベルへ戻しました。未確定の脳室・槽へ分類したものではありません。[確認範囲と制限](BRAINSTEM_LATERAL_DORSAL_REVIEW.md)。Latest development repair: 466 overextended brainstem labels along lateral and dorsal tissue edges were left unassigned after adjacent and orthogonal image review. No ventricular or cisternal identity is inferred. This is not expert validation; the live site is unchanged.

最新：全22手動ラベルの位置補正と関連22 meshの同期に加え、脳幹の空隙内に孤立した40＋16＋27 voxel（計83）を原画像の三方向確認に基づいて未ラベルへ戻しました。専門家レビューや脳幹全体の修復完了ではありません。公開サイトは未変更です。[脳幹の局所修復](BRAINSTEM_ISLAND_REPAIR.md)。

Current development status: all 22 manual-label registration corrections and their 22 dependent meshes are incorporated. Image-reviewed brainstem islands in tissue gaps have been removed from the label in three bounded steps: 40, 16 and 27 voxels (83 total). This is not expert validation or a complete brainstem repair. The live site is unchanged.

後続の開発修正では、小脳側へ誤分類されていた64点を見直し、36点を小脳へ再分類、28点を未ラベルへ戻しました。未ラベルのうち24点は組織帰属が未確定であり、組織の不存在を意味しません。対応する後脳標本の小脳・橋延髄3D部品も同期しています。[修正範囲と制限](CEREBELLAR_ISLAND_REPAIR.md)。Development follow-up: of 64 cerebellar-side voxels mislabelled as brainstem, 36 are reassigned to the cerebellum and 28 are left unassigned. Of the latter, 24 have uncertain tissue boundaries; unassigned does not mean absent tissue. The two corresponding hindbrain block parts are synchronized. This is not expert validation; the live site is unchanged.

さらに、脳幹表面外の4点だけを未ラベルへ修正し、組織側・境界の12点は保持しました。[局所修正の根拠と未確定範囲](MIDLINE_SURFACE_REPAIR.md)。A further local repair removes four brainstem labels in external space, retaining twelve tissue-side or uncertain boundary voxels. This development-only change does not establish expert validation of the full brainstem boundary.

脳幹下端の画像支持範囲外と外表面の隙間も三方向の全対象断面で見直し、2領域計4,005点を未ラベルへ修正しました。解剖学的な脳幹・脊髄境界を確定したものではありません。[画像支持範囲の監査](BRAINSTEM_INFERIOR_SUPPORT_REVIEW.md)。Two further regions, totaling 4,005 voxels beyond imaged tissue or in an external surface gap, were reviewed across all affected orthogonal slices and left unassigned. This does not define the anatomical brainstem–spinal cord boundary. Development only; the live site remains unchanged.

**履歴：赤核のみ採用した中間段階（現在は全22ラベルを採用）**：下記の全22候補のうち、左右赤核ID1・2だけを位置補正して採用し、断面ラベルと赤核3D部品を同期しました。内部の明るい帯は核全体の領域として保持し、純粋な灰白質や特定の線維束とは断定していません。他のラベルと公開サイトは未変更です。[採用記録](RED_NUCLEUS_REGISTRATION_ADOPTION.md)。**Development update:** Only red-nucleus labels 1/2 have now been adopted from the registration correction, with the corresponding 3D block part updated. Internal bright bands remain within the whole-region label, without claiming that they are nuclear gray matter or identifying a specific tract. Other labels and the live site are unchanged. The all-22 non-adoption statement below describes the preceding review checkpoint; the other 20 labels remained unadopted at that checkpoint.

生成処理の安全対策として、位置合わせ履歴に問題のある旧CLIは`--legacy-grid-reproduction`を付けたwork内新規ディレクトリでの再現専用にしました。公開用データの再生成には使用できません。The legacy builders now require explicit research-reproduction mode and a new directory under `work/`; they cannot write production assets while the registration mismatch is unresolved.

重要な追加調査: 表示画像と手動ラベルID1–22の非線形位置合わせ履歴が一致しない問題を確認しました。全22ラベルの原画像比較、小別成分・背景符号・周辺区画との競合確認を終え、構造別の結論を記録しました。数値許容差による182 voxelの違いも全点三方向で確認し、高精度な位置補正候補を作成しました。全22の一括採用はしておらず（後続で赤核のみ開発版へ採用）、全境界正常・専門家承認という判定ではありません。[位置合わせの診断](MANUAL_LABEL_SPACE_REVIEW.md)・[確認の最終結論](MANUAL_REGISTERED_REVIEW_CONCLUSIONS.md)。The audit identified mismatched nonlinear-registration histories between the displayed image and manual labels 1–22. AI-assisted image review of all 22 labels, small components, background-code overlaps and neighboring-label conflicts is complete, with structure-specific conclusions and limitations recorded. All 182 voxels affected by numerical inverse tolerance were also inspected in three planes, and a tighter registration candidate was generated. This paragraph describes the earlier review checkpoint; all 22 registration corrections have since been adopted in development, as recorded below. This review does not establish that every boundary is correct or constitute expert approval.

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

アプリ内の主要な溝・裂の線状ガイド、放線冠・視放線・聴放線、脈絡叢、脳弓、乳頭体、中脳水道、小脳脚と、視床下部・透明中隔・大脳脚・丘・膝状体・前有孔質・菱形窩・錐体・オリーブの位置目安、嗅球を含む視覚路・漏斗、脳底動脈、脳神経レイヤーは、本プロジェクトが主要経路と形状を標準空間へ手作業で置いて生成した模式3Dです。III–XIIは脳幹近傍へ配置した近位経路の模式であり、現在の脳幹表面との距離・正確な出現境界は未検証です。これらは正解セグメンテーションではありません。個人差、微細枝、末梢走行、頭蓋孔、正確な径は省略しています。局所標本の褐色組織、手動分節された皮質下核、試作脳室腔とは、画面・メタデータ・権利文書で出典と精度区分を分けています。旧海馬采・鉤近似は形状と連続性の根拠が不足するため配布していません。

The cranial nerve III–XII models illustrate schematic proximal courses near the brainstem. Their distances from the current brainstem surface and precise root exit zones have not been validated; they are not ground-truth segmentations.

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

## 2026-09-06 development update / 開発版更新

赤核に続き、残り20手動ラベルの位置合わせと関連22個の3D部品を修正しました。公開版へは未反映です。専門家レビュー済みとは扱いません。詳細: [採用記録](REGISTERED_LABELS_ADOPTION.md)。

The development build now incorporates the reviewed registration correction for all 22 source manual labels and updates 22 dependent meshes after the earlier red-nucleus update. This is an AI-assisted project adoption, not expert validation or a new ground-truth segmentation. The public deployment is unchanged. See [adoption scope and limitations](REGISTERED_LABELS_ADOPTION.md).

## 2026-09-06 後続：模式神経・血管と内包の再評価

開発版で後交通動脈の左右の接続を修正し、神経の根糸・細分の省略を選択時に明記しました。公開版は未変更です。[修正範囲と制限](NEUROVASCULAR_TOPOLOGY_REPAIR.md)。

Development only: corrected the schematic posterior communicating artery junctions and clarified omitted nerve rootlets/components in both languages. This is not expert-validated anatomy; public deployment is unchanged.
