# 脳表・連続断面の字幕動画（2026-09-22）

ユーザーの追加依頼により、Papez回路に続く試作動画を2本制作した。アプリへの組込み・公開更新は未実施。分節・メッシュは変更していない。

| 動画 | 内容 | 出力 |
| --- | --- | --- |
| 中心溝の前と後 | 左外側面の全体像を残し、中心前回・中心後回を着色比較。脳回と機能領域の違い、無着色での復習、答え合わせ | `work/observation-videos/surface/surface-ja.mp4` |
| 脳室を目印に冠状断を読む | 前から後への連続断面、連動する矢状断位置図、側脳室・第三脳室・視床、無着色での復習 | `work/observation-videos/sections/sections-ja.mp4` |

各72秒、1280×720、20 fps、H.264/yuv420p、日本語焼き込み字幕、音声なし。脳表は約0.73 MB、断面は約2.61 MB。脳表の着色切替は0.7秒のフェード、断面の移動は既存格子の実スライスを使用し、中間の解剖を生成していない。

## 確認と配布

- 一覧：`http://127.0.0.1:4370/`。各ページに再生・章移動・字幕全文・出典・MP4とZIPの保存リンク。
- 各出力フォルダにVTT、timeline、入力SHA-256、8場面の確認画像、一覧画像、元ライセンスnotice、持ち出し用ZIPを保存。
- 全画面構成を確認し、代表の脳表・視床・出典画面を拡大確認。字幕は2行以内を生成時に検査。
- 両MP4の全編デコードがエラーなし。実ブラウザで72秒・1280×720・再生開始を確認し、脳表27秒、断面36秒への章移動が動作。
- アプリ本体に変更がないため、アプリ全件試験・buildは繰り返していない。専門家監修・学習者評価は未実施。

## データと説明の境界

脳表はBigBrain組織画像ではなく、MNI152白質表面を拡張した既存表示モデルとCerebrA由来の脳回区分。左外側面を投影し陰影・着色を加えた。一次運動野・一次体性感覚野の厳密な境界を表す着色ではない。

断面は既存BigBrain 0.5 mm派生画像と現在の分節。視床は全体のラベルであり個別核ではない。画面左が解剖学的左、上が上方。右上の矢状断位置図は後方が左・前方が右。Y位置60%から44%へ前後方向に移動し、固定観察は51%。

動画の末尾にも帰属・加工・条件を記載し、詳細は付属ページへ掲載。外部教科書・論文図版は転載していない。

主な出典：

- [White et al. (1997), 中心溝の形態と細胞構築](https://pubmed.ncbi.nlm.nih.gov/9023429/)：形態・細胞構築の区別と個人差。
- [Purves et al., Neuroscience — Functional Organization of the Primary Motor Cortex](https://www.ncbi.nlm.nih.gov/books/NBK11095/)：中心前回・運動皮質の学習説明。
- [Paquola et al., BigBrainWarp](https://doi.org/10.7554/eLife.70119)、[Manera et al., CerebrA](https://doi.org/10.1038/s41597-020-0557-9)：既存表面・領域データ。MNI licenceを同梱。
- [BigBrain Project](https://bigbrainproject.org/)、[Xiao et al. 配布元](https://nist.mni.mcgill.ca/multi-contrast-pd25-atlas/)：原画像CC BY-NC-SA 4.0、手動ラベルCC BY 4.0。それぞれの原noticeを同梱。

## 再生成

`scripts/render_observation_videos.py` は先行動画の描画ヘルパーを再利用する。プロジェクトPythonのnumpy/Pillowと `work/video-tools` のimageio-ffmpegを使用。

```powershell
& work/segmentation-ci-check/Scripts/python.exe scripts/render_observation_videos.py
node node_modules/vite/bin/vite.js preview --outDir work/observation-videos --port 4370 --host 127.0.0.1 --strictPort
```

`--proof-only` は画面構成・字幕・ページだけを生成する。動画の再生成には付けない。各ZIPを展開すれば動画と付属ページを持ち出せる。現状は日本語のみ。ナレーション・英語版は別作業。
