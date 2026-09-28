/** Translate complete UI templates; never infer anatomical names. */
export function englishDynamic(core, translations) {
  const counted=(n,noun)=>`${n} ${noun}${Number(n)===1?"":"s"}`;
  let m=core.match(/^(\d+)構造を同時表示中$/u);
  if(m)return `${counted(m[1],"structure")} displayed`;
  const accessibleSlice=core.match(/^(coronal|horizontal|sagittal)断面 ([\d.]+)。(タップ・クリックで構造を選択、)?ドラッグまたは矢印キーで移動、ホイールまたはプラス・マイナスで拡大縮小$/u);
  if(accessibleSlice)return `${accessibleSlice[1]} slice ${accessibleSlice[2]}. ${accessibleSlice[3]?"Tap or click to identify; ":""}Drag or use arrow keys to pan. Use the wheel or on-screen plus/minus buttons to zoom. Press Home or R to reset.`;
  const sliceInteraction=core.match(/^(coronal|horizontal|sagittal)断面 ([\d.]+)。クリックで構造を選択、ドラッグで移動、ホイールで拡大縮小$/u);
  if(sliceInteraction)return `${sliceInteraction[1]} slice ${sliceInteraction[2]}. Click to identify, drag to pan, and use the wheel to zoom.`;
  const planes={"冠状断":"coronal","水平断":"horizontal","矢状断":"sagittal"};
  m=core.match(/^切断位置の全脳3Dモデル・(基準方向|直交方向)。ドラッグまたは矢印キーで回転、Rキーで向きを戻す$/u);
  if(m)return `Whole-brain 3D model showing the section plane, ${m[1]==="基準方向"?"reference":"orthogonal"} view. Drag or use the arrow keys to rotate; press R to reset the orientation.`;
  m=core.match(/^(冠状断|水平断|矢状断)の(前後|上下|左右)位置$/u);
  if(m)return `${planes[m[1]]} slice position`;
  m=core.match(/^復習問題の(前後|上下|左右)位置$/u);
  if(m)return `Quiz slice position (${{"前後":"anteroposterior","上下":"superoinferior","左右":"left–right"}[m[1]]})`;
  m=core.match(/^(coronal|horizontal|sagittal)断面 ([\d.]+)。ホイールで拡大縮小、(?:Shift)?ドラッグで移動$/u);
  if(m)return `${m[1]} slice ${m[2]}. Use the wheel to zoom and ${core.includes("Shift")?"Shift-drag":"drag"} to pan.`;
  m=core.match(/^(MNI高密度皮質表面モデル|0.5 mm標本から構成した局所3D標本)(と収録済み標本の位置目安)?(と模式3D神経血管レイヤー)?。ホイールで拡大縮小(、画面ボタンでも操作可能)?(、タップ・クリックで構造を選択)?$/u);
  if(m){
    const model=m[1].startsWith("MNI")?"High-density MNI cortical surface model":"Local 3D specimen reconstructed from 0.5 mm tissue images";
    return model+(m[2]?" with a specimen location guide":"")+(m[3]?" and a schematic 3D neurovascular layer":"")+". Use the wheel to zoom."+(m[4]?" On-screen zoom controls are also available.":"")+(m[5]?" Tap or click to select a structure.":"");
  }
  if(core.startsWith("位置：")&&translations[core.slice(3)])return `Location: ${translations[core.slice(3)]}`;
  m=core.match(/^(標本分節|試作分節|模式補助)。(.+)$/u);
  if(m&&translations[m[2]])return `${{"標本分節":"Specimen segmentation","試作分節":"Provisional segmentation","模式補助":"Schematic aid"}[m[1]]}. ${translations[m[2]]}`;
  m=core.match(/^(.+)（(\d+)問）$/u);
  if(m&&translations[m[1]])return `${translations[m[1]]} (${counted(m[2],"question")})`;
  m=core.match(/^次回 (\d+)問候補$/u);
  if(m)return `Next: ${counted(m[1],"candidate question")}`;
  m=core.match(/^標準 (\d+)・試作 (\d+)$/u);
  if(m)return `Standard ${m[1]} · Provisional ${m[2]}`;
  m=core.match(/^(\d+)問を上限に(\d+)問（候補(\d+)）$/u);
  if(m)return `Up to ${counted(m[1],"question")}; ${m[2]} selected from ${counted(m[3],"candidate")}`;
  m=core.match(/^(\d+)問（実際(\d+)問）$/u);
  if(m)return `${counted(m[1],"question")} (${m[2]} available)`;
  m=core.match(/^(\d+)問$/u);
  if(m)return counted(m[1],"question");
  return null;
}
