'use strict';
const a=DnsTcp,$=id=>document.getElementById(id);
let mode='Разобраться',step=0,answers={},fault='dns',cases={dns:a.makeCase('dns'),filter:a.makeCase('filter')},animations=[];
function el(tag,text,parent){const n=document.createElement(tag);n.textContent=text;if(parent)parent.append(n);return n;}
function btn(text,parent,fn){const b=el('button',text,parent);b.type='button';b.onclick=fn;return b;}
function svg(tag,attrs,parent,text){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;parent.append(n);return n;}
function change(fn,animate=false){animations.forEach(x=>x.cancel());animations=[];fn();render(animate);}
function draw(i,pending,animate){$('scene').replaceChildren();const root=svg('svg',{viewBox:'0 0 340 270',role:'group','aria-label':i<3?'Этап 1: разрешение имени DNS':'Этап 2: установка TCP-соединения'},$('scene'));const tcp=i>=3;
 svg('text',{x:12,y:22},root,tcp?'2 · TCP-соединение':'1 · Разрешение имени');svg('path',{d:'M85 125 H255',class:'wire'},root);
 const q=a.questions[step];const choose=n=>change(()=>{answers[step]=n;});
 for(const [x,label,sub,choice]of [[75,'Клиент',a.addr.name,tcp?null:1],[265,tcp?'Сервер сайта':'DNS-сервер',tcp?a.addr.ip:a.addr.dns,tcp?1:0]]){const g=svg('g',{},root);svg('rect',{x:x-60,y:80,width:120,height:82,rx:12,class:'node'},g);svg('text',{x,y:110,'text-anchor':'middle'},g,label);svg('text',{x,y:140,'text-anchor':'middle'},g,sub);if(pending&&q.objects&&choice!==null){g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',label);g.onclick=()=>choose(choice);g.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();choose(choice);}};}}
 if(i>0&&!pending){let reverse=i===2||i===4;let label=a.steps[i][0];const g=svg('g',{},root);svg('rect',{x:-48,y:-14,width:96,height:28,rx:9,class:'message'},g);svg('text',{x:0,y:5,'text-anchor':'middle',class:'message-text'},g,(reverse?'← ':'')+label+(!reverse?' →':''));const from=reverse?250:90,to=reverse?90:250;g.style.transform=`translate(${to}px,200px)`;if(animate&&!matchMedia('(prefers-reduced-motion:reduce)').matches)animations.push(g.animate([{transform:`translate(${from}px,200px)`},{transform:`translate(${to}px,200px)`}],{duration:650,easing:'ease-in-out'}));}
 svg('text',{x:170,y:250,'text-anchor':'middle'},root,tcp?(i===5?'TCP-соединение установлено':i===4?'Клиент получил SYN-ACK':i===3?'Ожидаем SYN-ACK':'TCP/443'):'В этом примере · UDP/53');
}
function render(animate=false){const repair=mode==='Исправить',c=cases[fault],i=repair?(c.fixed?c.step:c.facts.tcp&&fault==='filter'?3:c.facts.dns&&fault==='filter'?2:0):step,q=a.questions[step],pending=!repair&&mode==='Попробовать'&&!Object.hasOwn(answers,step);
 $('modes').replaceChildren();for(const m of ['Разобраться','Попробовать','Исправить']){const b=btn(m,$('modes'),()=>change(()=>{mode=m;step=0;answers={};}));b.setAttribute('aria-pressed',m===mode);}
 $('cases').hidden=!repair;$('cases').replaceChildren();for(const [id,label]of [['dns','А · Имя не разрешается'],['filter','Б · TCP/443 недоступен']]){const b=btn(label,$('cases'),()=>change(()=>{fault=id;}));b.setAttribute('aria-pressed',fault===id);}
 const hasIP=repair?c.facts.dns?.revision===c.revision&&(c.fixed||fault==='filter'):i>=2;
 $('bridge').textContent=a.addr.name+' → '+(hasIP?a.addr.ip+' → TCP/443':'IPv4 ещё не получен');draw(pending&&step===2?3:i,pending,animate);if(repair&&!c.fixed&&fault==='filter'&&c.facts.tcp)$('scene').querySelector('svg').lastChild.textContent='SYN → тайм-аут · ответа нет';
 $('thought').textContent=repair?(c.verified?'TCP-соединение установлено. Случай завершён.':c.fixed?'Настройка изменена. Повтори DNS, затем контрольный обмен.':'Выясни причину и восстанови TCP-соединение.'):(pending?q.text:a.steps[i][1]);
 $('prompt').replaceChildren();if(!repair&&mode==='Попробовать'){q.choices.forEach((text,n)=>btn(text,$('prompt'),()=>change(()=>{answers[step]=n;})));if(!pending)el('p',(answers[step]===q.answer?'Верно. ':'Попробуй ещё. ')+q.explain,$('prompt'));}
 if(i===5)el('p','Далее TLS и HTTP: загрузка сайта ещё не проверена.',$('prompt'));
 $('back').hidden=repair;$('back').disabled=i===0;$('back').onclick=()=>change(()=>{step=Math.max(0,step-1);});
 $('next').textContent=repair?'Контрольный обмен: '+(i<5?a.steps[i+1][0]:'готово'):i===2?'К TCP-соединению':i<5?a.steps[i+1][0]:'Готово';
 $('next').disabled=repair?(!c.fixed||c.facts.dns?.revision!==c.revision||i===5):(i===5||mode==='Попробовать'&&answers[step]!==q.answer);
 $('next').onclick=()=>change(()=>{if(repair)cases[fault]=a.advance(cases[fault]);else step=Math.min(5,step+1);},true);
 $('restart').textContent=repair?'Начать случай заново':'Сначала';$('restart').onclick=()=>change(()=>{if(repair)cases[fault]=a.makeCase(fault);else{step=0;answers={};}});
 $('repair').hidden=!repair;$('repair').replaceChildren();if(repair){el('h2',fault==='dns'?'А · Сбой разрешения имени':'Б · DNS работает, TCP/443 недоступен',$('repair'));for(const [key,label]of [['dns','Проверить DNS'],['config','Настройки DNS клиента'],['ping','Ping сервера по IP'],['tcp','Проверить TCP/443'],['filter','Состояние фильтра сервера']])btn(label,$('repair'),()=>change(()=>{cases[fault]=a.check(cases[fault],key);}));const fix=btn(fault==='dns'?'Указать DNS 192.0.2.53':'Разрешить TCP/443 в фильтре',$('repair'),()=>change(()=>{cases[fault]=a.fix(cases[fault]);}));fix.disabled=!a.canFix(c);el('p',c.fixed?'Изменение применено; прежние результаты отмечены как устаревшие.':'Для исправления нужны факты из настроек соответствующего объекта. Все кнопки посещать не требуется.',$('repair'));const facts=el('div','',$('repair'));facts.id='facts';for(const f of Object.values(c.facts)){const stale=f.revision!==c.revision;const p=el('p',(stale?'До изменения · устарело: ':'Текущая проверка: ')+f.value,facts);if(stale)p.className='stale';}}
}
render();
