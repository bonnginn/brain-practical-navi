type HelpSection={title:string;rows:[string,string][]};

const ja:HelpSection[]=[
  {title:"3Dモデル",rows:[
    ["回転","モデルをドラッグします。モデルにフォーカスして矢印キーでも回転できます。"],
    ["軸回転","Shift＋ドラッグ、または右ドラッグで傾けます。"],
    ["拡大・縮小","ホイール／トラックパッド、または画面の−／＋を使います。"],
    ["向きを戻す","Rキー、または「向きを戻す」を押します。"],
  ]},
  {title:"断面実習",rows:[
    ["断面位置","位置スライダーにフォーカスして矢印キーで断面を移動。Home／Endで両端へ移動します。"],
    ["画像の拡大","ホイールまたは画面の−／＋。画像にフォーカスすれば−／＋キーも使えます。倍率表示、RまたはHomeで画像の位置と倍率を戻します。"],
    ["画像の移動","画像をドラッグ、または画像にフォーカスして矢印キーで移動します。"],
    ["構造の同定","画像を短くクリックすると構造を同定します。構造一覧は名称・かな・英語で検索して複数選択できます。検索の絞り込みで選択中の構造は消えません。"],
    ["観察テーマ","断面上部のガイドで観察順を読み、開始断面へ進めます。その後は断面と選択を自由に変えられます。"],
  ]},
  {title:"脳表・ブロック標本",rows:[
    ["着色","構造名を押して着色を切り替えます。「全選択」「すべて解除」がある画面ではまとめて変更できます。"],
    ["部位の解説","脳表で部位を選び、3Dの横に解説を開きます。対応する問題がある部位は、その部位の復習にも進めます。"],
    ["ブロック標本","まず無着色の形を観察し、答え合わせの着色で構造を確認します。ブロック標本は試作品です。"],
    ["自由観察","構造索引または検索から複数の対象を追加します。"],
  ]},
  {title:"回路・復習",rows:[
    ["回路を追う","自由観察で回路を選び、段階を押すか赤い模式信号を再生します。「標本で見る」でモデルへ、「回路解説へ戻る」でガイドへ移動します。"],
    ["回路の確認","回路の下の問いに自分で答えてから、解説を開きます。「このつながりを見直す」で対応する段階へ戻れます。"],
    ["復習","回答後は「観察画面で位置を確認」へ進めます。「回答・解説へ戻る」（完了後は「結果へ戻る」）で、回答と得点を保って復習に戻れます。"],
  ]},
];

const en:HelpSection[]=[
  {title:"3D models",rows:[
    ["Rotate","Drag the model, or focus it and use the arrow keys."],
    ["Tilt","Hold Shift while dragging, or drag with the right mouse button."],
    ["Zoom","Use the wheel / trackpad or the on-screen − / + buttons."],
    ["Reset orientation","Press R or choose Reset orientation."],
  ]},
  {title:"Serial sections",rows:[
    ["Slice position","Focus the position slider. Arrow keys move through sections; Home / End jump to either end."],
    ["Image zoom","Use the wheel or the − / + buttons. With the image focused, use − / + keys. Press the percentage, R or Home to reset image position and zoom."],
    ["Pan the image","Drag the image, or focus it and use the arrow keys."],
    ["Identify","Click briefly on the image to identify a structure. Search the list by Japanese, kana or English names and select multiple structures. Filtering does not remove your selections."],
    ["Observation themes","Open the guide above the section, read the observation steps, then open a starting slice. You can freely change the section and selected structures afterwards."],
  ]},
  {title:"Surface and block specimens",rows:[
    ["Colouring","Select structure names to change their colouring. Where offered, Select all and Deselect all change the group together."],
    ["Region explanations","Select a surface region and open its explanation beside the model. Where available, review questions for that region are linked below."],
    ["Block specimens","Observe the uncoloured shape first, then use the answer colouring to check structures. These blocks are prototypes."],
    ["Free observation","Add multiple structures from the structure index or search."],
  ]},
  {title:"Circuits and review",rows:[
    ["Follow a circuit","In Free observation, choose a circuit, then select its stages or play the schematic red signal. Inspect in specimen moves to the model; Back to explanation returns to the guide."],
    ["Circuit recall","Answer the prompts below a circuit before opening their explanations. Revisit this connection takes you back to the relevant stage."],
    ["Review","After answering, open the observation view to check the location. Use Back to answer and explanation (or Back to results) to return without losing your answer or score."],
  ]},
];

export function ViewerHelpContent({english}:{english:boolean}){
  return <div data-no-localize>
    <p className="helpIntro">{english?"Start with the learning guide on Home. For keyboard controls, first focus the image, model or slider you want to operate.":"初めての方はHomeの「はじめての学び方」から進められます。キー操作では、操作したい画像・モデル・スライダーに先にフォーカスしてください。"}</p>
    <div className="helpGrid">{(english?en:ja).map(section=><article key={section.title}><h3>{section.title}</h3><dl>{section.rows.map(([label,description])=><div key={label}><dt>{label}</dt><dd>{description}</dd></div>)}</dl></article>)}</div>
    <details className="helpEditorDetails"><summary>{english?"Segmentation editor shortcuts (contributors)":"分節編集ツールの操作（共同制作者向け）"}</summary><p>{english?"Paint by dragging in the editor. Pan with right / middle drag or Alt + drag. Undo with Ctrl / ⌘ + Z; add Shift to redo.":"編集Canvasを左ドラッグで塗ります。右・中・Altドラッグで移動。Ctrl／⌘＋Zで元に戻し、Shiftも押すとやり直します。"}</p></details>
  </div>;
}
