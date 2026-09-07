# 脳幹側縁・背側の局所466点 — 2026-09-06

## 全隣接・三方向の画像確認

上位白色候補のうち、側縁242点（旧成分52、X173–178/Y199–210/Z98–130）と背側224点（旧成分149、X191–212/Y169–178/Z29–42）を精査した。raw255は候補を見つける検索条件にすぎず、脳幹全体へ自動適用する除外閾値ではない。

- 側縁：周囲1枚を含むX172–179・Y198–211・Z97–131の計57面、15シートをAIが全目視。原画像上の組織外側へラベルが張り出す。未ラベルへ戻す候補とし、周囲の薄い組織まで削除しない。
- 背側：X190–213・Y168–179・Z28–43の計52面、13シートを全目視。背側の凹み・組織外縁の空隙側に位置する。脳室／槽などの帰属を新たに確定せず、脳幹組織としての過剰なラベルを未ラベルへ戻す候補とする。

原画像を左、脳幹と候補の輪郭を右に表示し、濃淡を塗りつぶさない。初回は732b…の固定スナップショットで計109面を確認した。その後、4,005点の修正によって背側図の広域crop内の別のラベルが変わったことを事前検査で検出し、候補生成を停止した。検査を緩めず、50ded72a…で背側52面を再生成し、13枚すべてを再度目視した。対象224点の座標集合は同一であり、連結成分の番号だけ149→147となった。側縁cropは全体が不変と照合済み。

## 固定記録

- 側縁：brainstem-lateral-edge-image-review-2026-09-06.json、SHAc3423fa86671e6205a2b2f9e22accb61368498d3265a09293cb8ab89fe72394c。画像work/anatomy-review/brainstem-bright-52-full-v1/。
- 背側最新：brainstem-dorsal-edge-current-image-review-2026-09-06.json、SHA8d0bfb77994c77914b9df32b67db658b55bbd4ec693e453fb260309a3f4c317f。画像work/anatomy-review/brainstem-dorsal-current-v1/region-147-00.png～12.png。旧画像・旧台帳も履歴として保持する。
- 466点の固定差分：brainstem-lateral-dorsal-adoption-2026-09-06.json、SHAa0909129446eeba7a7bae898b3a665e5e4f015f49a321288a100de4e56320621。

## 候補の再生・影響と開発版への導入

入力fixture pre-lateral-dorsal-50de.bin.gz、compressed50ded72a4a9b43e7c2c93b4bc5933b76680ab89e3e9eb7bb4f2cb5cfccc68d6c。出力候補work/anatomy-review/brainstem-lateral-dorsal-v2/labels.bin.gz、compressede7e61a7060c7f1ddfa8106ba659c0488e077495acdd6564862db44663d233ea3、raw816be7e87f80cb79e3b15d3cdb26831d7a1f0013b6b92de2dc0e7e99225acf27。

27→0が466点、ID27 250508→250042。他のラベルは不変。全格子の順逆再生・対象2集合の和・各点の三方向カバレッジを独立Node2/2で確認。実際のZYX生成格子における全block mask差は0。prepare_brainstem_lateral_dorsal.pyはworkだけを書き出す。初回v1は周囲変化検出により出力前に停止し、現行画像再確認後のv2が有効な候補である。

install_brainstem_lateral_dorsal.pyで固定差分を開発版へ導入した。現行compressed SHAは上記e7e61a7060c7f1dd…、rawは816be7e8…、ID27は250,042点。入力・出力・全格子の逆再生と既存metadataを事前検証し、brainstemLateralDorsalAuditを追記した。旧50deはfixtureとして保存。実際の生成maskが不変なのでmeshは再生成していない。

全Node510/510、全Python118/118、型検査、通常／Pagesビルド成功。Chrome152、既存localhost:4345で水平1366・冠状390・矢状1366の3条件がstable、loader／console／request／UI error、横overflow、WebGL fallbackなし。新しいe7e61a7060c7f1dd版の取得を確認した。ログはwork/lateral-dorsal-full-{node,python}.log、work/lateral-dorsal-browser-{horizontal1366,coronal390,sagittal1366}.json。ビルドの既存chunkサイズ警告は残る。これらの動作確認は解剖学的妥当性の証明ではない。

今回も専門家承認ではない。組織外の空隙に別の解剖名を推測で割り当てず、原画像・献体の由来やライセンスは維持する。未ラベルは組織不存在の保証ではない。残る明るい領域、主成分の他の境界、腹側不足、視覚路等の課題は未完了。公開・main・commit/pushなし。
