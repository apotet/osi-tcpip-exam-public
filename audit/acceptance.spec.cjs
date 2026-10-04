const {test,expect}=require('./test-fixture.cjs');
const fixtures=Array.from({length:10},(_,i)=>({id:`audit-${i}`,group:'l1-l2',topic:'Acceptance control',text:`Control ${i}`,answers:['A','B','C','D'],correct:i%2?[0,2]:[0],explanation:'Synthetic acceptance fixture; not published content.'}));
async function setup(page){
  await page.route('**/quiz/questions.js',r=>r.fulfill({contentType:'application/javascript',body:`window.QUESTION_BANK=${JSON.stringify(fixtures)};`}));
  await page.addInitScript(()=>{Math.random=()=>0;});
  await page.goto('/');
}
async function start(page){await page.selectOption('#modeSelect','l1-l2');await page.click('#startButton');}
const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('osiQuizStats')));
test.beforeEach(async({page})=>{
  page.errors=[];page.on('pageerror',e=>page.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')page.errors.push(m.text());});
});
test.afterEach(async({page})=>expect(page.errors).toEqual([]));
for(const goal of [0,7,8,10])test(`known single/multiple answers, empty/repeat and final ${goal}/10`,async({page})=>{
  await setup(page);await start(page);
  for(let i=0;i<10;i++){
    const n=Number((await page.locator('#questionText').textContent()).split(' ')[1]);
    const correct=fixtures[n].correct,ok=i<goal;
    await expect(page.locator('#checkButton')).toBeDisabled();
    await expect(page.locator('#feedback')).not.toBeVisible();
    const before=await read(page);expect(before.questions[`audit-${n}`].correct+before.questions[`audit-${n}`].wrong).toBe(0);
    // Wrong multi answers exercise partial, extra and disjoint sets, not only a wrong radio.
    const chosen=ok?correct:correct.length===1?[1]:i%3===0?[0]:i%3===1?[0,2,3]:[1];
    for(const value of chosen)await page.locator(`#answersForm label`).filter({has:page.locator(`input[value="${value}"]`)}).click();
    await page.click('#checkButton');await expect(page.locator('#feedback')).toHaveClass(ok?/good/:/bad/);
    await expect(page.locator('#scoreMini')).toHaveText(`${Math.min(i+1,goal)} ✓`);
    const graded=await read(page);expect(graded.questions[`audit-${n}`].correct).toBe(ok?1:0);expect(graded.questions[`audit-${n}`].wrong).toBe(ok?0:1);
    await page.locator('#checkButton').evaluate(b=>{b.dispatchEvent(new Event('click'));b.dispatchEvent(new Event('click'));});
    expect(await read(page)).toEqual(graded);await page.click('#nextButton');
  }
  await expect(page.locator('#resultScore')).toHaveText(`${goal} из 10`);
  await expect(page.locator('#resultStatus')).toHaveText(goal>=8?'Экзамен сдан':'Пока не зачёт');
  const stats=await read(page);expect(stats.attempts).toHaveLength(1);expect(stats.attempts[0].score).toBe(goal);
  expect(Object.values(stats.questions).reduce((s,q)=>s+q.seen,0)).toBe(10);
  await page.reload();expect(await read(page)).toEqual(stats);
  await page.click('#statsButton');await expect(page.locator('#statsContent')).toContainText(`${goal}/10`);
  await page.evaluate(()=>localStorage.setItem('acceptance-unrelated','keep'));
  page.once('dialog',d=>d.dismiss());await page.click('#clearStats');expect(await read(page)).toEqual(stats);
  page.once('dialog',d=>d.accept());await page.click('#clearStats');expect(await read(page)).toBeNull();
  expect(await page.evaluate(()=>localStorage.getItem('acceptance-unrelated'))).toBe('keep');
  await page.reload();expect(await read(page)).toBeNull();
});
test('cancel exit preserves active attempt; accepted exit does not save partial score',async({page})=>{
  await setup(page);await start(page);const saved=await read(page);
  page.once('dialog',d=>d.dismiss());await page.click('#exitButton');await expect(page.locator('#quizScreen')).toBeVisible();expect(await read(page)).toEqual(saved);
  page.once('dialog',d=>d.accept());await page.click('#exitButton');await expect(page.locator('#startScreen')).toBeVisible();expect((await read(page)).attempts).toEqual([]);
});
test('malformed statistics recover, trainer numeric bounds and CLI preferences',async({page})=>{
  await setup(page);
  for(const raw of ['{bad','null','[]',JSON.stringify({attempts:[null,{mode:'mixed',score:'8'}],questions:[]}),JSON.stringify({attempts:[],questions:Object.fromEntries(fixtures.map(q=>[q.id,{seen:-1,correct:'bad',wrong:-1,streak:null}]))})]){
    await page.evaluate(raw=>localStorage.setItem('osiQuizStats',raw),raw);await page.reload();await start(page);
    const s=await read(page);expect(s.attempts).toEqual([]);const n=Number((await page.locator('#questionText').textContent()).split(' ')[1]);expect(s.questions[`audit-${n}`]).toMatchObject({seen:1,correct:0,wrong:0,streak:0});
    page.once('dialog',d=>d.accept());await page.click('#exitButton');
  }
  for(const v of [4,6]){
    await page.goto(`/ipv${v}.html`);
    for(const [raw,expected] of [['{bad',[0,0,'0/10']],['null',[0,0,'0/10']],[JSON.stringify({done:2,right:99,best:99}),[2,2,'10/10']],[JSON.stringify({done:-1,right:'2',best:1.5}),[0,0,'0/10']]]){
      await page.evaluate(({v,raw})=>localStorage.setItem(`ipv${v}TrainerStats`,raw),{v,raw});await page.reload();
      for(const [i,id] of ['doneStat','rightStat','bestStat'].entries())await expect(page.locator(`#${id}`)).toHaveText(String(expected[i]));
    }
  }
  await page.goto('/cli/');await page.evaluate(()=>{localStorage.setItem('netcli-vendor','"unknown"');localStorage.setItem('netcli-favorites','{}');});await page.reload();
  await expect(page.locator('#vendor')).toHaveValue('SCALANCE');await page.selectOption('#kind','favorites');await expect(page.locator('#results .empty')).toBeVisible();
  await page.evaluate(()=>{localStorage.setItem('netcli-vendor','{bad');localStorage.setItem('netcli-favorites','{bad');});await page.reload();await expect(page.locator('#vendor')).toHaveValue('SCALANCE');
});
for(const v of [4,6])test(`IPv${v} known correct/wrong, empty/repeat, score and persisted statistics`,async({page})=>{
  await page.addInitScript(()=>{Math.random=()=>0;});await page.goto(`/ipv${v}.html`);
  for(let i=0;i<10;i++){
    await page.click('#check');await expect(page.locator('#feedback')).not.toBeVisible();await expect(page.locator('#doneStat')).toHaveText(String(i));
    await page.locator('#answers input').first().fill(i<8?(v===4?'255.0.0.0':'2001:db8::42'):'wrong');await page.click('#check');
    await expect(page.locator('#feedback')).toHaveClass(i<8?/good/:/bad/);
    await page.locator('#check').evaluate(b=>b.dispatchEvent(new Event('click')));await expect(page.locator('#doneStat')).toHaveText(String(i+1));await page.click('#next');
  }
  await expect(page.locator('#question')).toContainText('8 из 10');await expect(page.locator('#feedback')).toHaveClass(/good/);
  await expect(page.locator('#bestStat')).toHaveText('8/10');await page.click('#restart');await expect(page.locator('#doneStat')).toHaveText('10');
  await page.reload();await expect(page.locator('#doneStat')).toHaveText('10');await expect(page.locator('#rightStat')).toHaveText('8');await expect(page.locator('#bestStat')).toHaveText('8/10');
});
test('CLI vendor and favorites persist and favorite removal persists',async({page})=>{
  await page.goto('/cli/');await page.selectOption('#vendor','Cisco');
  const card=page.locator('#results .card').first();await card.evaluate(c=>c.open=true);
  const favorite=card.locator('[data-favorite]');await favorite.waitFor();const id=await favorite.getAttribute('data-favorite');await favorite.click();
  await page.reload();await expect(page.locator('#vendor')).toHaveValue('Cisco');await page.selectOption('#kind','favorites');
  const saved=page.locator(`#results .card[data-id="${id}"]`);await expect(saved).toBeVisible();await saved.evaluate(c=>c.open=true);await saved.locator('[data-favorite]').click();
  await page.reload();await page.selectOption('#kind','favorites');await expect(page.locator('#results .empty')).toBeVisible();
});
test('denied localStorage keeps exam, trainers and CLI usable',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Acceptance storage denial','SecurityError');}}));
  await setup(page);await start(page);
  for(let i=0;i<10;i++){await page.locator('#answersForm label').filter({has:page.locator('input[value="0"]')}).click();await page.click('#checkButton');await page.click('#nextButton');}
  await expect(page.locator('#resultScreen')).toBeVisible();await page.click('#statsButton');page.once('dialog',d=>d.accept());await page.click('#clearStats');
  for(const v of [4,6]){await page.goto(`/ipv${v}.html`);await page.locator('#answers input').first().fill(v===4?'255.0.0.0':'2001:db8::42');await page.click('#check');await expect(page.locator('#feedback')).toHaveClass(/good/);}
  await page.goto('/cli/');await page.selectOption('#vendor','Cisco');await expect(page.locator('#results .card').first()).toBeVisible();
});
