// Short teaching contrasts for plausible distractors. Keys are stable quiz IDs
// and option keys, so a different question cannot inherit an unrelated clue.
const guidance={
  "putamen-relation-choice":{
    "putamen-with-caudate":["尾状核と被殻は線条体を構成します。レンズ核を問う場合、被殻と組になるのは淡蒼球です。","The caudate and putamen form the striatum. The putamen pairs with the globus pallidus to form the lentiform nucleus."],
    "putamen-with-thalamus":["視床は間脳の構造です。被殻と淡蒼球を合わせてレンズ核と呼びます。","The thalamus is part of the diencephalon. The putamen and globus pallidus form the lentiform nucleus."],
    "putamen-with-amygdala":["扁桃体は内側側頭葉の核群です。レンズ核は被殻と淡蒼球からなります。","The amygdala is a medial temporal nuclear complex. The lentiform nucleus comprises the putamen and globus pallidus."],
  },
  "hippocampus-pathway-choice":{
    "hippocampus-callosum":["脳梁は左右の大脳半球を結ぶ交連線維です。海馬から乳頭体へ向かう主要経路は脳弓です。","The corpus callosum joins the cerebral hemispheres. The fornix is the major route from the hippocampal formation to the mammillary bodies."],
    "hippocampus-capsule":["内包は皮質と視床・脳幹などを結ぶ投射線維が集まる部位です。ここで問う海馬―乳頭体の経路は脳弓です。","The internal capsule carries projections between the cortex and structures such as the thalamus and brainstem. The hippocampal–mammillary route asked here is the fornix."],
    "hippocampus-optic":["視索は視交叉から外側膝状体などへ向かう視覚路です。海馬から乳頭体へは脳弓をたどります。","The optic tract carries visual information from the chiasm toward targets including the lateral geniculate body. The fornix links the hippocampal formation with the mammillary bodies."],
  },
  "mammillary-pathway-choice":{
    "mammillary-fornix":["脳弓は海馬体と乳頭体を結ぶ経路です。この問題で問う乳頭体から前部視床への経路は乳頭視床路です。","The fornix connects the hippocampal formation and mammillary bodies. The route asked here, from the mammillary bodies to anterior thalamus, is the mammillothalamic tract."],
    "mammillary-optic":["視索は視覚情報を伝える経路です。乳頭体から前部視床へ向かうのは乳頭視床路です。","The optic tract is a visual pathway. The mammillothalamic tract connects the mammillary bodies with anterior thalamus."],
    "mammillary-corticospinal":["皮質脊髄路は大脳皮質から脊髄へ下行する運動路です。乳頭体と前部視床を結ぶのは乳頭視床路です。","The corticospinal tract is a descending motor pathway from cortex to spinal cord. The mammillothalamic tract connects the mammillary bodies with anterior thalamus."],
  },
  "thalamus-relation-choice":{
    "thalamus-fourth":["第四脳室の床は主に橋・延髄の背側です。視床が接するのは第三脳室の側壁上部です。","The dorsal pons and medulla form most of the fourth ventricle's floor. The thalamus borders the upper part of the third ventricle's lateral wall."],
    "thalamus-lateral":["視床は側脳室の中に浮いていません。その上面は側脳室体部の床の一部に接します。","The thalamus does not float within the lateral ventricle. Its superior surface contributes to part of the floor of the ventricle's body."],
    "thalamus-surface":["視床は大脳深部の間脳にあり、外側溝の表面皮質ではありません。第三脳室との位置関係を断面で確かめましょう。","The thalamus lies deep in the diencephalon, not on the cortical surface of the lateral sulcus. Check its relation to the third ventricle in the section."],
  },
  "capsule-relation-choice":{
    "capsule-surface":["内包は脳表ではなく深部の白質路です。冠状断では尾状核・視床とレンズ核の間を探します。","The internal capsule is a deep white-matter pathway, not a surface structure. In a coronal section, look between the caudate or thalamus and the lentiform nucleus."],
    "capsule-ventricle":["第三脳室は髄液腔です。内包はその外側寄りで、尾状核・視床とレンズ核の間を通る白質路です。","The third ventricle is a CSF-filled cavity. The internal capsule is a white-matter pathway farther laterally, between the caudate or thalamus and the lentiform nucleus."],
    "capsule-cerebellar":["小脳皮質は後頭蓋窩の小脳表面です。内包は大脳深部の投射線維です。","The cerebellar cortex is on the cerebellar surface in the posterior fossa. The internal capsule is a deep cerebral projection-fiber bundle."],
  },
  "callosum-classification-choice":{
    "callosum-both-commissure":["脳梁は左右の大脳半球を結ぶ交連線維です。脳弓には海馬交連も含まれますが、主体は海馬からの投射線維です。","The corpus callosum is commissural. Although the fornix includes the hippocampal commissure, most of it carries projections from the hippocampal formation."],
    "callosum-reversed-fibres":["投射線維は離れた領域を結びますが、脳梁は左右の大脳半球を結ぶ交連線維です。脳弓の主体は海馬からの投射線維です。","Projection fibres link distant regions, whereas the corpus callosum links the two hemispheres and is commissural. The fornix is principally a hippocampal projection pathway."],
    "callosum-reversed-classes":["連合線維は同じ半球内を結び、脳梁は半球間を結ぶ交連線維です。脳弓の主体は海馬からの投射線維です。","Association fibres connect regions within one hemisphere; the corpus callosum crosses between hemispheres and is commissural. The fornix is principally a hippocampal projection pathway."],
  },
  "optic-chiasm-function":{
    "chiasm-all":["耳側網膜からの線維は交叉せず、同側の視索へ進みます。対側へ渡るのは鼻側網膜からの線維です。","Fibres from temporal retina remain on the same side and enter the ipsilateral optic tract. Fibres from nasal retina cross."],
    "chiasm-none":["鼻側網膜からの線維は視交叉で対側へ渡ります。耳側網膜からの線維は同側へ進みます。","Fibres from nasal retina cross at the optic chiasm; fibres from temporal retina remain ipsilateral."],
    "chiasm-reversed":["交叉するのは耳側ではなく鼻側網膜の線維です。左右の視索はそれぞれ反対側の視野情報を両眼から受け取ります。","Nasal, not temporal, retinal fibres cross. Each optic tract carries information from the opposite visual field of both eyes."],
  },
  "ventricle-relation-choice":{
    "ventricle-caudate-medial-floor":["前角の内側壁は主に透明中隔です。下角の床には海馬が隆起し、尾状核尾部は天井側を走ります。","The septum pellucidum forms most of the anterior horn's medial wall. The hippocampus raises the floor of the inferior horn, while the caudate tail follows its roof."],
    "ventricle-caudate-roof-floor":["側脳室体部の屋根は脳梁の下面です。視床が床の一部をつくり、尾状核体部は外側に沿います。","The corpus callosum forms the roof of the ventricular body. The thalamus contributes to its floor, while the caudate body follows its lateral side."],
    "ventricle-caudate-swapped":["尾状核の大きな頭部は前角に接し、細い尾部は後方から下角の天井側へ回り込みます。","The large caudate head adjoins the anterior horn; its slender tail curves posteriorly and then follows the roof of the inferior horn."],
  },
  "amygdala-relation-choice":{
    "amygdala-posterior":["前方から後方へ冠状断を追うと、扁桃体が先に現れ、その後に海馬頭が見えてきます。","On moving posteriorly through coronal sections, the amygdala appears before the hippocampal head."],
    "amygdala-ventricle":["側脳室下角の床を内側から隆起させるのは海馬です。扁桃体は海馬頭の前上方に位置します。","The hippocampus raises the medial part of the inferior horn's floor. The amygdala lies anterior and superior to the hippocampal head."],
    "amygdala-midline":["扁桃体は内側側頭葉の核群、海馬は海馬体の一部で、隣接しますが同一の皮質回ではありません。","The amygdala is a nuclear complex in the medial temporal lobe, while the hippocampus belongs to the hippocampal formation. They are adjacent but distinct."],
  },
  "accumbens-relation-choice":{
    "accumbens-dorsal":["尾状核頭部は側脳室前角に沿う背側線条体です。側坐核はその腹側で被殻へ続く領域にあります。","The caudate head follows the anterior horn as part of dorsal striatum. The accumbens lies ventral to it where the tissue continues toward the putamen."],
    "accumbens-pallidum":["腹側淡蒼球は側坐核から入力を受ける別の領域です。前交連付近で近接しても、側坐核そのものではありません。","The ventral pallidum receives input from the accumbens but is a distinct region. Their proximity near the anterior commissure does not make them the same nucleus."],
    "accumbens-septal":["中隔核は透明中隔の基部付近にある別の核群です。名前に「中隔」を含む側坐核も、中隔核と同一ではありません。","The septal nuclei are a separate group near the base of the septum pellucidum. Despite its historical name, the nucleus accumbens is not one of them."],
  },
  "red-nucleus-relation-choice":{
    "red-periaqueductal":["中脳中心灰白質は中脳水道を直接囲みます。赤核はその腹外側の被蓋内にある左右一対の核です。","The periaqueductal gray directly surrounds the aqueduct. The paired red nuclei lie farther ventrolaterally in the tegmentum."],
    "red-nigra":["黒質は大脳脚の背側に沿う帯状構造です。赤核はそれより背内側の被蓋内に見えます。","The substantia nigra forms a band along the dorsal side of the cerebral peduncle. The red nucleus lies dorsomedial to it in the tegmentum."],
    "red-tectum":["上丘・下丘は中脳水道の背側にある中脳蓋の隆起です。赤核は水道より腹側の被蓋内にあります。","The superior and inferior colliculi are tectal elevations dorsal to the aqueduct. The red nucleus is in the tegmentum ventral to it."],
  },
};

export function quizChoiceGuidance(question,choice,english=false){
  if(!question?.id||!choice||choice===question.correctAnswer||!question.options?.includes(choice))return null;
  const note=Object.hasOwn(guidance,question.id)?guidance[question.id][choice]:null;
  return note?.[english?1:0]??null;
}
