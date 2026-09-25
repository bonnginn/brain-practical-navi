type Props={context:"basal"|"limbic"|"sections";english:boolean};
const videos={
  basal:{provider:"UTHealth · Neuroscience Online",title:"Cranial Nerves and Vessels 2",url:"https://www.youtube.com/watch?v=lzm3K6nQNF0",time:"4:43",ja:"脳底で神経と血管が重なる様子を確認します。神経は冒頭から、血管は2:23頃から。神経の付着部を探し、3Dで見た位置と比べてください。",en:"Compare the overlapping nerves and vessels at the brain base with the 3D view. Follow nerve attachments from the start; vessels begin around 2:23."},
  limbic:{provider:"UBC · Functional Neuroanatomy",title:"Hypothalamus and Limbic System",url:"https://www.youtube.com/watch?v=ErpxEwlWww4&t=267s",time:"4:27 → / 10:13",ja:"側脳室を開いた実物標本で海馬を探します。どの組織を除くと下角の床が見えるのか、周囲の残った組織にも注目してください。",en:"Starting at 4:27, find the hippocampus in an opened lateral ventricle. Notice what has been removed to expose the temporal-horn floor and which surrounding tissues remain."},
  sections:{provider:"UBC · Functional Neuroanatomy",title:"Introduction to Central Nervous System",url:"https://www.youtube.com/watch?v=xB7rXw_3gVY&t=436s",time:"7:16 → / 14:47",ja:"切断方向の説明から実際の冠状断へ進みます。切る前の脳の向きと、現れた切断面を結びつけて見てください。",en:"Starting at 7:16, connect the explanation of section planes with an actual coronal cut. Relate the intact brain's orientation to the exposed section."},
};
export function ExternalSpecimenVideo({context,english}:Props){
  const video=videos[context];
  return <details className="externalSpecimenVideo" data-no-localize>
    <summary>{english?"Compare with a real specimen · external video":"実物標本と見比べる・外部動画"}</summary>
    <p>{english?video.en:video.ja}</p>
    <a href={video.url} target="_blank" rel="noopener noreferrer">{video.title} ↗</a>
    <small>{video.provider} · {video.time}</small>
    <small>{english?"Human brain specimen; English narration. Opens the publisher's video in a new tab.":"人体の脳標本・英語音声。公開元の動画を別タブで開きます。"}</small>
  </details>;
}
