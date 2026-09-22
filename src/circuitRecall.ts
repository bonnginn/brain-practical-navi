import type {BilingualText} from './circuitTeaching.mjs';

type CircuitRecall={key:string;question:BilingualText;answer:BilingualText;path:string;node:string};

// Original review prompts for the simplified pathways in circuitTeaching.
// Teaching references are linked by CircuitTeachingPanel and SegmentationReferences.
export const circuitRecall:Record<string,readonly CircuitRecall[]>={
  papez:[
    {key:'tracts',question:{ja:'海馬体から乳頭体、さらに視床前部核へ。間をつなぐ2つの線維路は？',en:'Which two tracts link the hippocampal formation to the mammillary bodies, then to the anterior thalamic nuclei?'},
      answer:{ja:'海馬体 → 脳弓 → 乳頭体 → 乳頭視床路 → 視床前部核です。灰白質の中継部と、それらを結ぶ白質路を分けてたどりましょう。',en:'Hippocampal formation → fornix → mammillary bodies → mammillothalamic tract → anterior thalamic nuclei. Distinguish the grey-matter relays from the white-matter pathways connecting them.'},path:'loop',node:'fornix'},
    {key:'cingulate',question:{ja:'帯状回と帯状束は、同じ構造でしょうか？',en:'Are the cingulate gyrus and cingulum the same structure?'},
      answer:{ja:'帯状回は大脳内側面の皮質を含む脳回、帯状束はその深部を通る白質の連合線維系です。この簡略回路では、帯状回から帯状束を経て海馬傍回・嗅内野へ続くつながりを追います。',en:'The cingulate gyrus contains cortex on the medial cerebral surface; the cingulum is an association-fibre bundle running deep to it. In this simplified loop, follow the connection through the cingulum toward parahippocampal and entorhinal cortex.'},path:'loop',node:'cingulate'},
  ],
  visual:[
    {key:'field',question:{ja:'左視索は「左眼だけ」の情報を運ぶのでしょうか？',en:'Does the left optic tract carry information only from the left eye?'},
      answer:{ja:'左視索が運ぶのは両眼の右視野の情報です。右眼の鼻側網膜からの線維は視交叉で交叉し、左眼の耳側網膜からの線維は交叉せず、左視索へ入ります。「眼の左右」と「視野の左右」を区別しましょう。',en:'It carries the right visual field from both eyes. Fibres from the right nasal retina cross at the chiasm; fibres from the left temporal retina do not cross. Both enter the left optic tract. Eye side and visual-field side are different.'},path:'right-field-right-eye',node:'optic-tract'},
    {key:'relay',question:{ja:'視索と視放線の間の主な中継核は？ 一次視覚野の位置の目印は？',en:'What is the main relay between the optic tract and optic radiation, and what landmark helps locate primary visual cortex?'},
      answer:{ja:'主な中継核は外側膝状体です。そこから視放線が後頭葉へ向かい、鳥距溝の両岸に広がる一次視覚野へ至ります。視索と視放線を、同じ線維がそのまま通過する一本の束と捉えないことが大切です。',en:'The lateral geniculate nucleus is the main relay. Its projections form the optic radiation toward primary visual cortex along the calcarine sulcus. The optic tract and radiation are successive neuronal projections, not one uninterrupted set of axons.'},path:'right-field-right-eye',node:'lgn'},
  ],
  'basal-ganglia':[
    {key:'disinhibition',question:{ja:'直接路の線条体出力は抑制性なのに、なぜ視床皮質活動を通しやすくするのでしょうか？',en:'Why can inhibitory striatal output in the direct pathway facilitate thalamocortical activity?'},
      answer:{ja:'線条体が、視床を持続的に抑制している出力核GPi／SNrを抑えるためです。視床への抑制が弱まる「脱抑制」を、図の「− → −」で確かめましょう。これは古典的回路を簡略化した説明です。',en:'The striatum inhibits GPi/SNr, which normally inhibit the thalamus. Reducing that inhibition disinhibits the thalamus. Trace the two inhibitory connections in the diagram. This is the simplified classical account.'},path:'direct',node:'gpi-snr'},
    {key:'pallidal-segments',question:{ja:'淡蒼球外節GPeと内節GPiは、この回路で何が違うのでしょうか？',en:'How do GPe and GPi differ in this circuit?'},
      answer:{ja:'GPeは間接路で視床下核を抑制する中継部、GPiはSNrとともに視床を抑制する主要な出力核です。間接路では線条体がGPeを抑え、視床下核が脱抑制されて、出力核への興奮が強まる方向に働きます。',en:'GPe inhibits the subthalamic nucleus in the indirect pathway. GPi, together with SNr, is a major output nucleus inhibiting the thalamus. In the indirect pathway, striatal inhibition of GPe disinhibits STN, tending to increase excitation of the output nuclei.'},path:'indirect',node:'gpe'},
  ],
};
