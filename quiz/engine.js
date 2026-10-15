(function(root){
'use strict';
const finite=n=>Number.isFinite(n)&&n>=0?n:0;
function stats(raw){const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};return {attempts:Array.isArray(s.attempts)?s.attempts.filter(x=>x&&typeof x.mode==='string'&&Number.isFinite(x.score)).slice(-100):[],questions:s.questions&&typeof s.questions==='object'&&!Array.isArray(s.questions)?s.questions:{}}}
function entry(s,id){const q=s.questions[id]||{};return s.questions[id]={seen:finite(q.seen),correct:finite(q.correct),wrong:finite(q.wrong),streak:finite(q.streak),lastSeen:finite(q.lastSeen),lastWrong:finite(q.lastWrong)}}
function shown(s,id,now=Date.now()){const q=entry(s,id);q.seen++;q.lastSeen=now}
function answered(s,id,ok,now=Date.now()){const q=entry(s,id);if(ok){q.correct++;q.streak++}else{q.wrong++;q.streak=0;q.lastWrong=now}}
function weight(q,s,now){const p=s.questions[q.id]||{};let w=p.seen?1:2;if(p.wrong&&(!p.streak||p.streak<2))w*=4;if(p.lastSeen&&now-p.lastSeen<86400000)w*=.3;if(p.streak>=2)w*=.6;return w}
function family(q){return q.family||q.id}
function pick(bank,mode,s,rng=Math.random,now=Date.now(),size=10){
 const pool=bank.filter(q=>mode==='mixed'?q.group!=='visual-l1':q.group===mode),chosen=[],families=new Set(),counts={},groups=[...new Set(pool.map(q=>q.group))];let templates=0;
 function take(group){const eligible=pool.filter(q=>!families.has(family(q))&&(!group||q.group===group)&&(!q.template||templates<(mode==='mixed'?2:4))&&(mode!=='mixed'||(counts[q.group]||0)<Math.ceil(size/groups.length)));if(!eligible.length)return false;const weights=eligible.map(q=>weight(q,s,now)),total=weights.reduce((a,b)=>a+b,0);let r=rng()*total,index=weights.length-1;for(let i=0;i<weights.length;i++){r-=weights[i];if(r<0){index=i;break}}const q=eligible[index];chosen.push(q);families.add(family(q));counts[q.group]=(counts[q.group]||0)+1;if(q.template)templates++;return true}
 if(mode==='mixed')for(const group of groups)take(group);
 while(chosen.length<size){const least=Math.min(...groups.filter(g=>pool.some(q=>q.group===g&&!families.has(family(q)))).map(g=>counts[g]||0));const candidates=groups.filter(g=>(counts[g]||0)===least);let added=false;for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}for(const g of candidates){if(take(g)){added=true;break}}if(!added&&!take())break}
 for(let i=chosen.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[chosen[i],chosen[j]]=[chosen[j],chosen[i]]}return chosen
}
// Stage 4 uses the existing counters as the single source of truth.
const MODES=['mixed','visual-l1','l1-l2','l3','l4','l5-l7','tcpip','troubleshooting','mistakes'];
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const count=x=>Number.isSafeInteger(x)&&x>=0;
function mistakes(bank,s){return bank.filter(q=>s.questions[q.id]?.wrong>0 && (s.questions[q.id].streak||0)<2)}
function progress(raw,bank,strict=false){
 if(!object(raw)||!Array.isArray(raw.attempts)||!object(raw.questions))throw Error('Некорректные данные прогресса');
 const ids=new Set(bank.map(q=>q.id)),out={attempts:[],questions:{}};
 for(const a of raw.attempts){
  if(!object(a)||!MODES.includes(a.mode)||!count(a.score)||a.score>348||typeof a.date!=='string'||!Number.isFinite(Date.parse(a.date))) {if(strict)throw Error('Некорректная попытка');continue;}
  const total=a.total===undefined?10:a.total;
  if(!count(total)||total<1||total>348||a.score>total){if(strict)throw Error('Некорректный счёт');continue;}
  const clean={date:a.date,mode:a.mode,score:a.score,total};
  for(const key of ['wrongIds','questionIds'])if(a[key]!==undefined){
   if(!Array.isArray(a[key])||a[key].length>348||a[key].some(id=>typeof id!=='string'||!ids.has(id))){if(strict)throw Error('Неизвестный вопрос');continue;}
   clean[key]=[...new Set(a[key])];
  }
  out.attempts.push(clean);
 }
 out.attempts=out.attempts.slice(-100);
 for(const q of bank){
  if(!Object.hasOwn(raw.questions,q.id))continue;
  const e=raw.questions[q.id];
  if(!object(e)||['seen','correct','wrong','streak','lastSeen','lastWrong'].some(k=>e[k]!==undefined&&!count(e[k]))){if(strict)throw Error('Некорректные счётчики');continue;}
  entry(out,q.id);for(const k of Object.keys(out.questions[q.id]))out.questions[q.id][k]=e[k]||0;
 }
 // Older history-only data did not have question counters.
 for(const a of out.attempts)for(const id of a.wrongIds||[])if(!Object.hasOwn(raw.questions,id)){
  const e=entry(out,id);e.wrong++;e.lastWrong=Date.parse(a.date);
 }
 return out;
}
function migrate(raw,bank){try{return progress({...stats(raw)},bank)}catch{return {attempts:[],questions:{}}}}
function exportProgress(s,bank){return 'OSI-PROGRESS-1:'+JSON.stringify({version:1,progress:progress(s,bank,true)})}
function importProgress(code,bank){
 if(typeof code!=='string'||code.length>1000000||!code.trim().startsWith('OSI-PROGRESS-1:'))throw Error('Неверный код прогресса');
 const data=JSON.parse(code.trim().slice(15));
 if(!object(data)||data.version!==1)throw Error('Неподдерживаемая версия');
 return progress(data.progress,bank,true);
}
function session(raw,bank,now=Date.now()){
 try{
  const s=typeof raw==='string'?JSON.parse(raw):raw;
  if(!object(s)||s.version!==1||!MODES.includes(s.mode)||!count(s.timestamp)||now-s.timestamp>30*86400000||s.timestamp>now+60000) return null;
  if(!Array.isArray(s.questionIds)||!s.questionIds.length||s.questionIds.length>348||new Set(s.questionIds).size!==s.questionIds.length)return null;
  if(s.mode!=='mistakes'&&s.questionIds.length!==10)return null;
  const questions=s.questionIds.map(id=>bank.find(q=>q.id===id));
  if(questions.some(q=>!q||(s.mode!=='mistakes'&&(s.mode==='mixed'?q.group==='visual-l1':q.group!==s.mode))))return null;
  if(!count(s.index)||s.index>=questions.length||!Array.isArray(s.answers)||![s.index,s.index+1].includes(s.answers.length))return null;
  if(!Array.isArray(s.orders)||s.orders.length!==questions.length||s.orders.some((order,i)=>!Array.isArray(order)||order.length!==questions[i].answers.length||new Set(order).size!==order.length||order.some(n=>!count(n)||n>=order.length)))return null;
  let score=0;const answers=[];
  for(let i=0;i<s.answers.length;i++){
   const a=s.answers[i],q=questions[i];
   if(!object(a)||a.questionId!==q.id||!Array.isArray(a.chosen)||new Set(a.chosen).size!==a.chosen.length||a.chosen.some(n=>!count(n)||n>=q.answers.length))return null;
   const chosen=[...a.chosen].sort((a,b)=>a-b),correct=[...q.correct].sort((a,b)=>a-b),isCorrect=JSON.stringify(chosen)===JSON.stringify(correct);
   if(a.isCorrect!==isCorrect)return null;
   score+=Number(isCorrect);answers.push({questionId:q.id,chosen,isCorrect});
  }
  if(s.score!==score)return null;
  return {version:1,mode:s.mode,questionIds:[...s.questionIds],orders:s.orders.map(o=>[...o]),index:s.index,answers,score,timestamp:s.timestamp};
 }catch{return null}
}
const api={stats,shown,answered,weight,pick,family,mistakes,migrate,exportProgress,importProgress,session};root.QuizEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
