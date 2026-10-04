const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const pages=['/','/ipv4.html','/ipv6.html','/cli/','/cli/read.html'];
test.beforeEach(async({page})=>{
  page.auditErrors=[];
  page.on('pageerror',e=>page.auditErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')page.auditErrors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)page.auditErrors.push(`${r.status()} ${r.url()}`);});
  page.on('requestfailed',r=>page.auditErrors.push(`${r.url()}: ${r.failure()?.errorText}`));
});
test.afterEach(async({page})=>{expect(page.auditErrors).toEqual([]);});
async function layout(page){
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
}
for(const route of pages)test(`load, links, reload, history ${route}`,async({page,request},info)=>{
  expect((await page.goto(route)).status()).toBe(200);
  await expect(page.locator('body')).not.toBeEmpty();await layout(page);
  // Includes hidden anchors and resources in static HTML. Dynamic states are covered below.
  const links=await page.locator('[href],[src]').evaluateAll(els=>els.map(e=>e.href||e.src).filter(Boolean));
  for(const href of new Set(links)){
    const url=new URL(href);if(url.origin!=='http://127.0.0.1:4173')continue;
    const response=await request.get(href);expect(response.ok(),href).toBe(true);
    if(url.hash){const body=await response.text();const id=decodeURIComponent(url.hash.slice(1));expect(body.includes(`id="${id}"`)||body.includes(`id='${id}'`),href).toBe(true);}
  }
  await page.reload();await layout(page);
  if(route!=='/') {await page.goto('/');await page.goBack();expect(new URL(page.url()).pathname).toBe(route);await page.goForward();expect(new URL(page.url()).pathname).toBe('/');await page.goBack();}
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({url:new URL(r.name).pathname,bytes:r.decodedBodySize,duration:r.duration})));
  await info.attach('resources',{body:JSON.stringify(resources,null,2),contentType:'application/json'});
  await page.screenshot({path:info.outputPath('page.png'),fullPage:route!=='/cli/read.html'});
});
test('OSI exam modes, results, learning and dialogs',async({page})=>{
  await page.goto('/');
  const modes=await page.locator('#modeSelect option').evaluateAll(els=>els.map(e=>e.value));
  for(const mode of modes){
    await page.selectOption('#modeSelect',mode);await page.click('#startButton');
    for(let i=0;i<(mode===modes[0]?10:1);i++){
      await expect(page.locator('#questionText')).not.toBeEmpty();
      await page.locator('#answersForm label').first().click();await page.click('#checkButton');
      await expect(page.locator('#feedback')).toBeVisible();await layout(page);
      if(await page.locator('#detailButton').isVisible()){await page.click('#detailButton');await layout(page);}
      await page.click('#nextButton');
    }
    if(mode===modes[0]){await expect(page.locator('#resultScreen')).toBeVisible();await page.click('#homeButton');}
    else await page.click('#exitButton');
  }
  await page.click('#learnNav');
  for(const b of await page.locator('[data-notes]').all()){
    await b.click();await expect(page.locator('#closeNotes')).toBeVisible();await layout(page);await page.click('#closeNotes');
  }
  for(const b of await page.locator('[data-cheat]').all()){
    await b.click();await expect(page.locator('#closeZoom')).toBeVisible();await layout(page);await page.click('#closeZoom');
  }
  await page.click('#statsButton');await expect(page.locator('#closeStats')).toBeVisible();await layout(page);await page.click('#closeStats');
});
for(const version of [4,6])test(`IPv${version} all modes and round completion`,async({page})=>{
  await page.goto(`/ipv${version}.html`);
  for(const mode of await page.locator('.mode').all()){
    await mode.click();
    for(let i=0;i<10;i++){
      if(await page.locator('#answers input').count())for(const field of await page.locator('#answers input').all())await field.fill('1');
      else await page.locator('#answers .choice').first().click();
      await page.click('#check');await expect(page.locator('#feedback')).toBeVisible();await layout(page);await page.click('#next');
    }
    await expect(page.locator('#restart')).toBeVisible();await page.click('#restart');
  }
});
test('CLI vendors, cards, filters, exam, host and scenarios',async({page})=>{
  await page.goto('/cli/');
  for(const vendor of await page.locator('#vendor option').evaluateAll(els=>els.map(e=>e.value))){
    await page.selectOption('#vendor',vendor);
    // Open every command/protocol card for this vendor and check dynamic DOM/resources.
    for(const card of await page.locator('#results .card').all()){
      await card.locator('summary').click();await expect(card.locator('.detail')).not.toBeEmpty();await layout(page);await card.locator('summary').click();
    }
  }
  await page.fill('#search','VLAN');await expect(page.locator('#results .card').first()).toBeVisible();await page.fill('#search','zzzz-no-match');await expect(page.locator('#results .empty')).toBeVisible();await page.fill('#search','');
  for(const kind of ['commands','protocols','favorites','all']){await page.selectOption('#kind',kind);await layout(page);}
  for(const mode of ['exam','host','scenarios']){await page.click(`[data-mode="${mode}"]`);await expect(page.locator('#app')).not.toBeEmpty();await layout(page);}
  if(await page.locator('#scenario').count())for(const scenario of await page.locator('#scenario option').evaluateAll(els=>els.map(e=>e.value))){await page.selectOption('#scenario',scenario);await layout(page);}
});
