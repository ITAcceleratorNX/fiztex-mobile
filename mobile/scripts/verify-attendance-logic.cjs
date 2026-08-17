#!/usr/bin/env node
/**
 * Logic checks for the teacher attendance screen.
 *
 * Same approach as `verify-schedule-logic.cjs`: React Native has no test runner in
 * this project, so instead of duplicating the rules in a fixture we compile the REAL
 * source with the project's own babel preset (it emits CommonJS) and run its pure
 * exports. What runs here is the shipped code.
 *
 * Usage:
 *   node scripts/verify-attendance-logic.cjs [liveSheetJson]
 *
 * `liveSheetJson` is an optional `GET /api/lessons/{id}/attendance` response; when
 * given, the mapping checks run against real backend data instead of hand-written
 * markings.
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
    if (id === 'react') return { createElement, default: { createElement } };
    // Пресет проекта компилирует JSX в automatic runtime, а не в React.createElement,
    // поэтому подменять нужно именно его — иначе дерево не собирается вовсе.
    if (id === 'react/jsx-runtime' || id === 'react/jsx-dev-runtime') {
      return { jsx, jsxs: jsx, jsxDEV: jsx, Fragment: FRAGMENT };
    }
    if (id.startsWith('@babel/runtime')) return require(id);
    return noop;
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(fakeRequire, mod, mod.exports);
  return mod.exports;
}

/**
 * Минимальный `createElement`: строит обычное дерево из типа, пропсов и детей.
 *
 * Нужен, чтобы проверять вёрстку по стилям, которые компонент реально отдаёт, —
 * это единственная доступная здесь замена взгляду на экран (симулятор недоступен,
 * см. `.cursor/tasks/attendance/screens/AttendanceScreen.md`).
 */
const FRAGMENT = Symbol('Fragment');

function node(type, props, children) {
  const list = children == null ? [] : (Array.isArray(children) ? children : [children]);
  return {
    type,
    props: { ...(props || {}) },
    children: list.flat(Infinity).filter((child) => child != null && child !== false),
  };
}

function createElement(type, props, ...children) {
  return node(type, props, children);
}

/** Automatic runtime: дети приезжают в пропсах, а не отдельными аргументами. */
function jsx(type, props) {
  const { children, ...rest } = props || {};
  return node(type, rest, children);
}

/** Раскрывает функциональные компоненты, пока не останутся «хостовые» узлы. */
function renderTree(node, depth = 0) {
  if (node == null || typeof node !== 'object' || depth > 40) return node;
  const rendered = typeof node.type === 'function'
    ? renderTree(node.type({ ...node.props, children: node.children }), depth + 1)
    : node;
  if (rendered == null || typeof rendered !== 'object') return rendered;
  return {
    ...rendered,
    children: (rendered.children || []).map((child) => renderTree(child, depth + 1)),
  };
}

/** Все узлы дерева плоским списком — по ним удобно искать нужную ячейку. */
function flatten(node, out = []) {
  if (node == null || typeof node !== 'object') return out;
  out.push(node);
  for (const child of node.children || []) flatten(child, out);
  return out;
}

/** Стиль узла как один объект: в RN он может быть массивом и функцией от состояния. */
function styleOf(element) {
  if (!element || typeof element !== 'object') return {};
  const raw = typeof element.props?.style === 'function'
    ? element.props.style({ pressed: false })
    : element.props?.style;
  const parts = Array.isArray(raw) ? raw.flat(Infinity) : [raw];
  return Object.assign({}, ...parts.filter((part) => part && typeof part === 'object'));
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

const m = load('src/shared/api/attendanceMap.js');

// ── Комбинации status / mark / reason (attendance-read-contract §2) ───────────
section('Допустимые комбинации отметки');

const present = m.withStatus(null, 'PRESENT');
check('PRESENT без причины', present.status === 'PRESENT' && present.reason === null);

const late = m.withMarkToggled(present);
check('PRESENT + галочка = LATE', late.mark === 'LATE');
check('повторная галочка снимает отметку', m.withMarkToggled(late).mark === null);

const absentFromLate = m.withStatus(late, 'ABSENT');
check('LATE не переезжает на ABSENT', absentFromLate.mark === null,
  'иначе получилось бы «отсутствовал, опоздал»');
const excused = m.withMarkToggled(absentFromLate);
check('ABSENT + галочка = EXCUSED', excused.mark === 'EXCUSED');

const withReason = { ...excused, reason: 'ILLNESS' };
check('причина живёт при ABSENT', m.withStatus(withReason, 'ABSENT').reason === 'ILLNESS');
check('причина слетает при PRESENT', m.withStatus(withReason, 'PRESENT').reason === null,
  'CHECK в БД такую пару не пустит');
const cleared = m.withStatus(withReason, 'NOT_MARKED');
check('NOT_MARKED чистит и отметку, и причину', cleared.mark === null && cleared.reason === null);

const commented = m.withStatus({ ...withReason, comment: 'заранее' }, 'PRESENT');
check('комментарий переживает смену статуса', commented.comment === 'заранее');

check('галочки нет у NOT_MARKED', m.markToggleFor('NOT_MARKED') === null);
check('у PRESENT галочка «Опоздал»', m.markToggleFor('PRESENT').label === 'Опоздал');
check('у ABSENT галочка «Освобожден»', m.markToggleFor('ABSENT').label === 'Освобожден');

// ── Подписи ──────────────────────────────────────────────────────────────────
section('Подписи строки ученика');

check('пустая отметка → «Не отмечено»', m.statusChip(null).label === 'Не отмечено');
check('PRESENT → «Присутствовал», тон success',
  m.statusChip({ status: 'PRESENT' }).label === 'Присутствовал'
  && m.statusChip({ status: 'PRESENT' }).tone === 'success');
check('ABSENT → тон danger', m.statusChip({ status: 'ABSENT' }).tone === 'danger');

check('у «просто присутствовал» второй строки нет',
  m.markingSummary({ status: 'PRESENT' }) === '');
check('опоздание названо', m.markingSummary({ status: 'PRESENT', mark: 'LATE' }) === 'Опоздал');
check('освобождение с причиной',
  m.markingSummary({ status: 'ABSENT', mark: 'EXCUSED', reason: 'ILLNESS' })
    === 'Освобожден · Болезнь');
check('причина без освобождения',
  m.markingSummary({ status: 'ABSENT', reason: 'TRANSPORT' }) === 'Транспорт');
check('«не указана» не печатается',
  m.markingSummary({ status: 'ABSENT', reason: null }) === '');

// ── Подпись причины в чипе ───────────────────────────────────────────────────
// В строке ученика на причину остаётся треть ширины. Длинная подпись там либо
// обрезается, либо выталкивает кнопку комментария за край, поэтому короткая форма
// обязана быть действительно короткой — это и проверяется, а не «есть поле short».
section('Подпись причины в чипе');

const CHIP_LIMIT = 13;
const tooLong = m.REASON_OPTIONS
  .map((o) => m.reasonChipLabel(o.value))
  .filter((label) => label.length > CHIP_LIMIT);
check(`все причины умещаются в ${CHIP_LIMIT} символов`, tooLong.length === 0,
  tooLong.length ? tooLong.join(', ') : m.REASON_OPTIONS.map((o) => m.reasonChipLabel(o.value)).join(', '));
check('короткая форма есть у каждой причины',
  m.REASON_OPTIONS.every((o) => Boolean(o.short)));
check('длинная форма остаётся для списка выбора',
  m.REASON_OPTIONS.find((o) => o.value === 'FAMILY').label === 'Семейные обстоятельства');
check('в подписи отметки причина полная',
  m.markingSummary({ status: 'ABSENT', reason: 'FAMILY' }) === 'Семейные обстоятельства',
  'там на неё есть целая строка');

// ── Бейдж состояния листа ────────────────────────────────────────────────────
section('Бейдж состояния листа');

check('нет листа → «Не заполнено»', m.sheetBadge(null) === 'Не заполнено');
check('DRAFT → «Черновик»', m.sheetBadge({ state: 'DRAFT' }) === 'Черновик');
check('PUBLISHED → «Опубликовано»', m.sheetBadge({ state: 'PUBLISHED' }) === 'Опубликовано');
check('правки после публикации названы отдельно',
  m.sheetBadge({ state: 'PUBLISHED', hasUnpublishedChanges: true }) === 'Есть правки',
  'ученик пока видит прошлую версию');
check('ANNULLED → «Недоступна»', m.sheetBadge({ state: 'ANNULLED' }) === 'Недоступна');
check('отменённый урок без листа тоже «Недоступна»',
  m.sheetBadge({ state: 'NOT_FILLED' }, { cancelled: true }) === 'Недоступна');

// ── Что уходит на бэк ────────────────────────────────────────────────────────
section('Тело запроса и признак изменения');

const change = m.toEntryChange(7, { status: 'ABSENT', mark: 'EXCUSED', reason: 'ILLNESS', comment: '  ок  ' });
check('studentProfileId и статус обязательны',
  change.studentProfileId === 7 && change.status === 'ABSENT');
check('комментарий обрезается', change.comment === 'ок');
check('пустой комментарий уходит как null',
  m.toEntryChange(7, { status: 'PRESENT', comment: '   ' }).comment === null);
check('пустая отметка → NOT_MARKED', m.toEntryChange(7, null).status === 'NOT_MARKED');

check('одинаковые отметки не отправляются',
  m.sameMarking({ status: 'PRESENT' }, { status: 'PRESENT', mark: null, reason: null, comment: null }));
check('разный комментарий — это изменение',
  !m.sameMarking({ status: 'PRESENT' }, { status: 'PRESENT', comment: 'x' }));
check('разная отметка — это изменение',
  !m.sameMarking({ status: 'PRESENT' }, { status: 'PRESENT', mark: 'LATE' }));
check('пробелы в комментарии изменением не считаются',
  m.sameMarking({ status: 'PRESENT', comment: 'x ' }, { status: 'PRESENT', comment: ' x' }));

// ── История ──────────────────────────────────────────────────────────────────
section('Строка истории');

const stamp = () => '14 окт, 09:30';
check('событие уровня листа',
  m.historyLine({ action: 'ANNULLED', actorRole: 'ADMIN' }, stamp)
    === '14 окт, 09:30 · Админ · Урок отменён');
check('правка по ученику названа поимённо',
  m.historyLine({ action: 'DRAFT_SAVED', actorRole: 'MAIN_TEACHER', studentName: 'Иванов А.' }, stamp)
    === '14 окт, 09:30 · Учитель · Сохранён черновик · Иванов А.');
check('система без автора',
  m.historyLine({ action: 'ANNULLED', actorRole: 'SYSTEM' }, stamp).includes('Система'));

// ── Вёрстка строки ученика ───────────────────────────────────────────────────
// Причина с длинной подписью выталкивала кнопку комментария за край строки:
// `flexShrink` в RN по умолчанию 0, и пилюля занимала ширину своего текста целиком.
// Проверяется не «есть стиль», а три условия, из которых складывается устойчивая
// строка: пилюля сжимается, её ширина ограничена, кнопка комментария — нет.
section('Вёрстка строки ученика');

const theme = { c: new Proxy({}, { get: (_, key) => `#${String(key).slice(0, 6)}` }) };
const rowModule = load('src/features/attendance/AttendanceStudentRow.js', {
  // Хостовые узлы — строками: заглушка-функция вернула бы null, и дерево схлопнулось бы.
  'react-native': { View: 'View', Pressable: 'Pressable', Text: 'Text' },
  'theme/ThemeContext': { useTheme: () => theme },
  'components/Txt': { Txt: 'Txt' },
  'components/Icon': { __esModule: true, default: 'Icon' },
  'components/ui': { Checkbox: 'Checkbox', SelectPill: 'SelectPill' },
  'components/Screen': { shadowSm: {} },
  'api/attendanceMap': m,
});

function renderRow(marking, editable = true) {
  return renderTree(createElement(rowModule.AttendanceStudentRow, {
    row: { studentProfileId: 1, fullName: 'Александров Даниил Сергеевич', marking },
    editable,
    highlight: false,
    onPickStatus: () => {},
    onToggleMark: () => {},
    onPickReason: () => {},
    onEditComment: () => {},
  }));
}

const absentRow = flatten(renderRow({
  status: 'ABSENT', mark: 'EXCUSED', reason: 'FAMILY', comment: null,
}));
const pills = absentRow.filter((node) => node.type === 'SelectPill');
const reasonPill = pills.find((node) => node.props.tone === 'neutral');
const statusPill = pills.find((node) => node.props.tone !== 'neutral');

check('в строке отсутствия есть и статус, и причина', Boolean(reasonPill && statusPill));
check('причина показана короткой подписью',
  reasonPill?.props.label === 'Семейные', reasonPill?.props.label);
check('ширина причины ограничена', styleOf(reasonPill).maxWidth === 132,
  `maxWidth = ${styleOf(reasonPill).maxWidth}`);
check('статус не сжимается — уступает место ФИО, а не наоборот',
  styleOf(statusPill).flexShrink === 0);

// Кнопка комментария — последняя в строке и не должна уезжать за край.
const commentWrapper = absentRow.find((node) => styleOf(node).flexShrink === 0
  && Object.keys(styleOf(node)).length === 1);
check('кнопка комментария защищена от сжатия', Boolean(commentWrapper));

// Корень бага был не в экране, а в дизайн-системе: пилюля не умела сжиматься нигде.
const uiModule = load('src/shared/components/ui.js', {
  'react-native': { View: 'View', Pressable: 'Pressable', Text: 'Text' },
  'theme/ThemeContext': { useTheme: () => theme },
  './Txt': { Txt: 'Txt', Ink: 'Ink', wrapStrings: (children) => children },
  './Icon': { __esModule: true, default: 'Icon' },
});
const pillRoot = renderTree(createElement(uiModule.SelectPill, {
  label: 'Семейные обстоятельства',
  tone: 'neutral',
  onPress: () => {},
}));
const pillStyle = styleOf(pillRoot);
check('SelectPill сжимается сам по себе', pillStyle.flexShrink === 1);
check('SelectPill не упирается в ширину своего текста', pillStyle.minWidth === 0);
const pillLabel = flatten(pillRoot).find((element) => element.type === 'Txt');
check('подпись пилюли обрезается, а не переносится', pillLabel?.props.numberOfLines === 1);

const presentRow = flatten(renderRow({ status: 'PRESENT', mark: 'LATE', comment: null }));
check('у присутствия причины нет вовсе',
  presentRow.filter((node) => node.type === 'SelectPill' && node.props.tone === 'neutral').length === 0);

const viewRow = flatten(renderRow({ status: 'ABSENT', mark: 'EXCUSED', reason: 'FAMILY' }, false));
check('в просмотре причина не пилюлей, а полной подписью строки',
  viewRow.every((node) => node.type !== 'SelectPill' || node.props.tone !== 'neutral')
  && viewRow.some((node) => node.children?.[0] === 'Освобожден · Семейные обстоятельства'));

// ── Живой лист ───────────────────────────────────────────────────────────────
const livePath = process.argv[2];
if (livePath) {
  section(`Живой лист (${path.basename(livePath)})`);
  const sheet = JSON.parse(fs.readFileSync(livePath, 'utf8'));
  const entries = sheet.entries || [];

  check('состав пришёл', entries.length > 0, `${entries.length} учеников`);
  check('у каждого ученика есть id и имя',
    entries.every((e) => e.studentProfileId && e.fullName));
  check('каждая отметка раскладывается в чип',
    entries.every((e) => Boolean(m.statusChip(e.draft).label)),
    entries.map((e) => m.statusChip(e.draft).label).join(', '));
  check('бейдж считается по живому состоянию',
    Boolean(m.sheetBadge(sheet)), `${sheet.state} → ${m.sheetBadge(sheet)}`);
  check('признак восстановления доезжает до клиента',
    Object.prototype.hasOwnProperty.call(sheet, 'restoredAt'),
    sheet.restoredAt ? `restoredAt=${sheet.restoredAt}` : 'restoredAt=null');
  check('счётчик отмеченных совпадает с бэком',
    entries.filter((e) => e.draft && e.draft.status !== 'NOT_MARKED').length === sheet.markedCount,
    `${sheet.markedCount} из ${sheet.totalCount}`);
  check('изменённая отметка отличается от сохранённой',
    !m.sameMarking(entries[0].draft, m.withStatus(entries[0].draft, 'NOT_MARKED'))
    || entries[0].draft.status === 'NOT_MARKED');
  check('тело запроса собирается по живой строке',
    m.toEntryChange(entries[0].studentProfileId, entries[0].draft).studentProfileId
      === entries[0].studentProfileId);
} else {
  section('Живой лист');
  console.log('  — пропущено: путь к ответу /attendance не передан');
}

console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
