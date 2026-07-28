const fetch = globalThis.fetch;
const k = process.argv[2];
const prompt = 'Hello from test';
const model='gemini-2.5-flash';
const url=`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${k}`;
const payloads=[
  {name:'contents-parts-text', body:{contents:[{parts:[{text:prompt}]}]}},
  {name:'contents-parts-text-system', body:{contents:[{parts:[{text:prompt}]}],systemInstruction:{parts:[{text:'System preamble'}]}}},
  {name:'contents-input', body:{contents:[{text:prompt}]}},
  {name:'prompt-text', body:{prompt:{text:prompt}}}
];
(async()=>{
 for(const p of payloads){
   console.log('---');
   console.log('name',p.name);
   console.log('payload',JSON.stringify(p.body));
   const resp=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p.body)});
   const txt=await resp.text();
   console.log('status',resp.status,'ok',resp.ok);
   console.log(txt);
 }
})();
