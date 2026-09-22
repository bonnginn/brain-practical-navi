// Entry views reuse the existing section/quiz observation positions.
// They are starting points for exploration, not fixed anatomical boundaries.
export const sectionStudyThemes=[
  {key:'ventricles',plane:'coronal',position:49,target:'thalamus',members:['ventricle','thirdVentricle','thalamus'],
    ja:{name:'脳室を目印に視床を探す',goal:'正中の腔と左右一対の腔を区別し、その周りの灰白質を見つけます。',steps:['正中の第三脳室と、その両側の視床を見比べます。','側脳室を見つけ、少し前後へ動かして断面形の変化を追います。'],check:'「正中」「左右一対」「周囲の組織」を指し示せますか？'},
    en:{name:'Find the thalamus using the ventricles',goal:'Distinguish the midline cavity from the paired cavities and locate nearby grey matter.',steps:['Compare the third ventricle at the midline with the thalamus on each side.','Find the lateral ventricles, then move through nearby anterior and posterior sections to follow their changing outlines.'],check:'Can you point out the midline, the paired cavities and the surrounding tissue?'}},
  {key:'deep-nuclei',plane:'coronal',position:58,target:'internalCapsule',members:['caudate','putamen','pallidum','thalamus','internalCapsule'],
    ja:{name:'内包と周囲の核を見比べる',goal:'白質路を挟んで、どの核が内側・外側にあるかを読み取ります。',steps:['前後に断面を動かし、内包の内側に現れる尾状核・視床と、外側のレンズ核を見比べます。','被殻と淡蒼球の内外関係を確認します。前脚・膝・後脚の形は水平断へ切り替えて追いましょう。'],check:'内包の両側にある構造を、名称だけでなく位置で説明できますか？'},
    en:{name:'Compare the internal capsule and nearby nuclei',goal:'Read the medial–lateral relationships of nuclei separated by a white-matter pathway.',steps:['Move through anterior and posterior sections, comparing the caudate and thalamus medial to the capsule with the lentiform nucleus lateral to it.','Identify the putamen lateral to the pallidum. Switch to horizontal sections to follow the anterior limb, genu and posterior limb.'],check:'Can you describe the structures on each side of the capsule by location as well as name?'}},
  {key:'medial-temporal',plane:'coronal',position:51,target:'hippocampus',members:['hippocampus','amygdala','ventricle'],
    ja:{name:'海馬・扁桃体と側脳室下角',goal:'側頭葉内側の構造を、脳室の形と前後関係から見分けます。',steps:['側脳室下角の床に沿う海馬を探します。','前方へ断面を動かし、海馬頭の前上方にある扁桃体の位置と見え方を比べます。'],check:'海馬と扁桃体を、同じ断面だけでなく連続断面で区別できますか？'},
    en:{name:'Hippocampus, amygdala and temporal horn',goal:'Use the ventricular outline and anterior–posterior relationships to distinguish medial temporal structures.',steps:['Look for the hippocampus along the floor of the temporal horn of the lateral ventricle.','Move anteriorly and compare the amygdala, located anterosuperior to the hippocampal head.'],check:'Can you distinguish hippocampus and amygdala across adjacent sections, rather than relying on a single slice?'}},
  {key:'midbrain',plane:'horizontal',position:67,target:'redNucleus',members:['redNucleus','substantiaNigra','aqueductPartial'],
    ja:{name:'中脳の背腹関係を読む',goal:'赤核・黒質と正中の水道の位置関係を見比べます。',steps:['赤核の腹外側にある黒質を探し、少し上下の断面も比較します。','背側の正中にある中脳水道の位置を確認します。着色の境界は暫定的です。'],check:'背側から腹側へ、どの構造が並ぶか説明できますか？'},
    en:{name:'Read dorsal–ventral relationships in the midbrain',goal:'Compare the red nuclei, substantia nigra and midline aqueduct.',steps:['Look for the substantia nigra ventrolateral to the red nuclei, comparing nearby superior and inferior sections.','Locate the aqueduct dorsally at the midline. The labelled boundary remains provisional.'],check:'Can you describe the order of these structures from dorsal to ventral?'}},
] as const;

export type SectionStudyTheme=typeof sectionStudyThemes[number];
