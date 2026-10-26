(function(root){
'use strict';
const mac={pc:'02:00:00:00:01:10',lan:'02:00:00:00:01:01',wan:'02:00:00:00:02:01',server:'02:00:00:00:02:20',broadcast:'ff:ff:ff:ff:ff:ff'};
const ip={pc:'192.168.1.10',lan:'192.168.1.1',wan:'192.168.2.1',server:'192.168.2.20'};
const arp=(src,dst,target,reply=false)=>({Ethernet:{source:mac[src],destination:reply?mac[dst]:mac.broadcast,type:'0x0806'},ARP:{operation:reply?'Reply':'Request',senderIP:ip[src],senderMAC:mac[src],targetIP:ip[target],targetMAC:reply?mac[dst]:'00:00:00:00:00:00'},IP:null,ICMP:null});
const echo=(src,dst,reverse=false,routed=false)=>({Ethernet:{source:mac[src],destination:mac[dst],type:'0x0800'},ARP:null,IP:{source:reverse?ip.server:ip.pc,destination:reverse?ip.pc:ip.server,TTL:routed?63:64,protocol:1,checksum:routed?'после TTL должна пересчитываться (символически; не вычислена)':'исходная (символически; не вычислена)'},ICMP:{type:reverse?0:8,code:0,id:42,sequence:1}});
const steps=[
['Выбор маршрута','ПК','ПК сравнивает /24: сервер вне 192.168.1.0/24. Следующий узел — шлюз 192.168.1.1. ARP-кэши пусты.',null,{}],
['Кто знает шлюз?','ПК → Коммутатор → Маршрутизатор','ПК запрашивает MAC шлюза, а не сервера. Коммутатор раздаёт broadcast в LAN; маршрутизатор не передаёт ARP в другую подсеть.',arp('pc','lan','lan'),{router:'ПК → '+mac.pc},['Чей MAC нужно узнать?', ['Шлюза 192.168.1.1','Сервера 192.168.2.20'],0]],
['ARP-ответ шлюза','Маршрутизатор → Коммутатор → ПК','Шлюз изучил отправителя запроса. ПК принимает unicast-ответ и сохраняет MAC шлюза.',arp('lan','pc','pc',true),{pc:'шлюз → '+mac.lan,router:'ПК → '+mac.pc}],
['Echo Request до шлюза','ПК → Коммутатор → Маршрутизатор','Ethernet адресован следующему узлу. IP назначения остаётся адресом сервера. Коммутатор передаёт кадр без изменения TTL.',echo('pc','lan'),null,['Какой Ethernet destination?', [mac.lan,mac.server],0]],
['Маршрутизатор ищет сервер','Маршрутизатор → Сервер','Входной Ethernet снят. Есть connected маршрут 192.168.2.0/24; TTL пакета уменьшается 64 → 63. Для нового кадра нужен MAC сервера.',arp('wan','server','server'),{pc:'шлюз → '+mac.lan,router:'ПК → '+mac.pc,server:'шлюз → '+mac.wan}],
['ARP-ответ сервера','Сервер → Маршрутизатор','Сервер изучил MAC своего шлюза из ARP-запроса. Маршрутизатор сохраняет MAC сервера.',arp('server','wan','wan',true),{pc:'шлюз → '+mac.lan,router:'ПК → '+mac.pc+'; сервер → '+mac.server,server:'шлюз → '+mac.wan}],
['Доставка запроса','Маршрутизатор → Сервер','Новый Ethernet: MAC выходного интерфейса → MAC сервера. IP source/destination сохранены: NAT нет. TTL 63; IPv4 checksum пересчитана.',echo('wan','server',false,true),null,['Какой TTL получит сервер?', ['63','64','62'],0]],
['Echo Reply к шлюзу','Сервер → Маршрутизатор','Сервер создаёт новый ответ с TTL 64, type 0. Обратный default маршрут через 192.168.2.1; MAC уже известен.',echo('server','wan',true),null],
['Ответ через коммутатор к ПК','Маршрутизатор → Коммутатор → ПК','Connected маршрут 192.168.1.0/24. Новый Ethernet к ПК, TTL ответа 63. ARP ПК уже известен. ПК получает Echo Reply.',echo('lan','pc',true,true),null]
].map(([title,path,text,frame,cache,question],i)=>({title,path,text,frame,cache,question,index:i}));
function cacheAt(i){let cache={};for(let n=0;n<=i;n++)if(steps[n].cache)cache=steps[n].cache;return cache;}
const faults={mask:{title:'Неверная маска',checks:{ping:'Echo Reply не получен. Это симптом: по одному ping причину установить нельзя.',config:'План: ПК /24. Фактически: 192.168.1.10/16, gateway 192.168.1.1. Сервер 192.168.2.20/24. Остальные настройки соответствуют плану.',route:'ПК считает 192.168.2.20 локальным: on-link 192.168.0.0/16. ARP: who has 192.168.2.20? Ответа нет. Proxy ARP выключен.',link:'Все порты up. Интерфейсы маршрутизатора up/up.'},evidence:['config'],fix:'Установить маску ПК 255.255.255.0 (/24)',explain:'При /16 ПК ошибочно ищет сервер в LAN. /24 выбирает шлюз; после очистки ARP повторяется исправный обмен.'},gateway:{title:'Недоступный шлюз',checks:{ping:'Ответа нет даже от 192.168.1.1. Это ещё не доказательство отказа устройства.',config:'ПК 192.168.1.10/24, gateway 192.168.1.1; сервер /24, gateway 192.168.2.1. Адреса и маршруты соответствуют плану.',route:'Default через 192.168.1.1. ARP шлюза incomplete: ответа нет.',link:'Из консоли маршрутизатора: LAN 192.168.1.1/24 administratively down; физический кабель исправен. WAN up/up, питание есть. Других неисправностей нет.'},evidence:['config','link'],fix:'Включить LAN-интерфейс маршрутизатора',explain:'Консоль прямо подтверждает административное выключение LAN. Это не отказ всего устройства. Включение восстанавливает ARP и доставку.'}};
function grade(step,choice){return !!steps[step]?.question && choice===steps[step].question[2];}
function repair(id,checks,choice){return !!faults[id]&&faults[id].evidence.every(x=>checks.includes(x))&&choice===id;}
// Case 1 state is separate from legacy course answers and case 2.
function maskState(raw,legacyComplete=false){
 const valid=raw&&['broken','applied','checking','verified'].includes(raw.phase);
 return {phase:valid?raw.phase:legacyComplete?'verified':'broken',facts:valid&&Array.isArray(raw.facts)?raw.facts.filter(x=>['ping','config','route','link'].includes(x)):legacyComplete?['config']:[],results:valid&&Array.isArray(raw.results)?raw.results.filter(x=>typeof x==='string'):[],replayStep:valid&&Number.isInteger(raw.replayStep)?Math.max(0,Math.min(8,raw.replayStep)):0,message:''};
}
function maskTransition(raw,event){
 const s=maskState(raw);s.facts=[...s.facts];s.results=[...s.results];
 const working=s.phase!=='broken';
 if(event.type==='check'){
  if(!['ping','config','route','link'].includes(event.id))return s;
  if(!s.facts.includes(event.id))s.facts.push(event.id);
  const text=event.id==='config'?(working?'Сейчас ПК 192.168.1.10/24; план /24. Расхождение устранено.':'Фактически ПК 192.168.1.10/16 (255.255.0.0); по плану /24 (255.255.255.0). Шлюз 192.168.1.1. Этого расхождения достаточно для исправления.'):
   event.id==='route'?(working?'Теперь сервер вне локальной /24: следующий узел 192.168.1.1.':'При /16 сервер ошибочно считается локальным: on-link 192.168.0.0/16. ARP сервера без ответа. Это объясняет механизм; проверка необязательна.'):
   event.id==='link'?'Все порты up, интерфейсы маршрутизатора up/up.':working?'Маска исправлена. Для контроля нажми «Повторить ping».':'Echo Reply не получен. По одному ping причина не установлена.';
  s.results.push(text);s.message='';
 }else if(event.type==='fix'){
  if(!s.facts.includes('config'))s.message='Нужно получить данные: сверь конфигурацию ПК с планом.';
  else if(event.choice!=='mask')s.message='Выбрано неподходящее исправление: обнаружено расхождение маски ПК.';
  else{s.phase=s.phase==='verified'?'verified':'applied';s.message='Исправлено, проверь связь: маска ПК теперь /24. Повтори ping.';}
 }else if(event.type==='ping'&&working){s.phase='checking';s.replayStep=1;s.message='Контрольный ping: ARP шлюза, затем доставка запроса и ответа.';}
 else if(event.type==='advance'&&s.phase==='checking'){
  s.replayStep=Math.min(8,s.replayStep+1);
  if(s.replayStep===8){s.phase='verified';s.results.push('Контроль: Echo Reply получен ПК, связь восстановлена.');s.message='Контрольный ping успешен. Случай завершён.';}
 }
 return s;
}
const api={mac,ip,steps,cacheAt,faults,grade,repair,maskState,maskTransition};if(typeof module!=='undefined')module.exports=api;root.PacketJourney=api;
})(typeof window==='undefined'?globalThis:window);
