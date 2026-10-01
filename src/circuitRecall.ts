import type {BilingualText} from './circuitTeaching.mjs';

type CircuitRecall={key:string;question:BilingualText;answer:BilingualText;hint?:BilingualText;path:string;node:string};

// Original review prompts for the simplified pathways in circuitTeaching.
// Teaching references are linked by CircuitTeachingPanel and SegmentationReferences.
export const circuitRecall:Record<string,readonly CircuitRecall[]>={
  papez:[
    {key:'anterior-relay',question:{ja:'Papez回路の視床中継は、前核群とVA/VLのどちらでしょうか？',en:'Does the Papez circuit relay through the anterior group or VA/VL?'},
      hint:{ja:'乳頭体から入力を受け、その先で帯状回と結びつく核群を、視床の前方に探します。',en:'Look toward the anterior thalamus for the group receiving mammillary input and connecting onward to cingulate cortex.'},
      answer:{ja:'前核群です。乳頭体 → 乳頭視床路 → 前核群 → 帯状回というつながりを確かめます。VA/VLは主に運動関連の中継として対比します。前核群の模式点は位置の目安で、視床全体の着色がその核群を表すわけではありません。',en:'The anterior group. Follow mammillary bodies → mammillothalamic tract → anterior group → cingulate cortex. Contrast this with the motor-related VA/VL relays. The schematic point is a positional aid; whole-thalamus colour does not identify the anterior nuclei.'},path:'loop',node:'anterior-thalamus'},
    {key:'tracts',question:{ja:'海馬体から乳頭体、さらに視床前部核へ。間をつなぐ2つの線維路は？',en:'Which two tracts link the hippocampal formation to the mammillary bodies, then to the anterior thalamic nuclei?'},
      hint:{ja:'海馬の内側縁から正中の体部・柱へ向かう白質路と、乳頭体から視床へ上行する別の白質路を考えます。',en:'Think of one white-matter pathway from the medial hippocampal edge toward a midline body and columns, and another ascending from the mammillary bodies to the thalamus.'},
      answer:{ja:'海馬体 → 脳弓 → 乳頭体 → 乳頭視床路 → 視床前部核です。灰白質の中継部と、それらを結ぶ白質路を分けてたどりましょう。',en:'Hippocampal formation → fornix → mammillary bodies → mammillothalamic tract → anterior thalamic nuclei. Distinguish the grey-matter relays from the white-matter pathways connecting them.'},path:'loop',node:'fornix'},
    {key:'cingulate',question:{ja:'帯状回と帯状束は、同じ構造でしょうか？',en:'Are the cingulate gyrus and cingulum the same structure?'},
      hint:{ja:'脳回は皮質を含む表面のひだです。「束」がその表面にあるのか、深部の白質にあるのかを考えます。',en:'A gyrus is a surface fold containing cortex. Consider whether the bundle is that surface fold or lies in the white matter deep to it.'},
      answer:{ja:'帯状回は大脳内側面の皮質を含む脳回、帯状束はその深部を通る白質の連合線維系です。この簡略回路では、帯状回から帯状束を経て海馬傍回・嗅内野へ続くつながりを追います。',en:'The cingulate gyrus contains cortex on the medial cerebral surface; the cingulum is an association-fibre bundle running deep to it. In this simplified loop, follow the connection through the cingulum toward parahippocampal and entorhinal cortex.'},path:'loop',node:'cingulate'},
  ],
  visual:[
    {key:'geniculate-relays',question:{ja:'外側膝状体と内側膝状体は、それぞれ何を中継するのでしょうか？',en:'What does each geniculate body relay: lateral versus medial?'},
      hint:{ja:'視索が入るのは外側、下丘からの聴覚入力が入るのは内側です。参考図では視床枕の下方を見比べます。',en:'Optic-tract input reaches the lateral body; auditory input from the inferior colliculus reaches the medial one. Compare their positions below the pulvinar.'},
      answer:{ja:'外側膝状体は視覚情報を視放線から一次視覚野へ、内側膝状体は聴覚情報を聴放線から聴覚皮質へ中継します。視覚路の主な膝状体中継を、内側膝状体と取り違えないようにしましょう。',en:'LGN relays visual information through the optic radiation to primary visual cortex; MGB relays auditory information through the auditory radiation to auditory cortex. The principal geniculate relay in this visual pathway is LGN, not MGB.'},path:'right-field-right-eye',node:'lgn'},
    {key:'field',question:{ja:'左視索は「左眼だけ」の情報を運ぶのでしょうか？',en:'Does the left optic tract carry information only from the left eye?'},
      hint:{ja:'鼻側網膜からの線維は交叉し、耳側網膜からの線維は交叉しません。左視索へ入る線維を、両眼からたどってみます。',en:'Nasal-retinal fibres cross and temporal-retinal fibres do not. Trace which fibres reach the left optic tract from each eye.'},
      answer:{ja:'左視索が運ぶのは両眼の右視野の情報です。右眼の鼻側網膜からの線維は視交叉で交叉し、左眼の耳側網膜からの線維は交叉せず、左視索へ入ります。「眼の左右」と「視野の左右」を区別しましょう。',en:'It carries the right visual field from both eyes. Fibres from the right nasal retina cross at the chiasm; fibres from the left temporal retina do not cross. Both enter the left optic tract. Eye side and visual-field side are different.'},path:'right-field-right-eye',node:'optic-tract'},
    {key:'relay',question:{ja:'視索と視放線の間の主な中継核は？ 一次視覚野の位置の目印は？',en:'What is the main relay between the optic tract and optic radiation, and what landmark helps locate primary visual cortex?'},
      hint:{ja:'視床の後下方にある中継部と、大脳内側面で後頭葉を走る溝を探します。',en:'Look for a relay posteroinferior to the thalamus and a sulcus on the medial occipital surface.'},
      answer:{ja:'主な中継核は外側膝状体です。そこから視放線が後頭葉へ向かい、鳥距溝の両岸に広がる一次視覚野へ至ります。視索と視放線を、同じ線維がそのまま通過する一本の束と捉えないことが大切です。',en:'The lateral geniculate nucleus is the main relay. Its projections form the optic radiation toward primary visual cortex along the calcarine sulcus. The optic tract and radiation are successive neuronal projections, not one uninterrupted set of axons.'},path:'right-field-right-eye',node:'lgn'},
  ],
  'basal-ganglia':[
    {key:'motor-thalamus',question:{ja:'この運動回路の視床中継はどの核群？ 前核群やVPLとの違いは？',en:'Which thalamic group relays this motor loop, and how does it differ from the anterior group or VPL?'},
      hint:{ja:'外側核群の腹側で、前方からその後方へ続く2つの運動中継領域を探します。記憶関連の前核群、体幹・四肢の感覚を中継するVPLと対比しましょう。',en:'Look for the two motor relays in the ventral tier of the lateral group, one anterior to the other. Contrast them with the memory-related anterior group and the body-sensory relay VPL.'},
      answer:{ja:'この簡略な運動回路ではVA/VLです。GPi／SNrから抑制性入力を受け、運動関連皮質へ興奮性入力を返します。すべての基底核回路がVA/VLだけを通るわけではなく、認知などの回路には別の視床中継もあります。',en:'VA/VL in this simplified motor loop. They receive inhibitory GPi/SNr output and return excitatory input to motor-related cortex. Not every basal-ganglia loop uses only VA/VL; cognitive and other loops have additional thalamic relays.'},path:'direct',node:'thalamus'},
    {key:'disinhibition',question:{ja:'直接路の線条体出力は抑制性なのに、なぜ視床皮質活動を通しやすくするのでしょうか？',en:'Why can inhibitory striatal output in the direct pathway facilitate thalamocortical activity?'},
      hint:{ja:'図の線条体から視床まで、2つの「−」を順に追います。視床を抑えている細胞が抑えられると、視床への作用はどう変わるでしょうか。',en:'Trace the two minus signs from striatum toward thalamus. What happens to thalamic inhibition when the cells providing it are themselves inhibited?'},
      answer:{ja:'線条体が、視床を持続的に抑制している出力核GPi／SNrを抑えるためです。視床への抑制が弱まる「脱抑制」を、図の「− → −」で確かめましょう。これは古典的回路を簡略化した説明です。',en:'The striatum inhibits GPi/SNr, which normally inhibit the thalamus. Reducing that inhibition disinhibits the thalamus. Trace the two inhibitory connections in the diagram. This is the simplified classical account.'},path:'direct',node:'gpi-snr'},
    {key:'pallidal-segments',question:{ja:'淡蒼球外節GPeと内節GPiは、この回路で何が違うのでしょうか？',en:'How do GPe and GPi differ in this circuit?'},
      hint:{ja:'一方は間接路の途中で視床下核とつながり、もう一方は視床へ向かう出力に関わります。矢印の行き先を比べます。',en:'One participates in the indirect route through STN; the other provides output toward thalamus. Compare where their outgoing arrows lead.'},
      answer:{ja:'GPeは間接路で視床下核を抑制する中継部、GPiはSNrとともに視床を抑制する主要な出力核です。間接路では線条体がGPeを抑え、視床下核が脱抑制されて、出力核への興奮が強まる方向に働きます。',en:'GPe inhibits the subthalamic nucleus in the indirect pathway. GPi, together with SNr, is a major output nucleus inhibiting the thalamus. In the indirect pathway, striatal inhibition of GPe disinhibits STN, tending to increase excitation of the output nuclei.'},path:'indirect',node:'gpe'},
  ],
};
