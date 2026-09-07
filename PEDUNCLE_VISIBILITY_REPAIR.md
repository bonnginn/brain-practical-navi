# 大脳脚の未選択補助部品による遮蔽 — 2026-09-06

後続の説明同期：CN IIIの旧「脳幹に隠れて経路を確認しにくい」を日英とも削除し、近位経路の模式・根糸と正確な出現境界は未再現、という制限へ更新した。関連9/9・型検査・通常build成功。Chrome152で日英のIII選択後に新しい説明が実DOMへ表示されることを確認（work/check-cn3-note.mjs）。直前の全511テストとは別の限定再検証であり、今回全体を再実行したとは数えない。

CN III選択時の表示を初期・左右斜めの3方向で再確認した。短い白い端しか見えない主因の一つは、未選択の大脳脚位置目安だった。build_specimen_blocks.pyのcerebral_pedunclesは左右の楕円領域とtissue・midbrain_boxの積であり、大脳脚そのものの正確な分節ではない。AtlasVolumeCanvasではこれを中立色でも描画していた。

大脳脚位置目安を明示選択時だけ表示するよう修正した。神経の座標・mesh、元の脳幹surface、深度検査、クイズの脳幹不透明保持は変更していない。大脳脚選択による表示は残す。これは遮蔽の修正であり、CN IIIの形状・根糸・脚間窩からの正確な出現位置を検証した結果ではない。

型検査・通常／Pages build、関連79/79、全Node511/511成功。Chrome152、1366×900、4345の同一ルート・CN III選択で初期と斜め方向を目視し、従来隠れていた白い経路が見えることを確認した。work/cn3-current-*.pngは再実行で修正後に更新されたため、修正前後の固定画像ペアとは扱わない。初期READY_PROBEにloader/UI error/overflow/fallbackなし。

さらに1366／390幅で大脳脚の選択→解除を実行し、4枚すべてを目視した。青い補助部品の表示／消去を確認。work/peduncle-selection-v1-{1366,390}-{selected,cleared}.pngと同名JSONに保存。小画面はdesktopエミュレーションであり、タッチ実機試験ではない。修正後の新しい撮影コードは既存ファイルの上書きを拒否する。通常buildを全体テストの後に復元済み。未公開。

出現位置と根糸の参考： [Microsurgical Anatomy of the Oculomotor Nerve](https://pubmed.ncbi.nlm.nih.gov/27859787/) および [Oculomotor nerve transitional regions](https://pubmed.ncbi.nlm.nih.gov/3254884/)。文献の一般解剖は現行MNI模型の個々の座標を保証しない。次は説明文に残る「脳幹に隠れて」の原因表現を更新し、正確な出現位置・根糸を再現していない旨を保持する。
