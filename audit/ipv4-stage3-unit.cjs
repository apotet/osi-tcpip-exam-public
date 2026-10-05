const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const html=fs.readFileSync('ipv4.html','utf8'),ctx={Math:Object.create(Math)};
vm.createContext(ctx);
vm.runInContext(html.slice(html.indexOf('function maskInt('),html.indexOf("let mode='mask'"))+html.slice(html.indexOf('function createVlsmQuestion('),html.indexOf('function render(')),ctx);
const samples=[];
for(let p=8;p<=30;p++)for(const src of ['0.0.0.0','10.0.0.0','172.16.50.14','192.168.10.34','255.255.255.255']){
 const base=ctx.ipToInt(ctx.subnet(src,p).network),size=2**(32-p);
 for(const offset of [0,1,size-2,size-1,size,size+1])samples.push({src,prefix:p,dst:ctx.intToIp((base+offset)>>>0)});
}
function oracle(rows){const proc=spawnSync('python3',['audit/ipv4-oracle.py'],{input:JSON.stringify(rows),encoding:'utf8'});assert.equal(proc.status,0,proc.stderr);return JSON.parse(proc.stdout)}
const reference=oracle(samples);
for(const [i,s]of samples.entries()){
 const expected=reference[i],got=ctx.subnet(s.src,s.prefix);
 for(const key of ['network','broadcast','first','last'])assert.equal(got[key],expected[key],JSON.stringify(s));
 assert.equal(ctx.sameSubnet(s.src,s.dst,s.prefix),expected.same);
 assert.equal(ctx.delivery(s.src,s.dst,s.prefix),expected.delivery);
}
const generated=[],questions=[];let seed=7;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32}
for(const mode of ['first','last','full','broadcast','same','gateway'])for(let p=8;p<=30;p++)for(const same of [true,false]){
 ctx.mode=mode;ctx.Math.random=()=>same?0.25:0.75;ctx.rand=(a,b)=>a===8&&b===30?p:a+Math.floor(random()*(b-a+1));
 const q=ctx.createQuestion();const addresses=[...q.prompt.matchAll(/(?:\d{1,3}\.){3}\d{1,3}/g)].map(x=>x[0]);
 generated.push({src:addresses[0],prefix:p,dst:['same','gateway'].includes(mode)?addresses[mode==='same'?1:2]:addresses[0]});questions.push({q,mode,same,p});
}
const genExpected=oracle(generated);
for(const [i,{q,mode,same,p}]of questions.entries()){
 const e=genExpected[i],answers=mode==='full'?[e.network,e.broadcast,e.first,e.last]:mode==='same'?[e.same?'yes':'no']:mode==='gateway'?[e.delivery]:[e[mode]];
 assert.deepEqual(JSON.parse(JSON.stringify(q.answers)),answers,`${mode}/${p}`);
 if(['same','gateway'].includes(mode))assert.equal(e.same,same,`${mode}/${p}: balanced branches`);
 assert(q.explain.length<300);assert(p<=30);
}
ctx.mode='mask';assert.equal(ctx.answerValue(' 255,255,255,000 '),'255.255.255.0');assert.equal(ctx.answerValue('256.1.1.1'),'256.1.1.1');
ctx.mode='same';assert.equal(ctx.answerValue('Да'),'yes');assert.equal(ctx.answerValue('нет'),'no');
ctx.mode='gateway';assert.equal(ctx.answerValue('Напрямую в L2'),'direct');assert.equal(ctx.answerValue('через шлюз'),'gateway');
const result={pass:true,oracle:'Python ipaddress; no product arithmetic',boundaryCases:samples.length,generatedQuestions:questions.length,prefixes:'/8–/30',balanced:true};
const dir=process.env.AUDIT_RUN_DIR||'audit/results';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/ipv4-stage3-unit.json',JSON.stringify(result,null,2));console.log(result);
