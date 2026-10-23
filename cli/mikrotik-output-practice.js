// Synthetic excerpts, not captures: CRS326-24G-2S+RM / RouterOS 7.16.2.
// Only documented pre-7.17 bridge properties; no interface lists or 7.20 CPU records.
const MIKROTIK_OUTPUT_SOURCES={
 bridge:'https://help.mikrotik.com/docs/spaces/ROS/pages/328068/Bridging+and+Switching',
 vlan:'https://help.mikrotik.com/docs/spaces/ROS/pages/28606465/Bridge+VLAN+Table',
 console:'https://help.mikrotik.com/docs/spaces/ROS/pages/328134/Command+Line+Interface'
};
const MIKROTIK_OUTPUT_TASKS=[
 {
  id:'mikrotik-port-pvid',topic:'Порты bridge / PVID',command:'/interface bridge port print detail where interface=ether5',source:'bridge',
  context:'Учебная выдержка одной записи bridge port; прочие свойства опущены. bridge1 работает с vlan-filtering=yes. По плану untagged-кадры конечного устройства должны относиться к VLAN 120.',
  output:`[admin@SW1] > /interface bridge port print detail where interface=ether5
Flags: X - disabled, I - inactive, D - dynamic, H - hw-offload
 0   interface=ether5 bridge=bridge1 pvid=130
     frame-types=admit-only-untagged-and-priority-tagged ingress-filtering=yes`,
  question:'Какое несоответствие плану видно в параметрах ether5?',
  options:[{id:'wrong-pvid',text:'Порт в bridge1, но PVID 130 вместо 120; для входящих untagged кадров задан другой VLAN.'},{id:'not-member',text:'Порт не добавлен ни в один bridge.'},{id:'all-tagged',text:'Порт принимает только кадры с обычным ненулевым VLAN-тегом.'},{id:'vlan-table',text:'Вывод доказывает отсутствие VLAN 120 во всей bridge VLAN table.'}],
  answer:'wrong-pvid',evidence:[3,4],
  explanation:'Строка 3 явно связывает ether5 с bridge1 и показывает pvid=130. Строка 4 допускает untagged и priority-tagged кадры. Это не вывод VLAN table: существование других VLAN и их участники здесь не показаны.'
 },
 {
  id:'mikrotik-vlan-egress',topic:'VLAN table / tagged',command:'/interface bridge vlan print',source:'vlan',
  context:'Учебная локальная VLAN table, vlan-filtering=yes. В этом снимке все перечисленные порты активны; показаны текущие участники VLAN, без сведений о соседнем коммутаторе.',
  output:`[admin@SW1] > /interface bridge vlan print
Flags: X - disabled, D - dynamic
 #   BRIDGE   VLAN-IDS  CURRENT-TAGGED  CURRENT-UNTAGGED
 0   bridge1       110  ether1          ether4
                       ether2
 1   bridge1       120  ether1          ether5
                       ether2`,
  question:'Какое egress-действие для VLAN 120 показано у ether5 и ether2?',
  options:[{id:'strip-keep',text:'ether5 отправляет кадры VLAN 120 без тега, ether2 — с тегом VLAN 120.'},{id:'keep-strip',text:'ether5 сохраняет тег VLAN 120, а ether2 удаляет его.'},{id:'both-untagged',text:'Оба порта отправляют VLAN 120 без тега: у них один bridge.'},{id:'pvid',text:'PVID ether2 обязательно равен 120, раз он в CURRENT-TAGGED.'}],
  answer:'strip-keep',evidence:[3,6,7],
  explanation:'В строке 6 ether5 находится в CURRENT-UNTAGGED VLAN 120, а ether1 и продолжение ether2 в строке 7 — в CURRENT-TAGGED. Это egress-действия. PVID задаёт классификацию входящих untagged кадров и не выводится из tagged-членства.'
 },
 {
  id:'mikrotik-dynamic-pvid',topic:'Статические / динамические записи',command:'/interface bridge vlan print',source:'vlan',
  context:'Учебная таблица маленького bridge с vlan-filtering=yes. VLAN-интерфейсов и MVRP нет; CPU и ether1 принимают только tagged. ether5 принимает untagged и имеет PVID 120. Другие записи таблицы не скрыты.',
  output:`[admin@SW1] > /interface bridge vlan print
Flags: X - disabled, D - dynamic
 #   BRIDGE   VLAN-IDS  CURRENT-TAGGED  CURRENT-UNTAGGED
 0   bridge1       110  ether1          ether4
 1 D bridge1       120                  ether5`,
  question:'Чем объясняется D у строки VLAN 120 в этих условиях?',
  options:[{id:'pvid-auto',text:'Это динамическое untagged-членство ether5 из-за PVID 120; это не отдельная статическая запись add.'},{id:'mac-learned',text:'VLAN 120 создан автоматически из MAC-адреса клиента.'},{id:'disabled',text:'D означает disabled: VLAN 120 административно выключен.'},{id:'saved',text:'D означает, что запись уже сохранена обязательной командой save.'}],
  answer:'pvid-auto',evidence:[2,5],
  explanation:'В строке 2 D расшифрован как dynamic. При заданных условиях PVID 120 автоматически добавляет ether5 как untagged (строка 5). Динамическое членство не является вручную добавленной строкой и не возникает из обучения MAC. Для отключённой записи используется X, отдельного save в Normal mode не требуется.'
 },
 {
  id:'mikrotik-static-current',topic:'Статическая запись / текущие участники',command:'/interface bridge vlan print',source:'vlan',
  context:'Учебный снимок одной строки локальной VLAN table при vlan-filtering=yes. Все перечисленные порты активны; параметры bridge port и PVID не показаны.',
  output:`[admin@SW1] > /interface bridge vlan print
Flags: X - disabled, D - dynamic
 #   BRIDGE   VLAN-IDS  CURRENT-TAGGED  CURRENT-UNTAGGED
 0   bridge1       120  ether1          ether5
                       ether2`,
  question:'Как следует трактовать отсутствие D и колонку CURRENT-UNTAGGED?',
  options:[{id:'static-row',text:'Показанная строка статическая; CURRENT-UNTAGGED отражает текущее членство, а не способ назначения PVID.'},{id:'pvid-inferred',text:'Отсутствие D доказывает, что PVID ether5 не может быть равен 120.'},{id:'dynamic-row',text:'Любое untagged-членство делает всю строку динамической, даже без флага D.'},{id:'no-save',text:'Без D запись не применится до команды write memory.'}],
  answer:'static-row',evidence:[2,3,4],
  explanation:'Строка 4 не содержит D, то есть это статическая строка. CURRENT-UNTAGGED показывает итоговых текущих участников: статическое untagged и совпадающий PVID могут сосуществовать. Сам PVID этим столбцом не отображается, для его проверки нужен bridge port print. Применение не требует write memory.'
 },
 {
  id:'mikrotik-frame-types',topic:'Frame-types / PVID',command:'/interface bridge port print detail where interface=ether1',source:'bridge',
  context:'Учебная выдержка параметров ether1, прочие свойства опущены. На bridge1 включён vlan-filtering=yes; обычный untagged кадр приходит извне на ether1.',
  output:`[admin@SW1] > /interface bridge port print detail where interface=ether1
Flags: X - disabled, I - inactive, D - dynamic, H - hw-offload
 0   interface=ether1 bridge=bridge1 pvid=120
     frame-types=admit-only-vlan-tagged ingress-filtering=yes`,
  question:'Будет ли обычный untagged кадр принят как VLAN 120 только из-за PVID?',
  options:[{id:'frame-drop',text:'Нет: admit-only-vlan-tagged отбрасывает обычные untagged кадры, несмотря на PVID 120.'},{id:'pvid-wins',text:'Да: PVID отменяет ограничение frame-types.'},{id:'egress-only',text:'Да: frame-types влияет только на исходящие кадры.'},{id:'neighbor',text:'Это определяется только PVID соседнего коммутатора.'}],
  answer:'frame-drop',evidence:[3,4],
  explanation:'PVID 120 в строке 3 не отменяет frame-types=admit-only-vlan-tagged в строке 4. При включённом VLAN filtering это ограничение входящих типов кадров; обычный untagged кадр не допускается. Tagged-членство VLAN table проверяется отдельно.'
 },
 {
  id:'mikrotik-ingress-filter',topic:'Ingress-filtering',command:'/interface bridge port print detail where interface=ether1',source:'bridge',
  context:'Учебные выдержки bridge port и локальной VLAN table. На bridge1 vlan-filtering=yes, все перечисленные порты активны. На ether1 поступает кадр с обычным 802.1Q тегом VLAN 130.',
  output:`[admin@SW1] > /interface bridge port print detail where interface=ether1
Flags: X - disabled, I - inactive, D - dynamic, H - hw-offload
 0   interface=ether1 bridge=bridge1 pvid=1
     frame-types=admit-only-vlan-tagged ingress-filtering=yes
[admin@SW1] > /interface bridge vlan print
Flags: X - disabled, D - dynamic
 #   BRIDGE   VLAN-IDS  CURRENT-TAGGED  CURRENT-UNTAGGED
 0   bridge1       130  ether2          ether4
 1   bridge1       120  ether1          ether5`,
  question:'Что произойдёт с указанным входящим кадром VLAN 130?',
  options:[{id:'membership-drop',text:'Ingress-filtering отбросит его: ether1 не входит в показанную строку VLAN 130.'},{id:'any-tag',text:'Любой tagged кадр принимается, независимо от VLAN table.'},{id:'rewrite-pvid',text:'Тег VLAN 130 будет автоматически заменён на PVID 1.'},{id:'untag',text:'frame-types снимет тег и отправит кадр на все access-порты.'}],
  answer:'membership-drop',evidence:[3,4,7,8],
  explanation:'В строке 4 tagged кадры допускаются по типу, но ingress-filtering=yes дополнительно проверяет входное членство в VLAN table. В строке 8 VLAN 130 содержит ether2 и ether4, без ether1, поэтому кадр отбрасывается. PVID 1 не переписывает обычный ненулевой VLAN-тег.'
 },
 {
  id:'mikrotik-path-limit',topic:'Недостаточность данных',command:'/interface bridge vlan print',source:'vlan',
  context:'Учебный локальный снимок bridge VLAN table при vlan-filtering=yes. Другие выводы в этом задании не предоставлены.',
  output:`[admin@SW1] > /interface bridge vlan print
Flags: X - disabled, D - dynamic
 #   BRIDGE   VLAN-IDS  CURRENT-TAGGED  CURRENT-UNTAGGED
 0   bridge1       120  ether1          ether5
                       ether2`,
  question:'Доказывает ли эта таблица доставку VLAN 120 через соседний коммутатор?',
  options:[{id:'local-only',text:'Нет: видно локальное членство, но для сквозной доставки данных недостаточно.'},{id:'guaranteed',text:'Да: CURRENT-TAGGED является измерением сквозной доставки.'},{id:'cpu-required',text:'Нет: любой L2-транзит VLAN всегда требует bridge1 в tagged-списке CPU.'},{id:'save-required',text:'Да, но только после обязательной команды save.'}],
  answer:'local-only',evidence:[3,4,5],
  explanation:'Строки 4–5 показывают локальные текущие участники VLAN 120, а не подтверждение связи через соседа. Не показаны его VLAN, состояние пути и доставка кадров. CPU-членство нужно для соответствующего локального L3/management-доступа, а не для любого L2-транзита. Обязательного save у этой модели Normal mode нет.'
 }
];
