import "./home-learning.css";

export type LearningEntry = "surface" | "sections" | "circuits" | "quiz";

const entries: {key:LearningEntry; ja:[string,string,string]; en:[string,string,string]}[] = [
  {key:"surface",ja:["脳表で目印をつかむ","脳を回して、主な脳回と溝の位置を確認します。部位を選ぶと、その役割を読めます。","脳表を観察する"],en:["Find landmarks on the surface","Rotate the brain to locate major gyri and sulci. Select a region to read about its role.","Explore the surface"]},
  {key:"sections",ja:["断面と3Dを見比べる","脳室を目印に、深部構造の位置を比べます。断面を少しずつ動かし、形の変化を追いましょう。","断面を観察する"],en:["Compare sections with 3D","Use the ventricles as landmarks to compare deep structures. Move through adjacent sections and follow their changing shapes.","Explore sections"]},
  {key:"circuits",ja:["構造をつないで働きを学ぶ","まずPapez回路を順にたどります。慣れたら視覚路・大脳基底核回路へ切り替えて比べましょう。","回路ガイドを開く"],en:["Connect structures with function","Start by following the Papez circuit. Then switch to the visual pathway or basal ganglia circuits to compare their organization.","Open circuit guides"]},
  {key:"quiz",ja:["説明できるか確かめる","名称だけでなく、機能・位置関係も復習します。回答後は解説と観察画面で確認できます。","復習クイズを開く"],en:["Check your understanding","Review names, functions and anatomical relationships. After answering, check the explanation and inspect the structure.","Open review quiz"]},
];

export function HomeLearningGuide({english,onOpen}:{english:boolean;onOpen:(entry:LearningEntry)=>void}){
  return <section className="homeLearningGuide" data-no-localize aria-labelledby="learning-start-title">
    <header><h2 id="learning-start-title">{english?"A path through the material":"はじめての学び方"}</h2><p>{english?"Follow these four steps, or start with the view you need. You can return Home at any time.":"4つの順序で進めても、必要な教材から始めてもかまいません。いつでもHomeに戻れます。"}</p></header>
    <ol>{entries.map((entry,index)=>{const [title,description,action]=entry[english?"en":"ja"];return <li key={entry.key}>
      <span className="learningEntryNumber" aria-hidden="true">0{index+1}</span><h3>{title}</h3><p>{description}</p><button type="button" onClick={()=>onOpen(entry.key)}>{action}<span aria-hidden="true"> →</span></button>
    </li>})}</ol>
  </section>;
}
