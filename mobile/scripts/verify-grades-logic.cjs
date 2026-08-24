#!/usr/bin/env node
/**
 * Logic checks for the grades screens — teacher and student alike.
 *
 * Same approach as `verify-attendance-logic.cjs`: React Native has no test runner in
 * this project, so instead of duplicating the rules in a fixture we compile the REAL
 * source with the project's own babel preset and run its pure exports and components.
 * What runs here is the shipped code.
 *
 * Usage:
 *   node scripts/verify-grades-logic.cjs [liveSheetJson]
 *
 * `liveSheetJson` is an optional `GET /api/lessons/{id}/grades/sheet` response; when
 * given, the row checks run against real backend data instead of hand-written rows.
 *
 * Оба раздела ходят через один `gradesMap`: у учителя и ученика одни и те же подписи,
 * один и тот же чип и одно и то же среднее — здесь это и проверяется.
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

function jsx(type, props) {
  const { children, ...rest } = props || {};
  return node(type, rest, children);
}

function renderTree(element, depth = 0) {
  if (element == null || typeof element !== 'object' || depth > 40) return element;
  const rendered = typeof element.type === 'function'
    ? renderTree(element.type({ ...element.props, children: element.children }), depth + 1)
    : element;
  if (rendered == null || typeof rendered !== 'object') return rendered;
  return {
    ...rendered,
    children: (rendered.children || []).map((child) => renderTree(child, depth + 1)),
  };
}

function flatten(element, out = []) {
  if (element == null || typeof element !== 'object') return out;
  out.push(element);
  for (const child of element.children || []) flatten(child, out);
  return out;
}

function styleOf(element) {
  if (!element || typeof element !== 'object') return {};
  const raw = typeof element.props?.style === 'function'
    ? element.props.style({ pressed: false })
    : element.props?.style;
  const parts = Array.isArray(raw) ? raw.flat(Infinity) : [raw];
  return Object.assign({}, ...parts.filter((part) => part && typeof part === 'object'));
}

function textOf(element) {
  return flatten(element)
    .filter((item) => typeof item === 'object' && item.type === 'Txt')
    .flatMap((item) => item.children)
    .filter((child) => typeof child === 'string' || typeof child === 'number')
    .map(String);
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

const m = load('src/shared/api/gradesMap.js');

// ── Полоса доступа (GRADES-002 §4–§6) ────────────────────────────────────────
section('Полоса о правах на запись');

check('основному учителю полосы нет',
  m.writeStateBanner({ writeState: 'ALLOWED', capacity: 'MAIN_TEACHER' }) === null);

const substituteNow = m.writeStateBanner({ writeState: 'ALLOWED', capacity: 'SUBSTITUTE_TEACHER' });
check('замещающему с доступом — предупреждение о сроке',
  substituteNow?.tone === 'warn' && /до конца этого урока/.test(substituteNow.text));

check('окно закрылось — «истекло»',
  /истекло/.test(m.writeStateBanner({ writeState: 'SUBSTITUTE_WINDOW_CLOSED' }).text));
check('урок не начался — про время урока',
  /во время урока/.test(m.writeStateBanner({ writeState: 'SUBSTITUTE_WINDOW_NOT_OPEN' }).text));
check('разрешения нет — про разрешение',
  /разрешение/.test(m.writeStateBanner({ writeState: 'SUBSTITUTE_NOT_PERMITTED' }).text));
check('замену сняли — про замену',
  /Замена/.test(m.writeStateBanner({ writeState: 'SUBSTITUTION_ENDED' }).text));
check('админу — «только просмотр»',
  /только для просмотра/.test(m.writeStateBanner({ writeState: 'NOT_TEACHING' }).text));
check('у отменённого урока полосы нет',
  m.writeStateBanner({ writeState: 'LESSON_CANCELLED' }) === null,
  'о нём говорит пустое состояние целиком');

// ── Бейдж и средний балл ─────────────────────────────────────────────────────
section('Подписи');

check('пустой лист → «Не заполнено»',
  m.sheetBadge({ students: [{ studentProfileId: 1, grades: [] }] }) === 'Не заполнено');
check('частично заполненный лист считает учеников, а не оценки',
  m.sheetBadge({
    students: [
      { studentProfileId: 1, grades: [{ id: 1 }, { id: 2 }] },
      { studentProfileId: 2, grades: [] },
    ],
  }) === 'Оценено 1 из 2');

check('среднее — один знак', m.formatAverage(4.33) === '4.3');
check('нет среднего → прочерк, а не ноль', m.formatAverage(null) === '—');
check('дата ленты по-русски', m.longDate('2026-09-12') === '12 сентября');

// ── Лента ученика (GRADEBOOK-001 §3, §4) ─────────────────────────────────────
section('Лента оценок ученика');

const journal = {
  columns: [
    { key: 'LESSON:1', type: 'LESSON', sourceId: 1, date: '2026-09-01', active: true },
    { key: 'LESSON:2', type: 'LESSON', sourceId: 2, date: '2026-09-03', active: true },
    { key: 'LESSON:3', type: 'LESSON', sourceId: 3, date: '2026-09-05', active: false },
    { key: 'HOMEWORK:9', type: 'HOMEWORK', sourceId: 9, date: '2026-09-05' },
  ],
  rows: [
    {
      studentProfileId: 11,
      studentName: 'Белов Артём',
      average: { value: 4.75, count: 4, visibleCount: 4 },
      cells: [
        { columnKey: 'LESSON:1', grades: [{ id: 1, scaleCode: '5' }] },
        { columnKey: 'LESSON:2', grades: [{ id: 2, scaleCode: '4+' }, { id: 3, scaleCode: '5' }] },
        { columnKey: 'HOMEWORK:9', grades: [{ id: 4, scaleCode: '4' }] },
      ],
    },
    { studentProfileId: 12, studentName: 'Козлова Анна', cells: [] },
  ],
};

const timeline = m.studentTimeline(journal, 11);
check('в ленте только дни с оценками', timeline.entries.length === 3,
  `колонок 4, записей ${timeline.entries.length}`);
check('свежее сверху', timeline.entries[0].columnKey === 'HOMEWORK:9');
check('оценки за один день не разъезжаются',
  timeline.entries.find((e) => e.columnKey === 'LESSON:2').grades.length === 2);
check('счётчик оценок считает все', timeline.gradeCount === 4);
check('у ДЗ нет перехода в урок',
  timeline.entries.find((e) => e.columnKey === 'HOMEWORK:9').lessonId === null,
  'оценку за задание ставят в модуле ДЗ');
check('у ученика без оценок лента пуста', m.studentTimeline(journal, 12).entries.length === 0);

// ── Итоги четверти (GRADEBOOK-002 §5, GRADES-FE-001 §9.3) ────────────────────
section('Итоги четверти');

const draftSet = {
  canManage: true,
  rows: [
    { studentProfileId: 1, finalGrade: { value: 4, status: 'DRAFT' } },
    { studentProfileId: 2, finalGrade: null },
  ],
};
const fullSet = {
  canManage: true,
  rows: [
    { studentProfileId: 1, finalGrade: { value: 4, status: 'DRAFT' } },
    { studentProfileId: 2, finalGrade: { value: 5, status: 'DRAFT' } },
  ],
};
const publishedSet = {
  canManage: true,
  rows: [
    { studentProfileId: 1, finalGrade: { value: 4, status: 'PUBLISHED' } },
    { studentProfileId: 2, finalGrade: { value: 5, status: 'PUBLISHED' } },
  ],
};

check('неполный набор не готов к публикации', m.finalsProgress(draftSet).allFilled === false);
check('счётчик показывает заполненных', m.finalsProgress(draftSet).filled === 1);
check('полный набор готов', m.finalsProgress(fullSet).allFilled === true);
check('черновики — ещё не публикация', m.finalsProgress(fullSet).published === false);
check('опубликованный набор виден как опубликованный',
  m.finalsProgress(publishedSet).published === true);
check('пустой класс не считается готовым', m.finalsProgress({ rows: [] }).allFilled === false);

check('список недостающих читается из details',
  m.incompleteStudentIds({ studentProfileIds: [7, 9] }).join(',') === '7,9');
check('мусор в details не роняет экран', m.incompleteStudentIds(null).length === 0);

// ── Строка листа урока ───────────────────────────────────────────────────────
section('Строка ученика в листе урока');

const theme = {
  c: {
    ink: '#1A1F36', ink2: '#475569', ink3: '#94A3B8', blue: '#274185',
    border: '#E2E8F0', borderStrong: '#CBD5E1', bg2: '#F1F5F9', surface: '#FFFFFF',
  },
};

const chips = load('src/shared/ui/grades.js', {
  'react-native': { View: 'View', Pressable: 'Pressable' },
  'theme/ThemeContext': { useTheme: () => theme },
  'components/Txt': { Txt: 'Txt' },
});

const rowModule = load('src/features/grades/LessonGradeRow.js', {
  'react-native': { View: 'View', Pressable: 'Pressable' },
  'theme/ThemeContext': { useTheme: () => theme },
  'components/Txt': { Txt: 'Txt' },
  'ui/grades': chips,
});

function renderRow(row, { canManage = true, maxGrades = 3 } = {}) {
  return renderTree(createElement(rowModule.LessonGradeRow, {
    row, canManage, maxGrades, onOpen: () => {},
  }));
}

const liveSheetPath = process.argv[2];
const liveSheet = liveSheetPath ? JSON.parse(fs.readFileSync(liveSheetPath, 'utf8')) : null;

const emptyRow = liveSheet?.students?.find((r) => (r.grades || []).length === 0)
  || { studentProfileId: 1, fullName: 'Антонова Дарья', grades: [] };
const oneGradeRow = liveSheet?.students?.find((r) => (r.grades || []).length === 1)
  || {
    studentProfileId: 2,
    fullName: 'Белов Артём',
    grades: [{ id: 5, scaleCode: '5', canEdit: true }],
  };

const pressables = (tree) => flatten(tree).filter((n) => n.type === 'Pressable');

check('пустая строка даёт три места под оценки',
  pressables(renderRow(emptyRow)).length === 3);
check('после первой оценки мест остаётся столько же',
  pressables(renderRow(oneGradeRow)).length === 3,
  'одна занята, две свободны');
check('четвёртого места не бывает',
  pressables(renderRow({
    ...emptyRow,
    grades: [
      { id: 1, scaleCode: '5', canEdit: true },
      { id: 2, scaleCode: '4', canEdit: true },
      { id: 3, scaleCode: '3', canEdit: true },
    ],
  })).length === 3,
  'лимит §5 приходит с бэка и соблюдается');

const readOnly = renderRow(oneGradeRow, { canManage: false });
check('в режиме чтения нажать нечего', pressables(readOnly).length === 0);
check('в режиме чтения ряд сохраняет геометрию',
  flatten(readOnly).filter((n) => n.type === 'View' && styleOf(n).width === 32).length === 3,
  'три клетки: одна с оценкой, две пустые рамки');
check('в режиме чтения «+» не рисуется',
  !textOf(readOnly).includes('+'));

const foreignGrade = renderRow({
  studentProfileId: 3,
  fullName: 'Волкова Мария',
  grades: [{ id: 7, scaleCode: '4+', canEdit: false }],
});
check('чужая оценка не нажимается',
  pressables(foreignGrade).length === 2,
  'нажимаются только два свободных места');
check('чужая оценка всё равно видна', textOf(foreignGrade).includes('4+'));

const filledChip = renderTree(createElement(chips.GradeChip, { value: '5' }));
check('выставленная оценка — залитая клетка',
  styleOf(flatten(filledChip).find((n) => n.type === 'View')).backgroundColor === theme.c.blue);
const emptyChip = renderTree(createElement(chips.GradeChip, { onPress: () => {} }));
check('свободное место — рамка с плюсом',
  styleOf(flatten(emptyChip).find((n) => n.type === 'View')).borderWidth === 1
  && textOf(emptyChip).includes('+'));

// ── Экраны ученика (GRADES-FE-001 §7) ────────────────────────────────────────
section('Оценки ученика');

check('без типа подпись всё равно есть', m.gradeTypeLabel(null) === 'Оценка за урок');
check('тип переводится', m.gradeTypeLabel('CONTROL_WORK') === 'Контрольная работа');
check('незнакомый тип не роняет экран', m.gradeTypeLabel('WAT') === 'Другое');

check('одна оценка названа', m.lessonGradesSummary(['5']) === 'Оценка 5');
check('несколько перечислены', m.lessonGradesSummary(['4+', '5']) === 'Оценки: 4+, 5');
check('пусто — «Оценок нет»', m.lessonGradesSummary([]) === 'Оценок нет');

const diary = m.diaryGradesByLesson([
  { lessonId: 10, grade: { scaleCode: '5' } },
  { lessonId: 10, grade: { scaleCode: '4+' } },
  { lessonId: 11, grade: { scaleCode: '3' } },
  // Оценка за самостоятельное ДЗ: урока у неё нет, класть её на расписание некуда.
  { lessonId: null, homeworkId: 42, grade: { scaleCode: '5' } },
]);
check('оценки одного урока не склеиваются', (diary[10] || []).length === 2);
check('оценки разных уроков не смешиваются', (diary[11] || []).join() === '3');
check('оценка без урока в расписание не попадает',
  Object.keys(diary).length === 2);

const myFinals = {
  subjects: [
    { subjectId: 3, subjectName: 'Русский язык', periodValues: { 7: 4, 8: 5 }, yearValue: null },
    { subjectId: 4, subjectName: 'Физика', periodValues: {}, yearValue: 5 },
  ],
};
check('итоги берутся по своему предмету',
  m.myFinalsForSubject(myFinals, 3).periodValues[7] === 4);
check('годовая читается отдельно', m.myFinalsForSubject(myFinals, 4).yearValue === 5);
check('предмета нет — пустые итоги, а не падение',
  m.myFinalsForSubject(myFinals, 99).yearValue === null
  && Object.keys(m.myFinalsForSubject(myFinals, 99).periodValues).length === 0);

// ── Чипы оценок в расписании ─────────────────────────────────────────────────
section('Оценки на карточке расписания');

const rowsModule = load('src/shared/ui/rows.js', {
  'react-native': { View: 'View', Pressable: 'Pressable' },
  'theme/ThemeContext': { useTheme: () => theme },
  'components/Txt': { Txt: 'Txt' },
  'components/ui': { Card: 'Card', Pill: 'Pill', Avatar: 'Avatar' },
  'components/Hex': { HexBadge: 'HexBadge' },
  'components/Icon': { __esModule: true, default: 'Icon' },
  'data/mock': { SUBJECT_COLORS: {} },
  'components/Screen': { shadowSm: {} },
  'ui/grades': chips,
});

function renderLesson(props) {
  return renderTree(createElement(rowsModule.LessonRow, {
    lesson: { time: '08:00', end: '08:45', subject: 'Математика', status: 'done' },
    ...props,
  }));
}

const withGrades = renderLesson({ grades: ['5', '4+'] });
check('оценки видны на карточке урока',
  textOf(withGrades).includes('5') && textOf(withGrades).includes('4+'));
check('без оценок карточка прежняя',
  !textOf(renderLesson({})).includes('5'));
check('на отменённом уроке оценок не показываем',
  !textOf(renderLesson({ lesson: {
    time: '08:00', end: '08:45', subject: 'Математика', status: 'done', cancelled: true,
  }, grades: ['5'] })).includes('5'),
  'оценок за несостоявшийся урок не бывает');

// ── Экраны родителя (GRADES-FE-001 §8) ───────────────────────────────────────
section('Оценки родителя');

check('у ученика в подписи ребёнка нет',
  m.subjectSubtitle({ className: '9 «А»', periodName: '1 четверть' })
    === '9 «А» класс · 1 четверть');
check('у родителя ребёнок идёт первым',
  m.subjectSubtitle({ childLabel: 'Айгерим Б. · 7А', className: '7 «А»', periodName: '1 четверть' })
    === 'Айгерим Б. · 7А · 7 «А» класс · 1 четверть');
check('пустые части не удваивают разделитель',
  m.subjectSubtitle({ periodName: '1 четверть' }) === '1 четверть');
check('нет ничего — пустая строка, а не «·»', m.subjectSubtitle({}) === '');

const switcher = load('src/shared/ui/childSwitcher.js', {
  'react-native': { View: 'View', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'ScrollView' },
  'theme/ThemeContext': { useTheme: () => theme },
  'components/Txt': { Txt: 'Txt' },
  'components/Icon': { __esModule: true, default: 'Icon' },
});

const child = { id: 7, fullName: 'Байсеитова Айгерим Ерлановна', className: '7 «А»' };
check('пилюля показывает имя и инициал фамилии',
  switcher.childShortLabel(child) === 'Айгерим Б.');
check('в списке — имя и фамилия',
  switcher.childFullLabel(child) === 'Айгерим Байсеитова');
check('инициалы из имени и фамилии', switcher.childInitials(child) === 'АБ');
check('однословное имя не дублируется',
  switcher.childShortLabel({ fullName: 'Айгерим' }) === 'Айгерим');
check('цвета детей не совпадают у соседей',
  switcher.childColor(0) !== switcher.childColor(1));
const disabledPill = renderTree(createElement(switcher.ChildSwitcherPill, {
  child, index: 0, canSwitch: false, onPress: () => {},
}));
check('переключатель у одного ребёнка не нажимается',
  disabledPill.props.disabled === true && disabledPill.props.onPress === undefined,
  'один ребёнок — пилюля остаётся подписью, но не реагирует на нажатие');
check('с несколькими детьми переключатель нажимается',
  flatten(renderTree(createElement(switcher.ChildSwitcherPill, {
    child, index: 0, canSwitch: true, onPress: () => {},
  }))).filter((n) => n.type === 'Pressable').length === 1);

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
