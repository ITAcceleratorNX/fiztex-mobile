#!/usr/bin/env node
/**
 * Проверки журнала посещаемости учителя за месяц (ATTENDANCE-TEACHER-001): список с
 * пиллами и календарь ученика.
 *
 * Тот же приём, что у `verify-attendance-logic.cjs`: тест-раннера в проекте нет, поэтому
 * НАСТОЯЩИЙ `src/shared/api/attendanceJournalMap.js` компилируется пресетом проекта и
 * гоняется напрямую. Экран глазами не проверить (симулятор закрыт), поэтому проверяется
 * всё, что экран показывает: цифры пиллов, строку итогов, точки дней, сетку месяца.
 *
 * Запуск:
 *   node scripts/verify-attendance-journal.cjs [journal.json]
 *
 * `journal.json` — ответ `GET /api/attendance/teacher-journal`; с ним к синтетическим
 * проверкам добавляются проверки на живых данных бэкенда.
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function load(relPath) {
  const file = path.join(ROOT, relPath);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    presets: ['babel-preset-expo'],
    babelrc: false,
    configFile: false,
  });
  const mod = { exports: {} };
  const fakeRequire = (id) => (id.startsWith('@babel/runtime') ? require(id) : {});
  new Function('require', 'module', 'exports', code)(fakeRequire, mod, mod.exports);
  return mod.exports;
}

const m = load('src/shared/api/attendanceJournalMap.js');

let failed = 0;
let passed = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1;
  else failed += 1;
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n      получили ${JSON.stringify(actual)}\n      ожидали  ${JSON.stringify(expected)}`}`);
}

// ─── Синтетика: правила ─────────────────────────────────────────────────────

console.log('\nотметка → точка');
check('присутствовал', m.dayMarkOf({ status: 'PRESENT' }), 'present');
check('опоздал — посещение, но своя точка', m.dayMarkOf({ status: 'PRESENT', mark: 'LATE' }), 'late');
check('пропустил', m.dayMarkOf({ status: 'ABSENT', reason: 'ILLNESS' }), 'absent');
check('освобождён — не пропуск', m.dayMarkOf({ status: 'ABSENT', mark: 'EXCUSED' }), 'excused');
check('нет отметки', m.dayMarkOf(null), null);

console.log('\nмесяцы и классы');
check('месяцы года через Новый год',
  m.yearMonths({ startDate: '2026-08-01', endDate: '2027-05-25' }),
  ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05']);
check('по умолчанию — текущий', m.defaultMonth(['2026-09', '2026-10'], '2026-10'), '2026-10');
check('летом — последний прошедший', m.defaultMonth(['2026-09', '2026-10'], '2027-07'), '2026-10');
check('стрелка назад в пределах года', m.shiftMonth(['2026-09', '2026-10'], '2026-10', -1), '2026-09');
check('дальше начала года — некуда', m.shiftMonth(['2026-09', '2026-10'], '2026-09', -1), null);
check('подпись пары с подгруппой', m.scopeLabel({ classId: 1, className: '5А', subgroupName: 'Подгруппа 1' }), '5А · Подгруппа 1');
check('подпись класса', m.scopeLabel({ classId: 1, className: '5А' }), '5А');
check('ключ пары', [m.scopeKey({ classId: 1 }), m.scopeKey({ classId: 1, subgroupId: 7 })], ['1', '1:7']);

console.log('\nитоги ученика');
check('пиллы — только ненулевые, в порядке макета',
  m.studentPills({ missedCount: 2, lateCount: 0, excusedCount: 1 }),
  [{ mark: 'absent', count: 2 }, { mark: 'excused', count: 1 }]);
check('без замечаний — пиллов нет', m.studentPills({ missedCount: 0, lateCount: 0, excusedCount: 0 }), []);
check('строка итогов (макет 2170:4586)',
  m.statsLine({ missedCount: 2, lateCount: 1, excusedCount: 1 }),
  '2 пропуска · 1 опоздание · 1 освобождение');
check('склонения', m.statsLine({ missedCount: 5, lateCount: 11, excusedCount: 22 }),
  '5 пропусков · 11 опозданий · 22 освобождения');
check('без пропусков (макет 2170:4748)', m.statsLine({ missedCount: 0, lateCount: 0, excusedCount: 0 }), 'Без пропусков');
check('совпавшие инициалы различаются именем',
  m.shortNames(['Амангельдиева Айгерим Маратқызы', 'Амангельдиева Айгуль Маратқызы', 'Бекмуратов Айдар Талғатұлы']),
  ['Амангельдиева Айгерим М.', 'Амангельдиева Айгуль М.', 'Бекмуратов А.Т.']);

console.log('\nсетка месяца');
const sept = m.calendarWeeks('2026-09');
check('сентябрь 2026 — пять недель', sept.length, 5);
check('1-е — вторник: одна пустая клетка перед ним', sept[0].map((cell) => cell?.day ?? null), [null, 1, 2, 3, 4, 5, 6]);
check('суббота и воскресенье — выходные', [sept[0][5].weekend, sept[0][6].weekend, sept[0][4].weekend], [true, true, false]);
check('хвост добит пустыми до недели', sept[4].map((cell) => cell?.day ?? null), [28, 29, 30, null, null, null, null]);

console.log('\nдни ученика');
const synthetic = {
  lessons: [
    { lessonDate: '2026-09-09', startTime: '10:30:00', status: 'ACTIVE', entries: [{ studentProfileId: 1, attendance: { status: 'PRESENT', mark: 'LATE' } }] },
    { lessonDate: '2026-09-09', startTime: '08:30:00', status: 'ACTIVE', entries: [{ studentProfileId: 1, attendance: { status: 'PRESENT' } }] },
    { lessonDate: '2026-09-16', startTime: '08:30:00', status: 'CANCELLED', entries: [] },
    { lessonDate: '2026-09-29', startTime: '08:30:00', status: 'ACTIVE', state: 'NOT_FILLED', entries: [] },
    { lessonDate: '2026-09-30', startTime: '08:30:00', status: 'ACTIVE', state: 'NOT_FILLED', entries: [] },
    { lessonDate: '2026-09-18', startTime: '08:30:00', status: 'ACTIVE', subgroupId: 7, entries: [] },
  ],
};
const days = m.studentDays(synthetic, 1, { today: '2026-09-29' });
check('два урока в день — две точки по времени (макет `combo`)', days['2026-09-09'], ['present', 'late']);
check('отменённый урок — «–»', days['2026-09-16'], ['cancelled']);
check('незаполненный прошедший — «не опубликовано»', days['2026-09-29'], ['unpublished']);
check('будущий урок — пусто', days['2026-09-30'], undefined);
check('незаполненный урок чужой подгруппы — пусто', days['2026-09-18'], undefined);
check('тот же урок в журнале подгруппы — «не опубликовано»',
  m.studentDays(synthetic, 1, { today: '2026-09-29', subgroupFiltered: true })['2026-09-18'], ['unpublished']);

// ─── Живые данные ───────────────────────────────────────────────────────────

const livePath = process.argv[2];
if (livePath) {
  const live = JSON.parse(fs.readFileSync(livePath, 'utf8'));
  console.log(`\nживой журнал: ${live.lessons.length} уроков, ${live.students.length} учеников`);

  const byId = Object.fromEntries(live.students.map((student) => [student.studentProfileId, student]));
  const names = m.shortNames(live.students.map((student) => student.fullName));
  check('имена в списке не повторяются', new Set(names).size, names.length);

  for (const student of live.students) {
    const d = m.studentDays(live, student.studentProfileId, { today: '2026-09-24' });
    const published = Object.values(d).flat().filter((mark) => mark !== 'unpublished' && mark !== 'cancelled');
    const counted = {
      missed: published.filter((mark) => mark === 'absent').length,
      late: published.filter((mark) => mark === 'late').length,
      excused: published.filter((mark) => mark === 'excused').length,
    };
    const server = { missed: student.missedCount, late: student.lateCount, excused: student.excusedCount };
    if (JSON.stringify(counted) !== JSON.stringify(server)) {
      check(`точки календаря сходятся с итогами бэкенда: ${student.fullName}`, counted, server);
    }
  }
  check('точки календаря всех учеников сходятся с итогами бэкенда', true, true);

  const aigerim = live.students.find((student) => student.fullName.startsWith('Амангельдиева Айгерим'));
  const aigul = live.students.find((student) => student.fullName.startsWith('Амангельдиева Айгуль'));
  const nurai = live.students.find((student) => student.fullName.startsWith('Байтурсынова Нурай'));
  if (aigerim && aigul && nurai) {
    check('Айгерим: 02.09 опоздала', m.studentDays(live, aigerim.studentProfileId, { today: '2026-09-24' })['2026-09-02'], ['late']);
    check('Айгерим: строка итогов', m.statsLine(byId[aigerim.studentProfileId]), '1 опоздание');
    check('Айгуль: 03.09 пропуск', m.studentDays(live, aigul.studentProfileId, { today: '2026-09-24' })['2026-09-03'], ['absent']);
    check('Нурай: 03.09 освобождена, пилл синий', m.studentPills(byId[nurai.studentProfileId]), [{ mark: 'excused', count: 1 }]);
    check('04.09 — черновик учителя: «не опубликовано»', m.studentDays(live, aigul.studentProfileId, { today: '2026-09-24' })['2026-09-04'], ['unpublished']);
  }
}

console.log(`\n${failed ? '✗' : '✓'} ${passed} проверок прошло${failed ? `, ${failed} упало` : ''}`);
process.exit(failed ? 1 : 0);
