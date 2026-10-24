// Synthetic, normalized settings/status cards, not device screenshots or CLI output.
const MOXA_SOURCES={
 mgate:{title:'MGate 5103 User Manual v1.2 · April 2026',url:'https://moxa.com/getmedia/e3ca4621-e418-4b65-b98d-5b6617791f1e/moxa-mgate-5103-series-manual-v1.2.pdf'},
 mgateFirmware:{title:'MGate 5103 firmware v2.5 · release history',url:'https://moxa.com/Moxa/media/PDIM/S100000194/MGate%205103%20Series_moxa-mgate-5103-series-firmware-v2.5.rom_Software%20Release%20History.pdf'},
 nport:{title:'NPort 5000 Series User Manual v7.6 · August 2025',url:'https://moxa.com/getmedia/b4a07eff-9d07-421d-8ea9-7bc9278b35c0/moxa-manual-for-nport-5000-series-manual-v7.6.pdf'},
 nportFirmware:{title:'NPort 5400 firmware v4.2 · release history',url:'https://moxa.com/Moxa/media/PDIM/S100000201/NPort%205400%20Series_moxa-nport-5400-series-firmware-v4.2.rom_Software%20Release%20History.pdf'},
 nportModel:{title:'NPort 5400 Series · model specifications',url:'https://moxa.com/en/products/industrial-edge-connectivity/serial-device-servers/general-device-servers/nport-5400-series'}
};
const MOXA_PROFILES={
 mgate:{label:'MGate 5103 · учебный ориентир FW 2.5 (build 26011822)',role:'Протокольный шлюз: в заданиях PROFINET IO Device ↔ Modbus RTU Master. Преобразует данные протоколов; это не VLAN-коммутатор.',management:'Читаем настройки и диагностику web-консоли. Руководство также описывает текстовую/menu-консоль; ввод команд здесь не реализован.',limits:'Руководство v1.2 и официальный release history 2.5 — опорные документы. Точная привязка каждой иллюстрации к FW 2.5 не подтверждена; установленное ПО и аппаратная ревизия рабочего устройства неизвестны.'},
 nport:{label:'NPort 5430 · учебный ориентир FW 4.2 (build 25050913)',role:'Четырёхпортовый serial device server RS-422/485. Переносит последовательный поток по Ethernet; не выполняет преобразование Modbus ↔ PROFINET и не является VLAN-коммутатором.',management:'Читаем web-консоль Monitor / Serial / Operating Settings; для диагностики также документирован NPort Administrator. Выбранный режим — TCP Server.',limits:'Общее руководство NPort 5000 v7.6 и release history семейства 5400 v4.2. Совпадение всех экранов с этой сборкой не доказано; ревизия и установленное ПО рабочего 5430 неизвестны. Применимость прошивки к конкретной ревизии нужно проверить отдельно. RS-232 для 5430 не заявляется.'}
};
// Options have stable IDs; the view shuffles them without revealing the key.
const moxaCard=(id,profile,title,output,question,options,answer,explanation,evidence,pages)=>({id,profile,title,output,question,options:options.map(([id,text])=>({id,text})),answer,explanation,evidence,pages,source:profile});
const MOXA_READING=[
 moxaCard('gateway-role','mgate','Роль шлюза',
 'Protocol conversion\nRole 1: PROFINET IO Device\nRole 2: Modbus RTU Master\nSerial interface: RS-485 2-wire',
 'Что делает этот профиль MGate?',
 [['stream','Только выдаёт удалённый COM-порт без преобразования протоколов'],['gateway','Связывает PROFINET IO-контроллер с Modbus RTU slave'],['switch','Добавляет tagged VLAN на Ethernet-порт']],
 'gateway','Role 1 и Role 2 задают стороны преобразования. У NPort другая задача: передача serial-потока по сети.',[2,3],'21, 25–27'),
 moxaCard('pn-connection','mgate','Ethernet и PROFINET — разные проверки',
 'Учебное наблюдение: web-консоль по 192.0.2.30 доступна\nPROFINET Diagnose — IO Device\nConnected PLC MAC Address: Not Connected\nPLC Operation Mode: N/A\nSender clock (packet interval): 0 ms',
 'Какой вывод подтверждён?',
 [['controller','Обмен с PROFINET-контроллером уже установлен'],['serial','Последовательный кабель точно оборван'],['pn','Web-доступ есть, но соединение с PLC здесь не установлено']],
 'pn','Доступ к web-консоли не доказывает циклический PROFINET-обмен. Причина отсутствия PLC-соединения этими строками не установлена.',[1,3,4],'44'),
 moxaCard('rtu-timeout','mgate','Тайм-аут не определяет единственную причину',
 'Modbus RTU Master · Max. retry: 0\nОдин завершённый учебный интервал, счётчики до него равны 0\nSent request: 20\nReceived valid response: 0\nReceived CRC/LRC Error: 0\nTimeout: 20',
 'Можно ли по этим данным выбрать между неверным slave ID, serial-параметрами и проводкой?',
 [['short','Да: точно замыкание линии'],['insufficient','Нет: своевременного ответа нет, нужны настройки и проверка линии/устройства'],['crc','Да: доказаны CRC-ошибки']],
 'insufficient','Timeout означает отсутствие своевременного ответа. Нулевой CRC-счётчик не доказывает исправность линии и не определяет причину молчания.',[3,4,5,6],'25, 43'),
 moxaCard('data-freshness','mgate','Значение в памяти и свежий обмен',
 'I/O Data View: input memory содержит значение 123\nНаблюдение сделано один раз\nModbus Diagnose и Status Monitoring: не показаны\nВремя последнего успешного обмена: не предоставлено',
 'Доказано ли, что значение только что получено от Modbus-устройства?',
 [['fresh','Да: любое значение в I/O Data View всегда свежее'],['stale','Нет, оно точно устарело'],['unknown','Нет данных о свежести: нужны диагностика команды/статус и наблюдение во времени']],
 'unknown','I/O Data View показывает внутреннюю память. Само значение не датирует успешный обмен: нужно сопоставить его с диагностикой команды и Status Monitoring.',[1,2,3,4],'43, 46–47'),
 moxaCard('tcp-endpoint','nport','Management и порт данных',
 'Учебный адрес NPort: 198.51.100.20/24\nWeb-консоль доступна\nPort 1 — Operation mode: TCP Server\nLocal TCP port: 5001\nНастройки учебного приложения: 198.51.100.20:5002\nMonitor Line: активное соединение приложения не наблюдается',
 'Какой следующий шаг обоснован конкретным расхождением?',
 [['endpoint','Сопоставить endpoint приложения с Local TCP port 5001'],['parity','Сразу менять parity наугад'],['done','Считать serial-обмен исправным: web открывается']],
 'endpoint','Для TCP Server приложение подключается к настроенному порту данных. Web-доступ проверяет другой сервис; несовпадение 5002/5001 нужно устранить прежде проверки serial-обмена.',[2,3,4,5,6],'32–33, 42–43; TCP Server Mode, 72–79'),
 moxaCard('serial-settings','nport','Настройки линии и паспорт устройства',
 'Port 1 — Serial Settings / Async-Settings\nInterface: RS-485 2-wire\nBaud rate: 19200; Data bits: 8\nStop bits: 1; Parity: None; Flow control: None\nУчебный паспорт подключённого устройства: RS-485 2-wire, 19200, 8E1, без flow control',
 'Какое конкретное несоответствие видно?',
 [['speed','Различаются скорости 9600 и 19200'],['parity','NPort настроен без parity, а устройство требует Even'],['rs232','Нужно включить RS-232 на NPort 5430']],
 'parity','8E1 — 8 бит данных, Even parity и 1 stop bit. Здесь различается parity. После согласования всё равно требуется проверить реальный ответ; другие неисправности не исключены.',[3,4,5],'28–30, 44'),
 moxaCard('async-zero','nport','Счётчики без активности',
 'Port 1 — Operation mode: TCP Server\nMonitor Async · два наблюдения с интервалом 10 s\nTxTotalCnt: 0 → 0\nRxTotalCnt: 0 → 0\nНаличие TCP-соединения и отправка запроса приложением: не проверены',
 'Как интерпретировать эти наблюдения?',
 [['cable','Точно перепутаны A/B линии RS-485'],['ready','Последовательное устройство ответило'],['next','Движения счётчиков нет; сначала проверить соединение приложения и факт запроса']],
 'next','Нулевые счётчики не доказывают неисправность serial-кабеля. Без соединения и запроса приложению нечего передавать; затем можно проверять последовательный участок.',[3,4,5],'42–44'),
 moxaCard('realcom-mode','nport','Режим должен соответствовать приложению',
 'Port 1 — Operation mode: TCP Server\nУчебное приложение открывает виртуальный COM-порт\nИспользуется драйвер Moxa Real COM\nРежимы приложения и NPort ещё не согласованы',
 'Что проверить перед изменением параметров RS-485?',
 [['mode','Согласовать Real COM драйвер с документированным режимом Real COM на NPort'],['vlan','Настроить switchport access vlan'],['transparent','TCP Server и Real COM всегда взаимозаменяемы']],
 'mode','Real COM — отдельный режим работы с драйвером. TCP Server предоставляет сетевой socket для соответствующего приложения. Выбор режима зависит от приложения, а не от доступности web-консоли.',[1,2,3],'32; Real COM Mode, 67–69')
];
const MOXA_SCENARIOS=[
 {id:'mgate-no-exchange',profile:'mgate',title:'Ethernet доступен, но обмен через MGate отсутствует',assumptions:'Изолированный учебный стенд: web-доступ 192.0.2.30/24; PROFINET IO Device ↔ Modbus RTU Master, один slave ID 7. Независимый доступ управления. Данные PLC и физическая линия пока не проверены.',steps:[
  moxaCard('mgate-inspect','mgate','Выбери следующий шаг',
   'Web-консоль доступна\nРоль 2: Modbus RTU Master\nSlave ID: 7; Max. retry: 0; Response timeout: 1000 ms\nSent request: 20; Received valid response: 0; Timeout: 20\nSerial Settings и паспорт slave пока не сопоставлены',
   'Что проверить до изменения тайм-аута или объявления поломки?',
   [['inspect','Сопоставить Serial Settings и slave ID с паспортом, затем проверить линию при необходимости'],['timeout','Любой timeout устраняется увеличением ожидания'],['ethernet','Раз web доступен, весь шлюз работает корректно']],
   'inspect','Счётчик показывает отсутствие ответа, но не его причину. Сначала получим конкретные настройки и требования подключённого устройства.',[3,4,5],'20, 25–27, 43'),
  moxaCard('mgate-compare','mgate','Интерпретируй полученные настройки',
   'Serial Settings: RS-485 2-wire, 19200, 8 data bits\nParity: None; Stop bits: 1; Flow control: None\nConfigured slave ID: 7\nУчебный паспорт slave: ID 7, RS-485 2-wire, 19200, 8E1\nСхема стенда и полярность отдельно сверены с паспортом',
   'Какое контролируемое изменение следует из сравнения?',
   [['id','Менять ID 7 на 8 без проверки'],['parity','Согласовать Parity = Even, затем повторить диагностическое наблюдение'],['success','Уже объявить обмен восстановленным']],
   'parity','Обнаружено расхождение parity. Его устранение — обоснованный шаг; успех нужно проверить новыми данными. В реальном стенде timeout может иметь и другие причины.',[1,2,3,4],'20, 25–27'),
  moxaCard('mgate-result','mgate','Проверь результат выбранного шага',
   'Учебный результат после согласования parity; два снимка, без сброса счётчиков\nSent request: 20 → 30\nReceived valid response: 0 → 10\nReceived CRC/LRC Error: 0 → 0\nTimeout: 20 → 20\nPROFINET Diagnose и соответствие PLC mapping: не показаны',
   'Какой результат подтверждает этот интервал?',
   [['all','Весь PROFINET-обмен с PLC и mapping доказан'],['fail','20 старых timeout означают, что исправление не помогло'],['local','10 новых запросов получили valid response без новых timeout; сторону PLC ещё надо проверить']],
   'local','Нужно сравнивать приросты, а не требовать обнуления старого счётчика. Подтверждён Modbus-участок этого интервала, но не весь путь до PLC.',[2,3,4,5,6],'43–44')
 ]},
 {id:'nport-no-reply',profile:'nport',title:'NPort доступен по IP, но serial-устройство не отвечает',assumptions:'Учебный NPort 5430: 198.51.100.20/24; клиент 198.51.100.40/24. Port 1 TCP Server, Local TCP port 5001; RS-485 2-wire, 19200 8E1, flow None. Параметры линии согласованы с учебным паспортом. Наличие ответа и проводка не предполагаются исправными.',steps:[
  moxaCard('nport-connect','nport','Выбери следующий шаг',
   'Web-консоль доступна\nPort 1 — Operation mode: TCP Server; Local TCP port: 5001\nПриложение пытается подключаться к 198.51.100.20:5002\nMonitor Line: активного соединения приложения нет\nTxTotalCnt: 0; RxTotalCnt: 0',
   'Что нужно сделать первым по показанным данным?',
   [['wire','Сразу менять проводку A/B'],['connect','Исправить endpoint клиента на 5001 и проверить Monitor Line'],['convert','Задать MGate-преобразование Modbus ↔ PROFINET на NPort']],
   'connect','Показано несовпадение порта данных. Сначала проверим соединение приложения; NPort не является протокольным шлюзом MGate.',[2,3,4],'32–33, 42–43; TCP Server Mode, 72–79'),
  moxaCard('nport-observe','nport','Интерпретируй результат подключения',
   'Приложение теперь подключается к 198.51.100.20:5001\nMonitor Line: присутствует соединение клиента 198.51.100.40\nНаблюдение учебного приложения: тестовый запрос ещё не отправлялся\nMonitor Async: TxTotalCnt 0; RxTotalCnt 0',
   'Что проверить дальше?',
   [['request','Отправить известный корректный тестовый запрос и сопоставить новые счётчики с ответом'],['finished','Считать serial-обмен восстановленным только по TCP-соединению'],['broken','Нулевые счётчики уже доказывают поломку RS-485']],
   'request','TCP-соединение — условие доставки потока, а не доказательство ответа serial-устройства. Здесь приложение ещё не посылало запрос.',[2,3,4],'42–44'),
  moxaCard('nport-result','nport','Ограничь вывод имеющимися данными',
   'Тестовый запрос отправлен; соединение приложения сохраняется\nMonitor Async · два снимка за 10 s\nTxTotalCnt: 0 → 8; RxTotalCnt: 0 → 0\nУчебное наблюдение приложения: ответ не получен\nНастройки: RS-485 2-wire, 19200 8E1, flow None — совпадают с паспортом\nПроводка, питание slave и содержимое запроса ещё не проверены',
   'Какой вывод и следующий шаг обоснованы?',
   [['polarity','Точно доказана обратная полярность A/B'],['gateway','Нужно обязательно заменить NPort протокольным шлюзом'],['investigate','TCP-соединение есть, ответа нет; проверить serial-участок и корректность запроса, единственная причина пока не установлена']],
   'investigate','Рост TxTotalCnt при неизменном RxTotalCnt согласуется с отсутствием принятого serial-ответа. Это не определяет единственную причину: остаются линия, питание, адресация и запрос. Изменять всё сразу нельзя.',[1,3,4,5,6],'42–44')
 ]}
];
const MOXA_PRACTICE={
 items:id=>id==='reading'?MOXA_READING:MOXA_SCENARIOS.find(x=>x.id===id)?.steps,
 initial(id){if(!this.items(id))throw Error('Unknown Moxa activity');return {id,index:0,selected:null,correct:false,finished:false};},
 answer(state,choice){if(state.finished||state.correct)return state;const task=this.items(state.id)[state.index];if(!task.options.some(x=>x.id===choice))return state;return {...state,selected:choice,correct:choice===task.answer};},
 next(state){if(!state.correct||state.finished)return state;return state.index+1===this.items(state.id).length?{...state,finished:true}:{...state,index:state.index+1,selected:null,correct:false};}
};
