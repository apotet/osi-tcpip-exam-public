(function (root) {
  'use strict';
  const tasks = [
    {id:'eth-destination', frame:1, field:'eth.dst', prompt:'Кадр 1: прочитай Ethernet Destination (eth.dst). Каков адрес назначения?', answers:['ff:ff:ff:ff:ff:ff','02:00:00:00:00:20','192.0.2.20'], correct:0, explanation:'Кадр 1: eth.dst = ff:ff:ff:ff:ff:ff — широковещательный MAC. ARP Request ищет владельца IPv4 192.0.2.20.'},
    {id:'ip-destination', frame:3, field:'ip.dst', prompt:'Кадр 3: какой IPv4-адрес назначения указан в поле ip.dst?', answers:['192.0.2.10','192.0.2.20','02:00:00:00:00:20'], correct:1, explanation:'Кадр 3: ip.dst = 192.0.2.20. Ethernet-адрес назначения eth.dst = 02:00:00:00:00:20 — другое поле и другой вид адреса.'},
    {id:'protocol', frame:5, field:'eth.type', prompt:'Кадр 5: EtherType (eth.type) равен 0x0806. Какой протокол несёт Ethernet-кадр? Подсказка: 0x0806 — ARP, 0x0800 — IPv4.', answers:['IPv4 / ICMP','ARP','TCP'], correct:1, explanation:'Кадр 5: eth.type = 0x0806, arp.opcode = 1 (Request). ARP передаётся прямо в Ethernet, IPv4-заголовка в этом кадре нет.'},
    {id:'echo-pair', frame:4, field:'icmp.ident', prompt:'Для Echo Reply в кадре 4 найди запрос: проверь обратные ip.src/ip.dst, icmp.ident и icmp.seq. У запроса type = 8, у ответа type = 0. Какой кадр соответствует?', answers:['Кадр 1','Кадр 3','Кадр 7'], correct:1, explanation:'Кадры 3 → 4: ip.src/ip.dst меняются местами (192.0.2.10 ↔ 192.0.2.20), icmp.ident = 4660 и icmp.seq = 1 совпадают; icmp.type меняется с 8 на 0.'},
    {id:'conclusion', frame:8, field:'icmp.type', prompt:'Сопоставь кадры 7 и 8 по адресам, icmp.ident и icmp.seq. Какой вывод подтверждён этой трассой?', answers:['Веб-служба на 192.0.2.30 работает','192.0.2.30 прислал Echo Reply на запрос A','Все службы на узле A доступны'], correct:1, explanation:'Кадры 7 → 8: icmp.ident = 22136, icmp.seq = 1; в кадре 8 icmp.type = 0, ip.src = 192.0.2.30. Видим ответ на ping, но не проверку веб-службы.'}
  ];
  function grade(task, selected) {
    if (!Number.isInteger(selected) || selected < 0 || selected >= task.answers.length) return null;
    return {correct:selected === task.correct, explanation:task.explanation};
  }
  if (typeof module !== 'undefined') module.exports = {tasks, grade};
  root.WiresharkPractice = {tasks, grade};
})(typeof window === 'undefined' ? globalThis : window);
