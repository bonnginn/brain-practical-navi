type Text={ja:string;en:string};
export type SectionObservationGuide={observe:Text;compare:Text;reference:{title:string;url:string}};
const medial={title:"UTHealth — Medial structures",url:"https://nba.uth.tmc.edu/neuroanatomy/L1/Lab01p22_index.html"};
const limbic={title:"UTHealth — Limbic system: sectional review",url:"https://nba.uth.tmc.edu/neuroanatomy/L11/Lab11p09_index.html"};
const ventricles={title:"UTHealth — The ventricles",url:"https://nba.uth.tmc.edu/neuroanatomy/L4/Lab04p01_index.html"};
const visual={title:"UTHealth — Visual processing: cortical pathways",url:"https://nba.uth.tmc.edu/neuroscience/s2/chapter15.html"};
const capsule={title:"UTHealth — Internal capsule",url:"https://nba.uth.tmc.edu/neuroanatomy/L10/Lab10p01_index.html"};
const caudate={title:"UTHealth — Head and body of the caudate nucleus",url:"https://nba.uth.tmc.edu/neuroanatomy/L10/Lab10p08_index.html"};
const basal={title:"UTHealth — Basal ganglia",url:"https://nba.uth.tmc.edu/neuroscience/s3/chapter04.html"};
const midbrain={title:"UTHealth — Diencephalon/midbrain junction",url:"https://nba.uth.tmc.edu/neuroanatomy/L6/Lab06p11_index.html"};
const insula={title:"UTHealth — External capsule and claustrum",url:"https://nba.uth.tmc.edu/neuroanatomy/L10/Lab10p14_index.html"};
const hindbrain={title:"UTHealth — Cerebellum and brainstem",url:"https://nba.uth.tmc.edu/neuroanatomy/l5/Lab05p22_index.html"};
export const sectionObservationGuides:Partial<Record<string,SectionObservationGuide>>={
  ventricle:{observe:{ja:"冠状断を前後へ動かし、前角・体部から後角・下角へ変わる腔の形を追います。下角では海馬も表示します。",en:"Move through coronal sections to follow the horns and body. Add the hippocampus when inspecting the temporal horn."},compare:{ja:"一枚の断面で離れた腔が見えても、側脳室の別の部分かもしれません。3Dと隣接断面でつながりを確かめます。",en:"Separated cavities in a slice may be different parts of the same ventricle; compare adjacent sections and 3D."},reference:ventricles},
  thirdVentricle:{observe:{ja:"冠状断で左右の視床の間にある細い正中の腔を探し、矢状断で前後の広がりを見ます。",en:"Find the narrow midline cavity between the thalami coronally, then inspect its anteroposterior extent sagittally."},compare:{ja:"上外側にある側脳室と区別します。第三脳室の両側壁は、上部が視床、下部が視床下部です。",en:"Distinguish it from the lateral ventricles above and lateral to it. Its walls border thalamus superiorly and hypothalamus inferiorly."},reference:ventricles},
  fourthVentricle:{observe:{ja:"正中近くの矢状断で、橋・延髄の背側と小脳の間にある腔を探します。",en:"Near the midsagittal plane, find the cavity between the dorsal pons/medulla and cerebellum."},compare:{ja:"上方の細い中脳水道から広がる形を見比べます。標本の欠損や脳の外の空間まで、脳室として追わないようにします。",en:"Compare its expansion below the narrow aqueduct; do not include specimen defects or space outside the brain."},reference:ventricles},
  corpusCallosum:{observe:{ja:"正中近くの矢状断で、前方の膝から幹、後方の膨大へ弧を描く白質を追います。",en:"Near the midsagittal plane, trace the white-matter arch from the anterior genu through the body to the posterior splenium."},compare:{ja:"その上の帯状回、下の脳弓と見比べます。脳梁も脳弓も白質ですが、位置とつながる方向が異なります。",en:"Compare the cingulate gyrus above and fornix below. The two white-matter bundles differ in position and course."},reference:medial},
  internalCapsule:{observe:{ja:"水平断で前脚・膝・後脚の折れ曲がりを探します。前脚は尾状核頭とレンズ核の間、後脚は視床とレンズ核の間です。",en:"In horizontal sections, identify the anterior limb between caudate head and lentiform nucleus, the genu, and the posterior limb between thalamus and lentiform nucleus."},compare:{ja:"被殻の外側にある外包と取り違えないように、白質の帯の両側に何があるかを確認します。",en:"Check the structures on both sides of each white-matter band to distinguish the internal from the external capsule."},reference:capsule},
  caudate:{observe:{ja:"側脳室前角に接する太い頭部から、体部へ続く弧を追います。冠状断で前後に動かし、矢状断でも弯曲を見ます。",en:"Follow the broad head beside the frontal horn into the arching body using coronal and sagittal sections."},compare:{ja:"内包を挟む被殻と見比べます。本教材のラベルは頭部・体部が中心で、尾部全長は示していません。",en:"Compare the putamen across the internal capsule. The teaching label mainly covers head and body, not the entire tail."},reference:caudate},
  putamen:{observe:{ja:"冠状断で、淡蒼球の外側にある大きな灰白質の塊を探します。内側から内包、淡蒼球、被殻の順を確かめます。",en:"Find the large grey-matter mass lateral to the pallidum; check the medial-to-lateral order: internal capsule, pallidum, putamen."},compare:{ja:"被殻と淡蒼球を合わせたものがレンズ核です。外側には外包・前障などを挟んで島皮質があります。",en:"Putamen plus pallidum form the lentiform nucleus. The external capsule and claustrum lie between putamen and insular cortex."},reference:insula},
  pallidum:{observe:{ja:"被殻の内側、内包の外側にある淡蒼球を探します。全体像を確認したら外節・内節の項目へ切り替えます。",en:"Find the pallidum between putamen and internal capsule, then select its external and internal segments separately."},compare:{ja:"外節と内節は位置だけでなく回路での役割も異なります。全体の着色だけで両者を同じ中継と考えないようにします。",en:"The segments differ in circuit role as well as position; the combined label does not imply a single relay."},reference:basal},
  pallidumExternal:{observe:{ja:"淡蒼球のうち被殻に近い外側の区画を探し、内節も表示して内外の並びを見ます。",en:"Find the pallidal segment nearer the putamen and display GPi to compare their lateral–medial arrangement."},compare:{ja:"外側から被殻→外節→内節の順です。左右いずれの半球でも、画面の端ではなく脳の正中を基準にします。",en:"From lateral to medial: putamen, GPe, GPi. Use the brain midline, not the edge of the screen, as the reference."},reference:basal},
  pallidumInternal:{observe:{ja:"淡蒼球のうち内包に近い内側の区画を探します。外節と内包を一緒に表示すると位置が分かります。",en:"Locate the pallidal segment next to the internal capsule, displaying GPe and the capsule for context."},compare:{ja:"内節のさらに内側に見える白質は内包です。内節の灰白質と、通過する白質束を分けて見ます。",en:"The white matter medial to GPi is the internal capsule; distinguish the grey-matter nucleus from the adjacent fibre bundle."},reference:capsule},
  thalamus:{observe:{ja:"第三脳室を挟む左右の大きな灰白質を探し、外側の内包と上方の側脳室体部を位置の基準にします。",en:"Find the paired grey-matter masses beside the third ventricle, using the internal capsule laterally and ventricular body above as landmarks."},compare:{ja:"表示は視床全体です。回路の『前部視床』などはその一部を指し、全体が同じ機能を担う意味ではありません。",en:"The label shows the whole thalamus. Circuit terms such as anterior thalamus refer to only part of it, with a distinct role."},reference:ventricles},
  hippocampus:{observe:{ja:"冠状断で側脳室下角の床に沿う折り畳まれた灰白質を探し、少しずつ後方へ追います。",en:"In coronal sections, find the folded grey matter along the temporal-horn floor and follow it posteriorly."},compare:{ja:"前上方の扁桃体と、海馬表面に沿う白質の海馬采を見比べます。海馬采は脳弓へ続く経路です。",en:"Compare the amygdala anterosuperiorly and the white-matter fimbria along the hippocampal surface, continuing into the fornix."},reference:limbic},
  amygdala:{observe:{ja:"側頭葉内側の前方で、海馬頭の前上方にある核群を探します。海馬も表示して冠状断を前後に動かします。",en:"In the anterior medial temporal lobe, find the nuclei anterosuperior to the hippocampal head; compare both across coronal sections."},compare:{ja:"扁桃体と海馬は近接しますが、異なる構造です。一枚の色の境目だけでなく、前後の形の変化を手がかりにします。",en:"Amygdala and hippocampus are distinct neighbours. Use their changing profiles across slices, not just a single colour boundary."},reference:limbic},
  accumbens:{observe:{ja:"前方の冠状断で、尾状核頭と被殻が腹側で近づく領域を探します。両者を一緒に表示すると位置が分かります。",en:"In anterior coronal sections, find the ventral region where caudate head and putamen approach; display both for context."},compare:{ja:"側坐核は腹側線条体の一部です。近くにある透明中隔の薄い膜や中隔核とは区別します。",en:"The accumbens belongs to ventral striatum; distinguish it from the septal membrane and neighbouring septal nuclei."},reference:basal},
  redNucleus:{observe:{ja:"中脳の水平断で左右一対の丸い核を探し、冠状断で視床の下方へ続く範囲を見ます。",en:"Find the paired rounded nuclei in horizontal midbrain sections, then inspect their extent below the thalamus coronally."},compare:{ja:"黒質より背内側、中脳水道より腹外側に位置します。丸い赤核と、腹側の帯状の黒質を見比べます。",en:"Compare the rounded red nucleus, dorsomedial to substantia nigra and ventrolateral to the aqueduct, with the ventral nigral band."},reference:midbrain},
  substantiaNigra:{observe:{ja:"中脳の水平断で、大脳脚の背側に沿う帯を探し、さらに背側の赤核と見比べます。",en:"In a horizontal midbrain section, find the band dorsal to the crus cerebri and compare the red nucleus farther dorsally."},compare:{ja:"『黒質』は核の名称です。画像で黒い場所をすべて黒質とせず、大脳脚と被蓋の位置関係で探します。",en:"Locate substantia nigra by its relationship to crus cerebri and tegmentum; darkness alone is not an identification criterion."},reference:basal},
  subthalamic:{observe:{ja:"視床の下方、黒質の上方にある小さな核を探します。内包を外側の目印にして、隣接する冠状断で確認します。",en:"Find the small nucleus below thalamus and above substantia nigra, using the internal capsule laterally and comparing adjacent coronal sections."},compare:{ja:"視床下核は視床下部とは別です。小さいため、一枚だけで判断せず前後の断面で位置を確かめます。",en:"The subthalamic nucleus is distinct from the hypothalamus. Its small size makes adjacent sections especially helpful."},reference:basal},
  brainstem:{observe:{ja:"矢状断で中脳・橋・延髄へ続く形を追い、橋の腹側の膨らみと背側の第四脳室を目印にします。",en:"Follow midbrain, pons and medulla sagittally, using the ventral pontine bulge and dorsal fourth ventricle as landmarks."},compare:{ja:"後方の小脳との位置関係を確かめます。脳幹全体の着色は、内部の核や線維を個別に分けた表示ではありません。",en:"Compare the cerebellum posteriorly. Whole-brainstem colouring does not separately identify its internal nuclei or tracts."},reference:hindbrain},
  cerebellum:{observe:{ja:"矢状断で細かな葉と内部の枝分かれした白質を見ます。正中付近の虫部から、左右の半球へ位置を変えます。",en:"Inspect the fine folia and branching internal white matter sagittally, moving from the midline vermis toward either hemisphere."},compare:{ja:"脳幹との間の第四脳室を目印にします。全体の着色を一度隠すと、葉の皮質と内部白質を見比べやすくなります。",en:"Use the fourth ventricle between cerebellum and brainstem as a landmark. Hide colouring to compare folial cortex with internal white matter."},reference:hindbrain},
  insula:{observe:{ja:"冠状断・水平断で外側溝の奥の皮質を探します。外表を覆う弁蓋と、深部の被殻を一緒に見ます。",en:"In coronal or horizontal sections, find cortex deep in the lateral fissure; compare the covering opercula and deeper putamen."},compare:{ja:"被殻から外へ、外包→前障→最外包→島皮質の順です。薄い層は独立ラベルがないため、原画像で位置関係を確かめます。",en:"Outward from putamen: external capsule, claustrum, extreme capsule, insula. These thin layers lack separate labels here; inspect the source image."},reference:insula},
  aqueductPartial:{observe:{ja:"矢状断で第三脳室から第四脳室へ向かう細い腔を追い、水平断で中脳の正中にある位置を確かめます。",en:"Follow the narrow cavity from the third toward the fourth ventricle sagittally, then check its midline position in a horizontal midbrain section."},compare:{ja:"水道は腔です。周囲の組織や標本外の空間と分けて見ましょう。",en:"The aqueduct is a lumen: distinguish it from surrounding tissue and space outside the specimen."},reference:ventricles},
  anteriorCommissurePartial:{observe:{ja:"冠状断で正中を横切り、左右へ延びる白質束を探します。淡蒼球の下方を通る位置と、脳弓柱との前後関係が手がかりです。",en:"Look for the transverse white-matter bundle below the pallidum. Its relationship to the fornix columns helps locate it."},compare:{ja:"左右をつなぐ前交連と、前後に弯曲する脳弓を、連続断面で見分けます。",en:"Use adjacent sections to distinguish the transverse commissure from the curving fornix."},reference:limbic},
  septumPellucidumPartial:{observe:{ja:"左右の側脳室前角の間にある薄い隔壁を探します。脳梁の下方で、脳弓との位置関係も確かめます。",en:"Find the thin partition between the frontal horns, beneath the corpus callosum, and compare its position with the fornix."},compare:{ja:"透明中隔の薄い膜と、近くの白質束である脳梁・脳弓を区別します。",en:"Distinguish the thin septum from the nearby callosal and forniceal white-matter bundles."},reference:medial},
  fornixBodyPartial:{observe:{ja:"海馬側の海馬采から脚、正中近くの体部、下方へ向かう柱を順に探します。一枚で全体を見ようとせず、冠状断と矢状断を行き来しましょう。",en:"Look successively for the hippocampal fimbria, crura, body and descending columns, alternating coronal and sagittal sections."},compare:{ja:"海馬・脳梁・前交連を目印にします。一本の断面に離れて見えても、別々の構造とは限りません。",en:"Use hippocampus, corpus callosum and anterior commissure as landmarks. Separate profiles in one slice need not be separate structures."},reference:limbic},
  mammillaryBody:{observe:{ja:"漏斗の後方、視床下部の下面にある左右一対の小さな隆起を探します。冠状断では少し前後へ動かして、現れて消える範囲を確かめます。",en:"Find the paired small prominences behind the infundibulum on the inferior hypothalamic surface; follow their short extent through coronal sections."},compare:{ja:"乳頭体は灰白質の中継部で、そこへ向かう脳弓とは区別します。",en:"Distinguish this grey-matter relay from the fornix approaching it."},reference:limbic},
  opticChiasmPartial:{observe:{ja:"正中近くの視交叉と、その後方へ続く左右の視索を一緒に表示し、中央部から左右へ分かれる形を見ます。",en:"Display the central chiasm together with the paired optic tracts and compare their continuity and branching shape."},compare:{ja:"着色は位置の目安です。線維の交叉は形だけから判別せず、視覚路ガイドで確かめます。",en:"Colour locates the structures; fibre crossing is explained in the visual-pathway guide and is not resolved by this shape."},reference:visual},
  opticTractsPartial:{observe:{ja:"視交叉から後方へ延びる左右の帯を、外側膝状体と並べて観察します。断面を動かし、途中の位置関係を追います。",en:"Compare the paired bands behind the chiasm with the lateral geniculate bodies across adjacent slices."},compare:{ja:"視索と、外側膝状体から後頭葉へ向かう視放線は区別します。",en:"Distinguish the optic tract from the optic radiation leaving the geniculate relay."},reference:visual},
  lateralGeniculateBodies:{observe:{ja:"視床の後下外側にある左右の小さな核を探し、視索との位置関係を見ます。",en:"Find the small paired nuclei posteroinferolateral to the thalamus and compare their position with the optic tracts."},compare:{ja:"外側膝状体は視覚路の中継核です。視床全体や視索そのものとは分けて見ます。",en:"Identify the geniculate relay separately from the whole thalamus and optic tract."},reference:visual},
};

// Existing labels only. Broad enclosing tissue is omitted for small nuclei.
export const sectionComparisonStructures:Partial<Record<string,string[]>>={
  ventricle:["hippocampus","caudate","thalamus"],
  thirdVentricle:["thalamus","ventricle","aqueductPartial"],
  fourthVentricle:["aqueductPartial"],
  aqueductPartial:["thirdVentricle","fourthVentricle","redNucleus"],
  corpusCallosum:["ventricle","fornixBodyPartial"],
  internalCapsule:["caudate","putamen","pallidum","thalamus"],
  caudate:["ventricle","internalCapsule","putamen"],
  putamen:["pallidum","internalCapsule","insula"],
  pallidum:["putamen","internalCapsule"],
  pallidumExternal:["putamen","pallidumInternal","internalCapsule"],
  pallidumInternal:["putamen","pallidumExternal","internalCapsule"],
  thalamus:["thirdVentricle","internalCapsule","ventricle"],
  hippocampus:["amygdala","ventricle","fornixBodyPartial"],
  amygdala:["hippocampus","ventricle"],
  accumbens:["caudate","putamen","anteriorCommissurePartial"],
  redNucleus:["substantiaNigra","aqueductPartial"],
  substantiaNigra:["redNucleus","subthalamic"],
  subthalamic:["thalamus","substantiaNigra","internalCapsule"],
  brainstem:["fourthVentricle","aqueductPartial"],
  cerebellum:["fourthVentricle"],
  insula:["putamen","internalCapsule"],
  anteriorCommissurePartial:["pallidum","fornixBodyPartial"],
  septumPellucidumPartial:["ventricle","corpusCallosum","fornixBodyPartial"],
  fornixBodyPartial:["hippocampus","mammillaryBody","anteriorCommissurePartial"],
  mammillaryBody:["fornixBodyPartial","opticChiasmPartial"],
  opticChiasmPartial:["opticTractsPartial"],
  opticTractsPartial:["opticChiasmPartial","lateralGeniculateBodies"],
  lateralGeniculateBodies:["opticTractsPartial","thalamus"],
};
