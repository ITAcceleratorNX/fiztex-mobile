#!/usr/bin/env node
/**
 * Проверка экрана урока ученика на ЖИВЫХ данных бэкенда.
 *
 * Тест-раннера в проекте нет, поэтому здесь тот же приём, что и в
 * `verify-schedule-logic.cjs`: реальные исходники компилируются проектным
 * babel-пресетом (он даёт CommonJS) и выполняются с подменёнными нативными
 * зависимостями. Отличие в том, что здесь исполняются не чистые функции, а сами
 * компоненты: React настоящий, `createElement` строит настоящее дерево, а
 * хуки-заглушки позволяют вызвать функцию-компонент вне рендерера.
 *
 * Что проверяется: карточка урока с бэка → `mapLessonCard` → дерево экрана, то
 * есть что именно увидит ученик в каждом состоянии макета.
 *
 * Usage:
 *   node scripts/verify-lesson-card.cjs --code K3BBBWVY --pin 1234 \
 *        --done 128 --todo 129 --empty 132 [--api http://localhost:8080]
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');
const React = require('react');

const ROOT = path.resolve(__dirname, '..');

// ─── загрузка реальных исходников ────────────────────────────────────────────

const RN_STUB = new Proxy(
  {
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    RefreshControl: 'RefreshControl',
    ActivityIndicator: 'ActivityIndicator',
    FlatList: 'FlatList',
    Modal: 'Modal',
    TextInput: 'TextInput',
    Platform: { OS: 'ios', select: (o) => o.ios },
    useColorScheme: () => 'light',
    StyleSheet: { create: (s) => s, flatten: (s) => s },
  },
  { get: (target, key) => (key in target ? target[key] : String(key)) },
);

// Хуки вызываются вне рендерера, поэтому подменяются: состояние — начальное,
// колбэки — сами функции. Для разметки этого достаточно, а `createElement`
// остаётся настоящим, так что дерево получается такое же, как в приложении.
const REACT_STUB = {
  ...React,
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  useRef: (v) => ({ current: v }),
  useEffect: () => {},
  useContext: () => null, // → useTheme отдаёт светлую палитру по умолчанию
};

// Компиляция дорогая и от заглушек не зависит — кешируется. Сами модули собираются
// заново на каждый вызов `load`: заглушки (текущий урок) вшиты в замыкание, и
// переиспользованный модуль отдал бы данные предыдущего сценария.
const codeCache = new Map();

function compile(file) {
  if (!codeCache.has(file)) {
    codeCache.set(file, babel.transformSync(fs.readFileSync(file, 'utf8'), {
      filename: file,
      presets: ['babel-preset-expo'],
      babelrc: false,
      configFile: false,
    }).code);
  }
  return codeCache.get(file);
}

function load(relPath, extraStubs = {}, graph = new Map()) {
  const file = path.join(ROOT, relPath);
  if (graph.has(file)) return graph.get(file);
  const code = compile(file);

  const fakeRequire = (id) => {
    for (const [needle, value] of Object.entries(extraStubs)) {
      if (id.includes(needle)) return value;
    }
    if (id === 'react') return REACT_STUB;
    if (id === 'react-native') return RN_STUB;
    if (id === 'react-native-safe-area-context') {
      return { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
    }
    if (id === 'react-native-svg') {
      return new Proxy({ default: 'Svg' }, { get: (_t, k) => String(k) });
    }
    if (id.startsWith('@shared/') || id.startsWith('@features/') || id.startsWith('.')) {
      return load(resolveAlias(id, file), extraStubs, graph);
    }
    // Рантайм-хелперы babel и react/jsx-runtime — настоящие: на заглушках дерево
    // элементов просто не соберётся.
    try {
      return require(id);
    } catch {
      return new Proxy({}, { get: () => () => null });
    }
  };

  const mod = { exports: {} };
  graph.set(file, mod.exports); // защита от циклов в графе импортов
  new Function('require', 'module', 'exports', code)(fakeRequire, mod, mod.exports);
  graph.set(file, mod.exports);
  return mod.exports;
}

function resolveAlias(id, fromFile) {
  let target;
  if (id.startsWith('@shared/')) target = path.join(ROOT, 'src/shared', id.slice('@shared/'.length));
  else if (id.startsWith('@features/')) target = path.join(ROOT, 'src/features', id.slice('@features/'.length));
  else target = path.resolve(path.dirname(fromFile), id);

  for (const candidate of [target, `${target}.js`, path.join(target, 'index.js')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.relative(ROOT, candidate);
    }
  }
  return path.relative(ROOT, `${target}.js`);
}

// ─── мини-рендерер ───────────────────────────────────────────────────────────

/** Разворачивает функции-компоненты, оставляя дерево из host-элементов. */
function render(node) {
  if (node == null || typeof node === 'boolean') return null;
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(render).filter((n) => n !== null);
  if (!node.props) return null;

  const children = render(node.props.children);
  if (typeof node.type === 'function') {
    return render(node.type({ ...node.props }));
  }
  if (node.type === React.Fragment || node.type?.toString?.() === 'Symbol(react.fragment)') {
    return children;
  }
  return { type: String(node.type), props: node.props, children };
}

function texts(tree, acc = []) {
  if (tree == null) return acc;
  if (typeof tree === 'string') {
    const t = tree.trim();
    if (t) acc.push(t);
    return acc;
  }
  if (Array.isArray(tree)) {
    tree.forEach((n) => texts(n, acc));
    return acc;
  }
  texts(tree.children, acc);
  return acc;
}

function styles(tree, acc = []) {
  if (!tree || typeof tree === 'string') return acc;
  if (Array.isArray(tree)) {
    tree.forEach((n) => styles(n, acc));
    return acc;
  }
  const s = tree.props?.style;
  if (s) acc.push(typeof s === 'function' ? s({ pressed: false }) : s);
  styles(tree.children, acc);
  return acc;
}

function flatStyles(tree) {
  return styles(tree).flat(3).filter(Boolean);
}

// ─── проверки ────────────────────────────────────────────────────────────────

let passed = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ─── сценарий ────────────────────────────────────────────────────────────────

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function api(base, path_, { method = 'GET', body, token } = {}) {
  const res = await fetch(base + path_, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path_} → ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function screenFor(lesson, homeworkStub = {}) {
  const { StudentLessonScreen } = load('src/features/lesson/StudentLessonScreen.js', {
    'hooks/useLesson': {
      useLesson: () => ({ loading: false, error: null, forbidden: false, lesson, reload: () => {} }),
      useLessonHomework: () => ({
        saving: false,
        error: null,
        clearError: () => {},
        markDone: () => {},
        undoDone: () => {},
        ...homeworkStub,
      }),
    },
  });
  return render(React.createElement(StudentLessonScreen, {
    nav: () => {},
    payload: { lessonInstanceId: lesson?.id ?? 1 },
  }));
}

function fallbackFor(state) {
  const { StudentLessonScreen } = load('src/features/lesson/StudentLessonScreen.js', {
    'hooks/useLesson': {
      useLesson: () => ({ lesson: null, reload: () => {}, ...state }),
      useLessonHomework: () => ({ saving: false, error: null, markDone: () => {}, undoDone: () => {} }),
    },
  });
  return render(React.createElement(StudentLessonScreen, {
    nav: () => {},
    payload: { lessonInstanceId: 1, dateLabel: '14 октября, Вт' },
  }));
}

async function main() {
  const base = arg('api', 'http://localhost:8080');
  const code = arg('code');
  const pin = arg('pin', '1234');
  const ids = {
    done: Number(arg('done')),
    todo: Number(arg('todo')),
    empty: Number(arg('empty')),
  };
  if (!code || !ids.done || !ids.todo || !ids.empty) {
    console.error('нужны --code, --done, --todo, --empty (см. вывод seed_lesson_states.py)');
    process.exit(2);
  }

  const { token } = await api(base, '/api/auth/student/login', {
    method: 'POST',
    body: { code, pin },
  });

  const { mapLessonCard } = load('src/shared/api/lessonMap.js');
  const raw = {};
  for (const [kind, id] of Object.entries(ids)) {
    raw[kind] = await api(base, `/api/lessons/${id}`, { token });
  }

  section('Контракт: карточка ученика с бэка');
  check('роль ученика', raw.done.viewerRole === 'STUDENT', raw.done.viewerRole);
  check('право отметить ДЗ', raw.done.capabilities.includes('SUBMIT_HOMEWORK'));
  check('править урок ученик не может', !raw.done.capabilities.includes('EDIT_TEACHING_PART'));
  check('ДЗ приходит в карточке', Boolean(raw.done.homework?.body));
  check('отметка ученика в ответе', raw.done.homework.completed === true);
  check('чужая отметка не влияет', raw.todo.homework.completed === false);
  check('урок без ДЗ отдаёт null', raw.empty.homework === null);

  section('Экран: «ДЗ выполнено» (макет 2067-15466)');
  const done = mapLessonCard(raw.done, { highlight: null });
  const doneTree = screenFor(done);
  const doneTexts = texts(doneTree);
  check('шапка: предмет', doneTexts.includes(done.subject), done.subject);
  check('шапка: время', doneTexts.includes(done.timeRange), done.timeRange);
  check('статус-чип', doneTexts.includes(done.badge.label), done.badge.label);
  check('тема урока', doneTexts.includes(done.topic));
  check('комментарий учителя', doneTexts.includes(done.comment.body));
  check('текст задания', doneTexts.includes(done.homework.body));
  check('бейдж срока', doneTexts.includes(done.homework.dueLabel), done.homework.dueLabel);
  check('блок «Готово»', doneTexts.includes('Готово'));
  check('кнопки «Отметить готово» нет', !doneTexts.includes('Отметить готово'));
  check('разделы урока', ['Посещаемость', 'Материалы', 'Оценки'].every((l) => doneTexts.includes(l)));
  check('пустые значения разделов',
    ['Не отмечено', 'Нет материалов', 'Не выставлены'].every((l) => doneTexts.includes(l)));

  section('Экран: ДЗ выдано, не отмечено (макет 2067-10664)');
  const todo = mapLessonCard(raw.todo, { highlight: null });
  const todoTexts = texts(screenFor(todo));
  check('кнопка «Отметить готово»', todoTexts.includes('Отметить готово'));
  check('кнопка «Прикрепить фото»', todoTexts.includes('Прикрепить фото'));
  check('фото помечено как «скоро»', todoTexts.includes('СКОРО'));
  check('блока «Готово» нет', !todoTexts.includes('Готово'));
  check('без срока — бейджа нет', todo.homework.dueLabel === null);

  section('Экран: пустые блоки (макет 2067-16009)');
  const empty = mapLessonCard(raw.empty, { highlight: null });
  const emptyTexts = texts(screenFor(empty));
  check('тема не указана', emptyTexts.includes('Тема не указана'));
  check('задание отсутствует', emptyTexts.includes('Задание отсутствует'));
  check('кнопок ДЗ нет', !emptyTexts.includes('Отметить готово') && !emptyTexts.includes('Готово'));

  section('Экран: чип «Следующий» (макет 2067-15923)');
  const next = mapLessonCard({ ...raw.todo, temporalStatus: 'UPCOMING' }, { highlight: 'next' });
  const nextTree = screenFor(next);
  check('чип «Следующий»', texts(nextTree).includes('Следующий'));
  const heroStyles = flatStyles(nextTree);
  check('шапка на фирменном navy', heroStyles.some((s) => s.backgroundColor === '#274185'));
  check('белая обводка у чипа «Следующий»',
    heroStyles.some((s) => s.borderColor === '#FFFFFF' && s.borderRadius === 20));

  section('Экран: урок отменён (макет 2067-17353)');
  const cancelled = mapLessonCard(
    { ...raw.done, status: 'CANCELLED', cancellationComment: 'Учитель на больничном' }, {});
  const cancelledTexts = texts(screenFor(cancelled));
  check('чип «Урок отменён»', cancelledTexts.includes('Урок отменён'));
  check('причина отмены на экране', cancelledTexts.includes('Учитель на больничном'));

  section('Экран: замена учителя (макет 2067-17976)');
  const substituted = mapLessonCard(
    { ...raw.done, substituteTeacher: { id: 1, fullName: 'Петров Андрей Андреевич' } }, {});
  const subTexts = texts(screenFor(substituted));
  check('полоска замены', subTexts.some((t) => t.startsWith('Урок проводит:')),
    subTexts.find((t) => t.startsWith('Урок проводит:')));
  check('основной учитель остался в шапке', subTexts.includes(substituted.teacherName),
    substituted.teacherName);

  section('Состояния до карточки (как у учителя)');
  const loadingTexts = texts(fallbackFor({ loading: true, forbidden: false, error: null }));
  check('загрузка: дата из расписания видна', loadingTexts.includes('14 октября, Вт'));
  check('загрузка: без текстов ошибок', !loadingTexts.includes('Не удалось загрузить урок'));
  const forbiddenTexts = texts(fallbackFor({ loading: false, forbidden: true, error: null }));
  check('нет доступа', forbiddenTexts.includes('У вас нет доступа к этому уроку'));
  const errorTexts = texts(fallbackFor({ loading: false, forbidden: false, error: 'boom' }));
  check('ошибка загрузки', errorTexts.includes('Не удалось загрузить урок'));
  check('ошибка: кнопка повтора', errorTexts.includes('Повторить'));

  section('Родитель: тот же экран без кнопки');
  const parentLesson = mapLessonCard({ ...raw.done, viewerRole: 'PARENT', capabilities: ['VIEW_CARD'] }, {});
  const parentTexts = texts(screenFor(parentLesson));
  check('видит отметку ребёнка', parentTexts.includes('Готово'));
  check('не видит кнопку «Отметить готово»', !parentTexts.includes('Отметить готово'));

  section('Карточка учителя не сломалась общими состояниями');
  const teacherRaw = { ...raw.done, viewerRole: 'MAIN_TEACHER',
    capabilities: ['VIEW_CARD', 'VIEW_STUDENTS', 'VIEW_TEACHER_HISTORY', 'EDIT_TEACHING_PART'] };
  const teacherLesson = mapLessonCard(teacherRaw, {});
  const { LessonCardScreen } = load('src/features/lesson/LessonCardScreen.js', {
    'hooks/useLesson': {
      useLesson: () => ({ loading: false, error: null, forbidden: false, lesson: teacherLesson,
        historyCount: 3, reload: () => {} }),
      useLessonEditing: () => ({ saving: false, saveError: null, clearSaveError: () => {},
        saveTopic: () => {}, clearTopic: () => {}, saveComment: () => {}, deleteComment: () => {} }),
    },
  });
  const teacherTexts = texts(render(React.createElement(LessonCardScreen, {
    nav: () => {}, payload: { lessonInstanceId: ids.done },
  })));
  check('поля учителя на месте', teacherTexts.includes('Тема урока')
    && teacherTexts.includes('Комментарий для учеников'));
  check('плитка ДЗ знает про выданное задание', teacherTexts.includes('Выдано'));
  check('история изменений', teacherTexts.some((t) => t.startsWith('История изменений')));

  section('Живое действие: снять и вернуть отметку');
  const off = await api(base, `/api/lessons/${ids.done}/homework/completion`,
    { method: 'DELETE', token });
  check('DELETE снимает отметку', off.completed === false && off.completedCount === 0);
  const on = await api(base, `/api/lessons/${ids.done}/homework/completion`,
    { method: 'POST', token });
  check('POST возвращает отметку', on.completed === true && on.completedCount === 1);
  const after = await api(base, `/api/lessons/${ids.done}`, { token });
  check('карточка отдаёт то же состояние', after.homework.completed === true);

  console.log(`\n${'─'.repeat(50)}`);
  console.log(failures.length
    ? `✗ провалено ${failures.length}: ${failures.join(', ')}`
    : `✓ все проверки пройдены (${passed})`);
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error('\n✗', e.message);
  process.exit(1);
});
