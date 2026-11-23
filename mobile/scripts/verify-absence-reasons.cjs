#!/usr/bin/env node
/**
 * Проверки причины отсутствия у родителя (ABSENCE-REASON-001, Figma `phyztex` Р2–Р9): раскладка
 * шторки дня по серверному состоянию, блок «Нужна причина», подписи дат и тексты ошибок отправки.
 *
 * Тест-раннера в проекте нет, поэтому НАСТОЯЩИЙ `src/shared/api/absenceMap.js` компилируется
 * пресетом проекта и гоняется напрямую — тот же приём, что у `verify-learner-attendance.cjs`.
 *
 *   node scripts/verify-absence-reasons.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACK = path.resolve(ROOT, '..', '..', 'fiztex-back');

function load(file) {
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    presets: ['babel-preset-expo'],
    babelrc: false,
    configFile: false,
  });
  const mod = { exports: {} };
  const localRequire = (id) => (id.startsWith('@babel/runtime') ? require(id) : {});
  new Function('require', 'module', 'exports', code)(localRequire, mod, mod.exports);
  return mod.exports;
}

const m = load(path.join(ROOT, 'src/shared/api/absenceMap.js'));

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}
function section(title) {
  console.log(`\n=== ${title} ===`);
}

section('Шторка дня: раскладка по состоянию сервера');
check('нет дня — шторки нет', m.daySheetState(null).kind === 'closed');
check('без запроса и ответа — «указать самостоятельно» (Р4)',
  m.daySheetState({ status: 'NOT_SPECIFIED', myResponses: [] }).kind === 'open');
check('запрос классного руководителя (Р3)',
  m.daySheetState({ status: 'AWAITING_PARENT', openRequest: { requestedAt: 'x' }, myResponses: [] }).kind === 'requested');
check('свой ответ на рассмотрении (Р7)',
  m.daySheetState({ status: 'AWAITING_CONFIRMATION', myResponses: [{ status: 'PENDING' }] }).kind === 'pending');
check('ответ второго родителя на рассмотрении — ожидание без своего ответа',
  m.daySheetState({ status: 'AWAITING_CONFIRMATION', myResponses: [] }).response === null);
check('отклонённый ответ — уточнение (Р8)',
  m.daySheetState({ status: 'CLARIFICATION_NEEDED', myResponses: [{ status: 'REJECTED' }] }).kind === 'clarify');
check('подтверждённая причина важнее ответов (Р9)',
  m.daySheetState({ status: 'CONFIRMED', reason: { reason: 'ILLNESS' }, myResponses: [{ status: 'CONFIRMED' }] }).kind
    === 'confirmed');
check('последний свой ответ — последний в списке',
  m.lastOwnResponse({ myResponses: [{ responseId: 1 }, { responseId: 2 }] }).responseId === 2);
check('после отклонения кнопка — «Отправить новую причину»',
  m.respondLabel({ kind: 'clarify' }) === 'Отправить новую причину'
  && m.respondLabel({ kind: 'open' }) === 'Указать причину');

section('Календарь и блок «Нужна причина» (Р2)');
const days = {
  items: [
    { date: '2026-11-20', absentLessonCount: 1, needsReason: true, requested: false },
    { date: '2026-11-17', absentLessonCount: 3, needsReason: true, requested: true },
    { date: '2026-11-12', absentLessonCount: 2, needsReason: false, requested: false },
  ],
};
check('подсвечены только дни, где ждут причину',
  [...m.needsReasonDates(days)].join(',') === '2026-11-20,2026-11-17');
check('нажатие открывает любой день отсутствия, и подтверждённый тоже',
  Boolean(m.absenceByDate(days)['2026-11-12']));
const card = m.pendingReasonCard(days);
check('запрос классного руководителя впереди самостоятельного дня', card.date === '2026-11-17', card.date);
check('в тексте — дата, число уроков и просьба',
  card.text.startsWith('17 ноября · 3 урока. Классный руководитель просит'), card.text);
check('остальные дни посчитаны', card.text.endsWith('ещё 1 день'), card.text);
check('нечего указывать — блока нет', m.pendingReasonCard({ items: [days.items[2]] }) === null);

section('Даты и подписи');
check('заголовок дня — без сдвига через UTC', m.dayTitle('2026-11-17') === 'Вторник, 17 ноября', m.dayTitle('2026-11-17'));
check('границы месяца', JSON.stringify(m.monthRange('2026-02')) === '{"from":"2026-02-01","to":"2026-02-28"}');
check('«Пропущено 3 урока»', m.missedTitle(3) === 'Пропущено 3 урока');
check('«1 урок», «5 уроков», «11 уроков»',
  m.lessonsCount(1) === '1 урок' && m.lessonsCount(5) === '5 уроков' && m.lessonsCount(11) === '11 уроков');
check('классный руководитель — фамилией и инициалами',
  m.teacherShortName('Сапарова Айгуль Каримовна') === 'Сапарова А.К.');

section('Ошибки отправки (Р6)');
check('сбой сети обещает, что форма цела',
  /сохранились/.test(m.respondErrorText({ status: 0 })));
check('второй ответ того же родителя — дождаться решения',
  /дождитесь/.test(m.respondErrorText({ status: 409, code: 'ABSENCE_REASON_RESPONSE_PENDING' })));

section('Справочник причин = бэк');
const enumFile = path.join(BACK, 'src/main/java/com/fiztex/attendance/domain/enums/AttendanceReason.java');
if (fs.existsSync(enumFile)) {
  const backend = [...fs.readFileSync(enumFile, 'utf8').matchAll(/^\s{4}([A-Z_]+),?$/gm)].map((match) => match[1]);
  const mobile = m.ABSENCE_REASONS.map((item) => item.value);
  check('те же причины и в том же порядке', backend.join(',') === mobile.join(','), `${backend} / ${mobile}`);
} else {
  console.log('  — пропущено: fiztex-back рядом не найден');
}

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
