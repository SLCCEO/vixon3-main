const fetch = globalThis.fetch;
const k = process.argv[2];
const model='gemini-2.5-flash-preview-09-2025';
const prompt='Hello from test';
const urls=[
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateText?key=${k}`,
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateMessage?key=${k}`
];
(async()=>{
  for(const url of urls) {
    console.log('URL', url.includes('generateText')?'generateText':'generateMessage');
    const payload = url.includes('generateText')
      ? { prompt:{ text: prompt } }
      : { messages:[{author:'user',content:[{type:'text',text:prompt}]}] };
    const resp = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    const json = await resp.json();
    console.log('status', resp.status, 'ok', resp.ok);
    console.log(JSON.stringify(json,null,2).slice(0,2000));
  }
})();
