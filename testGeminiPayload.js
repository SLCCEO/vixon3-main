const fetch = globalThis.fetch;
const k = process.argv[2];
const model = 'gemini-2.5-flash-preview-09-2025';
const prompt = 'Hello from test';
const tests = [
  {name:'message-root-messages', url:`https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateMessage?key=${k}`, payload:{messages:[{author:'user',content:[{type:'text',text:prompt}]}]}},
  {name:'message-prompt-messages', url:`https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateMessage?key=${k}`, payload:{prompt:{messages:[{author:'user',content:[{type:'text',text:prompt}]}]}}},
  {name:'text-prompt-text', url:`https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateText?key=${k}`, payload:{prompt:{text:prompt}}},
];
(async()=>{
  for(const t of tests){
    console.log('---');
    console.log('test',t.name);
    console.log('url',t.url);
    console.log('payload',JSON.stringify(t.payload));
    const response = await fetch(t.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(t.payload)});
    const body = await response.text();
    console.log('status',response.status,'ok',response.ok);
    console.log(body);
  }
})();
