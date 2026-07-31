#!/usr/bin/env node
/**
 * Logic checks for the mobile schedule feature.
 *
 * React Native has no test runner in this project, so instead of duplicating the
 * logic in a fixture we compile the REAL source files with the project's own
 * babel preset (which emits CommonJS) and execute their pure exports with the
 * UI dependencies stubbed. What runs here is the shipped code.
 *
 * Usage:
 *   node scripts/verify-schedule-logic.cjs [liveWeekJson]
 *
 * `liveWeekJson` is an optional /api/schedule/me/week response; when given, the
 * lesson-mapping and attendance checks run against real backend data.
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function load(relPath, extraStubs = {}) {
  const file = path.join(ROOT, relPath);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    presets: ['babel-preset-expo'],
    babelrc: false,
    configFile: false,
  });
  const noop = new Proxy({}, { get: () => () => null });
  const fakeRequire = (id) => {
    for (const [key, value] of Object.entries(extraStubs)) {
      if (id.includes(key)) return value;
    }
    if (id === 'react') return { createElement: () => null, default: { createElement: () => null } };
    return noop;
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(fakeRequire, mod, mod.exports);
  return mod.exports;
}

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ── modules under test ───────────────────────────────────────────────────────
const scheduleMap = load('src/shared/api/scheduleMap.js');
const states = load('src/features/schedule/ScheduleStates.js', {
  scheduleMap: { scheduleStatusMessage: (s) => `msg:${s}` },
});
const childSwitcher = load('src/features/schedule/ChildSwitcher.js');
const attendance = load('src/features/schedule/attendanceMock.js');
const useSchedule = load('src/shared/hooks/useSchedule.js', {
  scheduleMap,
  AuthContext: { useAuth: () => ({ token: null }) },
});

const { mapLessonToRow, abbreviateTeacherName, formatRoom, localDateKey } = scheduleMap;
const { resolveDayState, eventsForDate } = states;
const { childShortLabel, childFullLabel, childInitials, childColor } = childSwitcher;
const { mockAttendanceFor, ATTENDANCE_STATUSES } = attendance;
const { buildDayStrip, startOfWeek, lessonsForDate } = useSchedule;

// ── 1. dates ─────────────────────────────────────────────────────────────────
section('Даты (локальные, без UTC-сдвига)');
{
  // 01:00 local on the 1st is still the previous day in UTC for UTC+5.
  const earlyMorning = new Date(2026, 6, 1, 1, 0, 0);
  check('localDateKey берёт локальную дату', localDateKey(earlyMorning) === '2026-07-01',
    localDateKey(earlyMorning));
  check('localDateKey ≠ toISOString при сдвиге',
    localDateKey(earlyMorning) !== earlyMorning.toISOString().slice(0, 10) ||
      earlyMorning.getTimezoneOffset() === 0,
    `iso=${earlyMorning.toISOString().slice(0, 10)}`);

  check('startOfWeek → понедельник', startOfWeek('2026-07-31') === '2026-07-27', startOfWeek('2026-07-31'));
  check('startOfWeek от понедельника — он сам', startOfWeek('2026-07-27') === '2026-07-27');
  check('startOfWeek через границу месяца', startOfWeek('2026-08-02') === '2026-07-27', startOfWeek('2026-08-02'));

  const strip = buildDayStrip('2026-07-31', 2);
  check('полоса дней: 5 дней × (2*2+1) недель', strip.length === 5 * 5, `${strip.length}`);
  check('полоса содержит выбранный день', strip.some((d) => d.date === '2026-07-31'));
  check('выбранный день в центре полосы',
    strip[Math.floor(strip.length / 2)].date === '2026-07-29', strip[Math.floor(strip.length / 2)].date);
  check('в полосе только Пн–Пт', strip.every((d) => ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'].includes(d.label)));
  check('даты в полосе строго возрастают',
    strip.every((d, i) => i === 0 || d.date > strip[i - 1].date));
  check('полоса достаёт прошлые и будущие недели',
    strip[0].date < '2026-07-27' && strip[strip.length - 1].date > '2026-07-31',
    `${strip[0].date} … ${strip[strip.length - 1].date}`);
  check('нет дублей дат', new Set(strip.map((d) => d.date)).size === strip.length);
}

// ── 2. lesson status is date-aware ───────────────────────────────────────────
section('Статус урока учитывает дату');
{
  const now = new Date(2026, 6, 31, 12, 0, 0); // Fri 31.07, 12:00 local
  const at = (date, start, end) => mapLessonToRow(
    { lessonId: 1, date, startTime: start, endTime: end, subjectName: 'X' }, now).status;

  check('прошлый день → done', at('2026-07-30', '14:00:00', '14:45:00') === 'done');
  check('будущий день → upcoming', at('2026-08-03', '08:00:00', '08:45:00') === 'upcoming');
  check('будущий день НЕ done, даже если время прошло',
    at('2026-08-03', '09:00:00', '09:45:00') === 'upcoming');
  check('сегодня, время прошло → done', at('2026-07-31', '09:00:00', '09:45:00') === 'done');
  check('сегодня, идёт сейчас → now', at('2026-07-31', '11:50:00', '12:35:00') === 'now');
  check('сегодня, ещё не начался → upcoming', at('2026-07-31', '14:00:00', '14:45:00') === 'upcoming');
}

// ── 3. display formatting ────────────────────────────────────────────────────
section('Формат текста карточки');
{
  check('ФИО → Фамилия И.О.', abbreviateTeacherName('Ахметова Гульнара Сериковна') === 'Ахметова Г.С.',
    abbreviateTeacherName('Ахметова Гульнара Сериковна'));
  check('ФИО без отчества', abbreviateTeacherName('Иванова Мария') === 'Иванова М.');
  check('пустое ФИО не падает', abbreviateTeacherName('') === '');
  check('номер кабинета → «каб. N»', formatRoom('201') === 'каб. 201');
  check('именованное место без префикса', formatRoom('Спортзал') === 'Спортзал');
  check('пустой кабинет → пусто', formatRoom('') === '' && formatRoom('—') === '');
}

// ── 4. day state machine ─────────────────────────────────────────────────────
section('Состояния экрана');
{
  const view = {
    status: 'ok',
    events: [
      { id: 1, title: 'Линейка', effect: 'INFO', dateFrom: '2026-07-27', dateTo: '2026-07-27' },
      { id: 2, title: 'Каникулы', effect: 'NO_LESSONS', dateFrom: '2026-07-30', dateTo: '2026-07-30' },
    ],
  };
  const L = [{ lessonId: 1 }];
  const kind = (o) => resolveDayState(o).kind;

  check('ошибка важнее загрузки',
    kind({ loading: true, error: 'x', view, lessons: [], dateStr: '2026-07-27' }) === 'error');
  check('загрузка', kind({ loading: true, error: null, view, lessons: [], dateStr: '2026-07-27' }) === 'loading');
  check('уроки + INFO-событие',
    resolveDayState({ loading: false, error: null, view, lessons: L, dateStr: '2026-07-27' }).infoEvents.length === 1);
  check('обычный день', kind({ loading: false, error: null, view, lessons: L, dateStr: '2026-07-28' }) === 'lessons');
  check('каникулы важнее уроков',
    kind({ loading: false, error: null, view, lessons: L, dateStr: '2026-07-30' }) === 'holiday');
  check('заголовок каникул из события',
    resolveDayState({ loading: false, error: null, view, lessons: [], dateStr: '2026-07-30' }).title === 'Каникулы');
  check('не опубликовано',
    kind({ loading: false, error: null, view: { status: 'schedule_not_published', events: [] }, lessons: [], dateStr: '2026-07-28' }) === 'unpublished');
  check('уроков нет',
    kind({ loading: false, error: null, view: { status: 'no_lessons', events: [] }, lessons: [], dateStr: '2026-07-28' }) === 'empty');
  check('нет класса → пустое состояние с текстом',
    resolveDayState({ loading: false, error: null, view: { status: 'no_active_class', events: [] }, lessons: [], dateStr: '2026-07-28' }).message === 'msg:no_active_class');

  check('событие попадает в свой день', eventsForDate(view, '2026-07-27').length === 1);
  check('событие не течёт на другие дни', eventsForDate(view, '2026-07-29').length === 0);
  check('многодневное событие покрывает диапазон',
    eventsForDate({ events: [{ id: 3, effect: 'NO_LESSONS', dateFrom: '2026-07-27', dateTo: '2026-07-31' }] }, '2026-07-29').length === 1);
  check('событие без даты игнорируется',
    eventsForDate({ events: [{ id: 4, effect: 'INFO' }] }, '2026-07-27').length === 0);
}

// ── 5. parent child switcher ─────────────────────────────────────────────────
section('Селектор ребёнка');
{
  const kid = { fullName: 'Иванов Арсен Маратович', firstName: 'Арсен', lastName: 'Иванов', className: '7 «А»' };
  check('пилюля: Имя + инициал фамилии', childShortLabel(kid) === 'Арсен И.', childShortLabel(kid));
  check('строка: Имя Фамилия', childFullLabel(kid) === 'Арсен Иванов', childFullLabel(kid));
  check('инициалы', childInitials(kid) === 'АИ');
  check('разбор fullName без firstName/lastName',
    childShortLabel({ fullName: 'Иванов Арсен Маратович' }) === 'Арсен И.');
  check('односложное имя не дублируется',
    childFullLabel({ fullName: 'Ким' }) === 'Ким' && childInitials({ fullName: 'Ким' }) === 'К');
  check('пустое имя не падает', childShortLabel({}) === 'Ребёнок' && childInitials({}) === '?');
  check('палитра циклится по 5 цветам',
    childColor(0) === childColor(5) && childColor(0) !== childColor(1),
    `${childColor(0)} / ${childColor(1)}`);
}

// ── 6. attendance placeholder ────────────────────────────────────────────────
section('Посещаемость (заглушка)');
{
  const done = { lessonId: 7, status: 'done' };
  check('детерминирован', mockAttendanceFor(done) === mockAttendanceFor(done));
  check('нет значка у «Сейчас»', mockAttendanceFor({ lessonId: 7, status: 'now' }) === null);
  check('нет значка у будущего', mockAttendanceFor({ lessonId: 7, status: 'upcoming' }) === null);
  const all = new Set();
  for (let i = 0; i < 100; i += 1) all.add(mockAttendanceFor({ lessonId: i, status: 'done' }));
  check('встречаются все статусы', ATTENDANCE_STATUSES.every((s) => all.has(s)), [...all].join(','));
  check('встречаются уроки без отметки', all.has(null));
}

// ── 7. against live backend data (optional) ──────────────────────────────────
const livePath = process.argv[2];
if (livePath && fs.existsSync(livePath)) {
  section('Живые данные бэкенда');
  const view = JSON.parse(fs.readFileSync(livePath, 'utf8'));
  const now = new Date(2026, 6, 31, 12, 0, 0);
  const rows = (view.lessons || []).map((l) => mapLessonToRow(l, now));
  check('уроки маппятся', rows.length > 0, `${rows.length} шт`);
  check('у всех есть время и предмет', rows.every((r) => r.time && r.subject));
  check('ФИО учителя сокращено', rows.every((r) => !r.teacherShort || r.teacherShort.includes('.')),
    rows[0] && rows[0].teacherShort);
  check('даты уроков попадают в полосу дней', (() => {
    const stripDates = new Set(buildDayStrip(view.weekStart || rows[0].date).map((d) => d.date));
    return rows.every((r) => stripDates.has(r.date));
  })());
  check('lessonsForDate фильтрует по дню', (() => {
    const day = rows[0].date;
    const mapped = { lessons: rows };
    return lessonsForDate(mapped, day).every((l) => l.date === day);
  })());
  check('значок посещаемости только у завершённых',
    rows.every((r) => r.status === 'done' || mockAttendanceFor(r) === null));
}

console.log(`\n=== ИТОГ: ${passed} ok, ${failed} fail ===`);
if (failed) {
  console.log('Провалено: ' + failures.join('; '));
  process.exit(1);
}
