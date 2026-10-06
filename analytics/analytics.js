(() => {
  'use strict';
  if (window.SiteAnalytics) return; // One bootstrap per document, including duplicate script tags.
  const events = Object.freeze({
    ipv4_mode_start: 'ipv4_mode_start', ipv4_mode_complete: 'ipv4_mode_complete',
    exam_start: 'exam_start', exam_complete: 'exam_complete',
    training_open: 'training_open', ipv4_open: 'ipv4_open', ipv6_open: 'ipv6_open',
    cli_open: 'cli_open', cheatsheet_open: 'cheatsheet_open', feedback_submit: 'feedback_submit',
    troubleshooting_open: 'troubleshooting_open', pro_interest: 'pro_interest', b2b_interest: 'b2b_interest'
  });
  const active = new Set(['ipv4_mode_start', 'ipv4_mode_complete', 'exam_start', 'exam_complete', 'training_open', 'ipv4_open', 'ipv6_open', 'cli_open', 'cheatsheet_open']);
  const modes = new Set(['mixed', 'visual-l1', 'l1-l2', 'l3', 'l4', 'l5-l7', 'tcpip', 'troubleshooting']);
  const id = window.SITE_ANALYTICS_CONFIG?.counterId;
  const enabled = Number.isSafeInteger(id) && id > 0 && /^https?:$/.test(location.protocol);
  let available = enabled;

  // No raw answer, search, feedback, URL, user ID or stored statistics enters a goal.
  function parameters(name, input = {}) {
    if (name === 'ipv4_mode_start' || name === 'ipv4_mode_complete') {
      if (!['mask','cidr','step','network','broadcast','first','last','full','same','gateway','vlsm'].includes(input.mode) || input.total !== 10 ||
          !Number.isInteger(input.score) || input.score < 0 || input.score > 10 || input.percent !== input.score * 10 ||
          (name === 'ipv4_mode_start' && input.score !== 0)) return null;
      return { mode: input.mode, score: input.score, total: input.total, percent: input.percent };
    }
    if (name === 'exam_start') return modes.has(input.mode) ? { mode: input.mode } : null;
    if (name === 'exam_complete') {
      if (!modes.has(input.mode) || !Number.isInteger(input.total) || input.total !== 10 ||
          !Number.isInteger(input.score) || input.score < 0 || input.score > input.total ||
          input.percent !== Math.round(input.score / input.total * 100) ||
          input.passed !== (input.score >= 8)) return null;
      return { mode: input.mode, score: input.score, total: input.total, percent: input.percent, passed: input.passed };
    }
    if (name === 'cheatsheet_open') {
      if (!['learning', 'exam'].includes(input.section) || typeof input.topic !== 'string' ||
          !input.topic.trim() || input.topic.length > 100) return null;
      return { section: input.section, topic: input.topic };
    }
    return {};
  }
  function call(...args) {
    try {
      if (!available || typeof window.ym !== 'function') return false;
      window.ym(id, ...args);
      return true; // Queued / handed to SDK, not proof of network delivery.
    } catch { return false; }
  }
  function trackEvent(name, input) {
    try {
      if (!active.has(name)) return false; // Future events and absent feedback form stay inert.
      const safe = parameters(name, input);
      return safe !== null && call('reachGoal', name, safe);
    } catch { return false; }
  }
  window.SiteAnalytics = Object.freeze({ events, trackEvent, enabled });

  try {
    if (!document.querySelector('script[data-site-ui]')) {
      const ui = document.createElement('script');
      ui.defer = true;
      ui.src = new URL('../site-ui.js', document.currentScript?.src || location.href).href;
      ui.dataset.siteUi = 'true';
      document.head.append(ui);
    }
  } catch {}

  if (!enabled) return;

  try {
    if (typeof window.ym !== 'function') {
      // Standard Metrica queue, bounded if the SDK never loads. Nothing is persisted.
      const stub = function () { if (stub.a.length < 100) stub.a.push(arguments); };
      stub.a = []; stub.l = Date.now(); window.ym = stub;
    }
    call('init', {
      defer: true, webvisor: false, clickmap: false, trackLinks: false,
      accurateTrackBounce: false, trackHash: false, ecommerce: false,
      childIframe: false, sendTitle: false
    });
    if (!document.querySelector('script[data-site-metrica]')) {
      const script = document.createElement('script');
      script.async = true; script.src = 'https://mc.yandex.ru/metrika/tag.js';
      script.referrerPolicy = 'no-referrer'; script.dataset.siteMetrica = 'true';
      script.onerror = () => {
        available = false;
        if (Array.isArray(window.ym?.a)) window.ym.a.length = 0;
      };
      document.head.append(script);
    }
  } catch { available = false; }

  function pageOpened() {
    // BFCache does not rerun this bootstrap; a non-BFCache history load is excluded too.
    const historyLoad = performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
    if (!historyLoad) {
      call('hit', location.origin + location.pathname, { title: '', referer: '' });
      const section = document.body.dataset.analyticsSection;
      if (['ipv4', 'ipv6', 'cli'].includes(section)) trackEvent(section + '_open');
    }
    const notice = document.createElement('p');
    notice.id = 'analyticsNotice';
    notice.textContent = 'Для статистики посещений и действий используется Яндекс Метрика. Вебвизор отключён; тексты ответов и поиска в события не передаются.';
    notice.style.cssText = 'max-width:1100px;margin:20px auto;padding:0 16px;font-size:12px;line-height:1.5;opacity:.7';
    document.body.append(notice);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pageOpened, { once: true });
  else pageOpened();
})();
