'use strict';
const api=PacketJourney,visual=JourneyScene,$=id=>document.getElementById(id),key='packet-journey-prototype-v1';
let state={mode:'Разобраться',step:0,answers:{},fixed:[]},saved=true,checks=[],fault='mask',lastCheck=null;
try{const s=JSON.parse(localStorage.getItem(key));if(s&&Number.isInteger(s.step)&&s.step>=0&&s.step<9&&['Разобраться','Попробовать','Исправить'].includes(s.mode))state={...state,...s,answers:s.answers&&typeof s.answers==='object'?s.answers:{},fixed:Array.isArray(s.fixed)?s.fixed:[]};}catch{saved=false;}
state.maskCase=api.maskState(state.maskCase,state.fixed.includes('mask'));
function displayStep(){return state.mode==='Исправить'&&fault==='mask'&&['checking','verified'].includes(state.maskCase.phase)?state.maskCase.replayStep:state.step;}
function replaying(){return state.mode==='Исправить'&&fault==='mask'&&state.maskCase.phase==='checking';}
function maskEvent(event){state.maskCase=api.maskTransition(state.maskCase,event);if(state.maskCase.phase==='verified'&&!state.fixed.includes('mask'))state.fixed.push('mask');render(event.type==='ping'||event.type==='advance');}
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{saved=false;}}
function node(tag,text,parent){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(parent)parent.append(n);return n;}
function button(text,parent,fn){const b=node('button',text,parent);b.type='button';b.onclick=fn;return b;}
function svg(tag,attrs,parent,text){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs||{}))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;if(parent)parent.append(n);return n;}
const narrow=matchMedia('(max-width:600px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
const names={pc:'ПК',switch:'Коммутатор',router:'Маршрутизатор',server:'Сервер'};
const icons={pc:'M-25-22h50v32h-50z M0 10v12 M-15 23h30',switch:'M-29-12h58v28h-58z M-20 0h8 M-5 0h8 M10 0h8 M-20 8h8 M-5 8h8 M10 8h8',router:'M-27-17h54v36h-54z M-17-6h34 M-12-11l-5 5 5 5 M12 1l5-7-5-5 M-17 10h34',server:'M-22-28h44v55h-44z M-16-16h32 M-16-4h32 M-16 8h32 M12 19h4'};
function answer(choice){state.answers[state.step]=choice;render(true);}
function draw(pending=false,animate=false){
 const mobile=narrow.matches,W=mobile?330:1000,H=mobile?480:300,points=mobile?{pc:[70,76],switch:[70,179],router:[70,288],server:[70,413]}:{pc:[100,145],switch:[350,145],router:[625,145],server:[890,145]};
 const root=$('scene');root.replaceChildren();const s=svg('svg',{viewBox:`0 0 ${W} ${H}`,role:'group','aria-label':'ПК — коммутатор — маршрутизатор — сервер'},root);
 svg('rect',{x:5,y:5,width:mobile?320:622,height:mobile?280:282,rx:18,class:'region'},s);svg('rect',{x:mobile?5:638,y:mobile?302:5,width:mobile?320:357,height:mobile?174:282,rx:18,class:'region second'},s);
 svg('text',{x:18,y:25,class:'network'},s,'LAN · 192.168.1.0/24');svg('text',{x:mobile?150:700,y:mobile?470:25,class:'network'},s,'192.168.2.0/24');
 const i=displayStep(),info=visual.scenes[i],isFault=state.mode==='Исправить'&&!replaying()&&!(fault==='mask'&&state.maskCase.phase==='verified'),q=visual.question(state.step),stop=isFault?(fault==='mask'?(state.maskCase.phase==='broken'&&state.maskCase.facts.some(x=>x==='config'||x==='route')?'pc':null):visual.stop(fault,lastCheck)):null;
 ['pc','switch','router'].forEach((id,i)=>{const to=['switch','router','server'][i],a=points[id],b=points[to];svg('path',{d:`M${a[0]} ${a[1]} L${b[0]} ${b[1]}`,class:'wire'+(!pending&&!isFault&&info.route.includes(id)&&info.route.includes(to)?' active':'')},s);});
 for(const [id,[x,y]]of Object.entries(points)){
 const active=!pending&&!isFault&&id===info.at;const choice=pending&&q?.nodes&&Object.hasOwn(q.nodes,id);
 const g=svg('g',{transform:`translate(${x} ${y})`,class:(active?'active ':'')+(stop===id?'stopped ':'')+(choice?'device-choice':''),'data-device':id},s);
 if(choice){g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',names[id]);g.onclick=()=>answer(q.nodes[id]);g.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();answer(q.nodes[id]);}};}
 if(choice)svg('rect',{x:-34,y:-34,width:mobile?220:140,height:90,fill:'transparent','pointer-events':'all'},g);
 svg('path',{d:icons[id],class:'device-icon'},g);svg('text',{x:mobile?43:0,y:mobile?-16:47,'text-anchor':mobile?'start':'middle',class:'scene-label'},g,names[id]);
 const tx=mobile?x+43:x,anchor=mobile?'start':'middle',ty=mobile?y+2:y+66;
 const maskLabel=state.mode==='Исправить'&&fault==='mask'?(state.maskCase.phase!=='broken'?'192.168.1.10 /24 · исправлено':state.maskCase.facts.includes('config')?'192.168.1.10 /16 · план /24':'192.168.1.10 · маска ?'):'192.168.1.10 /24';
 const lines=id==='pc'?[maskLabel,'шлюз 192.168.1.1']:id==='server'?['192.168.2.20 /24','шлюз 192.168.2.1']:id==='router'?['LAN 192.168.1.1 /24','WAN 192.168.2.1 /24']:['Одна VLAN · L2'];
 lines.forEach((t,i)=>svg('text',{x:tx,y:ty+i*15,'text-anchor':anchor,class:'small'},s,t));
 const cache=!pending&&!isFault?api.cacheAt(i)[id==='router'?'router':id]:null;
 if(cache){const rows=cache.split('; ');rows.forEach((t,i)=>svg('text',{x:mobile?113:x,y:mobile?y+33+i*12:y+105+i*12,'text-anchor':anchor,class:'cache'},s,'ARP '+t));}
 }
 if(i===0&&!isFault){svg('text',{x:mobile?113:280,y:mobile?131:275,class:'compare'},s,'192.168.1 ≠ 192.168.2 → шлюз');}
 if(pending){svg('text',{x:mobile?113:400,y:mobile?242:95,class:'compare'},s,'? Прогноз до отправки');}
 else if(isFault){svg('text',{x:mobile?113:280,y:mobile?240:85,class:'compare'},s,stop?'Остановка здесь · по проверке':'Место остановки ещё неизвестно');}
 else if(i>0){const [x,y]=points[info.at],bx=mobile?112:Math.min(760,Math.max(8,x-110)),by=mobile?Math.max(30,y-75):40;svg('rect',{x:bx,y:by,width:mobile?205:230,height:info.say.length*17+14,rx:9,class:'bubble'},s);info.say.forEach((t,i)=>svg('text',{x:bx+8,y:by+19+i*17,class:'bubble-text'},s,t));}
 if(!pending&&!isFault&&info.route.length){const f=api.steps[i].frame,type=f.ARP?.operation,kind=type==='Request'?'request':type==='Reply'?'reply':'icmp';const packet=svg('g',{'data-packet':kind},s);svg('rect',{x:-32,y:-12,width:64,height:24,rx:type==='Request'?3:12,class:'packet '+kind},packet);svg('text',{x:0,y:4,'text-anchor':'middle',class:'packet-label'},packet,type==='Request'?'ARP ?':type==='Reply'?'ARP ✓':f.ICMP.type===8?'ping →':'reply ←');
 const route=info.route.map(id=>points[id]),end=route.at(-1);packet.style.transform=`translate(${end[0]}px,${end[1]}px)`;
 if(animate&&!reduced.matches)packet.animate(route.map(([x,y])=>({transform:`translate(${x}px,${y}px)`})),{duration:900,easing:'ease-in-out'});
 }
}
function frame(pending){const host=$('frame');host.replaceChildren();const step=displayStep(),f=api.steps[step].frame;host.hidden=pending||!f||(state.mode==='Исправить'&&!replaying()&&!(fault==='mask'&&state.maskCase.phase==='verified')); if(host.hidden)return;
 if([4,6,8].includes(step)){const r=node('div',undefined,host);r.className='routing';node('span','На маршрутизаторе',r);node('b','Ethernet: снять → новый заголовок',r);node('b','TTL 64 → 63',r);node('span','IP-адреса сохранены · NAT нет',r).className='same';}
 node('h3',f.ARP?'ARP · '+(f.ARP.operation==='Request'?'запрос · broadcast':'ответ · unicast'):'ICMP · '+(f.ICMP.type===8?'Echo Request':'Echo Reply'),host);
 const grid=node('div',undefined,host);grid.className='frame-grid';
 const prevIP=api.steps.slice(0,step).reverse().find(s=>s.frame?.IP)?.frame.IP;
 for(const [label,value,changed,note] of [['MAC откуда',f.Ethernet.source,step===6||step===8,'Новый Ethernet'],['MAC куда',f.Ethernet.destination,step===6||step===8,'Новый следующий узел'],['IP откуда',f.IP?.source,false,prevIP?.source===f.IP?.source?'Сохранён':''],['IP куда',f.IP?.destination,false,prevIP?.destination===f.IP?.destination?'Сохранён':''],['TTL',f.IP?.TTL,step===6||step===8,'64 → 63']]){const c=node('div',undefined,grid);c.className='field';node('strong',label,c);const v=node('span',value===undefined?'— (ARP без IP)':String(value),c);if(changed){v.className='change';node('small',note,v);}else if(note&&value!==undefined)node('small',note,c).className='same';}
 const d=node('details',undefined,host);node('summary','Полные поля кадра',d);for(const [layer,fields]of Object.entries(f)){if(!fields)continue;node('h4',layer,d);const dl=node('dl',undefined,d);for(const [k,v]of Object.entries(fields)){node('dt',k,dl);node('dd',String(v),dl);}}
}
function render(animate=false){save();$('save').textContent=saved?'Прогресс сохранён в этом браузере отдельно от курса.':'Сохранение недоступно: прогресс только до перезагрузки.';$('modes').replaceChildren();for(const mode of ['Разобраться','Попробовать','Исправить']){const b=button(mode,$('modes'),()=>{state.mode=mode;render();});b.setAttribute('aria-pressed',state.mode===mode);}
 const pending=state.mode==='Попробовать'&&!!visual.question(state.step)&&!Object.hasOwn(state.answers,state.step),q=visual.question(state.step);$('prompt').replaceChildren();
 if(pending){node('strong',q.text,$('prompt'));if(q.choices)q.choices.forEach((t,i)=>button(t,$('prompt'),()=>answer(i)));}
 else if(state.mode==='Попробовать'&&q){node('p',(api.grade(state.step,state.answers[state.step])?'Верно. ':'Пока неверно. ')+api.steps[state.step].text,$('prompt'));}
 $('position').textContent=`${state.step+1} / 9 · ${api.steps[state.step].title}`;$('next').textContent=state.step===0?'Отправить':'Следующий шаг';$('next').disabled=pending||state.step===8;$('back').disabled=state.step===0;for(const id of ['next','back','restart','position'])$(id).hidden=state.mode==='Исправить';draw(pending,animate);frame(pending);$('repair').hidden=state.mode!=='Исправить';if(state.mode==='Исправить')renderFault();syncConditions();}
function renderMask(host){
 const c=state.maskCase;
 node('p',c.phase==='broken'?'Одна неисправность. Сравни фактическую конфигурацию ПК с планом. Маршрут и ARP объясняют механизм, но не обязательны.':c.phase==='verified'?'Связь восстановлена: контрольный Echo Reply доставлен ПК.':'Маска ПК /24. Исправление применено; завершение — после контрольного ping.',host);
 const actions=node('div',undefined,host);
 for(const [id,label]of Object.entries({ping:'Ping',config:'Сверить адреса и маски',route:'Маршрут и ARP',link:'Порты и консоль шлюза'}))button(label,actions,()=>maskEvent({type:'check',id}));
 const out=node('div',undefined,host);out.className='checks';if(c.results.length)node('h3','Факты и история проверок',out);for(const text of c.results)node('p',text,out);
 const result=node('p',c.message|| (c.phase==='broken'?'Нужно получить данные: сверь конфигурацию ПК с планом.':c.phase==='verified'?'Контрольный ping успешен. Случай завершён.':'Исправлено, проверь связь.'),host);result.setAttribute('role','status');
 if(c.phase==='broken')for(const [id,item]of Object.entries(api.faults))button(item.fix,host,()=>maskEvent({type:'fix',choice:id}));
 if(c.phase==='applied'||c.phase==='verified')button('Повторить ping',host,()=>maskEvent({type:'ping'}));
 if(c.phase==='checking'){node('p',`Контрольный обмен ${c.replayStep+1}/9 · ${api.steps[c.replayStep].title}`,host);button('Следующий шаг обмена',host,()=>maskEvent({type:'advance'}));}
}
function syncConditions(){
 const details=document.querySelector('.model-card');let status=$('faultConditions');if(!status){status=node('p',undefined);status.id='faultConditions';details.prepend(status);}
 const broken=state.mode==='Исправить';details.querySelectorAll('p:not(#faultConditions)').forEach(p=>p.hidden=broken);
 status.hidden=!broken;
 status.textContent=fault==='mask'?(state.maskCase.phase==='broken'?'План: ПК 192.168.1.10/24, шлюз 192.168.1.1; сервер 192.168.2.20/24, шлюз 192.168.2.1. Фактическую маску ПК устанавливает проверка конфигурации. Одна неисправность; порты исправны, NAT и proxy ARP выключены, ICMP разрешён. Начальные ARP пусты. Ограниченная модель без потерь/таймеров; checksum символическая, не вычислена.':'ПК 192.168.1.10/24: маска исправлена, план /24. Шлюзы 192.168.1.1 и 192.168.2.1, сервер 192.168.2.20/24; connected маршруты на маршрутизаторе. Контроль начинается с пустых ARP. ICMP разрешён, NAT и proxy ARP выключены. Ограниченная модель; checksum не вычислена.'):'План: ПК 192.168.1.10/24 и сервер 192.168.2.20/24, шлюзы 192.168.1.1 и 192.168.2.1. Один дефект доступности шлюза: состояние портов устанавливает консольная проверка. Не предполагаем исправность всех линков. ARP пусты, ICMP разрешён, NAT нет; ограниченная модель, checksum не вычислена.';
}
function renderFault(){const host=$('repair');host.replaceChildren();node('h2','Ping не вернулся. Где остановилась передача?',host);for(const [id,label]of [['mask','Случай 1'],['gateway','Случай 2']])button(label+(state.fixed.includes(id)?' ✓':''),host,()=>{fault=id;checks=[];lastCheck=null;render();});if(fault==='mask'){renderMask(host);return;}const f=api.faults[fault];node('p','Одна неисправность. Начальные ARP пусты. Выбери проверку и сопоставь её результат со схемой.',host);const actions=node('div',undefined,host),out=node('div',undefined,host);out.className='checks';out.setAttribute('role','status');for(const [id,label]of Object.entries({ping:'Ping',config:'Сверить адреса и маски',route:'Маршрут и ARP',link:'Порты и консоль шлюза'}))button(label,actions,()=>{if(!checks.includes(id))checks.push(id);lastCheck=id;node('p',f.checks[id],out);draw();});const result=node('p','Исправление требует подтверждающих проверок.',host);result.setAttribute('role','status');for(const [id,item]of Object.entries(api.faults))button(item.fix,host,()=>{const ok=api.repair(fault,checks,id);result.textContent=ok?'Исправлено. '+f.explain:'Причина не подтверждена. Продолжи проверки или выбери другое исправление.';if(ok){if(!state.fixed.includes(fault))state.fixed.push(fault);save();button('Проиграть исправный обмен',host,()=>{state.mode='Разобраться';state.step=0;render();});}});}
$('next').onclick=()=>{state.step=Math.min(8,state.step+1);render(true);};$('back').onclick=()=>{state.step=Math.max(0,state.step-1);render();};$('restart').onclick=()=>{state.step=0;state.answers={};render();};
const definitions={ARP:'ARP узнаёт MAC локального следующего узла по его IPv4. Запрос не проходит через маршрутизатор.',MAC:'MAC — адрес интерфейса в Ethernet-кадре. На каждом маршрутизируемом участке заголовок создаётся заново.',TTL:'TTL — оставшееся число переходов. Маршрутизатор уменьшает его на 1; коммутатор — нет.',Подсеть:'При /24 первые три октета — сетевая часть. 192.168.1 и 192.168.2 различаются: нужен шлюз.',Ethernet:'Ethernet-кадр несёт пакет по одному L2-сегменту к MAC следующего узла.'};document.querySelectorAll('[data-term]').forEach(b=>b.onclick=()=>{$('definition').hidden=false;$('definition').textContent=definitions[b.dataset.term];});narrow.addEventListener('change',()=>draw(state.mode==='Попробовать'&&!!visual.question(state.step)&&!Object.hasOwn(state.answers,state.step)));render();
