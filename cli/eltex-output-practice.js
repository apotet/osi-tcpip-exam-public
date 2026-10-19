// MES2324 / 4.0.27.3: synthetic excerpts, not equipment captures.
// Field formats are from the official guide; omissions are stated per question.
const ELTEX_OUTPUT_DOC = 'https://eltex.ru/storage/upload_center/files/60/MES_Series_user_manual_4.0.27.3.pdf';
const ELTEX_OUTPUT_TASKS = [
  {
    id:'eltex-port-link',topic:'Порт',command:'show interfaces gigabitethernet 1/0/5',source:'interfaces',
    context:'Учебный фрагмент сведений о порте; остальные счётчики и конфигурация опущены.',
    output:`console# show interfaces gigabitethernet 1/0/5
gigabitethernet1/0/5 is down (not connected)
  Interface index is 5
  Hardware is gigabitethernet, MAC address is 02:00:00:00:00:05
  Description: Training
  Interface MTU is 1500
  Link is down for 0 days, 0 hours, 3 minutes and 28 seconds`,
    question:'Что подтверждено этим фрагментом о gi1/0/5?',
    options:[{id:'down',text:'Оперативного линка нет; причина отсутствия линка здесь не установлена.'},{id:'cable',text:'Кабель точно оборван, другие причины исключены.'},{id:'admin',text:'Порт точно отключён командой shutdown администратором.'},{id:'stp',text:'Линк поднят, но STP остановил пересылку кадров.'}],
    answer:'down',evidence:[2,7],
    explanation:'Строка 2 — down (not connected), строка 7 — длительность отсутствия линка. Здесь нет подтверждения shutdown, обрыва кабеля или состояния STP. Для причины нужны дополнительные данные.'
  },
  {
    id:'eltex-port-mode',topic:'Порт',command:'show interfaces status',source:'interfaces',
    context:'Учебный фрагмент таблицы: один порт, длинная строка показана целиком. Остальные порты опущены.',
    output:`console# show interfaces status
                                              Flow Link        Uptime       Back     Mdix
Port     Type         Duplex Speed Neg        ctrl State       (d,h:m:s)   Pressure   Mode  Port Mode
-------- ------------ ------ ----- ---------- ---- ----------- ------------ -------- ------ ---------
gi1/0/5  1G-Copper     --     --    --         --   Down        --           --       --     Access`,
    question:'Что означает Access в последнем столбце?',
    options:[{id:'mode',text:'Режим коммутации порта; это не признак поднятого линка.'},{id:'up',text:'Порт уже имеет работающий линк со скоростью 1 Гбит/с.'},{id:'vlan',text:'Это имя VLAN, назначенного конечному устройству.'},{id:'stp',text:'Это состояние пересылки STP вместо роли порта.'}],
    answer:'mode',evidence:[3,5],
    explanation:'Строка 3 отделяет Link State от Port Mode. В строке 5 режим Access сочетается с Down и отсутствием согласованных Duplex/Speed; тип 1G-Copper не является измеренной скоростью линка.'
  },
  {
    id:'eltex-vlan-members',topic:'VLAN',command:'show vlan',source:'vlan',
    context:'Учебный фрагмент локальной таблицы VLAN; другие VLAN опущены. Tagged и UnTagged — отдельные столбцы.',
    output:`console# show vlan
Created by: D-Default, S-Static, G-GVRP, R-Radius Assigned VLAN, V-Voice VLAN
Vlan Name              Tagged Ports       UnTagged Ports      Created by
---- ----------------- ------------------ ------------------ ----------------
120  OFFICE            gi1/0/1            gi1/0/5             S`,
    question:'Как показано членство gi1/0/5 в VLAN 120?',
    options:[{id:'untagged',text:'Порт перечислен в UnTagged Ports VLAN 120 OFFICE.'},{id:'tagged',text:'Порт перечислен в Tagged Ports VLAN 120 OFFICE.'},{id:'absent',text:'Порта нет в VLAN 120, поскольку Created by — S.'},{id:'link',text:'Таблица подтверждает поднятый линк и доступность клиента.'}],
    answer:'untagged',evidence:[3,5],
    explanation:'В строке 5 gi1/0/5 находится под UnTagged Ports, а gi1/0/1 — под Tagged Ports. S означает статическое создание VLAN по легенде, а не состояние линка или STP.'
  },
  {
    id:'eltex-vlan-empty',topic:'VLAN',command:'show vlan',source:'vlan',
    context:'Учебный фрагмент таблицы: строка VLAN 120 показана целиком, её списки портов пусты.',
    output:`console# show vlan
Created by: D-Default, S-Static, G-GVRP, R-Radius Assigned VLAN, V-Voice VLAN
Vlan Name              Tagged Ports       UnTagged Ports      Created by
---- ----------------- ------------------ ------------------ ----------------
120  OFFICE                                                     S`,
    question:'Какой вывод можно сделать о VLAN 120?',
    options:[{id:'exists',text:'VLAN создан статически, но порты в этой строке не перечислены.'},{id:'absent',text:'VLAN ещё не создан, потому что список портов пуст.'},{id:'all',text:'Пустые списки означают, что VLAN разрешён на всех портах.'},{id:'traffic',text:'Одно имя OFFICE доказывает прохождение трафика через сеть.'}],
    answer:'exists',evidence:[2,3,5],
    explanation:'Строка 5 содержит VLAN 120 OFFICE и S (Static, строка 2). Tagged/UnTagged Ports пусты. Существование VLAN и его имя не означают членство всех портов или сквозную доставку кадров.'
  },
  {
    id:'eltex-access-plan',topic:'VLAN',command:'show interfaces switchport gigabitethernet 1/0/5',source:'switchport',
    context:'Учебные поля switchport и раздел членства. По плану конечный нетегированный порт должен быть access VLAN 120. Прочие разделы опущены.',
    output:`console# show interfaces switchport gigabitethernet 1/0/5
Port : gi1/0/5
Port Mode: Access
Ingress Filtering: true
Acceptable Frame Type: admitAll
Ingress UnTagged VLAN ( NATIVE ): 130
Port is member in:
Vlan Name                             Egress rule Added by
---- -------------------------------- ----------- ----------------
130  CAMERAS                          Untagged    S`,
    question:'Какое несоответствие плану видно на gi1/0/5?',
    options:[{id:'wrong-vlan',text:'Режим Access верен, но нетегированный VLAN — 130 вместо 120.'},{id:'trunk',text:'Порт работает в режиме Trunk вместо Access.'},{id:'tagged',text:'VLAN 130 отправляется тегированным, потому что включён Ingress Filtering.'},{id:'correct',text:'Порт уже в VLAN 120: NATIVE не относится к нетегированному входу.'}],
    answer:'wrong-vlan',evidence:[3,6,10],
    explanation:'Строка 3 показывает Access, строка 6 — Ingress UnTagged VLAN 130, а строка 10 — Untagged-членство 130. Требуемого VLAN 120 здесь нет; фильтрация входа не меняет Egress rule на Tagged.'
  },
  {
    id:'eltex-trunk-limit',topic:'Trunk',command:'show interfaces switchport gigabitethernet 1/0/1',source:'switchport',
    context:'Учебные локальные поля switchport: режим, native VLAN и членство. Линк, STP, сосед и результаты передачи трафика не показаны.',
    output:`console# show interfaces switchport gigabitethernet 1/0/1
Port : gi1/0/1
Port Mode: Trunk
Ingress Filtering: true
Acceptable Frame Type: admitAll
Ingress UnTagged VLAN ( NATIVE ): 1
Port is member in:
Vlan Name                             Egress rule Added by
---- -------------------------------- ----------- ----------------
1    1                                Untagged    D
120  OFFICE                           Tagged      S`,
    question:'Подтверждает ли вывод доставку кадров VLAN 120 через соседний коммутатор?',
    options:[{id:'local',text:'Нет: показано локальное Tagged-членство; данных о доставке через соседа недостаточно.'},{id:'delivered',text:'Да: Tagged и Trunk гарантируют прохождение до любого получателя.'},{id:'blocked',text:'Нет: строка NATIVE 1 уже доказывает блокировку VLAN 120.'},{id:'native',text:'Да: VLAN 120 показан как нетегированный native VLAN.'}],
    answer:'local',evidence:[3,6,11],
    explanation:'Trunk в строке 3 и Tagged для 120 в строке 11 описывают локальную конфигурацию. Строка 6 задаёт native VLAN 1, а не запрет VLAN 120. Сведения о линке, STP, втором конце и передаче кадров отсутствуют.'
  },
  {
    id:'eltex-stp-forward',topic:'STP',command:'show spanning-tree',source:'stp',
    context:'Учебный фрагмент RSTP: заголовок режима и таблица двух портов. Сведения о root bridge и другие порты опущены.',
    output:`console# show spanning-tree
Spanning tree enabled mode RSTP
Default port cost method: short
Interfaces
Name      State    Prio.Nbr Cost Sts  Role PortFast Type
--------- -------- -------- ---- ---- ---- -------- ----------
gi1/0/5   enabled  128.5    4    Frw  Desg Yes      P2P (RSTP)
gi1/0/6   enabled  128.6    100  Dsbl Dsbl No       -`,
    question:'Какой порт показан в состоянии пересылки STP?',
    options:[{id:'port5',text:'gi1/0/5: Sts Frw, роль Desg; у gi1/0/6 стоит Dsbl.'},{id:'both',text:'Оба порта, поскольку в State у обоих enabled.'},{id:'port6',text:'Только gi1/0/6, потому что значение Cost 100 больше.'},{id:'neither',text:'Ни один: PortFast Yes всегда означает блокировку STP.'}],
    answer:'port5',evidence:[2,5,7,8],
    explanation:'В строке 7 Frw означает forwarding; роль — Desg. State enabled в строке 8 не заменяет Sts: у gi1/0/6 указано Dsbl. Этот фрагмент не устанавливает причину Dsbl и не подтверждает доступность по всей сети.'
  }
];
