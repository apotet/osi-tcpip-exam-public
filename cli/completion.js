// Token completion only: never reads exam.expected, hints or the task's answer.
function cliLiteral(word){return word.includes(':')?word.slice(0,word.indexOf(':')):word}
function cliWordMatches(token,word,sensitive=false){
 const literal=cliLiteral(word),value=word.includes(':');
 if(value)return token.startsWith(literal)&&token.length>literal.length;
 return sensitive?token===word:token.toLowerCase()===word.toLowerCase();
}
function cliComplete(text,cursor,grammar){
 const start=cursor===0?0:text.lastIndexOf('\n',cursor-1)+1;
 let end=text.indexOf('\n',cursor);if(end<0)end=text.length;
 const line=text.slice(start,end),at=cursor-start;
 const parts=[...line.matchAll(/\S+/g)];
 let index=parts.findIndex(p=>p.index<=at&&p.index+p[0].length>=at);
 let left=at,right=at,prefix='';
 if(index<0){index=parts.filter(p=>p.index<at).length;parts.splice(index,0,{0:'',index:at});}
 else{left=parts[index].index;right=left+parts[index][0].length;prefix=line.slice(left,at);}
 const options=new Set();
 for(const rule of grammar){
  if(index>=rule.words.length||parts.length>rule.words.length)continue;
  const tokens=[];let ok=true;
  for(let i=0;i<parts.length;i++)if(i!==index){tokens[i]=parts[i][0];if(!(rule.matches?rule.matches(tokens[i],i):cliWordMatches(tokens[i],rule.words[i],rule.sensitive))){ok=false;break;}}
  if(!ok)continue;
  const word=rule.words[index],literal=cliLiteral(word);
  if(!literal)continue; // Free values are deliberately never guessed.
  const sensitive=rule.sensitive||word.includes(':');
  if(!(sensitive?literal.startsWith(prefix):literal.toLowerCase().startsWith(prefix.toLowerCase())))continue;
  const tail=line.slice(at,right),remaining=literal.slice(prefix.length);
  if(tail&&!(sensitive?remaining.startsWith(tail):remaining.toLowerCase().startsWith(tail.toLowerCase())))continue;
  const proposal=prefix+remaining;
  // Validate with the shared reducer when the grammar supports it. For a key=
  // slot use its internal probe; the probe is not returned to the learner.
  tokens[index]=word.includes(':')?undefined:proposal;
  if(rule.valid&&!rule.valid(tokens))continue;
  options.add(proposal);
 }
 const candidates=[...options].sort();
 if(!candidates.length)return {text,cursor,candidates};
 let common=candidates[0];for(const c of candidates)while(!c.startsWith(common))common=common.slice(0,-1);
 if(common.length<=prefix.length)return {text,cursor,candidates};
 return {text:text.slice(0,start+left)+common+text.slice(start+right),cursor:start+left+common.length,candidates};
}

// Legacy quizzes validate against TASKS. Build one dictionary from ALL of it,
// recording each line's mode, and replacing example values with free slots.
function cliCatalogGrammar(os){
 const l2=['H3C','Huawei'].includes(os),router=os==='MikroTik',out=[];
 for(const task of TASKS){
  if(task.quiz===false||!task.commands[os])continue;
  let mode=task.id==='enter'?'user':/конфигураци/i.test(task.mode)?'config':l2?'user':'exec';
  for(const line of task.commands[os].split('\n')){
   const tokens=line.trim().split(/\s+/);
   const words=tokens.map((w,i)=>{
    if(/^[a-z-]+=/i.test(w))return w.slice(0,w.indexOf('=')+1)+':value';
    if(/\d|[A-Z_]/.test(w)||['before-change','remote-log'].includes(w))return ':value';
    if(i>0&&['description','name','comment'].includes(tokens[i-1]))return ':value';
    return w;
   });
   // Interface selectors are values, including joined SVI/interface names.
   if(tokens[0]==='interface'&&tokens.length===2)words[1]=':interface';
   out.push({words,mode:router?'router':mode,sensitive:router,matches:(t,i)=>words[i].includes(':')?t===tokens[i]:cliWordMatches(t,words[i],router)});
   const key=line.toLowerCase();
   for(const alias of CLI_SHORTCUTS[os]?.[key]||[])out.push({words:alias.split(' '),mode});
   if(/^enable$/i.test(line))mode='exec';
   else if(/^(configure|system-view)/i.test(line))mode='config';
   else if(/^interface /i.test(line))mode='interface';
   else if(/^vlan /i.test(line))mode='vlan';
   else if(/^(exit|quit)$/i.test(line))mode='config';
   else if(/^(end|return)$/i.test(line))mode=l2?'user':'exec';
  }
 }
 return out;
}
function cliCatalogContext(os,task,before){
 const grammar=cliCatalogGrammar(os),l2=['H3C','Huawei'].includes(os);
 let mode=os==='MikroTik'?'router':task.id==='enter'?'user':/конфигураци/i.test(task.mode)?'config':l2?'user':'exec';
 for(const line of before.split(/\r?\n/).filter(x=>x.trim())){
  const tokens=line.trim().split(/\s+/);
  if(!grammar.some(r=>r.mode===mode&&r.words.length===tokens.length&&tokens.every((t,i)=>r.matches?r.matches(t,i):cliWordMatches(t,r.words[i],r.sensitive))))return [];
  if(/^enable$|^en$/i.test(line))mode='exec';
  else if(/^(configure (terminal|t)|conf t|config t|system-view)$/i.test(line))mode='config';
  else if(/^interface /i.test(line))mode='interface';
  else if(/^vlan /i.test(line))mode='vlan';
  else if(/^(exit|quit)$/i.test(line))mode='config';
  else if(/^(end|return)$/i.test(line))mode=l2?'user':'exec';
 }
 return grammar.filter(r=>r.mode===mode);
}

const CLI_COMMAND_FIELDS='#answer, #labinput, #repair-input, #chain-input';
function cliFieldGrammar(field){
 const cursor=field.selectionStart??field.value.length;
 const before=field.value.slice(0,cursor===0?0:field.value.lastIndexOf('\n',cursor-1)+1);
 let engine,state;
 if(field.id==='chain-input'){
  const i=vlanChainSession.selected;engine=VLAN_CHAIN_ADAPTERS[i];state=vlanChainSession.devices[i].config;
 }else if(field.id==='repair-input'){engine=repairPractice(vendor).adapter;state=repair.state.device;}
 else if(field.id==='labinput'){engine=vlanCli(vendor);state=lab.state;}
 else if(field.id==='answer'){
  if(exam.answered)return [];
  if(!contextualVlanTask(exam.current,vendor))return cliCatalogContext(vendor,exam.current,before);
  engine=vlanCli(vendor);state=engine.initial(exam.current.id);
 }
 if(!engine||!state)return [];
 for(const line of before.split(/\r?\n/).filter(x=>x.trim())){const r=engine.apply(state,line);if(!r.ok)return [];state=r.state;}
 return engine.completionGrammar?.(state)||[];
}
function cliCompleteField(field){
 if(field.disabled||field.readOnly||field.selectionStart!==field.selectionEnd)return;
 const result=cliComplete(field.value,field.selectionStart,cliFieldGrammar(field));
 if(result.text!==field.value){field.value=result.text;field.dispatchEvent(new Event('input',{bubbles:true}));}
 field.focus();field.setSelectionRange(result.cursor,result.cursor);
 const box=field.parentElement.querySelector('.cli-completions');
 if(box){box.replaceChildren();const status=document.createElement('span');status.textContent=result.candidates.length>1?'Возможные продолжения:':result.candidates.length?'Дополнено.':'Нет продолжений. Значения вводятся вручную.';box.append(status);
  if(result.candidates.length>1){const list=document.createElement('ul');for(const value of result.candidates){const li=document.createElement('li');li.textContent=value;list.append(li);}box.append(list);}}
}
function cliPrepareFields(){
 document.querySelectorAll(CLI_COMMAND_FIELDS).forEach(field=>{
  if(field.parentElement.querySelector('[data-cli-complete]'))return;
  const button=document.createElement('button');button.type='button';button.dataset.cliComplete=field.id;button.textContent='Дополнить';
  const box=document.createElement('div');box.className='cli-completions meta';box.id=field.id+'-completions';box.setAttribute('aria-live','polite');
  field.setAttribute('aria-describedby',box.id);field.after(button,box);
 });
}
if(typeof document!=='undefined'){
 document.addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.shiftKey&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.isComposing&&e.target.matches(CLI_COMMAND_FIELDS)){e.preventDefault();cliCompleteField(e.target);}});
 document.addEventListener('pointerdown',e=>{if(e.target.closest('[data-cli-complete]'))e.preventDefault();});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-cli-complete]');if(b)cliCompleteField(document.getElementById(b.dataset.cliComplete));});
 document.addEventListener('input',e=>{if(e.target.matches(CLI_COMMAND_FIELDS))e.target.parentElement.querySelector('.cli-completions')?.replaceChildren();});
 new MutationObserver(cliPrepareFields).observe(document.getElementById('app'),{childList:true,subtree:true});
}
