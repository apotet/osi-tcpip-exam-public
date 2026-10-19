// Synthetic excerpts for a single documented profile; not device captures.
// Source audit and scope: stages/STAGE_6_READ_OUTPUT.md.
const CLI_OUTPUT_PROFILE = 'Cisco Catalyst C9300-24T · IOS XE Dublin 17.12.x';
const CLI_OUTPUT_DOC_ROOT = 'https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-12/';
const CLI_OUTPUT_SOURCES = {
  interfaces: CLI_OUTPUT_DOC_ROOT+'command_reference/b_1712_9300_cr/interface_and_hardware_commands.html',
  vlan: CLI_OUTPUT_DOC_ROOT+'command_reference/b_1712_9300_cr/vlan_commands.html',
  mac: CLI_OUTPUT_DOC_ROOT+'command_reference/b_1712_9300_cr/system_management_commands.html',
  l2: CLI_OUTPUT_DOC_ROOT+'command_reference/b_1712_9300_cr/layer_2_3_commands.html',
  stp: CLI_OUTPUT_DOC_ROOT+'configuration_guide/lyr2/b_1712_lyr2_9300_cg/configuring_spanning_tree_protocol.html'
};

const CLI_OUTPUT_TASKS = [
  {
    id:'out-port-admin', topic:'Порт', command:'show ip interface brief', source:'interfaces',
    context:'Показаны строки двух физических портов. Это L2-порты без IP-адресов.',
    output:`SW1# show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet1/0/5    unassigned      YES unset  administratively down down
GigabitEthernet1/0/6    unassigned      YES unset  down                  down`,
    question:'Какой порт явно отключён административно?',
    options:[
      {id:'both',text:'Оба: Protocol down всегда означает административное отключение.'},
      {id:'port5',text:'Gi1/0/5: его Status — administratively down.'},
      {id:'port6',text:'Gi1/0/6: сочетание down/down означает shutdown.'},
      {id:'neither',text:'Ни один: unassigned означает, что состояние порта неизвестно.'}
    ], answer:'port5', evidence:[3,4],
    explanation:'В строке 3 Status прямо указан как administratively down. В строке 4 обычный down/down не доказывает shutdown. unassigned — отсутствие IP-адреса, нормальное для L2-порта.'
  },
  {
    id:'out-port-link', topic:'Порт', command:'show interfaces GigabitEthernet1/0/6', source:'interfaces',
    context:'Начало вывода одного медного порта; остальные строки не показаны.',
    output:`SW1# show interfaces GigabitEthernet1/0/6
GigabitEthernet1/0/6 is down, line protocol is down (notconnect)
  Hardware is Gigabit Ethernet, address is 0200.0000.0006 (bia 0200.0000.0006)
  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec,
  Auto-duplex, Auto-speed, media type is 10/100/1000BaseTX`,
    question:'Какое состояние Gi1/0/6 подтверждает этот фрагмент?',
    options:[
      {id:'shutdown',text:'Порт отключён командой shutdown.'},
      {id:'cable',text:'Кабель точно физически оборван.'},
      {id:'stp',text:'Линк поднят, передачу кадров остановил STP.'},
      {id:'nolink',text:'Оперативного линка нет; notconnect не устанавливает причину и не равен administratively down.'}
    ], answer:'nolink', evidence:[2,5],
    explanation:'Строка 2 показывает down/down (notconnect), а не administratively down. Это отсутствие оперативного линка: кабель, сосед и его питание здесь не проверены. Auto-speed в строке 5 не означает, что скорость уже согласована.'
  },
  {
    id:'out-vlan-member', topic:'VLAN', command:'show vlan brief', source:'vlan',
    context:'Фрагмент локальной таблицы VLAN. Номера VLAN и имена портов учебные.',
    output:`SW1# show vlan brief
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi1/0/7
120  OFFICE                           active    Gi1/0/5, Gi1/0/6
130  CAMERAS                          active    Gi1/0/8`,
    question:'В каком VLAN здесь показан порт Gi1/0/6?',
    options:[
      {id:'v120',text:'В VLAN 120 OFFICE; это локальное членство порта.'},
      {id:'v130',text:'В VLAN 130 CAMERAS, потому что он тоже active.'},
      {id:'all',text:'Во всех active VLAN как trunk-порт.'},
      {id:'v1',text:'В VLAN 1, поскольку это default VLAN.'}
    ], answer:'v120', evidence:[5],
    explanation:'В строке 5 Gi1/0/6 перечислен в Ports у VLAN 120 OFFICE. active относится к состоянию VLAN; по этой таблице нельзя подтвердить линк клиента или сквозную IP-связь.'
  },
  {
    id:'out-access-plan', topic:'VLAN', command:'show interfaces GigabitEthernet1/0/5 switchport', source:'interfaces',
    context:'По плану конечный нетегированный порт Gi1/0/5 должен быть access VLAN 120. Показаны только поля режима и access VLAN.',
    output:`SW1# show interfaces GigabitEthernet1/0/5 switchport
Name: Gi1/0/5
Switchport: Enabled
Administrative Mode: static access
Operational Mode: static access
Access Mode VLAN: 130 (CAMERAS)`,
    question:'Какое несоответствие плану видно?',
    options:[
      {id:'trunk',text:'Порт работает trunk вместо access.'},
      {id:'disabled',text:'Switchport отключён административно.'},
      {id:'wrong-vlan',text:'Access-режим соответствует плану, но назначен VLAN 130 вместо 120.'},
      {id:'correct',text:'Порт уже назначен в VLAN 120; поле 130 относится только к native VLAN.'}
    ], answer:'wrong-vlan', evidence:[4,5,6],
    explanation:'Строки 4–5 показывают static access. В строке 6 Access Mode VLAN — 130, тогда как в условии нужен 120. Это не поле native VLAN и не доказательство административного shutdown.'
  },
  {
    id:'out-trunk-excluded', topic:'Trunk', command:'show interfaces trunk', source:'interfaces',
    context:'Разделы для одного локального активного trunk Gi1/0/1. Другие порты не показаны.',
    output:`SW1# show interfaces trunk
Port        Mode             Encapsulation  Status        Native vlan
Gi1/0/1     on               802.1q         trunking      1

Port        Vlans allowed on trunk
Gi1/0/1     1,100-119,121-130

Port        Vlans allowed and active in management domain
Gi1/0/1     1,110,130

Port        Vlans in spanning tree forwarding state and not pruned
Gi1/0/1     1,110,130`,
    question:'Что видно для VLAN 120 на этом trunk?',
    options:[
      {id:'allowed',text:'VLAN 120 разрешён, потому что находится между 100 и 130.'},
      {id:'excluded',text:'VLAN 120 исключён из локального allowed list на Gi1/0/1.'},
      {id:'native',text:'VLAN 120 выбран native VLAN этого порта.'},
      {id:'down',text:'Физический линк Gi1/0/1 не поднят.'}
    ], answer:'excluded', evidence:[3,5,6],
    explanation:'В строке 6 между диапазонами 100–119 и 121–130 есть пропуск: 120 не разрешён. Строка 3 показывает действующий trunking и native VLAN 1, поэтому это не вывод об отсутствии физического линка.'
  },
  {
    id:'out-trunk-limit', topic:'Trunk', command:'show interfaces trunk', source:'interfaces',
    context:'Показаны только состояние trunk и локальный allowed list. Разделы active/forwarding, соседний коммутатор и трафик не показаны.',
    output:`SW1# show interfaces trunk
Port        Mode             Encapsulation  Status        Native vlan
Gi1/0/1     on               802.1q         trunking      1

Port        Vlans allowed on trunk
Gi1/0/1     1,120,130`,
    question:'Достаточно ли этого для подтверждения передачи трафика VLAN 120 до соседнего устройства?',
    options:[
      {id:'e2e',text:'Да: allowed list доказывает сквозную доступность VLAN 120.'},
      {id:'stp',text:'Нет: этот вывод уже доказывает блокировку VLAN 120 протоколом STP.'},
      {id:'peer',text:'Да: trunking подтверждает такую же VLAN-конфигурацию соседа.'},
      {id:'local-only',text:'Подтверждено только локальное разрешение VLAN 120; данных о forwarding, соседе и передаче трафика недостаточно.'}
    ], answer:'local-only', evidence:[3,5,6],
    explanation:'Строки 5–6 включают 120 только в локальный allowed list. trunking в строке 3 не подтверждает active/forwarding для VLAN 120, настройку второго конца и доставку кадров. Проверки трафика здесь нет.'
  },
  {
    id:'out-mac-location', topic:'MAC', command:'show mac address-table vlan 120', source:'mac',
    context:'Локальная MAC-таблица для VLAN 120. MAC-адреса вымышленные, с локально администрируемым префиксом.',
    output:`SW1# show mac address-table vlan 120
          Mac Address Table
-------------------------------------------
Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
 120    0200.0000.0010    DYNAMIC     Gi1/0/1
 120    0200.0000.0020    DYNAMIC     Gi1/0/5
Total Mac Addresses for this criterion: 2`,
    question:'Где этот коммутатор изучил MAC 0200.0000.0010?',
    options:[
      {id:'behind-port1',text:'В VLAN 120 за Gi1/0/1; между портом и источником могут быть другие устройства.'},
      {id:'port5',text:'В VLAN 120 за Gi1/0/5.'},
      {id:'local',text:'Это собственный MAC коммутатора, статически назначенный CPU.'},
      {id:'direct',text:'Таблица доказывает прямое подключение конечного устройства кабелем к Gi1/0/1.'}
    ], answer:'behind-port1', evidence:[4,6],
    explanation:'Строка 6 связывает VLAN 120, нужный MAC, тип DYNAMIC и порт Gi1/0/1. Это локально изученное направление к источнику; таблица не показывает всю топологию и не доказывает прямого подключения.'
  },
  {
    id:'out-mac-absent', topic:'MAC', command:'show mac address-table address 0200.0000.0099', source:'mac',
    context:'Полный результат поиска по одному MAC в этот момент. Был ли недавно трафик от источника, неизвестно.',
    output:`SW1# show mac address-table address 0200.0000.0099
          Mac Address Table
-------------------------------------------
Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
Total Mac Addresses for this criterion: 0`,
    question:'Можно ли по этому результату установить причину недоступности устройства?',
    options:[
      {id:'cable',text:'Да: отсутствие записи однозначно означает обрыв кабеля.'},
      {id:'vlan',text:'Да: VLAN источника точно удалён с коммутатора.'},
      {id:'snapshot',text:'Нет: записи сейчас нет; отсутствие недавнего трафика или aging тоже могли дать такой результат.'},
      {id:'ip',text:'Да: у источника точно неверный IP-адрес.'}
    ], answer:'snapshot', evidence:[1,6],
    explanation:'Команда в строке 1 фильтрует один MAC, а строка 6 показывает ноль найденных записей. Без сведений о свежем исходящем трафике и aging это не устанавливает причину и не доказывает ни обрыв, ни ошибку IP.'
  },
  {
    id:'out-stp-alternate', topic:'STP', command:'show spanning-tree vlan 120', source:'l2',
    context:'Фрагмент состояния RSTP только для VLAN 120; прочие VLAN и верхняя часть вывода опущены.',
    output:`SW1# show spanning-tree vlan 120
VLAN0120
  Spanning tree enabled protocol rstp
Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Gi1/0/1             Root FWD 20000     128.1    P2p
Gi1/0/2             Altn BLK 20000     128.2    P2p
Gi1/0/5             Desg FWD 20000     128.5    P2p`,
    question:'Что означает состояние Gi1/0/2 в этом VLAN?',
    options:[
      {id:'broken',text:'Порт обязательно неисправен, поскольку BLK означает потерю линка.'},
      {id:'alternate',text:'Это альтернативный путь без пересылки пользовательских кадров в VLAN 120; само по себе это не неисправность.'},
      {id:'forward',text:'Порт пересылает кадры VLAN 120 вместе с Gi1/0/1.'},
      {id:'shutdown',text:'Порт отключён административно во всех VLAN.'}
    ], answer:'alternate', evidence:[2,3,7],
    explanation:'В строке 7 Altn — альтернативная роль, BLK — состояние без пользовательской пересылки (discarding в RSTP). Область вывода — VLAN0120, строки 2–3. Это не доказательство shutdown, поломки или такого же состояния во всех VLAN.'
  },
  {
    id:'out-stp-learning', topic:'STP', command:'show spanning-tree vlan 120', source:'stp',
    context:'Снимок переходного состояния классического STP (protocol ieee) для VLAN 120. Время нахождения в состоянии не показано.',
    output:`SW1# show spanning-tree vlan 120
VLAN0120
  Spanning tree enabled protocol ieee
Interface           Role Sts Cost      Prio.Nbr Type
------------------- ---- --- --------- -------- --------------------------------
Gi1/0/1             Root FWD 20000     128.1    P2p
Gi1/0/5             Desg LRN 20000     128.5    P2p`,
    question:'Готов ли Gi1/0/5 пересылать пользовательские кадры VLAN 120 в момент снимка?',
    options:[
      {id:'forward',text:'Да: Desg всегда означает, что пересылка уже началась.'},
      {id:'disabled',text:'Нет: LRN означает административное отключение интерфейса.'},
      {id:'stuck',text:'Нет: снимок доказывает, что STP навсегда застрял в learning.'},
      {id:'learning',text:'Ещё нет: в LRN порт изучает адреса, но пользовательские кадры пока не пересылает.'}
    ], answer:'learning', evidence:[3,7],
    explanation:'В строке 7 роль Desg не заменяет состояние LRN. Learning изучает MAC-адреса, но ещё не пересылает пользовательские кадры. Строка 3 указывает классический STP; один снимок без времени не доказывает зависание.'
  },
  {
    id:'out-lacp-bundled', topic:'LACP', command:'show etherchannel summary', source:'l2',
    context:'Сводка одного EtherChannel. Скорости портов и результаты измерения трафика не показаны.',
    output:`SW1# show etherchannel summary
Flags: D - down        P - in port-channel
       I - stand-alone s - suspended
       R - Layer3      S - Layer2
       U - in use
Number of channel-groups in use: 1
Number of aggregators: 1
Group  Port-channel  Protocol    Ports
------+-------------+-----------+----------------------------------------
1      Po1(SU)       LACP        Gi1/0/1(P) Gi1/0/2(P)`,
    question:'Какой состав и тип агрегата подтверждает сводка?',
    options:[
      {id:'two-bundled',text:'Po1 — используемый L2-агрегат LACP; оба перечисленных порта включены в него.'},
      {id:'one',text:'Только Gi1/0/1 включён в агрегат, Gi1/0/2 работает отдельно.'},
      {id:'l3',text:'Po1 — L3-агрегат, потому что используется протокол LACP.'},
      {id:'double',text:'Один TCP-поток гарантированно получит сумму скоростей двух портов.'}
    ], answer:'two-bundled', evidence:[2,4,5,10],
    explanation:'В строке 10 Po1(SU): S — Layer2, U — in use; P у обоих портов означает включение в агрегат (легенда в строках 2, 4–5). Эти флаги не измеряют скорость и не обещают суммарную полосу одному потоку.'
  },
  {
    id:'out-lacp-suspended', topic:'LACP', command:'show etherchannel summary', source:'l2',
    context:'Сводка одного EtherChannel; конфигурации участников и сведения о партнёре не показаны.',
    output:`SW1# show etherchannel summary
Flags: D - down        P - in port-channel
       I - stand-alone s - suspended
       R - Layer3      S - Layer2
       U - in use
Number of channel-groups in use: 1
Number of aggregators: 1
Group  Port-channel  Protocol    Ports
------+-------------+-----------+----------------------------------------
1      Po1(SU)       LACP        Gi1/0/1(P) Gi1/0/2(s)`,
    question:'Какой участник сейчас не включён в рабочий агрегат?',
    options:[
      {id:'both',text:'Оба: Po1(SU) означает, что агрегат выключен.'},
      {id:'port1',text:'Gi1/0/1: P означает passive и отсутствие пересылки.'},
      {id:'port2',text:'Gi1/0/2: s означает suspended; Gi1/0/1 имеет P и включён в Po1.'},
      {id:'neither',text:'Оба порта включены, потому что они перечислены в одной строке.'}
    ], answer:'port2', evidence:[2,3,10],
    explanation:'В строке 10 у Gi1/0/2 стоит строчная s — suspended, у Gi1/0/1 P — bundled. Значения даны в легенде, строки 2–3. Po1(SU) используется, но с одним включённым портом; причину suspended без деталей определить нельзя.'
  }
];

function outputProfile(os){
  if(os==='Cisco')return {label:CLI_OUTPUT_PROFILE,tasks:CLI_OUTPUT_TASKS,sources:CLI_OUTPUT_SOURCES,sourceLabel:'IOS XE 17.12.x'};
  if(os==='H3C')return {label:H3C_VLAN_PROFILE.label,tasks:H3C_OUTPUT_TASKS,sources:H3C_OUTPUT_SOURCES,sourceLabel:'Comware 7 · Release 6715'};
  if(os==='SCALANCE')return {label:SCALANCE_VLAN_PROFILE.label,tasks:SCALANCE_OUTPUT_TASKS,sourceLabel:'CLI V4.3.1 · XC206-2SFP',sources:{port:SCALANCE_OUTPUT_DOC+'#page=97',ports:SCALANCE_OUTPUT_DOC+'#page=237',pvid:SCALANCE_OUTPUT_DOC+'#page=233'}};
  if(os==='Eltex')return {label:'Eltex MES2324 · ПО 4.0.27.3 · заводская версия неизвестна',tasks:ELTEX_OUTPUT_TASKS,
    sources:{interfaces:ELTEX_OUTPUT_DOC+'#page=123',vlan:ELTEX_OUTPUT_DOC+'#page=134',switchport:ELTEX_OUTPUT_DOC+'#page=135',stp:ELTEX_OUTPUT_DOC+'#page=173'},sourceLabel:'MES2324 · ПО 4.0.27.3'};
  return null;
}
function startOutputPractice(){
  const profile=outputProfile(vendor);if(!profile)return;
  lab=null;
  exam={items:shuffle(profile.tasks),i:0,score:0,answered:false,type:'output'};
  switchMode('exam');
}
function outputQuestionView(){
  const task=exam.items[exam.i];
  exam.current=task;exam.qtype='output';
  exam.options=shuffle(task.options.map(o=>({label:o.text,correct:o.id===task.answer})));
  const lines=task.output.split('\n').map((line,i)=>`<span class="cli-output-line" id="output-line-${i+1}" data-line="${i+1}">${esc(line)||' '}</span>`).join('');
  $('#app').innerHTML=`<div class="workspace cli-output-workspace"><div class="meta">${esc(vendor)} · ${exam.i+1} / ${exam.items.length} · ${esc(task.topic)}</div><div class="progress"><div style="width:${100*exam.i/exam.items.length}%"></div></div><h1>${esc(task.question)}</h1><p class="meta">${esc(outputProfile(vendor).label)}</p><p>${esc(task.context)}</p><p class="meta" id="output-label">Учебный вывод · составлен для задания, не запись с оборудования. Номера строк добавлены тренажёром.</p><pre class="cli-output" tabindex="0" role="region" aria-labelledby="output-label"><code>${lines}</code></pre><p class="meta">Длинные строки прокручиваются внутри блока вывода.</p><div class="options">${exam.options.map((o,i)=>`<button data-answer="${i}">${esc(o.label)}</button>`).join('')}</div><div id="feedback" aria-live="polite"></div></div>`;
  if(exam.answered)outputFeedback(exam.lastCorrect);
}
function outputFeedback(correct){
  $('#app').querySelectorAll('.options button').forEach(b=>b.disabled=true);
  const task=exam.current;
  const references=task.evidence.map(n=>`<a href="#output-line-${n}">строка ${n}</a>`).join(', ');
  $('#feedback').innerHTML=`<div class="feedback ${correct?'':'bad'}"><strong>${correct?'Верно':'Пока неверно'}</strong><p>${esc(task.options.find(o=>o.id===task.answer).text)}</p><p>${esc(task.explanation)}</p><p>Основание: ${references}.</p><a href="${esc(outputProfile(vendor).sources[task.source])}" target="_blank" rel="noopener">Официальное руководство · ${esc(outputProfile(vendor).sourceLabel)} ↗</a></div><button class="primary" data-next="1">${exam.i+1===exam.items.length?'Результат':'Следующий вопрос'}</button>`;
}

