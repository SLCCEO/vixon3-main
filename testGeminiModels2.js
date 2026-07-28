const fetch = globalThis.fetch;
const k = process.argv[2];
const prompt = 'Hello from test';
const models=['gemini-2.0-flash','gemini-2.0-flash-001','gemini-2.0-flash-lite-001','gemini-2.0-flash-lite'];
const urlfn = (model) => `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${k}`;
const payload = {contents:[{parts:[{text:prompt}]}]};
(async()=>{
 for(const m of models){
   console.log('--- model',m);
   const u=urlfn(m);
   const resp = await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const txt=await resp.text();
   console.log('status',resp.status,'ok',resp.ok);
   console.log(txt);
 }
})();
