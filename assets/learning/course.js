(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('../../quiz/engine.js') : root.QuizEngine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LearningCourse = api;
})(typeof window === 'undefined' ? globalThis : window, function (engine) {
  'use strict';
  const storageKey = 'osiLearningCourseV1';
  const title = 'Как компьютер отправляет данные в другую подсеть';
  const lessons = [
    {
      id:'link', title:'Подключение и Link',
      conditions:'ПК A подключён Ethernet-кабелем к коммутатору, питание включено. Сейчас индикатор и состояние интерфейса показывают Link Down. Другие признаки пока неизвестны.',
      explanation:'Link — состояние физического соединения с соседним портом. При Link Down начни с кабеля, разъёмов, состояния портов и согласования скорости на обоих концах. Link Up позволяет перейти к адресации, но сам по себе не доказывает связь с сервером.',
      diagram:['ПК A · Link Down','кабель → порт коммутатора','проверить оба конца → Link Up'],
      question:'С чего начать при описанном Link Down?',
      answers:['Проверить кабель, разъёмы и состояние портов обоих концов','Сразу менять DNS-сервер','Искать MAC удалённого сервера через маршрутизатор'], correct:0,
      review:'При Link Down проверяем физическое подключение и состояние портов. Замена DNS не поднимет Ethernet-линк. После устранения причины Link Up — только следующий исходный факт, а не доказательство доступности сервера.'
    },
    {
      id:'subnet', title:'IP, маска и своя подсеть',
      conditions:'Кабель и порты проверены, Link Up. У ПК A вручную задан IPv4 192.0.2.70/26 (маска 255.255.255.192). Цель — 198.51.100.20. Это обычная IPv4-подсеть с network/broadcast, без специальных host routes.',
      explanation:'Маска отделяет сетевые биты от хостовых. /26 оставляет 6 хостовых бит: блок содержит 64 адреса. В последнем октете границы блоков — 0, 64, 128, 192. Адрес 70 попадает в блок 64–127: сеть .64, broadcast .127, адреса хостов .65–.126. Цель 198.51.100.20 находится вне этого блока.',
      diagram:['192.0.2.70 AND 255.255.255.192','сеть 192.0.2.64/26 · диапазон .64–.127','198.51.100.20 — другая подсеть'],
      question:'Какова сеть ПК A с адресом 192.0.2.70/26?',
      answers:['192.0.2.0/26','192.0.2.64/26','192.0.2.70/26'], correct:1,
      review:'Сеть — 192.0.2.64/26. Блок /26 содержит 64 адреса; 70 лежит между 64 и 127. .70 — адрес самого ПК, а не начало сети. Для отработки других масок используй существующий IPv4-тренажёр.',
      practice:'ipv4.html'
    },
    {
      id:'gateway', title:'Шлюз для другой подсети',
      conditions:'Link Up. ПК A — 192.0.2.70/26. Его таблица: подключённая сеть 192.0.2.64/26 и маршрут по умолчанию 0.0.0.0/0 через 192.0.2.65. Других маршрутов нет. Цель 198.51.100.20; шлюз .65 находится в локальной подсети A.',
      explanation:'Для локальной цели ПК может отправить кадр непосредственно соседу. Для этой удалённой цели подключённый маршрут не подходит: используется маршрут по умолчанию через шлюз. Шлюз — ближайший маршрутизатор, а не конечный адрес назначения IP-пакета.',
      diagram:['IP-цель: 198.51.100.20','следующий узел: 192.0.2.65 · локальный шлюз','ПК A → коммутатор → шлюз → другая сеть'],
      question:'Какой следующий узел выберет A для 198.51.100.20 по указанной таблице?',
      answers:['192.0.2.70 — сам A','198.51.100.20 — напрямую в локальном сегменте','192.0.2.65 — шлюз по умолчанию'], correct:2,
      review:'Выбран 192.0.2.65: 198.51.100.20 не входит в 192.0.2.64/26, а других специальных маршрутов нет. Адрес назначения IP остаётся 198.51.100.20; на локальном участке следующим узлом будет .65.'
    },
    {
      id:'arp', title:'ARP и MAC следующего узла',
      conditions:'A = 192.0.2.70, MAC 02:00:00:00:00:70. Следующий узел — шлюз 192.0.2.65, его LAN MAC 02:00:00:00:00:65. Оба в одном Ethernet/VLAN. Записи о шлюзе в ARP-кэше A нет. Proxy ARP отсутствует; шлюз отвечает на запрос своего IP.',
      explanation:'Чтобы передать IPv4-пакет по Ethernet, нужен MAC следующего узла. A рассылает ARP Request «кто имеет 192.0.2.65?» с Ethernet destination ff:ff:ff:ff:ff:ff. Шлюз сообщает свой MAC. Затем A отправляет кадр шлюзу, сохраняя IP-цель сервера. ARP-запрос не пересылается маршрутизатором в удалённую сеть.',
      diagram:['ARP Request: кто имеет 192.0.2.65? → broadcast','ARP Reply: 192.0.2.65 → 02:00:00:00:00:65','кадр к шлюзу · IP-пакет к 198.51.100.20'],
      question:'После этого ARP-ответа какой Destination MAC будет у Ethernet-кадра с данными к серверу?',
      answers:['02:00:00:00:00:65 — LAN-интерфейс шлюза','ff:ff:ff:ff:ff:ff — все кадры с данными широковещательные','MAC удалённого сервера, который A должен узнать через ARP'], correct:0,
      review:'Destination MAC — 02:00:00:00:00:65. Через ARP A узнал MAC локального следующего узла .65, а не MAC удалённого сервера. Source MAC — 02:00:00:00:00:70, Destination IP — 198.51.100.20.'
    },
    {
      id:'router', title:'Отправка через маршрутизатор',
      conditions:'A отправляет IP 192.0.2.70 → 198.51.100.20 с TTL 64. У маршрутизатора LAN 192.0.2.65/26 (MAC …:65) и выход 198.51.100.1/24 (MAC 02:00:00:00:01:01). Сервер 198.51.100.20/24 имеет MAC 02:00:00:00:01:20, его ARP-запись на маршрутизаторе уже есть. Все линки Up, маршрутизация включена, фильтры разрешают передачу. NAT, туннелей и фрагментации нет; рассматриваем только отправку A к серверу, не ответ.',
      explanation:'Маршрутизатор снимает входной Ethernet-заголовок, выбирает выход по IP назначения и создаёт новый кадр для следующего участка. Здесь сервер подключён к выходной сети напрямую. IP-адреса источника и назначения сохраняются, TTL уменьшается до 63, checksum IPv4-заголовка пересчитывается. MAC-адреса относятся к конкретному Ethernet-участку.',
      diagram:['A → шлюз: Ethernet …:00:70 → …:00:65','внутри: IPv4 192.0.2.70 → 198.51.100.20','маршрутизатор → сервер: Ethernet …:01:01 → …:01:20','на выходе: те же IP, TTL 63'],
      question:'Что будет на выходе маршрутизатора в этом примере?',
      answers:['Source IP станет 198.51.100.1, потому что каждый маршрутизатор заменяет IP','IP останутся 192.0.2.70 → 198.51.100.20; Source MAC будет 02:00:00:00:01:01, Destination MAC 02:00:00:00:01:20; TTL 63','Ethernet Source MAC останется MAC компьютера A на всём пути'], correct:1,
      review:'Верно сохраняются IP 192.0.2.70 → 198.51.100.20: NAT отсутствует. Новый кадр идёт от MAC выходного интерфейса 02:00:00:00:01:01 к MAC сервера 02:00:00:00:01:20; TTL 64 → 63. Это объясняет отправку в заданных условиях, но не доказывает обратный маршрут или работу приложения.'
    }
  ];
  const ids = new Set(lessons.map(l => l.id));
  function normalize(raw) {
    let value;
    try { value = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { value = null; }
    if (!value || value.version !== 1) value = {};
    return {version:1, current:ids.has(value.current) ? value.current : lessons[0].id, stats:engine.migrate(value.stats, lessons)};
  }
  function status(state, id) {
    const entry = state.stats.questions[id];
    return entry?.streak > 0 ? 'Закреплено' : entry?.wrong > 0 ? 'Нужно повторить' : 'Не начато';
  }
  function complete(state) { return lessons.every(l => status(state,l.id) === 'Закреплено'); }
  function recommended(state) { return lessons.find(l => status(state,l.id) !== 'Закреплено')?.id || lessons[0].id; }
  function grade(id, choice) {
    const lesson = lessons.find(l => l.id === id);
    if (!lesson || !Number.isInteger(choice) || choice < 0 || choice >= lesson.answers.length) return null;
    return {choice, correct:choice === lesson.correct, correctAnswer:lesson.answers[lesson.correct], explanation:lesson.review};
  }
  function createController(storage) {
    let state;
    try { state = normalize(storage.getItem(storageKey)); } catch { state = normalize(null); }
    let review = null;
    let persisted = true;
    function save() { try { storage.setItem(storageKey, JSON.stringify(state)); persisted = true; } catch { persisted = false; } }
    return {
      snapshot() { return {state:normalize(state), review, persisted, complete:complete(state)}; },
      select(id) { if (!ids.has(id)) return false; state.current = id; review = null; save(); return true; },
      answer(choice) {
        if (review) return null;
        const result = grade(state.current, choice);
        if (!result) return null;
        engine.shown(state.stats, state.current); engine.answered(state.stats, state.current, result.correct);
        review = result; save(); return result;
      },
      retry() { review = null; },
      next() {
        if (!review?.correct) return false;
        const index = lessons.findIndex(l => l.id === state.current);
        if (index === lessons.length-1) return false;
        state.current = lessons[index+1].id; review = null; save(); return true;
      }
    };
  }
  // learningScreen/learnNav remain the existing OSI reference. Unknown anchors
  // (for example photoCredits) belong to the host page and are left alone.
  function resolveRoute(hash) {
    const routes = {'#exam':['startScreen',null], '#osi':['learningScreen',null], '#learning':['learningScreen',null], '#learningScreen':['learningScreen',null], '#course':['courseScreen','miniCourse'], '#miniCourse':['courseScreen','miniCourse'], '#practice':['courseScreen','practice'], '#courseScreen':['courseScreen','miniCourse']};
    return Object.hasOwn(routes,hash) ? {screen:routes[hash][0],section:routes[hash][1]} : null;
  }
  function hashForScreen(id) { return id === 'learningScreen' ? '#osi' : id === 'courseScreen' ? '#course' : '#exam'; }
  return {storageKey, title, lessons, normalize, status, complete, recommended, grade, createController, resolveRoute, hashForScreen};
});
