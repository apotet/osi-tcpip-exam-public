const {test,expect}=require('./test-fixture.cjs');
const {spawnSync}=require('node:child_process');
function oracle(src,prefix,dst=src){const p=spawnSync('python3',['audit/ipv4-oracle.py'],{input:JSON.stringify([{src,prefix,dst}]),encoding:'utf8'});if(p.status!==0)throw Error(p.stderr);return JSON.parse(p.stdout)[0]}
async function expected(page,mode){const prompt=await page.locator('#question').innerText(),addresses=prompt.match(/(?:\d{1,3}\.){3}\d{1,3}/g),prefix=Number(prompt.match(/\/(\d+)/)[1]);const o=oracle(addresses[0],prefix,addresses[mode==='same'?1:2]||addresses[0]);return{values:mode==='full'?[o.network,o.broadcast,o.first,o.last]:mode==='same'?[o.same?'да':'нет']:mode==='gateway'?[o.delivery==='direct'?'напрямую':'шлюз']:[o[mode]],o}}
async function fill(page,values){for(const [i,value]of values.entries())await page.locator('#answers input').nth(i).fill(value)}
async function layout(page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
for(const mode of ['broadcast','first','last','full','same','gateway'])test(`Stage3 ${mode}: oracle, Enter check/next, repeat and restart`,async({page})=>{
 await page.goto('/ipv4.html');await page.click(`[data-mode="${mode}"]`);
 for(let i=0;i<10;i++){
  await page.locator('#a').focus();await page.keyboard.press('Enter');await expect(page.locator('#feedback')).toBeHidden();await expect(page.locator('#inputStatus')).toHaveText('Заполни все поля ответа.');
  const {values,o}=await expected(page,mode);await fill(page,values);await page.keyboard.press('Enter');await expect(page.locator('#feedback')).toHaveClass(/good/);
  if(mode==='same')await expect(page.locator('#feedback')).toContainText(`network B = ${o.networkB}`);
  if(mode==='gateway')await expect(page.locator('#feedback')).toContainText(`network(dst) = ${o.networkB}`);
  await page.locator('#check').evaluate(b=>{b.click();b.click()});await expect(page.locator('#doneStat')).toHaveText(String(i+1));await layout(page);
  // Holding Enter must not advance; only a fresh key press does.
  await page.locator('#a').dispatchEvent('keydown',{key:'Enter',repeat:true});await expect(page.locator('#round')).toHaveText(`Задание ${i+1} из 10`);
  await page.keyboard.press('Enter');
 }
 await expect(page.locator('#question')).toContainText('10 из 10');await page.locator('#next').evaluate(b=>{b.click();b.click()});await expect(page.locator('#question')).toContainText('10 из 10');
 await page.keyboard.press('Enter');await expect(page.locator('#round')).toHaveText('Задание 1 из 10');await expect(page.locator('#score')).toHaveText('0 верно');await expect(page.locator('#doneStat')).toHaveText('10');
});
test('Stage3 format, numpad, tap choices and stable input on viewport resize',async({page})=>{
 await page.goto('/ipv4.html');await page.click('[data-mode="first"]');await page.locator('#a').fill('999.2.3.4');await page.keyboard.press('Enter');await expect(page.locator('#feedback')).toHaveClass(/bad/);await expect(page.locator('#a')).toHaveAttribute('aria-invalid','true');await page.keyboard.press('Enter');
 await page.locator('#a').fill('');await page.locator('#a').focus();await page.locator('#a').dispatchEvent('keydown',{key:'1',code:'Numpad1',location:3});await page.keyboard.insertText('1');await expect(page.locator('#a')).toHaveValue('1');await page.locator('#a').dispatchEvent('keydown',{key:'.',code:'NumpadDecimal',location:3});await page.keyboard.insertText('.');await expect(page.locator('#a')).toHaveValue(/1[.,]/);
 const {values}=await expected(page,'first');await fill(page,values);await page.locator('#a').evaluate(el=>el.dataset.retained='yes');const view=page.viewportSize();await page.setViewportSize({width:view.width,height:400});await layout(page);await expect(page.locator('#a')).toBeFocused();await expect(page.locator('#a')).toHaveValue(values[0]);await page.keyboard.press('Enter');await page.keyboard.press('Enter');await expect(page.locator('#a')).toHaveAttribute('data-retained','yes');await expect(page.locator('#a')).toBeFocused();await page.setViewportSize(view);
 for(const mode of ['same','gateway']){await page.click(`[data-mode="${mode}"]`);const {o}=await expected(page,mode);await page.locator(`.choice[data-value="${mode==='same'?(o.same?'yes':'no'):o.delivery}"]`).click();await page.click('#check');await expect(page.locator('#feedback')).toHaveClass(/good/);await page.click('#next');await layout(page)}
});
test('Stage3 home links share style, text, target and keyboard navigation',async({page})=>{
 let style;
 for(const path of ['/ipv4.html','/ipv6.html','/cli/']){
  await page.goto(path);const link=page.locator('a.home-link');await expect(link).toHaveText('← На главную');const css=await link.evaluate(el=>{const s=getComputedStyle(el);return[s.padding,s.border,s.borderRadius,s.color,s.backgroundColor,s.font,s.minHeight]});if(style)expect(css).toEqual(style);style=css;await layout(page);await link.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/\/index.html$/);
 }
});
test.describe('Stage3 metrics',()=>{
 test.use({analyticsEnabled:true});
 test('one start and complete with bounded parameters; restart starts again',async({page})=>{
  await page.addInitScript(()=>{window.__stage3Calls=[];window.ym=(...a)=>window.__stage3Calls.push(a)});await page.goto('/ipv4.html');await page.click('[data-mode="same"]');
  for(let i=0;i<10;i++){await fill(page,(await expected(page,'same')).values);await page.keyboard.press('Enter');await page.locator('#check').evaluate(b=>b.click());await page.keyboard.press('Enter')}
  const goals=()=>page.evaluate(()=>window.__stage3Calls.filter(a=>a[1]==='reachGoal').map(a=>({event:a[2],params:a[3]})));
  expect(await goals()).toEqual([{event:'ipv4_open',params:{}},{event:'ipv4_mode_start',params:{mode:'same',score:0,total:10,percent:0}},{event:'ipv4_mode_complete',params:{mode:'same',score:10,total:10,percent:100}}]);await page.click('#restart');expect((await goals()).filter(g=>g.event==='ipv4_mode_start')).toHaveLength(2);
 });
});
test.describe('Stage3 mobile input',()=>{
 test.use({hasTouch:true});
 test('Stage3 iPhone and Android widths: touch targets, input modes and button Enter',async({page})=>{
 for(const width of [360,375,390,412,430]){
  await page.setViewportSize({width,height:915});await page.goto('/ipv4.html');await page.locator('[data-mode="full"]').tap();await layout(page);
  const targets=await page.locator('.mode,.choice,.bit,.chip,#check,a.home-link').evaluateAll(els=>els.map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})));expect(targets.every(t=>t.height>=44)).toBe(true);
  await expect(page.locator('#a')).toHaveAttribute('inputmode','url');const {values}=await expected(page,'full');await fill(page,values);await page.locator('#check').focus();await page.keyboard.press('Enter');await expect(page.locator('#feedback')).toHaveClass(/good/);await page.locator('#next').focus();await page.keyboard.press('Enter');await expect(page.locator('#round')).toHaveText('Задание 2 из 10');await expect(page.locator('#feedback')).toBeHidden();await layout(page);
  await page.locator('[data-mode="cidr"]').click();await expect(page.locator('#a')).toHaveAttribute('inputmode','numeric');
 }
});

});
