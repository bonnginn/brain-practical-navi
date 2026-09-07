import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {launchChrome,closeChrome,configurePage,navigate,evaluate,waitForUiReady} from './measure_browser_performance.mjs';

const base=new URL(process.argv[2]??'http://127.0.0.1:4346/');
if(base.protocol!=='http:'||base.hostname!=='127.0.0.1')throw Error('Local preview only');
const out=resolve('work/anatomy-review/identification-note-v1');
await mkdir(out,{recursive:true});
const s=await launchChrome();
try{
 await configurePage(s.cdp);
 await s.cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await navigate(s.cdp,new URL('#workspace/sections/horizontal',base).href);
 await waitForUiReady(s.cdp);
 const probe=await evaluate(s.cdp,`({canvases:[...document.querySelectorAll('canvas')].map(c=>({cl:c.className,parent:c.parentElement.className,rect:c.getBoundingClientRect().toJSON()})),card:document.querySelector('.identifyCard')?.textContent})`);
 console.log(JSON.stringify(probe));
 // Slice canvas is selected by its owning stage, not by a presumed canvas order.
 const rect=await evaluate(s.cdp,`document.querySelector('.sliceViewport canvas')?.getBoundingClientRect().toJSON()`);
 assert.ok(rect,'slice stage is missing');
 const x=rect.x+3,y=rect.y+3;
 await s.cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
 await s.cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
 await evaluate(s.cdp,`document.querySelector('.detailToggle').click()`);
 await evaluate(s.cdp,'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 await evaluate(s.cdp,'Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})))');
 const after=await evaluate(s.cdp,`({card:document.querySelector('.identifyCard')?.textContent,errors:[...document.querySelectorAll('.atlasLoading.error,.atlasWebglFallback')].map(x=>x.textContent)})`);
 assert.match(after.card,/この位置には対応するラベルがありません/);
 assert.match(after.card,/組織が存在しないことを意味するものではありません/);
 assert.equal(after.errors.length,0);
 const shot=await s.cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
 await writeFile(resolve(out,'outside.png'),Buffer.from(shot.data,'base64'));
 await writeFile(resolve(out,'report.json'),JSON.stringify({browser:s.version,base:base.href,before:probe,after},null,2));
 console.log('outside identification note passed');
}finally{await closeChrome(s);}
