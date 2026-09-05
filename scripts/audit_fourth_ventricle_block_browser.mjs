// Actual built-asset browser check. No asset override or publication.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {launchChrome,closeChrome,configurePage,navigate,evaluate,waitForUiReady} from './measure_browser_performance.mjs';
const root=resolve('dist'),out=resolve('work/anatomy-review/fourth-ventricle-block-browser-v1'),responses=[];
assert.match(await readFile(resolve(root,'index.html'),'utf8'),/src="\/assets\//);
const server=createServer(async(req,res)=>{try{
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+(path==='/'?'/index.html':path));
 if(!file.startsWith(root+sep))throw Error('path');
 const data=await readFile(file);
 if(path.endsWith('/block-hindbrain-fourth-ventricle.mesh')){
  const sha256=createHash('sha256').update(data).digest('hex');assert.equal(sha256,'1cfc2dade80d86c041f0696af721b3068c7121bfbcc77bee70c59ce717df5613');responses.push({path,sha256});
 }
 res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(data);
}catch{res.writeHead(404);res.end();}});
await mkdir(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let session;const report={scope:'Actual built development mesh, no publication',results:[],responses};
try{
 session=await launchChrome();const cdp=session.cdp;report.browser=session.version;await configurePage(cdp);
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await navigate(cdp,`http://127.0.0.1:${server.address().port}/#workspace/blocks/hindbrain`);
 await evaluate(cdp,"document.querySelector('[data-block-intro-action=close]')?.click()");await waitForUiReady(cdp);
 await evaluate(cdp,"(()=>{for(const b of document.querySelectorAll('[data-block-layer-key]')){const want=b.dataset.blockLayerKey==='fourth-ventricle';if((b.getAttribute('aria-pressed')==='true')!==want)b.click()}})()");
 for(const mode of ['通常','透過'])for(const view of ['上面','下面']){
  for(const [selector,label] of [['.specimenTissueControls button',mode],['.specimenViewControls button',view]])await evaluate(cdp,`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(selector)})].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b)throw Error('control absent');b.click()})()`);
  await waitForUiReady(cdp);await evaluate(cdp,'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const probe=await evaluate(cdp,"({active:[...document.querySelectorAll('[data-block-layer-key][aria-pressed=true]')].map(x=>x.dataset.blockLayerKey),canvas:document.querySelectorAll('.learningModelStage canvas').length,errors:[...document.querySelectorAll('.atlasLoading.error,.atlasWebglFallback')].map(x=>x.textContent)})");
  assert.deepEqual(probe.active,['fourth-ventricle']);assert.equal(probe.canvas,1);assert.deepEqual(probe.errors,[]);
  const file=`${mode==='通常'?'solid':'ghost'}-${view==='上面'?'top':'bottom'}.png`;
  const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(resolve(out,file),Buffer.from(shot.data,'base64'));
  report.results.push({mode,view,probe,file});
 }
 assert.ok(responses.length);await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));console.log('4 actual fourth-ventricle block views captured');
}finally{if(session)await closeChrome(session);await new Promise(r=>server.close(r));}
