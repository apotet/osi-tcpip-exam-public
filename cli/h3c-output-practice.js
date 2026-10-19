// Synthetic S6805-54HF / Comware 7 R6715 excerpts, based on official examples/field definitions.
const H3C_OUTPUT_SOURCES={
  interfaces:'https://www.h3c.com/en/d_202501/2346052_294551_0.htm',
  vlan:'https://www.h3c.com/en/d_202501/2346056_294551_0.htm',
  mac:'https://www.h3c.com/en/d_202501/2346050_294551_0.htm'
};
const H3C_OUTPUT_TASKS=[
  {
    id:'h3c-port-admin',topic:'Порт',command:'display interface brief',source:'interfaces',
    context:'Учебный фрагмент bridge-mode таблицы двух 10-GE портов; остальные интерфейсы и раздел route mode опущены.',
    output:`<SW1> display interface brief
Brief information on interfaces in bridge mode:
Link: ADM - administratively down; Stby - standby
Speed: (a) - auto
Duplex: (a)/A - auto; H - half; F - full
Type: A - access; T - trunk; H - hybrid
Interface            Link Speed    Duplex Type PVID Description
XGE1/0/5             ADM  auto     A      A    120  Training
XGE1/0/6             DOWN auto     A      A    1    Spare`,
    question:'Какой порт явно отключён административно?',
    options:[{id:'port5',text:'XGE1/0/5: ADM означает administratively down.'},{id:'port6',text:'XGE1/0/6: любой DOWN равен команде shutdown.'},{id:'both',text:'Оба порта: auto в Speed означает административное отключение.'},{id:'neither',text:'Ни один: A в Type доказывает, что оба линка подняты.'}],
    answer:'port5',evidence:[3,6,8,9],
    explanation:'Легенда строки 3 расшифровывает ADM у XGE1/0/5 (строка 8). У XGE1/0/6 в строке 9 просто DOWN: это не то же самое. A в Type — access по строке 6, а не состояние линка.'
  },
  {
    id:'h3c-port-link',topic:'Порт',command:'display interface ten-gigabitethernet 1/0/6',source:'interfaces',
    context:'Учебный фрагмент подробного состояния порта. Счётчики и прочая конфигурация опущены; кабель и сосед не обследованы.',
    output:`<SW1> display interface ten-gigabitethernet 1/0/6
Ten-GigabitEthernet1/0/6
Current state: DOWN
Line protocol state: DOWN`,
    question:'Что подтверждает Current state: DOWN в этом фрагменте?',
    options:[{id:'physical-down',text:'Порт административно разрешён, но физического линка нет; причина здесь не установлена.'},{id:'shutdown',text:'Порт точно отключён командой shutdown.'},{id:'stp',text:'Линк поднят, но STP запретил пересылку кадров VLAN 120.'},{id:'cable',text:'Кабель точно оборван, все другие причины исключены.'}],
    answer:'physical-down',evidence:[2,3,4],
    explanation:'По определению Current state в руководстве DOWN отличается от Administratively DOWN: порт административно разрешён, но физически down. Строки 3–4 не устанавливают причину отсутствия линка и не показывают блокировку STP.'
  },
  {
    id:'h3c-vlan-flags',topic:'VLAN',command:'display vlan 120',source:'vlan',
    context:'Учебный локальный VLAN без L3-интерфейса. Показаны тип, имя, описание и списки портов со статусами из руководства.',
    output:`<SW1> display vlan 120
 VLAN ID: 120
 VLAN type: Static
 Route interface: Not configured
 Description: VLAN 0120
 Name: OFFICE
 Tagged ports:
    Ten-GigabitEthernet1/0/1(U)
 Untagged ports:
    Ten-GigabitEthernet1/0/5(D)`,
    question:'Как интерпретировать (U) у Ten-GigabitEthernet1/0/1?',
    options:[{id:'up-tagged',text:'Порт физически подключён и находится в списке Tagged ports.'},{id:'untagged',text:'U означает untagged и переносит порт в список Untagged ports.'},{id:'pvid',text:'U доказывает, что PVID порта равен 120.'},{id:'all-up',text:'Все члены VLAN 120 имеют поднятый физический линк.'}],
    answer:'up-tagged',evidence:[7,8,9,10],
    explanation:'Строка 8 относится к Tagged ports из строки 7. В display vlan флаг (U) означает physically connected, а (D) в строке 10 — physically disconnected. Членство tagged/untagged определяется заголовком списка; флаг U не задаёт PVID.'
  },
  {
    id:'h3c-access-vlan',topic:'Access',command:'display interface ten-gigabitethernet 1/0/5 brief',source:'interfaces',
    context:'Учебный снимок одного L2-порта. По плану он должен быть access VLAN 120; показан Type A и PVID текущего access VLAN.',
    output:`<SW1> display interface ten-gigabitethernet 1/0/5 brief
Brief information on interfaces in bridge mode:
Link: ADM - administratively down; Stby - standby
Speed: (a) - auto
Duplex: (a)/A - auto; H - half; F - full
Type: A - access; T - trunk; H - hybrid
Interface            Link Speed    Duplex Type PVID Description
XGE1/0/5             UP   10G(a)   F(a)   A    130  Training`,
    question:'Какое несоответствие плану видно?',
    options:[{id:'v130',text:'Режим access верен, но текущий PVID/access VLAN — 130 вместо 120.'},{id:'trunk',text:'Порт работает trunk вместо access.'},{id:'down',text:'Порт отключён административно и не имеет линка.'},{id:'speed',text:'10G(a) — это VLAN 10, поэтому порт принадлежит VLAN 10.'}],
    answer:'v130',evidence:[6,7,8],
    explanation:'Легенда в строке 6 задаёт A = access. В строке 8 Link UP, Type A, PVID 130; в условии нужен 120. На access-порту VLAN назначается port access vlan. Скорость 10G(a) не является VLAN ID.'
  },
  {
    id:'h3c-trunk-limit',topic:'Trunk',command:'display port trunk',source:'vlan',
    context:'Учебный фрагмент одного локального trunk. VLAN Passing показывает существующие VLAN, разрешённые на порту. Линк, STP и второй конец не показаны.',
    output:`<SW1> display port trunk
Interface            PVID  VLAN Passing
XGE1/0/1             1     1, 110, 120`,
    question:'Подтверждает ли эта строка доставку кадров VLAN 120 через соседний коммутатор?',
    options:[{id:'local',text:'Нет: VLAN 120 локально разрешён; данных о соседе и доставке кадров недостаточно.'},{id:'e2e',text:'Да: VLAN Passing означает успешно измеренную сквозную передачу.'},{id:'pvid',text:'Нет: при PVID 1 остальные VLAN всегда запрещены на trunk.'},{id:'peer',text:'Да: PVID 1 автоматически задаёт такую же конфигурацию соседу.'}],
    answer:'local',evidence:[2,3],
    explanation:'Строка 3 включает VLAN 120 в локальный разрешённый набор. Это конфигурационный вывод: в нём нет доказательства линка, пересылки STP, совпадения настройки второго конца или доставки кадров. PVID 1 сам по себе не запрещает tagged VLAN 120.'
  },
  {
    id:'h3c-pvid-permit',topic:'PVID',command:'display port trunk',source:'vlan',
    context:'Учебный снимок trunk после настройки PVID 120. VLAN 120 существует на устройстве, но показанный VLAN Passing исчерпывающий для этого порта.',
    output:`<SW1> display port trunk
Interface            PVID  VLAN Passing
XGE1/0/1             120   1, 110`,
    question:'Достаточно ли настройки PVID 120 для пропуска VLAN 120 на этом trunk?',
    options:[{id:'permit-missing',text:'Нет: VLAN 120 отсутствует в разрешённом наборе; PVID и permit vlan — разные настройки.'},{id:'automatic',text:'Да: установка trunk PVID автоматически разрешает этот VLAN.'},{id:'all',text:'Да: PVID 120 означает разрешение всех VLAN от 1 до 120.'},{id:'deleted',text:'Нет: вывод доказывает, что VLAN 120 удалён с устройства.'}],
    answer:'permit-missing',evidence:[2,3],
    explanation:'В строке 3 PVID равен 120, но VLAN Passing содержит только 1 и 110. Руководство отдельно требует разрешить VLAN через port trunk permit vlan для передачи кадров из PVID. Настройка PVID сама не является разрешённым списком и не доказывает наличие/удаление VLAN.'
  },
  {
    id:'h3c-mac-direction',topic:'MAC',command:'display mac-address vlan 120',source:'mac',
    context:'Учебная локальная MAC-таблица VLAN 120; MAC-адреса вымышленные, локально администрируемые. Остальная топология не показана.',
    output:`<SW1> display mac-address vlan 120
MAC Address      VLAN ID    State            Port/Nickname            Aging
0200-0000-0010   120        Learned          XGE1/0/1                 Y
0200-0000-0020   120        Learned          XGE1/0/5                 Y`,
    question:'Где коммутатор изучил MAC 0200-0000-0010?',
    options:[{id:'port1',text:'В VLAN 120 за XGE1/0/1; прямое кабельное подключение источника не доказано.'},{id:'port5',text:'В VLAN 120 за XGE1/0/5, потому что эта строка ниже.'},{id:'own',text:'Это собственный постоянный MAC коммутатора, статически назначенный CPU.'},{id:'direct',text:'Это доказывает прямое подключение конечного устройства кабелем к XGE1/0/1.'}],
    answer:'port1',evidence:[2,3],
    explanation:'Строка 3 связывает адрес, VLAN 120, Learned и XGE1/0/1. Learned — динамическая запись; Y относится к aging. Таблица задаёт локальное направление к источнику, а не полную топологию или доказательство прямого подключения.'
  }
];
