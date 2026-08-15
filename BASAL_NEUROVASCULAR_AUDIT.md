# 脳底面・脳神経・主要動脈の位置関係監査

更新日: 2026-08-15

## 目的

脳底面の嗅覚路、視神経系、漏斗、乳頭体、前有孔質、脳神経I〜XIIの近位部、主要脳底動脈について、実習で誤解を生みやすい前後・上下・内外側・左右関係を回帰監査します。模式メッシュの形状、径、末梢走行、個体差、神経核、穿通枝を承認する監査ではなく、専門家レビューを代替しません。

## 解剖学的な照合基準

- 嗅球・嗅索は下面の嗅溝に位置し、前有孔質は嗅三角後方の外側溝起始部にあります。[NCBI Bookshelf: The Anatomy of the Cerebral Cortex](https://www.ncbi.nlm.nih.gov/books/NBK575742/)
- 視交叉の後方に漏斗、さらに後方に乳頭体が並びます。[NCBI Bookshelf: Functional Anatomy of the Hypothalamus and Pituitary](https://www.ncbi.nlm.nih.gov/books/NBK279126/)
- I・IIは前脳側、III・IVは中脳、Vは橋、VI〜VIIIは橋延髄境界、IX〜XIIは延髄から現れます。XIIはオリーブ前溝、IX〜XIはオリーブ後溝です。[NCBI Bookshelf: Evaluation of Patients with Cranial Nerve Disorders](https://www.ncbi.nlm.nih.gov/books/NBK608599/)
- 左右椎骨動脈は橋延髄境界付近で合流し、脳底動脈は橋腹側を上行します。[NCBI Bookshelf: Neuroanatomy, Pons](https://www.ncbi.nlm.nih.gov/books/NBK560589/)、[Basilar Artery](https://www.ncbi.nlm.nih.gov/books/NBK459137/)
- 内頸動脈は前・中大脳動脈へ分かれ、前交通動脈は左右前大脳動脈を連絡し、後交通動脈が後大脳動脈系へ接続します。[NCBI Bookshelf: Cerebral Blood Flow](https://www.ncbi.nlm.nih.gov/books/NBK538134/)

## 再現方法

```powershell
npm run audit:basal
```

`basal-landmarks.json`、`neurovascular-overlays.json` とBNM1／BNM3メッシュを読み、保存順 `z/y/x` を解剖学的座標 `x: 右、y: 前、z: 上` へ戻します。脳底ランドマークは全頂点の範囲・重心・正中距離、管状オーバーレイは構造ID別の範囲と起始側リングを測定します。

## 監査結果

14/14の大きな位置関係が合格しました。

- 嗅覚路、前有孔質、視神経系、漏斗、乳頭体が前から後ろの順を保ちます。
- 漏斗は正中で視神経系と乳頭体の間にあり、左右乳頭体は漏斗より外側です。
- 前有孔質の位置目安は左右性を保ち、嗅覚路と視神経系の間の高さにあります。
- I・IIはIII・IVより前方、III・IV、V〜VIII、IX〜XIIは上方から下方の脳幹レベル順です。
- VI、VII、VIIIは内側から外側、IX、X、XIは上方から下方、XIIはIX〜XIより内側です。
- I〜XIIの全左右対は正中をまたがず、左右距離の大きな非対称を生じていません。
- 前交通動脈は正中、前大脳動脈は中大脳動脈より内側です。
- 左右椎骨動脈は正中の脳底動脈へ収束し、上小脳・前下小脳・後下小脳動脈は上から下のレベル順です。

既存の表面接触試験では、III〜XIIの根が脳幹表面から2 mm以内にあること、椎骨・脳底動脈が延髄・橋の腹側表面から離れていないことも別途固定しています。

## 実ブラウザ確認と可読性修正

Windows Chromiumの本番Viteプレビューで、1366 × 768 pxの下面・主要動脈・脳神経画面と、390 × 844 pxの脳神経画面を確認しました。下面では14構造の一括選択、脳神経ではVIIの個別強調と脳幹8構造の一括選択、動脈では内頸動脈の個別強調と脳神経レイヤーの追加・解除を実操作しました。

主要動脈画面は従来、初期状態で赤い全動脈と黄褐色の全脳神経を重ねていたため、交差部で動脈輪を追いにくい状態でした。初期表示を動脈だけに変更し、脳神経は同じ画面の「脳神経」ボタンで必要時に追加する設計へ変更しました。脳神経画面では従来どおり神経だけを初期表示します。

## 残る専門家確認

この監査は大きな方向と順序の回帰だけを検出します。神経の実際の見かけの起始幅、IVの背側から外側への回り込み、動脈輪の連続形態、枝分かれ角度、血管径、穿通枝、個体差、実標本での可視性は判断できません。`EXPERT_REVIEW_CHECKLIST.md` の脳底面・脳神経・血管項目を神経解剖学に詳しい確認者が方向別に判定するまで監修待ちを維持します。
