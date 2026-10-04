const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch();const page=await browser.newPage();
  const urls=new Set(), failures=[];
  const collect=async()=>{
    for(const url of await page.locator('[href],[src]').evaluateAll(els=>els.map(e=>e.href||e.src).filter(Boolean)))
      if(new URL(url).origin==='http://127.0.0.1:4173')urls.add(url);
  };
  try{
    for(const path of ['/','/ipv4.html','/ipv6.html','/cli/','/cli/read.html']){
      await page.goto(`http://127.0.0.1:4173${path}`);await collect();
      if(path==='/')for(const image of await page.evaluate(()=>window.QUESTION_BANK.map(q=>q.image).filter(Boolean)))urls.add(new URL(image,page.url()).href);
      if(path==='/cli/'){
        for(const vendor of await page.locator('#vendor option').evaluateAll(els=>els.map(e=>e.value))){
          await page.selectOption('#vendor',vendor);
          await page.locator('#results .card').evaluateAll(cards=>cards.forEach(c=>c.open=true));
          await page.waitForFunction(()=>[...document.querySelectorAll('#results .detail')].every(e=>e.textContent.trim()));
          await collect();
        }
        for(const mode of ['exam','host','scenarios']){await page.click(`[data-mode="${mode}"]`);await collect();}
        for(const scenario of await page.locator('#scenario option').evaluateAll(els=>els.map(e=>e.value))){await page.selectOption('#scenario',scenario);await collect();}
      }
    }
    const bodies=new Map();
    for(const href of [...urls].sort()){
      const url=new URL(href),resource=url.origin+url.pathname+url.search;
      if(!bodies.has(resource)){
        const response=await page.request.get(resource);
        bodies.set(resource,{ok:response.ok(),status:response.status(),body:await response.text()});
      }
      const result=bodies.get(resource);
      if(!result.ok)failures.push({href,status:result.status});
      else if(url.hash){const id=decodeURIComponent(url.hash.slice(1));if(!result.body.includes(`id="${id}"`)&&!result.body.includes(`id='${id}'`))failures.push({href,error:'Missing fragment ID'});}
    }
    const report={internalUrls:urls.size,resources:bodies.size,failures,urls:[...urls].map(u=>u.replace('http://127.0.0.1:4173','')).sort()};
    fs.mkdirSync((process.env.AUDIT_RUN_DIR||'audit/results'),{recursive:true});fs.writeFileSync(`${process.env.AUDIT_RUN_DIR||'audit/results'}/links.json`,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({internalUrls:urls.size,resources:bodies.size,failures},null,2));
    if(failures.length)process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
