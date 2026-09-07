#!/usr/bin/env node
/**
 * Проверка раскладки материалов урока (FE-M2).
 *
 * Тот же приём, что у `verify-attendance-logic.cjs` и `verify-grades-logic.cjs`: в
 * проекте нет запускалки тестов для RN, поэтому настоящий исходник компилируется тем же
 * babel-пресетом и его чистые экспорты выполняются здесь. Проверяется отгруженный код,
 * а не его копия в фикстуре.
 *
 * Главное, что тут закреплено, — чего экран НЕ делает: он не фильтрует материалы по роли.
 * Список приходит отфильтрованным с бэка, и вторая реализация видимости на клиенте — это
 * ровно тот баг, из-за которого ученик увидел бы чужой файл.
 *
 * Запуск:
 *   node scripts/verify-lesson-materials.cjs [ответ GET /api/lessons/{id}/materials]
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


// `files` подставляется настоящий: иначе заглушка вернула бы из `sizeLabel` null, и
// проверки размера прошли бы вхолостую — ровно так этот скрипт и соврал в первый запуск.
const files = load('src/shared/api/files.js');
const map = load('src/shared/api/lessonMap.js', { './files': files });
const format = load('src/shared/format.js');

section('Размер файла');
check('байты, килобайты и мегабайты подписаны',
  files.sizeLabel(512) === '512 Б'
  && files.sizeLabel(2048) === '2 КБ'
  && files.sizeLabel(2_516_582) === '2,4 МБ',
  files.sizeLabel(2_516_582));
check('нулевой и неизвестный размер подписи не получают',
  files.sizeLabel(0) === null && files.sizeLabel(null) === null);

// ── Раскладка одного материала ───────────────────────────────────────────────
section('Материал');

const file = map.mapLessonMaterial({
  id: 1, kind: 'FILE', fileName: 'konspekt.pdf',
  contentType: 'application/pdf', sizeBytes: 2_516_582, visibleToStudents: true,
});
check('файл: имя, размер, не картинка и не ссылка',
  file.title === 'konspekt.pdf' && file.sizeLabel === '2,4 МБ'
  && file.isImage === false && file.isLink === false,
  file.sizeLabel);

const link = map.mapLessonMaterial({
  id: 2, kind: 'LINK', url: 'https://example.org/plotnost', visibleToStudents: true,
});
check('ссылка подписана адресом и без размера',
  link.isLink === true && link.title === 'https://example.org/plotnost' && link.sizeLabel === null);

check('снимок с камеры — картинка',
  map.mapLessonMaterial({ id: 3, kind: 'PHOTO', fileName: 'doska.jpg' }).isImage === true);

/**
 * Ключевой случай: картинка, загруженная файлом, приходит с kind FILE. По одному лишь
 * `kind` половина изображений открывалась бы просмотрщиком документов вместо наложения.
 */
check('картинка в виде файла распознаётся по contentType',
  map.mapLessonMaterial({
    id: 4, kind: 'FILE', fileName: 'shema.png', contentType: 'image/png',
  }).isImage === true);

check('неизвестный размер не даёт подписи',
  map.mapLessonMaterial({ id: 5, kind: 'FILE', fileName: 'x.doc', sizeBytes: 0 }).sizeLabel === null);

check('материал без id отбрасывается',
  map.mapLessonMaterial({ kind: 'FILE', fileName: 'x' }) === null);

// ── Видимость ────────────────────────────────────────────────────────────────
section('Видимость');

check('скрытый материал помечен',
  map.mapLessonMaterial({ id: 6, kind: 'FILE', fileName: 'a', visibleToStudents: false }).hidden === true);

check('видимый — не помечен',
  map.mapLessonMaterial({ id: 7, kind: 'FILE', fileName: 'a', visibleToStudents: true }).hidden === false);

/**
 * Раскладка НЕ выкидывает скрытые материалы. Это не упущение, а требование: список уже
 * отфильтрован бэком по роли (`LessonMaterialService`), и повторный отбор здесь стал бы
 * вторым местом, где живёт правило видимости.
 */
const mixed = map.mapLessonMaterials([
  { id: 10, kind: 'FILE', fileName: 'открытый', visibleToStudents: true },
  { id: 11, kind: 'FILE', fileName: 'скрытый', visibleToStudents: false },
]);
check('клиент не фильтрует по видимости — это делает бэк',
  mixed.length === 2 && mixed[1].hidden === true,
  `${mixed.length} из 2`);

check('не массив не роняет раскладку',
  map.mapLessonMaterials(null).length === 0 && map.mapLessonMaterials(undefined).length === 0);

// ── Счётчик в карточке ───────────────────────────────────────────────────────
section('Счётчик');

check('число со словом в нужной форме',
  format.countLabel(1, ['материал', 'материала', 'материалов']) === '1 материал'
  && format.countLabel(3, ['материал', 'материала', 'материалов']) === '3 материала'
  && format.countLabel(5, ['материал', 'материала', 'материалов']) === '5 материалов'
  && format.countLabel(11, ['материал', 'материала', 'материалов']) === '11 материалов');

// ── Экран целиком ────────────────────────────────────────────────────────────
section('Экран');

const theme = { c: new Proxy({}, { get: () => '#000' }) };
const rnStub = {
  View: 'View', Pressable: 'Pressable', Image: 'Image', Modal: 'Modal',
  ActivityIndicator: 'ActivityIndicator', Linking: { openURL: () => Promise.resolve() },
};

function renderScreen({ materials = [], loading = false, error = null, canManage = false }) {
  const screen = load('src/features/lesson/LessonMaterialsScreen.js', {
    'react-native': rnStub,
    'react-native-webview': { WebView: 'WebView' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    'theme/ThemeContext': { useTheme: () => theme },
    'components/Screen': { Screen: 'Screen' },
    'components/Txt': { Txt: 'Txt' },
    'components/ui': {
      Card: 'Card', Pill: 'Pill', ScreenHeader: 'ScreenHeader', PrimaryButton: 'PrimaryButton',
    },
    'auth/AuthContext': { useAuth: () => ({ token: 'test-token' }) },
    'api/upload': { authHeaders: () => ({ Authorization: 'Bearer test-token' }) },
    'api/lessonApi': { lessonFiles: { material: (l, m) => `http://api/lessons/${l}/materials/${m}/content` } },
    'hooks/useLesson': {
      useLessonMaterials: () => ({ loading, error, materials, reload: () => {} }),
    },
  });
  return renderTree(createElement(screen.LessonMaterialsScreen, {
    nav: Object.assign(() => {}, { back: () => {} }),
    payload: { lessonInstanceId: 485, canManage },
  }));
}

const teacherEmpty = textOf(renderScreen({ canManage: true })).join(' ');
check('пустой экран учителя говорит, где прикладывают материалы',
  /Материалов нет/.test(teacherEmpty) && /веб-версии/.test(teacherEmpty));

const learnerEmpty = textOf(renderScreen({ canManage: false })).join(' ');
check('пустой экран ученика не зовёт его в веб-версию',
  /не приложил материалов/.test(learnerEmpty) && !/веб-версии/.test(learnerEmpty),
  'ученик материалы не прикладывает — предлагать ему это некуда');

const filled = textOf(renderScreen({
  materials: map.mapLessonMaterials([
    { id: 1, kind: 'FILE', fileName: 'konspekt.pdf', sizeBytes: 2_516_582, visibleToStudents: true },
    { id: 2, kind: 'FILE', fileName: 'ключи.pdf', sizeBytes: 1024, visibleToStudents: false },
    { id: 3, kind: 'LINK', url: 'https://example.org/plotnost', visibleToStudents: true },
  ]),
  canManage: true,
})).join(' ');
check('список показывает имя, размер и адрес ссылки',
  /konspekt\.pdf/.test(filled) && /2,4 МБ/.test(filled) && /example\.org/.test(filled));
/**
 * Пометку ищем в самой `Pill`, а не в общем тексте: в приложении она оборачивает
 * строку в `Txt` сама (`wrapStrings`), а здесь `Pill` — заглушка, и её содержимое в
 * сбор текста не попадает.
 */
const pills = flatten(renderScreen({
  materials: map.mapLessonMaterials([
    { id: 1, kind: 'FILE', fileName: 'открытый.pdf', visibleToStudents: true },
    { id: 2, kind: 'FILE', fileName: 'ключи.pdf', visibleToStudents: false },
  ]),
  canManage: true,
})).filter((node) => node.type === 'Pill');
check('пометка стоит ровно у скрытого материала',
  pills.length === 1 && pills[0].children.includes('Только для учителя'),
  `пилюль: ${pills.length}`);

const failed_ = textOf(renderScreen({ error: 'Сеть недоступна' })).join(' ');
check('ошибка объясняется и предлагает повторить',
  /Не удалось загрузить материалы/.test(failed_) && /Сеть недоступна/.test(failed_));

// ── Живой ответ бэка ─────────────────────────────────────────────────────────
const livePath = process.argv[2];
if (livePath) {
  section('Живой ответ');
  const raw = JSON.parse(fs.readFileSync(livePath, 'utf8'));
  const list = map.mapLessonMaterials(raw);
  check('каждый материал разложился', list.length === (Array.isArray(raw) ? raw.length : 0),
    `${list.length} из ${Array.isArray(raw) ? raw.length : 0}`);
  check('у каждого есть подпись', list.every((item) => Boolean(item.title)));
  for (const item of list) {
    console.log(`    · ${item.title}${item.sizeLabel ? ` · ${item.sizeLabel}` : ''}`
      + `${item.hidden ? ' · скрытый' : ''}${item.isLink ? ' · ссылка' : item.isImage ? ' · картинка' : ''}`);
  }
}

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
