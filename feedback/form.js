(() => {
  'use strict';
  if (document.getElementById('feedbackDialog')) return;
  const types = { question_error: 'Ошибка в вопросе', site_error: 'Ошибка на сайте', topic_idea: 'Предложить тему', question_idea: 'Предложить вопрос', other: 'Другое' };
  const section = () => (document.querySelector('#learningScreen.active') ? 'learning' : document.body.dataset.analyticsSection || 'exam');
  const trigger = document.createElement('button');
  trigger.type = 'button'; trigger.className = 'feedback-trigger'; trigger.textContent = '💬 Предложить улучшение';
  const dialog = document.createElement('dialog'); dialog.id = 'feedbackDialog'; dialog.setAttribute('aria-labelledby', 'feedbackTitle');
  dialog.innerHTML = `<form class="feedback-form"><h2 id="feedbackTitle">Предложить улучшение</h2><p>Нашли ошибку, спорную формулировку или тему, которой не хватает? Напишите — это поможет улучшить тренажёр.</p><label for="feedbackType">Тип обращения</label><select id="feedbackType" required>${Object.entries(types).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select><label for="feedbackMessage">Сообщение (до 5000 символов)</label><textarea id="feedbackMessage" rows="6" required maxlength="5000"></textarea><label for="feedbackContact">Контакт для ответа (необязательно, до 200 символов)</label><input id="feedbackContact" maxlength="200" autocomplete="off"><div hidden><label>Ваш сайт<input name="website" tabindex="-1" autocomplete="off"></label></div><p role="status" aria-live="polite" id="feedbackStatus"></p><div class="feedback-actions"><button type="button" id="feedbackClose">Закрыть</button><button type="submit" id="feedbackSend">Отправить</button></div></form>`;
  document.body.prepend(trigger); document.body.append(dialog);
  const form = dialog.querySelector('form'), type = dialog.querySelector('select'), message = dialog.querySelector('textarea');
  const contact = dialog.querySelector('#feedbackContact'), status = dialog.querySelector('#feedbackStatus'), send = dialog.querySelector('#feedbackSend');
  let busy = false, requestId = null, snapshot = null, pageSection, pageUrl;
  trigger.addEventListener('click', () => {
    if (dialog.open) return;
    pageSection = section(); pageUrl = location.origin + location.pathname;
    dialog.showModal(); type.focus();
    window.SiteAnalytics?.trackEvent('feedback_open', { type: type.value });
  });
  dialog.querySelector('#feedbackClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => trigger.focus());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    if (message.value.length > 5000) { status.textContent = 'Сообщение слишком длинное: максимум 5000 символов.'; return; }
    if (!message.value.trim()) { message.setCustomValidity('Напишите сообщение.'); message.reportValidity(); return; }
    const fields = { type: type.value, message: message.value.trim(), contact: contact.value.trim(), section: pageSection, url: pageUrl, website: form.elements.website.value };
    const next = JSON.stringify(fields);
    if (next !== snapshot) { requestId = crypto.randomUUID(); snapshot = next; }
    busy = true; send.disabled = true; status.textContent = 'Отправляем…';
    // Keep the submitted draft stable while a request is in flight.
    [type, message, contact].forEach(el => el.disabled = true);
    try {
      const response = await fetch(window.SITE_FEEDBACK_CONFIG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, requestId }), signal: AbortSignal.timeout(20000), credentials: 'omit', referrerPolicy: 'no-referrer' });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('endpoint');
      window.SiteAnalytics?.trackEvent('feedback_submit', { type: fields.type });
      form.reset(); requestId = snapshot = null;
      status.textContent = 'Спасибо! Сообщение отправлено.';
    } catch {
      status.textContent = 'Не удалось отправить. Текст сохранён — попробуйте ещё раз.';
    } finally {
      busy = false; send.disabled = false;
      [type, message, contact].forEach(el => el.disabled = false);
    }
  });
  message.addEventListener('input', () => message.setCustomValidity(''));
})();
