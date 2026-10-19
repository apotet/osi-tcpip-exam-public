// Учебный список сокращений. Поддержка реального CLI зависит от модели, версии и контекста.
const CLI_SHORTCUTS={Cisco:{'enable':['en'],'configure terminal':['conf t','config t'],'show vlan brief':['sh vlan br','sh vlan brief','show vlan br'],'show interfaces status':['sh int status','sh interfaces status'],'show interfaces trunk':['sh int trunk','sh interfaces trunk'],'show interfaces switchport':['sh int switchport'],'show ip interface brief':['sh ip int br','sh ip int brief'],'show ip route':['sh ip route'],'show ip arp':['sh ip arp'],'show running-config':['sh run','show run'],'show version':['sh ver'],'show logging':['sh logging'],'show spanning-tree':['sh spanning-tree'],'show etherchannel summary':['sh etherchannel summary'],'no shutdown':['no shut'],'shutdown':['shut']},H3C:{'display vlan':['dis vlan'],'display interface brief':['dis interface brief'],'display version':['dis version'],'display current-configuration':['dis current-configuration']}};
// Explicit training aliases, never arbitrary prefixes. Keep arguments and line order intact.
// Legacy reference aliases use CLI V4.4. The bounded XC206/V4.3.1 grammar below
// has its own source-checked rules; this list does not establish its support.
Object.assign(CLI_SHORTCUTS,{
 Eltex:{'show vlan':['sh vlan'],'show interfaces status':['sh interfaces status'],'show interfaces counters':['sh interfaces counters'],'show arp':['sh arp'],'show mac address-table':['sh mac address-table'],'show lldp neighbors':['sh lldp neighbors'],'show running-config':['sh running-config'],'show version':['sh version'],'show ipv6 interface brief':['sh ipv6 interface brief'],'show ipv6 route':['sh ipv6 route'],'show ipv6 neighbors vlan 120':['sh ipv6 neighbors vlan 120']},
 SCALANCE:{'show vlan':['sh vlan'],'show interfaces status':['sh interfaces status'],'show interfaces counters':['sh interfaces counters'],'show lldp neighbors':['sh lldp neighbors'],'show mac-address-table':['sh mac-address-table'],'show running-config':['sh running-config'],'show spanning-tree':['sh spanning-tree']},
 Huawei:{'display vlan':['dis vlan'],'display interface brief':['dis interface brief'],'display version':['dis version','dis ver'],'display current-configuration':['dis current-configuration'],'display arp':['dis arp'],'display mac-address':['dis mac-address'],'display stp brief':['dis stp brief'],'display port vlan':['dis port vlan'],'display lldp neighbor brief':['dis lldp neighbor brief'],'display ip routing-table':['dis ip routing-table'],'system-view':['sys']}
});

function acceptedCommand(input,expected,os){const clean=s=>s.trim().toLowerCase().replace(/\s+/g,' ').replace(/\s*\/\s*/g,'/');if(clean(input)===clean(expected))return true;const a=input.trim().split(/\r?\n/).map(clean),b=expected.trim().split(/\r?\n/).map(clean);return a.length===b.length&&a.every((line,i)=>line===b[i]||(CLI_SHORTCUTS[os]?.[b[i]]||[]).includes(line))}
function examDistractors(task,vendor){const seen=new Set([task.commands[vendor]]),pool=TASKS.filter(t=>t.id!==task.id&&t.quiz!==false&&t.commands[vendor]);const same=shuffle(pool.filter(t=>t.category===task.category)),other=shuffle(pool.filter(t=>t.category!==task.category));return [...same,...other].filter(t=>{const c=t.commands[vendor];if(seen.has(c))return false;seen.add(c);return true}).slice(0,3)}

// Stage 6: bounded per-profile training grammar, not an equipment emulator.
// Official sources and intentional omissions: stages/STAGE_6_CONTEXTUAL_VLAN.md.
const VLAN_CLI_PROFILE = {
  label: 'Cisco Catalyst C9300-24T · IOS XE Dublin 17.12.x',
  status: 'Сверено по руководству; на устройстве не проверено.',
  source: 'https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-12/configuration_guide/vlan/b_1712_vlan_9300_cg/configuring_vlans.html',
  assumptions: 'VTP transparent; Gi1/0/5 — существующий L2-порт. Имя OFFICE с учётом регистра. Пароли и диалоги сохранения опущены.'
};

const ELTEX_VLAN_PROFILE = {
  label: 'Eltex MES2324 · ПО 4.0.27.3',
  status: 'Сверено по официальному руководству 4.0.27.3; на устройстве не проверено. Заводская версия ПО неизвестна.',
  source: 'https://eltex.ru/storage/upload_center/files/60/MES_Series_user_manual_4.0.27.3.pdf',
  assumptions: 'Учебное начальное состояние: gi1/0/5 — существующий порт, ещё не настроенный как access; access VLAN 1. Цель — VLAN 120 OFFICE с точным регистром. Только полные ключевые слова; диалоги сохранения опущены.'
};

const SCALANCE_CLI_DOC = 'https://cache.industry.siemens.com/dl/files/819/109799819/att_1088483/v1/PH_SCALANCE-XB-200-XC-200-XF-200BA-XP-200-XR-300WG-CLI_76.pdf';
const SCALANCE_VLAN_PROFILE = {
  label: 'SCALANCE XC206-2SFP · V04.03.01 (CLI V4.3.1)',
  status: 'Официальное руководство CLI V4.3.1, 11/2021; применимо к XC-200. На устройстве не проверено; V4.4 не используется.',
  assumptions: 'Учебная сеть уже в 802.1Q VLAN Bridge и Trial mode (auto-save выключен). Сохрани VLAN 1 MGMT (Fa0/5–6 untagged) и VLAN 110 CONTROL (Fa0/1–2 tagged, Fa0/4 untagged). Исходный PVID Fa0/3 = 1. Цель: VLAN 120 OFFICE, Fa0/1–2 tagged, Fa0/3 untagged, PVID Fa0/3 = 120. Смена bridge-mode вне упражнения.',
  source: SCALANCE_CLI_DOC,
  goal: 'Добавь VLAN 120 OFFICE: Fa0/1–2 tagged, Fa0/3 untagged, PVID Fa0/3 = 120. Сохрани VLAN 1 и 110 и итоговую конфигурацию.',
  access: 'VLAN 120 OFFICE уже существует. Задай его полный список: Fa0/1–2 tagged, Fa0/3 untagged, затем PVID Fa0/3 = 120. VLAN 1 и 110 не изменяй.'
};

// Shared parser/reducer and goal evaluator; each profile supplies its own grammar.
function createVlanCli(profile='Cisco') {
  const eltex=profile==='Eltex',scalance=profile==='SCALANCE';
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
  if(eltex) {
    for(const word of Object.keys(keywords)) keywords[word]=word;
    keywords.database='database'; keywords.gigabitethernet='gigabitethernet';
    rules.splice(1,3,
      {words:['configure'],modes:['exec'],action:'configure'},
      {words:['configure','terminal'],modes:['exec'],action:'configure'},
      {words:['vlan','database'],modes:['config','vlan','interface'],action:'database'},
      {words:['vlan',':vlan'],modes:['vlan'],action:'eltexVlan'},
      {words:['vlan',':vlan','name',':name'],modes:['vlan'],action:'eltexVlan'});
    const port=rules.find(r=>r.action==='interface');
    port.words=['interface','gigabitethernet',':interface'];
    port.modes=['config','vlan','interface']; // Global commands available in config submodes, §5.
    rules.push({words:['write'],modes:['exec'],action:'save'},
      {words:['write','memory'],modes:['exec'],action:'save'});
    keywords.write='write'; keywords.memory='memory';
  }
  if(scalance) {
    modes.vlan='конфигурация VLAN 120 (config-vlan-120)#';
    modes.interface='конфигурация Fa0/3 (config-if-Fa0-3)#';
    for(const word of Object.keys(keywords))keywords[word]=word;
    Object.assign(keywords,{configure:'conf',terminal:'t',interface:'int',fastethernet:'fa',ports:'ports',untagged:'untagged',pvid:'pvid',write:'write','startup-config':'startup'});
    rules.splice(0,rules.length,
      {words:['enable'],modes:['user'],action:'enable'},
      {words:['configure','terminal'],modes:['exec'],action:'configure'},
      {words:['vlan',':vlan'],modes:['config'],action:'scalanceVlan'},
      {words:['name',':name'],modes:['vlan'],action:'scalanceName'},
      {words:['interface','fastethernet',':interface'],modes:['config'],action:'interface'},
      {words:['switchport','pvid',':vlan'],modes:['interface'],action:'pvid'},
      {words:['exit'],modes:['config','vlan','interface'],action:'exit'},
      {words:['end'],modes:['config','vlan','interface'],action:'end'},
      {words:['write','startup-config'],modes:['exec'],action:'save'});
    for(const words of [
      ['ports','fastethernet',':tagged'],
      ['ports','fastethernet',':tagged','name',':name'],
      ['ports','fastethernet',':tagged','untagged','fastethernet',':untagged'],
      ['ports','fastethernet',':tagged','untagged','fastethernet',':untagged','name',':name']
    ])rules.push({words,modes:['vlan'],action:'ports'});
  }
  const isKeyword = (input,word) => input.length >= keywords[word].length && word.startsWith(input.toLowerCase());
  const preservedVlans = () => ({1:{name:'MGMT',ports:{'0/5':'untagged','0/6':'untagged'}},110:{name:'CONTROL',ports:{'0/1':'tagged','0/2':'tagged','0/4':'untagged'}}});
  const snapshot = s => scalance ? {vlanExists:s.vlanExists,name:s.name,members:Object.fromEntries(Object.entries(s.members).sort()),pvid:s.pvid,existingVlans:JSON.parse(JSON.stringify(s.existingVlans))} : {vlanExists:s.vlanExists,name:s.name,accessMode:s.accessMode,accessVlan:s.accessVlan};
  const same = (a,b) => a && b && (scalance?JSON.stringify(a)===JSON.stringify(b):Object.keys(a).every(k=>a[k]===b[k]));
  function initial(task='lab') {
    const state={mode:task==='lab'?'user':'config',vlanExists:task==='access',name:task==='access'?'OFFICE':null,draftVlan:null,accessMode:false,accessVlan:1,saved:null};
    if(scalance){Object.assign(state,{members:{},pvid:1,existingVlans:preservedVlans()});state.saved=snapshot(state);}
    return state;
  }
  function prompt(s) {if(scalance)return (!same(snapshot(s),s.saved)?'*':'')+'cli'+({user:'>',exec:'#',config:'(config)#',vlan:'(config-vlan-120)#',interface:'(config-if-Fa0-3)#'}[s.mode]);return (eltex?'console':'SW1')+({user:'>',exec:'#',config:'(config)#',vlan:'(config-vlan)#',interface:'(config-if)#'}[s.mode]);}
  function fail(state,code,message) {return {ok:false,state,code,message};}
  function apply(state,line) {
    if (typeof line!=='string' || /[\r\n]/.test(line)) return fail(state,'line','Вводи одну команду на строке.');
    const tokens=line.trim().split(/\s+/);
    if (!line.trim()) return fail(state,'empty','Введите команду.');
    // Interface type and numeric identifier may be joined or separated; values stay intact.
    if (!eltex && !scalance && isKeyword(tokens[0],'interface') && tokens.length===3) tokens.splice(1,2,tokens[1]+tokens[2]);
    const candidates=rules.filter(r=>tokens.length<=r.words.length && tokens.every((t,i)=>r.words[i].startsWith(':')||isKeyword(t,r.words[i])));
    if (!candidates.length) {
      const extra=rules.find(r=>tokens.length>r.words.length && r.words.every((w,i)=>w.startsWith(':')||isKeyword(tokens[i],w)));
      if(extra) return fail(state,'arity','Лишние аргументы после команды '+extra.words.filter(w=>!w.startsWith(':')).join(' ')+'.');
      for(let i=0;i<tokens.length;i++) {
        const short=rules.find(r=>r.words[i] && !r.words[i].startsWith(':') && r.words[i].startsWith(tokens[i].toLowerCase()) && !isKeyword(tokens[i],r.words[i]) && tokens.slice(0,i).every((t,j)=>r.words[j].startsWith(':')||isKeyword(t,r.words[j])));
        if(short) return fail(state,'abbreviation',`Сокращение «${tokens[i]}» не подтверждено для упражнения и может быть неоднозначным в CLI. Используй ${short.words[i]} целиком.`);
      }
      return fail(state,'unsupported','Команда или ключевое слово вне VLAN-упражнения. Используй поддерживаемые переходы, VLAN, access-порт и сохранение; полная грамматика устройства здесь не моделируется.');
    }
    const complete=candidates.filter(r=>r.words.length===tokens.length);
    if (!complete.length) return fail(state,'incomplete','Неполная команда: не хватает ключевого слова или аргумента.');
    const rule=complete.find(r=>r.modes.includes(state.mode));
    if (!rule) return fail(state,'mode',`Сейчас ${modes[state.mode]}. Эта команда в упражнении доступна: ${[...new Set(complete.flatMap(r=>r.modes))].map(m=>modes[m]).join(', ')}. Используй exit/end для выхода из режима конфигурации.`);
    const args={};
    for (let i=0;i<rule.words.length;i++) {
      const key=rule.words[i];
      if (key===':vlan') {
        const min=eltex&&rule.action==='eltexVlan'?2:1;
        if (!/^\d+$/.test(tokens[i]) || +tokens[i]<min || +tokens[i]>4094) return fail(state,'argument',`VLAN ID должен быть целым числом от ${min} до 4094. В упражнении используется 120.`);
        if(scalance&&tokens[i].startsWith('0'))return fail(state,'argument','В CLI V4.3.1 VLAN ID вводится без ведущих нулей. В упражнении используется 120.');
        if (tokens[i]!=='120') return fail(state,'scope','В этом упражнении разрешён только VLAN 120; другие VLAN не моделируются.');
      } else if (key===':interface') {
        if (!(scalance ? /^0\/3$/.test(tokens[i]) : eltex ? /^1\/0\/5$/.test(tokens[i]) : /^(?:gi|gigabitethernet)1\/0\/5$/i.test(tokens[i]))) return fail(state,'scope',scalance?'В упражнении доступен только interface fastethernet 0/3 (fa 0/3). Fa0/1–2 задаются в списке ports.':eltex?'В упражнении доступен только interface gigabitethernet 1/0/5. Другие порты не моделируются.':'В упражнении доступен только GigabitEthernet1/0/5 (Gi1/0/5). Другие порты и типы не моделируются.');
      } else if(key===':tagged'||key===':untagged') {
        const ports=[];
        for(const item of tokens[i].split(',')) {
          const range=/^0\/([1-6])(?:-([1-6]))?$/.exec(item);
          if(!range || +(range[2]||range[1])<+range[1])return fail(state,'argument','Список портов: 0/a-b,0/c; медные порты XC206-2SFP — 0/1–0/6, возрастающий диапазон, без пробелов.');
          for(let port=+range[1];port<=+(range[2]||range[1]);port++) {
            if(port>3)return fail(state,'scope','В новом VLAN упражнения настраиваются только Fa0/1–3; остальные порты и существующие VLAN сохраняются.');
            if(ports.includes('0/'+port))return fail(state,'argument','Повтор порта в одном списке вне учебной грамматики. Укажи каждый порт один раз.');
            ports.push('0/'+port);
          }
        }
        args[key.slice(1)]=ports;
      } else if (key===':name') {
        if (!(eltex||scalance ? /^[A-Za-z0-9_-]{1,32}$/ : /^[A-Za-z0-9_-]{1,20}$/).test(tokens[i])) return fail(state,'argument',`В упражнении имя — 1–${eltex||scalance?32:20} латинских букв, цифр, _ или -, без пробелов. Целевое имя: OFFICE.`);
        args.name=tokens[i]; // Do not lowercase values: office is not OFFICE.
      }
    }
    if(scalance && rule.action==='pvid' && !state.vlanExists)return fail(state,'scope','Сначала создай VLAN 120. PVID отсутствующего VLAN в упражнении не моделируется.');
    if(eltex && rule.action==='accessVlan' && !state.vlanExists) return fail(state,'scope','Сначала создай VLAN 120 через vlan database. Назначение отсутствующего VLAN в профиле не моделируется.');
    const next={...state,draftVlan:state.draftVlan?{...state.draftVlan}:null,saved:state.saved?{...state.saved}:null};
    if(scalance)next.members={...state.members};
    const commitVlan=()=>{if(next.draftVlan){next.vlanExists=true;next.name=next.draftVlan.name;next.draftVlan=null;}};
    switch(rule.action) {
      case 'enable': next.mode='exec'; break;
      case 'configure': next.mode='config'; break;
      case 'scalanceVlan': next.vlanExists=true;next.mode='vlan';break;
      case 'scalanceName': next.name=args.name;break;
      case 'ports': next.members=Object.fromEntries((args.tagged||[]).map(p=>[p,'tagged']));for(const p of args.untagged||[])next.members[p]='untagged';if(args.name!==undefined)next.name=args.name;break;
      case 'pvid': next.pvid=120;break;
      case 'database': next.mode='vlan';break;
      case 'eltexVlan': next.vlanExists=true;next.name=args.name??(next.name||'120');break;
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
    return {ok:true,state:next,code:'accepted',message:rule.action==='ports'?'Полный список членства VLAN 120 заменён в учебной модели; PVID этой командой не задаётся. VLAN 1 и 110 сохранены.':rule.action==='save'?'Конфигурация сохранена в учебной модели; диалоги устройства опущены.':'Команда принята в учебной модели.'};
  }
  function remaining(s,task='lab') {
    const missing=[];
    if(scalance) {
      if(!s.vlanExists)missing.push('создай VLAN 120');
      if(s.name!=='OFFICE')missing.push('задай имя OFFICE с точным регистром');
      if(task==='create') {
        if(Object.keys(s.members).length||s.pvid!==1)missing.push('в задаче создания VLAN список ports и PVID должны остаться исходными');
      }else {
        for(const [port,kind] of Object.entries({'0/1':'tagged','0/2':'tagged','0/3':'untagged'}))if(s.members[port]!==kind)missing.push('задай Fa'+port+' как '+kind+' в полном списке ports VLAN 120');
        if(Object.keys(s.members).some(p=>!['0/1','0/2','0/3'].includes(p)))missing.push('убери лишние порты из VLAN 120');
        if(s.pvid!==120)missing.push('задай PVID Fa0/3 = 120 отдельно от egress-членства');
      }
      if(JSON.stringify(s.existingVlans)!==JSON.stringify(preservedVlans()))missing.push('сохрани исходные VLAN 1 и 110 без изменений');
      if(task==='lab'&&!same(snapshot(s),s.saved))missing.push('сохрани итоговую конфигурацию: write startup-config из Privileged EXEC');
      return missing;
    }
    if (!s.vlanExists) missing.push(eltex?'создай VLAN 120 в vlan database':'создай VLAN 120 и выйди из VLAN-режима через exit/end');
    if (s.name!=='OFFICE') missing.push(eltex?'задай имя OFFICE с точным регистром в vlan database':'задай имя OFFICE с точным регистром и примени exit/end');
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
    if(scalance) {
      if(s.mode==='user')return 'enable';
      if(s.mode==='exec')return remaining(s).some(x=>!x.startsWith('сохрани итоговую'))?'configure terminal':'write startup-config';
      if(s.mode==='interface')return !s.vlanExists||s.name!=='OFFICE'?'exit':s.pvid!==120?'switchport pvid 120':'exit';
      if(s.mode==='vlan')return s.name!=='OFFICE'?'name OFFICE':!same(s.members,{'0/1':'tagged','0/2':'tagged','0/3':'untagged'})?'ports fastethernet 0/1-2 untagged fastethernet 0/3':'exit';
      if(!s.vlanExists||s.name!=='OFFICE'||!same(s.members,{'0/1':'tagged','0/2':'tagged','0/3':'untagged'}))return 'vlan 120';
      return s.pvid!==120?'interface fastethernet 0/3':'end';
    }
    if(eltex) {
      if(s.mode==='user')return 'enable';
      if(s.mode==='exec')return remaining(s).some(x=>!x.startsWith('сохрани'))?'configure':'write memory';
      if(!s.vlanExists||s.name!=='OFFICE')return s.mode==='vlan'?'vlan 120 name OFFICE':'vlan database';
      if(s.mode==='vlan')return 'exit';
      if(s.mode==='interface')return !s.accessMode?'switchport mode access':s.accessVlan!==120?'switchport access vlan 120':'end';
      return !s.accessMode||s.accessVlan!==120?'interface gigabitethernet 1/0/5':'end';
    }
    if(s.mode==='user') return 'enable';
    if(s.mode==='exec') return remaining(s).some(x=>!x.startsWith('сохрани'))?'configure terminal':'copy running-config startup-config';
    if(s.mode==='vlan') return s.draftVlan.name==='OFFICE'?'exit':'name OFFICE';
    if(s.mode==='interface') return !s.accessMode?'switchport mode access':s.accessVlan!==120?'switchport access vlan 120':'exit';
    if(!s.vlanExists || s.name!=='OFFICE') return 'vlan 120';
    if(!s.accessMode || s.accessVlan!==120) return 'interface GigabitEthernet1/0/5';
    return 'end';
  }
  return {initial,apply,prompt,remaining,evaluate,hint};
}
const VLAN_CLI = createVlanCli();
const ELTEX_VLAN_CLI = createVlanCli('Eltex');
const SCALANCE_VLAN_CLI = createVlanCli('SCALANCE');
function vlanCli(vendor){return {Cisco:VLAN_CLI,Eltex:ELTEX_VLAN_CLI,SCALANCE:SCALANCE_VLAN_CLI}[vendor];}
function vlanCliProfile(vendor){return {Cisco:VLAN_CLI_PROFILE,Eltex:ELTEX_VLAN_PROFILE,SCALANCE:SCALANCE_VLAN_PROFILE}[vendor];}
function contextualVlanExpected(task,vendor){
  if(vendor==='SCALANCE')return task.id==='create'?'vlan 120\nname OFFICE\nexit':'vlan 120\nports fastethernet 0/1-2 untagged fastethernet 0/3\nexit\ninterface fastethernet 0/3\nswitchport pvid 120';
  if(vendor==='Eltex')return task.id==='create'?'vlan database\nvlan 120 name OFFICE\nexit':'interface gigabitethernet 1/0/5\nswitchport mode access\nswitchport access vlan 120';
  return task.commands[vendor]+(task.id==='create'?'\nexit':'');
}

function contextualVlanTask(task,vendor) {return !!vlanCli(vendor) && ['create','access'].includes(task.id);}
function practiceCommandResult(input,task,vendor) {
  if(contextualVlanTask(task,vendor)) return vlanCli(vendor).evaluate(input,task.id);
  const ok=acceptedCommand(input,task.commands[vendor],vendor);
  return {ok,message:ok?'Команда принята.':'Команда не соответствует образцу или поддерживаемым учебным сокращениям.'};
}


