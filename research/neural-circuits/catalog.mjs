/** Learning targets, not a new parcellation or an atlas-label crosswalk. */
export const sources = [
  { id: 'julich-3.1', url: 'https://ebrains.eu/news-and-events/2024/new-release-of-the-julich-brain-atlas-adds-52-new-maps', checked: '2026-09-08', purpose: 'Candidate subnuclear probability maps; exact dataset version, labels, space and licence pending.' },
  { id: 'metathalamus-2022', url: 'https://doi.org/10.3389/fnana.2022.837485', checked: '2026-09-08', purpose: 'Candidate BigBrain geniculate geometry; dataset identity and registration must be verified separately.' },
  { id: 'freesurfer-icbm', url: 'https://surfer.nmr.mgh.harvard.edu/fswiki/SubfieldAtlasesICBMspace', checked: '2026-09-08', purpose: 'Alternative probability atlas, approximately ICBM152 2009c symmetric; not the target voxel grid.' },
];

// Hierarchy is for curriculum navigation. It is not an assertion that the
// existing whole-thalamus mask contains every target (notably geniculate/TRN).
const definitions = [
  ['anterior', '前核群', 'Anterior nuclear group', null],
  ['ad', '前背側核', 'Anterodorsal nucleus', 'anterior'],
  ['av', '前腹側核', 'Anteroventral nucleus', 'anterior'],
  ['am', '前内側核', 'Anteromedial nucleus', 'anterior'],
  ['md', '背内側核', 'Mediodorsal nucleus', null],
  ['va', '腹側前核', 'Ventral anterior nucleus', null],
  ['vl', '腹側外側核', 'Ventral lateral nucleus', null],
  ['vpl', '腹側後外側核', 'Ventral posterolateral nucleus', null],
  ['vpm', '腹側後内側核', 'Ventral posteromedial nucleus', null],
  ['ld', '外側背側核', 'Lateral dorsal nucleus', null],
  ['lp', '外側後核', 'Lateral posterior nucleus', null],
  ['pulvinar', '視床枕', 'Pulvinar', null],
  ['pulvinar-anterior', '視床枕前部', 'Anterior pulvinar', 'pulvinar'],
  ['pulvinar-medial', '視床枕内側部', 'Medial pulvinar', 'pulvinar'],
  ['pulvinar-lateral', '視床枕外側部', 'Lateral pulvinar', 'pulvinar'],
  ['pulvinar-inferior', '視床枕下部', 'Inferior pulvinar', 'pulvinar'],
  ['intralaminar', '髄板内核群', 'Intralaminar nuclear group', null],
  ['cm', '正中中心核', 'Centromedian nucleus', 'intralaminar'],
  ['pf', '束傍核', 'Parafascicular nucleus', 'intralaminar'],
  ['midline', '正中核群', 'Midline nuclear group', null],
  ['trn', '視床網様核', 'Thalamic reticular nucleus', null],
  ['lgn', '外側膝状体', 'Lateral geniculate body', null],
  ['mgn', '内側膝状体', 'Medial geniculate body', null],
  ['mgn-ventral', '内側膝状体腹側部', 'Ventral medial geniculate subdivision', 'mgn'],
  ['mgn-dorsal', '内側膝状体背側部', 'Dorsal medial geniculate subdivision', 'mgn'],
  ['mgn-medial', '内側膝状体内側部', 'Medial medial geniculate subdivision', 'mgn'],
];
export const targets = definitions.map(([id, ja, en, parent]) => ({
  id: `thalamus:${id}`, name: { ja, en }, parent: parent ? `thalamus:${parent}` : null,
  nomenclatureStatus: 'curriculum-draft', atlasMappings: [],
  candidateSourceIds: [id.startsWith('mgn') || id === 'lgn' ? 'metathalamus-2022' : 'julich-3.1'],
  // Midline group laterality must be resolved nucleus-by-nucleus, not mirrored.
  localizationSlots: (id === 'midline' ? ['midline'] : ['left', 'right']).map(hemisphere => ({
    id: `thalamus:${id}:${hemisphere}`, targetId: `thalamus:${id}`,
    hemisphere, status: 'unlocalized', anchor: null, evidence: null,
    mask: null, mesh: null, expertReview: null,
  })),
}));

/** Proposed study sequence only; no connectivity or tract geometry is asserted. */
export const studyPlans = [
  { id: 'vision', name: '視覚路', targets: ['lgn', 'pulvinar'] },
  { id: 'audition', name: '聴覚路', targets: ['mgn', 'mgn-ventral', 'mgn-dorsal', 'mgn-medial'] },
  { id: 'somatosensation', name: '体性感覚路', targets: ['vpl', 'vpm'] },
  { id: 'motor', name: '基底核・小脳と運動回路', targets: ['va', 'vl', 'cm', 'pf'] },
  { id: 'memory', name: '記憶・辺縁系回路', targets: ['anterior', 'md'] },
  { id: 'attention', name: '注意・覚醒・視床皮質回路', targets: ['pulvinar', 'intralaminar', 'midline', 'trn'] },
].map(plan => ({ ...plan, status: 'curriculum-draft', targets: plan.targets.map(id => `thalamus:${id}`), edges: [] }));

export function validateCatalog() {
  const ids = new Set(targets.map(target => target.id));
  if (ids.size !== targets.length) throw new Error('Duplicate target ID');
  for (const target of targets) {
    if (target.parent && !ids.has(target.parent)) throw new Error('Unknown parent');
    if (target.candidateSourceIds.some(id => !sources.some(source => source.id === id))) throw new Error('Unknown source');
  }
  for (const plan of studyPlans) if (plan.targets.some(id => !ids.has(id))) throw new Error('Unknown curriculum target');
  return { targets: targets.length, localizationSlots: targets.flatMap(t => t.localizationSlots).length,
    localized: targets.flatMap(t => t.localizationSlots).filter(s => s.anchor).length, studyPlans: studyPlans.length };
}
