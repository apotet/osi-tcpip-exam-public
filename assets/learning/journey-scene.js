(function(root){
const scenes=[
{at:'pc',say:['Сервер в другой подсети.','Нужен MAC шлюза.'],route:[]},
{at:'pc',say:['Кто знает MAC шлюза?','ARP-запрос всем в LAN.'],route:['pc','switch','router']},
{at:'router',say:['Я — шлюз. Вот мой MAC.'],route:['router','switch','pc']},
{at:'pc',say:['Кадр шлюзу.','IP-пакет — серверу.'],route:['pc','switch','router']},
{at:'router',say:['Снимаю Ethernet. TTL 64 → 63.','Теперь нужен MAC сервера.'],route:['router','server']},
{at:'server',say:['Это мой IP. Вот мой MAC.'],route:['server','router']},
{at:'router',say:['Новый Ethernet, те же IP.','Отправляю серверу: TTL 63.'],route:['router','server']},
{at:'server',say:['Ping получен. Ответ шлюзу.','Новый пакет: TTL 64.'],route:['server','router']},
{at:'router',say:['Ответ в LAN. TTL 64 → 63.','ПК получает Echo Reply.'],route:['router','switch','pc']}];
function question(i){return i===1?{text:'Чей MAC нужно узнать? Выбери устройство.',nodes:{router:0,server:1}}:i===3?{text:'Кому отправить кадр? Выбери устройство.',nodes:{router:0,server:1}}:i===6?{text:'Какой TTL получит сервер?',choices:['63','64','62']}:null;}
function stop(fault,check){if(check==='ping')return null;if(check==='config')return fault==='mask'?'pc':null;if(check==='route')return fault==='mask'?'pc':'router';if(check==='link'&&fault==='gateway')return 'router';return null;}
const api={scenes,question,stop};if(typeof module!=='undefined')module.exports=api;root.JourneyScene=api;
})(typeof window==='undefined'?globalThis:window);
