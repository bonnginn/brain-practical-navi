const sources = [
  {name:"Amunts et al. (2013) — BigBrain",url:"https://bigbrainproject.org/",ja:"原組織画像。脳室などの境界を連続断・直交断で照合。表示用画像は再標本化した派生物です。",en:"Source histology for contiguous and orthogonal boundary review, including the ventricles. Display images are resampled derivatives."},
  {name:"Xiao et al. (2019) — BigBrain registration",url:"https://doi.org/10.1038/s41597-019-0217-0",ja:"手動皮質下核ラベルと位置合わせ。赤核・淡蒼球などの区画と、登録300 µm画像による照合に使用。",en:"Manual subcortical labels and registration, including red nucleus and pallidal subdivisions; registered 300 µm images used for review."},
  {name:"Manera et al. (2020) — CerebrA",url:"https://doi.org/10.1038/s41597-020-0557-9",ja:"アトラス対応と初期ラベルの由来。同一標本の手動分節とは区別しています。",en:"Atlas mappings and initial labels; distinct from manual segmentation of the same specimen."},
  {name:"Paquola et al. (2021) — BigBrainWarp",url:"https://doi.org/10.7554/eLife.70119",ja:"脳表モデルの元となる配布表面データ。アプリ独自の形状加工や溝ガイドは原論文の確定境界ではありません。",en:"Distributed surface data underlying the surface model. App-specific shape modifications and sulcal guides are not validated boundaries from this paper."},
];
const readings = [
  {name:"Longatti et al. (2007) — Endoscopic anatomy of the cerebral aqueduct",url:"https://pubmed.ncbi.nlm.nih.gov/17876227/",ja:"抄録を参照。中脳水道の内形と後交連などの位置関係の背景資料です。内視鏡所見を本標本の境界へ転写していません。",en:"Abstract consulted for aqueduct morphology and landmarks including the posterior commissure. Endoscopic findings were not transferred to this specimen's boundaries."},
  {name:"Rubino & Hogg — Cerebral Aqueduct (StatPearls, updated 2023)",url:"https://www.ncbi.nlm.nih.gov/books/NBK540988/",ja:"解剖解説を参照。第三・第四脳室との移行を区別する補助資料で、原画像や採用マスクの出典ではありません。",en:"Anatomical background for distinguishing transitions to the third and fourth ventricles; not a source image or adopted mask."},
  {name:"Campos da Silva et al. (2024) — Stereotactic anatomy of the third ventricle",url:"https://doi.org/10.1007/s00276-024-03312-1",ja:"第三脳室底と漏斗陥凹の位置関係を照合。標本で失われた壁を推測で再建したり、文献からボクセル境界を転写したりする根拠にはしていません。",en:"Context for the third-ventricle floor and infundibular recess. Not a basis for reconstructing missing specimen walls or transferring voxel boundaries."},
  {name:"Nagata, Rhoton & Barry (1988) — Microsurgical anatomy of the choroidal fissure",url:"https://pubmed.ncbi.nlm.nih.gov/3394010/",ja:"抄録を参照。側脳室下角・海馬采・脳槽の位置関係の照合。文献からボクセル境界を転写していません。",en:"Abstract consulted for relationships between the temporal horn, fimbria and cisterns. Voxel boundaries were not transferred from this paper."},
  {name:"Oculomotor fascicular anatomy — PubMed 23242853",url:"https://pubmed.ncbi.nlm.nih.gov/23242853/",ja:"赤核の外形と内部線維を区別する参考。局所の白い帯の線維名を確定する根拠ではありません。",en:"Context for distinguishing the red-nucleus outline from internal fibres; not identification of a specific pale band."},
  {name:"Sitek et al. (2019) — Subcortical auditory system",url:"https://doi.org/10.7554/eLife.48932",ja:"聴覚路核アトラスの比較調査。教材との空間対応が未解決で、分節へ未採用です。",en:"Comparison with an auditory-nucleus atlas. Spatial correspondence remains unresolved; not adopted into the teaching segmentation."},
  {name:"Jones et al. (2020) — BigBrain Workshop",url:"https://bigbrainproject.org/docs/4th-bb-workshop/20-06-26-BigBrainWorkshop-Jones.pdf",ja:"脳弓周辺の調査資料。脳弓の完成分節を取得・採用したものではありません。",en:"Background investigation around the fornix; not an acquired or adopted complete fornix segmentation."},
];

export function SegmentationReferences({english}:{english:boolean}) {
  return <section className="legalReferences" data-segmentation-references="true">
    <p data-aqueduct-representation="partial-versus-schematic">{english?"The partial cerebral aqueduct in Sections is an image-guided BigBrain label (ID41), not the schematic aqueduct in the block specimen. Only part of the lumen is represented; its full extent and transition boundaries remain unconfirmed.":"断面画面の中脳水道候補（部分）はBigBrain画像誘導ラベルID41で、ブロック標本の模式中脳水道とは別です。腔の一部分だけを示し、全長と移行境界は未確定です。"}</p>
    <h3>{english?"References and use in this app":"参考文献と本アプリでの用途"}</h3>
    <p>{english?"Primary sources and selected review references. Citation does not imply author endorsement or completed expert review. Resolution and review coverage differ between repairs.":"主要な出典と照合資料です。引用元による承認や専門家レビュー完了を意味しません。使用解像度・確認範囲は修正ごとに異なります。"}</p>
    <h4>{english?"Source images, labels and surfaces":"原画像・ラベル・表面データ"}</h4>
    {sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a><br/>{english?s.en:s.ja}</p>)}
    <h4>{english?"Context and investigation — not adopted boundary data":"照合・調査資料 — 採用境界データではありません"}</h4>
    {readings.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a><br/>{english?s.en:s.ja}</p>)}
  </section>;
}
