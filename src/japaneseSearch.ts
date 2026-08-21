const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const KATAKANA_TO_HIRAGANA_OFFSET = 0x60;

export function normalizeJapaneseSearch(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[ァ-ヶ]/g, character => String.fromCharCode(
      character.charCodeAt(0) >= KATAKANA_START && character.charCodeAt(0) <= KATAKANA_END
        ? character.charCodeAt(0) - KATAKANA_TO_HIRAGANA_OFFSET
        : character.charCodeAt(0),
    ))
    .replace(/[\s・･·／/()（）,.，_-]+/g, "");
}

export const freeObservationReadings: Record<string, string[]> = {
  "region:precentral": ["ちゅうしんぜんかい"],
  "region:postcentral": ["ちゅうしんこうかい"],
  "region:superiorFrontal": ["じょうぜんとうかい"],
  "region:rostralMiddleFrontal": ["ちゅうぜんとうかいぜんぶ"],
  "region:caudalMiddleFrontal": ["ちゅうぜんとうかいこうぶ"],
  "region:inferiorFrontal": ["かぜんとうかい", "べんがいぶ", "さんかくぶ"],
  "region:parsOrbitalis": ["かぜんとうかいがんかぶ"],
  "region:superiorTemporal": ["じょうそくとうかい"],
  "region:middleTemporal": ["ちゅうそくとうかい"],
  "region:inferiorTemporal": ["かそくとうかい"],
  "region:transverseTemporal": ["おうそくとうかい"],
  "region:supramarginal": ["えんじょうかい"],
  "region:superiorParietal": ["じょうとうちょうしょうよう"],
  "region:inferiorParietal": ["かとうちょうしょうよう"],
  "region:paracentral": ["ちゅうしんぼうしょうよう"],
  "region:precuneus": ["けつぜんぶ"],
  "region:cuneus": ["けつぶ"],
  "region:pericalcarine": ["ちょうきょこうしゅういひしつ", "しかくや"],
  "region:lingual": ["ぜつじょうかい"],
  "region:fusiform": ["ぼうすいじょうかい"],
  "region:parahippocampal": ["かいばぼうかい"],
  "region:entorhinal": ["きゅうないや"],
  "region:insula": ["とうひしつ", "とうよう"],
  "region:orbitofrontal": ["がんかぜんとうひしつ"],
  "region:lateralOccipital": ["がいそくこうとうひしつ"],
  "region:cingulate": ["たいじょうかい"],
  "landmark:central-sulcus": ["ちゅうしんこう"],
  "landmark:precentral-sulcus": ["ちゅうしんぜんこう"],
  "landmark:lateral-sulcus": ["がいそくこう", "しるびうすこう"],
  "landmark:superior-frontal-sulcus": ["じょうぜんとうこう"],
  "landmark:parieto-occipital-sulcus": ["とうちょうこうとうこう"],
  "landmark:calcarine-sulcus": ["ちょうきょこう"],
  "landmark:olfactory-sulcus": ["きゅうこう"],
  "landmark:longitudinal-fissure": ["だいのうじゅうれつ"],
  "deep:corpus-callosum": ["のうりょう"],
  "deep:septum-pellucidum": ["とうめいちゅうかく"],
  "deep:fornix": ["のうきゅう"],
  "deep:thalami": ["ししょう"],
  "deep:hypothalamus": ["ししょうかぶ"],
  "basal:all": ["すべて"],
  "basal:hypothalamus": ["ししょうかぶ"],
  "basal:infundibulum": ["ろうと", "かすいたいけい"],
  "basal:mammillary": ["にゅうとうたい"],
  "basal:perforated": ["ぜんゆうこうしつ"],
  "basal:peduncles": ["だいのうきゃく"],
  "basal:midbrain": ["ちゅうのう"],
  "basal:superior-colliculi": ["じょうきゅう"],
  "basal:inferior-colliculi": ["かきゅう"],
  "basal:pons": ["きょう"],
  "basal:medulla": ["えんずい"],
  "basal:pyramids": ["すいたい"],
  "basal:olives": ["おりーぶ"],
  "neuro:ica": ["ないけいどうみゃく"],
  "neuro:aca": ["ぜんだいのうどうみゃく"],
  "neuro:acomm": ["ぜんこうつうどうみゃく"],
  "neuro:mca": ["ちゅうだいのうどうみゃく"],
  "neuro:pcomm": ["こうこうつうどうみゃく"],
  "neuro:vertebral": ["ついこつどうみゃく"],
  "neuro:basilar": ["のうていどうみゃく"],
  "neuro:pca": ["こうだいのうどうみゃく"],
  "neuro:cerebellarArteries": ["しょうのうどうみゃくぐん"],
  "neuro:cn1": ["きゅうきゅう", "きゅうさく", "きゅうしんけい"],
  "neuro:cn2": ["ししんけい", "しさく"],
  "neuro:opticChiasm": ["しこうさ"],
  "neuro:cn3": ["どうがんしんけい"],
  "neuro:cn4": ["かっしゃしんけい"],
  "neuro:cn5": ["さんさしんけい"],
  "neuro:cn6": ["がいてんしんけい"],
  "neuro:cn7": ["がんめんしんけい"],
  "neuro:cn8": ["ないじしんけい", "ぜんていかぎゅうしんけい"],
  "neuro:cn9": ["ぜついんしんけい"],
  "neuro:cn10": ["めいそうしんけい"],
  "neuro:cn11": ["ふくしんけい"],
  "neuro:cn12": ["ぜっかしんけい"],
};

export function matchesJapaneseSearch(query: string, values: Array<string | undefined>) {
  const normalizedQuery = normalizeJapaneseSearch(query);
  if (!normalizedQuery) return true;
  return values.some(value => normalizeJapaneseSearch(value ?? "").includes(normalizedQuery));
}
