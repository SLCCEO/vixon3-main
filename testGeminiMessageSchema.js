const fetch = globalThis.fetch;
const k = process.argv[2];
const model = 'gemini-2.5-flash-preview-09-2025';
const url = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateMessage?key=${k}`;
const tests = [
  {name:'text',payload:{prompt:{messages:[{author:'user',text:'Hello from test'}]}}},
  {name:'content-string',payload:{prompt:{messages:[{author:'user',content:'Hello from test'}]}}},
  {name:'parts',payload:{prompt:{messages:[{author:'user',parts:[{type:'text',text:'Hello from test'}]}]}}},
  {name:'content-array',payload:{prompt:{messages:[{author:'user',content:[{type:'text',text:'Hello from test'}]}]}}},
  {name:'role-text',payload:{prompt:{messages:[{role:'user',text:'Hello from test'}]}}},
  {name:'role-content',payload:{prompt:{messages:[{role:'user',content:'Hello from test'}]}}},
  {name:'role-parts',payload:{prompt:{messages:[{role:'user',parts:[{type:'text',text:'Hello from test'}]}]}}}
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
