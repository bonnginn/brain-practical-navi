import catalog from './catalog.json' with {type:'json'};
const allowed=new Map(catalog.map(row=>[`${row.question}:${row.revision}`,new Set(row.options)]));
export async function receiveAnswer(request,env) {
  const origin=request.headers.get('Origin');
  if(!origin||origin!==env.ALLOWED_ORIGIN)return new Response(null,{status:403});
  const headers={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store'};
  const reply=status=>new Response(null,{status,headers});
  const path=new URL(request.url).pathname;
  if(path==='/results'&&request.method==='GET'){
    try {
      const rows=await env.DB.prepare('SELECT question,revision,choice,answers FROM quiz_option_counts ORDER BY question,revision,choice').all();
      return new Response(JSON.stringify(rows.results??[]),{status:200,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
    } catch { return reply(503); }
  }
  if(path!=='/answer')return reply(404);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
  if(request.method!=='POST')return reply(405);
  if(request.headers.get('Content-Type')!=='application/json')return reply(415);
  try {
    // Limit bytes while reading, rather than trusting Content-Length.
    const reader=request.body?.getReader();if(!reader)return reply(400);
    let bytes=0;const chunks=[];
    while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>512){await reader.cancel();return reply(413)}chunks.push(value)}
    const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length}
    let data;try{data=JSON.parse(new TextDecoder().decode(buffer))}catch{return reply(400)}
    if(!data||Array.isArray(data)||Object.keys(data).sort().join(',')!=='choice,question,revision'||typeof data.question!=='string'||typeof data.revision!=='string'||typeof data.choice!=='string'||!allowed.get(`${data.question}:${data.revision}`)?.has(data.choice))return reply(400);
    await env.DB.prepare('INSERT INTO quiz_option_counts (question,revision,choice,answers) VALUES (?,?,?,1) ON CONFLICT(question,revision,choice) DO UPDATE SET answers=answers+1').bind(data.question,data.revision,data.choice).run();
    return reply(204);
  } catch { return reply(503); }
}
export default {fetch:receiveAnswer};
