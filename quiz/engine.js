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
const api={stats,shown,answered,weight,pick,family};root.QuizEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
