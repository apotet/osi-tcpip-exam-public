(function () {
  'use strict';
  const {frames} = window.WIRESHARK_TRACE;
  const {tasks, grade} = window.WiresharkPractice;
  const list = document.getElementById('packets');
  const fields = document.getElementById('fields');
  const title = document.getElementById('fields-title');
  const form = document.getElementById('task-form');
  const choices = document.getElementById('choices');
  const result = document.getElementById('result');
  let current = 0;
  let answered = false;
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function selectFrame(number) {
    const frame = frames.find(f => Number(f['frame.number']) === number);
    for (const button of list.querySelectorAll('button')) button.setAttribute('aria-pressed', String(Number(button.dataset.frame) === number));
    title.textContent = 'Поля кадра ' + number;
    fields.replaceChildren();
    for (const prefix of ['frame.', 'eth.', 'arp.', 'ip.', 'icmp.', 'data.']) {
      const entries = Object.entries(frame).filter(([key, value]) => key.startsWith(prefix) && value !== '');
      if (!entries.length) continue;
      const group = el('section');
      group.append(el('h3', { 'frame.':'Кадр', 'eth.':'Ethernet', 'arp.':'ARP', 'ip.':'IPv4', 'icmp.':'ICMP', 'data.':'Данные' }[prefix]));
      const dl = el('dl');
      for (const [key, value] of entries) {
        const row = el('div', undefined, 'field-row');
        row.append(el('dt', key), el('dd', value));
        dl.append(row);
      }
      group.append(dl);
      fields.append(group);
    }
  }
  for (const frame of frames) {
    const number = Number(frame['frame.number']);
    const li = el('li');
    const button = el('button', undefined, 'packet');
    button.type = 'button';
    button.dataset.frame = number;
    const protocol = frame['arp.opcode'] ? 'ARP' : 'ICMP / IPv4';
    button.append(el('strong', `Кадр ${number} · ${protocol}`), el('span', `${Number(frame['frame.time_relative']).toFixed(3)} с · ${frame['frame.len']} байт`));
    button.append(el('span', 'Ethernet: ' + frame['eth.src'] + ' → ' + frame['eth.dst']));
    if (frame['ip.src']) button.append(el('span', 'IPv4: ' + frame['ip.src'] + ' → ' + frame['ip.dst']));
    button.append(el('span', frame['arp.opcode'] ? `ARP ${frame['arp.opcode'] === '1' ? 'Request' : 'Reply'} · ${frame['arp.src.proto_ipv4']} → ${frame['arp.dst.proto_ipv4']}` : `Echo ${frame['icmp.type'] === '8' ? 'Request' : 'Reply'} · id ${frame['icmp.ident']} · seq ${frame['icmp.seq']}`));
    button.addEventListener('click', () => selectFrame(number));
    li.append(button); list.append(li);
  }
  function showTask() {
    answered = false;
    const task = tasks[current];
    document.getElementById('task-count').textContent = `Задание ${current+1} из ${tasks.length}`;
    document.getElementById('prompt').textContent = task.prompt;
    result.textContent = '';
    choices.replaceChildren();
    task.answers.forEach((text, i) => {
      const label = el('label');
      const input = el('input');
      input.type = 'radio'; input.name = 'answer'; input.value = i; input.required = true;
      label.append(input, el('span', text)); choices.append(label);
    });
    document.getElementById('check').disabled = false;
    document.getElementById('next').hidden = true;
    selectFrame(task.frame);
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (answered) return;
    const input = form.querySelector('input[name="answer"]:checked');
    if (!input) return;
    const review = grade(tasks[current], Number(input.value));
    result.textContent = (review.correct ? 'Верно. ' : 'Пока неверно. ') + review.explanation;
    answered = true;
    for (const radio of choices.querySelectorAll('input')) radio.disabled = true;
    document.getElementById('check').disabled = true;
    const next = document.getElementById('next');
    next.hidden = false;
    next.textContent = current === tasks.length-1 ? 'Повторить пять заданий' : 'Следующее задание';
  });
  document.getElementById('next').addEventListener('click', () => {
    current = (current + 1) % tasks.length;
    showTask();
    document.getElementById('prompt').focus();
  });
  showTask();
})();
