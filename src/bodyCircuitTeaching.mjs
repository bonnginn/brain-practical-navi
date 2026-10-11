const text=(ja,en)=>Object.freeze({ja,en});
const node=(key,ja,en,detailJa,detailEn,targets=[],plane='horizontal',position=67)=>Object.freeze({
 key,label:text(ja,en),detail:text(detailJa,detailEn),
 specimen:text(targets.length?'既存の関連構造を位置の目印として観察します。3Dは両側を示し、片側の線維を分離した表示ではありません。左右は接続図で確認します。':'この段階は接続図で確認します。専用の3D形状はありません。',targets.length?'Observe existing related structures as landmarks. The 3D view shows both sides, without separating unilateral fibres; follow sidedness in the diagram.':'Follow this stage in the connection diagram; it has no dedicated 3D shape.'),
 limitation:text('着色は個別の線維・核・交叉位置の分節ではありません。','Colour does not segment individual fibres, nuclei or the decussation.'),
 observationIndex:targets.length?0:null,observationTargets:Object.freeze(targets),observationPlane:plane,observationPosition:position,
});
const sensorySource=Object.freeze({label:'UTHealth — Somatosensory processes',url:'https://nba.uth.tmc.edu/neuroscience/m/s2/chapter05.html'});
const sensoryAnatomy=Object.freeze({label:'UTHealth — Somatosensory system',url:'https://nba.uth.tmc.edu/NEUROANATOMY/L2/Lab02p14_index.html'});
const make=(key,nameJa,nameEn,roleJa,roleEn,nodes,sources)=>Object.freeze({key,name:text(nameJa,nameEn),goal:text(roleJa,roleEn),role:text(roleJa,roleEn),
 paths:Object.freeze([Object.freeze({key:'main',label:text('主経路（左側を例に）','Main route (left-sided example)'),kind:'relay',nodes:Object.freeze(nodes.map(n=>n.key))})]),
 nodes:Object.freeze(nodes.map((n,i)=>Object.freeze({...n,observationIndex:n.observationIndex===null?null:i}))),
 displayLimit:text('左右関係を学ぶ模式図です。標本では関連する構造全体を示します。脊髄・末梢の形状や未分節の線維束を再構成したものではありません。','A schematic for learning sidedness. Specimen views show related whole structures, without reconstructed spinal, peripheral or unsegmented fibre geometry.'),quizIds:Object.freeze(key==='motor-descending'?['precentral-function','precentral-contralateral-movement','pons-corticofugal-sequence','medulla-pyramidal-tract-content','capsule-corticobulbar-destination']:['thalamus-vpl-body-input']),sources:Object.freeze(sources)});

export const BODY_CIRCUIT_TEACHING=Object.freeze({
 'motor-descending':make('motor-descending','下行運動路（皮質脊髄路）','Descending motor route (corticospinal)',
  '左大脳から主に右四肢へ向かう代表的な外側皮質脊髄路をたどります。皮質核路は内包膝付近から脳幹の運動核へ向かう別の投射で、この錐体交叉の規則を一律に当てはめません。内包膝・後脚の個別形状は未収録です。',
  'Follow the representative lateral corticospinal route from left cerebrum mainly to right limbs. Corticobulbar projections near the capsule genu instead reach brainstem motor nuclei; do not apply this pyramidal-crossing rule uniformly to them. Separate genu and posterior-limb geometry is not provided.',[
   node('motor-cortex','左運動皮質','Left motor cortex','中心前回などの皮質から下行する運動関連出力です。','Motor-related descending output arises from the precentral and other cortical regions.',['precentral'],'coronal',50),
   node('motor-capsule','左内包後脚','Left posterior limb','放線冠から内包後脚へ集まります。内包全体の着色を後脚の境界と読まないでください。','Fibres converge via corona radiata into the posterior limb; a whole-capsule highlight does not delineate that limb.',['internalCapsule'],'coronal',50),
   node('motor-midbrain','左大脳脚底','Left crus cerebri','中脳腹側を下行します。中脳全体の表示から位置関係を確かめます。','Descends through ventral midbrain; use the whole-brainstem landmark for orientation.',['brainstem'],'horizontal',67),
   node('motor-pons','左橋底部','Left basis pontis','橋底部で縦方向の皮質遠心性線維として下行します。横走する橋小脳線維とは区別します。','Descends as longitudinal corticofugal fibres, distinct from transverse pontocerebellar fibres.',['brainstem'],'horizontal',77),
   node('motor-pyramid','左延髄錐体','Left medullary pyramid','延髄腹側の錐体へまとまります。','Collects in the ventral medullary pyramid.',['brainstem'],'horizontal',83),
   node('motor-cross','下部延髄で交叉','Crosses in caudal medulla','大部分が錐体交叉で右側へ移り、外側皮質脊髄路になります。全線維がここで交叉するわけではありません。','Most fibres cross to the right at the pyramidal decussation and form the lateral corticospinal tract; not all fibres cross here.'),
   node('motor-cord','右外側皮質脊髄路','Right lateral CST','脊髄の右側を下行し、介在ニューロンや運動ニューロンへ作用します。','Descends in the right spinal cord to influence interneurons and motor neurons.'),
   node('motor-output','右前角 → 筋','Right ventral horn → muscle','下位運動ニューロンの軸索が前根・末梢神経を通り筋へ向かいます。','Lower motor-neuron axons pass through ventral roots and peripheral nerves to muscle.'),
  ],[{label:'UTHealth — Corticospinal pathway',url:'https://nba.uth.tmc.edu/neuroanatomy/L6/Lab06p32_index.html'},{label:'UTHealth — Cortical projections',url:'https://nba.uth.tmc.edu/neuroanatomy/L5/Lab05p06_index.html'},{label:'Tredici et al. — Internal capsule (individual variation)',url:'https://pubmed.ncbi.nlm.nih.gov/7076549/'}]),
 dcml:make('dcml','後索・内側毛帯系','Dorsal column–medial lemniscus',
  '左体幹・四肢からの識別性触覚・振動覚・意識的固有感覚を、延髄で交叉し右体性感覚皮質へ届くまでたどります。顔の感覚路は別です。',
  'Follow discriminative touch, vibration and conscious proprioception from left trunk and limbs, crossing in the medulla to right somatosensory cortex. Facial pathways are separate.',[
   node('dcml-receptor','左体の受容器','Left body receptors','皮膚・筋・関節などから感覚情報を受けます。','Receives sensory input from skin, muscles and joints.'),
   node('dcml-ganglion','左後根神経節','Left dorsal root ganglion','一次ニューロンの細胞体は後根神経節にあります。','First-order cell bodies lie in dorsal root ganglia.'),
   node('dcml-column','左後索を上行','Ascends left dorsal column','延髄に達するまでは同側を上行します。','Ascends ipsilaterally before reaching the medulla.'),
   node('dcml-relay','左薄束核・楔状束核','Left gracile/cuneate nuclei','延髄の後索核で二次ニューロンへ中継します。核は未分節で、脳幹全体を位置の目印にします。','Relays in medullary dorsal-column nuclei; these nuclei are unsegmented, so the brainstem is a location landmark.',['brainstem'],'horizontal',83),
   node('dcml-cross','延髄で感覚交叉','Sensory crossing in medulla','二次ニューロンの内側弓状線維が交叉します。錐体交叉とは別です。','Second-order internal arcuate fibres cross; this is distinct from the pyramidal decussation.'),
   node('dcml-lemniscus','右内側毛帯','Right medial lemniscus','交叉後は右側の脳幹を上行します。毛帯の形状は未収録です。','Ascends in right brainstem after crossing; the lemniscal shape is not included.',['brainstem'],'horizontal',77),
   node('dcml-vpl','右VPL（視床）','Right VPL (thalamus)','VPL（腹側後外側核）で皮質へ向かうニューロンへ中継します。着色は視床全体です。','Relays in ventral posterolateral nucleus toward cortex; colour shows the whole thalamus.',['thalamus'],'coronal',50),
   node('dcml-cortex','右一次体性感覚野','Right primary somatosensory cortex','内包・放線冠を経て中心後回・傍中心小葉後部へ届きます。左体の情報です。','Reaches postcentral gyrus and posterior paracentral lobule via internal capsule and corona radiata, representing left body.',['postcentral'],'coronal',50),
  ],[sensorySource,sensoryAnatomy]),
 anterolateral:make('anterolateral','前外側系（痛覚・温度覚）','Anterolateral system (pain/temperature)',
  '左体幹・四肢からの痛覚・温度覚の代表的な脊髄視床路をたどります。脊髄で交叉する点が後索系と異なります。他の前外側系投射はこの主経路にまとめません。',
  'Follow a representative spinothalamic pain/temperature route from left body. It crosses in spinal cord, unlike DCML. Other anterolateral projections are not collapsed into this main route.',[
   node('als-receptor','左体の受容器','Left body receptors','侵害刺激・温度変化などの情報を受けます。','Receives information about noxious stimuli and temperature.'),
   node('als-ganglion','左後根神経節','Left dorsal root ganglion','一次ニューロンの細胞体は後根神経節にあります。','First-order cell bodies lie in dorsal root ganglia.'),
   node('als-horn','左脊髄後角','Left dorsal horn','一次線維は脊髄へ入り、後角で二次ニューロンへ中継します。','First-order fibres enter spinal cord and relay to second-order neurons in dorsal horn.'),
   node('als-cross','脊髄で交叉','Crosses in spinal cord','二次線維が前白交連を通り反対側へ移ります。入力の近傍の髄節で交叉し、延髄まで同側を上行しません。','Second-order fibres cross through the anterior white commissure near the entry levels, rather than ascending ipsilaterally to medulla.'),
   node('als-ascent','右前外側系を上行','Ascends right anterolateral cord','右側の脊髄から脳幹へ上行します。線維束の形状は未収録です。','Ascends from right spinal cord into brainstem; the tract shape is not included.',['brainstem'],'horizontal',77),
   node('als-vpl','右VPL（視床）','Right VPL (thalamus)','代表的な脊髄視床路の中継です。他の視床核・脳幹への投射もあります。着色は視床全体です。','A relay of the representative spinothalamic route; other thalamic and brainstem projections also exist. Colour shows whole thalamus.',['thalamus'],'coronal',50),
   node('als-cortex','右一次体性感覚野','Right primary somatosensory cortex','内包・放線冠を経て左体の感覚情報を皮質へ送ります。痛みの処理はこの皮質領域だけで完結しません。','Conveys left-body input through internal capsule and corona radiata to cortex; pain processing extends beyond this cortical area.',['postcentral'],'coronal',50),
  ],[sensorySource,sensoryAnatomy]),
});
