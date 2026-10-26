// Stage 6 / package 3. Shared workflow + one documented Cisco adapter.
// No hardware or end-to-end forwarding emulation; other vendors are not registered.
const CLI_REPAIR_CASES=[
 {id:'access-vlan',title:'Конечный порт · VLAN 120',read:'access',line:6,
  question:'Какое несоответствие плану показывает Access Mode VLAN в строке 6?',
  options:[{id:'wrong-vlan',text:'Назначен VLAN 130, а для этого конечного порта нужен VLAN 120.'},{id:'correct',text:'Назначен правильный access VLAN 120.'},{id:'trunk',text:'Порт работает как trunk вместо access.'},{id:'shutdown',text:'Эта строка доказывает административное отключение порта.'}],answer:'wrong-vlan',
  explanation:'Строка 6 показывает Access Mode VLAN 130 (CAMERAS), план требует 120 (OFFICE). Это access VLAN, а не native VLAN trunk. Административное состояние этой строкой не устанавливается.'},
 {id:'uplink-vlan',title:'Аплинк · VLAN 120',read:'trunk',line:6,
  question:'Чего не хватает в локальном allowed list аплинка в строке 6?',
  options:[{id:'missing',text:'VLAN 120: разрешены только 1 и 110.'},{id:'native',text:'Обязательно нужно заменить native VLAN 1 на 120.'},{id:'peer',text:'Строка доказывает неправильную настройку соседнего коммутатора.'},{id:'all-good',text:'В списке уже присутствует VLAN 120.'}],answer:'missing',
  explanation:'Строка 6 содержит только 1,110. Добавь 120 с сохранением прежних разрешений. Native VLAN остаётся 1. Локальный allowed list не показывает конфигурацию соседа и не доказывает доставку трафика.'},
 {id:'admin-down',title:'Порт конечного устройства',read:'brief',line:4,
  question:'Что подтверждает Status Gi1/0/5 в строке 4?',
  options:[{id:'admin',text:'Порт выключен административно: administratively down.'},{id:'cable',text:'Точно повреждён кабель, а административная настройка включена.'},{id:'no-ip',text:'Линк не поднимается исключительно из-за отсутствия IP на L2-порту.'},{id:'stp',text:'Порт заблокирован STP при поднятом линке.'}],answer:'admin',
  explanation:'Строка 4 явно говорит administratively down, Protocol — down. unassigned нормально для этого L2-порта и не является причиной shutdown. В учебных условиях физический линк исправен; для реального устройства это нужно проверять отдельно.'}
];

function ciscoRepairAdapter(){
 const clone=x=>JSON.parse(JSON.stringify(x)),fail=(code,message)=>({ok:false,code,message});
 const port=value=>{
  const match=/^(?:Gi|GigabitEthernet)1\/0\/([15])$/i.exec(value);
  return match?{ok:true,args:{port:match[1]==='5'?'access':'uplink'}}:fail('scope','В этом упражнении доступны только Gi1/0/5 (access) и Gi1/0/1 (существующий trunk).');
 };
 const ids=value=>{
  if(!/^\d+(,\d+)*$/.test(value))return fail('argument','Укажи VLAN ID или список через запятую без пробелов; диапазоны/all/except в этом упражнении не поддержаны.');
  const list=value.split(',').map(Number);
  if(list.some(n=>n<1||n>4094))return fail('argument','VLAN ID должен быть целым числом от 1 до 4094.');
  if(list.some(n=>![1,110,120,130].includes(n)))return fail('scope','В упражнении уже существуют только VLAN 1,110,120,130; создание других VLAN вне границ.');
  if(new Set(list).size!==list.length)return fail('argument','Не повторяй VLAN в одном списке.');
  return {ok:true,args:{ids:list.sort((a,b)=>a-b)}};
 };
 const rule=(words,modes,action)=>({words,modes,action});
 const actions=['repairInterface','repairAccess','repairAllowed','repairAdd','repairRemove','repairShutdown','repairNoShutdown','repairReadAccess','repairReadTrunk','repairReadBrief'];
 const extension={
  keywords:{...Object.fromEntries(['show','interfaces','trunk','allowed','add','remove','no','shutdown','ip','brief'].map(x=>[x,x])),gigabitethernet:'gi'},
  rules:[rule(['interface',':repairPort'],['config'],'repairInterface'),
   rule(['switchport','access','vlan',':repairVlan'],['interface'],'repairAccess'),
   rule(['switchport','trunk','allowed','vlan',':repairList'],['interface'],'repairAllowed'),
   rule(['switchport','trunk','allowed','vlan','add',':repairList'],['interface'],'repairAdd'),
   rule(['switchport','trunk','allowed','vlan','remove',':repairList'],['interface'],'repairRemove'),
   rule(['shutdown'],['interface'],'repairShutdown'),rule(['no','shutdown'],['interface'],'repairNoShutdown'),
   rule(['show','interfaces',':repairPort','switchport'],['exec'],'repairReadAccess'),
   rule(['show','interfaces','gigabitethernet',':repairPortNumber','switchport'],['exec'],'repairReadAccess'),
   rule(['show','interfaces','trunk'],['exec'],'repairReadTrunk'),rule(['show','ip','interface','brief'],['exec'],'repairReadBrief')],
  arguments:{':repairPort':port,':repairPortNumber':value=>port('Gi'+value),':repairList':ids,':repairVlan':value=>/^\d+$/.test(value)?ids(value):fail('argument','Access VLAN — один целый ID, не список.')},actions,
  initial:(s,id)=>({...s,mode:'exec',caseId:id,vlanExists:true,name:'OFFICE',accessMode:true,accessVlan:id==='access-vlan'?130:120,repairPort:null,accessUp:id!=='admin-down',uplinkUp:true,allowed:id==='uplink-vlan'?[1,110]:[1,110,120],existingVlans:{1:'MGMT',110:'CONTROL',120:'OFFICE',130:'CAMERAS'}}),
  validate:(action,args,s)=>{
   if(!actions.includes(action)&&!['enable','configure','exit','end','accessMode'].includes(action))return fail('scope','Создание/именование VLAN и сохранение вне этого короткого упражнения. VLAN уже существуют; после исправления выполни подходящий show из Privileged EXEC.');
   if(['repairAccess','accessMode'].includes(action)&&s.repairPort!=='access')return fail('context','Выбран trunk Gi1/0/1. Access VLAN настраивается только на конечном Gi1/0/5.');
   if(['repairAllowed','repairAdd','repairRemove'].includes(action)&&s.repairPort!=='uplink')return fail('context','Выбран конечный Gi1/0/5. Allowed list меняется на существующем trunk Gi1/0/1.');
   if(action==='repairReadAccess'&&args.port!=='access')return fail('scope','В этом упражнении switchport-выдержка поддержана для Gi1/0/5; для uplink используй show interfaces trunk.');
   return null;
  },
  apply:(s,action,args)=>{
   const next=clone(s);let read=null;
   if(action==='repairInterface'){next.repairPort=args.port;next.mode='interface';}
   if(action==='repairAccess')next.accessVlan=args.ids[0];
   if(action==='repairAllowed')next.allowed=[...args.ids];
   if(action==='repairAdd')next.allowed=[...new Set([...next.allowed,...args.ids])].sort((a,b)=>a-b);
   if(action==='repairRemove')next.allowed=next.allowed.filter(n=>!args.ids.includes(n));
   if(action==='repairShutdown'||action==='repairNoShutdown')next[next.repairPort==='access'?'accessUp':'uplinkUp']=action==='repairNoShutdown';
   if(action.startsWith('repairRead'))read={repairReadAccess:'access',repairReadTrunk:'trunk',repairReadBrief:'brief'}[action];
   return {ok:true,state:next,code:read?'read':'accepted',read,message:read?'Учебный вывод получен.':'Команда применена в учебной конфигурации.'};
  }
 };
 const cli=createVlanCli('Cisco',extension);
 const commands={access:'show interfaces GigabitEthernet1/0/5 switchport',trunk:'show interfaces trunk',brief:'show ip interface brief'};
 const source=kind=>kind==='trunk'?'https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-12/configuration_guide/vlan/b_1712_vlan_9300_cg/configuring_vlan_trunks.html':CLI_OUTPUT_SOURCES.interfaces;
 const snapshot=s=>JSON.stringify({accessVlan:s.accessVlan,accessMode:s.accessMode,accessUp:s.accessUp,uplinkUp:s.uplinkUp,allowed:s.allowed,existingVlans:s.existingVlans});
 function render(s,kind){
  if(kind==='access')return `SW1# ${commands.access}\nName: Gi1/0/5\nSwitchport: Enabled\nAdministrative Mode: static access\nOperational Mode: ${s.accessUp?'static access':'down'}\nAccess Mode VLAN: ${s.accessVlan} (${s.existingVlans[s.accessVlan]})`;
  if(kind==='brief')return `SW1# ${commands.brief}\nInterface              IP-Address      OK? Method Status                Protocol\nGigabitEthernet1/0/1    unassigned      YES unset  ${s.uplinkUp?'up                    up':'administratively down down'}\nGigabitEthernet1/0/5    unassigned      YES unset  ${s.accessUp?'up                    up':'administratively down down'}`;
  const list=s.allowed.join(',')||'none',active=s.allowed.filter(n=>Object.hasOwn(s.existingVlans,n)).join(',')||'none';
  return `SW1# ${commands.trunk}\nPort        Mode             Encapsulation  Status        Native vlan\n${s.uplinkUp?'Gi1/0/1     on               802.1q         trunking      1':''}\n\nPort        Vlans allowed on trunk\n${s.uplinkUp?'Gi1/0/1     '+list:''}\n\nPort        Vlans allowed and active in management domain\n${s.uplinkUp?'Gi1/0/1     '+active:''}\n\nPort        Vlans in spanning tree forwarding state and not pruned\n${s.uplinkUp?'Gi1/0/1     '+active:''}`;
 }
 function remaining(s){
  const missing=[];
  if(s.accessVlan!==120)missing.push('назначь access VLAN 120 на Gi1/0/5');
  if(!s.accessUp)missing.push('включи административно Gi1/0/5');
  if(!s.uplinkUp)missing.push('восстанови административное включение Gi1/0/1');
  if(JSON.stringify(s.allowed)!=='[1,110,120]')missing.push('разреши на trunk VLAN 1,110,120 с сохранением прежних 1/110');
  if(JSON.stringify(s.existingVlans)!==JSON.stringify(extension.initial({},'').existingVlans))missing.push('сохрани все существующие VLAN');
  return missing;
 }
 return {label:VLAN_CLI_PROFILE.label,status:'Сверено по официальным руководствам 17.12.x; конкретный patch release и устройство не проверены.',
  goal:'Gi1/0/5 — access VLAN 120; trunk Gi1/0/1 — VLAN 1,110,120, native 1. Оба порта включены. Сохрани прежние VLAN.',
  controlHint:'Вводи по одной команде. Из режима настройки вернись через end или exit к Privileged EXEC для show. Startup-config в этом упражнении не проверяется.',
  commandHelp:'enable; configure terminal; interface Gi1/0/5 или Gi1/0/1; exit; end. В interface mode: switchport access vlan ID (access), switchport trunk allowed vlan [add|remove] LIST (trunk), shutdown / no shutdown. VLAN: 1,110,120,130. Существующие сокращения переходов/access сохранены; новые trunk/shutdown и show (кроме interface/Gi) — полные слова.',
  assumptions:'Учебный SW1, VTP transparent, Privileged EXEC (#), пароли опущены. VLAN 1 MGMT, 110 CONTROL, 120 OFFICE и 130 CAMERAS уже существуют. Gi1/0/5 — static access, Gi1/0/1 — статический trunk с native VLAN 1. Цель: access 120, trunk 1/110/120, оба порта включены. В каждом упражнении одна исходная неисправность; остальные настройки соответствуют цели. Физические линки исправны; STP forwarding стабилен, VTP pruning выключен. Это предпосылки, не результаты измерений. Проверяется локальная рабочая конфигурация; startup-config и сквозная доставка вне задания.',
  initial:id=>cli.initial(id),apply:cli.apply,completionGrammar:cli.completionGrammar,prompt:cli.prompt,commands,source,render,snapshot,remaining};
}

// Workflow independent of vendor syntax. Add future adapters only after separate source checks.
function createRepairPractice(adapter,cases){
 const definition=id=>cases.find(x=>x.id===id);
 function initial(id){
  const exercise=definition(id);if(!exercise)throw new Error('Unknown repair exercise');
  const device=adapter.initial(id);
  return {id,device,revision:0,verifiedRevision:null,diagnosis:null,initialOutput:adapter.render(device,exercise.read),lastRead:{kind:exercise.read,revision:0}};
 }
 function execute(s,line){
  const result=adapter.apply(s.device,line);if(!result.ok)return {...result,state:s};
  const changed=adapter.snapshot(result.state)!==adapter.snapshot(s.device),revision=s.revision+(changed?1:0);
  const next={...s,device:result.state,revision,verifiedRevision:changed?null:s.verifiedRevision};
  if(result.read){next.lastRead={kind:result.read,revision};if(result.read===definition(s.id).read&&!adapter.remaining(next.device).length)next.verifiedRevision=revision;}
  return {...result,state:next,message:result.read?(next.verifiedRevision===revision?'Локальная конфигурация подтверждена актуальным show.':'Вывод получен; подходящая проверка подтвердит цель после исправления.'):changed?'Конфигурация изменена. Вывод обновлён; после настройки выполни контрольный show.':result.message};
 }
 function answer(s,id){const exercise=definition(s.id);if(!exercise.options.some(o=>o.id===id))return s;return {...s,diagnosis:id};}
 function remaining(s){
  const list=adapter.remaining(s.device);
  if(s.diagnosis!==definition(s.id).answer)list.push('правильно прочитай указанную строку исходного вывода');
  if(s.verifiedRevision!==s.revision)list.push('выполни '+adapter.commands[definition(s.id).read]+' после последнего изменения');
  return list;
 }
 return {adapter,cases,initial,execute,answer,remaining,definition,output:s=>adapter.render(s.device,s.lastRead.kind),complete:s=>remaining(s).length===0};
}
const CLI_REPAIR_PROFILES={Cisco:createRepairPractice(ciscoRepairAdapter(),CLI_REPAIR_CASES)};
function repairPractice(vendor){return CLI_REPAIR_PROFILES[vendor]||null;}
