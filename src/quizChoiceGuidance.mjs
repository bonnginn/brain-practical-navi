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
  "pallidum-segment-choice":{
    "pallidum-reversed-output":["視床へ向かう主要な基底核出力は内節（GPi）から出ます。外節（GPe）は主に視床下核などとの基底核内回路に関わります。","The internal segment (GPi) is a major basal-ganglia output toward the thalamus. The external segment (GPe) mainly participates in circuits within the basal ganglia, including the subthalamic nucleus."],
    "pallidum-reversed-location":["被殻に近い外側がGPe、内包に近い内側がGPiです。断面で外から内へ追ってください。","The GPe lies laterally beside the putamen; the GPi lies medially beside the internal capsule. Trace them from lateral to medial in the section."],
    "pallidum-striatal-input":["皮質からの主な入力を受ける線条体は尾状核と被殻です。淡蒼球のGPi・GPeとは区別します。","The caudate and putamen form the principal cortical input region of the striatum. They are distinct from the GPi and GPe of the globus pallidus."],
  },
  "substantia-nigra-relation-choice":{
    "sn-ventricle":["側脳室前角の外側壁には尾状核頭部が接します。黒質は中脳で大脳脚の背側に沿います。","The caudate head adjoins the lateral wall of the anterior horn. The substantia nigra lies in the midbrain along the dorsal side of the cerebral peduncle."],
    "sn-cerebellar":["小脳皮質は小脳半球の表面です。黒質は中脳の深部にある帯状の核です。","Cerebellar cortex covers the cerebellar hemispheres. The substantia nigra is a band-like nucleus deep in the midbrain."],
    "sn-callosal":["左右半球を結ぶ交連線維は脳梁です。黒質は中脳にある核で、交連線維ではありません。","The corpus callosum contains commissural fibres joining the hemispheres. The substantia nigra is a midbrain nucleus, not a commissural bundle."],
  },
  "subthalamic-classification-choice":{
    "stn-hypothalamus":["視床下核と視床下部はともに間脳にありますが、視床下核は視床下域に属します。","The subthalamic nucleus and hypothalamus are both in the diencephalon, but the nucleus belongs to the subthalamus."],
    "stn-midbrain":["中脳の黒質とは隣接しますが、視床下核自体はその上方の間脳・視床下域にあります。","The subthalamic nucleus is adjacent to the midbrain substantia nigra but belongs to the diencephalic subthalamus above it."],
    "stn-cortex":["大脳皮質は半球の表層です。視床下核は間脳深部の小さな核です。","Cerebral cortex forms the hemispheric surface. The subthalamic nucleus is a small deep diencephalic nucleus."],
  },
  "brainstem-components-choice":{
    "brainstem-thalamus":["視床と視床下部は間脳、尾状核は大脳半球深部の線条体です。脳幹の3部位は中脳・橋・延髄です。","The thalamus and hypothalamus are diencephalic; the caudate is part of the deep cerebral striatum. The brainstem comprises midbrain, pons and medulla."],
    "brainstem-cerebellum":["小脳半球・虫部・片葉は小脳の部分です。小脳は脳幹の背側に隣接しますが、脳幹の3部位には含めません。","The hemispheres, vermis and flocculus are parts of the cerebellum. It lies dorsal to the brainstem but is not one of its three divisions."],
    "brainstem-lobes":["前頭葉・頭頂葉・側頭葉は大脳半球の葉です。脳幹は中脳・橋・延髄を縦に追います。","Frontal, parietal and temporal are cerebral lobes. Trace the brainstem vertically through the midbrain, pons and medulla."],
  },
  "cerebellum-relation-choice":{
    "cerebellum-third":["第三脳室の側壁は間脳の視床・視床下部に接します。小脳の腹側にあるのは第四脳室です。","The third ventricle borders the diencephalic thalamus and hypothalamus. The fourth ventricle lies ventral to the cerebellum."],
    "cerebellum-lateral":["側脳室前角の外側には尾状核頭部があります。小脳は後頭蓋窩で第四脳室の背側に位置します。","The caudate head adjoins the anterior horn of the lateral ventricle. The cerebellum lies in the posterior fossa, dorsal to the fourth ventricle."],
    "cerebellum-insula":["外側溝の深部にあるのは島皮質です。小脳は脳幹の背側にあり、第四脳室を挟んで橋・延髄と向かい合います。","The insula lies deep in the lateral sulcus. The cerebellum is dorsal to the brainstem, facing the pons and medulla across the fourth ventricle."],
  },
  "superior-frontal-relation":{
    "sfg-temporal":["外側溝より下は側頭葉です。上前頭回は前頭葉上面の、大脳縦裂に近い側を探します。","Below the lateral sulcus lies the temporal lobe. Look for the superior frontal gyrus on the frontal surface near the interhemispheric fissure."],
    "sfg-occipital":["鳥距溝の下方は後頭葉内側面の舌状回側です。上前頭回は前頭葉上面にあります。","Below the calcarine sulcus lies the lingual-gyrus side of medial occipital cortex. The superior frontal gyrus is on the superior frontal surface."],
    "sfg-cerebellar":["小脳半球は大脳の後下方にある別の構造です。上前頭回は大脳縦裂に近い前頭葉上面を探します。","The cerebellar hemisphere is a separate structure below and behind the cerebrum. The superior frontal gyrus lies near the interhemispheric fissure on the frontal lobe."],
  },
  "precuneus-relation":{
    "precuneus-below":["鳥距溝の下方は舌状回側です。楔前部はその前方、頭頂葉内側面で頭頂後頭溝の前にあります。","Below the calcarine sulcus lies the lingual-gyrus side. The precuneus is farther anterior on the medial parietal surface, before the parieto-occipital sulcus."],
    "precuneus-lateral":["外側溝は大脳外側面の目印です。楔前部は内側面で中心傍小葉の後方を探します。","The lateral sulcus is a landmark on the lateral cerebral surface. Find the precuneus on the medial surface behind the paracentral lobule."],
    "precuneus-brainstem":["橋延髄境界は脳幹にあります。楔前部は大脳の内側面、頭頂葉後方の皮質です。","The pontomedullary junction is in the brainstem. The precuneus is medial cerebral cortex in the posterior parietal lobe."],
  },
  "cuneus-relation":{
    "cuneus-central":["中心溝と外側溝は大脳外側面を読む目印です。楔部は後頭葉内側面で頭頂後頭溝と鳥距溝に挟まれます。","The central and lateral sulci are lateral-surface landmarks. The cuneus lies between the parieto-occipital and calcarine sulci on the medial occipital surface."],
    "cuneus-olfactory":["嗅溝と眼窩溝は前頭葉の下面にあります。楔部を囲むのは後頭葉内側面の頭頂後頭溝と鳥距溝です。","Olfactory and orbital sulci are on the inferior frontal surface. The cuneus is bounded by the parieto-occipital and calcarine sulci on the medial occipital surface."],
    "cuneus-collateral":["側副溝と海馬溝は側頭・後頭葉の腹側を読む目印です。楔部の上下を分ける組合せは頭頂後頭溝と鳥距溝です。","The collateral and hippocampal sulci help orient the ventral temporal and occipital surfaces. The cuneus is delimited by the parieto-occipital and calcarine sulci."],
  },
  "ica-function":{
    "ica-posterior":["椎骨動脈が合流して脳底動脈となる系は後方循環です。内頸動脈は前大脳・中大脳動脈へ続く前方循環の入口です。","The vertebral arteries unite as the basilar artery in the posterior circulation. The internal carotid supplies the anterior circulation through the anterior and middle cerebral arteries."],
    "ica-venous":["硬膜静脈洞は脳から戻る静脈血の排出路です。内頸動脈は脳へ血液を送る動脈です。","Dural venous sinuses drain venous blood from the brain. The internal carotid is an artery that supplies blood to it."],
    "ica-csf":["脳室は脳脊髄液の腔です。内頸動脈は脳底を走り、前方循環へ血液を送ります。","Ventricles are CSF-filled cavities. The internal carotid runs at the brain base and supplies the anterior circulation."],
  },
};

export function quizChoiceGuidance(question,choice,english=false){
  if(!question?.id||!choice||choice===question.correctAnswer||!question.options?.includes(choice))return null;
  const note=Object.hasOwn(guidance,question.id)?guidance[question.id][choice]:null;
  return note?.[english?1:0]??null;
}
