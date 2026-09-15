export type SurfaceRegionLesson = {ja:string;en:string};

export const surfaceRegionLessons:Record<string,SurfaceRegionLesson> = {
  precentral:{
    ja:"中心前回は中心溝の前方にあり、一次運動野の主要部を含みます。反対側の身体の随意運動に強く関わり、内側へ続く中心傍小葉では下肢に関連する表現が多くなります。脳回全体が一次運動野だけで占められるわけではありません。",
    en:"The precentral gyrus lies anterior to the central sulcus and contains most of the primary motor cortex. It is strongly involved in voluntary movement of the contralateral body, with lower-limb representations extending medially into the paracentral lobule. The whole gyrus should not be equated with primary motor cortex alone.",
  },
  postcentral:{
    ja:"中心後回は中心溝の後方にあり、一次体性感覚野の主要部を含みます。反対側の身体から届く触覚・固有感覚などの処理に関わり、内側の中心傍小葉へ下肢に関連する表現が続きます。感覚処理は後方の頭頂連合野にも広がります。",
    en:"The postcentral gyrus lies posterior to the central sulcus and contains most of the primary somatosensory cortex. It processes touch, proprioception, and related signals mainly from the contralateral body, with lower-limb representations continuing into the medial paracentral lobule. Somatosensory processing also extends into posterior parietal association cortex.",
  },
  superiorFrontal:{
    ja:"上前頭回は大脳縦裂に近い前頭葉の上部を前後に走り、内側前頭面へ連続します。運動の準備、作業記憶、自己生成した行動の調整などに関わる複数の前頭領域を含みますが、機能は一様ではありません。後方では中心前回や中心傍小葉との位置関係を確認できます。",
    en:"The superior frontal gyrus runs anteroposteriorly along the upper frontal lobe near the longitudinal fissure and continues onto the medial frontal surface. It includes several frontal regions associated with motor preparation, working memory, and regulation of self-generated behavior, but its function is not uniform. Posteriorly, compare its position with the precentral gyrus and paracentral lobule.",
  },
  rostralMiddleFrontal:{
    ja:"中前頭回前部は上前頭溝と下前頭溝の間にある中前頭回の前方区画です。前頭前野ネットワークの一部として、目標の保持、作業記憶、行動方略の選択などに関連します。ここでの前後境界はCerebrA／Desikan系アトラスの区画であり、単一の機能領域を厳密に囲むものではありません。",
    en:"The rostral middle frontal region is the anterior atlas parcel of the middle frontal gyrus between the superior and inferior frontal sulci. As part of prefrontal networks, it is associated with maintaining goals, working memory, and selecting behavioral strategies. Its rostral–caudal boundary is a CerebrA/Desikan-style atlas division, not a precise border around one functional area.",
  },
  caudalMiddleFrontal:{
    ja:"中前頭回後部は中前頭回の後方で、中心前溝の前方に位置する区画です。背側前頭ネットワークや前運動領域に近く、注意に基づく行動選択や運動の準備に関係します。表示境界はCerebrA／Desikan系の区画で、前運動野などの機能境界と一対一には対応しません。",
    en:"The caudal middle frontal region occupies the posterior middle frontal gyrus, anterior to the precentral sulcus. Its proximity to dorsal frontal and premotor networks relates it to attention-guided action selection and motor preparation. The displayed CerebrA/Desikan-style parcel does not map one-to-one onto functional boundaries such as premotor cortex.",
  },
  inferiorFrontal:{
    ja:"下前頭回の弁蓋部と三角部は外側溝の前方で、その枝によって区切られます。優位半球では発話産生や言語の統語・音韻処理に関わるネットワークの一部となり、両半球では認知制御や反応抑制にも関連します。これらの機能は下前頭回だけで完結せず、個人差や左右差があります。",
    en:"The opercular and triangular parts of the inferior frontal gyrus lie anterior to the lateral sulcus and are separated by its rami. In the language-dominant hemisphere they participate in networks for speech production and syntactic and phonological processing; in both hemispheres they are also associated with cognitive control and response inhibition. These functions are distributed beyond the inferior frontal gyrus and vary across individuals and hemispheres.",
  },
  parsOrbitalis:{
    ja:"下前頭回眼窩部は下前頭回の前下方にあり、眼窩前頭面へ続きます。意味処理や、報酬・情動情報を用いた選択に関わる前頭ネットワークと結びつきます。隣接する弁蓋部・三角部や広い眼窩前頭皮質とは区別して観察します。",
    en:"The pars orbitalis occupies the anteroinferior inferior frontal gyrus and continues toward the orbital frontal surface. It participates in frontal networks associated with semantic processing and choices informed by reward and affective information. Compare it with the adjacent pars triangularis and pars opercularis and with the broader orbitofrontal cortex.",
  },
  superiorTemporal:{
    ja:"上側頭回は外側溝の下縁に沿い、横側頭回の外側・後方へ連続する聴覚関連皮質を含みます。音声や環境音の分析、優位半球の後部では言語理解に関わる広いネットワークへ参加します。一次聴覚野そのものは主に外側溝深部の横側頭回にあります。",
    en:"The superior temporal gyrus follows the lower bank of the lateral sulcus and includes auditory association cortex lateral and posterior to the transverse temporal gyri. It contributes to analysis of speech and environmental sounds and, posteriorly in the dominant hemisphere, to broader language-comprehension networks. Primary auditory cortex itself is located mainly on the transverse temporal gyri within the lateral sulcus.",
  },
  middleTemporal:{
    ja:"中側頭回は上側頭溝と下側頭溝の間を走り、側頭葉外側面の連合皮質をつくります。語や物体の意味、視聴覚情報、社会的情報の処理に関わる分散ネットワークに参加します。前後で結合と機能が異なるため、脳回全体を一つの機能単位とはみなしません。",
    en:"The middle temporal gyrus runs between the superior and inferior temporal sulci and forms association cortex on the lateral temporal surface. It participates in distributed networks for word and object meaning, audiovisual information, and social information. Connectivity and function vary along its length, so the entire gyrus is not one functional unit.",
  },
  inferiorTemporal:{
    ja:"下側頭回は下側頭溝の下方にあり、側頭葉外側面から下面へ移行します。腹側視覚経路の一部として、形や物体を視覚的に同定する高次処理に関係します。内側の紡錘状回と並べると、側頭葉下面の配置を理解しやすくなります。",
    en:"The inferior temporal gyrus lies below the inferior temporal sulcus and curves from the lateral temporal surface toward its inferior surface. As part of the ventral visual pathway, it contributes to higher-order processing used to identify forms and objects. Compare it with the more medial fusiform gyrus to understand the layout of the inferior temporal lobe.",
  },
  transverseTemporal:{
    ja:"横側頭回は外側溝の深部に横走し、一次聴覚野の主要部を含みます。聴覚入力の周波数や時間的特徴の初期皮質処理に関わり、その情報は上側頭回などの聴覚連合野へ渡ります。表面観察では弁蓋に隠れやすい位置です。",
    en:"The transverse temporal gyri run across the depth of the lateral sulcus and contain most of the primary auditory cortex. They perform early cortical analysis of frequency and temporal features of sound before information reaches auditory association regions such as the superior temporal gyrus. Their deep position makes them easy to miss in an external surface view.",
  },
  supramarginal:{
    ja:"縁上回は外側溝の後端を取り囲み、下頭頂小葉の前部をなします。体性感覚・聴覚・運動情報の統合に関わり、優位半球では音韻処理や発話に関係するネットワークへ参加します。後方の角回に相当する領域や、本表示で別区画となる下頭頂区画との境界に注意します。",
    en:"The supramarginal gyrus curves around the posterior end of the lateral sulcus and forms the anterior part of the inferior parietal lobule. It contributes to integration of somatosensory, auditory, and motor information and, in the dominant hemisphere, to networks supporting phonological processing and speech. Compare it with the more posterior angular region and with the separate inferior-parietal atlas parcel used in this display.",
  },
  superiorParietal:{
    ja:"上頭頂小葉は頭頂間溝の上方にあり、中心後回の後方へ広がります。視覚と体性感覚を統合して身体や手足の位置を表し、到達・把持や空間的注意を導く背側ネットワークに関わります。内側では楔前部へ連続します。",
    en:"The superior parietal lobule lies above the intraparietal sulcus and extends posteriorly from the postcentral gyrus. It integrates visual and somatosensory information about body and limb position and participates in dorsal networks that guide reaching, grasping, and spatial attention. Medially, it continues toward the precuneus.",
  },
  inferiorParietal:{
    ja:"下頭頂小葉は頭頂間溝の下方にあり、複数感覚の統合、注意、道具使用、言語などに関わる連合皮質です。古典的には縁上回と角回を含みますが、この表示の「下頭頂」着色はCerebrAの一区画で、縁上回は別に示します。したがって着色範囲を肉眼解剖上の下頭頂小葉全体とは解釈しません。",
    en:"The inferior parietal lobule lies below the intraparietal sulcus and contains association cortex involved in multisensory integration, attention, tool use, and language. In gross anatomy it includes the supramarginal and angular gyri, but the highlighted “inferior parietal” region here is a CerebrA parcel and the supramarginal gyrus is displayed separately. The highlight therefore should not be interpreted as the entire anatomical inferior parietal lobule.",
  },
  paracentral:{
    ja:"中心傍小葉は半球内側面で中心溝をまたぎ、中心前回と中心後回の内側への連続部を含みます。前部は主に下肢の運動、後部は主に下肢の体性感覚に関連し、排尿制御に関わる内側前頭ネットワークにも近接します。中心溝を手掛かりに前後の性質を分けて考えます。",
    en:"The paracentral lobule straddles the central sulcus on the medial hemisphere and contains medial continuations of the precentral and postcentral gyri. Its anterior portion is associated mainly with lower-limb movement and its posterior portion with lower-limb somatosensation; it also lies near medial frontal networks involved in bladder control. Use the central sulcus to distinguish its anterior and posterior components.",
  },
  precuneus:{
    ja:"楔前部は中心傍小葉の後方、頭頂後頭溝の前方にある内側頭頂皮質です。視空間的イメージ、エピソード記憶の想起、自己に関する処理などに関わる広いネットワークへ参加し、安静時にも活動する領域群の一部です。帯状回や楔部とは溝を手掛かりに区別します。",
    en:"The precuneus is medial parietal cortex posterior to the paracentral lobule and anterior to the parieto-occipital sulcus. It participates in broad networks associated with visuospatial imagery, episodic retrieval, and self-related processing and is a component of networks active during rest. Sulci help distinguish it from the cingulate gyrus and cuneus.",
  },
  cuneus:{
    ja:"楔部は内側後頭面で頭頂後頭溝と鳥距溝の間にあります。鳥距溝上岸を中心に一次視覚野の一部を含み、反対側視野の下方からの入力が表現される傾向があります。楔部全体を一次視覚野と同一視せず、下方の舌状回と対にして観察します。",
    en:"The cuneus lies on the medial occipital surface between the parieto-occipital and calcarine sulci. It includes part of primary visual cortex along the upper bank of the calcarine sulcus, with a tendency to represent input from the lower contralateral visual field. The whole cuneus is not primary visual cortex; compare it with the lingual gyrus below the sulcus.",
  },
  pericalcarine:{
    ja:"鳥距溝周囲皮質は鳥距溝の上下岸に沿うCerebrA／Desikan系の区画で、一次視覚野を多く含みます。網膜から外側膝状体を経た視覚入力の初期皮質処理を担い、周囲の視覚連合野へ情報を送ります。アトラス区画は個人の細胞構築学的なV1境界を厳密に測定したものではありません。",
    en:"Pericalcarine cortex is a CerebrA/Desikan-style parcel along both banks of the calcarine sulcus and includes much of primary visual cortex. It performs early cortical processing of visual input arriving through the lateral geniculate nucleus and passes information to surrounding visual association cortex. The atlas parcel is not an individual measurement of the exact cytoarchitectonic V1 boundary.",
  },
  lingual:{
    ja:"舌状回は鳥距溝の下方にある内側後頭葉の脳回で、前方では側頭葉下面へ続きます。初期視覚処理と高次の形・情景・文字情報の処理に関わる領域を含みます。鳥距溝下岸には反対側視野の上方を表す一次視覚野の一部が位置しますが、舌状回全体がV1ではありません。",
    en:"The lingual gyrus lies below the calcarine sulcus on the medial occipital surface and continues anteriorly toward the inferior temporal surface. It contains regions involved in early vision and higher-order processing of forms, scenes, and written information. Part of primary visual cortex representing the upper contralateral visual field lies along the lower calcarine bank, but the entire lingual gyrus is not V1.",
  },
  fusiform:{
    ja:"紡錘状回は側頭葉・後頭葉下面で、内側の側副溝と外側の後頭側頭溝の間を前後に走ります。腹側視覚経路の高次処理に関わり、その一部には顔、単語、物体などへ選択的に反応する領域があります。紡錘状回全体を顔認知だけの領域とはみなしません。",
    en:"The fusiform gyrus runs along the inferior temporal and occipital surface between the collateral sulcus medially and the occipitotemporal sulcus laterally. It contributes to higher-order ventral visual processing, and parts of it show selective responses to faces, written words, or objects. The whole fusiform gyrus should not be treated as a face-processing area.",
  },
  parahippocampal:{
    ja:"海馬傍回は内側側頭葉で海馬形成の外側を前後に走り、前方では鉤や嗅内野へ続きます。記憶に関わる皮質入力を海馬形成へ結び、情景や場所の表現にも関係します。表面の脳回と、深部にある海馬そのものを区別してください。",
    en:"The parahippocampal gyrus runs along the medial temporal lobe outside the hippocampal formation and continues anteriorly toward the uncus and entorhinal cortex. It links memory-related cortical input with the hippocampal formation and contributes to representations of scenes and places. Distinguish this surface gyrus from the hippocampus located deeper within the temporal lobe.",
  },
  entorhinal:{
    ja:"嗅内野は海馬傍回前部の皮質で、広い連合皮質と海馬形成を結ぶ主要な中継部です。エピソード記憶や空間表現に重要な入力・出力経路を担い、嗅覚との結びつきもあります。ここでのアトラス範囲を個人の組織学的境界そのものとはみなしません。",
    en:"Entorhinal cortex occupies the anterior parahippocampal region and is a major interface between widespread association cortex and the hippocampal formation. Its input and output pathways are important for episodic memory and spatial representation, and it also has olfactory connections. The atlas extent shown here should not be treated as an individual's exact histological boundary.",
  },
  insula:{
    ja:"島皮質は外側溝の深部にあり、前頭・頭頂・側頭葉の弁蓋部に覆われます。味覚、内臓感覚、痛み、身体内部の状態、情動や自律反応を結びつける複数のネットワークに関わります。前部と後部では結合や役割が異なり、島全体を単一機能へ割り当てることはできません。",
    en:"The insular cortex lies deep within the lateral sulcus, covered by frontal, parietal, and temporal opercula. It participates in several networks that integrate taste, visceral sensation, pain, internal bodily state, emotion, and autonomic responses. Anterior and posterior insula differ in connectivity and role, so the entire insula cannot be assigned one function.",
  },
  orbitofrontal:{
    ja:"眼窩前頭皮質は前頭葉下面で眼窩の上に位置し、嗅覚・味覚・内臓感覚を報酬や情動の情報と統合します。結果の価値が変化したときの選択更新や意思決定に関わります。表示は複数のCerebrA／Desikan系区画をまとめたもので、細かな機能領域の境界を示しません。",
    en:"Orbitofrontal cortex lies on the inferior frontal surface above the orbits and integrates olfactory, gustatory, and visceral signals with reward and affective information. It contributes to updating choices when the value of expected outcomes changes. This display combines multiple CerebrA/Desikan-style parcels and does not delineate fine functional subdivisions.",
  },
  lateralOccipital:{
    ja:"外側後頭皮質は後頭葉外側面に広がるCerebrA／Desikan系の区画です。一次視覚野から受けた形、輪郭、物体などの情報をさらに分析する視覚連合領域を多く含みます。着色範囲は複数の視覚野にまたがり、単一の機能野や厳密な葉境界を表すものではありません。",
    en:"Lateral occipital cortex is a CerebrA/Desikan-style parcel spread across the lateral occipital surface. It includes substantial visual association cortex that further analyzes form, contour, and objects using input from earlier visual areas. The highlight spans multiple visual areas and does not represent one functional field or an exact lobar boundary.",
  },
  cingulate:{
    ja:"帯状回は脳梁の上方を弧状に取り巻き、前方では内側前頭皮質、後方では海馬傍領域へつながるネットワークに参加します。前部は認知制御・情動・自律反応、後部は記憶や自己・環境に関する処理と強く関連します。長い脳回の各部は機能的に異なり、表面の帯状回と深部白質の帯状束も区別します。",
    en:"The cingulate gyrus curves above the corpus callosum and participates in networks linking medial frontal cortex anteriorly with parahippocampal regions posteriorly. Anterior portions are strongly associated with cognitive control, emotion, and autonomic responses, whereas posterior portions are associated with memory and processing related to self and environment. Functions differ along this long gyrus, and the cortical gyrus should also be distinguished from the underlying cingulum white-matter bundle.",
  },
};

export const surfaceRegionLessonSources = [
  {title:"Manera et al. (2020) — CerebrA: a population-based nonlinear normalization framework paired with a manual anatomical parcellation atlas of MNI-ICBM152",url:"https://doi.org/10.1038/s41597-020-0557-9"},
  {title:"FreeSurfer Wiki — Cortical Parcellation",url:"https://surfer.nmr.mgh.harvard.edu/fswiki/CorticalParcellation"},
  {title:"NCBI Bookshelf — Neuroanatomy, Cerebral Cortex",url:"https://www.ncbi.nlm.nih.gov/books/NBK537247/"},
  {title:"NCBI Bookshelf — Brodmann Areas",url:"https://www.ncbi.nlm.nih.gov/books/NBK575742/"},
] as const;
