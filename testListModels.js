const fetch = globalThis.fetch;
const k = process.argv[2];
const urls = [
  `https://generativelanguage.googleapis.com/v1beta2/models?key=${k}`,
  `https://generativelanguage.googleapis.com/v1beta/models?key=${k}`,
  `https://generativelanguage.googleapis.com/v1/models?key=${k}`
];
(async()=>{
  for(const url of urls){
    console.log('---');
    console.log('listing',url);
    try{
      const resp=await fetch(url,{method:'GET'});
      const text=await resp.text();
      console.log('status',resp.status,'ok',resp.ok);
      console.log(text.substring(0,4000));
    } catch(e){ console.log('error',e.message); }
  }
})();
