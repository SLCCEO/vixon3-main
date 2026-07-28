const fetch = globalThis.fetch;
const k = process.argv[2];
const model = 'gemini-2.5-flash-preview-09-2025';
const prompt = 'Hello from test';
const endpoints=[
  'https://generativelanguage.googleapis.com/v1/models/${model}:generateMessage?key=${k}',
  'https://generativelanguage.googleapis.com/v1/models/${model}:generateText?key=${k}',
  'https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateMessage?key=${k}',
  'https://generativelanguage.googleapis.com/v1beta2/models/${model}:generateText?key=${k}',
  'https://generativelanguage.googleapis.com/v1beta1/models/${model}:generateMessage?key=${k}',
  'https://generativelanguage.googleapis.com/v1beta1/models/${model}:generateText?key=${k}'
];
const payloads=[
  ['messages',{messages:[{author:'user',content:[{type:'text',text:prompt}]}]}],
  ['prompt',{prompt:{text:prompt}}],
  ['input',{input:{text:prompt}}],
  ['instances',{instances:[{content:[{type:'text',text:prompt}]}]}]
];
(async()=>{
 for(const url of endpoints){
   for(const [name,payload] of payloads){
     console.log('---');
     console.log('url',url);
     console.log('payload',name);
     try{
      const resp=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const json=await resp.json();
      console.log('status',resp.status,'ok',resp.ok);
      console.log(JSON.stringify(json,null,2));
     } catch(e){ console.log('fetch error',e.message); }
   }
 }
})();
