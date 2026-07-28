const fetch = globalThis.fetch;
const k = process.argv[2];
const model = 'gemini-2.5-flash-preview-09-2025';
const url = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateMessage?key=${k}`;
const tests = [
  {name:'content-string', payload:{prompt:{messages:[{author:'user',content:'Hello from test'}]}}},
  {name:'content-string-system', payload:{prompt:{messages:[{author:'system',content:'System preamble'},{author:'user',content:'Hello from test'}]}}},
  {name:'content-string-with-arguments', payload:{prompt:{messages:[{author:'user',content:'Hello from test'}], temperature:0.2, candidateCount:1}}}
];
(async()=>{
  for(const t of tests){
    console.log('---');
    console.log('test',t.name);
    console.log(JSON.stringify(t.payload));
    const resp = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(t.payload)});
    const text = await resp.text();
    console.log('status',resp.status,'ok',resp.ok);
    console.log(text);
  }
})();
