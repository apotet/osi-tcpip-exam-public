// XC206-2SFP / V04.03.01: constructed configuration excerpts, not captures.
// No unverified show-vlan/status table layout is reconstructed. See source audit.
const SCALANCE_OUTPUT_DOC = 'https://cache.industry.siemens.com/dl/files/819/109799819/att_1088483/v1/PH_SCALANCE-XB-200-XC-200-XF-200BA-XP-200-XR-300WG-CLI_76.pdf';
const SCALANCE_OUTPUT_NOTE = 'Учебный фрагмент конфигурации по документированным командам V4.3.1. Служебные заголовки, умолчания и остальные настройки опущены; это не побайтовый дамп оборудования.';
const SCALANCE_OUTPUT_TASKS = [
  {
    id:'scalance-port-shutdown',topic:'Порт',command:'show running-config interface fastethernet 0/3',source:'port',
    context:SCALANCE_OUTPUT_NOTE+' Показана настройка одного порта.',
    output:`cli# show running-config interface fastethernet 0/3
interface fastethernet 0/3
 shutdown
exit`,
    question:'Что подтверждает shutdown без complete в этом профиле?',
    options:[{id:'disabled',text:'Интерфейс отключён для обмена данными; индикация соединения при этом может сохраняться.'},{id:'cable',text:'Кабель точно оборван, поэтому CLI автоматически записал shutdown.'},{id:'vlan',text:'Порт передаёт трафик только нетегированного VLAN 1.'},{id:'stp',text:'STP выбрал альтернативную роль; административное состояние не изменено.'}],
    answer:'disabled',evidence:[2,3],
    explanation:'Строка 3 — административное отключение интерфейса из строки 2. В CLI V4.3.1 shutdown без complete сохраняет отображаемое соединение, но данные не отправляются и не принимаются. Это не диагноз кабеля и не состояние STP.'
  },
  {
    id:'scalance-port-limit',topic:'Порт',command:'show running-config interface fastethernet 0/3 all',source:'port',
    context:SCALANCE_OUTPUT_NOTE+' all включает настройки по умолчанию. Оперативное состояние линка не показано.',
    output:`cli# show running-config interface fastethernet 0/3 all
interface fastethernet 0/3
 no shutdown
exit`,
    question:'Доказывает ли no shutdown, что физический линк уже поднят?',
    options:[{id:'enabled',text:'Нет: интерфейс разрешён административно, но данных об оперативном линке недостаточно.'},{id:'up',text:'Да: no shutdown одновременно проверяет кабель и питание соседа.'},{id:'speed',text:'Да: порт обязательно согласовал 1000 Мбит/с в полном дуплексе.'},{id:'broken',text:'Нет: строка доказывает неисправность оптического трансивера этого медного порта.'}],
    answer:'enabled',evidence:[2,3],
    explanation:'В строке 3 отменено административное отключение порта. Конфигурация не показывает согласование скорости или состояние линка. У XC206-2SFP медные порты 10/100 Мбит/с; сведения о SFP и успешном соединении здесь отсутствуют.'
  },
  {
    id:'scalance-vlan-members',topic:'VLAN',command:'show running-config vlan 120',source:'ports',
    context:SCALANCE_OUTPUT_NOTE+' Раздел только для VLAN 120; настройки PVID интерфейсов не показаны.',
    output:`cli# show running-config vlan 120
vlan 120
 name OFFICE
 ports fastethernet 0/1-2 untagged fastethernet 0/3
exit`,
    question:'Как задаётся выходное тегирование VLAN 120 на Fa0/3?',
    options:[{id:'untagged',text:'Fa0/3 — untagged: при выходе кадров этого VLAN тег снимается.'},{id:'tagged',text:'Fa0/3 — tagged, потому что команда начинается с ports.'},{id:'pvid',text:'Эта строка сама по себе устанавливает PVID Fa0/3 в 120.'},{id:'forbidden',text:'Fa0/3 запрещён в VLAN 120, а untagged означает отсутствие членства.'}],
    answer:'untagged',evidence:[2,4],
    explanation:'Строка 4 задаёт Fa0/1–2 как tagged и Fa0/3 как untagged в VLAN 120 из строки 2. Tagged/untagged здесь описывают выходные кадры. Входной PVID этой командой не задаётся и в фрагменте не показан.'
  },
  {
    id:'scalance-pvid-ingress',topic:'PVID',command:'show running-config interface fastethernet 0/3',source:'pvid',
    context:SCALANCE_OUTPUT_NOTE+' Рассматривается принятый портом кадр без VLAN-тега; разрешение типов кадров и egress-членство не показаны.',
    output:`cli# show running-config interface fastethernet 0/3
interface fastethernet 0/3
 switchport pvid 120
exit`,
    question:'Какой VLAN назначается принятому нетегированному кадру на Fa0/3?',
    options:[{id:'v120',text:'VLAN 120: это входной PVID данного порта.'},{id:'v1',text:'Всегда VLAN 1, потому что у входного кадра нет тега.'},{id:'egress',text:'VLAN выбирается только по untagged-списку выходного порта.'},{id:'all',text:'Кадр относится ко всем VLAN из allowed list одновременно.'}],
    answer:'v120',evidence:[2,3],
    explanation:'Строка 3 задаёт PVID 120 для Fa0/3 из строки 2. При обработке принятого нетегированного кадра используется этот VLAN ID. Это не полный allowed list и не описание выходного снятия тега.'
  },
  {
    id:'scalance-untagged-pvid-limit',topic:'PVID',command:'show running-config vlan 120',source:'ports',
    context:SCALANCE_OUTPUT_NOTE+' Только VLAN-раздел: интерфейсная конфигурация, включая PVID, отсутствует.',
    output:`cli# show running-config vlan 120
vlan 120
 name OFFICE
 ports fastethernet 0/1-2 untagged fastethernet 0/3
exit`,
    question:'Можно ли подтвердить по этому разделу PVID 120 на Fa0/3?',
    options:[{id:'need-pvid',text:'Нет: untagged задаёт выходное поведение; для входного PVID нужны настройки порта.'},{id:'same',text:'Да: untagged-членство и PVID всегда взаимозаменяемы.'},{id:'one',text:'Нет: любой VLAN-раздел доказывает, что PVID остаётся равным 1.'},{id:'allowed',text:'Да: ports — это allowed list, автоматически задающий единственный PVID всем портам.'}],
    answer:'need-pvid',evidence:[1,4],
    explanation:'Фильтр vlan 120 в строке 1 показывает VLAN-раздел, а строка 4 — выходное тегирование. Отдельный switchport pvid в настройках Fa0/3 не показан. Нельзя ни подтвердить 120, ни объявить PVID равным 1 по отсутствующему разделу.'
  },
  {
    id:'scalance-preserve-vlans',topic:'VLAN',command:'show running-config vlan',source:'ports',
    context:SCALANCE_OUTPUT_NOTE+' Исходный VLAN 110 должен сохранять Fa0/1–2 tagged и Fa0/4 untagged. Показаны два соответствующих VLAN-раздела после добавления нового VLAN.',
    output:`cli# show running-config vlan
vlan 110
 name CONTROL
 ports fastethernet 0/1-2 untagged fastethernet 0/4
exit
vlan 120
 name OFFICE
 ports fastethernet 0/1-2 untagged fastethernet 0/3
exit`,
    question:'Что видно о прежнем VLAN 110 после добавления VLAN 120?',
    options:[{id:'preserved',text:'VLAN 110 и требуемый состав его портов сохранены; VLAN 120 задан отдельным разделом.'},{id:'replaced',text:'VLAN 120 заменил VLAN 110 целиком, поскольку использует те же аплинки.'},{id:'pvid',text:'На всех портах автоматически установлен PVID 120.'},{id:'saved',text:'Вывод running-config сам по себе подтверждает сохранение конфигурации после перезагрузки.'}],
    answer:'preserved',evidence:[2,4,6,8],
    explanation:'В строках 2–4 остаётся VLAN 110 с исходным членством. Строки 6–8 относятся к другому VLAN 120. ports заменяет список выбранного VLAN, а не все VLAN устройства. Running-config не подтверждает отдельное сохранение в Trial mode.'
  },
  {
    id:'scalance-tagged-limit',topic:'Тегирование',command:'show running-config vlan 120',source:'ports',
    context:SCALANCE_OUTPUT_NOTE+' Показана только локальная VLAN-конфигурация; линк, фильтрация входа, STP, сосед и доставка кадров не проверены.',
    output:`cli# show running-config vlan 120
vlan 120
 name OFFICE
 ports fastethernet 0/1-2 untagged fastethernet 0/3
exit`,
    question:'Что подтверждено для Fa0/1 и Fa0/2?',
    options:[{id:'tagged',text:'Они заданы tagged-членами VLAN 120 для выхода; сквозная передача этим не доказана.'},{id:'pvid',text:'У обоих портов PVID 120, поэтому все входящие кадры относятся к VLAN 120.'},{id:'all',text:'На них разрешён только VLAN 120, а остальные VLAN обязательно запрещены.'},{id:'delivery',text:'Оба конца аплинков уже согласованы, и кадры VLAN 120 гарантированно доставляются.'}],
    answer:'tagged',evidence:[2,4],
    explanation:'Строка 4 задаёт tagged-членство Fa0/1–2 в выбранном VLAN 120. Она не является исчерпывающим allowed list порта и не устанавливает PVID. По локальной конфигурации нельзя подтвердить настройку соседа или доставку кадров.'
  }
];
