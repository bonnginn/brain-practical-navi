# Papez回路の教材動画（初稿）

2026-09-22、ユーザーが残る必須作業を確認したうえで教材動画の作成を指示。1.0の残りは実機確認・少人数試用・それに基づく修正・管理者の公開判断が中心で、新たな必須実装はロードマップにない。動画はこの依頼による追加制作であり、1.0の必須条件へ変更しない。

## 成果物

- `work/papez-video/papez-circuit-ja.mp4`：2分06秒、1280×720、20fps、H.264/yuv420p、音声なし、日本語字幕焼き込み。1,354,083 bytes。
- 同じフォルダの `index.html`：章移動・ダウンロード・字幕全文・出典と利用条件。
- `captions-ja.vtt`：字幕データ。`timeline.json`：構成とタイミング。`inputs.json`：原データSHA。
- `storyboard.jpg` と `proof-*.jpg`：目視確認用。既存画像・確認図を削除していない。
- `papez-video-package.zip`：動画、再生ページ、字幕、出典notice、構成と入力SHA、表紙と場面一覧を同梱する持ち出し用。

回路全体を残し、模式図の枠内の進行表示と接続上の赤い点で方向を示す。海馬・脳弓・乳頭体・視床は既存BigBrain断面を抽出し、拡大時にも全体の位置図を保持。視床の着色は全視床の位置目安であり前部核の輪郭ではない。乳頭視床路、帯状回と帯状束の区別、嗅内野からの入力は概念図で説明する。標本の線維再構成や神経活動・伝導速度の実測ではない。今回、分節・メッシュを変更していない。

## 根拠と権利

- [Choi et al. (2019), Frontiers in Neuroanatomy 13:17](https://doi.org/10.3389/fnana.2019.00017)：本文Introductionで古典回路の順序と穿通路を照合。論文画像は転載しない。
- [UTHealth Neuroscience Online — Limbic System: Hippocampus](https://nba.uth.tmc.edu/neuroscience/s4/chapter05.html)：海馬系の学習解説を照合。画像転載なし。
- [BigBrain](https://bigbrainproject.org/)：Amunts, Zilles, Evans et al.、CC BY-NC-SA 4.0。既存0.5 mm表示用画像を断面抽出・着色・色調整・切抜き拡大。
- 海馬・視床ラベル：Yiming Xiao and collaborators, McGill。BigBrain co-registration with PD25 and ICBM152、CC BY 4.0。原画像条件も保持。
- 脳弓・乳頭体：本教材の既存画像誘導ラベル。専門家未監修。

動画・字幕・解説はCC BY-NC-SA 4.0。ソース別のnoticeは同梱し、一括のコードライセンスで上書きしない。生成コードはリポジトリのAGPL-3.0-or-later。提供元や著者の承認を意味しない。

## 再生成と確認

`scripts/render_papez_video.py` を既存Python環境で実行。numpy、Pillowとimageio-ffmpegが必要。今回のimageio-ffmpeg 0.6.0は `work/video-tools` に限定して導入。`--proof-only` で確認図・再生ページのみ更新できる。

代表場面とクレジットを画像で目視。MP4全2520フレームのdecode成功、長さ・寸法・fpsを確認。実ブラウザで再生、停止、86秒の章移動、seekable 0–126秒、映像表示を確認。動画のシークにはRange対応の配信が必要なので、ローカル確認はVite previewを使用（単純なPython http.serverではシーク不可だったため交換）。ローカル確認URLは `http://127.0.0.1:4369/`。

アプリ本体のコード・データには変更がなく、全件試験・再buildは実施しない。動画の専門家監修・学習者試用は未実施。公開やHomeへの組み込みは行っていない。
