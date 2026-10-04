// Independent Python stdlib oracle; only the trainer's hexadecimal IPv6 grammar is in scope.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const html=fs.readFileSync('ipv6.html','utf8'),ctx={};vm.createContext(ctx);vm.runInContext(html.slice(html.indexOf('function expand('),html.indexOf('function choiceHtml(')),ctx);
const fixed=['::','::1','1::','2001:DB8::42','1:0:2:3:4:5:6:7','1:0:0:2:0:0:3:4','0:0:1:2:3:4:0:0','1:2:3:4:5:6:7:8',' 2001:0DB8::0001 '];
let seed=0x6a17;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
const valid=[...fixed];for(let i=0;i<2000;i++){const p=Array.from({length:8},()=>rng()%65536);if(i%2===0)p.splice(i%6,2,0,0);if(i%7===0){p[1]=p[2]=p[5]=p[6]=0;}valid.push(p.map(x=>x.toString(16).padStart(4,'0')).join(':'));}
const oracle=spawnSync('python3',['-c',`import json,sys,ipaddress
out=[]
for s in json.load(sys.stdin):
 a=ipaddress.IPv6Address(s.strip()); n=ipaddress.IPv6Network(str(a)+"/64",strict=False)
 out.append(dict(expanded=a.exploded,compressed=a.compressed,prefix=n.network_address.exploded))
json.dump(out,sys.stdout)`],{input:JSON.stringify(valid),encoding:'utf8'});assert.equal(oracle.status,0,oracle.stderr);const expected=JSON.parse(oracle.stdout);
valid.forEach((s,i)=>{assert.equal(ctx.expand(s),expected[i].expanded,s);assert.equal(ctx.compress(s),expected[i].compressed,s);assert.equal(ctx.expand(ctx.prefix64(s).split('/')[0]),expected[i].prefix,s);assert(ctx.samePrefix64(ctx.prefix64(s),expected[i].prefix+'/64'));});
const invalid=['',' ',':',':::','1::2::3','1:2:3:4:5:6:7','1:2:3:4:5:6:7:8:9','1:2:3:4:5:6:7:8::','12345::','gg::','1:2:3:4:5:6:7:','::ffff:192.0.2.1','fe80::1%eth0'];
for(const s of invalid){assert.equal(ctx.expand(s),null,s);assert.equal(ctx.compress(s),null,s);}
for(const s of ['2001:db8::/63','2001:db8::/064','2001:db8::/64/64','2001:db9::/64','bad/64'])assert.equal(ctx.samePrefix64(s,'2001:db8::/64'),false,s);
const result={status:'pass',oracle:'Python ipaddress',seed:'0x6a17',valid:valid.length,invalid:invalid.length,prefixRejections:5,fixed,excluded:'IPv4-embedded and zone IDs are outside current trainer grammar; prefix64 called only with valid addresses'};
const dir=process.env.AUDIT_RUN_DIR||'audit/results';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(`${dir}/ipv6.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
