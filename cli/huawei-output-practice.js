// Synthetic excerpts for S5720-28X-LI-AC / VRP V200R023C00, not equipment captures.
const HUAWEI_OUTPUT_SOURCES={
  interfaces:'https://support.huawei.cn/enterprise/en/doc/EDOC1100333403/7f9e2908/ethernet-interface-configuration-commands',
  vlan:'https://support.huawei.cn/enterprise/en/doc/EDOC1100333403/834147df/vlan-configuration-commands',
  mac:'https://support.huawei.cn/enterprise/en/doc/EDOC1100333403/7404084d/mac-address-table-configuration-commands'
};
const HUAWEI_OUTPUT_TASKS=[
  {
    id:'huawei-port-admin',topic:'Порт',command:'display interface ethernet brief',source:'interfaces',
    context:'Учебная выдержка двух GE-портов самостоятельного S5720-28X-LI-AC. Остальные интерфейсы и неиспользуемые флаги легенды опущены.',
    output:`<SW1> display interface ethernet brief
PHY: Physical
*down: administratively down
InUti/OutUti: input utility/output utility
Interface                   PHY   Auto-Neg Duplex Bandwidth  InUti OutUti Trunk
GigabitEthernet0/0/5        *down enable   full       1000M     0%     0%    --
GigabitEthernet0/0/6        down  enable   full       1000M     0%     0%    --`,
    question:'Какое различие состояния портов подтверждено этим выводом?',
    options:[{id:'admin5',text:'GE0/0/5 выключен административно; у GE0/0/6 физический down, причина здесь не установлена.'},{id:'admin6',text:'GE0/0/6 выключен административно, а у GE0/0/5 просто нет линка.'},{id:'both',text:'Оба порта выключены административно: любое down означает shutdown.'},{id:'speed',text:'На обоих портах линк поднят, потому что Bandwidth равен 1000M.'}],
    answer:'admin5',evidence:[2,3,5,6,7],
    explanation:'Легенда строки 3 относит *down к административному отключению; этот флаг есть у GE0/0/5 в строке 6. В строке 7 у GE0/0/6 обычный down — физический линк отсутствует. Bandwidth не заменяет PHY и не устанавливает причину отсутствия линка.'
  },
  {
    id:'huawei-vlan-members',topic:'VLAN',command:'display vlan',source:'vlan',
    context:'Учебная выдержка двух таблиц display vlan: из трёх существующих VLAN показаны только строки VLAN 120. Состояния портов относятся к этому снимку.',
    output:`<SW1> display vlan
The total number of VLANs is : 3
U: Up;         D: Down;         TG: Tagged;         UT: Untagged;
VID  Type    Ports
-------------------------------------------------------------------------------
120  common  UT:GE0/0/5(D)
             TG:GE0/0/1(U)
VID  Status  Property      MAC-LRN Statistics Description
-------------------------------------------------------------------------------
120  enable  default       enable  disable    OFFICE`,
    question:'Что можно утверждать о GE0/0/5 в VLAN 120?',
    options:[{id:'untag-down',text:'Он указан как untagged-член VLAN 120, но физически down.'},{id:'tag-up',text:'Он tagged и физически up: D — это признак динамического VLAN.'},{id:'disabled-vlan',text:'VLAN 120 административно выключен, раз у одного порта есть D.'},{id:'pvid',text:'Этот вывод доказывает, что на любом другом порту PVID тоже равен 120.'}],
    answer:'untag-down',evidence:[3,6,7,10],
    explanation:'Строка 6 содержит UT и (D); легенда в строке 3 расшифровывает untagged и down. В строке 7 другой порт tagged и up. Status enable у VLAN в строке 10 не поднимает физический линк каждого члена и не задаёт PVID других портов.'
  },
  {
    id:'huawei-access-pvid',topic:'Access',command:'display port vlan gigabitethernet 0/0/5',source:'vlan',
    context:'Учебный снимок статической VLAN-конфигурации одного порта. По плану нужен access VLAN 120. Рабочее состояние линка не показано.',
    output:`<SW1> display port vlan gigabitethernet 0/0/5
Port                           Link Type    PVID  Trunk VLAN List
-------------------------------------------------------------------------------
GigabitEthernet0/0/5           access       130   -`,
    question:'Какое несоответствие плану видно на GE0/0/5?',
    options:[{id:'v130',text:'Тип access верен, но PVID/default VLAN равен 130 вместо 120.'},{id:'trunk',text:'Порт имеет тип trunk и разрешает VLAN 130.'},{id:'no-vlan',text:'Знак - означает, что access-порт вообще не принадлежит VLAN.'},{id:'link-down',text:'Вывод доказывает, что кабель отключён от порта.'}],
    answer:'v130',evidence:[2,4],
    explanation:'В строке 4 Link Type — access, PVID — 130. Для access-порта default VLAN назначается port default vlan. Колонка Trunk VLAN List не является членством access-порта; знак - не отменяет показанный PVID. Состояния линка здесь нет.'
  },
  {
    id:'huawei-trunk-limit',topic:'Trunk',command:'display port vlan gigabitethernet 0/0/1',source:'vlan',
    context:'Учебная локальная статическая конфигурация trunk. Другой конец, состояние линка, STP и результаты передачи кадров не показаны.',
    output:`<SW1> display port vlan gigabitethernet 0/0/1
Port                           Link Type    PVID  Trunk VLAN List
-------------------------------------------------------------------------------
GigabitEthernet0/0/1           trunk        1     1 110 120`,
    question:'Доказывает ли наличие VLAN 120 в списке его прохождение через соседний коммутатор?',
    options:[{id:'local-only',text:'Нет: локальное разрешение есть, но данных о соседнем конце и доставке кадров недостаточно.'},{id:'guaranteed',text:'Да: Trunk VLAN List показывает измеренную сквозную передачу.'},{id:'pvid-required',text:'Нет: tagged VLAN 120 всегда требует изменения PVID trunk на 120.'},{id:'peer-auto',text:'Да: allow-pass автоматически настраивает такой же список у соседа.'}],
    answer:'local-only',evidence:[2,4],
    explanation:'Строка 4 включает 120 в локальный статически разрешённый набор. Это не измерение доставки и не настройка соседа. Для вывода о прохождении нужны дополнительные данные о втором конце, линке и пересылке; PVID 1 не запрещает tagged VLAN 120.'
  },
  {
    id:'huawei-pvid-allow',topic:'PVID',command:'display port vlan gigabitethernet 0/0/1',source:'vlan',
    context:'Учебный снимок после port trunk pvid vlan 120; VLAN 120 существует. Trunk VLAN List в этом снимке показан полностью, динамических назначений нет.',
    output:`<SW1> display port vlan gigabitethernet 0/0/1
Port                           Link Type    PVID  Trunk VLAN List
-------------------------------------------------------------------------------
GigabitEthernet0/0/1           trunk        120   1 110`,
    question:'Достаточно ли PVID 120, чтобы этот trunk пропускал VLAN 120?',
    options:[{id:'missing-allow',text:'Нет: PVID 120 задан, но VLAN 120 ещё не разрешён через port trunk allow-pass vlan.'},{id:'automatic',text:'Да: PVID автоматически добавляет VLAN в разрешённый список.'},{id:'range',text:'Да: PVID 120 разрешает все VLAN от 1 до 120.'},{id:'absent',text:'Нет: этот вывод доказывает отсутствие VLAN 120 на всём устройстве.'}],
    answer:'missing-allow',evidence:[2,4],
    explanation:'В строке 4 PVID равен 120, а разрешённый набор содержит только 1 и 110. По руководству port trunk pvid vlan не добавляет интерфейс в этот VLAN: для пересылки отдельно требуется port trunk allow-pass vlan. Наличие VLAN на устройстве и разрешение на порту — разные условия.'
  },
  {
    id:'huawei-vlan-description',topic:'VLAN',command:'display vlan 120 verbose',source:'vlan',
    context:'Учебная выдержка подробных свойств VLAN. Строки членства портов и прочие поля опущены; проверяются только имя и описание.',
    output:`<SW1> display vlan 120 verbose
  VLAN ID                     : 120
  VLAN Name                   :
  VLAN Type                   : Common
  Description                 : OFFICE
  Status                      : Enable`,
    question:'Что показывает OFFICE в этом фрагменте?',
    options:[{id:'description',text:'Это описание VLAN; отдельное поле VLAN Name здесь пусто.'},{id:'name',text:'Это имя VLAN, назначенное командой name OFFICE.'},{id:'port-description',text:'Это описание интерфейса GE0/0/5.'},{id:'saved',text:'Это подтверждение сохранения конфигурации после последнего изменения.'}],
    answer:'description',evidence:[2,3,5],
    explanation:'В строке 5 OFFICE относится к Description, а VLAN Name в строке 3 пусто. В Huawei description и name — разные настройки; упражнение использует описание. Регистр значения сохраняется. Эти поля не являются подтверждением save или описанием конкретного порта.'
  },
  {
    id:'huawei-mac-direction',topic:'MAC',command:'display mac-address vlan 120',source:'mac',
    context:'Учебная локальная MAC-таблица; адреса вымышленные, локально администрируемые. Остальная топология не показана.',
    output:`<SW1> display mac-address vlan 120
MAC Address          VLAN/VSI/BD                 Learned-From        Type
-------------------------------------------------------------------------------
0200-0000-0010       120/-/-                     GE0/0/1             dynamic
0200-0000-0020       120/-/-                     GE0/0/5             dynamic`,
    question:'Какой локальный выход указан для MAC 0200-0000-0010 в VLAN 120?',
    options:[{id:'ge1',text:'GE0/0/1; прямое подключение конечного устройства кабелем не доказано.'},{id:'ge5',text:'GE0/0/5, потому что это конечный access-порт упражнения.'},{id:'cpu',text:'Это собственный постоянный MAC CPU коммутатора.'},{id:'both',text:'Оба порта: наличие двух строк в одном VLAN означает широковещательную рассылку.'}],
    answer:'ge1',evidence:[2,4],
    explanation:'Строка 4 связывает адрес с VLAN 120, Learned-From GE0/0/1 и типом dynamic. Таблица указывает локальное направление к адресу, но не показывает всю цепочку устройств за этим портом. Это не собственный MAC CPU и не основание рассылать известный unicast на оба порта.'
  }
];
