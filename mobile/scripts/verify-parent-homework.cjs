#!/usr/bin/env node
/**
 * Карточка ДЗ родителя (FE-M5): тест, отправка, оценка — и ничего сверх этого.
 *
 * Настоящий исходник компилируется babel-пресетом проекта и рендерится здесь.
 *
 * Главная проверка — отрицательная: ответ ребёнка на экран не попадает. Бэк его и не
 * присылает (`ChildHomeworkView` содержимого ответа не несёт), но экран не должен уметь
 * показать его, даже если поле однажды появится.
 *
 * Запуск:
 *   node scripts/verify-parent-homework.cjs
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
    // Сначала длинные ключи: 'react-native-safe-area-context' содержит 'react-native',
    // и без сортировки более общий стаб перехватил бы более точный.
    for (const key of Object.keys(extraStubs).sort((a, b) => b.length - a.length)) {
      if (id.includes(key)) return extraStubs[key];
    }
    // Экран материалов — с состоянием, поэтому фальшивый react отдаёт и хуки. Всё
    // разворачивается в один синхронный проход: `useState` возвращает начальное
    // значение, эффекты не запускаются — рендер здесь проверяет разметку, а не жизнь
    // компонента во времени.
    if (id === 'react') {
      const react = {
        createElement,
        useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
        useMemo: (fn) => fn(),
        useCallback: (fn) => fn,
        useEffect: () => {},
        useRef: (value) => ({ current: value }),
      };
      return { ...react, default: react };
    }
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




const theme = { c: new Proxy({}, { get: () => '#000' }) };
const rnStub = {
  View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', Image: 'Image',
  Modal: 'Modal', Linking: { openURL: () => Promise.resolve() },
};

function allText(element) {
  return flatten(element)
    .flatMap((item) => item.children || [])
    .filter((child) => typeof child === 'string' || typeof child === 'number')
    .map(String)
    .join(' ');
}

// Настоящий `format`, а не заглушка: иначе `plural` вернул бы null, и «5 вопросов»
// превратилось бы в «5 null» — проверка прошла бы вхолостую мимо самой подписи.
const format = load('src/shared/format.js');

function renderParent({ data, grade = null }) {
  const screen = load('src/features/homework/ParentHomeworkDetailScreen.js', {
    'shared/format': format,
    // `stamp` и `dueLong` заглушкой вернули бы null, и строка отправки не отрисовалась
    // бы вовсе — то есть проверка слов «Пройден / Отправлено» ничего бы не проверяла.
    'api/homeworkMap': {
      closedNotice: () => null,
      dueLong: (hw) => `Срок: ${hw?.dueAt ?? '—'}`,
      stamp: (iso) => (iso ? '18 сен, 10:15' : null),
      subjectLine: (hw) => `${hw?.subjectName ?? ''} · ${hw?.className ?? ''}`,
    },
    'api/gradesMap': { gradeTypeLabel: () => 'Оценка за задание' },
    'react-native': rnStub,
    'theme/ThemeContext': { useTheme: () => theme },
    'components/Screen': { Screen: 'Screen' },
    'components/Txt': { Txt: 'Txt' },
    'components/ui': { Pill: 'Pill' },
    'math/MathText': { MathText: 'MathText' },
    'auth/AuthContext': { useAuth: () => ({ token: 't' }) },
    'hooks/useHomework': { useChildHomework: () => ({ loading: false, error: null, data, reload: () => {} }) },
    'hooks/useGrades': { useMyHomeworkGrade: () => ({ grade, reload: () => {} }) },
    './components': {
      ChipRow: 'ChipRow', Divider: 'Divider', FeedbackBox: 'FeedbackBox', FileChip: 'FileChip',
      Notice: 'Notice', PhotoStrip: 'PhotoStrip', SectionLabel: 'SectionLabel',
      StatusChip: 'StatusChip', StatusHint: 'StatusHint',
    },
    './HomeworkStates': {
      HomeworkCardSkeleton: 'HomeworkCardSkeleton', HomeworkError: 'HomeworkError',
      HomeworkMissing: 'HomeworkMissing',
    },
  });
  return renderTree(createElement(screen.ParentHomeworkDetailScreen, {
    nav: Object.assign(() => {}, { back: () => {} }),
    payload: { homeworkId: 8, childId: 85 },
  }));
}

const plainHomework = {
  id: 8, title: 'Упражнения 1–5', subjectName: 'Математика', className: '7А',
  teacherName: 'Смирнова С. Д.', status: 'PUBLISHED', dueType: 'EXACT',
  dueAt: '2026-09-20T20:00:00Z', questionCount: 0, materials: [],
  work: { status: 'NOT_SUBMITTED', attemptCount: 0 },
};

const testHomework = {
  ...plainHomework,
  title: 'Плотность вещества',
  questionCount: 5,
  work: { status: 'SUBMITTED', attemptCount: 1, lastSubmittedAt: '2026-09-18T10:15:00Z' },
};

// ── Тест виден как тест ──────────────────────────────────────────────────────
section('Тест');

const testText = allText(renderParent({ data: testHomework }));
check('задание-тест подписано и названо числом вопросов',
  /Тест · 5 вопросов/.test(testText), testText.match(/Тест[^|]{0,20}/)?.[0]);

check('обычное задание пометки не получает',
  !/Тест/.test(allText(renderParent({ data: plainHomework }))));

check('у теста говорится «пройден», а не «отправлено»',
  /Пройден/.test(testText) && !/Отправлено/.test(testText),
  'ребёнок отвечал в приложении, а не присылал файл');

check('у обычного задания слово прежнее',
  /Ответ пока не отправлен/.test(allText(renderParent({ data: plainHomework }))));

const notTaken = allText(renderParent({ data: { ...testHomework, work: { status: 'NOT_SUBMITTED', attemptCount: 0 } } }));
check('непройденный тест назван непройденным',
  /Тест пока не пройден/.test(notTaken) && !/Ответ пока не отправлен/.test(notTaken));

// ── Оценка ───────────────────────────────────────────────────────────────────
section('Оценка');

const graded = allText(renderParent({
  data: testHomework,
  grade: { scaleCode: '4+', gradeType: 'HOMEWORK', numericValue: 4.5 },
}));
check('оценка показывается кодом шкалы, а не числом',
  /4\+/.test(graded) && !/4\.5/.test(graded),
  'шкала — справочник, и «4+» это её код, а не 4,5');

/**
 * Оценки нет по двум причинам — не проверили или её тут не ставят, — и различить их
 * родителю нечем. Пустое «Оценка: —» читалось бы как «поставили ничего».
 */
check('без оценки строки нет вовсе',
  !/Оценка/.test(allText(renderParent({ data: testHomework }))));

// ── Чего на экране быть не должно ────────────────────────────────────────────
section('Ответ ребёнка');

const withAnswer = allText(renderParent({
  data: {
    ...testHomework,
    // Полей ответа в ChildHomeworkView нет; подкладываем их нарочно — экран всё равно
    // не должен уметь их показать.
    work: {
      ...testHomework.work,
      answerText: 'СЕКРЕТНЫЙ ОТВЕТ РЕБЁНКА',
      attachments: [{ id: 1, fileName: 'otvet.jpg' }],
      currentAttempt: { text: 'ЕЩЁ ОДИН СЕКРЕТ' },
    },
  },
}));
check('текст ответа не выводится, даже если пришёл',
  !/СЕКРЕТНЫЙ ОТВЕТ/.test(withAnswer) && !/ЕЩЁ ОДИН СЕКРЕТ/.test(withAnswer),
  'главное свойство родительского доступа');
check('вложения ответа не выводятся',
  !/otvet\.jpg/.test(withAnswer));

// ── Обратная связь учителя — единственное содержимое работы ──────────────────
section('Обратная связь');

const reviewed = renderParent({
  data: {
    ...testHomework,
    work: {
      ...testHomework.work, status: 'DONE',
      lastReview: { id: 1, decision: 'DONE', comment: 'Молодец, но единицы забыл', photos: [] },
    },
  },
});
check('комментарий учителя доходит до родителя',
  flatten(reviewed).some((n) => n.type === 'FeedbackBox'
    && n.props?.text === 'Молодец, но единицы забыл'),
  'обратная связь — единственное содержимое работы, которое родителю положено');

// ── Строка списка ────────────────────────────────────────────────────────────
section('Строка списка');

const components = load('src/features/homework/components.js', {
  'react-native': rnStub,
  'theme/ThemeContext': { useTheme: () => theme },
  'components/Txt': { Txt: 'Txt' },
  'components/Icon': { default: 'Icon' },
});

function rowText(row) {
  return allText(renderTree(createElement(components.HomeworkRow, { row, onPress: () => {} })));
}

check('в списке тест помечен',
  /Тест/.test(rowText({ id: 1, title: 'Плотность', subjectName: 'Физика', questionCount: 5 })));
check('обычное задание в списке не помечено',
  !/Тест/.test(rowText({ id: 2, title: 'Упражнения', subjectName: 'Физика', questionCount: 0 })));
check('строка без questionCount не ломается',
  !/Тест/.test(rowText({ id: 3, title: 'Старое', subjectName: 'Физика' })),
  'страницы, закешированные до появления поля');

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
