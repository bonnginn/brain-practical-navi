const bilingual = (ja, en) => Object.freeze({ja, en});

export const CIRCUIT_TEACHING = Object.freeze({
  papez: Object.freeze({
    key: "papez",
    name: bilingual("Papez回路", "Papez circuit"),
    goal: bilingual("記憶に関わる内側側頭葉―間脳―帯状回の環状のつながりを、標本で確認できる構造と未分節の中継部に分けて説明できる。", "Explain the memory-related loop linking the medial temporal lobe, diencephalon and cingulate region, while separating structures visible in this specimen from unsegmented relays."),
    role: bilingual("海馬体から間脳と帯状回を経て内側側頭葉へ戻る結合を示す歴史的な回路モデルです。現在は記憶ネットワークを理解する基本図として使われますが、記憶や情動をこの一回路だけで説明するものではありません。", "A historical circuit model linking the hippocampal formation through diencephalic and cingulate relays back to the medial temporal lobe. It remains a useful framework for memory networks, but does not by itself explain memory or emotion."),
    paths: Object.freeze([
      Object.freeze({key:"loop", label:bilingual("情報の流れ（簡略）", "Information flow (simplified)"), kind:"relay", nodes:Object.freeze(["hippocampus","fornix","mammillary","mammillothalamic","anterior-thalamus","cingulate","cingulum","entorhinal","hippocampus"])})
    ]),
    nodes: Object.freeze([
      Object.freeze({key:"hippocampus", label:bilingual("海馬体", "Hippocampal formation"), detail:bilingual("内側側頭葉で新しい出来事の記憶形成に関わり、主な出力が脳弓へ向かいます。", "Supports formation of new episodic memories in the medial temporal lobe; a major output travels in the fornix."), specimen:bilingual("冠状断の海馬ラベルを観察できます。", "An existing hippocampal label can be inspected in a coronal section."), limitation:bilingual("海馬台・歯状回などの内部区分はこの段階図で描き分けません。", "Internal subdivisions such as the subiculum and dentate gyrus are not separated in this stage diagram."), observationIndex:0}),
      Object.freeze({key:"fornix", label:bilingual("脳弓", "Fornix"), detail:bilingual("海馬体から乳頭体・中隔領域などへ向かう主要な白質路です。", "A major white-matter output pathway from the hippocampal formation toward the mammillary and septal regions."), specimen:bilingual("既存の模式3Dで位置だけを確認します。", "Only its approximate position can be inspected in the existing schematic 3D layer."), limitation:bilingual("体・脚・柱を実標本から連続分節した形ではありません。", "It is not a continuous specimen-derived segmentation of the body, crura and columns."), observationIndex:1}),
      Object.freeze({key:"mammillary", label:bilingual("乳頭体", "Mammillary bodies"), detail:bilingual("海馬体からの入力を受け、乳頭視床路を介して視床前部へ中継します。", "Receive hippocampal-system input and relay toward the anterior thalamus through the mammillothalamic tract."), specimen:bilingual("水平断の画像誘導ラベルID39・40を観察できます。", "Image-guided labels 39 and 40 can be inspected in a horizontal section."), limitation:bilingual("プロジェクト内採用済みですが、専門家レビューは未完了です。", "Adopted within the project; expert review remains incomplete."), observationIndex:2}),
      Object.freeze({key:"mammillothalamic", label:bilingual("乳頭視床路", "Mammillothalamic tract"), detail:bilingual("乳頭体から視床前部核へ向かう線維束です。", "A fiber bundle projecting from the mammillary bodies to the anterior thalamic nuclei."), specimen:bilingual("概念図でのみ示します。", "Shown only in the concept diagram."), limitation:bilingual("現行ラベル・3Dには収録していません。", "Not included in the current labels or 3D model."), observationIndex:null}),
      Object.freeze({key:"anterior-thalamus", label:bilingual("視床前部核", "Anterior thalamic nuclei"), detail:bilingual("乳頭体からの入力を受け、帯状回へ投射する中継核群です。", "A relay group receiving mammillary input and projecting toward cingulate cortex."), specimen:bilingual("視床全体の位置を代用の目安として観察できます。", "The whole-thalamus label can be inspected only as a positional reference."), limitation:bilingual("視床前部核そのものは未分節です。視床全体の着色を前部核と解釈しないでください。", "The anterior nuclei themselves are unsegmented; do not interpret the whole-thalamus highlight as an anterior-nucleus label."), observationIndex:3}),
      Object.freeze({key:"cingulate", label:bilingual("帯状回", "Cingulate gyrus"), detail:bilingual("視床前部から入力を受け、内側側頭葉へ向かう皮質ネットワークに関わります。", "Receives anterior thalamic input and participates in cortical connections toward the medial temporal lobe."), specimen:bilingual("アトラス対応の帯状回領域を3Dで観察できます。", "An atlas-mapped cingulate region can be inspected in 3D."), limitation:bilingual("皮質領域はBigBrain同一標本の組織学的手動分節ではありません。", "The cortical region is not a same-specimen histological manual segmentation."), observationIndex:4}),
      Object.freeze({key:"cingulum", label:bilingual("帯状束", "Cingulum"), detail:bilingual("帯状回周囲と海馬傍回・嗅内野を結ぶ長い連合線維系です。", "A long association-fiber system linking cingulate regions with parahippocampal and entorhinal regions."), specimen:bilingual("概念図でのみ示します。", "Shown only in the concept diagram."), limitation:bilingual("現行ラベル・3Dには収録していません。", "Not included in the current labels or 3D model."), observationIndex:null}),
      Object.freeze({key:"entorhinal", label:bilingual("海馬傍回・嗅内野", "Parahippocampal and entorhinal cortex"), detail:bilingual("皮質から海馬体への主要な入口を含み、回路を内側側頭葉へ戻します。", "Includes a major cortical gateway into the hippocampal formation, returning the simplified loop to the medial temporal lobe."), specimen:bilingual("アトラス対応領域を3Dで観察できます。", "Atlas-mapped regions can be inspected in 3D."), limitation:bilingual("嗅内野と海馬傍回の境界は本標本由来の確定分節ではありません。", "The entorhinal–parahippocampal boundary is not a validated specimen-derived segmentation."), observationIndex:5}),
    ]),
    displayLimit:bilingual("この図は古典的Papez回路を学ぶための簡略図です。実際の記憶ネットワークには追加の結合があり、矢印の太さは結合強度を示しません。", "This is a simplified teaching diagram of the classical Papez circuit. Memory networks contain additional connections, and arrow width does not encode connection strength."),
    sources:Object.freeze([
      Object.freeze({label:"UTHealth Neuroanatomy Online — Limbic system", url:"https://nba.uth.tmc.edu/neuroanatomy/L11/Lab11p06_index.html"}),
      Object.freeze({label:"NCBI Bookshelf — Limbic System", url:"https://www.ncbi.nlm.nih.gov/books/NBK538491/"}),
    ]),
  }),
  visual: Object.freeze({
    key:"visual",
    name:bilingual("視覚路", "Visual pathway"),
    goal:bilingual("左右の網膜由来線維が視交叉で部分交叉し、各視索から視床・視放線を経て反対側視野の情報を一次視覚野へ送る流れを説明できる。", "Explain how retinal fibers partially cross at the optic chiasm so that each optic tract carries the opposite visual field through the thalamus and optic radiation to primary visual cortex."),
    role:bilingual("網膜で生じた視覚信号を、視神経・視交叉・視索・外側膝状体・視放線を経て一次視覚野へ運びます。", "Carries retinal visual signals through the optic nerve, chiasm, tract, lateral geniculate nucleus and optic radiation to primary visual cortex."),
    paths:Object.freeze([
      Object.freeze({key:"main", label:bilingual("主な情報の流れ", "Main information flow"), kind:"relay", nodes:Object.freeze(["retina","optic-nerve","optic-chiasm","optic-tract","lgn","optic-radiation","v1"])})
    ]),
    nodes:Object.freeze([
      Object.freeze({key:"retina", label:bilingual("網膜", "Retina"), detail:bilingual("光を神経信号へ変換し、網膜神経節細胞の軸索が視神経を作ります。", "Converts light into neural signals; retinal ganglion-cell axons form the optic nerve."), specimen:bilingual("眼球・網膜は表示範囲外です。", "The globe and retina are outside the displayed specimen."), limitation:bilingual("概念図の開始点としてのみ示します。", "Shown only as the conceptual starting point."), observationIndex:null}),
      Object.freeze({key:"optic-nerve", label:bilingual("視神経", "Optic nerve"), detail:bilingual("片眼の網膜神経節細胞の軸索を視交叉へ運びます。", "Carries retinal ganglion-cell axons from one eye toward the optic chiasm."), specimen:bilingual("脳底面のII模式3Dで近位部を観察できます。", "A proximal schematic segment can be inspected in the basal-view cranial-nerve layer."), limitation:bilingual("眼窩内の全長や個々の線維は再現していません。", "The full intraorbital course and individual fibers are not represented."), observationIndex:0}),
      Object.freeze({key:"optic-chiasm", label:bilingual("視交叉", "Optic chiasm"), detail:bilingual("鼻側網膜の線維は交叉し、耳側網膜の線維は同側を進みます。", "Nasal retinal fibers cross, while temporal retinal fibers remain ipsilateral."), specimen:bilingual("模式3Dの視交叉を位置目安として観察できます。", "The schematic 3D chiasm can be inspected as a positional guide."), limitation:bilingual("現行形状は交叉線維と非交叉線維を描き分けず、画像由来分節も再作業中です。", "The current shape does not separate crossing from uncrossed fibers, and specimen-derived segmentation is being reworked."), observationIndex:1}),
      Object.freeze({key:"optic-tract", label:bilingual("視索", "Optic tract"), detail:bilingual("両眼からの反対側視野の情報をまとめ、主に外側膝状体へ送ります。", "Combines information from the opposite visual field of both eyes and projects mainly to the lateral geniculate nucleus."), specimen:bilingual("II模式3Dの後方部を位置目安として観察できます。", "The posterior part of the schematic cranial-nerve II layer can be inspected as a positional guide."), limitation:bilingual("左右視索の画像由来境界は確定していません。", "Specimen-derived boundaries of the left and right optic tracts are unresolved."), observationIndex:2}),
      Object.freeze({key:"lgn", label:bilingual("外側膝状体", "Lateral geniculate nucleus"), detail:bilingual("視床後部にある主要な視覚中継核で、網膜対応を保って視放線へ送ります。", "The major visual relay in the posterior thalamus, preserving retinotopic organization for transmission into the optic radiation."), specimen:bilingual("視床全体と外側膝状体付近を位置目安として観察します。", "The whole thalamus and approximate geniculate region serve only as positional references."), limitation:bilingual("外側膝状体を独立した実標本ラベルとして表示していません。", "The lateral geniculate nucleus is not displayed as an independent specimen label."), observationIndex:3}),
      Object.freeze({key:"optic-radiation", label:bilingual("視放線", "Optic radiation"), detail:bilingual("外側膝状体から後頭葉の一次視覚野へ広がる膝状体鳥距路です。", "The geniculocalcarine projection spreading from the lateral geniculate nucleus to primary visual cortex."), specimen:bilingual("プリセット選択中は、手作業配置の模式3Dで大まかな方向を観察できます。", "While this preset is active, a hand-positioned schematic 3D layer shows the approximate direction."), limitation:bilingual("Meyer loopを含む個体の線維走行・太さ・網膜対応を再現していません。", "Individual fiber trajectories, thickness, retinotopy and the Meyer loop are not reconstructed."), observationIndex:null}),
      Object.freeze({key:"v1", label:bilingual("一次視覚野（V1）", "Primary visual cortex (V1)"), detail:bilingual("鳥距溝の両岸で視覚情報を最初に皮質処理し、視野の空間配置を保ちます。", "Provides the first cortical stage of visual processing along the banks of the calcarine sulcus while preserving visual-field organization."), specimen:bilingual("鳥距溝周囲のアトラス対応皮質を3Dで観察できます。", "Atlas-mapped cortex around the calcarine sulcus can be inspected in 3D."), limitation:bilingual("V1の組織学的境界や網膜対応をこのモデルで確定しません。", "This model does not establish histological V1 boundaries or retinotopic maps."), observationIndex:5}),
    ]),
    displayLimit:bilingual("左右眼の線維を色分けした模式図です。矢印は主経路の向きを示し、側枝・層構造・正確な線維数や太さは表しません。", "The diagram schematically distinguishes the two eyes. Arrows indicate the main route; collaterals, laminae, exact fiber counts and thickness are omitted."),
    sources:Object.freeze([
      Object.freeze({label:"NCBI Bookshelf — Neuroanatomy, Visual Pathway", url:"https://www.ncbi.nlm.nih.gov/books/NBK553189/"}),
    ]),
  }),
  "basal-ganglia": Object.freeze({
    key:"basal-ganglia",
    name:bilingual("大脳基底核回路", "Basal ganglia circuits"),
    goal:bilingual("直接路・間接路・ハイパー直接路の分岐と、各結合の興奮性／抑制性をたどり、視床への出力が運動選択をどう調節するか説明できる。", "Trace the direct, indirect and hyperdirect branches with their excitatory or inhibitory connections, and explain how basal-ganglia output regulates thalamocortical activity during action selection."),
    role:bilingual("皮質からの入力を線条体・淡蒼球・視床下核・黒質で処理し、視床皮質活動を調節して、選んだ行動を通し競合する行動を抑えるネットワークです。", "Processes cortical input through the striatum, pallidum, subthalamic nucleus and substantia nigra to regulate thalamocortical activity, facilitating selected actions and suppressing competing actions."),
    paths:Object.freeze([
      Object.freeze({key:"direct", label:bilingual("直接路：選択した出力を通しやすくする", "Direct pathway: facilitates selected output"), kind:"mixed", nodes:Object.freeze(["cortex","striatum","gpi-snr","thalamus","cortex"]), signs:Object.freeze(["+","−","−","+"])}),
      Object.freeze({key:"indirect", label:bilingual("間接路：競合する出力を抑えやすくする", "Indirect pathway: suppresses competing output"), kind:"mixed", nodes:Object.freeze(["cortex","striatum","gpe","stn","gpi-snr","thalamus","cortex"]), signs:Object.freeze(["+","−","−","+","−","+"])}),
      Object.freeze({key:"hyperdirect", label:bilingual("ハイパー直接路：皮質から出力核へ速く制動をかける", "Hyperdirect pathway: rapid cortical braking through the output nuclei"), kind:"mixed", nodes:Object.freeze(["cortex","stn","gpi-snr","thalamus","cortex"]), signs:Object.freeze(["+","+","−","+"])})
    ]),
    nodes:Object.freeze([
      Object.freeze({key:"cortex", label:bilingual("大脳皮質", "Cerebral cortex"), detail:bilingual("線条体と視床下核へ興奮性入力を送り、視床から興奮性入力を受けます。", "Sends excitatory input to the striatum and subthalamic nucleus and receives excitatory thalamic input."), specimen:bilingual("皮質全体は回路専用ラベルとして着色しません。", "The cortex is not highlighted as a circuit-specific label."), limitation:bilingual("運動・前頭皮質の領域差はこの図では省略します。", "Differences among motor and frontal cortical territories are omitted."), observationIndex:null}),
      Object.freeze({key:"striatum", label:bilingual("線条体（尾状核・被殻）", "Striatum (caudate and putamen)"), detail:bilingual("皮質入力を受け、直接路ではGPi/SNr、間接路ではGPeへ抑制性出力を送ります。", "Receives cortical input and sends inhibitory output to GPi/SNr in the direct pathway and to GPe in the indirect pathway."), specimen:bilingual("尾状核と被殻の既存ラベルを3D・断面で同期観察できます。", "Existing caudate and putamen labels can be inspected in synchronized 3D and section views."), limitation:bilingual("線条体内部の細胞型・機能領域は描き分けません。", "Striatal cell types and functional territories are not separated."), observationIndex:0}),
      Object.freeze({key:"gpe", label:bilingual("淡蒼球外節（GPe）", "External globus pallidus (GPe)"), detail:bilingual("視床下核を持続的に抑制し、間接路で線条体から抑制される中継部です。", "Tonically inhibits the subthalamic nucleus and is itself inhibited by the striatum in the indirect pathway."), specimen:bilingual("淡蒼球外節の既存ラベルを観察できます。", "An existing GPe label can be inspected."), limitation:bilingual("微細な核内区分や線維は表示しません。", "Fine intranuclear subdivisions and fibers are not displayed."), observationIndex:1}),
      Object.freeze({key:"stn", label:bilingual("視床下核（STN）", "Subthalamic nucleus (STN)"), detail:bilingual("GPeからの抑制と皮質からの興奮を受け、GPi/SNrへ興奮性出力を送ります。", "Receives inhibition from GPe and excitation from cortex, and sends excitatory output to GPi/SNr."), specimen:bilingual("視床下核の既存ラベルを3D・断面で観察できます。", "An existing STN label can be inspected in 3D and section views."), limitation:bilingual("結合線そのものは標本由来表示ではありません。", "The connections themselves are not specimen-derived geometry."), observationIndex:2}),
      Object.freeze({key:"gpi-snr", label:bilingual("GPi／SNr（出力核）", "GPi/SNr (output nuclei)"), detail:bilingual("視床を持続的に抑制する主要出力核です。直接路はこの抑制を弱め、間接路・ハイパー直接路は強める方向に働きます。", "Major output nuclei that tonically inhibit the thalamus. The direct pathway reduces this inhibition, whereas indirect and hyperdirect routes tend to increase it."), specimen:bilingual("淡蒼球段階でGPiを観察できます。黒質は別の既存ラベルです。", "GPi can be inspected at the pallidal stage; the substantia nigra has a separate existing label."), limitation:bilingual("黒質はSNrとSNcを分けておらず、GPiとSNrを一つの実ラベルとして示すものでもありません。", "The substantia nigra label does not separate SNr from SNc, and GPi/SNr are not a single specimen label."), observationIndex:1}),
      Object.freeze({key:"thalamus", label:bilingual("視床", "Thalamus"), detail:bilingual("基底核出力核から抑制を受け、皮質へ興奮性入力を返します。出力核の抑制が弱まると対応する視床皮質活動が通りやすくなります。", "Receives inhibitory basal-ganglia output and returns excitation to cortex. Reduced output-nucleus inhibition permits greater activity in the corresponding thalamocortical channel."), specimen:bilingual("視床全体の既存ラベルを位置の目安として観察できます。", "The existing whole-thalamus label can be inspected as a positional reference."), limitation:bilingual("VA/VLなど運動関連核を独立分節していません。", "Motor-related nuclei such as VA/VL are not independently segmented."), observationIndex:4}),
    ]),
    displayLimit:bilingual("＋は興奮性、−は抑制性結合を示します。これは主要な古典回路の簡略図で、各核の並列チャネル、局所回路、ドパミン作用の細部を省略しています。", "+ indicates excitation and − inhibition. This simplified canonical diagram omits parallel channels, local circuits and details of dopaminergic modulation."),
    sources:Object.freeze([
      Object.freeze({label:"NCBI Bookshelf — Circuits within the Basal Ganglia System", url:"https://www.ncbi.nlm.nih.gov/books/NBK10847/"}),
      Object.freeze({label:"Lanciego et al. (2012) — Functional neuroanatomy of the basal ganglia", url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC3543080/"}),
    ]),
  }),
});

export const CIRCUIT_KEYS = Object.freeze(Object.keys(CIRCUIT_TEACHING));

export function circuitTeaching(key) {
  return CIRCUIT_TEACHING[key] ?? null;
}

export function circuitText(value, english = false) {
  return english ? value.en : value.ja;
}
