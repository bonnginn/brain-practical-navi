// Adapted from the already received Mac Review12 per-reader scroll/openDetails semantics.
// These are UI positions only. No authored explanation or answer is stored.
export function captureSectionReader(root, theme){
 const inspector=root.querySelector('.inspector.open');
 const panel=root.querySelector('.activeSectionStudy');
 const rect=panel?.getBoundingClientRect();
 return {inspectorOpen:Boolean(inspector),inspectorScroll:inspector?.scrollTop??0,inspectorDetails:inspector?[...inspector.querySelectorAll('details')].flatMap((item,index)=>item.open?[index]:[]):[],themeOpen:Boolean(panel?.querySelector('details')?.open),themeDetails:panel?[...panel.querySelectorAll('details')].flatMap((item,index)=>item.open?[index]:[]):[],themeOffset:theme&&rect&&rect.bottom>0&&rect.top<innerHeight?rect.top:null};
}
export function readSectionReader(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.inspectorOpen!=='boolean'||typeof value.themeOpen!=='boolean'||!Number.isFinite(value.inspectorScroll)||value.inspectorScroll<0||value.inspectorScroll>1e7||!Array.isArray(value.inspectorDetails)||value.inspectorDetails.length>500||new Set(value.inspectorDetails).size!==value.inspectorDetails.length||!value.inspectorDetails.every(i=>Number.isInteger(i)&&i>=0&&i<500)||!(value.themeOffset===null||Number.isFinite(value.themeOffset)&&Math.abs(value.themeOffset)<=1e7))return null;
 if(value.themeDetails!==undefined&&(!Array.isArray(value.themeDetails)||value.themeDetails.length>500||new Set(value.themeDetails).size!==value.themeDetails.length||!value.themeDetails.every(i=>Number.isInteger(i)&&i>=0&&i<500)||value.themeDetails.includes(0)!==value.themeOpen))return null;
 return {inspectorOpen:value.inspectorOpen,inspectorScroll:value.inspectorScroll,inspectorDetails:[...value.inspectorDetails],themeOpen:value.themeOpen,...(value.themeDetails!==undefined?{themeDetails:[...value.themeDetails]}:{}),themeOffset:value.themeOffset};
}
export function restoreSectionReader(root,value){
 const inspector=root.querySelector('.inspector.open');
 if(inspector&&value.inspectorOpen){inspector.querySelectorAll('details').forEach((item,index)=>{item.open=value.inspectorDetails.includes(index)});inspector.scrollTop=value.inspectorScroll;}
 const panel=root.querySelector('.activeSectionStudy');
 if(panel)panel.querySelectorAll('details').forEach((item,index)=>{item.open=value.themeDetails?value.themeDetails.includes(index):index===0&&value.themeOpen;});
 if(panel&&!value.inspectorOpen&&value.themeOffset!==null)window.scrollBy(0,panel.getBoundingClientRect().top-value.themeOffset);
}
