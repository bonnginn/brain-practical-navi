# 大脳基底核回路の短い教材動画

追加作業枠で制作。`work/basal-ganglia-video/basal-ganglia-ja.mp4`：1分54秒、1280×720、20fps、H.264/yuv420p、音声なし・日本語字幕、1,121,217 bytes。生成器は `scripts/render_basal_ganglia_video.py`。Papez・視覚路生成器の既存補助を再利用する。

出力核から視床への持続的抑制を起点に、直接路の脱抑制、GPe/STNを介する間接路、皮質→STNのハイパー直接路を説明。全ノード・主要結合を残し、＋/−で興奮性・抑制性を表示。赤い点は説明中の結合を示し、発火率・活動量・伝導速度を表さない。実際の並列ネットワークと、順番に説明するための演出を区別する。ドパミン作用の詳細は今回の範囲外。

構成は既存 `src/circuitTeaching.mjs` と照合。解説は [UTHealth, Knierim — Basal Ganglia](https://nba.uth.tmc.edu/neuroscience/s3/chapter04.html) の主要出力・直接路・間接路の節を取得して確認。[Purves et al.](https://www.ncbi.nlm.nih.gov/books/NBK10847/) と [Lanciego et al. (2012)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3543080/) も既存教材の参考文献として併記。図や文章の転載はせず独自の模式図と字幕を作成。

標本場面は既存BigBrain派生画像とXiaoら由来のGPe ID11/12、GPi ID13/14を着色し、断面全体の位置図・拡大範囲・拡大図を併記。新たな分節・メッシュ変更なし。出典・加工内容・原notice・入力SHAをページとZIPへ保存。

全場面のproofを作成し、主要場面の文字と符号を目視確認。初稿では出力核→視床の線がSTN付近と重なったため、環状配置に変更して全結合の交差を解消。全編デコード成功。専門家監修・学習効果の検証は未実施。

## 共通の動画プレーヤー

5本を `work/teaching-video-library/`（4374）へ収録。`scripts/teaching_video_player.js` を再生ページへ埋め込み、動画外の同期字幕、現在章、前/次/再視聴、0.75/1/1.25倍、任意の章末停止を追加。外部通信・新しい履歴保存なし。設定はページ内限り。持ち出しZIPにもプレーヤーを収録。生成は `scripts/build_teaching_video_library.py`。元動画フォルダは保持。

5パッケージのCRCとローカル参照先の存在を確認（欠落なし）。実ブラウザで先頭章の末尾7秒台で停止し、字幕は先頭章に残り、停止案内が表示されることを確認。次の章へ進むと8秒から再開し、字幕と現在章が更新。速度0.75倍を反映。

章末停止後、通常の再生操作でも次章18秒から再開することを確認した。
