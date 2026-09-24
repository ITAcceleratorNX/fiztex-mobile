#!/usr/bin/env node
/**
 * Проверки календаря посещаемости ученика и родителя (ATTENDANCE-LEARNER-001): маркер
 * дня, месяцы учебного года и подпись плитки на главной.
 *
 * Тот же приём, что у `verify-attendance-journal.cjs`: тест-раннера в проекте нет, поэтому
 * НАСТОЯЩИЙ `src/shared/api/learnerAttendanceMap.js` компилируется пресетом проекта и
 * гоняется напрямую — вместе с `attendanceJournalMap.js`, из которого он берёт общее.
 *
 * Запуск:
 *   node scripts/verify-learner-attendance.cjs [summary.json …]
 *
 * `summary.json` — ответ `GET /api/attendance/summary`; с ним к синтетике добавляется сверка
 * с бэком: маркеры дней в сумме дают ровно те счётчики, что посчитал сервер.
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const cache = new Map();

function load(file) {
  if (cache.has(file)) return cache.get(file);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    presets: ['babel-preset-expo'],
    babelrc: false,
    configFile: false,
  });
  const mod = { exports: {} };
  cache.set(file, mod.exports);
  const localRequire = (id) => {
    if (id.startsWith('@babel/runtime')) return require(id);
    if (id.startsWith('./')) return load(path.join(path.dirname(file), `${id}.js`));
    return {};
  };
  new Function('require', 'module', 'exports', code)(localRequire, mod, mod.exports);
  cache.set(file, mod.exports);
  return mod.exports;
}

const m = load(path.join(ROOT, 'src/shared/api/learnerAttendanceMap.js'));
const journal = load(path.join(ROOT, 'src/shared/api/attendanceJournalMap.js'));

let failed = 0;
let passed = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n      получили ${JSON.stringify(actual)}\n      ожидали  ${JSON.stringify(expected)}`}`);
}

// ─── Синтетика ──────────────────────────────────────────────────────────────

const NOW = new Date(2026, 8, 24, 10, 0, 0); // 24.09.2026 10:00 по местным часам

let seq = 0;
function lesson(date, start, { status = 'ACTIVE', published = true, attendance = null } = {}) {
  seq += 1;
  return { lessonId: seq, lessonDate: date, startTime: start, lessonStatus: status, published, attendance };
}
const present = { status: 'PRESENT' };
const late = { status: 'PRESENT', mark: 'LATE' };
const absent = { status: 'ABSENT', reason: 'ILLNESS' };
const excused = { status: 'ABSENT', mark: 'EXCUSED' };

function day(lessons) {
  return m.learnerDays({ lessons }, NOW)[lessons[0].lessonDate] ?? null;
}
function kindOf(marker) {
  if (!marker) return null;
  if (marker.kind === 'combo') return { combo: marker.items.map((item) => `${item.mark}:${item.count}`) };
  return marker.kind === 'dot' ? marker.mark : marker.kind;
}

console.log('\nмаркер дня (макеты 2170:5100 и 2170:5266)');
check('все присутствовали — зелёная точка без числа',
  kindOf(day(['08:00', '09:00', '10:00'].map((t) => lesson('2026-09-01', t, { attendance: present })))), 'present');
check('1 пропуск из шести — «●1» (day-9)',
  kindOf(day([
    lesson('2026-09-09', '08:00', { attendance: absent }),
    ...['09:00', '10:00', '11:00', '12:00', '13:00'].map((t) => lesson('2026-09-09', t, { attendance: present })),
  ])), { combo: ['absent:1'] });
check('5 пропусков и один урок был — «●5» (day-17)',
  kindOf(day([
    ...['08:00', '09:00', '10:00', '11:00', '12:00'].map((t) => lesson('2026-09-17', t, { attendance: absent })),
    lesson('2026-09-17', '13:00', { attendance: present }),
  ])), { combo: ['absent:5'] });
check('весь день пропущен — красная точка без числа',
  kindOf(day(['08:00', '09:00'].map((t) => lesson('2026-09-10', t, { attendance: absent })))), 'absent');
check('освобождён на весь день — синяя точка (day-14)',
  kindOf(day(['08:00', '09:00'].map((t) => lesson('2026-09-14', t, { attendance: excused })))), 'excused');
check('ни один урок не опубликован — серая точка (day-29)',
  kindOf(day(['08:00', '09:00'].map((t) => lesson('2026-09-22', t, { published: false })))), 'unpublished');
check('все уроки отменены — «–» (day-16)',
  kindOf(day(['08:00', '09:00'].map((t) => lesson('2026-09-16', t, { status: 'CANCELLED', published: false })))),
  'cancelled');
check('отменённый урок среди прочих не считается',
  kindOf(day([
    lesson('2026-09-15', '08:00', { status: 'CANCELLED', published: false }),
    lesson('2026-09-15', '09:00', { attendance: present }),
  ])), 'present');
check('смешанный день — пары в порядке «пропуск → опоздание → освобождение → не опубл.»',
  kindOf(day([
    lesson('2026-09-11', '08:00', { published: false }),
    lesson('2026-09-11', '09:00', { attendance: excused }),
    lesson('2026-09-11', '10:00', { attendance: late }),
    lesson('2026-09-11', '11:00', { attendance: absent }),
    lesson('2026-09-11', '12:00', { attendance: present }),
  ])), { combo: ['absent:1', 'late:1', 'excused:1', 'unpublished:1'] });
check('присутствие с неопубликованными — «● N» серым',
  kindOf(day([
    lesson('2026-09-08', '08:00', { attendance: present }),
    lesson('2026-09-08', '09:00', { published: false }),
    lesson('2026-09-08', '10:00', { published: false }),
  ])), { combo: ['unpublished:2'] });
check('опубликовано, но ученика в листе нет — пусто',
  kindOf(day([lesson('2026-09-07', '08:00', { published: true, attendance: null })])), null);
check('«не отмечен» — не пропуск и не точка',
  kindOf(day([lesson('2026-09-07', '08:00', { attendance: { status: 'NOT_MARKED' } })])), null);

console.log('\nвремя');
const today = [
  lesson('2026-09-24', '08:30:00', { attendance: present }),
  lesson('2026-09-24', '09:59:59', { published: false }),
  lesson('2026-09-24', '11:30:00', { published: false }),
];
check('сегодня: начавшиеся уроки считаются, будущие — нет', kindOf(day(today)), { combo: ['unpublished:1'] });
check('будущий день пуст, даже без публикации',
  kindOf(day([lesson('2026-09-25', '08:00', { published: false })])), null);
check('отмена в будущем видна «–»',
  kindOf(day([lesson('2026-09-28', '08:00', { status: 'CANCELLED', published: false })])), 'cancelled');

console.log('\nподпись клетки');
check('смешанный день словами',
  m.dayA11yLabel(9, { kind: 'combo', counts: { absent: 1, present: 5 } }), '9: пропуск — 1, присутствие — 5');
check('отмена словами', m.dayA11yLabel(16, { kind: 'cancelled', counts: {} }), '16: уроки отменены');
check('пустой день — только число', m.dayA11yLabel(5, null), '5');

console.log('\nмесяцы');
const year = { startDate: '2026-08-01', endDate: '2027-05-25' };
check('с начала года до текущего месяца', m.learnerMonths(year, '2026-09'), ['2026-08', '2026-09']);
check('летом — весь год', m.learnerMonths(year, '2027-07').length, 10);
check('года нет — листать нечего', m.learnerMonths(null, '2026-09'), []);
check('летом открывается последний месяц года',
  journal.defaultMonth(m.learnerMonths(year, '2027-07'), '2027-07'), '2027-05');

console.log('\nплитка на главной (макет 2170:5075)');
check('пропуски и опоздание',
  m.summaryTileLine({ month: '2026-09', attendedCount: 20, missedCount: 2, lateCount: 1, excusedCount: 0 }),
  'Сентябрь: 2 пропуска, 1 опоздание');
check('всё посещено', m.summaryTileLine({ month: '2026-10', attendedCount: 5, missedCount: 0, lateCount: 0, excusedCount: 0 }),
  'Октябрь: без пропусков');
check('отметок ещё нет', m.summaryTileLine({ month: '2026-09', attendedCount: 0, missedCount: 0, lateCount: 0, excusedCount: 0 }),
  'Сентябрь: отметок пока нет');
check('только освобождение — не «без пропусков»',
  m.summaryTileLine({ month: '2026-09', attendedCount: 0, missedCount: 0, lateCount: 0, excusedCount: 1 }),
  'Сентябрь: 1 освобождение');
check('сводки нет — плитка берёт свою подпись', m.summaryTileLine(null), null);
check('строка итогов учителя не сломалась', journal.statsLine({ missedCount: 2, lateCount: 1, excusedCount: 1 }),
  '2 пропуска · 1 опоздание · 1 освобождение');

// ─── Живые ответы бэка ──────────────────────────────────────────────────────

for (const livePath of process.argv.slice(2)) {
  const live = JSON.parse(fs.readFileSync(livePath, 'utf8'));
  console.log(`\nживой месяц ${live.month}, ученик ${live.studentProfileId}: ${live.lessons.length} уроков`);
  const days = m.learnerDays(live, new Date());
  const sum = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const marker of Object.values(days)) {
    for (const key of Object.keys(sum)) sum[key] += marker.counts[key] || 0;
  }
  check('маркеры дней сходятся со счётчиками бэка',
    { attended: sum.present + sum.late, missed: sum.absent, late: sum.late, excused: sum.excused },
    { attended: live.attendedCount, missed: live.missedCount, late: live.lateCount, excused: live.excusedCount });
  const cancelledDays = Object.values(days).filter((marker) => marker.kind === 'cancelled').length;
  const fullyCancelled = Object.entries(live.lessons.reduce((acc, row) => {
    (acc[row.lessonDate] = acc[row.lessonDate] || []).push(row);
    return acc;
  }, {})).filter(([, rows]) => rows.every((row) => row.lessonStatus === 'CANCELLED')).length;
  check('«–» ровно у дней, где отменено всё', cancelledDays, fullyCancelled);
  console.log(`  маркеры: ${Object.entries(days).sort().map(([date, marker]) => `${date.slice(8)}=${JSON.stringify(kindOf(marker))}`).join(' ')}`);
  console.log(`  плитка: «${m.summaryTileLine(live)}»`);
}

console.log(`\n${failed ? '✗' : '✓'} ${passed} проверок прошло${failed ? `, ${failed} упало` : ''}`);
process.exit(failed ? 1 : 0);
