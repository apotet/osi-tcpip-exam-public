# Stage 2 — Analytics / Яндекс Метрика

Ветка: `stage-2/analytics`, основана на опубликованном `a113101`.
Stage 1 закрыт. Stage 2 не merge и не опубликован.

## Реализация и конфигурация

Единственная конфигурация: [`analytics/config.js`](analytics/config.js),
`counterId: null`. Пользователь подтвердил отсутствие счётчика. До установки
настоящего числового ID интеграция отключена, SDK/события/notice не подключаются.
Инструкция настройки и цели: [STAGE_2_MANUAL_REVIEW.md](STAGE_2_MANUAL_REVIEW.md).

Пять HTML-точек входа подключают один общий `analytics/analytics.js`, после
конфигурации. Внутри него находится единственный `ym(id, 'init', …)` через
безопасный helper. Глобальный guard исключает повторный bootstrap в документе;
один asynchronous SDK script, никаких noscript tracking pixels.
На новой странице и reload новый init ожидаем; это не двойная инициализация
в пределах одного документа. Исходный код не зависит от наличия `ym`.

SDK-ошибка/блокировка не бросает исключение из trackEvent. Стандартная очередь
до загрузки ограничена 100 вызовами, без дискового хранения; при ошибке загрузки
она очищается и новые события не отправляются. Нет retries, debounce, очереди
localStorage или собственного user/attempt ID. Успешный вызов helper означает
передачу/постановку в очередь, а не доказательство получения Яндексом.

## События

| Event | Trigger | Parameters | Anti-duplicate logic |
|---|---|---|---|
| exam_start | Успешно создана попытка OSI-экзамена, показан первый вопрос | mode — существующий код режима | Начало недоступно при активном quizScreen; только успешный start/retry |
| exam_complete | Завершены 10 проверенных ответов и показан результат | mode, score, total, percent, passed | In-memory completed на попытку; проверка answers.length; guarded next; флаг сбрасывается в start |
| training_open | Переход в существующий экран обучения | — | Только inactive → active, повторный клик активного раздела не считается |
| ipv4_open | Загрузка страницы IPv4 | — | Один bootstrap после подготовки DOM; back_forward исключён; BFCache не повторяет bootstrap |
| ipv6_open | Загрузка страницы IPv6 | — | То же |
| cli_open | Загрузка интерактивного CLI или его полной страницы чтения | — | То же; событие на странице назначения, без дубля на исходной ссылке |
| cheatsheet_open | Открыт notes/cheat dialog либо учебная карточка в разборе | section=learning/exam, topic — существующий статический заголовок/тема | Dialog.open / скрытый→видимый panel; automatic lesson только при первой проверке ответа |
| feedback_submit | Зарезервирован; формы отправки обратной связи нет | — | Не входит в active allowlist |
| troubleshooting_open | Зарезервирован; отдельной будущей функции нет | — | Не входит в active allowlist; текущий режим экзамена troubleshooting не отправляет это событие |
| pro_interest | Зарезервирован | — | Не входит в active allowlist |
| b2b_interest | Зарезервирован | — | Не входит в active allowlist |

`passed` соответствует текущему порогу 8/10; percent=round(score/total*100).
Helper проверяет существующие modes, типы и согласованность score/percent/passed,
копирует только разрешённые поля. CLI vendor намеренно не собирается: достаточно
cli_open. Смена вендора/режима/поиск/каждый клик CLI не создают новые цели.
Реальное повторное открытие карточки учитывается вновь, закрытие — нет.
Reload раздела является новым открытием; history restoration им не является.
Reload незавершённого экзамена не возобновляет и не завершает попытку.

## Privacy

Не передаются тексты ответов, поиск, feedback, ID вопросов, stored statistics,
имя, email, userID и введённые адреса. Автоматические clickmap, ссылки, bounce,
Webvisor, hash tracking, ecommerce/iframe и title отключены. defer:true отменяет
автоматический pageview при init; ручной hit получает origin + pathname,
пустые title/referrer. SDK script имеет referrerPolicy=no-referrer.
Это ограничение наших аргументов, а не гарантия анонимности внешнего SDK.

Короткий текст об аналитике появляется внизу страницы только при валидном ID.
Он не перекрывает интерфейс и не является согласием. Cookie-banner не добавлен;
необходимость согласия/политики требует решения владельца до включения.
Обработка cookies, IP и технических данных реальной Метрикой не проверяется spy.
Юридические и сетевые вопросы вынесены в STAGE_2_MANUAL_REVIEW.md.

## Тестирование

Кандидат кода и тестов: `ee74aae83e1b1eeaa867c0a5f2393697223008dd`.
Один полный чистый прогон: **480 pass, 0 fail, 0 skip**; retries/flaky — 0.
Начало: 2026-10-04 17:41:07 UTC, продолжительность 55,4 минуты.

| Проверка | Pass | Fail | Skip |
|---|---:|---:|---:|
| Полная браузерная матрица | 480 | 0 | 0 |
| В том числе сохранённая матрица Stage 1 | 285 | 0 | 0 |
| В том числе отдельные проверки аналитики | 195 | 0 | 0 |
| Chromium, все 5 viewport | 160 | 0 | 0 |
| WebKit, все 5 viewport | 160 | 0 | 0 |
| Firefox, все 5 viewport | 160 | 0 | 0 |
| Helper / bounded queue, без браузера и сети | 11 | 0 | 0 |
| Структура банка, lessons/family, IPv4 | 1 | 0 | 0 |
| Независимый IPv6 oracle | 1 | 0 | 0 |
| Проверка неизменного контент-патча | 1 | 0 | 0 |
| Внутренние URL, включая 40 ресурсов | 95 | 0 | 0 |
| Favicon — 3 движка × 5 страниц | 15 | 0 | 0 |
| Измерение ресурсов — 5 страниц | 5 | 0 | 0 |
| Прежняя отдельная проверка shuffle / grading | 2 | 0 | 0 |

Строки «в том числе» и движки раскрывают 480, а не суммируются с ним.
Ресурсы измерены без порога размера: два новых скрипта вместе 4 978 decoded bytes,
первичная загрузка главной 374 919 decoded bytes; внешний SDK отключён.
Структурные проверки: 321 вопрос, точных дублей нет; IPv4 — 33 маски,
11 500 подсетей и 2 000 VLSM. IPv6 — Python ipaddress: 2 009 valid,
13 invalid, 5 prefix rejections. Банк сохранил SHA-256
`788d8ab9206076cc0028d6c376d7f7261608e53981ae700f76835702e1679cc6`.

Raw: `audit/runs/stage2-final-20261004/` — `candidate.json`, `browser.json`,
`full-test.log`, `test-results/`, `analytics-unit.json`, `static.json`, `ipv6.json`,
`content-checks.json`, `links.json`, `favicon.json`, `resources.json`, logs,
`shuffle/shuffle-results.json` и два отдельных shuffle traces.
Все **480 trace.zip** полной матрицы сохранены; hashes до/после совпадают.
Raw исключён из Git, сохранён в рабочем пространстве. Компактная сводка:
[audit/STAGE_2_TEST_RESULTS.json](audit/STAGE_2_TEST_RESULTS.json).

Предварительные прогоны в `audit/runs/stage2-preflight*` не входят в итоговые числа.
Исправлено нажатие новым тестом перекрытого input: тест использует реальный label.
Firefox в файловой песочнице не создавал страницу из-за `/proc/self/uid_map: EROFS`;
диагностика пустой страницы и итоговый прогон выполнены вне этой песочницы.
Матрица, лимит 180 секунд, штатные 3 workers и логика продукта для этого не менялись.
Перед финальным запуском отдельный preflight трёх движков дал 39 pass / 0 fail / 0 skip.

Существующие 285 browser tests сохранены: 3 движка × 5 viewport, исходные timeout
и 3 workers. Два существующих spec используют общий test fixture, чтобы **всегда**
подменять counter config отключённым даже при будущем настоящем ID. В отдельных
analytics tests — синтетический ID и spy, запрос SDK перехватывается локально.
Заблокированный SDK моделируется abort; ожидаемая сетевая ошибка браузера
отделена от исключений/console errors приложения, а не скрыта debounce/retry.

Дополнительные проверки: реальные UI-trigger, single/multiple grading, score,
дубли start/check/next/retry, незавершённая попытка, reload/history, обучение,
карточки, страницы разделов, init once, whitelist/privacy options, отсутствие ym,
throwing ym, blocked script, offline после загрузки, analytics-disabled и
недоступность локального модуля. Unit checks используют настоящий helper в vm,
проверяют invalid IDs и bounded queue. Реальные обращения в Яндекс не выполняются.

## Изменённые файлы

- analytics/config.js — единственный placeholder ID.
- analytics/analytics.js — централизованный init, безопасный trackEvent, whitelist,
  page-open triggers и короткий notice.
- index.html — script tags, существующие UI/state triggers и guards повторного вызова.
- ipv4.html, ipv6.html, cli/index.html, cli/read.html — только script tags и section marker.
- audit/test-fixture.cjs — изоляция счётчика/SDK для автоматической матрицы.
- audit/browser.spec.cjs, audit/acceptance.spec.cjs — только импорт изолированного fixture.
- audit/analytics.spec.cjs — отдельные проверки аналитики, без настоящего SDK.
- audit/analytics-unit.cjs — дополнительные проверки helper/queue без браузера/сети.
- audit/STAGE_2_TEST_RESULTS.json — сводка единственного финального прогона.
- STAGE_2_ANALYTICS_REPORT.md, STAGE_2_MANUAL_REVIEW.md — отчёт и manual checklist.

## Ограничения и ручная проверка

Нужны настоящий счётчик, настроенные цели, разрешённая публикация, проверка
получения событий/параметров в кабинете и Safari/Chrome на реальном iPhone.
Точный checklist с местом каждого события в Метрике — в manual review.
Блокировщики, offline и переполненная очередь приводят к неполным данным;
реальный SDK не проверяется автоматическими тестами. Загруженная страница
работает offline, но загрузка нового сайта без сети не обещается: PWA не добавлен.
События — OSI-экзамен; внутренние упражнения IPv4/IPv6/CLI не добавляют exam_start/
complete, чтобы не смешивать разные форматы итогов. Их открытие измеряется отдельно.

## Что сознательно не сделано

Банк, изображения и учебные тексты неизменны. Не менялись архитектура, CLI app,
существующие progress/localStorage, scoring, интерфейс и навигация. Guards
не допускают повторное начало/продвижение/завершение одной попытки и не меняют
нормальный пользовательский путь. Никаких новых функциональных модулей,
IPv4 2.0, Wireshark, Moxa, Troubleshooting Simulator, CLI 2.0, Pro/B2B,
регистрации, платежей или редизайна. Метрика не создана через чужой аккаунт,
ID не выдуман, production/main не изменены.
