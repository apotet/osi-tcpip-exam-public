// CRS326-24G-2S+RM / RouterOS 7.16.2: bounded adapter for the shared VLAN engine.
// Sources, initial configuration and deliberate omissions: stages/STAGE_6_MIKROTIK_CRS326_7_16_2.md.
const MIKROTIK_BRIDGE_DOC='https://help.mikrotik.com/docs/spaces/ROS/pages/28606465/Bridge+VLAN+Table';
const MIKROTIK_VLAN_PROFILE={
 label:'MikroTik CRS326-24G-2S+RM · RouterOS 7.16.2 (не SwOS)',
 status:'Базовый синтаксис bridge VLAN сверен по обновляемой официальной документации. Точная версионная сверка RouterOS 7.16.2 неполная: поведение этой сборки не подтверждено отдельным руководством или проверкой на устройстве. На устройстве не проверено; установленная версия неизвестна. Только полные слова, без сокращений и скриптов.',
 source:MIKROTIK_BRIDGE_DOC,
 assumptions:'Учебный администратор с правом записи; отдельная RJ45 serial-консоль 115200 8N1, Normal mode (не Safe mode), RouterOS, не SwOS. bridge1 уже существует: vlan-filtering=yes, ether-type=0x8100, CPU frame-types=admit-only-vlan-tagged, ingress-filtering=yes. ether1–5 уже в bridge1 и активны. VLAN 1: tagged ether1,ether2 / untagged ether3; VLAN 110: tagged ether1,ether2 / untagged ether4. ether3 PVID 1, ether4 PVID 110, оба принимают только untagged/priority-tagged и имеют ingress-filtering=yes. Исходно ether1,ether2: PVID 1, frame-types=admit-only-vlan-tagged, ingress-filtering=no; ether5: PVID 1, frame-types=admit-all, ingress-filtering=no (всё задано явно, не значения по умолчанию). VLAN-интерфейсов, MVRP и IP-доступа через bridge нет. Изменения применяются сразу, отдельный save не нужен.',
 goal:'Добавь VLAN 120: ether1,ether2 tagged, ether5 untagged. PVID ether5 = 120; его frame-types=admit-only-untagged-and-priority-tagged. ether1,ether2: frame-types=admit-only-vlan-tagged, PVID остаётся 1. Для всех трёх ingress-filtering=yes. Сохрани VLAN 1/110. Это немедленное применение без save.',
 create:'VLAN 120 ещё нет. Добавь его с tagged ether1,ether2, без статических untagged-портов; порты пока не меняй.',
 access:'VLAN 120 уже имеет tagged ether1,ether2, без untagged. Добавь ether5 как untagged, отдельно задай PVID 120, frame-types=admit-only-untagged-and-priority-tagged и ingress-filtering=yes. ether1,ether2 пока не меняй.',
 trunk:'VLAN 120 уже имеет tagged ether1 и untagged ether5; ether5 уже настроен как конечный порт VLAN 120. Добавь ether2 как tagged, сохрани ether1/ether5 и прежние VLAN. ether1,ether2: frame-types=admit-only-vlan-tagged, ingress-filtering=yes, PVID 1.'
};

function mikrotikVlanAdapter(){
 const taggedOnly='admit-only-vlan-tagged',accessOnly='admit-only-untagged-and-priority-tagged';
 const clone=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const oldVlans=()=>({1:{tagged:['ether1','ether2'],untagged:['ether3']},110:{tagged:['ether1','ether2'],untagged:['ether4']}});
 const basePort=port=>({pvid:1,'frame-types':port==='ether5'?'admit-all':taggedOnly,'ingress-filtering':'no'});
 function initial(task='lab'){
  const s={task,menu:'',bridge:{'vlan-filtering':'yes'},ports:{ether1:basePort('ether1'),ether2:basePort('ether2'),ether5:basePort('ether5')},vlans:oldVlans()};
  if(['access','trunk'].includes(task))s.vlans[120]={tagged:task==='trunk'?['ether1']:['ether1','ether2'],untagged:task==='trunk'?['ether5']:[]};
  if(task==='trunk')s.ports.ether5={pvid:120,'frame-types':accessOnly,'ingress-filtering':'yes'};
  return s;
 }
 const prompt=s=>'[admin@SW1] '+(s.menu?'/'+s.menu.split(' ').join('/'):'')+'> ';
 function apply(state,input){
  const fail=(code,message)=>({ok:false,code,message,state});
  const line=input.trim();if(!line||/[\r\n]/.test(line))return fail('input','Введи одну непустую команду RouterOS; переносы строк выполняй отдельно.');
  if(/^(save|write|copy|commit|exit|end|system-view|configure)(\s|$)/.test(line))return fail('unsupported','В этом профиле RouterOS изменения применяются сразу; save и команды других ОС не поддерживаются. Для выхода в корень используй /.');
  // Tokenize brackets separately, preserving case-sensitive values and empty lists.
  // Quotes, command chaining, substitutions and scripts are deliberately out of scope.
  if(/[;"'\\$\{\}]/.test(line))return fail('scope','В упражнении поддержаны простые key=value и один find; кавычки, скрипты и цепочки команд вне границ поддержки.');
  const s=clone(state);let tokens=line.replace(/([\[\]])/g,' $1 ').trim().split(/\s+/),menu=state.menu;
  const success=message=>({ok:true,code:'applied',message,state:s});
  if(line==='/'){s.menu='';return success('Корневое меню. Настройки не изменены.');}
  if(line==='..'){s.menu=menu.split(' ').slice(0,-1).join(' ');return success('Переход на уровень выше. Настройки не изменены.');}
  const absolute=tokens[0].startsWith('/');
  if(absolute||tokens[0]==='interface'||tokens[0]==='bridge'||tokens[0]==='port'||tokens[0]==='vlan'){
   const path=[];
   while(tokens.length&&/^[\/a-z-]+\/?$/.test(tokens[0])&&!['set','add','print'].includes(tokens[0])){
    const parts=tokens[0].split('/').filter(Boolean);
    if(!parts.every(p=>['interface','bridge','port','vlan'].includes(p)))break;
    path.push(...parts);tokens.shift();
   }
   if(path.length)menu=(absolute?[]:menu?menu.split(' '):[]).concat(path).join(' ');
  }
  const menus=['','interface','interface bridge','interface bridge port','interface bridge vlan'];
  if(!menus.includes(menu))return fail('mode','Такого меню нет в учебной грамматике. Используй /interface bridge, /interface bridge port или /interface bridge vlan.');
  if(!tokens.length){s.menu=menu;return success('Меню /'+menu.split(' ').join('/')+'.');}
  const action=tokens.shift();
  if(!['set','add'].includes(action))return fail('unsupported','Поддержаны полные add/set в соответствующем bridge-меню и переходы / и .. . Команды print изучаются отдельно в формате «Читать вывод». Сокращения не заявлены.');
  if(!['interface bridge','interface bridge port','interface bridge vlan'].includes(menu))return fail('mode','Команда '+action+' требует контекста bridge, bridge port или bridge vlan. Укажи полный путь либо сначала перейди в нужное меню.');
  const params=arr=>{
   const out={};for(const token of arr){const m=/^([a-z-]+)=([^=]*)$/.exec(token);if(!m||Object.hasOwn(out,m[1]))return null;out[m[1]]=m[2];}return out;
  };
  let selected=null;
  if(action==='set'){
   if(tokens[0]==='['){
    const end=tokens.indexOf(']');if(end<0||tokens[1]!=='find')return fail('selector','Нужен закрытый селектор [find …] с точными свойствами выбранной строки.');
    const filter=tokens.slice(2,end);if(filter[0]==='where')filter.shift();selected=params(filter);tokens=tokens.slice(end+1);
    const keys=selected&&Object.keys(selected).sort().join(',');
    if(menu==='interface bridge port'&&keys!=='interface'||menu==='interface bridge vlan'&&keys!=='bridge,vlan-ids'||menu==='interface bridge'&&keys!=='name')return fail('selector','Селектор должен однозначно задавать interface=etherN, bridge=bridge1 vlan-ids=120 или name=bridge1 для соответствующего меню. Числовые индексы и динамические строки не поддерживаются.');
   }else if(menu==='interface bridge'&&tokens[0]==='bridge1'){selected={name:tokens.shift()};}
   else return fail('selector','Используй документированный find по точным свойствам; для bridge допустимо имя bridge1. Числовые номера строк вне учебной грамматики.');
  }
  const emptyLists=menu==='interface bridge vlan'&&action==='set';
  const clear=emptyLists?tokens.filter(t=>['!tagged','!untagged'].includes(t)):[];
  if(tokens.some(t=>/^[a-z-]+=$/.test(t)))return fail('argument','Пустой key=value не включён в учебную грамматику. Для сброса списка используй документированный set … !tagged или !untagged.');
  const values=params(tokens.map(t=>clear.includes(t)?t.slice(1)+'=':t));if(!values||!tokens.length)return fail('argument','Ожидаются уникальные параметры key=value, разделённые пробелами; список портов задаётся через запятую.');
  const permitted=menu==='interface bridge vlan'?(action==='add'?['bridge','vlan-ids','tagged','untagged']:['tagged','untagged']):menu==='interface bridge port'?['pvid','frame-types','ingress-filtering']:['vlan-filtering'];
  for(const k of Object.keys(values))if(!permitted.includes(k))return fail('argument','Параметр '+k+' не поддержан в этом меню/действии. Допустимы: '+permitted.join(', ')+'. Только полные имена параметров.');
  if(menu==='interface bridge vlan'){
   if(action==='add'){
    if(values.bridge!=='bridge1')return fail('scope','Добавляй запись только для существующего bridge1; регистр имени значим.');
    if(values['vlan-ids']!=='120')return fail('scope','В упражнении создаётся только одна статическая запись vlan-ids=120. Диапазоны, другие VLAN и объединённые строки вне границ поддержки.');
    if(s.vlans[120])return fail('scope','В учебной таблице статическая запись VLAN 120 уже существует. Измени её через set [find bridge=bridge1 vlan-ids=120]; вторая запись вне упражнения.');
   }else{
    if(selected.bridge!=='bridge1'||selected['vlan-ids']!=='120')return fail('scope','Изменять можно только статическую запись bridge1 / VLAN 120. Прежние VLAN 1/110 защищены условиями упражнения.');
    if(!s.vlans[120])return fail('selector','Статической записи bridge1 / VLAN 120 ещё нет. Сначала add; динамическое PVID-членство не создаёт редактируемую статическую строку.');
   }
   const row=clone(s.vlans[120]||{tagged:[],untagged:[]});
   for(const kind of ['tagged','untagged'])if(Object.hasOwn(values,kind)){
    const ports=values[kind]===''?[]:values[kind].split(',');
    if(ports.some(p=>!['ether1','ether2','ether5'].includes(p))||new Set(ports).size!==ports.length)return fail('argument','В списке '+kind+' допустимы уникальные ether1,ether2,ether5 с точным регистром; без пробелов после запятых. Для сброса списка используй !tagged или !untagged.');
    row[kind]=ports.sort();
   }
   if(row.tagged.some(p=>row.untagged.includes(p)))return fail('scope','Один порт не может иметь два egress-действия в учебной строке VLAN 120. Сначала убери его из противоположного списка.');
   s.vlans[120]=row;
  }else if(menu==='interface bridge port'){
   if(action!=='set')return fail('scope','Все порты уже добавлены в bridge1; в упражнении меняются только их параметры через set.');
   const port=selected.interface;if(!Object.hasOwn(s.ports,port))return fail('scope','Менять можно только ether1,ether2,ether5; имена чувствительны к регистру. ether3/4 сохраняют исходную конфигурацию.');
   for(const [k,v] of Object.entries(values)){
    if(k==='pvid'&&(!/^\d+$/.test(v)||+v<1||+v>4094))return fail('argument','PVID должен быть целым VLAN ID от 1 до 4094. Он не заменяет статические tagged/untagged списки.');
    if(k==='frame-types'&&!['admit-all',taggedOnly,accessOnly].includes(v))return fail('argument','frame-types: admit-all, admit-only-vlan-tagged или admit-only-untagged-and-priority-tagged; нужен полный литерал.');
    if(k==='ingress-filtering'&&!['yes','no'].includes(v))return fail('argument','ingress-filtering принимает yes или no; регистр литерала сохраняется.');
    s.ports[port][k]=k==='pvid'?+v:v;
   }
  }else{
   if(action!=='set'||selected.name!=='bridge1')return fail('scope','Учебный bridge1 уже существует; поддержан только set bridge1 vlan-filtering=yes/no.');
   if(!['yes','no'].includes(values['vlan-filtering']))return fail('argument','vlan-filtering принимает yes или no; без фильтрации VLAN-задача не завершена.');
   s.bridge['vlan-filtering']=values['vlan-filtering'];
  }
  // An absolute command executes without changing the user's current menu.
  return success('Изменения применены сразу. '+(menu==='interface bridge vlan'?'set заменяет указанный список целиком; остальные поля остаются прежними. ':'')+'Отдельный save не требуется.');
 }
 function remaining(s,task=s.task||'lab'){
  const missing=[],wantAccess=task==='lab'||task==='access'||task==='trunk',wantTrunk=task==='lab'||task==='trunk',row=s.vlans[120];
  if(s.bridge['vlan-filtering']!=='yes')missing.push('включи vlan-filtering=yes на bridge1');
  if(!row)missing.push('создай статическую строку VLAN 120 в bridge1');
  else{
   if(!same(row.tagged,['ether1','ether2']))missing.push('задай полный tagged=ether1,ether2 для VLAN 120; set заменяет список');
   if(!same(row.untagged,wantAccess?['ether5']:[]))missing.push(wantAccess?'задай статическое untagged=ether5 для VLAN 120 отдельно от PVID':'при создании оставь untagged пустым');
  }
  for(const port of ['ether1','ether2','ether5']){
   const wanted=port==='ether5'&&wantAccess?{pvid:120,'frame-types':accessOnly,'ingress-filtering':'yes'}:port!=='ether5'&&wantTrunk?{pvid:1,'frame-types':taggedOnly,'ingress-filtering':'yes'}:basePort(port);
   for(const [key,value] of Object.entries(wanted))if(s.ports[port][key]!==value)missing.push(`${port}: задай ${key}=${value}`);
  }
  for(const [id,row] of Object.entries(oldVlans()))if(!same(s.vlans[id],row))missing.push('сохрани статическую строку VLAN '+id+' без изменения прежних участников');
  return missing;
 }
 function hint(s){
  const task=s.task||'lab',access=task!=='create',trunk=task==='lab'||task==='trunk';
  if(s.bridge['vlan-filtering']!=='yes')return '/interface bridge set bridge1 vlan-filtering=yes';
  if(!s.vlans[120])return '/interface bridge vlan add bridge=bridge1 vlan-ids=120 tagged=ether1,ether2'+(access?' untagged=ether5':'');
  if(!same(s.vlans[120].tagged,['ether1','ether2'])||!same(s.vlans[120].untagged,access?['ether5']:[]))return '/interface bridge vlan set [find bridge=bridge1 vlan-ids=120] tagged=ether1,ether2 '+(access?'untagged=ether5':'!untagged');
  for(const port of ['ether5','ether1','ether2']){
   const want=port==='ether5'&&access?{pvid:120,'frame-types':accessOnly,'ingress-filtering':'yes'}:port!=='ether5'&&trunk?{pvid:1,'frame-types':taggedOnly,'ingress-filtering':'yes'}:basePort(port);
   if(!same(s.ports[port],want))return `/interface bridge port set [find interface=${port}] `+Object.entries(want).map(([k,v])=>k+'='+v).join(' ');
  }
  return '/';
 }
 return {initial,apply,prompt,remaining,hint};
}
