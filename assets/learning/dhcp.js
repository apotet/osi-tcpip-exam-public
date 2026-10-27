'use strict';
(function(root){
const plan=Object.freeze({network:'192.168.10.0/24',ip:'192.168.10.100',mask:'255.255.255.0',gateway:'192.168.10.1',wrongGateway:'192.168.10.254',dns:'192.0.2.53',server:'192.168.10.2',local:'192.168.10.20',remote:'198.51.100.20',hours:8});
const messages=['Готов к получению','Discover','Offer','Request','ACK'];
const captions=['Клиент без IPv4-настроек','Поиск DHCP-сервера · UDP 68 → 67','Предложение адреса — ещё не действующая аренда · UDP 67 → 68','Клиент выбирает предложение сервера .2 · UDP 68 → 67','Сервер подтвердил аренду на 8 часов · UDP 67 → 68'];
function parameters(gateway=plan.gateway,ip=plan.ip){return {ip,mask:plan.mask,gateway,dns:plan.dns,hours:plan.hours};}
function makeCase(id){return {id,revision:0,server:{free:id==='pool'?0:1,poolEnd:109,gateway:id==='gateway'?plan.wrongGateway:plan.gateway},fixed:false,step:0,started:false,stalled:false,lease:null,offer:null,facts:{},verified:false};}
function begin(c){return {...c,revision:c.revision+1,server:{...c.server,free:c.lease?1:c.server.free},step:0,started:true,stalled:false,lease:null,offer:null,verified:false};}
function advance(c){if(!c.started||c.step===4||c.stalled)return c;if(c.step===1&&c.server.free===0)return {...c,stalled:true};const step=c.step+1;return {...c,revision:c.revision+(step===4?1:0),server:step===4?{...c.server,free:0}:c.server,step,offer:step===2?parameters(c.server.gateway,c.id==='pool'?'192.168.10.110':plan.ip):c.offer,lease:step===4?{...c.offer}:c.lease};}
function check(c,key){let value;if(key==='server')value=`DHCP работает. Пул .100–.${c.server.poolEnd}: свободно ${c.server.free}. Опция шлюза ${c.server.gateway}. Статические .1–.99 и .200–.254 исключены; .110 свободен и не зарезервирован.`;
if(key==='lease')value=c.lease?`Аренда клиента: ${c.lease.ip}, маска ${c.lease.mask}, шлюз ${c.lease.gateway}, DNS ${c.lease.dns}, ${c.lease.hours} ч.`:'Действующей аренды нет.';
if(key==='router')value=`Интерфейс маршрутизатора: ${plan.gateway}/24. Адрес .254 свободен, маршрутизатора там нет.`;
if(key==='local')value=c.lease?`Локальный узел ${plan.local}: ответ получен.`:'Нет аренды: локальная проверка не выполнена.';
if(key==='remote')value=c.lease?(c.lease.gateway===plan.gateway?`Удалённый узел ${plan.remote}: ответ получен.`:`Удалённый узел ${plan.remote}: ответа нет. Сам по себе этот результат не доказывает причину.`):'Нет аренды: удалённая проверка не выполнена.';
if(!value)return c;return {...c,facts:{...c.facts,[key]:{revision:c.revision,value}},verified:c.verified||(c.fixed&&c.step===4&&!!c.lease&&(c.id==='pool'?key==='lease':key==='remote'&&c.lease.gateway===plan.gateway))};}
function fresh(c,key){return c.facts[key]?.revision===c.revision;}
function canFix(c){return !c.fixed&&(c.id==='pool'?fresh(c,'server'):fresh(c,'server')&&fresh(c,'lease')&&!!c.lease&&fresh(c,'router'));}
function fix(c){if(!canFix(c))return c;return {...c,revision:c.revision+1,fixed:true,server:{...c.server,free:c.id==='pool'?1:c.server.free,poolEnd:c.id==='pool'?110:c.server.poolEnd,gateway:plan.gateway},verified:false};}
const questions=[
{step:0,text:'Клиент без настроек. Что отправить первым?',choices:['Discover','ACK'],answer:0,explain:'Discover ищет DHCP-сервер в локальной сети.'},
{step:1,text:'Кто отправит предложение в ответ на Discover?',choices:['Клиент: Request','DHCP-сервер: Offer'],answer:1,explain:'DHCP-сервер предлагает свободный адрес сообщением Offer.',object:'server'},
{step:2,text:'Offer предложил .100. Что делает клиент дальше?',choices:['Отправляет Request выбранного предложения','Сразу применяет адрес'],answer:0,explain:'Offer — только предложение. Клиент отправляет Request с выбранным адресом и сервером; настройки применятся после ACK.'},
{step:3,text:'Какое сообщение подтвердит аренду?',choices:['Discover','ACK'],answer:1,explain:'После ACK клиент применяет параметры на время аренды.'},
{step:4,text:'Что клиент получил после ACK?',choices:['Только IPv4-адрес','Адрес, маску, шлюз и DNS'],answer:1,explain:'В этом примере ACK подтверждает все четыре настройки на 8 часов.'},
{step:4,text:'Нажми параметр для связи за пределами подсети.',choices:['Шлюз','DNS'],answer:0,explain:'Шлюз 192.168.10.1 передаёт трафик в другие сети.',field:true},
{step:4,text:'Нажми параметр для разрешения имён.',choices:['Шлюз','DNS'],answer:1,explain:'DNS 192.0.2.53 разрешает имена. Он может находиться в другой сети.',field:true}
];
const api={plan,messages,captions,parameters,makeCase,begin,advance,check,fresh,canFix,fix,questions};if(typeof module!=='undefined')module.exports=api;else root.DhcpLesson=api;
})(typeof window==='undefined'?globalThis:window);
