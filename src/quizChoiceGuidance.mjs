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
  "cn3-function":{
    "cn3-lateral-rectus":["外側直筋は外転神経（VI）の支配です。動眼神経（III）は内側直筋など多くの外眼筋と、上眼瞼挙上・縮瞳・調節に関わります。","The abducens nerve (VI) supplies the lateral rectus. Oculomotor (III) supplies most other extraocular muscles, lifts the upper eyelid, and carries fibres for pupillary constriction and accommodation."],
    "cn3-superior-oblique":["上斜筋は滑車神経（IV）の支配です。動眼神経（III）は下斜筋や内側直筋などを支配します。","The trochlear nerve (IV) supplies the superior oblique. Oculomotor (III) supplies the inferior oblique, medial rectus, and other muscles."],
    "cn3-facial":["表情筋は顔面神経（VII）の支配です。動眼神経（III）は主に眼球運動、上眼瞼挙上、縮瞳・調節に関わります。","The facial nerve (VII) supplies muscles of facial expression. Oculomotor (III) primarily controls eye movements, upper-lid elevation, pupillary constriction, and accommodation."],
  },
  "cn4-function":{
    "cn4-lateral-rectus":["外側直筋は外転神経（VI）の支配です。滑車神経（IV）が支配するのは上斜筋です。","The abducens nerve (VI) supplies the lateral rectus. The trochlear nerve (IV) supplies the superior oblique."],
    "cn4-inferior-oblique":["下斜筋は動眼神経（III）の支配です。滑車神経（IV）が支配するのは上斜筋です。","The oculomotor nerve (III) supplies the inferior oblique. The trochlear nerve (IV) supplies the superior oblique."],
    "cn4-superior-rectus":["上直筋は動眼神経（III）の支配です。滑車神経（IV）が支配するのは上斜筋です。","The oculomotor nerve (III) supplies the superior rectus. The trochlear nerve (IV) supplies the superior oblique."],
  },
  "cn6-function":{
    "cn6-superior-oblique":["上斜筋は滑車神経（IV）の支配です。外転神経（VI）は外側直筋を支配します。","The trochlear nerve (IV) supplies the superior oblique. The abducens nerve (VI) supplies the lateral rectus."],
    "cn6-medial-rectus":["内側直筋は動眼神経（III）の支配で、眼球の内転に関わります。外転神経（VI）は外側直筋による外転です。","The oculomotor nerve (III) supplies the medial rectus for adduction. The abducens nerve (VI) supplies the lateral rectus for abduction."],
    "cn6-inferior-oblique":["下斜筋は動眼神経（III）の支配です。外転神経（VI）が支配するのは外側直筋です。","The oculomotor nerve (III) supplies the inferior oblique. The abducens nerve (VI) supplies the lateral rectus."],
  },
  "cn1-function":{
    "cn1-vision":["視覚は網膜から視神経（II）へ伝わります。嗅神経（I）は鼻腔の嗅上皮から嗅球へ嗅覚情報を運びます。","Vision travels from the retina through the optic nerve (II). The olfactory nerve (I) carries smell information from the olfactory epithelium to the bulb."],
    "cn1-hearing":["聴覚と平衡覚は内耳神経（VIII）の役割です。嗅神経（I）は嗅覚を嗅球へ伝えます。","Hearing and balance belong to VIII. The olfactory nerve (I) carries smell information to the olfactory bulb."],
    "cn1-tongue":["舌筋運動は主に舌下神経（XII）が担います。嗅神経（I）は運動ではなく嗅覚の経路です。","Most tongue muscles are moved by the hypoglossal nerve (XII). The olfactory nerve (I) carries smell, not motor commands."],
  },
  "cn2-function":{
    "cn2-smell":["嗅覚は嗅神経（I）から嗅球へ入ります。視神経（II）は網膜からの視覚情報を視交叉へ運びます。","Smell reaches the olfactory bulb through nerve I. The optic nerve (II) carries visual information from the retina to the chiasm."],
    "cn2-face":["顔面の一般感覚の大部分は三叉神経（V）が伝えます。視神経（II）が運ぶのは網膜からの視覚情報です。","Most general facial sensation travels in V. The optic nerve (II) carries visual information from the retina."],
    "cn2-taste":["舌後方1/3の味覚は主に舌咽神経（IX）が伝えます。視神経（II）は味覚ではなく視覚の経路です。","Taste from the posterior third of the tongue travels mainly in IX. The optic nerve (II) is a visual, not a taste, pathway."],
  },
  "cn5-function":{
    "cn5-hearing":["聴覚と平衡覚は内耳神経（VIII）が伝えます。三叉神経（V）は顔面の一般感覚と咀嚼筋運動を担います。","The vestibulocochlear nerve (VIII) carries hearing and balance. The trigeminal nerve (V) carries much of facial sensation and motor fibres for mastication."],
    "cn5-vision":["視覚情報は視神経（II）を通ります。三叉神経（V）では顔面の感覚と咀嚼筋への運動線維に注目します。","Visual information travels in the optic nerve (II). For the trigeminal nerve (V), look for facial sensation and motor fibres to the muscles of mastication."],
    "cn5-parasymp":["胸腹部臓器への副交感神経は主に迷走神経（X）です。三叉神経（V）の主要な役割は顔面感覚と咀嚼筋運動です。","The vagus nerve (X) provides much of the parasympathetic supply to thoracic and abdominal viscera. The main roles of V are facial sensation and mastication."],
  },
  "cn7-function":{
    "cn7-face-sensation":["顔面の一般感覚の大部分は三叉神経（V）が伝えます。顔面神経（VII）は表情筋運動に加え、味覚と一部の腺への副交感線維を含みます。","Most general facial sensation travels in the trigeminal nerve (V). The facial nerve (VII) moves facial-expression muscles and also carries taste and parasympathetic fibres."],
    "cn7-hearing":["聴覚と平衡覚は内耳神経（VIII）の役割です。隣接して脳幹を出る顔面神経（VII）は表情筋運動などを担います。","Hearing and balance belong to VIII. The adjacent facial nerve (VII) supplies muscles of facial expression, among other functions."],
    "cn7-tongue-motor":["舌筋の運動は主に舌下神経（XII）です。顔面神経（VII）が舌から受けるのは前方2/3の味覚です。","Most tongue muscles are supplied by the hypoglossal nerve (XII). The facial nerve (VII) carries taste from the anterior two-thirds of the tongue."],
  },
  "cn8-function":{
    "cn8-smell":["嗅覚は嗅神経（I）から嗅球へ入ります。内耳神経（VIII）は聴覚と平衡覚を伝えます。","Smell enters the olfactory bulb through nerve I. The vestibulocochlear nerve (VIII) carries hearing and balance."],
    "cn8-face":["顔面の一般感覚の大部分は三叉神経（V）が伝えます。内耳神経（VIII）は蝸牛・前庭からの情報を伝えます。","Most general facial sensation travels in V. The vestibulocochlear nerve (VIII) carries input from the cochlea and vestibular apparatus."],
    "cn8-visceral":["胸腹部の内臓感覚は主に迷走神経（X）を通ります。内耳神経（VIII）の感覚は聴覚と平衡覚です。","Visceral sensation from the thorax and abdomen travels mainly in X. The sensory modalities of VIII are hearing and balance."],
  },
  "cn9-function":{
    "cn9-eye":["眼球の外転は外転神経（VI）が外側直筋を動かします。舌咽神経（IX）は舌後方の味覚・感覚や咽頭機能に関わります。","The abducens nerve (VI) abducts the eye through the lateral rectus. The glossopharyngeal nerve (IX) carries posterior-tongue taste and sensation and contributes to pharyngeal function."],
    "cn9-face":["表情筋を動かすのは顔面神経（VII）です。舌咽神経（IX）は舌後方と咽頭、耳下腺への経路をたどります。","The facial nerve (VII) moves facial-expression muscles. The glossopharyngeal nerve (IX) serves the posterior tongue, pharynx and parotid secretory pathway."],
    "cn9-smell":["嗅覚は嗅神経（I）です。舌咽神経（IX）では舌後方1/3の味覚と咽頭の感覚・運動を区別して確認します。","Smell travels in the olfactory nerve (I). For IX, identify taste from the posterior third of the tongue and its sensory and motor roles in the pharynx."],
  },
  "cn10-function":{
    "cn10-vision":["視覚は視神経（II）から視交叉・視索へ進みます。迷走神経（X）は咽頭・喉頭と胸腹部臓器に関わります。","Vision travels through the optic nerve (II), chiasm and tract. The vagus nerve (X) serves the pharynx, larynx and thoracoabdominal viscera."],
    "cn10-mastication":["咀嚼筋運動は三叉神経（V）の運動線維です。迷走神経（X）は咽頭・喉頭の運動や内臓への経路を含みます。","Motor fibres for mastication belong to V. The vagus nerve (X) includes motor supply to the pharynx and larynx and pathways to the viscera."],
    "cn10-eye":["眼球外転は外転神経（VI）が担います。迷走神経（X）は咽頭・喉頭と広い内臓領域に関わる混合神経です。","Eye abduction depends on the abducens nerve (VI). The vagus nerve (X) is a mixed nerve serving the pharynx, larynx and a broad visceral territory."],
  },
  "cn11-function":{
    "cn11-lateral-rectus":["外側直筋は外転神経（VI）が支配します。副神経（XI）では胸鎖乳突筋と僧帽筋を探します。","The abducens nerve (VI) supplies the lateral rectus. For the accessory nerve (XI), identify sternocleidomastoid and trapezius."],
    "cn11-masseter":["咬筋は三叉神経（V）の運動枝が支配します。副神経（XI）の主な標的は胸鎖乳突筋と僧帽筋です。","The motor division of V supplies the masseter. The principal targets of XI are sternocleidomastoid and trapezius."],
    "cn11-tongue":["舌筋の運動は主に舌下神経（XII）です。副神経（XI）は頭部の回旋や肩を上げる筋に関わります。","Most tongue muscles are supplied by the hypoglossal nerve (XII). The accessory nerve (XI) acts through muscles that rotate the head and elevate the shoulder."],
  },
  "cn12-function":{
    "cn12-hearing":["聴覚と平衡覚は内耳神経（VIII）の機能です。舌下神経（XII）は舌筋の運動を担います。","Hearing and balance belong to VIII. The hypoglossal nerve (XII) moves the tongue muscles."],
    "cn12-face":["顔面の一般感覚の大部分は三叉神経（V）が伝えます。舌下神経（XII）は舌の運動神経です。","Most general facial sensation travels in V. The hypoglossal nerve (XII) is a motor nerve for the tongue."],
    "cn12-pupil":["縮瞳は動眼神経（III）の副交感線維が関わります。舌下神経（XII）は舌筋を動かします。","Pupillary constriction involves parasympathetic fibres in the oculomotor nerve (III). The hypoglossal nerve (XII) moves tongue muscles."],
  },
};

export function quizChoiceGuidance(question,choice,english=false){
  if(!question?.id||!choice||choice===question.correctAnswer||!question.options?.includes(choice))return null;
  const note=Object.hasOwn(guidance,question.id)?guidance[question.id][choice]:null;
  return note?.[english?1:0]??null;
}
