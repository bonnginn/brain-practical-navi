# 正確性・3D閲覧性調査（2026-08-14）

公開α版に向け、一次資料・公的アトラスと公開3Dビューアを照合した記録。外部図版やコードは転載せず、解剖学的な表現と操作設計の判断だけに利用した。

## 解剖学・データの根拠

- [BigBrain Maps & Models](https://bigbrainproject.org/maps-and-models.html) / [About](https://bigbrainproject.org/about.html): BigBrainは65歳男性1個体、7,404枚の冠状切片から20 µm等方性へ非線形再構成された組織学的モデル。本アプリの「0.5 mm」は原資料の取得解像度ではなく、表示用の再標本化であると明記した。
- [Allen Human Brain Atlas](https://human.brain-map.org/static/about?rw=t): MRI・組織像・遺伝子発現を統合した3D参照枠を確認。単一個体資料と平均標準脳を画面上で混同しない方針を維持した。
- [NCBI: Hippocampus Anatomy](https://www.ncbi.nlm.nih.gov/books/NBK575732/?report=reader): 透明中隔は脳梁下面と脳弓上面を結ぶ両葉性の薄い隔壁。左内側面では左葉のみの模式とし、初期表示から外した。
- [NCBI: Cranial Nerve Disorders](https://www.ncbi.nlm.nih.gov/books/NBK608599/) / [Brainstem](https://www.ncbi.nlm.nih.gov/books/NBK544297/): I・IIを脳幹神経根として扱わず、III–XIIと区別。IVの背側起始から腹側へ回る経路は現在の3Dでは簡略化と注記した。
- [Circle of Willis, 150 volunteers](https://pubmed.ncbi.nlm.nih.gov/9530305/), [1,864 subjects](https://pubmed.ncbi.nlm.nih.gov/33141840/), [1,000 cadavers](https://pubmed.ncbi.nlm.nih.gov/18507619/): 完全な動脈輪は常態とは限らず、欠損・低形成・胎児型などの変異が多い。画面を「典型的配置」とし、個体差と正確な径を再現しない旨を追加した。

## 3Dビューア調査から採用した設計

- [Neuroglancer](https://github.com/google/neuroglancer) / [Navigation](https://neuroglancer-docs.web.app/user-guide/navigation.html): 同期した方位、レイヤーごとの表示、常時参照できる操作説明を重視。
- [BrainBrowser](https://pmc.ncbi.nlm.nih.gov/articles/PMC4292582/): マウスとタッチの回転・移動・拡大、部品単位の表示と不透明度、ピッキングを教育用途の基準にした。
- [NiiVue clip planes](https://niivue.com/docs/clip/): 見たい内部だけを露出する切断・透過が有効。現段階では自由クリップ面を増設せず、既存の局所標本、半球、脳表透過を明確に分離した。

実装した改善は、動的なR/L・A/P・S/I方位表示、画面上の±ズーム、矢印キー回転とRキー初期化、キーボードフォーカス表示である。内側面は皮質のみから開始し、通常は表面から見えない深部構造を利用者が明示的に追加する方式とした。

## 限界と今後の確認

- 皮質表面はMNI高密度モデル、局所標本と断面の一部はBigBrain派生物であり、同一個体の完全な一体モデルではない。
- 血管、脳神経、透明中隔など「模式補助」「位置目安」は正解分節ではない。専門家確認と実標本照合を続ける。
- 自由クリッピング、部品ごとの連続不透明度、3断面と3Dの完全同期は有用だが、α版の操作密度を上げるため今回は見送った。
