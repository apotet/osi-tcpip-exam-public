(() => {
  'use strict';

  function addStyle(id, css) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.append(style);
  }

  function polishCliHomeLink() {
    if (document.body?.dataset?.analyticsSection !== 'cli' && !location.pathname.includes('/cli/')) return;
    addStyle('cli-home-link-polish', `
      header .home-link {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        min-width: max-content;
        padding: 10px 14px;
        line-height: 1.2;
      }
      @media (max-width: 430px) {
        header { gap: 10px; }
        header .brand { flex: 1 1 auto; min-width: 0; }
        header .home-link { font-size: 15px; padding: 10px 13px; }
      }
    `);
  }

  function polishIpv4Reference() {
    if (document.body?.dataset?.analyticsSection !== 'ipv4') return;

    const heading = [...document.querySelectorAll('h2')].find((el) => el.textContent.trim().startsWith('2. Таблица для памяти'));
    const card = heading?.closest('.card');
    const tableWrap = card?.querySelector('.table-wrap');
    const tbody = tableWrap?.querySelector('tbody');
    if (!card || !tableWrap || !tbody || card.querySelector('.cidr-memory')) return;

    const rows = [...tbody.querySelectorAll('tr')].map((row) => {
      const cells = [...row.children].map((cell) => cell.textContent.trim());
      const prefix = Number(cells[0]?.replace('/', ''));
      return { prefix, cidr: cells[0], mask: cells[1], step: cells[2], hosts: cells[4] };
    }).filter((row) => Number.isInteger(row.prefix));

    const groups = [
      { id: '1', label: '1-й', title: '1-й октет · справка', min: 1, max: 8 },
      { id: '2', label: '2-й', title: '2-й октет · справка', min: 9, max: 16 },
      { id: '3', label: '3-й', title: '3-й октет · учить', min: 17, max: 24 },
      { id: '4', label: '4-й', title: '4-й октет · учить', min: 25, max: 32 }
    ];

    heading.textContent = '2. Шпаргалка CIDR по октетам';

    const panel = document.createElement('div');
    panel.className = 'cidr-memory';
    panel.innerHTML = `
      <p class="cidr-memory-intro">Для запоминания начни с 4-го и 3-го октетов. 2-й и 1-й оставь как справку.</p>
      <div class="cidr-octet-tabs" role="tablist" aria-label="Октет маски">
        ${groups.map((group) => `<button type="button" class="cidr-octet-tab${group.id === '4' ? ' active' : ''}" data-octet="${group.id}" role="tab" aria-selected="${group.id === '4'}">${group.label}</button>`).join('')}
      </div>
      <div class="cidr-octet-title" aria-live="polite"></div>
      <div class="cidr-compact-table" role="table" aria-label="Шпаргалка CIDR">
        <div class="cidr-row cidr-head" role="row"><span>CIDR</span><span>Маска</span><span>Шаг</span><span>Хостов</span></div>
        <div class="cidr-rows"></div>
      </div>
    `;

    tableWrap.replaceWith(panel);

    const memory = card.querySelector('.memory');
    if (memory) memory.innerHTML = 'Шаг всегда считаем в <b>значимом октете</b>: 256 − значение маски. Пример: <b>/23 → шаг 2 в третьем октете; /22 → 4; /21 → 8.</b>';
    const special = card.querySelector('.special');
    if (special) special.innerHTML = '<strong>Особые случаи:</strong> /0 охватывает всё пространство IPv4. /31 применяют на point-to-point без обычной пары network/broadcast, /32 обозначает один адрес.';

    const title = panel.querySelector('.cidr-octet-title');
    const rowHost = panel.querySelector('.cidr-rows');
    const tabs = [...panel.querySelectorAll('.cidr-octet-tab')];

    function render(groupId) {
      const group = groups.find((item) => item.id === groupId) || groups[3];
      title.textContent = group.title;
      rowHost.innerHTML = rows
        .filter((row) => row.prefix >= group.min && row.prefix <= group.max)
        .map((row) => `<div class="cidr-row" role="row"><span>${row.cidr}</span><span>${row.mask}</span><span>${row.step.split('·')[0].trim()}</span><span>${row.hosts}</span></div>`)
        .join('');
      tabs.forEach((tab) => {
        const active = tab.dataset.octet === group.id;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
      });
    }

    tabs.forEach((tab) => tab.addEventListener('click', () => render(tab.dataset.octet)));
    render('4');

    addStyle('ipv4-cidr-memory-polish', `
      .cidr-memory-intro { margin: 0 0 12px; color: var(--muted); font-size: .86rem; line-height: 1.5; }
      .cidr-octet-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-bottom: 10px; }
      .cidr-octet-tab { min-height: 44px; padding: 8px 6px; border: 1px solid var(--line); border-radius: 11px; color: var(--text); background: #0a1725; font-weight: 850; cursor: pointer; }
      .cidr-octet-tab.active { color: #041416; border-color: transparent; background: linear-gradient(135deg,var(--cyan),var(--blue)); }
      .cidr-octet-title { min-height: 1.5em; margin: 2px 2px 8px; color: var(--cyan); font-size: .82rem; font-weight: 800; }
      .cidr-compact-table { overflow: hidden; border: 1px solid var(--line); border-radius: 13px; }
      .cidr-row { display: grid; grid-template-columns: .62fr 1.55fr .72fr .85fr; align-items: center; min-height: 42px; border-bottom: 1px solid var(--line); text-align: center; font-size: .78rem; }
      .cidr-row:last-child { border-bottom: 0; }
      .cidr-row > span { min-width: 0; padding: 8px 4px; overflow-wrap: anywhere; }
      .cidr-row > span:first-child { color: var(--amber); font-weight: 900; }
      .cidr-head { min-height: 38px; color: var(--cyan); background: #0a1725; font-size: .72rem; font-weight: 800; }
      .cidr-head > span:first-child { color: var(--cyan); }
      @media (max-width: 390px) {
        .cidr-row { grid-template-columns: .58fr 1.48fr .68fr .86fr; font-size: .73rem; }
        .cidr-row > span { padding-left: 3px; padding-right: 3px; }
      }
    `);
  }

  function removeIpv4AdvancedPlaceholder() {
    if (document.body?.dataset?.analyticsSection !== 'ipv4') return;
    document.querySelector('[data-level="advanced"]')?.remove();
  }

  function mergeIpv4VlsmIntoPractice() {
    if (document.body?.dataset?.analyticsSection !== 'ipv4') return;
    const vlsm = document.querySelector('.mode[data-mode="vlsm"]');
    const practiceGrid = document.querySelector('.mode-grid[data-level="practice"]');
    if (!vlsm || !practiceGrid) return;
    const oldGrid = vlsm.closest('.mode-grid');
    const oldHeading = oldGrid?.previousElementSibling;
    practiceGrid.append(vlsm);
    if (oldGrid && oldGrid !== practiceGrid) oldGrid.remove();
    if (oldHeading?.classList?.contains('level-title') && oldHeading.textContent.trim() === 'Ранее доступная практика') oldHeading.remove();
  }

  function run() {
    polishCliHomeLink();
    polishIpv4Reference();
    removeIpv4AdvancedPlaceholder();
    mergeIpv4VlsmIntoPractice();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
