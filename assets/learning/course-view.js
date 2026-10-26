(function (root) {
  'use strict';
  function mount(host, storage) {
    const api = root.LearningCourse;
    const controller = api.createController(storage);
    const doc = host.ownerDocument;
    const find = id => host.querySelector('#'+id);
    function el(tag, text, className) {
      const node = doc.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    }
    function render(focus = false) {
      const {state, review, persisted, complete} = controller.snapshot();
      const lesson = api.lessons.find(l => l.id === state.current);
      const index = api.lessons.indexOf(lesson);
      const list = find('courseSteps'); list.replaceChildren();
      api.lessons.forEach((item,i) => {
        const li = el('li');
        const button = el('button', `${i+1}. ${item.title} · ${api.status(state,item.id)}`, 'secondary-button');
        button.type = 'button'; button.dataset.lesson = item.id;
        if (item.id === state.current) button.setAttribute('aria-current','step');
        button.addEventListener('click', () => {controller.select(item.id);render(true);});
        li.append(button);list.append(li);
      });
      find('courseProgress').textContent = complete ? 'Маршрут пройден: все пять упражнений выполнены верно.' : `Закреплено ${api.lessons.filter(l => api.status(state,l.id) === 'Закреплено').length} из 5. Следующий рекомендуемый шаг: ${api.lessons.find(l=>l.id===api.recommended(state)).title}.`;
      find('courseSaveStatus').textContent = persisted ? 'Прогресс мини-курса хранится в этом браузере отдельно от результатов экзамена. Экспорт экзамена не включает мини-курс.' : 'Сохранение недоступно. Сейчас можно продолжить, но после перезагрузки этот прогресс может потеряться.';
      find('courseLessonTitle').textContent = `${index+1}. ${lesson.title}`;
      find('courseConditions').textContent = lesson.conditions;
      find('courseExplanation').textContent = lesson.explanation;
      const diagram = find('courseDiagram'); diagram.replaceChildren();
      lesson.diagram.forEach(text => diagram.append(el('li',text)));
      find('coursePrompt').textContent = lesson.question;
      const choices = find('courseAnswers'); choices.replaceChildren();
      lesson.answers.forEach((text,i) => {
        const label = el('label',undefined,'answer-option');
        const input = el('input');input.type='radio';input.name='courseAnswer';input.value=String(i);input.required=true;input.disabled=!!review;input.checked=review?.choice===i;
        const marker = el('span',String(i+1),'choice-marker'); marker.setAttribute('aria-hidden','true');
        label.append(input,marker,el('span',text,'answer-text'));
        if (review && i === lesson.correct) label.classList.add('correct');
        if (review && review.choice === i && !review.correct) label.classList.add('wrong');
        input.addEventListener('change',()=>{for(const row of choices.children)row.classList.toggle('selected',row.querySelector('input').checked);});
        choices.append(label);
      });
      const feedback = find('courseFeedback'); feedback.replaceChildren(); feedback.hidden = !review;
      if(review) {
        feedback.className = 'feedback '+(review.correct?'good':'bad');
        feedback.append(el('strong',review.correct?'Верно':'Пока неверно'),el('p',`Правильный ответ: ${review.correctAnswer}`),el('p',review.explanation));
      }
      find('courseCheck').disabled=!!review;
      find('courseRetry').hidden=!review;
      find('courseNext').hidden=!review?.correct || index===api.lessons.length-1;
      find('courseFinish').hidden=index!==api.lessons.length-1 || !review?.correct;
      find('courseFinish').textContent=complete?'Маршрут завершён. Можно повторить любой шаг вручную.':'Этот шаг закреплён. Для завершения маршрута выполни остальные упражнения: они доступны в списке выше.';
      const practice = find('courseIpv4Practice'); practice.hidden=!lesson.practice;
      if(lesson.practice) practice.href=lesson.practice;
      if(focus)find('courseLessonTitle').focus();
    }
    find('courseForm').addEventListener('submit', event=>{
      event.preventDefault();
      const selected=find('courseAnswers').querySelector('input:checked');
      if(!selected)return;
      if(controller.answer(Number(selected.value)))render();
    });
    find('courseNext').addEventListener('click',()=>{if(controller.next())render(true);});
    find('courseRetry').addEventListener('click',()=>{controller.retry();render(true);});
    render();
    return controller;
  }
  root.LearningCourseView = {mount};
})(typeof window === 'undefined' ? globalThis : window);
