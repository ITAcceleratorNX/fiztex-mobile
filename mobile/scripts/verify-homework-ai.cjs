#!/usr/bin/env node
/**
 * Проверка генерации конспекта с телефона (FE-M4).
 *
 * Тот же приём, что у соседних verify-скриптов: настоящий исходник компилируется
 * babel-пресетом проекта и выполняется здесь — проверяется отгруженный код.
 *
 * Что здесь закреплено:
 *  — слова ожидания совпадают с вебовыми (учитель видит один процесс с двух устройств);
 *  — счётчик шагов прячется, когда шаг один;
 *  — три исхода задачи различаются, и `awaitingDecision` не выдаётся за «готово»;
 *  — ключ идемпотентности — настоящий UUID и не повторяется.
 *
 * Запуск:
 *   node scripts/verify-homework-ai.cjs
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



const map = load('src/shared/api/homeworkAiMap.js');
const { uuid } = load('src/shared/uuid.js');

// ── Слова ожидания ───────────────────────────────────────────────────────────
section('Фазы');

check('фазы названы теми же словами, что в вебе',
  map.phaseLabel({ phase: 'READING_MATERIALS' }) === 'Читаю материалы урока'
  && map.phaseLabel({ phase: 'CALLING_MODEL' }) === 'Составляю'
  && map.phaseLabel({ phase: 'APPLYING' }) === 'Почти готово');

check('задача без фазы говорит, что начинает',
  map.phaseLabel({ status: 'PENDING' }) === 'Начинаю…');

check('счётчик шагов добавляется к фазе',
  map.phaseLabel({ phase: 'READING_MATERIALS', progressDone: 2, progressTotal: 5 })
    === 'Читаю материалы урока · 2 из 5');

/** «1 из 1» — шум: у одиночного вызова бэкенд счётчик и не присылает. */
check('счётчик из одного шага не показывается',
  map.phaseLabel({ phase: 'CALLING_MODEL', progressDone: 0, progressTotal: 1 }) === 'Составляю');

check('нет задачи — нет подписи', map.phaseLabel(null) === null);

// ── Что считается идущим ─────────────────────────────────────────────────────
section('Ход задачи');

check('PENDING и RUNNING — идёт',
  map.isRunning({ status: 'PENDING' }) === true && map.isRunning({ status: 'RUNNING' }) === true);
check('DONE и FAILED — не идёт',
  map.isRunning({ status: 'DONE' }) === false && map.isRunning({ status: 'FAILED' }) === false);

// ── Исходы ───────────────────────────────────────────────────────────────────
section('Исход');

check('у идущей задачи исхода ещё нет', map.jobOutcome({ status: 'RUNNING' }) === null);

const done = map.jobOutcome({ status: 'DONE', applied: true });
check('успех назван успехом', done.kind === 'done' && done.title === 'Готово');

const warned = map.jobOutcome({
  status: 'DONE', applied: true, warningMessage: 'ссылка не читается',
});
check('оговорка при успехе показывается',
  warned.kind === 'done' && warned.message === 'ссылка не читается',
  'учитель обязан узнать, что в конспект вошло не всё');

/**
 * Главный случай: результат готов, но текст учителя не тронут. Выдать это за «готово»
 * значит отправить человека публиковать изменение, которого нет.
 */
const awaiting = map.jobOutcome({ status: 'DONE', applied: false, awaitingDecision: true });
check('ждущий решения не выдаётся за готовый',
  awaiting.kind === 'awaiting' && awaiting.kind !== 'done'
  && /веб-версии/.test(awaiting.message) && /ваш текст остался на месте/.test(awaiting.message));

/**
 * Тот же исход даёт вытесненный результат: флага `awaitingDecision` у него уже нет, но
 * в задании его тоже нет. Для учителя факт один — его текст не тронут.
 */
check('готовый, но непринятый результат не называется «Готово»',
  map.jobOutcome({ status: 'DONE', applied: false }).kind === 'awaiting');

const failedJob = map.jobOutcome({ status: 'FAILED', errorMessage: 'Модель не ответила. Попробуйте ещё раз через минуту.' });
check('отказ показывает текст с бэка как есть',
  failedJob.kind === 'failed' && failedJob.message === 'Модель не ответила. Попробуйте ещё раз через минуту.',
  'бэкенд с FE-W6 уже пишет его для человека');

check('отказ без сообщения всё равно объясняется',
  map.jobOutcome({ status: 'FAILED' }).message.length > 0);

// ── Квота ────────────────────────────────────────────────────────────────────
section('Квота');

check('остаток виден числом',
  map.quotaLabel({ enabled: true, remaining: 47, dailyQuota: 50 }) === 'Осталось 47 из 50 на сегодня');
check('исчерпанная квота названа прямо',
  map.quotaLabel({ enabled: true, remaining: 0, dailyQuota: 50 }) === 'Лимит генераций на сегодня исчерпан');
check('выключенная фича отличается от исчерпанной квоты',
  map.quotaLabel({ enabled: false, remaining: 50, dailyQuota: 50 })
    === 'Генерация выключена администратором');

// ── Ключ идемпотентности ─────────────────────────────────────────────────────
section('Ключ идемпотентности');

const one = uuid();
check('это настоящий UUID v4 — бэк парсит его как UUID',
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(one), one);

const keys = new Set();
for (let i = 0; i < 20000; i += 1) keys.add(uuid());
check('20 000 ключей не повторились', keys.size === 20000, `${keys.size}`);

// ── Шит ──────────────────────────────────────────────────────────────────────
section('Шит генерации');

const theme = { c: new Proxy({}, { get: () => '#000' }) };
const rnStub = {
  View: 'View', Pressable: 'Pressable', Modal: 'Modal', ScrollView: 'ScrollView',
  TextInput: 'TextInput', ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'ios' },
};

/**
 * Весь текст экрана, а не только из `Txt`: подписи кнопок и полос в приложении лежат
 * внутри `PrimaryButton` и `Banner`, а здесь это заглушки, и их содержимое до `Txt` не
 * доходит. Собираем строки у всех узлов.
 */
function allText(element) {
  return flatten(element)
    .flatMap((item) => item.children || [])
    .filter((child) => typeof child === 'string' || typeof child === 'number')
    .map(String)
    .join(' ');
}

/** Есть ли кнопка с такой подписью. */
function hasButton(tree, label) {
  return flatten(tree).some((n) => n.type === 'PrimaryButton'
    && (n.children || []).some((child) => String(child).includes(label)));
}

function renderSheet({ job = null, materials = [], quota = null, lessonId = 7 }) {
  const sheet = load('src/features/teacher/homework/HomeworkAiSheet.js', {
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'react-native': rnStub,
    'theme/ThemeContext': { useTheme: () => theme },
    'components/Txt': { Txt: 'Txt' },
    'components/ui': { Banner: 'Banner', Pill: 'Pill', PrimaryButton: 'PrimaryButton' },
    'hooks/useLesson': { useLessonMaterials: () => ({ materials, loading: false }) },
    'hooks/useTeacherHomework': {
      useHomeworkAiQuota: () => quota,
      useHomeworkAiGeneration: () => ({
        job, starting: false, error: null, running: map.isRunning(job),
        start: () => {}, adopt: () => {}, reset: () => {},
      }),
    },
    'api/homeworkAiMap': map,
  });
  return renderTree(createElement(sheet.HomeworkAiSheet, {
    visible: true, homeworkId: 8, lessonId,
    onClose: () => {}, onApplied: () => {}, onWriteManually: () => {},
  }));
}

const noLessonTree = renderSheet({ lessonId: null });
check('заданию вне урока генерация объяснимо недоступна',
  /привязанного к уроку/.test(allText(noLessonTree))
  && !hasButton(noLessonTree, 'Сгенерировать'),
  'тема и материалы берутся из урока — генерировать нечем');

const running = allText(renderSheet({ job: { id: 1, status: 'RUNNING', phase: 'CALLING_MODEL' } }));
check('во время ожидания видна фаза и сказано, что шит можно закрыть',
  /Составляю/.test(running) && /Окно можно закрыть/.test(running));

const failedTree = renderSheet({
  job: { id: 1, status: 'FAILED', errorMessage: 'Модель сейчас перегружена. Попробуйте через несколько минут.' },
});
check('отказ объясняет причину и даёт ручной выход',
  /Не удалось сгенерировать/.test(allText(failedTree))
  && /перегружена/.test(allText(failedTree))
  && hasButton(failedTree, 'Написать самому'),
  'приложение не сломалось — написать задание руками можно прямо сейчас');

const awaitingSheet = allText(renderSheet({
  job: { id: 1, status: 'DONE', applied: false, awaitingDecision: true },
}));
check('ждущий решения отправляет в веб, а не притворяется готовым',
  /не применён/.test(awaitingSheet) && /веб-версии/.test(awaitingSheet)
  && !/^Готово/.test(awaitingSheet));

const formTree = renderSheet({
  materials: [{ id: 1, title: 'konspekt.pdf' }, { id: 2, title: 'ключи.pdf', hidden: true }],
  quota: { enabled: true, remaining: 47, dailyQuota: 50 },
});
const form = allText(formTree);
check('форма показывает материалы, промпт и остаток квоты',
  /konspekt\.pdf/.test(form) && /Что нужно получить/.test(form)
  && /Осталось 47 из 50/.test(form) && /Необязательно/.test(form));
check('скрытый материал в выборе помечен',
  flatten(formTree).some((n) => n.type === 'Pill'
    && (n.children || []).some((child) => String(child) === 'Скрыт')),
  'ключи к задачам — законный источник, но учитель должен знать, что берёт');

const emptyMaterials = allText(renderSheet({ materials: [] }));
check('урок без материалов предупреждает о качестве, а не запрещает',
  /составит конспект по теме/.test(emptyMaterials)
  && hasButton(renderSheet({ materials: [] }), 'Сгенерировать'));

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
