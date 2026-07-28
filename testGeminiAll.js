const fetch = globalThis.fetch;
const k = process.argv[2];
const model = 'gemini-2.5-flash-preview-09-2025';
const prompt = 'Hello from test';
const endpoints = [
  {base:'v1beta', action:'generateText'},
  {base:'v1beta', action:'generateMessage'},
  {base:'v1beta2', action:'generateText'},
  {base:'v1beta2', action:'generateMessage'},
  {base:'v1', action:'generateText'},
  {base:'v1', action:'generateMessage'}
];
const payloads = [
  {name:'messages', body:{messages:[{author:'user',content:[{type:'text',text:prompt}]}]}},
  {name:'prompt', body:{prompt:{text:prompt}}},
  {name:'input', body:{input:{text:prompt}}},
  {name:'instances', body:{instances:[{content:[{type:'text',text:prompt}]}]}}
];
(async()=>{
  for(const e of endpoints) {
    for(const p of payloads) {
      const url = `https://generativelanguage.googleapis.com/${e.base}/models/${model}:${e.action}?key=${k}`;
      console.log('---');
      console.log('endpoint',url);
      console.log('payload',p.name);
      try {
        const resp = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p.body)});
        const json = await resp.json();
        console.log('status',resp.status,'ok',resp.ok);
        if (resp.ok) {
          console.log('success result',JSON.stringify(json,null,2).slice(0,2000));
          process.exit(0);
        } else {
          console.log(JSON.stringify(json,null,2).slice(0,2000));
        }
      } catch(err) {
        console.log('error',err.message);
      }
    }
  }
  process.exit(0);
})();
