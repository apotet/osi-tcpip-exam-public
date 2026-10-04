const {test,expect}=require('./test-fixture.cjs');
const fixtures=Array.from({length:10},(_,i)=>({id:`analytics-${i}`,group:'l1-l2',topic:'Analytics control',text:`Control ${i}`,answers:['A','B','C','D'],correct:i%2?[0,2]:[0],explanation:'Test fixture only.'}));
const goals=page=>page.evaluate(()=>window.__ymCalls.filter(c=>c[1]==='reachGoal').map(c=>({event:c[2],params:c[3]})));
async function fixture(page){await page.route('**/quiz/questions.js',r=>r.fulfill({contentType:'application/javascript',body:`window.QUESTION_BANK=${JSON.stringify(fixtures)}`}));await page.addInitScript(()=>{Math.random=()=>0});}
async function begin(page){await page.selectOption('#modeSelect','l1-l2');await page.click('#startButton');}
async function doubleDOMClick(page,id){await page.evaluate(id=>{const b=document.getElementById(id);b.click();b.click()},id);}
async function answer(page,correct){const multi=await page.locator('#answersForm input[type=checkbox]').count();for(const value of correct?(multi?[0,2]:[0]):[1])await page.locator(`#answersForm label`).filter({has:page.locator(`input[value="${value}"]`)}).click();await doubleDOMClick(page,'checkButton');}

test.beforeEach(async({page})=>{
 page.appErrors=[];page.on('pageerror',e=>page.appErrors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'){
  if(page.expectedBlockedSDK&&m.location().url.startsWith('https://mc.yandex.ru/'))page.sdkErrors.push(m.text());
  else page.appErrors.push(m.text());
 }});page.sdkErrors=[];
 await page.addInitScript(()=>{window.__ymCalls=[];window.ym=(...args)=>window.__ymCalls.push(args)});
});
test.afterEach(async({page})=>expect(page.appErrors).toEqual([]));

test.describe('analytics enabled with isolated SDK spy',()=>{
 test.use({analyticsEnabled:true});
 for(const score of [0,8])test(`exam lifecycle: exact params, doubles, completion ${score}/10`,async({page})=>{
  await fixture(page);await page.goto('/');await page.selectOption('#modeSelect','l1-l2');await doubleDOMClick(page,'startButton');
  expect(await goals(page)).toEqual([{event:'exam_start',params:{mode:'l1-l2'}}]);
  await doubleDOMClick(page,'nextButton'); // Unchecked / hidden next must not finish or skip.
  await expect(page.locator('#questionNumber')).toHaveText('Вопрос 1 из 10');
  for(let i=0;i<10;i++){
   await answer(page,i<score);expect((await goals(page)).filter(g=>g.event==='exam_complete')).toHaveLength(0);
   await doubleDOMClick(page,'nextButton');
  }
  await expect(page.locator('#resultScreen')).toHaveClass(/active/);
  expect(await goals(page)).toEqual([{event:'exam_start',params:{mode:'l1-l2'}},{event:'exam_complete',params:{mode:'l1-l2',score,total:10,percent:score*10,passed:score>=8}}]);
  await doubleDOMClick(page,'nextButton');expect((await goals(page)).filter(g=>g.event==='exam_complete')).toHaveLength(1);
  await doubleDOMClick(page,'retryButton');expect((await goals(page)).filter(g=>g.event==='exam_start')).toHaveLength(2);
  expect((await goals(page)).filter(g=>g.event==='exam_complete')).toHaveLength(1);
 });
 test('unfinished attempt, cancelled exit, reload and history never complete',async({page})=>{
  await fixture(page);await page.goto('/');await begin(page);await answer(page,true);await page.click('#nextButton');
  page.once('dialog',d=>d.dismiss());await page.click('#exitButton');expect((await goals(page)).filter(g=>g.event==='exam_start')).toHaveLength(1);
  await page.reload();expect(await goals(page)).toEqual([]);
  await page.goto('/ipv4.html');await page.goBack();expect(await goals(page)).toEqual([]);
  await begin(page);page.once('dialog',d=>d.accept());await page.click('#exitButton');expect((await goals(page)).some(g=>g.event==='exam_complete')).toBe(false);
  await begin(page);expect((await goals(page)).filter(g=>g.event==='exam_start')).toHaveLength(2);
 });
 test('training and cards use actual open transitions and static parameters',async({page})=>{
  await page.goto('/');await doubleDOMClick(page,'learnNav');expect(await goals(page)).toEqual([{event:'training_open',params:{}}]);
  await page.evaluate(()=>{const b=document.querySelector('[data-notes="1"]');b.click();b.click()});
  expect((await goals(page)).filter(g=>g.event==='cheatsheet_open')).toEqual([{event:'cheatsheet_open',params:{section:'learning',topic:'L1 · Физический уровень'}}]);
  await page.click('#closeNotes');await page.locator('[data-notes="1"]').click();expect((await goals(page)).filter(g=>g.event==='cheatsheet_open')).toHaveLength(2);await page.click('#closeNotes');
  await page.evaluate(()=>{const b=document.querySelector('[data-cheat="assets/cheatsheets/l2.webp"]');b.click();b.click()});
  expect((await goals(page)).at(-1)).toEqual({event:'cheatsheet_open',params:{section:'learning',topic:'L2 · Канальный уровень'}});await page.click('#closeZoom');
  await page.click('#examNav');await page.click('#learnNav');expect((await goals(page)).filter(g=>g.event==='training_open')).toHaveLength(2);
  await page.click('#examNav');await page.selectOption('#modeSelect','l1-l2');await page.click('#startButton');
  // Existing lesson card: intercepting bank keeps this test independent of content changes.
 });
 test('exam detailed card emits only on opening',async({page})=>{
  const bank=fixtures.map(q=>({...q,lesson:{title:'Fixture lesson',plain:'Plain',example:'Example'}}));
  await page.route('**/quiz/questions.js',r=>r.fulfill({contentType:'application/javascript',body:`window.QUESTION_BANK=${JSON.stringify(bank)}`}));
  await page.goto('/');await begin(page);await answer(page,true);
  expect((await goals(page)).filter(g=>g.event==='cheatsheet_open')).toEqual([{event:'cheatsheet_open',params:{section:'exam',topic:'Analytics control'}}]);
  await page.click('#detailButton');expect((await goals(page)).filter(g=>g.event==='cheatsheet_open')).toHaveLength(1);
  await page.click('#detailButton');expect((await goals(page)).filter(g=>g.event==='cheatsheet_open')).toHaveLength(2);
 });
 test('section page opens once; reload is an open, history restoration is not',async({page})=>{
  for(const [path,event] of [['/ipv4.html','ipv4_open'],['/ipv6.html','ipv6_open'],['/cli/','cli_open'],['/cli/read.html','cli_open']]){
   await page.goto(path);expect(await goals(page)).toEqual([{event,params:{}}]);await page.reload();expect(await goals(page)).toEqual([{event,params:{}}]);
   await page.goto('/');await page.goBack();expect(await goals(page)).toEqual([]);await page.goForward();expect(await goals(page)).toEqual([]);
  }
 });
 test('central init, privacy settings, clean hit, allowlist and duplicate bootstrap',async({page})=>{
  await page.goto('/?private_query=do-not-collect#private-fragment');
  const initial=await page.evaluate(()=>window.__ymCalls);expect(initial.filter(c=>c[1]==='init')).toHaveLength(1);
  expect(initial[0][2]).toEqual({defer:true,webvisor:false,clickmap:false,trackLinks:false,accurateTrackBounce:false,trackHash:false,ecommerce:false,childIframe:false,sendTitle:false});
  expect(initial.find(c=>c[1]==='hit')).toEqual([123456789,'hit','http://127.0.0.1:4173/',{title:'',referer:''}]);
  await page.addScriptTag({url:'/analytics/analytics.js'});
  expect(await page.locator('script[data-site-metrica]').count()).toBe(1);expect(await page.locator('#analyticsNotice').count()).toBe(1);
  expect(await page.evaluate(()=>window.__ymCalls.filter(c=>c[1]==='init').length)).toBe(1);
  await page.evaluate(()=>{
   for(const name of ['feedback_submit','troubleshooting_open','pro_interest','b2b_interest','invented_event'])window.SiteAnalytics.trackEvent(name,{email:'secret'});
   window.SiteAnalytics.trackEvent('exam_start',{mode:'l3',email:'secret',answers:['secret']});
   window.SiteAnalytics.trackEvent('exam_start',{mode:'private-user-input'});
   window.SiteAnalytics.trackEvent('exam_complete',{mode:'l3',score:7,total:10,percent:70,passed:true});
  });
  expect(await goals(page)).toEqual([{event:'exam_start',params:{mode:'l3'}}]);
 });
 for(const failure of ['ym absent','ym throws','network offline'])test(`SDK failure: ${failure} leaves exam and trainers usable`,async({page,context})=>{
  await fixture(page);await page.goto('/');await page.evaluate(f=>{if(f==='ym absent')delete window.ym;else if(f==='ym throws')window.ym=()=>{throw new Error('Synthetic SDK failure')}},failure);
  if(failure==='network offline')await context.setOffline(true);
  await begin(page);for(let i=0;i<10;i++){await answer(page,true);await page.click('#nextButton')}await expect(page.locator('#resultScore')).toHaveText('10 из 10');
  for(const v of [4,6]){await context.setOffline(false);await page.goto(`/ipv${v}.html`);if(failure==='network offline')await context.setOffline(true);await page.evaluate(()=>{delete window.ym});await page.locator('#answers input').first().fill('1');await page.click('#check');await expect(page.locator('#feedback')).toBeVisible()}
  await context.setOffline(false);await page.goto('/cli/');if(failure==='network offline')await context.setOffline(true);await page.selectOption('#vendor','Cisco');await expect(page.locator('#results .card').first()).toBeVisible();
 });
 test('blocked tag stops analytics but leaves application working',async({page})=>{
  page.expectedBlockedSDK=true;await page.route('https://mc.yandex.ru/**',r=>r.abort('failed'));await fixture(page);await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>window.SiteAnalytics.trackEvent('training_open'))).toBe(false);
  await begin(page);await answer(page,true);await page.click('#nextButton');await expect(page.locator('#questionNumber')).toHaveText('Вопрос 2 из 10');
 });
});
test('disabled config makes no SDK requests, goals or notice; existing sections work',async({page})=>{
 let requests=0;page.on('request',r=>{if(r.url().includes('mc.yandex.ru'))requests++});
 await fixture(page);await page.goto('/');expect(await page.evaluate(()=>window.SiteAnalytics.enabled)).toBe(false);await begin(page);await answer(page,true);await page.click('#nextButton');
 await page.click('#learnNav');await page.locator('[data-notes="1"]').click();await page.click('#closeNotes');
 for(const path of ['/ipv4.html','/ipv6.html','/cli/','/cli/read.html']){await page.goto(path);expect(await goals(page)).toEqual([]);await expect(page.locator('#analyticsNotice')).toHaveCount(0)}
 expect(requests).toBe(0);
});
test('blocked local analytics module does not affect product grading',async({page})=>{
 await page.route('**/analytics/analytics.js',r=>r.fulfill({contentType:'application/javascript',body:'/* analytics unavailable */'}));await fixture(page);await page.goto('/');
 expect(await page.evaluate(()=>typeof window.SiteAnalytics)).toBe('undefined');await begin(page);for(let i=0;i<10;i++){await answer(page,true);await page.click('#nextButton')}await expect(page.locator('#resultScore')).toHaveText('10 из 10');
});
