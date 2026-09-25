// Observation prompts reuse the regions, relationships and lessons already in the app.
export const surfaceObservationGuides = {
  lateral: {
    regions: ['precentral', 'postcentral'], landmarks: ['central-sulcus'],
    ja: {title:'中心溝の前と後', landmark:'中心溝を目印にして、その前と後の脳回を探します。', compare:'中心前回と中心後回を見比べ、各部位の解説で運動と体性感覚への関わりを確認します。', check:'色と溝のガイドを消しても、中心前回と中心後回を指し示せますか？'},
    en: {title:'In front of and behind the central sulcus', landmark:'Use the central sulcus as a landmark and find the gyrus on either side.', compare:'Compare the precentral and postcentral gyri, then open their lessons to review their roles in movement and somatic sensation.', check:'With the colours and sulcus guide hidden, can you point out the precentral and postcentral gyri?'},
  },
  superior: {
    regions: ['precentral', 'postcentral'], landmarks: ['longitudinal-fissure','central-sulcus'],
    ja: {title:'上から中心溝を探す', landmark:'大脳縦裂で左右を確かめ、中心溝の位置を左右で見比べます。', compare:'中心前回と中心後回を着色し、外側面で見た脳回が上面へ続く様子を回転して観察します。', check:'前後の方位を確かめて、中心溝の前と後の脳回を区別できますか？'},
    en: {title:'Find the central sulcus from above', landmark:'Use the longitudinal fissure to identify the two hemispheres, then compare the central sulcus on each side.', compare:'Colour the precentral and postcentral gyri. Rotate the brain to follow these gyri from the lateral surface toward the top.', check:'After checking the anterior and posterior directions, can you distinguish the gyri in front of and behind the central sulcus?'},
  },
  medial: {
    regions: ['cuneus','lingual'], landmarks: ['calcarine-sulcus'],
    ja: {title:'鳥距溝の上下を見比べる', landmark:'左半球の内側面で、後方にある鳥距溝を探します。', compare:'楔部と舌状回を着色し、鳥距溝をはさんだ上下の位置関係を比べます。', check:'色と溝のガイドを消して、楔部・鳥距溝・舌状回を上から順に示せますか？'},
    en: {title:'Compare the banks of the calcarine sulcus', landmark:'Find the calcarine sulcus posteriorly on the medial surface of the left hemisphere.', compare:'Colour the cuneus and lingual gyrus and compare their positions above and below the calcarine sulcus.', check:'With the colours and sulcus guide hidden, can you identify the cuneus, calcarine sulcus and lingual gyrus from top to bottom?'},
  },
} as const;
export type SurfaceStudyView = keyof typeof surfaceObservationGuides;
export type SurfaceStudyMode = 'landmarks' | 'compare' | 'uncolored';
