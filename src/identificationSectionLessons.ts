import type {SegmentationPlane} from '../app/segmentationGeometry';

// Self-review of existing specimen labels, independent of scored quiz eligibility.
// Japanese functions and positional hints remain in the existing teaching registries.
export const additionalIdentificationSections=[
  {key:'fornixBodyPartial',plane:'coronal',roleEn:'The fornix is a major memory-related white-matter pathway linking the hippocampal formation with the mammillary and septal regions.',scope:{ja:'着色は脳弓・海馬采の収録部分です。全長や個々の線維を示しません。',en:'Colour shows the recorded parts of the fornix and fimbria, not their full extent or individual fibres.'}},
  {key:'anteriorCommissurePartial',plane:'coronal',roleEn:'The anterior commissure links the cerebral hemispheres. Compare its transverse course with the curving fornix columns.',scope:{ja:'前交連の主な走行の一部を示します。側頭葉側の終末は含みません。',en:'Part of the main anterior-commissure course is shown; temporal terminations are not included.'}},
  {key:'septumPellucidumPartial',plane:'coronal',roleEn:'A thin partition between the frontal horns of the lateral ventricles, useful for relating the corpus callosum to the fornix.',scope:{ja:'薄い隔壁の収録部分です。上下の付着部や細い箇所は未収録です。',en:'Only recorded portions of the thin partition are coloured; attachments and fine portions remain unrecorded.'}},
  {key:'thirdVentricle',plane:'coronal',roleEn:'A midline CSF cavity bordered by the thalami superiorly and hypothalamic regions inferiorly.'},
  {key:'fourthVentricle',plane:'sagittal',roleEn:'A hindbrain CSF cavity between the pons/medulla and cerebellum, along the route from the aqueduct toward the subarachnoid space.'},
  {key:'aqueductPartial',plane:'sagittal',roleEn:'The cerebral aqueduct is a narrow midbrain CSF passage connecting the third and fourth ventricles.',scope:{ja:'着色は中脳水道の収録部分です。腔と周囲組織を区別し、全長・境界の確定とは扱いません。',en:'Colour shows the recorded aqueduct portion. Distinguish lumen from tissue; its full extent and boundaries are not established.'}},
  {key:'opticChiasmPartial',plane:'horizontal',roleEn:'Partial crossing of optic-nerve fibres distributes visual-field information to the two hemispheres. The shape does not resolve the crossing fibres.',scope:{ja:'視交叉中央部の部分表示です。線維の交叉自体を着色したものではありません。',en:'The central chiasm is shown in part; crossing fibres themselves are not resolved by colour.'}},
  {key:'opticTractsPartial',plane:'horizontal',roleEn:'The optic tracts convey visual information from the chiasm toward the lateral geniculate bodies and other targets.',scope:{ja:'視索の部分表示です。視放線や個々の線維走行を含みません。',en:'These are partial optic-tract labels, not optic radiations or individual fibre trajectories.'}},
  {key:'lateralGeniculateBodies',plane:'coronal',roleEn:'The visual relay receiving retinal input through the optic tract and projecting through the optic radiation toward visual cortex.'},
  {key:'pallidumExternal',plane:'coronal',roleEn:'GPe is an internal relay in basal-ganglia circuits, including its inhibitory connection toward the subthalamic nucleus.'},
  {key:'pallidumInternal',plane:'coronal',roleEn:'GPi is a principal basal-ganglia output nucleus, providing inhibitory output toward thalamic targets.'},
] as const satisfies readonly {key:string;plane:SegmentationPlane;roleEn:string;scope?:{ja:string;en:string}}[];

// These exercises colour one answer. Give positional clues rather than asking
// learners to display neighbours, which is an observation-workspace operation.
export const identificationLocationHints:Partial<Record<typeof additionalIdentificationSections[number]['key'],{ja:string;en:string}>>={
  fornixBodyPartial:{ja:'海馬に沿う海馬采から、正中近くの脳弓体部と下行する柱を探します。脳梁の下にある白質を、冠状断と矢状断で見比べましょう。',en:'Look for the fimbria along the hippocampus, the fornix body beneath the corpus callosum near the midline, and the descending columns. Compare coronal and sagittal views.'},
  opticTractsPartial:{ja:'視交叉から後外側へ延びる左右の帯を探します。隣接断面で追い、外側膝状体へ近づく位置関係を確かめましょう。',en:'Find the paired bands running posterolaterally from the chiasm. Follow neighbouring slices toward the lateral geniculate bodies.'},
  opticChiasmPartial:{ja:'正中付近で、その後方に左右の視索が続く視交叉の中央部を探します。近くの水平断を見比べ、中央部から左右へ続く形を手がかりにしましょう。',en:'Find the central chiasm near the midline, with the paired optic tracts continuing behind it. Compare nearby horizontal slices and use the shape extending toward either side as a clue.'},
  pallidumExternal:{ja:'淡蒼球のうち、被殻に近い外側の区画を探します。画面の端ではなく、被殻・内包との並びを手がかりにしましょう。',en:'Find the pallidal segment nearer the putamen. Use the arrangement of the putamen and internal capsule, rather than the edge of the screen, as your reference.'},
  pallidumInternal:{ja:'淡蒼球のうち、内包に近い内側の区画を探します。灰白質の内節と、その内側を通る白い内包を見分けましょう。',en:'Find the pallidal segment nearer the internal capsule. Distinguish its grey matter from the white-matter capsule on its medial side.'},
};
