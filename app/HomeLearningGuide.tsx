import "./home-learning.css";

export type LearningEntry = "surface" | "sections" | "circuits" | "quiz";

const entries: {key:LearningEntry; ja:[string,string,string]; en:[string,string,string]}[] = [
  {key:"surface",ja:["脳表で目印をつかむ","脳を回して、主な脳回と溝の位置を確認します。部位を選ぶと、その役割を読めます。","脳表"],en:["Find landmarks on the surface","Rotate the brain to locate major gyri and sulci. Select a region to read about its role.","Brain surface"]},
  {key:"sections",ja:["断面と3Dを見比べる","脳室を目印に、深部構造の位置を比べます。断面を少しずつ動かし、形の変化を追いましょう。","断面"],en:["Compare sections with 3D","Use the ventricles as landmarks to compare deep structures. Move through adjacent sections and follow their changing shapes.","Sections"]},
  {key:"circuits",ja:["構造をつないで働きを学ぶ","まずPapez回路を順にたどります。慣れたら視覚路・大脳基底核回路へ切り替えて比べましょう。","神経回路"],en:["Connect structures with function","Start by following the Papez circuit. Then switch to the visual pathway or basal ganglia circuits to compare their organization.","Neural circuits"]},
];

const checks:Record<LearningEntry,{ja:string;en:string}>={
  surface:{ja:"中心溝と、その前後の脳回を指し示せますか？",en:"Can you point out the central sulcus and the gyri immediately in front of and behind it?"},
  sections:{ja:"脳室と視床の位置関係を、断面と3Dの両方で説明できますか？",en:"Can you explain the relationship between the ventricles and thalamus in both sections and 3D?"},
  circuits:{ja:"海馬から乳頭体まで、通る構造を順にたどれますか？",en:"Can you follow the structures connecting the hippocampus to the mammillary body in order?"},
  quiz:{ja:"確認した構造の位置と役割を、自分の言葉で言い直せますか？",en:"Can you describe the location and role of the structure you reviewed in your own words?"},
};

export function HomeLearningGuide({english,onOpen}:{english:boolean;onOpen:(entry:LearningEntry)=>void}){
  return <section className="homeLearningGuide" data-no-localize aria-labelledby="learning-start-title">
    <header><h2 id="learning-start-title">{english?"Choose a view":"教材を選ぶ"}</h2></header>
    <ol>{entries.map(entry=>{const [title,description,action]=entry[english?"en":"ja"];return <li key={entry.key}>
      <button type="button" onClick={()=>onOpen(entry.key)}>{entry.key==="quiz"?(english?"Open review":"復習を開く"):action}<span aria-hidden="true"> →</span></button><details><summary>{english?"What to look for":"観察のポイント"}</summary><h3>{title}</h3><p>{description}</p><p className="learningEntryCheck"><strong>{english?"Check yourself":"確認してみよう"}</strong>{checks[entry.key][english?"en":"ja"]}</p></details>
    </li>})}</ol>
  </section>;
}
