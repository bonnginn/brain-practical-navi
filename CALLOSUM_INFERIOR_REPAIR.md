# 脳梁候補の下方弧状成分 — 2026-09-06

## 判断の範囲

8cc65e…のID30固定6近傍成分4（2,160 voxel）を原画像で追跡した。全占有面と前後1枚のX20＋Y58＋Z36＝114断面、24シートと3全体位置図をAIが開いて目視した。

脳梁本体より下方に、別の細い弧／前方へ下降する部分が収録されている。脳梁として着色するのは不適切と判断し、**この固定2,160 voxelだけを30→0へ戻す**AI補助プロジェクト採用とする。ユーザーの自律的な画像根拠付き修復指示に基づき、専門家承認・人間の各境界承認・研究用ground truthとは扱わない。脳弓という新ラベルへの自動置換はしない。

生成本体の独立第6段階へ接続し、開発assetへ適用済み。現在は098edf…で、対象2,160 voxelだけを未ラベルへ戻した。拒否時不変を含む対象Python4/4、全Python44/44、全Node489/489、型検査・通常build、全voxel再構成差異0を確認。実ブラウザ24/24も成功し、新しい同定点6画像とblock8画像を目視した。公開・main統合は行わない。

## 原画像の所見

- XYZ [187,219,147]–[204,274,180]。矢状断で主たる脳梁白質の下面より下に離れた弧を形成し、前方へ下降する。対象と脳梁本体を結ぶ白質帯を切る操作ではない。
- 冠状断Y219–244では正中両側の小さい断面、Y245以降では正中の弧の合流／下降部を追える。主たる脳梁の断面はより上方に別にある。単純に「小成分だから消す」と判断したのではない。
- 水平断Z173–180では後方へ分かれる細い部分が見える。下位Z147–172はより前方の小さい断面として連続し、上方の脳梁本体とは異なる走行を示す。
- 脳弓体／柱付近の走行と整合するが、透明中隔との付着部、細部の部分体積、末端の正確な境界はこの0.5 mm表示で完全には確定しない。2,160 voxelを脳弓全体の分節と扱わず、他の未ラベルvoxelへ延長しない。

別の解剖教材でも、脳弓は脳梁の下を正中近傍で弧状に走り、前方で下方へ向かうものとして説明される。[UTHealth Neuroanatomy Online・線維路](https://nba.uth.tmc.edu/neuroanatomy/L10/Lab10p18_index.html)、[同・連続断面](https://nba.uth.tmc.edu/neuroanatomy/L10/Lab10p20_index.html)。これは部位同定の補助で、別標本の境界をBigBrainへ転写する根拠ではない。

## 固定した根拠

- 入力compressed SHA `8cc65edf36e1e3a420168bfb663d6440418dd67189808263d11c180c4b403d16`
- 入力raw voxel SHA `3c9d959acbdb67b7603ed7f2f105d7c333f0f89facc7e637f16b5fb740a16cd5`
- 入力fixture `tests/fixtures/bigbrain-practical-segmentation-pre-callosal-inferior-8cc6.bin.gz`
- 固定成分全index昇順uint32LE SHA `6a4b7677801edf90d45a3b43a409bbe379c13035fe5d99a1e412e8e49b677675`
- 画像・各SHA・全断面一覧 `work/anatomy-review/callosal-inferior-component-v1/report.json`
- 再生成 `scripts/render_callosal_inferior_component.py`。この入力での成分4のみを対象とし、別の版の成分番号へ転用しない。

過去の脳梁除外3,201 voxelはそのまま保持し、今回と重複しない。他の構造・原画像・模式脳弓meshは変更しない。脳梁の上方にある帯状回／帯状束との混在や側方境界の問題は引き続き未解決。

## 開発版への反映

- 出力compressed SHA `098edfbf365016c6c53ccf7b7032258db72a4912378c457d348c01613a4a1694`
- 出力raw voxel SHA `afc55069f2ecdcad36429f1026276f10c8e17a31fa9c6bf985b3beec3f640130`
- ID30 148,179→146,019。元の151,380から局所除外は合計5,361。
- strict記録 `segmentation-patches/review/callosum-inferior-exclusion-project-review-2026-09-06.json`、SHA `0afc2388eade754a9d7726679f27aaa900ef969cc266789d779319a51b49a40c`。
- 図一覧report SHA `6d7a35eaa6856f738ca2452281f2509512bf0abc034c17fd5fa27cbc9d5db492`。
- `apply_approved_callosal_inferior_patch` は入力raw SHA・strict採用記録・正確な2,160 index集合・30→0以外拒否を確認し、監査情報作成まで成功した後にだけvolumeを変更する。
- 55 block mask比較は脳梁のみ270格子voxel変化、他54は不変。旧meshの完全再現を確認してから、脳梁meshをSHA `c9e4162ee7e4c43c5c8356c50db34b0e69488cf73c6c061dadddc9d84724bed3`、13,022頂点／26,012面へ同期。原画像と標本組織meshは今回不変。`work/anatomy-review/callosal-inferior-block-meshes-v1/report.json`。
- 第6段階までの全voxel再構成は不一致0（元NIfTI取り込みは対象外）。`work/anatomy-review/practical-reconstruction-v5.json`、generator SHA `fa2de312469edc62464873de6f81a09fa0a17f0b913358c99bba05f08d2ce9a9`。

## 実表示の確認

`work/anatomy-review/callosal-inferior-browser-v1/report.json`。通常buildの実assetをHTTP応答SHAまで照合し、日英×8同定点＝16件と、block通常／透過×初期／反対側／上面／下面＝8件、合計24/24を確認した。新規の除外body／column点と保持main-body点の日英6画像、およびblock8画像をAIが開いて目視した。残る10同定点は前段の回帰操作であり、今回新たな画像精査として数えない。

通常／透過の初期・反対側表示では、従来の下方の細い脳梁色の弧が除かれ、主たる脳梁色の弧は保持される。反対側の通常表示では原画像由来の標本組織が脳梁色を隠すが、透過で確認できる。上面／下面も破綻や読込エラーを認めない。これは特定の表示・操作の確認であり、残った全境界の解剖学的正常を保証するものではない。

全Node終了後に通常baseへ再buildし、既存の部分水道／第四脳室前方除外点も現行098edf…で日英4同定を再確認した。`work/anatomy-review/ventricle-classification-browser-integrated-callosal-inferior-v4/report.json`。公開URL・実機・別GPUの確認ではない。
