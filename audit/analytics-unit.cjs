// Unit checks execute the actual shared helper in a synthetic document. No SDK/network.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('analytics/analytics.js','utf8');
function environment(id,ym){
 const scripts=[],listeners={},body={dataset:{analyticsSection:'ipv4'},append(){}},head={append:s=>scripts.push(s)};
 const context={window:{SITE_ANALYTICS_CONFIG:{counterId:id}},location:{protocol:'https:',origin:'https://example.test',pathname:'/ipv4.html'},performance:{getEntriesByType:()=>[{type:'navigate'}]},document:{readyState:'loading',body,head,querySelector:()=>null,createElement:()=>({dataset:{},style:{}}),addEventListener:(n,fn)=>listeners[n]=fn}};
 if(ym)context.window.ym=ym;vm.createContext(context);vm.runInContext(source,context);return {context,scripts,listeners,run:()=>vm.runInContext(source,context)};
}
let checks=0;
for(const id of [null,0,-1,'123456789',NaN,Infinity]){const e=environment(id);assert.equal(e.context.window.SiteAnalytics.enabled,false);assert.equal(e.scripts.length,0);assert.equal(e.context.window.ym,undefined);assert.equal(e.context.window.SiteAnalytics.trackEvent('exam_start',{mode:'mixed'}),false);checks++}
const e=environment(123456789);assert.equal(e.scripts.length,1);assert.equal(e.scripts[0].referrerPolicy,'no-referrer');assert.equal(e.context.window.ym.a[0][1],'init');
for(let n=0;n<1000;n++)e.context.window.SiteAnalytics.trackEvent('exam_start',{mode:'mixed'});
assert.equal(e.context.window.ym.a.length,100);e.run();assert.equal(e.scripts.length,1);checks++;
e.scripts[0].onerror();assert.equal(e.context.window.ym.a.length,0);assert.equal(e.context.window.SiteAnalytics.trackEvent('exam_start',{mode:'mixed'}),false);checks++;
for(const mode of ['absent','throw']){const e=environment(123456789);e.context.window.ym=mode==='absent'?undefined:()=>{throw Error('synthetic')};assert.equal(e.context.window.SiteAnalytics.trackEvent('exam_start',{mode:'mixed'}),false);checks++}
const calls=[],s=environment(123456789,(...args)=>calls.push(args));s.listeners.DOMContentLoaded();
for(const name of ['feedback_submit','troubleshooting_open','pro_interest','b2b_interest'])assert.equal(s.context.window.SiteAnalytics.trackEvent(name),false);
const before=calls.length;s.context.window.SiteAnalytics.trackEvent('exam_start',{mode:'l3',email:'private',answers:['private']});assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1))),[123456789,'reachGoal','exam_start',{mode:'l3'}]);
assert.equal(s.context.window.SiteAnalytics.trackEvent('exam_complete',{mode:'mixed',score:9,total:10,percent:90,passed:false}),false);assert.equal(calls.length,before+1);checks++;
const dir=process.env.AUDIT_RUN_DIR||'audit/results';fs.mkdirSync(dir,{recursive:true});const result={pass:checks,fail:0,skip:0,realNetworkRequests:0};fs.writeFileSync(dir+'/analytics-unit.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
