// Local A/B check: serve the same built app, swapping only one mesh in memory.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchChrome,closeChrome,configurePage,navigate,evaluate,waitForUiReady} from './measure_browser_performance.mjs';

const root=resolve('dist'),out=resolve('work/anatomy-review/midbrain-context-browser-v1');
const meshName='/atlas/block-midbrain-section-tissue.mesh';
const meshes={old:await readFile('work/anatomy-review/midbrain-context-repair-v2/old-reproduced-tissue.mesh'),new:await readFile('work/anatomy-review/midbrain-context-repair-v2/block-midbrain-section-tissue.mesh')};
let variant='old';const requests=[];
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(path===meshName){const data=meshes[variant];requests.push({variant,sha256:createHash('sha256').update(data).digest('hex')});res.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'no-store'});res.end(data);return;}
  const file=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  const data=await readFile(file);
  const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'}[extname(file)]??'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
await mkdir(out,{recursive:true});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let session;const report={results:[],requests};
try{
 session=await launchChrome();const cdp=session.cdp;report.browser=session.version;
 await configurePage(cdp);await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 const ready=async()=>{await waitForUiReady(cdp);await evaluate(cdp,'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');};
 for(const version of ['old','new']){
  await navigate(cdp,'about:blank');variant=version;
  await navigate(cdp,`http://127.0.0.1:${server.address().port}/#workspace/blocks/midbrain-section`);
  await evaluate(cdp,"document.querySelector('[data-block-intro-action=close]')?.click()");await ready();
  await evaluate(cdp,"(()=>{const b=[...document.querySelectorAll('.specimenTissueControls button')].find(x=>x.textContent.trim()==='通常');if(!b)throw Error('missing tissue control');b.click()})()");await ready();
  for(const mode of ['all','tissue-only','all-ghost']){
   const tissueMode=mode==='all-ghost'?'透過':'通常';
   await evaluate(cdp,`[...document.querySelectorAll('.specimenTissueControls button')].find(x=>x.textContent.trim()===${JSON.stringify(tissueMode)}).click()`);
   await evaluate(cdp,`(()=>{for(const b of document.querySelectorAll('[data-block-layer-key]')){const want=${JSON.stringify(mode)}!=='tissue-only';if((b.getAttribute('aria-pressed')==='true')!==want)b.click()}})()`);await ready();
   for(const view of ['上面','下面']){
    await evaluate(cdp,`(()=>{const b=[...document.querySelectorAll('.specimenViewControls button')].find(x=>x.textContent.trim()===${JSON.stringify(view)});if(!b)throw Error('missing view');b.click()})()`);await ready();
    const probe=await evaluate(cdp,`(()=>{const s=document.querySelector('.learningModelStage'),r=s.getBoundingClientRect();return {clip:{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1},canvas:!!s.querySelector('canvas'),active:[...document.querySelectorAll('[data-block-layer-key][aria-pressed="true"]')].map(x=>x.dataset.blockLayerKey),errors:[...document.querySelectorAll('.atlasLoading.error,.atlasWebglFallback')].map(x=>x.textContent)}})()`);
    assert.equal(probe.errors.length,0);assert.equal(probe.canvas,true);
    // Tissue is a separate control, not one of the coloured-part buttons.
    if(mode==='tissue-only')assert.deepEqual(probe.active,[]);
    assert.equal(await evaluate(cdp,"document.querySelector('.specimenTissueControls button[aria-pressed=true]')?.textContent.trim()"),tissueMode);
    const file=`${version}-${mode}-${view==='上面'?'top':'bottom'}.png`;
    const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:probe.clip});
    await writeFile(resolve(out,file),Buffer.from(shot.data,'base64'));
    report.results.push({version,mode,view,file,...probe});
   }
  }
  assert.ok(requests.some(r=>r.variant===version),'exact mesh not requested');
 }
 assert.equal(report.results.length,12);
 await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log('12 views captured; exact old/new mesh responses recorded');
}finally{if(session)await closeChrome(session);await new Promise(r=>server.close(r));}
