// One mixed, six-device configuration path. No frames, FDB, ping or physical emulation.
// Source/provenance audit: stages/STAGE_6_MIXED_VLAN_CHAIN.md.
const VLAN_CHAIN_NODES=[
 {id:'SW1',vendor:'Cisco',ports:['1/0/1'],access:'1/0/5'},
 {id:'SW2',vendor:'Eltex',ports:['1/0/1','1/0/2']},
 {id:'SW3',vendor:'SCALANCE',ports:['0/1','0/2']},
 {id:'SW4',vendor:'Cisco',ports:['1/0/1','1/0/2']},
 {id:'SW5',vendor:'Eltex',ports:['1/0/1','1/0/2']},
 {id:'SW6',vendor:'SCALANCE',ports:['0/1'],access:'0/3'}
];
const VLAN_CHAIN_LINKS=Array.from({length:5},(_,i)=>({left:i,leftPort:VLAN_CHAIN_NODES[i].ports.at(-1),right:i+1,rightPort:VLAN_CHAIN_NODES[i+1].ports[0]}));

function createChainAdapter(node){
 const cisco=node.vendor==='Cisco',eltex=node.vendor==='Eltex',scalance=node.vendor==='SCALANCE',copy=x=>JSON.parse(JSON.stringify(x));
 const type=scalance?'fastethernet':'gigabitethernet',label=p=>(scalance?'Fa':eltex?'gi':'Gi')+p;
 const fail=(code,message)=>({ok:false,code,message});
 const port=value=>{
  let p=value;if(cisco){const m=/^(?:gi|gigabitethernet)(1\/0\/[125])$/i.exec(value);p=m?.[1];}
  return [...node.ports,node.access].includes(p)&&p!==undefined?{ok:true,args:{port:p}}:fail('scope','Доступны только порты пути этого узла: '+[...node.ports,node.access].filter(Boolean).map(label).join(', ')+'.');
 };
 const vlan=value=>/^\d+$/.test(value)&&[1,110,120].includes(+value)?{ok:true,args:{vlan:+value}}:fail('argument','В учебной конфигурации доступны VLAN 1,110,120; ID вводится целиком.');
 const onlyNew=value=>value==='120'?{ok:true,args:{vlan:120}}:fail('scope','Настраивается только новый VLAN 120; VLAN 1 и 110 защищены.');
 const list=value=>{
  if(!/^\d+(,\d+)*$/.test(value))return fail('argument','Нужен список VLAN через запятую без пробелов, диапазонов/all/except.');
  const ids=value.split(',').map(Number);
  if(ids.some(n=>![1,110,120].includes(n))||new Set(ids).size!==ids.length)return fail('scope','Используй уникальные VLAN 1,110,120. Другие VLAN не моделируются.');
  if(eltex&&ids.includes(1))return fail('scope','В MES2324 trunk add/remove использует VLAN 2–4094. VLAN 1 здесь native отдельно; не копируй allowed-список Cisco.');
  return {ok:true,args:{ids:ids.sort((a,b)=>a-b)}};
 };
 const rule=(words,modes,action)=>({words,modes,action});
 const rules=[rule(['exit'],['config','vlan','interface'],'chainExit'),rule(['end'],['config','vlan','interface'],'chainEnd')];
 const keywords=Object.fromEntries(['show','running-config','all','interfaces','switchport','trunk','allowed','add','remove','brief'].filter(x=>x!=='switchport').map(x=>[x,x]));
 if(cisco){
  rules.push(rule(['interface',':chainPort'],['config'],'chainInterface'),rule(['vlan',':chainNew'],['config'],'chainVlan'),rule(['name',':name'],['vlan'],'chainName'),
   rule(['show','vlan','brief'],['exec'],'chainReadVlans'),rule(['show','interfaces','trunk'],['exec'],'chainReadTrunk'));
  if(node.access)rules.push(rule(['show','interfaces',':chainPort','switchport'],['exec'],'chainReadPort'));
 }else if(eltex){
  rules.push(rule(['interface','gigabitethernet',':chainPort'],['config','vlan','interface'],'chainInterface'),
   rule(['vlan','database'],['config','vlan','interface'],'chainDatabase'),rule(['vlan',':chainNew'],['vlan'],'chainVlan'),rule(['vlan',':chainNew','name',':name'],['vlan'],'chainVlan'),
   rule(['show','vlan'],['exec'],'chainReadVlans'),rule(['show','interfaces','switchport','gigabitethernet',':chainPort'],['exec'],'chainReadPort'));
  keywords.gigabitethernet='gigabitethernet';
 }else{
  rules.push(rule(['vlan',':chainNew'],['config'],'chainVlan'),rule(['name',':name'],['vlan'],'chainName'),
   rule(['interface','fastethernet',':chainPort'],['config'],'chainInterface'),rule(['switchport','pvid',':chainId'],['interface'],'chainPvid'),
   rule(['show','running-config','vlan',':chainId'],['exec'],'chainReadVlans'),
   rule(['show','running-config','interface','fastethernet',':chainPort','all'],['exec'],'chainReadPort'));
 }
 if(!scalance){
  for(const [tail,action] of [[['add',':chainList'],'chainAdd'],[['remove',':chainList'],'chainRemove'],...cisco?[[[':chainList'],'chainAllowed']]:[]])rules.push(rule(['switchport','trunk','allowed','vlan',...tail],['interface'],action));
  if(node.access)rules.push(rule(['switchport','access','vlan',':chainId'],['interface'],'chainAccess'));
 }
 const customActions=[...new Set(rules.map(r=>r.action)),...scalance?['ports']:[]];
 const initialConfig=()=>{
  const vlans=scalance?{1:{name:'MGMT',members:{'0/5':'untagged','0/6':'untagged'}},110:{name:'CONTROL',members:{'0/1':'tagged','0/2':'tagged','0/4':'untagged'}},120:{name:'OFFICE',members:Object.fromEntries([...node.ports.map(p=>[p,'tagged']),...node.access?[[node.access,'untagged']]:[]])}}:{1:{name:'MGMT'},110:{name:'CONTROL'},120:{name:'OFFICE'}};
  const ports=Object.fromEntries(node.ports.map(p=>[p,{mode:'trunk',pvid:1,allowed:eltex?[110,120]:[1,110,120]}]));
  if(node.access)ports[node.access]={mode:'access',pvid:120,allowed:[]};
  return {vlans,ports};
 };
 const snapshot=s=>JSON.stringify({vlans:s.chainVlans,ports:s.chainPorts});
 const extension={keywords,rules,actions:customActions,
  arguments:{':chainPort':port,':chainNew':onlyNew,':chainId':vlan,':chainList':list},
  initial:s=>{const cfg=initialConfig();return {...s,mode:'exec',chainVlans:cfg.vlans,chainPorts:cfg.ports,chainPort:null,chainDraft:null,chainBaseline:JSON.stringify({vlans:cfg.vlans,ports:cfg.ports})};},
  validate:(action,args,s)=>{
   if(!customActions.includes(action)&&!['enable','configure','accessMode'].includes(action))return fail('scope','Команда вне сценария цепочки. Настраиваются VLAN 120 и порты пути; startup-config, другие VLAN, MAC и трафик не моделируются.');
   if(['chainAdd','chainRemove','chainAllowed'].includes(action)&&!node.ports.includes(s.chainPort))return fail('context','Allowed VLAN относится только к выбранному uplink, не к access-порту.');
   if(['chainAccess','accessMode'].includes(action)&&s.chainPort!==node.access)return fail('context','Access-настройка относится только к '+label(node.access||'нет такого порта')+'.');
   if(['ports','chainName'].includes(action)&&!s.chainVlans[120]&&!s.chainDraft)return fail('context','Сначала создай VLAN 120.');
   if(['chainAdd','chainAccess','chainPvid'].includes(action)&&(args.ids?.includes(120)||args.vlan===120)&&!s.chainVlans[120]&&!cisco)return fail('context','Для этого профиля сначала создай VLAN 120; назначение отсутствующего VLAN не включено в учебную поддержку.');
   if(action==='chainReadPort'&&cisco&&args.port!==node.access)return fail('scope','Для uplink используй show interfaces trunk; switchport-фрагмент здесь относится к исходному access-порту.');
   if(action==='ports'&&[...(args.tagged||[]),...(args.untagged||[])].some(p=>![...node.ports,node.access].includes(p)))return fail('scope','В VLAN 120 на этом узле используются только порты пути и его конечный порт.');
   return null;
  },
  apply:(s,action,args)=>{
   const next=copy(s);let read=null;
   const commit=()=>{if(next.chainDraft){next.chainVlans[120]=next.chainDraft;next.chainDraft=null;}};
   if(action==='chainVlan'){
    if(cisco)next.chainDraft=copy(next.chainVlans[120]||{name:'VLAN0120'});
    else next.chainVlans[120]??=scalance?{name:null,members:{}}:{name:'120'};
    if(args.name)next.chainVlans[120].name=args.name;
    if(!eltex)next.mode='vlan';
   }
   if(action==='chainDatabase')next.mode='vlan';
   if(action==='chainName')(next.chainDraft||next.chainVlans[120]).name=args.name;
   if(action==='chainInterface'){next.mode='interface';next.chainPort=args.port;}
   if(action==='chainExit'||action==='chainEnd'){commit();next.mode=action==='chainEnd'||next.mode==='config'?'exec':'config';next.chainPort=null;}
   if(action==='chainAccess'||action==='chainPvid')next.chainPorts[next.chainPort].pvid=args.vlan;
   if(action==='chainAllowed')next.chainPorts[next.chainPort].allowed=[...args.ids];
   if(action==='chainAdd')next.chainPorts[next.chainPort].allowed=[...new Set([...next.chainPorts[next.chainPort].allowed,...args.ids])].sort((a,b)=>a-b);
   if(action==='chainRemove')next.chainPorts[next.chainPort].allowed=next.chainPorts[next.chainPort].allowed.filter(n=>!args.ids.includes(n));
   if(action==='ports'){
    const members=Object.fromEntries((args.tagged||[]).map(p=>[p,'tagged']));for(const p of args.untagged||[])members[p]='untagged';next.chainVlans[120].members=Object.fromEntries(Object.entries(members).sort(([a],[b])=>a.localeCompare(b)));if(args.name)next.chainVlans[120].name=args.name;
   }
   if(action==='chainReadVlans')read={kind:'vlans',vlan:scalance?args.vlan:null};
   if(action==='chainReadTrunk')read={kind:'trunk'};
   if(action==='chainReadPort')read={kind:'port',port:args.port};
   return {ok:true,state:next,read,code:read?'read':'accepted',message:read?'Получен учебный вывод.':scalance&&action==='ports'?'Полный список ports VLAN 120 заменён; PVID не изменён.':'Команда применена в учебной рабочей конфигурации.'};
  }
 };
 const cli=createVlanCli(node.vendor,extension);
 function prompt(s){const pre=scalance?'cli':eltex?'console':node.id;return (scalance&&snapshot(s)!==s.chainBaseline?'*':'')+pre+({user:'>',exec:'#',config:'(config)#',vlan:scalance?'(config-vlan-120)#':'(config-vlan)#',interface:scalance?'(config-if-Fa'+(s.chainPort||'0/1').replace('/','-')+')#':'(config-if)#'}[s.mode]);}
 const portKey=p=>'port:'+p;
 const required=['vlan',...node.ports.map(portKey),...node.access?[portKey(node.access)]:[]];
 function proofs(read){
  if(read.kind==='trunk')return node.ports.map(portKey);
  if(read.kind==='port')return [portKey(read.port)];
  if(read.kind==='vlans')return scalance?read.vlan===120?['vlan',...node.ports.map(p=>'member:'+p),...node.access?['member:'+node.access]:[]]:[]:eltex?required:['vlan'];
  return [];
 }
 if(scalance)required.push(...node.ports.map(p=>'member:'+p),...node.access?['member:'+node.access]:[]);
 const readCommand=read=>read.kind==='trunk'?'show interfaces trunk':read.kind==='vlans'?scalance?'show running-config vlan '+read.vlan:eltex?'show vlan':'show vlan brief':scalance?'show running-config interface fastethernet '+read.port+' all':eltex?'show interfaces switchport gigabitethernet '+read.port:'show interfaces GigabitEthernet'+read.port+' switchport';
 const checks=scalance?[{kind:'vlans',vlan:120},...[...node.ports,node.access].filter(Boolean).map(p=>({kind:'port',port:p}))]:eltex?[{kind:'vlans'}]:[{kind:'vlans'},{kind:'trunk'},...node.access?[{kind:'port',port:node.access}]:[]];
 function member(s,id,p){
  if(scalance)return s.chainVlans[id]?.members[p]||null;
  const port=s.chainPorts[p];if(port?.mode==='access')return port.pvid===id?'untagged':null;
  return id===port?.pvid?'untagged':port?.allowed.includes(id)?'tagged':null;
 }
 function render(s,read){
  const lines=[prompt({...s,mode:'exec'})+' '+readCommand(read)];
  if(scalance){
   if(read.kind==='vlans'){const v=s.chainVlans[read.vlan];if(v){lines.push('vlan '+read.vlan);if(v.name)lines.push(' name '+v.name);const tagged=Object.keys(v.members).filter(p=>v.members[p]==='tagged').sort(),untagged=Object.keys(v.members).filter(p=>v.members[p]==='untagged').sort();if(tagged.length||untagged.length)lines.push(' ports'+(tagged.length?' fastethernet '+tagged.join(','):'')+(untagged.length?' untagged fastethernet '+untagged.join(','):''));lines.push('exit');}}
   else lines.push('interface fastethernet '+read.port,' no shutdown',' switchport pvid '+s.chainPorts[read.port].pvid,'exit');
  }else if(read.kind==='vlans'){
   if(eltex){lines.push('Created by: D-Default, S-Static, G-GVRP, R-Radius Assigned VLAN, V-Voice VLAN','Vlan Name              Tagged Ports                     UnTagged Ports                   Created by','---- ----------------- -------------------------------- -------------------------------- ----------');
    for(const [id,v] of Object.entries(s.chainVlans)){const tagged=Object.keys(s.chainPorts).filter(p=>member(s,+id,p)==='tagged').map(label),untagged=Object.keys(s.chainPorts).filter(p=>member(s,+id,p)==='untagged').map(label);if(+id===1)untagged.push('gi1/0/6');if(+id===110)untagged.push('gi1/0/4');lines.push(id.padEnd(5)+v.name.padEnd(18)+tagged.join(',').padEnd(33)+untagged.join(',').padEnd(33)+(+id===1?'D':'S'));}
   }else{lines.push('VLAN Name                             Status    Ports','---- -------------------------------- --------- -------------------------------');for(const [id,v] of Object.entries(s.chainVlans)){const ports=[...(+id===1?['Gi1/0/6']:+id===110?['Gi1/0/4']:[]),...(node.access&&s.chainPorts[node.access].pvid===+id?[label(node.access)]:[])];lines.push(id.padEnd(5)+v.name.padEnd(33)+'active    '+ports.join(', '));}}
  }else if(read.kind==='trunk'){
   lines.push('Port        Mode             Encapsulation  Status        Native vlan',...node.ports.map(p=>label(p).padEnd(12)+'on               802.1q         trunking      1'));
   for(const [heading,active] of [['Vlans allowed on trunk',false],['Vlans allowed and active in management domain',true],['Vlans in spanning tree forwarding state and not pruned',true]])lines.push('','Port        '+heading,...node.ports.map(p=>label(p).padEnd(12)+(s.chainPorts[p].allowed.filter(id=>!active||s.chainVlans[id]).join(',')||'none')));
  }else{
   const p=s.chainPorts[read.port];if(eltex){lines.push('Port : '+label(read.port),'Port Mode: Trunk','Ingress Filtering: true','Acceptable Frame Type: admitAll','Ingress UnTagged VLAN ( NATIVE ): '+p.pvid,'Port is member in:','Vlan Name                             Egress rule Added by','---- -------------------------------- ----------- --------');for(const [id,v] of Object.entries(s.chainVlans)){const m=member(s,+id,read.port);if(m)lines.push(id.padEnd(5)+v.name.padEnd(33)+(m==='tagged'?'Tagged':'Untagged').padEnd(12)+(+id===1?'D':'S'));}}
   else lines.push('Name: '+label(read.port),'Switchport: Enabled','Administrative Mode: static access','Operational Mode: static access','Access Mode VLAN: '+p.pvid+' ('+s.chainVlans[p.pvid].name+')');
  }
  return lines.join('\n');
 }
 function issues(s){
  const out=[],issue=(key,message,path=false)=>out.push({key,message,path});
  if(!s.chainVlans[120])issue('vlan','VLAN 120 ещё не создан',true);else if(s.chainVlans[120].name!=='OFFICE')issue('vlan','Имя VLAN 120 отличается от планового OFFICE (это не запрет пересылки)');
  for(const p of node.ports){if(member(s,120,p)!=='tagged')issue(scalance?'member:'+p:portKey(p),label(p)+': нет tagged-членства VLAN 120',true);if(s.chainPorts[p].pvid!==1)issue(portKey(p),label(p)+': исходный PVID/native 1 изменён; это отдельно от tagged VLAN 120');if(!scalance){for(const id of eltex?[110]:[1,110])if(!s.chainPorts[p].allowed.includes(id))issue(portKey(p),label(p)+': потеряно прежнее разрешение VLAN '+id);}}
  if(node.access){if(member(s,120,node.access)!=='untagged')issue(scalance?'member:'+node.access:portKey(node.access),label(node.access)+': нет untagged/access-членства VLAN 120',true);if(s.chainPorts[node.access].pvid!==120)issue(portKey(node.access),label(node.access)+(scalance?': входной PVID ':': access VLAN ')+s.chainPorts[node.access].pvid+' вместо 120'+(scalance?' для нетегированного обратного трафика; untagged egress задаётся отдельно':''),true);}
  const baseline=initialConfig().vlans;for(const id of [1,110])if(JSON.stringify(s.chainVlans[id])!==JSON.stringify(baseline[id]))issue('vlan','Изменена прежняя конфигурация VLAN '+id);
  return out;
 }
 return {node,label,initial:()=>cli.initial(),apply:cli.apply,prompt,snapshot,render,proofs,required,checks,readCommand,member,issues};
}

const VLAN_CHAIN_ADAPTERS=VLAN_CHAIN_NODES.map(createChainAdapter);
const VLAN_CHAIN_MODEL={
 initial(clean=false){
  const devices=VLAN_CHAIN_ADAPTERS.map(a=>({config:a.initial(),revision:0,proofs:{},lastRead:null,log:[],feedback:''}));
  if(!clean){devices[1].config.chainPorts['1/0/2'].allowed=[110];devices[2].config.chainVlans[120].members={'0/2':'tagged'};delete devices[3].config.chainVlans[120];devices[5].config.chainPorts['0/3'].pvid=1;}
  for(let i=0;i<devices.length;i++)devices[i].config.chainBaseline=VLAN_CHAIN_ADAPTERS[i].snapshot(devices[i].config);
  const s={devices,selected:0};s.initialIssues=devices.flatMap((d,i)=>VLAN_CHAIN_ADAPTERS[i].issues(d.config).map(x=>({node:i,...x})));return s;
 },
 execute(s,index,line){
  const a=VLAN_CHAIN_ADAPTERS[index],d=s.devices[index];if(!a||!d)return {ok:false,state:s,message:'Выбери один из шести узлов.'};
  const result=a.apply(d.config,line);if(!result.ok)return {...result,state:s};
  const changed=a.snapshot(result.state)!==a.snapshot(d.config),next={...d,config:result.state,revision:d.revision+(changed?1:0),proofs:changed?{}:{...d.proofs}};
  if(result.read){next.lastRead={...result.read,revision:next.revision};for(const key of a.proofs(result.read))next.proofs[key]={revision:next.revision,command:a.readCommand(result.read)};}
  const devices=[...s.devices];devices[index]=next;return {...result,state:{...s,devices},message:result.read?'Учебный вывод получен; подтверждены только показанные поля этого узла.':changed?'Рабочая конфигурация изменена. Проверки этого устройства устарели.':'Режим/команда принят; конфигурация не изменилась.'};
 },
 fresh(s,i,key){return s.devices[i].proofs[key]?.revision===s.devices[i].revision;},
 visibleIssues(s,i){return VLAN_CHAIN_ADAPTERS[i].issues(s.devices[i].config).filter(x=>this.fresh(s,i,x.key));},
 complete(s){return s.devices.every((d,i)=>!VLAN_CHAIN_ADAPTERS[i].issues(d.config).length&&VLAN_CHAIN_ADAPTERS[i].required.every(k=>this.fresh(s,i,k)));},
 endpoint(s,i,p){
  const a=VLAN_CHAIN_ADAPTERS[i],keys=['vlan','port:'+p,...a.node.vendor==='SCALANCE'?['member:'+p]:[]],visible=this.visibleIssues(s,i).filter(x=>keys.includes(x.key));
  return {ok:keys.every(k=>this.fresh(s,i,k))&&!visible.some(x=>x.path),pending:keys.some(k=>!this.fresh(s,i,k)),problems:visible.filter(x=>x.path).map(x=>x.message),warnings:visible.filter(x=>!x.path).map(x=>x.message)};
 },
 link(s,l){
  const endpoints=[[l.left,l.leftPort],[l.right,l.rightPort]],problems=[],warnings=[],pending=[];
  for(const [i,p] of endpoints){const a=VLAN_CHAIN_ADAPTERS[i],keys=['vlan','port:'+p,...a.node.vendor==='SCALANCE'?['member:'+p]:[]];for(const key of keys)if(!this.fresh(s,i,key))pending.push(a.node.id+' '+a.label(p));for(const x of this.visibleIssues(s,i).filter(x=>keys.includes(x.key)))(x.path?problems:warnings).push(a.node.id+': '+x.message);}
  return {ok:!pending.length&&!problems.length,pending:[...new Set(pending)],problems,warnings};
 }
};
