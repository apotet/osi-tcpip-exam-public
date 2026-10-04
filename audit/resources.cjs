const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch();
  const results=[];
  try{
    for(const route of ['/','/ipv4.html','/ipv6.html','/cli/','/cli/read.html']){
      const context=await browser.newContext({viewport:{width:390,height:844}});
      const page=await context.newPage();
      await page.goto(`http://127.0.0.1:4173${route}`,{waitUntil:'networkidle'});
      results.push(await page.evaluate(()=>{
        const nav=performance.getEntriesByType('navigation')[0];
        const resources=performance.getEntriesByType('resource').map(r=>({path:new URL(r.name).pathname,bytes:r.decodedBodySize}));
        return {route:location.pathname,documentBytes:nav.decodedBodySize,resourceBytes:resources.reduce((n,r)=>n+r.bytes,0),requests:resources.length+1,loadMs:Math.round(nav.loadEventEnd),resources};
      }));
      await context.close();
    }
  }finally{await browser.close();}
  fs.mkdirSync('audit/results',{recursive:true});
  fs.writeFileSync('audit/results/resources.json',JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results.map(({resources,...r})=>r),null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
