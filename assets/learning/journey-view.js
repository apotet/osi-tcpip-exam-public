'use strict';
const api=PacketJourney,$=id=>document.getElementById(id),key='packet-journey-prototype-v1';
let state={mode:'Разобраться',step:0,answers:{},fixed:[]},saved=true,checks=[],fault='mask';
try{const s=JSON.parse(localStorage.getItem(key));if(s&&Number.isInteger(s.step)&&s.step>=0&&s.step<api.steps.length&&['Разобраться','Попробовать','Исправить'].includes(s.mode)){state={...state,...s,answers:s.answers&&typeof s.answers==='object'?s.answers:{},fixed:Array.isArray(s.fixed)?s.fixed:[]};}}catch{saved=false;}
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{saved=false;}}
function node(tag,text,parent){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(parent)parent.append(el);return el;}
function button(text,parent,fn){const b=node('button',text,parent);b.type='button';b.onclick=fn;return b;}
function render(){
 save();$('save').textContent=saved?'Прогресс прототипа сохраняется отдельно в этом браузере.':'Сохранение недоступно: прогресс останется только до перезагрузки.';
 $('modes').replaceChildren();for(const mode of ['Разобраться','Попробовать','Исправить']){const b=button(mode,$('modes'),()=>{state.mode=mode;render();});b.setAttribute('aria-pressed',state.mode===mode);}
 $('walk').hidden=state.mode==='Исправить';$('repair').hidden=state.mode!=='Исправить';
 if(state.mode==='Исправить'){renderFault();return;}
 const step=api.steps[state.step],pending=state.mode==='Попробовать'&&step.question&&!Object.hasOwn(state.answers,state.step);
 $('position').textContent=`${state.step+1} / ${api.steps.length} · ${step.title}`;
 $('diagram').replaceChildren();['ПК','Коммутатор','Маршрутизатор','Сервер'].forEach((name,i)=>{const n=node('div',name,$('diagram'));n.className='device'+(!pending&&step.path.includes(name)?' active':'');if(i<3){const l=node('div','↔',$('diagram'));l.className='link'+(!pending&&step.path.includes(name)&&step.path.includes(['Коммутатор','Маршрутизатор','Сервер'][i])?' active':'');}});
 $('explanation').textContent=pending?'Сначала сделайте прогноз. Затем увидите действие и его разбор.':step.text;
 $('prediction').replaceChildren();if(pending){node('h3',step.question[0],$('prediction'));step.question[1].forEach((a,i)=>button(a,$('prediction'),()=>{state.answers[state.step]=i;render();}));}
 else if(state.mode==='Попробовать'&&step.question){node('p',(api.grade(state.step,state.answers[state.step])?'Верно. ':'Пока неверно. ')+`Правильный ответ: ${step.question[1][step.question[2]]}. ${step.text}`,$('prediction'));}
 $('frame').replaceChildren();if(!pending&&step.frame){const d=node('details',undefined,$('frame'));d.open=true;node('summary','Выбранный кадр · раскрыть поля',d);for(const [layer,fields] of Object.entries(step.frame)){node('h4',layer,d);if(!fields){node('p','Отсутствует в этом кадре',d);continue;}const dl=node('dl',undefined,d);for(const [name,value] of Object.entries(fields)){node('dt',name,dl);const v=node('dd',String(value),dl);if(api.steps.slice(0,state.step).reverse().find(s=>s.frame?.[layer])?.frame[layer]?.[name]!==value)v.className='changed';}}}else node('p',pending?'Поля откроются после прогноза.':'Кадр ещё не отправлен.',$('frame'));
 $('arp').textContent=pending?'ARP-состояние будет показано после ответа.':JSON.stringify(api.cacheAt(state.step),null,2)==='{}'?'Все ARP-кэши пусты.':Object.entries(api.cacheAt(state.step)).map(([k,v])=>`${k}: ${v}`).join('\n');
 $('next').disabled=!!pending||state.step===api.steps.length-1;$('back').disabled=state.step===0;
}
function renderFault(){
 const host=$('repair');host.replaceChildren();node('h2','Два независимых расследования',host);node('p','Каждый случай начинается заново: ARP пуст, активна только одна неисправность. ICMP разрешён. Исправленный случай можно повторить.',host);
 for(const [id,f] of Object.entries(api.faults))button(f.title+(state.fixed.includes(id)?' ✓':''),host,()=>{fault=id;checks=[];renderFault();});
 const f=api.faults[fault];node('h3',f.title,host);node('p','Симптом: ПК не получает Echo Reply от сервера. Выберите проверку, прочитайте результат и исправьте причину.',host);
 const output=node('div',undefined,host);output.setAttribute('role','status');const actions=node('div',undefined,host);
 for(const [id,label] of Object.entries({ping:'Ping',config:'Сверить адреса и маски',route:'Маршрут и ARP',link:'Порты и консоль шлюза'}))button(label,actions,()=>{if(!checks.includes(id))checks.push(id);node('p',label+': '+f.checks[id],output);});
 const result=node('p','Для обоснованного исправления нужны подтверждающие проверки.',host);result.setAttribute('role','status');
 for(const [id,item] of Object.entries(api.faults))button(item.fix,host,()=>{const ok=api.repair(fault,checks,id);result.textContent=ok?'Исправлено. '+f.explain:'Недостаточно подтверждений или выбрана другая причина. Сверьте конфигурацию и '+(fault==='mask'?'маршрут/ARP.':'консоль шлюза.');if(ok){if(!state.fixed.includes(fault))state.fixed.push(fault);save();button('Проиграть исправный обмен',host,()=>{state.mode='Разобраться';state.step=0;render();});}});
}
$('next').onclick=()=>{state.step=Math.min(state.step+1,api.steps.length-1);render();};$('back').onclick=()=>{state.step=Math.max(0,state.step-1);render();};$('restart').onclick=()=>{state.step=0;state.answers={};render();};render();
