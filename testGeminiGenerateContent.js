const fetch = globalThis.fetch;
const k = process.argv[2];
const prompt = 'Hello from test';
const models = ['gemini-2.5-flash','gemini-2.5-pro'];
const bases = ['v1','v1beta'];
const payload = {contents:[{parts:[{text:prompt}]}], systemInstruction:{parts:[{text:'You are VEXON_SYS.'}]}};
(async()=>{
 for(const base of bases){
  for(const model of models){
    const url = `https://generativelanguage.googleapis.com/${base}/models/${model}:generateContent?key=${k}`;
    console.log('---');
    console.log('url',url);
    const resp = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const text=await resp.text();
    console.log('status',resp.status,'ok',resp.ok);
    console.log(text);
  }
 }
})();
