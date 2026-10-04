const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
fs.mkdirSync((process.env.AUDIT_RUN_DIR||'audit/results'), {recursive:true});
const ctx = {window:{}};
vm.runInNewContext(fs.readFileSync('quiz/questions.js','utf8'), ctx);
const bank = ctx.window.QUESTION_BANK;
const ids = new Set(), texts = new Map(), duplicates = [];
const groups = {};
for (const q of bank) {
  assert(q.id && !ids.has(q.id), `Duplicate/missing id: ${q.id}`); ids.add(q.id);
  for (const key of ['text','group','topic','explanation']) assert(typeof q[key] === 'string' && q[key].trim(), `${q.id}: ${key}`);
  assert(q.answers.length >= 2 && q.answers.every(a=>typeof a==='string' && a.trim()), q.id);
  assert(new Set(q.answers).size === q.answers.length, `${q.id}: duplicate answers`);
  assert(q.correct.length && new Set(q.correct).size === q.correct.length && q.correct.every(i=>Number.isInteger(i)&&i>=0&&i<q.answers.length), `${q.id}: correct`);
  if (q.image) assert(fs.existsSync(q.image), `${q.id}: image`);
  groups[q.group]=(groups[q.group]||0)+1;
  const text=q.text.toLowerCase().replace(/\s+/g,' ').trim();
  if(texts.has(text)) duplicates.push([texts.get(text),q.id]); else texts.set(text,q.id);
}
const engine=require('../quiz/engine.js');
for(const mode of ['mixed',...Object.keys(groups)]) for(let i=0;i<100;i++) {
  const picked=engine.pick(bank,mode,engine.stats({}));
  assert.equal(picked.length,10,mode);
  assert.equal(new Set(picked.map(engine.family)).size,picked.length,`${mode}: repeated family`);
}
assert.equal(engine.family(bank.find(q=>q.id==='tcp-02')),engine.family(bank.find(q=>q.id==='new-tcpip-map')));
const lessons=JSON.parse(fs.readFileSync('index.html','utf8').match(/const DETAIL_LESSONS = (\{.*?\});/)[1]);
const mapping=JSON.parse(fs.readFileSync('index.html','utf8').match(/const DETAIL_BY_QUESTION = (\{.*?\});/)[1]);
for(const [id,lesson] of Object.entries(mapping)){assert(ids.has(id),`Obsolete lesson mapping: ${id}`);assert(lessons[lesson],`Missing lesson: ${lesson}`);}
assert(Object.keys(lessons).every(k=>Object.values(mapping).includes(k)), 'Unused detailed lesson');
// Evaluate the actual production functions, without copying their implementation.
const html=fs.readFileSync('ipv4.html','utf8');
const code=html.slice(html.indexOf('function maskInt('),html.indexOf('function interesting('));
const ipv4={}; vm.createContext(ipv4); vm.runInContext(code,ipv4);
const ip=n=>[24,16,8,0].map(s=>Math.floor(n/2**s)%256).join('.');
for(let p=0;p<=32;p++) assert.equal(ipv4.maskText(p),ip(2**32-2**(32-p)));
let seed=0x51a7;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;}
let cases=0;
for(let p=8;p<=30;p++) for(let i=0;i<500;i++) {
  const n=random(), block=2**(32-p), network=Math.floor(n/block)*block, broadcast=network+block-1;
  const got=ipv4.subnet(ip(n),p);
  assert.equal(got.network,ip(network));assert.equal(got.broadcast,ip(broadcast));
  assert.equal(got.first,ip(network+1));assert.equal(got.last,ip(broadcast-1));cases++;
}
const vctx={rand:(a,b)=>a+random()%(b-a+1),Math:Object.create(Math)};
vctx.Math.random=()=>random()/2**32;vm.createContext(vctx);
vm.runInContext(html.slice(html.indexOf('function createVlsmQuestion('),html.indexOf('function createQuestion(')),vctx);
for(let i=0;i<2000;i++) {
  const q=vctx.createVlsmQuestion();
  if(q.fields[0][1]==='Префикс') {
    const needed=Number(q.prompt.match(/<code>(\d+)/)[1]),p=Number(q.answers[0]);
    assert(2**(32-p)-2>=needed && 2**(31-p)-2<needed);
  } else {
    const nets=[...q.prompt.matchAll(/10\.(\d+)\.(\d+)\.0\/24/g)].map(m=>Number(m[1])*65536+Number(m[2])*256);
    const [addr,prefix]=q.answers[0].split('/'),size=2**(32-Number(prefix));
    assert.equal(nets.length*256,size);assert.equal(nets[0]%size,0);
    assert(nets.every((n,j)=>n===nets[0]+j*256));assert.equal(addr,`10.${Math.floor(nets[0]/65536)}.${nets[0]/256%256}.0`);
  }
}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=['index.html','ipv4.html','ipv6.html',...walk('cli'),...walk('quiz'),...walk('assets')];
const source=files.filter(f=>/\.(html|js|css|json|txt)$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('\n');
const assets=walk('assets').map(file=>({file,bytes:fs.statSync(file).size,hash:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),referenced:source.includes(file)||source.includes(path.basename(file))})).sort((a,b)=>b.bytes-a.bytes);
const functions=[];
for(const file of files.filter(f=>/\.(js|html)$/.test(f))){const s=fs.readFileSync(file,'utf8');for(const m of s.matchAll(/function\s+(\w+)\s*\(/g)){const name=m[1],count=(source.match(new RegExp(`\\b${name}\\b`,'g'))||[]).length;if(count===1)functions.push({file,name});}}
const result={questions:bank.length,groups,duplicateTexts:duplicates,ipv4:{masks:33,subnets:cases,vlsm:2000,seed:'0x51a7',hostRange:'/8–/30; /31 and /32 are table-only special cases'},assets,totalAssetBytes:assets.reduce((n,a)=>n+a.bytes,0),unreferencedFunctionCandidates:functions};
fs.writeFileSync(`${process.env.AUDIT_RUN_DIR||'audit/results'}/static.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({questions:bank.length,groups,duplicateTexts:duplicates,ipv4:result.ipv4,totalAssetBytes:result.totalAssetBytes,unreferencedAssets:assets.filter(a=>!a.referenced).map(a=>a.file),unreferencedFunctionCandidates:functions},null,2));
