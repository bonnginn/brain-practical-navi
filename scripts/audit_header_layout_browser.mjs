// Local read-only responsive geometry check; run against a normal Vite preview.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {launchChrome,closeChrome,configurePage,navigate,evaluate,waitForUiReady} from './measure_browser_performance.mjs';
const base=process.argv[2]??'http://127.0.0.1:4346/';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const out=resolve('work/anatomy-review/header-layout-v1');await mkdir(out,{recursive:true});
const report={base,results:[]};let session;
try{
 session=await launchChrome();const cdp=session.cdp;report.browser=session.version;await configurePage(cdp);
 for(const lang of ['ja','en'])for(const width of [1920,1600,1440,1366,1200,1024,768,390]){
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate(cdp,`${base}?lang=${lang}#workspace/sections/horizontal`);await waitForUiReady(cdp);
  await evaluate(cdp,"document.querySelector('.detailToggle')?.click()");
  await evaluate(cdp,'Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})))');
  const probe=await evaluate(cdp,`(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
   const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
   const controls=[...document.querySelectorAll('.brand,.workspaceSwitch button,.topActions>a,.topActions>button,.topActions>span')].filter(visible).map(e=>({text:e.textContent.trim(),...rect(e)}));
   const overlaps=[];for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=controls[i],b=controls[j];if(Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1)overlaps.push([a.text,b.text]);}
   const pairs=[...document.querySelectorAll('.inspector dl>div')].map(e=>({term:rect(e.querySelector('dt')),definition:rect(e.querySelector('dd'))}));
   return {controls,overlaps,pairs,overflow:document.documentElement.scrollWidth>innerWidth,header:rect(document.querySelector('.topbar')),errors:[...document.querySelectorAll('.atlasLoading.error,.atlasWebglFallback')].map(e=>e.textContent)};
  })()`);
  const failures=[];if(probe.overlaps.length)failures.push('header overlap');if(probe.overflow)failures.push('page overflow');if(probe.errors.length)failures.push('UI error');
  if(probe.pairs.some(p=>p.term.right>p.definition.x+1))failures.push('definition columns overlap');
  const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});const file=`${lang}-${width}.png`;await writeFile(resolve(out,file),Buffer.from(shot.data,'base64'));
  report.results.push({lang,width,probe,failures,file});console.log(lang,width,failures.join(',')||'pass');
 }
 await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));assert.equal(report.results.filter(r=>r.failures.length).length,0);
}finally{if(session)await closeChrome(session);}
