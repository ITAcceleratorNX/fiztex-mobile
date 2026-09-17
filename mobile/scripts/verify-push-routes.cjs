#!/usr/bin/env node
/**
 * Проверка push-клиента (PUSH-001, подзадача 5): куда ведёт нажатие на уведомление, когда переходить на
 * холодном старте, когда регистрировать телефон.
 *
 * Тот же приём, что у остальных `verify-*.cjs`: тест-раннера в проекте нет, поэтому настоящие исходники
 * компилируются проектным babel-пресетом и выполняются здесь с заглушками нативных модулей — проверяется
 * отгруженный код, а не копия.
 *
 * Запуск:
 *   node scripts/verify-push-routes.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_TOPICS = path.resolve(ROOT, '../../fiztex-back/src/main/java/com/fiztex/notification/scenario/api/NotificationTopic.java');

const anything = () => new Proxy(function stub() { return null; }, { get: () => anything() });

function load(relPath, stubs = {}) {
  const file = path.join(ROOT, relPath);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    presets: ['babel-preset-expo'],
    babelrc: false,
    configFile: false,
  });
  const fakeRequire = (id) => {
    if (id.startsWith('@babel/runtime')) return require(id);
    if (Object.prototype.hasOwnProperty.call(stubs, id)) return stubs[id];
    return anything();
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', '__DEV__', code)(fakeRequire, mod, mod.exports, false);
  return mod.exports;
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

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const routes = load('src/shared/push/routes.js');
const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT';

const ROOTS = { STUDENT: 'StudentApp', PARENT: 'ParentApp', TEACHER: 'TeacherApp', ADMIN: 'StaffApp' };

function push(route, params = {}, extra = {}) {
  return { v: 1, nid: '0192f3c8-0000-4000-8000-000000000001', kind: 'GRADE_POSTED', accountId: 1201, route, params, ...extra };
}

function open(role, data, accountId = 1201) {
  return routes.resolvePushTarget(data, { role, accountId, rootRoute: ROOTS[role] });
}

section('Маршрут × роль');
{
  const student = open('STUDENT', push('lesson', { lessonId: 77120 }));
  check('ученик: урок → карточка урока с id фактического урока',
    student.screen === 'lesson' && same(student.payload, { lessonInstanceId: 77120 }), JSON.stringify(student));

  const teacher = open('TEACHER', push('attendance', { lessonId: 77120 }));
  check('учитель: посещаемость → лист посещаемости',
    teacher.screen === 'attendance' && same(teacher.payload, { lessonInstanceId: 77120 }));
  const studentAttendance = open('STUDENT', push('attendance', { lessonId: 77120 }));
  check('ученик: посещаемость → карточка урока (своего листа у ученика нет)', studentAttendance.screen === 'lesson');

  check('ученик: тест → карточка задания, она знает настройки теста',
    same(open('STUDENT', push('homework-test', { homeworkId: 812 })), {
      type: 'open', rootRoute: 'StudentApp', screen: 'homework-card', payload: { homeworkId: 812 }, childId: null,
    }));
  check('учитель: оценки → вкладка «Журнал»', open('TEACHER', push('grades')).tab === 'journal');
  check('ученик: оценка по предмету → вкладка «Оценки» (экрану предмета нужен контекст раздела)',
    open('STUDENT', push('subject', { subjectId: 3 })).tab === 'diary');
  check('опрос → прохождение', same(open('STUDENT', push('survey-take', { surveyId: 44 })).payload, { surveyId: 44 }));
  check('идентификаторы строкой тоже понимаются',
    same(open('STUDENT', push('homework-card', { homeworkId: '812' })).payload, { homeworkId: 812 }));
  check('маршрут решает, а не вид: незнакомый вид со знакомым маршрутом ведёт куда надо',
    open('STUDENT', push('schedule', {}, { kind: 'SOMETHING_NEW' })).tab === 'schedule');
}

section('Родитель и ребёнок');
{
  const parent = open('PARENT', push('homework-card', { homeworkId: 812 }, { accountId: 1201, childProfileId: 604 }));
  check('родителю — выбрать ребёнка из уведомления', parent.childId === 604);
  check('и открыть карточку с этим ребёнком', same(parent.payload, { homeworkId: 812, childId: 604 }));

  const noChild = open('PARENT', push('lesson', { lessonId: 77120 }));
  check('без ребёнка в данных — на «Главную», а не в карточку без контекста',
    noChild.tab === 'home' && noChild.reason === 'incomplete-params', JSON.stringify(noChild));

  const feedback = open('PARENT', push('feedback', {}, { childProfileId: 604 }));
  check('отзывы → «Главная» с выбранным ребёнком (там блок отзывов)', feedback.tab === 'home' && feedback.childId === 604);

  const studentWithChild = open('STUDENT', push('lesson', { lessonId: 1 }, { childProfileId: 604 }));
  check('ученику ребёнок из данных не подставляется', studentWithChild.childId === null && !studentWithChild.payload.childId);
}

section('Незнакомое и чужое');
{
  const unknownRoute = open('STUDENT', push('rocket-launch', { id: 1 }));
  check('незнакомый маршрут → «Главная»', unknownRoute.tab === 'home' && unknownRoute.reason === 'unknown-route');
  const unknownVersion = open('TEACHER', push('lesson', { lessonId: 1 }, { v: 2 }));
  check('незнакомая версия данных → «Главная»', unknownVersion.tab === 'home' && unknownVersion.reason === 'unknown-version');
  check('маршрут, которого у роли нет → «Главная»', open('TEACHER', push('survey-take', { surveyId: 1 })).tab === 'home');
  check('неполные параметры → «Главная»', open('STUDENT', push('lesson', {})).reason === 'incomplete-params');

  const foreign = open('PARENT', push('homework-card', { homeworkId: 812 }, { accountId: 1733, childProfileId: 604 }));
  check('уведомление другому аккаунту (вошёл другой человек) — никуда не вести',
    foreign.type === 'ignore' && foreign.reason === 'foreign-account');
  const noAccount = open('STUDENT', push('lesson', { lessonId: 1 }, { accountId: undefined }));
  check('аккаунт не сверить — только «Главная», не данные',
    noAccount.tab === 'home' && noAccount.reason === 'account-unknown');

  check('не наше уведомление (нет kind) — игнор', open('STUDENT', { title: 'x' }).type === 'ignore');
  const staff = open('ADMIN', push('lesson', { lessonId: 1 }));
  check('служебной роли — открыть её раздел без вкладки', staff.type === 'open' && staff.rootRoute === 'StaffApp' && !staff.tab);
  check('роли без раздела в приложении — игнор',
    routes.resolvePushTarget(push('home'), { role: 'NOBODY', accountId: 1201, rootRoute: null }).type === 'ignore');
}

section('Нажатие и переход');
{
  const tapped = { actionIdentifier: DEFAULT_ACTION, notification: { request: { content: { data: push('home') } } } };
  check('нажатие на уведомление даёт данные', routes.responseData(tapped, DEFAULT_ACTION)?.route === 'home');
  check('кнопка действия — не переход',
    routes.responseData({ ...tapped, actionIdentifier: 'dismiss' }, DEFAULT_ACTION) === null);

  check('вкладка — через Tabs раздела роли', same(routes.navigationArgs({ rootRoute: 'ParentApp', tab: 'grades' }),
    ['ParentApp', { screen: 'Tabs', params: { screen: 'grades' } }]));
  check('экран — с payload, как его ждут экраны', same(
    routes.navigationArgs({ rootRoute: 'TeacherApp', screen: 'lesson', payload: { lessonInstanceId: 5 } }),
    ['TeacherApp', { screen: 'lesson', params: { payload: { lessonInstanceId: 5 } } }]));
  check('без вкладки и экрана — просто раздел', same(routes.navigationArgs({ rootRoute: 'StaffApp' }), ['StaffApp']));

  const cold = { isAuthenticated: false, navigatorReady: false, currentRootRoute: null, rootRoute: 'ParentApp' };
  check('холодный старт: сессия ещё читается — ждать', routes.readyToNavigate(cold) === false);
  check('сессия есть, навигатор не готов — ждать',
    routes.readyToNavigate({ ...cold, isAuthenticated: true }) === false);
  check('ждёт Face ID (открыт экран разблокировки) — ждать',
    routes.readyToNavigate({ ...cold, isAuthenticated: true, navigatorReady: true, currentRootRoute: 'FaceID' }) === false);
  check('открыт раздел роли — переходить',
    routes.readyToNavigate({ ...cold, isAuthenticated: true, navigatorReady: true, currentRootRoute: 'ParentApp' }) === true);
  check('словарь маршрутов не пуст', routes.KNOWN_PUSH_ROUTES.length >= 10, routes.KNOWN_PUSH_ROUTES.join(', '));
}

section('Регистрация телефона');
{
  const Notifications = { IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 } };
  const registration = load('src/shared/push/registration.js', {
    'expo-notifications': Notifications,
    'react-native': { Platform: { OS: 'ios' } },
  });
  const plan = (state) => registration.registrationPlan({
    platform: 'ios', isDevice: true, projectId: 'p-1', permissionGranted: true, ...state,
  });
  check('телефон, проект, разрешение → регистрировать', plan({}).action === 'register');
  check('симулятор → пропустить молча', plan({ isDevice: false }).reason === 'not-a-device');
  check('нет проекта EAS → пропустить', plan({ projectId: null }).reason === 'no-eas-project');
  check('уведомления запрещены → отвязать телефон', plan({ permissionGranted: false }).action === 'unregister');
  check('веб → пропустить', plan({ platform: 'web' }).action === 'skip');

  check('projectId из app.json (extra.eas)',
    registration.resolveProjectId({ expoConfig: { extra: { eas: { projectId: 'abc' } } } }) === 'abc');
  check('projectId сборки EAS', registration.resolveProjectId({ easConfig: { projectId: 'def' } }) === 'def');
  check('нет projectId — null', registration.resolveProjectId({ expoConfig: {} }) === null);

  check('разрешение выдано', registration.isPermissionGranted({ granted: true, status: 'granted' }) === true);
  check('«тихое» разрешение iOS считается выданным',
    registration.isPermissionGranted({ granted: false, status: 'undetermined', ios: { status: 3 } }) === true);
  check('отказ', registration.isPermissionGranted({ granted: false, status: 'denied', ios: { status: 1 } }) === false);
}

section('Установка, аккаунт токена, выбранный ребёнок');
{
  const installation = load('src/shared/push/installationId.js');
  const ids = new Set();
  let allValid = true;
  for (let i = 0; i < 2000; i += 1) {
    const id = installation.randomUuid();
    allValid = allValid && installation.isUuid(id);
    ids.add(id);
  }
  check('идентификатор установки — UUID v4', allValid);
  check('и не повторяется', ids.size === 2000);
  check('мусор из хранилища не принимается за идентификатор', installation.isUuid('not-a-uuid') === false);

  const auth = load('src/features/auth/AuthContext.js', {
    react: { createContext: () => ({ Provider: null }), useContext: () => null, useState: () => [null, () => {}],
      useCallback: (f) => f, useEffect: () => {}, useMemo: (f) => f(), createElement: () => null, default: {} },
  });
  const payload = Buffer.from(JSON.stringify({ accountId: 1201, exp: 9999999999 })).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  check('аккаунт берётся из токена', auth.tokenAccountId(`h.${payload}.s`) === 1201);
  check('токен без аккаунта — null', auth.tokenAccountId('h.e30.s') === null);

  let initial;
  const selected = load('src/shared/state/SelectedChild.js', {
    react: {
      createContext: () => ({ Provider: 'Provider' }),
      useContext: () => null,
      useState: (init) => {
        initial = typeof init === 'function' ? init() : init;
        return [initial, () => {}];
      },
      useEffect: () => {},
      useMemo: (f) => f(),
      default: { createElement: () => null },
      createElement: () => null,
    },
  });
  selected.requestChildSelection(604);
  selected.SelectedChildProvider({ children: null });
  check('холодный старт: раздел родителя появился позже нажатия — ребёнок всё равно выбран', initial === 604);
}

section('Каналы Android = темы бэка');
{
  const channels = load('src/shared/push/channels.js').ANDROID_CHANNELS.map((channel) => channel.id);
  check('есть канал по умолчанию general (app.json → defaultChannel)', channels.includes('general'));
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-notifications');
  check('плагин expo-notifications подключён с этим каналом', plugin?.[1]?.defaultChannel === 'general');
  if (fs.existsSync(BACKEND_TOPICS)) {
    const topics = [...fs.readFileSync(BACKEND_TOPICS, 'utf8').matchAll(/[A-Z_]+\("([a-z-]+)"\)/g)].map((m) => m[1]);
    const missing = topics.filter((topic) => !channels.includes(topic));
    check('у каждой темы бэка есть канал: иначе Android не покажет уведомление', topics.length > 0 && missing.length === 0,
      missing.length ? `нет: ${missing.join(', ')}` : topics.join(', '));
  } else {
    console.log('  · бэкенд рядом не найден — сверка тем пропущена');
  }
}

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
