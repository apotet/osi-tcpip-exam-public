// Additional checks for the approved content patch; does not change the matrix.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('quiz/questions.js','utf8'),ctx);
const bank=ctx.window.QUESTION_BANK,manifest=JSON.parse(fs.readFileSync('audit/CONTENT_PATCH_MANIFEST.json'));
const ids=new Set(bank.map(q=>q.id)),removed=new Set(manifest.deletedIDs),engine=require('../quiz/engine.js');
assert.equal(bank.length,manifest.after);for(const id of removed)assert(!ids.has(id),`Deleted question: ${id}`);
const texts=new Set();for(const q of bank){const text=q.text.toLowerCase().replace(/\s+/g,' ').trim();assert(!texts.has(text),`Exact duplicate: ${q.id}`);texts.add(text);}
const topics=manifest.changes.filter(c=>c.fields.includes('topic')).map(c=>bank.find(q=>q.id===c.id));
for(const q of topics){
 assert(!/Курс Корчагина|PDU L[1-7]/.test(q.topic),`Answer-bearing topic: ${q.id}`);
 for(const i of q.correct){const a=q.answers[i].trim().toLowerCase();if(a.length>=2)assert(!q.topic.toLowerCase().includes(a),`Exact answer in topic: ${q.id}`);}
 if(q.answers.some(a=>/^L[1-7]$/.test(a)))assert(!/\bL[1-7]\b/.test(q.topic),`Level leaked by topic: ${q.id}`);
}
const photoChecks=[];
for(const q of bank.filter(q=>q.id.startsWith('photo-'))){
 assert(q.imageAlt&&q.imageAlt.trim(),`Missing alt: ${q.id}`);
 for(const i of q.correct)assert(!q.imageAlt.toLowerCase().includes(q.answers[i].toLowerCase()),`Exact photo answer in alt: ${q.id}`);
 const objectQuestion=/тип.*коннектор|какой коннектор|какие коннекторы|форм-фактор|слева и справа/i.test(q.text);
 if(objectQuestion)assert(!/\b(?:LC|SC|ST|FC|SFP\+?|XFP|GBIC|QSFP(?:-DD)?)\b/i.test(q.imageAlt),`Object identified in alt: ${q.id}`);
 photoChecks.push(q.id);
}
let seed=20261004;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const modes=['mixed',...new Set(bank.map(q=>q.group))];let selections=0;
for(const mode of modes)for(let i=0;i<1000;i++){
 const chosen=engine.pick(bank,mode,engine.stats({}),random,0);assert.equal(chosen.length,10,mode);
 for(const q of chosen)assert(ids.has(q.id)&&!removed.has(q.id),`${mode}: removed ID`);
 assert.equal(new Set(chosen.map(engine.family)).size,chosen.length,`${mode}: repeated family`);selections++;
}
const result={status:'pass',questions:bank.length,deletedIDsChecked:removed.size,selectionRuns:selections,selectedRecords:selections*10,renamedTopicsChecked:topics.length,photoAltsChecked:photoChecks.length,exactDuplicates:0,
 limitations:['Semantic similarity and answer-length cues need editorial judgement.','Pattern checks cover exact answer/level/object leaks, not all paraphrases or text printed inside images.','Original OSI/ARP classification and ambiguous delete/replace decisions remain in CONTENT_MANUAL_REVIEW.md.'],
 bankSHA256:crypto.createHash('sha256').update(fs.readFileSync('quiz/questions.js')).digest('hex')};
const dir=process.env.AUDIT_RUN_DIR||'audit/results';fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(`${dir}/content-checks.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
