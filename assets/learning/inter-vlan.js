(function(root){'use strict';
const addr={a:'192.168.10.10',b:'192.168.20.20',g10:'192.168.10.1',g20:'192.168.20.1',wrong:'192.168.10.254'},mac={a:'02:00:00:00:10:0a',b:'02:00:00:00:20:0b',g10:'02:00:00:00:00:01',g20:'02:00:00:00:00:01'};
const normal=()=>({gateway:addr.g10,allowed:[10,20,30]});
function arp(src,target,reply=false,dest){return {Ethernet:{source:mac[src],destination:reply?mac[dest]:'ff:ff:ff:ff:ff:ff',type:'0x0806'},ARP:{operation:reply?'Reply':'Request',senderIP:addr[src],senderMAC:mac[src],targetIP:target,targetMAC:reply?mac[dest]:'00:00:00:00:00:00'},IP:null,ICMP:null};}
function echo(reverse=false,routed=false){return {Ethernet:{source:mac[routed?(reverse?'g10':'g20'):(reverse?'b':'a')],destination:mac[routed?(reverse?'a':'b'):(reverse?'g20':'g10')],type:'0x0800'},ARP:null,IP:{source:addr[reverse?'b':'a'],destination:addr[reverse?'a':'b'],TTL:routed?63:64,protocol:1},ICMP:{type:reverse?0:8,code:0,id:20,sequence:1}};}
function trace(impl='router',cfg=normal()){
 const fdb={},arpCache={a:{},b:{},g10:{},g20:{}},out=[];
 const copy=x=>JSON.parse(JSON.stringify(x));
 function add(index,text,segments=[],extra={}){out.push({index,text,segments,...extra,fdb:copy(fdb),arp:copy(arpCache)});}
 function wire(frame,vlan,from,to,tag){const f=copy(frame);f.dot1q=tag?{VID:vlan,PCP:0,DEI:0,innerType:f.Ethernet.type}:null;if(tag)f.Ethernet.type='0x8100';return {from,to,vlan,wireTag:tag?vlan:null,frame:f};}
 function transfer(frame,vlan,from,to){
 const isHost=from==='a'||from==='b';
 if(impl==='svi'){if(isHost)fdb[vlan+'|'+frame.Ethernet.source]='access '+from.toUpperCase();return [wire(frame,vlan,from,to,false)];}
 const legs=[wire(frame,vlan,from,'s',!isHost)];
 // VLAN 20 excluded on the switch's trunk ingress: rejected frames do not teach MAC.
 if(vlan===20&&!cfg.allowed.includes(20))return legs;
 fdb[vlan+'|'+frame.Ethernet.source]=isHost?'access '+from.toUpperCase():'trunk к R';legs.push(wire(frame,vlan,'s',to,isHost));return legs;
 }
 add(0,'192.168.10 ≠ 192.168.20 при /24. Следующий узел — шлюз VLAN 10.',[],{at:'a'});
 let legs=transfer(arp('a',cfg.gateway),10,'a','g10');if(cfg.gateway!==addr.g10){add(1,'ARP остался в VLAN 10. По запрошенному адресу ответа нет.',legs,{at:'g10',blocked:true,reason:'gateway'});return out;}
 arpCache.g10[addr.a]=mac.a;add(1,'ARP к шлюзу остаётся в VLAN 10. MAC A изучен на входном access.',legs,{at:'g10',broadcast:10});
 legs=transfer(arp('g10',addr.a,true,'a'),10,'g10','a');arpCache.a[addr.g10]=mac.g10;add(2,'Шлюз сообщает MAC. ПК A сохраняет ARP-запись.',legs,{at:'a'});
 add(3,'Кадр идёт шлюзу. IP-назначение по-прежнему ПК B.',transfer(echo(),10,'a','g10'),{at:'g10'});
 add(4,'Подключённый маршрут 192.168.20.0/24. TTL 64 → 63, IP сохранены.',[],{at:'g20',route:{from:10,to:20,input:echo(),packet:echo(false,true).IP}});
 legs=transfer(arp('g20',addr.b),20,'g20','b');if(impl==='router'&&!cfg.allowed.includes(20)){add(5,'Tagged VLAN 20 остановлена на trunk коммутатора.',legs,{at:'s',blocked:true,reason:'allowed'});return out;}
 arpCache.b[addr.g20]=mac.g20;add(5,'ARP в VLAN 20 ищет ПК B. VLAN 10 его не получает.',legs,{at:'b',broadcast:20});
 legs=transfer(arp('b',addr.g20,true,'g20'),20,'b','g20');arpCache.g20[addr.b]=mac.b;add(6,'ПК B сообщает MAC. Шлюз VLAN 20 сохраняет запись.',legs,{at:'g20'});
 add(7,'Новый Ethernet к ПК B. IP A → B сохранены; TTL 63.',transfer(echo(false,true),20,'g20','b'),{at:'b'});
 add(8,'ПК B создаёт Echo Reply с собственным TTL 64 и отправляет шлюзу.',transfer(echo(true),20,'b','g20'),{at:'g20'});
 add(9,'Обратный connected маршрут VLAN 10. TTL ответа 64 → 63.',[],{at:'g10',route:{from:20,to:10,input:echo(true),packet:echo(true,true).IP}});
 add(10,'Echo Reply доставлен ПК A. Обратный ARP уже известен.',transfer(echo(true,true),10,'g10','a'),{at:'a',success:true});return out;
}
function question(step,impl){const gateway=impl==='svi'?'SVI 10':'R.10';return ({1:{text:'Чей MAC нужен ПК A?',choices:[gateway,'ПК B'],nodes:['g10','b'],correct:0},4:{text:impl==='svi'?'Что изменится между SVI?':'Что изменит маршрутизатор?',choices:['Ethernet MAC и TTL','IP-адреса источника/цели'],correct:0},5:{text:impl==='svi'?'Где распространяется ARP от SVI 20?':'В какую VLAN уйдёт ARP от R.20?',choices:['Только VLAN 20','В VLAN 10 и 20'],nodes:['g20','g10'],correct:0},7:{text:impl==='svi'?'Через какой SVI выйдет пакет к B?':'Через какой подинтерфейс/VLAN пойдёт пакет к B?',choices:[impl==='svi'?'SVI 20':'R.20 · VLAN 20',impl==='svi'?'SVI 10':'R.10 · VLAN 10'],nodes:['g20','g10'],correct:0}})[step]||null;}
function makeCase(id){return {config:{...normal(),...(id==='gateway'?{gateway:addr.wrong}:{allowed:[10,30]})},phase:'broken',facts:[],step:0,completed:false,message:''};}
function normalizeCase(id,raw){const c=makeCase(id);if(!raw||!['broken','applied','checking','verified'].includes(raw.phase))return c;c.phase=raw.phase;c.completed=raw.completed===true||raw.phase==='verified';c.facts=Array.isArray(raw.facts)?raw.facts.filter(x=>['ping','config','trace'].includes(x)):[];c.step=Number.isInteger(raw.step)?Math.max(0,Math.min(10,raw.step)):0;if(raw.config&&[addr.g10,addr.wrong].includes(raw.config.gateway)&&Array.isArray(raw.config.allowed))c.config={gateway:raw.config.gateway,allowed:[...raw.config.allowed]};else if(c.phase!=='broken')c.config=normal();return c;}
function known(c){return c.facts.includes('config')||c.facts.includes('trace');}
function diagnose(id,c,check,impl){if(check==='ping')return 'Echo Reply не получен. Отсутствие ARP-ответа само по себе не доказывает неверный шлюз.';if(id==='gateway')return check==='trace'?`Трасса: ПК A запрашивает MAC ${c.config.gateway}. Сверка с планом: шлюз должен быть ${addr.g10}. ${c.config.gateway===addr.g10?'Адрес соответствует плану.':'Запрошенный свободный адрес отличается от планового шлюза; он не отвечает на ARP.'}`:`План: gateway A ${addr.g10}; факт ${c.config.gateway}. Маска A /24, адрес A ${addr.a}. ${impl==='svi'?'SVI 10':'R.10'} ${addr.g10} включён и отвечает. Адрес ${addr.wrong} свободен.`;return check==='trace'?`Трасса: R послал 802.1Q VLAN 20, switch ingress allowed ${c.config.allowed.join(',')}; ${c.config.allowed.includes(20)?'VLAN 20 разрешена.':'причина drop — VLAN 20 отсутствует в allowed.'} План: 10,20,30.`:`Trunk к R: план allowed 10,20,30; факт ${c.config.allowed.join(',')}. Access B VLAN 20, R.20 включён.`;}
function transition(impl,id,raw,event){const c=normalizeCase(id,raw);if(id==='allowed'&&impl!=='router'){c.message='Этот случай доступен только с внешним trunk к маршрутизатору.';return c;}if(event.type==='restart'){const fresh=makeCase(id);fresh.completed=c.completed;return fresh;}if(event.type==='check'){if(!['ping','config','trace'].includes(event.check))return c;if(!c.facts.includes(event.check))c.facts.push(event.check);c.message=diagnose(id,c,event.check,impl);}if(event.type==='fix'){if(!known(c))c.message='Нужно получить данные: сверить конфигурацию или трассу с планом.';else if(event.choice!==id)c.message='Выбрано неподходящее исправление.';else{if(id==='gateway')c.config.gateway=addr.g10;else c.config.allowed=[...new Set([...c.config.allowed,20])].sort((a,b)=>a-b);c.phase='applied';c.step=0;c.message='Исправлено, проверь связь. Запусти контрольный ping.';}}
 if(event.type==='ping'&&c.phase!=='broken'){c.phase='checking';c.step=1;c.message='Контрольный ping: ARP → маршрутизация → Echo Reply.';}
 if(event.type==='next'&&c.phase==='checking'){c.step=Math.min(10,c.step+1);if(trace(impl,c.config)[c.step]?.success){c.phase='verified';c.completed=true;c.message='Echo Reply получен. Случай завершён.';}}return c;}
const api={addr,mac,normal,arp,echo,trace,question,makeCase,normalizeCase,known,diagnose,transition};if(typeof module!=='undefined')module.exports=api;root.InterVlan=api;
})(typeof window==='undefined'?globalThis:window);
