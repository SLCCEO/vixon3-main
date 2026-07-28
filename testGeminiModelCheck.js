const fetch = globalThis.fetch;
const k = process.argv[2];
const tests = [
  {name:'chat-bison-generateMessage',model:'chat-bison-001',url:`https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage?key=${k}`,payload:{prompt:{messages:[{author:'user',content:'Hello from test'}]}}},
  {name:'text-bison-generateText',model:'text-bison-001',url:`https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${k}`,payload:{prompt:{text:'Hello from test'}}}
];
(async()=>{
  for(const t of tests){
    console.log('---');
    console.log('test',t.name);
    console.log('url',t.url);
    const resp=await fetch(t.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(t.payload)});
    const resText=await resp.text();
    console.log('status',resp.status,'ok',resp.ok);
    console.log(resText);
  }
})();
