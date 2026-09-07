import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,join,basename} from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
export function validateSubmission(data){
 if(!data||data.schemaVersion!==1||typeof data.imageName!=='string'||data.imageName.length>300||typeof data.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(data.sourceHash)||typeof data.note!=='string'||data.note.length>4000)throw Error('Invalid metadata');
 if(!Number.isInteger(data.width)||!Number.isInteger(data.height)||data.width<1||data.height<1||data.width*data.height>16000000)throw Error('Invalid dimensions');
 if(!Array.isArray(data.strokes)||data.strokes.length>2000)throw Error('Invalid strokes');
 for(const s of data.strokes){if(!/^#[0-9a-f]{6}$/i.test(s.color)||![2,4,7].includes(s.width)||!Array.isArray(s.points)||!s.points.length||s.points.length>20000)throw Error('Invalid stroke');for(const p of s.points)if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[1]<0||p[0]>data.width||p[1]>data.height)throw Error('Invalid point');}
 const decode=value=>{if(typeof value!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value))throw Error('Invalid PNG');const b=Buffer.from(value.split(',')[1],'base64');if(b.length<33||b.length>24*1024*1024||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||b.toString('ascii',12,16)!=='IHDR'||b.readUInt32BE(16)!==data.width||b.readUInt32BE(20)!==data.height)throw Error('PNG dimensions mismatch');return b;};
 return {source:decode(data.sourcePng),annotated:decode(data.annotatedPng)};
}
export function createReviewServer({output=join(root,'work/image-review-responses'),reference=join(root,'work/user-review-midbrain-limit.png')}={}){
 const token=randomBytes(24).toString('hex');
 return http.createServer(async(req,res)=>{const address=res.socket.localPort,host=`127.0.0.1:${address}`;res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; frame-ancestors 'none'; base-uri 'none'");
 const json=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
 if(req.headers.host!==host)return json(403,{error:'Loopback host required'});
 try{
  if(req.method==='GET'){
   if(req.url==='/config')return json(200,{token,referenceName:basename(reference)});
   const routes={'/':['tools/image-review/index.html','text/html; charset=utf-8'],'/review.js':['tools/image-review/review.js','text/javascript; charset=utf-8']};
   if(req.url==='/reference.png'){res.setHeader('Content-Type','image/png');return res.end(await readFile(reference));}
   if(routes[req.url]){const [path,type]=routes[req.url];res.setHeader('Content-Type',type);return res.end(await readFile(join(root,path)));}
   return json(404,{error:'Not found'});
  }
  if(req.method!=='POST'||req.url!=='/api/save')return json(405,{error:'Method not allowed'});
  if(req.headers.origin!==`http://${host}`||req.headers['x-review-token']!==token||!req.headers['content-type']?.startsWith('application/json'))return json(403,{error:'Same-origin confirmation required'});
  let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>48*1024*1024)return json(413,{error:'Image too large'});chunks.push(chunk);}
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));const {source,annotated}=validateSubmission(data);
  const id=`${new Date().toISOString().replaceAll(':','-')}-${randomUUID()}`;const folder=join(output,id);await mkdir(folder,{recursive:true});
  const {sourcePng,annotatedPng,...annotation}=data;
  await writeFile(join(folder,'source.png'),source,{flag:'wx'});await writeFile(join(folder,'annotated.png'),annotated,{flag:'wx'});
  await writeFile(join(folder,'annotation.json'),JSON.stringify({...annotation,id,savedAt:new Date().toISOString(),sourcePngSha256:sha(source),annotatedPngSha256:sha(annotated),status:'user-drawn-reference-not-segmentation-approval'},null,2)+'\n',{flag:'wx'});
  return json(200,{id});
 }catch(e){json(400,{error:e.code==='ENOENT'?'Reference image unavailable':e.message});}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const server=createReviewServer();server.listen(0,'127.0.0.1',()=>console.log(`Image review: http://127.0.0.1:${server.address().port}/`));}
