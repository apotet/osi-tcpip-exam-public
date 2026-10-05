# Stage 3 — IPv4 Trainer 2.0

Статус: **Stage 3 not deployed / deployment pending**. Все проверки зелёные;
main обновлён на релиз, но GitHub Pages build остаётся queued без runner.
Live Stage 3 и production smoke-test пока не подтверждены.

## Изменения

Сохранены CIDR ↔ mask, шаг сети, адрес сети, полный расчёт (network,
broadcast и диапазон usable hosts), ключ статистики `ipv4TrainerStats`, дизайн
и адаптивная сетка. Прежний VLSM/агрегация сохранён отдельным блоком без новых задач.

Добавлены отдельные режимы Broadcast, первый хост, последний хост,
«В одной ли подсети?» и «Напрямую или через шлюз?». Полный расчёт по-прежнему
спрашивает все четыре границы. Все новые задачи используют /8…/30;
/31 и /32 остаются только в справочной таблице.

Режимы сгруппированы: Базовый → Практика. Для Advanced предусмотрен отдельный
блок `data-level="advanced"`; новых advanced-заданий в Stage 3 нет.

В сравнениях генерируются обе ветви с вероятностью 50% каждая. Источник и
назначение — разные usable-адреса. Ответ вычисляется сравнением network-адресов;
в gateway-режиме обе сети вычисляются с маской источника. Это решение хоста о
доставке: предполагаются общий L2 для on-link адресов и настроенный шлюз для off-link,
а не гарантированная физическая доступность, ARP, firewall или наличие маршрута.

## Ввод и объяснения

Обычные текстовые IPv4-поля разрешают точки, numpad, вставку адресов, запятые
вместо точек и ведущие нули октетов; нет maxlength или посимвольной блокировки
при вводе ответа. CIDR можно вводить с `/` или без него. Для адресов inputmode=url
(доступная точка), для чисел numeric; размер шрифта 16px предотвращает iOS zoom.
Пустой ответ не расходует попытку. Неверный формат считается неправильным ответом,
показывает разбор и правильное значение; пользователь продолжает следующую задачу.

Enter проверяет, следующий отдельный Enter открывает следующую задачу;
удержание Enter не продвигает задания. Обработчик не перехватывает ссылки,
переключатели режимов и restart. Кнопки проверки/продолжения сохраняют mouse/tap
и Enter. После проверки ввод логически закрыт, но input остаётся на месте
и в фокусе; beforeinput предотвращает изменение проверенного ответа.
Первый мобильный рендер не вызывает программную клавиатуру. Короткие объяснения
состоят из 1–3 предложений; в полном расчёте показаны только ошибочные поля.

IPv4, IPv6 и интерактивный CLI используют общий `home-link.css`, одинаковый текст
«← На главную» и обычный переход к корневому index.html. Остальная навигация,
включая CLI read.html, сохранена.

## Метрика

Сохранён `ipv4_open` и прежние события. Добавлены `ipv4_mode_start` и
`ipv4_mode_complete`, параметры строго ограничены `mode`, `score`, `total`,
`percent`. Никаких адресов или введённого текста в событиях нет.
Start: явный выбор режима/restart либо первая непустая проверка исходного режима.
Complete: завершённый подход из 10 проверенных ответов; повторные check/next
не создают дубли. Незавершённая попытка не создаёт complete.

В кабинете Яндекс Метрики нужно создать две JavaScript-цели с точными именами
`ipv4_mode_start` и `ipv4_mode_complete`, если их ещё нет. Это не блокирует релиз.
Автоматические тесты заменяют config и SDK; реальные события в счётчик не отправляют.

## Файлы

- ipv4.html — режимы, ввод, короткие разборы, прогрессия и guards.
- ipv6.html, cli/index.html — унификация возврата.
- home-link.css — общий стиль ссылки.
- analytics/analytics.js — два события и проверка безопасных параметров.
- package.json — новые oracle/helper проверки включены в npm test.
- audit/ipv4-oracle.py — независимый oracle Python ipaddress.
- audit/ipv4-stage3-unit.cjs — arithmetic/generator/boundary проверки.
- audit/ipv4-stage3.spec.cjs — отдельные браузерные проверки Stage 3.
- audit/browser.spec.cjs — прежние шесть IPv4-режимов и ожидание ресурсов между переходами.
- audit/STAGE_3_TEST_RESULTS.json — сводка матрицы и hashes runtime-файлов.
- STAGE_3_IPV4_REPORT.md — отчёт.

## Проверки

Локальный проверенный кандидат: `86f5131218d6596024f3e32d892e6f7c2cfad619`.
Итоговая матрица: **630 pass / 0 fail / 0 skip**, 630 сценариев; прежние 480 сохранены,
150 дополнительных Stage 3. Chromium/WebKit/Firefox × 360/390/430/768/1440,
3 workers, timeout 180 секунд, retries не добавлены.

Предварительно: 24 новые проверки на 390px — pass во всех трёх движках;
3 отдельных мобильных прогона — pass, ширины 360/375/390/412/430.
Python ipaddress: 690 граничных сравнений и 276 сгенерированных задач,
включая каждую длину /8…/30 и обе ветви решений — pass.
Существующая статическая арифметика: 33 маски, 11500 подсетей, 2000 VLSM — pass.
IPv6 oracle: 2009 valid, 13 invalid, 5 prefix rejections — pass.
Analytics helper: 11 pass. Контент-проверки: 8000 выборок; SHA-256 банка неизменен.
Внутренние ссылки: 96 URL / 41 ресурс, failures=0.
Favicon: 15 проверок / 3 движка, errors=0. Ресурсы: 5 страниц, pass.
Локальный smoke: 7 файлов совпали, 30 IPv4 flows / 3 движка, errors=0, overflow=0.

Первый полный прогон: 615 сценариев, 612 pass / 3 fail / 0 skip, 58,6 минуты.
Два timeout в WebKit 768/1440 возникли потому, что прежний динамический тест
«все режимы» автоматически вырос с 60 до 110 задач. Ему возвращён прежний scope:
mask/cidr/step/network/full/vlsm, каждая по 10 задач; новые режимы проверяются
отдельно. Один Firefox 430 favicon request был отменён быстрой навигацией
(NS_BINDING_ABORTED). Между переходами добавлено ожидание networkidle; все
assertions requestfailed/console/page errors сохранены, ошибки не фильтруются.

Повторяется весь затронутый блок, а не только упавшие случаи: 75 проверок
навигации + 15 прежних IPv4 all-mode + 15 новых broadcast = 105.
Итог формируется из 525 неизменённых проверок первого прогона и 105 проверок
после этих изменений тестов. Это полная матрица всех сценариев и viewport,
но **не один чистый запуск 630 тестов**. Продуктовые файлы между прогонами
совпадают байт в байт с кандидатом 86f5131. Результат повторного блока: **105 pass / 0 fail / 0 skip**, 10,8 минуты.
Итог: Chromium 210, WebKit 210, Firefox 210; по 42 сценария на каждый viewport-проект.
Новых P0/P1 не найдено, horizontal overflow отсутствует.

Сырые результаты: audit/runs/stage3-final/ и audit/runs/stage3-corrected/
(JSON, trace.zip и screenshots); предварительные прогоны не входят в итоговые
630. Исходные 3 сбоя сохранены в raw и не скрыты из описания. Сводка
в audit/STAGE_3_TEST_RESULTS.json проверяет уникальность 630 сценариев,
42 на проект, 210 на движок, отсутствие skip/retry в итоговых записях.
В этой среде библиотеки WebKit распакованы в /workspace/browser-deps;
используется штатный WPE binary через локальный wrapper, сохраняющий LD_LIBRARY_PATH.
Host validation по ldconfig отключён только потому, что локальные библиотеки
не попадают в системный cache; фактическая загрузка и работа WebKit проверены.
Исходное покрытие, движки, лимиты, assertions и число workers не ослаблены.
Изменения scope и ожиданий навигации описаны выше; тестовый commit — d342de4.
Команда полного прогона в этой среде:

```sh
LD_LIBRARY_PATH=/workspace/browser-deps/root/usr/lib/x86_64-linux-gnu \
AUDIT_WEBKIT_EXECUTABLE=/workspace/browser-deps/webkit.sh \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
AUDIT_RUN_DIR=audit/runs/stage3-final AUDIT_FINAL=1 npm test
```

Для стандартной CI-среды с установленными browser dependencies достаточно
`npm ci`, `npx playwright install --with-deps`, `npm test`. Favicon/ресурсы
проверены с отключённым счётчиком через локальный test preload.

## Mobile UX и ограничения

Автоматически проверены overflow, высота tap targets ≥44px, inputmode, Enter/Next,
сохранение DOM input и фокуса при уменьшении высоты viewport до 400px.
Это моделирование экранной клавиатуры; физические iPhone/Android и их системные
клавиатуры в этой среде недоступны. Numpad проверяется через code/location
событий и вставку текста (NumLock on); реальные устройства не подключены.
Статистика остаётся общей, без новых сохранённых пользовательских данных.

## Production, backup и rollback

Исходный production commit: `dbe1eeb2bd29e8b0ab1bef300d6d6d9e48a2b2c7`.
GitHub Pages build: https://github.com/apotet/osi-tcpip-exam-public/actions/runs/37279951002
Опубликованный ipv4.html до изменений совпал с этим commit байт в байт.
Production URL: https://apotet.github.io/osi-tcpip-exam-public/

Backup commit: `dbe1eeb2bd29e8b0ab1bef300d6d6d9e48a2b2c7`.
Удалённая точка отката: `backup/stage3-production-20261005-dbe1eeb`.
Локальный annotated tag: `backup-stage3-20261005-dbe1eeb`.

Архивы: `/workspace/backups/stage3-production-20261005/`.
- production-dbe1eeb.tar.gz, SHA-256: `508372c7518f65199799e6314ed29d526dedd9732be6805bcc92a9d51779c9c2`.
- repository.bundle, SHA-256: `a4e4ac85a231b03db37e2cc4798a9a9c1e6fcbc27444663efa9833486cd17e99`.
- SHA256SUMS и restore-check/.

`git bundle verify` — pass; выполнен clone bundle, исходный commit доступен.
Проверочный commit-tree с деревом backup и текущим parent даёт нулевой diff
относительно backup: точный rollback без force-push возможен.
Shell Git push не получил учётных данных; удалённая ветка и публикация
выполняются через подключённый GitHub API, без передачи credential в shell.
Production release commit: `9d76aaa12819ee939e2a744360d62ccf080b95df`.
Main обновлён через GitHub API (force=false); серверное tree_sha
`8b939c653b9bee9ff18bc16101f7bc6b2f621a1d` совпало с локальным деревом релиза.
Ветка релиза: `release/stage3-ipv4-20261005`.
Pages run: https://github.com/apotet/osi-tcpip-exam-public/actions/runs/37359792801
Состояние: queued, runner для build пока не назначен; ожидание более 20 минут.
GitHub Actions/Pages status — operational; других in_progress сборок этого проекта нет.
Ошибка build, запрос ручного подтверждения или P0/P1 не обнаружены.
Блокер — внешняя очередь Pages; перезапуск не выполнен, так как job ещё не запускался.
После назначения runner GitHub может завершить публикацию автоматически.
Эта запись описывает состояние на момент проверки, а не гарантирует будущий статус.
Production smoke-test: ожидает успешного Pages deployment. Пока URL отдаёт
прежний IPv4; ранняя сверка выявила ожидаемое несовпадение с новым релизом.
Это проверка версии, а не подтверждённый сбой приложения. Публикация live
Stage 3 и итоговый smoke ещё не подтверждены.

Rollback: сохранить ветку backup/stage3-production-20261005-dbe1eeb и архив
исходного commit. При необходимости создать новый commit поверх текущего main
с деревом backup commit и опубликовать обычным fast-forward push; дождаться
успешного Pages build и сверить published файлы с backup. Это сохраняет историю
и допускает откат через GitHub Git Data API без force-push.

Для Git с настроенным write-доступом:

```sh
git fetch origin
stage3_parent=$(git rev-parse origin/main)
stage3_tree=$(git rev-parse 'origin/backup/stage3-production-20261005-dbe1eeb^{tree}')
stage3_rollback=$(printf '%s\n' 'Rollback IPv4 Stage 3 to stable Stage 2' | git commit-tree "$stage3_tree" -p "$stage3_parent")
git push origin "$stage3_rollback:refs/heads/main"
```

Через API: создать commit с tree_sha=`b4def4797aa5496e4f2f6e2d61bde025dabc0367`,
parent_sha=актуальный main; обновить main с force=false. После успешного Pages
build сверить опубликованный IPv4 и analytics/config.js с backup commit.

## Следующие stages

Не добавлены wildcard masks, новый VLSM/summarization, Wireshark, CLI 2.0,
Moxa, Troubleshooting Simulator, Pro/B2B, регистрация, backend и редизайн сайта.
Advanced только зарезервирован структурно. Проверка реальных мобильных клавиатур
и подтверждение получения новых целей в кабинете остаются ручными ограничениями.

Последняя проверка статуса: 2026-10-05 19:18:38 UTC; Pages queued, runner не назначен; live IPv4 совпадает с backup dbe1eeb, Stage 3 live не опубликован. Production smoke новых режимов заблокирован внешней очередью.
