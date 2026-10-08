(() => {
  'use strict';
  if (document.getElementById('feedbackDialog')) return;
  const types = { question_error: 'Ошибка в вопросе', site_error: 'Ошибка на сайте', topic_idea: 'Предложить тему', question_idea: 'Предложить вопрос', other: 'Другое' };
  const section = () => (document.querySelector('#learningScreen.active') ? 'learning' : document.body.dataset.analyticsSection || 'exam');
  const trigger = document.createElement('button');
  trigger.type = 'button'; trigger.className = 'feedback-trigger'; trigger.textContent = '💬 Предложить улучшение';
  const dialog = document.createElement('dialog'); dialog.id = 'feedbackDialog'; dialog.setAttribute('aria-labelledby', 'feedbackTitle');
  dialog.innerHTML = `<form class="feedback-form"><h2 id="feedbackTitle">Предложить улучшение</h2><p>Нашли ошибку, спорную формулировку или тему, которой не хватает? Напишите — это поможет улучшить тренажёр.</p><label for="feedbackType">Тип обращения</label><select id="feedbackType" required>${Object.entries(types).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select><label for="feedbackMessage">Что нужно исправить?</label><textarea id="feedbackMessage" rows="6" required maxlength="5000"></textarea><p class="feedback-muted">Можно написать коротко или приложить скриншот.</p><label for="feedbackImage">Скриншот (необязательно)</label><input type="file" id="feedbackImage" accept="image/jpeg,image/png,image/webp" hidden><button type="button" id="feedbackAttach">📎 Прикрепить изображение</button><div id="feedbackPreview" hidden><img alt="Выбранный скриншот"><button type="button" id="feedbackRemove">Удалить изображение</button></div><label for="feedbackContact">Контакт для ответа (необязательно, до 200 символов)</label><input id="feedbackContact" maxlength="200" autocomplete="off"><div hidden><label>Ваш сайт<input name="website" tabindex="-1" autocomplete="off"></label></div><p role="status" aria-live="polite" id="feedbackStatus"></p><div class="feedback-actions"><button type="button" id="feedbackClose">Закрыть</button><button type="submit" id="feedbackSend">Отправить</button></div></form>`;
  document.body.prepend(trigger); document.body.append(dialog);
  const form = dialog.querySelector('form'), type = dialog.querySelector('select'), message = dialog.querySelector('textarea');
  const contact = dialog.querySelector('#feedbackContact'), status = dialog.querySelector('#feedbackStatus'), send = dialog.querySelector('#feedbackSend');
  const imageInput = dialog.querySelector('#feedbackImage'), preview = dialog.querySelector('#feedbackPreview');
  const attach = dialog.querySelector('#feedbackAttach'), remove = dialog.querySelector('#feedbackRemove');
  let image = null, imageVersion = 0, previewUrl = null;
  const clearImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null; image = null; imageInput.value = ''; preview.hidden = true;
    preview.querySelector('img').removeAttribute('src'); imageVersion++;
  };
  attach.addEventListener('click', () => imageInput.click());
  remove.addEventListener('click', clearImage);
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    if (imageInput.files.length !== 1 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 8 * 1024 * 1024) {
      status.textContent = 'Выберите одно изображение JPEG, PNG или WebP размером до 8 МБ.';
      imageInput.value = ''; return;
    }
    clearImage(); image = file; previewUrl = URL.createObjectURL(file);
    preview.querySelector('img').src = previewUrl; preview.hidden = false; status.textContent = '';
  });
  let busy = false, requestId = null, snapshot = null, pageSection, pageUrl, questionId;
  trigger.addEventListener('click', () => {
    if (dialog.open) return;
    pageSection = section(); pageUrl = location.origin + location.pathname;
    questionId = document.querySelector('#quizScreen.active #questionText')?.dataset.questionId || null;
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
    const fields = { type: type.value, message: message.value.trim(), contact: contact.value.trim(), section: pageSection, url: pageUrl, website: form.elements.website.value, ...(questionId ? { questionId } : {}) };
    const next = JSON.stringify([fields, imageVersion]);
    if (next !== snapshot) { requestId = crypto.randomUUID(); snapshot = next; }
    busy = true; send.disabled = true; status.textContent = 'Отправляем…';
    // Keep the submitted draft stable while a request is in flight.
    [type, message, contact, imageInput, attach, remove].forEach(el => el.disabled = true);
    try {
      let body = JSON.stringify({ ...fields, requestId }), headers = { 'Content-Type': 'application/json' };
      if (image) {
        body = new FormData();
        for (const [key, value] of Object.entries({ ...fields, requestId })) body.set(key, value);
        body.set('image', image, 'screenshot'); headers = {};
      }
      const response = await fetch(window.SITE_FEEDBACK_CONFIG.endpoint, { method: 'POST', headers, body, signal: AbortSignal.timeout(20000), credentials: 'omit', referrerPolicy: 'no-referrer' });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('endpoint');
      window.SiteAnalytics?.trackEvent('feedback_submit', { type: fields.type });
      form.reset(); clearImage(); requestId = snapshot = null;
      status.textContent = 'Спасибо! Сообщение отправлено.';
    } catch {
      status.textContent = 'Не удалось отправить. Текст сохранён — попробуйте ещё раз.';
    } finally {
      busy = false; send.disabled = false;
      [type, message, contact, imageInput, attach, remove].forEach(el => el.disabled = false);
    }
  });
  message.addEventListener('input', () => message.setCustomValidity(''));
})();
