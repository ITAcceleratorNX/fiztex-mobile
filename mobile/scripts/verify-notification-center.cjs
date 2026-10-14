#!/usr/bin/env node
/**
 * Проверка центра уведомлений (ТЗ «Внутренние уведомления — Student / Parent»): раскладка ленты по дням, подписи
 * времени, бейдж колокольчика, «прочитано» и переход по строке.
 *
 * Тот же приём, что у остальных `verify-*.cjs`: тест-раннера в проекте нет, поэтому настоящие исходники
 * компилируются проектным babel-пресетом и выполняются здесь — проверяется отгруженный код, а не копия.
 *
 * Запуск:
 *   node scripts/verify-notification-center.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const anything = () => new Proxy(function stub() { return null; }, { get: () => anything() });

function load(relPath, stubs = {}) {
  const file = path.join(ROOT, relPath);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    presets: ['babel-preset-expo'],
    babelrc: false,
    configFile: false,
  });
  const fakeRequire = (id) => {
    if (id.startsWith('@babel/runtime')) return require(id);
    if (Object.prototype.hasOwnProperty.call(stubs, id)) return stubs[id];
    return anything();
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', '__DEV__', code)(fakeRequire, mod, mod.exports, false);
  return mod.exports;
}

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const routes = load('src/shared/push/routes.js');
const map = load('src/shared/api/notificationCenterMap.js', { '@shared/push/routes': routes });

// Местное время: подписи строятся по часам телефона.
const NOW = new Date(2026, 9, 13, 14, 30);
const at = (day, hours, minutes) => new Date(2026, 9, day, hours, minutes).toISOString();

function row(id, createdAt, extra = {}) {
  return {
    id, kind: 'GRADE_POSTED', title: 'Новая оценка: 5', body: 'Физика', createdAt, read: false,
    route: 'subject', params: { subjectId: 3 }, childProfileId: null, childName: null, ...extra,
  };
}

section('Дни и время');
{
  check('сегодня — «Сегодня»', map.dayLabel(at(13, 8, 20), NOW) === 'Сегодня');
  check('вчера — «Вчера»', map.dayLabel(at(12, 16, 45), NOW) === 'Вчера');
  check('раньше — число и месяц', map.dayLabel(at(3, 9, 0), NOW) === '3 октября', map.dayLabel(at(3, 9, 0), NOW));
  check('прошлый год — с годом', map.dayLabel(new Date(2025, 11, 30, 9, 0), NOW) === '30 декабря 2025');

  check('время сегодняшней строки — часы', map.timeLabel(at(13, 8, 20), NOW) === '08:20');
  check('вчерашней — «Вчера, 16:45», как в макете', map.timeLabel(at(12, 16, 45), NOW) === 'Вчера, 16:45');
  check('более ранней — «3 окт, 09:00»', map.timeLabel(at(3, 9, 0), NOW) === '3 окт, 09:00', map.timeLabel(at(3, 9, 0), NOW));
  check('битая дата — пусто, а не «Invalid Date»', map.timeLabel('нет', NOW) === '');
}

section('Лента по дням');
{
  const items = [row('a', at(13, 11, 15)), row('b', at(13, 8, 20)), row('c', at(12, 16, 45)), row('d', at(3, 9, 0))];
  const sections = map.groupByDay(items, NOW);
  check('три дня — три секции', sections.length === 3, sections.map((s) => s.title).join(', '));
  check('порядок сервера сохраняется', same(sections[0].items.map((i) => i.id), ['a', 'b']));
  check('заголовки секций', same(sections.map((s) => s.title), ['Сегодня', 'Вчера', '3 октября']));
  check('пустая лента — пусто', map.groupByDay([], NOW).length === 0 && map.groupByDay(null, NOW).length === 0);
}

section('Бейдж и прочитанное');
{
  check('ноль непрочитанных — бейджа нет', map.badgeLabel(0) === null && map.badgeLabel(undefined) === null);
  check('число как есть', map.badgeLabel(5) === '5');
  check('больше 99 — «99+»', map.badgeLabel(140) === '99+');

  const items = [row('a', at(13, 11, 15)), row('b', at(13, 8, 20))];
  const one = map.markItemsRead(items, ['b']);
  check('«прочитано» — только у нажатой строки', one[0].read === false && one[1].read === true);

  const newer = row('n', at(13, 12, 0));
  const all = map.markAllReadUpTo([newer, ...items], at(13, 11, 15));
  check('«прочитать все» не трогает пришедшее позже показанного', all[0].read === false && all[1].read && all[2].read);
}

section('Иконка и метка');
{
  check('вид → иконка', map.iconFor('TEST_RESULT_READY').icon === 'award' && map.iconFor('ATTENDANCE_ABSENCE').icon === 'alertTriangle');
  check('незнакомый вид — колокольчик, а не пустое место', map.iconFor('SOMETHING_NEW').icon === 'bell');
  check('у родителя метка — имя ребёнка', map.contextTag(row('p', at(13, 9, 0), { childName: 'Айжан' })) === 'Айжан');
  check('у ученика метки нет', map.contextTag(row('s', at(13, 9, 0))) === null);
}

section('Переход — тем же словарём, что и пуш');
{
  const open = (role, item) => routes.resolvePushTarget(map.pushDataFor(item, 1201), { role, accountId: 1201, rootRoute: 'self' });

  const homework = open('STUDENT', row('h', at(13, 9, 0), {
    kind: 'HOMEWORK_DUE_SOON', route: 'homework-card', params: { homeworkId: 812 },
  }));
  check('ученик: напоминание о сроке → карточка задания',
    homework.screen === 'homework-card' && same(homework.payload, { homeworkId: 812 }), JSON.stringify(homework));

  const result = open('STUDENT', row('r', at(13, 9, 0), {
    kind: 'TEST_RESULT_READY', route: 'homework-test', params: { homeworkId: 813 },
  }));
  check('ученик: результат теста → карточка теста', result.screen === 'homework-card' && result.payload.homeworkId === 813);

  const grade = open('STUDENT', row('g', at(13, 9, 0)));
  check('ученик: оценка → вкладка «Оценки»', grade.tab === 'diary');

  const absence = open('PARENT', row('a', at(13, 9, 0), {
    kind: 'ATTENDANCE_ABSENCE', route: 'attendance', params: { lessonId: 77120 }, childProfileId: 604, childName: 'Айжан',
  }));
  check('родитель: пропуск → урок именно этого ребёнка',
    absence.childId === 604 && absence.screen === 'lesson' && same(absence.payload, { lessonInstanceId: 77120, childId: 604 }),
    JSON.stringify(absence));

  const feedback = open('PARENT', row('f', at(13, 9, 0), {
    kind: 'MONTHLY_FEEDBACK', route: 'feedback', params: {}, childProfileId: 605, childName: 'Тимур',
  }));
  check('родитель: отзывы → «Главная» с выбранным ребёнком', feedback.tab === 'home' && feedback.childId === 605);

  const unknown = open('STUDENT', row('u', at(13, 9, 0), { route: 'rocket-launch' }));
  check('незнакомый маршрут — «Главная», а не тупик', unknown.tab === 'home');
}

section('Лента учителя — «Незавершённые действия»');
{
  const card = {
    id: 'p', kind: 'TEACHER_PENDING_ACTIONS', title: 'Незавершённые действия: 3', read: false,
    params: {
      groups: [{ type: 'ATTENDANCE', count: 2 }, { type: 'CORRECTION_PENDING', count: 1 }],
      actions: [
        { type: 'ATTENDANCE', label: 'Посещаемость: Физика, 7А · 14.10', route: 'attendance', params: { lessonId: 77 } },
        { type: 'CORRECTION_PENDING', label: 'Исправление', route: 'lesson-grades', params: { lessonId: 78, correctionId: 3 } },
        { type: 'BROKEN' },
      ],
    },
  };
  const actions = map.pendingActionsOf(card, 5001);
  check('битые действия пропускаются', actions.length === 2);
  check('всего действий — по группам', map.pendingTotalOf(card) === 3);
  const session = { role: 'TEACHER', accountId: 5001, rootRoute: 'self' };
  const attendance = routes.resolvePushTarget(actions[0].data, session);
  check('действие «посещаемость» → лист посещаемости урока',
    attendance.screen === 'attendance' && attendance.payload.lessonInstanceId === 77);
  const correction = routes.resolvePushTarget(actions[1].data, session);
  check('исправление → карточка урока', correction.screen === 'lesson' && correction.payload.lessonInstanceId === 78);
  check('у видов учителя своя иконка', map.iconFor('TEACHER_LESSON_SOON').icon === 'clock');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
