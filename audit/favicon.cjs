const {chromium,webkit,firefox}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const results=[];
  for(const [name,engine] of Object.entries({chromium,webkit,firefox})){
    const options=name==='webkit'&&process.env.AUDIT_WEBKIT_EXECUTABLE?{executablePath:process.env.AUDIT_WEBKIT_EXECUTABLE}:{};
    const browser=await engine.launch(options);
    try{
      const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
      page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
      for(const route of ['/','/ipv4.html','/ipv6.html','/cli/','/cli/read.html']){
        await page.goto(`http://127.0.0.1:4173${route}`);
        assert.equal(await page.locator('link[rel="icon"]').count(),1,`${name} ${route}: icon declaration count`);
        const href=await page.locator('link[rel="icon"]').evaluate(e=>e.href);
        let status;
        if(href.startsWith('data:image/svg+xml,')){
          assert(decodeURIComponent(href.slice(href.indexOf(',')+1)).includes('<svg'));status='inline SVG';
        }else{
          const response=await page.request.get(href);
          assert.equal(response.status(),200,`${name} ${route}: ${href}`);
          assert((await response.text()).includes('<svg'));status=200;
        }
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} ${route}: overflow`);
        results.push({browser:name,route,iconStatus:status});
      }
      assert.deepEqual(errors,[],name);
    }finally{await browser.close();}
  }
  fs.mkdirSync((process.env.AUDIT_RUN_DIR||'audit/results'),{recursive:true});
  fs.writeFileSync(`${process.env.AUDIT_RUN_DIR||'audit/results'}/favicon.json`,JSON.stringify({checks:results.length,errors:[],results},null,2)+'\n');
  console.log('15 favicon/page checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
