// Учебный список сокращений. Поддержка реального CLI зависит от модели, версии и контекста.
const CLI_SHORTCUTS={Cisco:{'enable':['en'],'configure terminal':['conf t','config t'],'show vlan brief':['sh vlan br','sh vlan brief','show vlan br'],'show interfaces status':['sh int status','sh interfaces status'],'show interfaces trunk':['sh int trunk','sh interfaces trunk'],'show interfaces switchport':['sh int switchport'],'show ip interface brief':['sh ip int br','sh ip int brief'],'show ip route':['sh ip route'],'show ip arp':['sh ip arp'],'show running-config':['sh run','show run'],'show version':['sh ver'],'show logging':['sh logging'],'show spanning-tree':['sh spanning-tree'],'show etherchannel summary':['sh etherchannel summary'],'no shutdown':['no shut'],'shutdown':['shut']},H3C:{'display vlan':['dis vlan'],'display interface brief':['dis interface brief'],'display version':['dis version'],'display current-configuration':['dis current-configuration']}};
// Explicit training aliases, never arbitrary prefixes. Keep arguments and line order intact.
// SCALANCE CLI V4.4 §3.5.4 allows uniquely identifiable abbreviations.
Object.assign(CLI_SHORTCUTS,{
 Eltex:{'show vlan':['sh vlan'],'show interfaces status':['sh interfaces status'],'show interfaces counters':['sh interfaces counters'],'show arp':['sh arp'],'show mac address-table':['sh mac address-table'],'show lldp neighbors':['sh lldp neighbors'],'show running-config':['sh running-config'],'show version':['sh version'],'show ipv6 interface brief':['sh ipv6 interface brief'],'show ipv6 route':['sh ipv6 route'],'show ipv6 neighbors vlan 120':['sh ipv6 neighbors vlan 120']},
 SCALANCE:{'show vlan':['sh vlan'],'show interfaces status':['sh interfaces status'],'show interfaces counters':['sh interfaces counters'],'show lldp neighbors':['sh lldp neighbors'],'show mac-address-table':['sh mac-address-table'],'show running-config':['sh running-config'],'show spanning-tree':['sh spanning-tree']},
 Huawei:{'display vlan':['dis vlan'],'display interface brief':['dis interface brief'],'display version':['dis version','dis ver'],'display current-configuration':['dis current-configuration'],'display arp':['dis arp'],'display mac-address':['dis mac-address'],'display stp brief':['dis stp brief'],'display port vlan':['dis port vlan'],'display lldp neighbor brief':['dis lldp neighbor brief'],'display ip routing-table':['dis ip routing-table'],'system-view':['sys']}
});

function acceptedCommand(input,expected,os){const clean=s=>s.trim().toLowerCase().replace(/\s+/g,' ').replace(/\s*\/\s*/g,'/');if(clean(input)===clean(expected))return true;const a=input.trim().split(/\r?\n/).map(clean),b=expected.trim().split(/\r?\n/).map(clean);return a.length===b.length&&a.every((line,i)=>line===b[i]||(CLI_SHORTCUTS[os]?.[b[i]]||[]).includes(line))}
function examDistractors(task,vendor){const seen=new Set([task.commands[vendor]]),pool=TASKS.filter(t=>t.id!==task.id&&t.quiz!==false&&t.commands[vendor]);const same=shuffle(pool.filter(t=>t.category===task.category)),other=shuffle(pool.filter(t=>t.category!==task.category));return [...same,...other].filter(t=>{const c=t.commands[vendor];if(seen.has(c))return false;seen.add(c);return true}).slice(0,3)}

// Stage 6 package 1: bounded training grammar, NOT the IOS command tree.
// Official sources and intentional omissions: stages/STAGE_6_CONTEXTUAL_VLAN.md.
const VLAN_CLI_PROFILE = {
  label: 'Cisco Catalyst C9300-24T · IOS XE Dublin 17.12.x',
  status: 'Сверено по руководству; на устройстве не проверено.',
  source: 'https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-12/configuration_guide/vlan/b_1712_vlan_9300_cg/configuring_vlans.html',
  assumptions: 'VTP transparent; Gi1/0/5 — существующий L2-порт. Имя OFFICE с учётом регистра. Пароли и диалоги сохранения опущены.'
};

const VLAN_CLI = (() => {
  const modes = {user:'User EXEC (>)',exec:'Privileged EXEC (#)',config:'глобальная конфигурация (config)#',vlan:'конфигурация VLAN (config-vlan)#',interface:'конфигурация интерфейса (config-if)#'};
  // Conservative lower bounds, NOT claims about shortest prefixes on all IOS builds.
  // Never infer uniqueness from our small grammar: e, c, i, s, etc. stay unsupported.
  const keywords = {enable:'en',configure:'conf',terminal:'t',vlan:'vlan',name:'name',interface:'int',switchport:'sw',mode:'mo',access:'acc',exit:'exit',end:'end',copy:'copy','running-config':'running-config','startup-config':'startup-config'};
  const rules = [
    {words:['enable'],modes:['user'],action:'enable'},
    {words:['configure','terminal'],modes:['exec'],action:'configure'},
    {words:['vlan',':vlan'],modes:['config'],action:'vlan'},
    {words:['name',':name'],modes:['vlan'],action:'name'},
    {words:['interface',':interface'],modes:['config'],action:'interface'},
    {words:['switchport','mode','access'],modes:['interface'],action:'accessMode'},
    {words:['switchport','access','vlan',':vlan'],modes:['interface'],action:'accessVlan'},
    {words:['exit'],modes:['config','vlan','interface'],action:'exit'},
    {words:['end'],modes:['config','vlan','interface'],action:'end'},
    {words:['copy','running-config','startup-config'],modes:['exec'],action:'save'}
  ];
  const isKeyword = (input,word) => input.length >= keywords[word].length && word.startsWith(input.toLowerCase());
  const snapshot = s => ({vlanExists:s.vlanExists,name:s.name,accessMode:s.accessMode,accessVlan:s.accessVlan});
  const same = (a,b) => a && b && Object.keys(a).every(k=>a[k]===b[k]);
  function initial(task='lab') {
    return {mode:task==='lab'?'user':'config',vlanExists:task==='access',name:task==='access'?'OFFICE':null,draftVlan:null,accessMode:false,accessVlan:1,saved:null};
  }
  function prompt(s) {return 'SW1'+({user:'>',exec:'#',config:'(config)#',vlan:'(config-vlan)#',interface:'(config-if)#'}[s.mode]);}
  function fail(state,code,message) {return {ok:false,state,code,message};}
  function apply(state,line) {
    if (typeof line!=='string' || /[\r\n]/.test(line)) return fail(state,'line','Вводи одну команду на строке.');
    const tokens=line.trim().split(/\s+/);
    if (!line.trim()) return fail(state,'empty','Введите команду.');
    // Interface type and numeric identifier may be joined or separated; values stay intact.
    if (isKeyword(tokens[0],'interface') && tokens.length===3) tokens.splice(1,2,tokens[1]+tokens[2]);
    const candidates=rules.filter(r=>tokens.length<=r.words.length && tokens.every((t,i)=>r.words[i].startsWith(':')||isKeyword(t,r.words[i])));
    if (!candidates.length) {
      const extra=rules.find(r=>tokens.length>r.words.length && r.words.every((w,i)=>w.startsWith(':')||isKeyword(tokens[i],w)));
      if(extra) return fail(state,'arity','Лишние аргументы после команды '+extra.words.filter(w=>!w.startsWith(':')).join(' ')+'.');
      for(let i=0;i<tokens.length;i++) {
        const short=rules.find(r=>r.words[i] && !r.words[i].startsWith(':') && r.words[i].startsWith(tokens[i].toLowerCase()) && !isKeyword(tokens[i],r.words[i]) && tokens.slice(0,i).every((t,j)=>r.words[j].startsWith(':')||isKeyword(t,r.words[j])));
        if(short) return fail(state,'abbreviation',`Сокращение «${tokens[i]}» не подтверждено для упражнения и может быть неоднозначным в IOS. Используй ${short.words[i]} целиком.`);
      }
      return fail(state,'unsupported','Команда или ключевое слово вне VLAN-упражнения. Используй поддерживаемые переходы, VLAN, access-порт и сохранение; полная грамматика IOS здесь не моделируется.');
    }
    const complete=candidates.filter(r=>r.words.length===tokens.length);
    if (!complete.length) return fail(state,'incomplete','Неполная команда: не хватает ключевого слова или аргумента.');
    const rule=complete.find(r=>r.modes.includes(state.mode));
    if (!rule) return fail(state,'mode',`Сейчас ${modes[state.mode]}. Эта команда в упражнении доступна: ${[...new Set(complete.flatMap(r=>r.modes))].map(m=>modes[m]).join(', ')}. Используй exit/end для выхода из режима конфигурации.`);
    const args={};
    for (let i=0;i<rule.words.length;i++) {
      const key=rule.words[i];
      if (key===':vlan') {
        if (!/^\d+$/.test(tokens[i]) || +tokens[i]<1 || +tokens[i]>4094) return fail(state,'argument','VLAN ID должен быть целым числом от 1 до 4094. В упражнении используется 120.');
        if (tokens[i]!=='120') return fail(state,'scope','В этом упражнении разрешён только VLAN 120; другие VLAN не моделируются.');
      } else if (key===':interface') {
        if (!/^(?:gi|gigabitethernet)1\/0\/5$/i.test(tokens[i])) return fail(state,'scope','В упражнении доступен только GigabitEthernet1/0/5 (Gi1/0/5). Другие порты и типы не моделируются.');
      } else if (key===':name') {
        if (!/^[A-Za-z0-9_-]{1,20}$/.test(tokens[i])) return fail(state,'argument','В упражнении имя — 1–20 латинских букв, цифр, _ или -, без пробелов. Целевое имя: OFFICE.');
        args.name=tokens[i]; // Do not lowercase values: office is not OFFICE.
      }
    }
    const next={...state,draftVlan:state.draftVlan?{...state.draftVlan}:null,saved:state.saved?{...state.saved}:null};
    const commitVlan=()=>{if(next.draftVlan){next.vlanExists=true;next.name=next.draftVlan.name;next.draftVlan=null;}};
    switch(rule.action) {
      case 'enable': next.mode='exec'; break;
      case 'configure': next.mode='config'; break;
      case 'vlan': next.draftVlan={name:next.vlanExists?next.name:'VLAN0120'};next.mode='vlan';break;
      case 'name': next.draftVlan.name=args.name;break;
      case 'interface': next.mode='interface';break;
      case 'accessMode': next.accessMode=true;break;
      // IOS creates a missing VLAN when a static access VLAN is assigned.
      case 'accessVlan': next.accessVlan=120;if(!next.vlanExists){next.vlanExists=true;next.name='VLAN0120';}break;
      case 'exit': commitVlan();next.mode=next.mode==='config'?'exec':'config';break;
      case 'end': commitVlan();next.mode='exec';break;
      case 'save': next.saved=snapshot(next);break;
    }
    return {ok:true,state:next,code:'accepted',message:rule.action==='save'?'Конфигурация сохранена в учебной модели; диалоги устройства опущены.':'Команда принята в учебной модели.'};
  }
  function remaining(s,task='lab') {
    const missing=[];
    if (!s.vlanExists) missing.push('создай VLAN 120 и выйди из VLAN-режима через exit/end');
    if (s.name!=='OFFICE') missing.push('задай имя OFFICE с точным регистром и примени exit/end');
    if (s.draftVlan) missing.push('примени параметры VLAN через exit/end');
    if (task!=='create') {
      if (!s.accessMode) missing.push('задай switchport mode access на Gi1/0/5');
      if (s.accessVlan!==120) missing.push('назначь Gi1/0/5 в VLAN 120');
    } else if(s.accessMode || s.accessVlan!==1) missing.push('порт изменён: в этой задаче требуется только создание VLAN');
    if (task==='lab' && !same(snapshot(s),s.saved)) missing.push('сохрани итоговую конфигурацию из Privileged EXEC');
    return missing;
  }
  function evaluate(input,task) {
    let state=initial(task);
    const lines=input.replace(/\r\n/g,'\n').trim().split('\n');
    for(let i=0;i<lines.length;i++) {
      const result=apply(state,lines[i]);
      if(!result.ok) return {...result,line:i+1,message:`Строка ${i+1}: ${result.message}`};
      state=result.state;
    }
    const missing=remaining(state,task);
    return {ok:!missing.length,state,code:missing.length?'goal':'complete',message:missing.length?'Ещё нужно: '+missing.join('; ')+'.':'Целевое состояние достигнуто.'};
  }
  function hint(s) {
    if(s.mode==='user') return 'enable';
    if(s.mode==='exec') return remaining(s).some(x=>!x.startsWith('сохрани'))?'configure terminal':'copy running-config startup-config';
    if(s.mode==='vlan') return s.draftVlan.name==='OFFICE'?'exit':'name OFFICE';
    if(s.mode==='interface') return !s.accessMode?'switchport mode access':s.accessVlan!==120?'switchport access vlan 120':'exit';
    if(!s.vlanExists || s.name!=='OFFICE') return 'vlan 120';
    if(!s.accessMode || s.accessVlan!==120) return 'interface GigabitEthernet1/0/5';
    return 'end';
  }
  return {initial,apply,prompt,remaining,evaluate,hint};
})();

function contextualVlanTask(task,vendor) {return vendor==='Cisco' && ['create','access'].includes(task.id);}
function practiceCommandResult(input,task,vendor) {
  if(contextualVlanTask(task,vendor)) return VLAN_CLI.evaluate(input,task.id);
  const ok=acceptedCommand(input,task.commands[vendor],vendor);
  return {ok,message:ok?'Команда принята.':'Команда не соответствует образцу или поддерживаемым учебным сокращениям.'};
}

