const fetch = globalThis.fetch;
const k = process.argv[2];
const model = 'gemini-2.5-flash-preview-09-2025';
const url = `https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateMessage?key=${k}`;
const tests = [
  {name:'message-content-object', payload:{prompt:{messages:[{author:'user',content:{type:'text',text:'Hello from test'}}]}}},
  {name:'message-content-text', payload:{prompt:{messages:[{author:'user',content:{text:'Hello from test'}}]}}},
  {name:'message-text-array', payload:{prompt:{messages:[{author:'user',content:{text:['Hello from test']}}]}}}
];
(async()=>{
  for(const t of tests){
    console.log('---');
    console.log('test',t.name);
    console.log('payload',JSON.stringify(t.payload));
    const resp = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(t.payload)});
    const text = await resp.text();
    console.log('status',resp.status,'ok',resp.ok);
    console.log(text);
  }
})();
