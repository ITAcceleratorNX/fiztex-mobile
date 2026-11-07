#!/usr/bin/env node
/**
 * Проверка переходов к вкладкам: возврат к «Главной» не должен копить экраны в стеке.
 *
 * Тот же приём, что у остальных `verify-*.cjs`: настоящий `makeNav` компилируется проектным
 * babel-пресетом, а действие, которое он отправляет, прогоняется через **настоящий**
 * `StackRouter` из React Navigation. Поэтому проверяется не форма объекта, а то, каким
 * получится стек, — ради чего правка и делалась.
 *
 * Запуск:
 *   node scripts/verify-navigation.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');
const { CommonActions, StackActions, StackRouter } = require('@react-navigation/routers');

const ROOT = path.resolve(__dirname, '..');

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

const { makeNav } = load('src/app/navigation/withNav.js', {
  '@react-navigation/native': { CommonActions, StackActions, useNavigation: () => null, useRoute: () => null },
});

/** Навигатор-двойник: запоминает отправленное действие, как это делает настоящий `navigation`. */
function fakeNavigation() {
  const sent = [];
  return {
    sent,
    dispatch: (action) => sent.push(action),
    navigate: (name, params) => sent.push({ type: 'NAVIGATE', payload: { name, params } }),
    goBack: () => sent.push({ type: 'GO_BACK' }),
    canGoBack: () => true,
  };
}

const ROUTE_NAMES = ['Tabs', 'notifications', 'lesson'];
const OPTIONS = {
  routeNames: ROUTE_NAMES,
  routeParamList: {},
  routeGetIdList: {},
};

const router = StackRouter({});

/** Стек «вкладки → центр уведомлений», как после нажатия на колокольчик с «Главной». */
function stackWithNotifications() {
  const initial = router.getInitialState(OPTIONS);
  return router.getStateForAction(initial, StackActions.push('notifications'), OPTIONS);
}

function apply(state, action) {
  const next = router.getStateForAction(state, action, OPTIONS);
  // `null` — действие этому навигатору не подошло и ушло бы наверх; для `Tabs` в стеке
  // такого быть не должно.
  return next === null ? null : router.getRehydratedState(next, OPTIONS);
}

let failed = 0;
function check(name, ok) {
  if (!ok) failed += 1;
  console.log(`${ok ? '  ok' : 'FAIL'}  ${name}`);
}

console.log('Переходы к вкладкам (makeNav)\n');

const opened = stackWithNotifications();
check('колокольчик кладёт центр уведомлений поверх вкладок',
  opened.routes.map((r) => r.name).join(',') === 'Tabs,notifications');

const nav = makeNav(fakeNavigation());
const sender = fakeNavigation();
makeNav(sender).tabs('home');
const [action] = sender.sent;

check('nav.tabs отправляет POP_TO, а не NAVIGATE', action?.type === 'POP_TO');
check('целится во вкладки раздела', action?.payload?.name === 'Tabs');
check('передаёт выбранную вкладку', action?.payload?.params?.screen === 'home');

const afterPop = apply(opened, action);
check('после перехода на «Главную» центр уведомлений закрыт',
  afterPop?.routes.map((r) => r.name).join(',') === 'Tabs');
check('вкладки стали текущим экраном', afterPop?.index === 0);
check('вкладка дошла до навигатора вкладок',
  afterPop?.routes[0]?.params?.screen === 'home');

/**
 * То, ради чего правка: в React Navigation 7 `navigate` больше не возвращается к экрану,
 * который уже лежит в стеке. Этот случай закреплён, чтобы никто не «упростил» `popTo`
 * обратно до `navigate`, увидев, что главная всё равно открывается.
 */
const afterNavigate = apply(opened, CommonActions.navigate('Tabs', { screen: 'home' }));
check('navigate вместо popTo положил бы вторые вкладки поверх центра',
  afterNavigate?.routes.map((r) => r.name).join(',') === 'Tabs,notifications,Tabs');

const withPayload = fakeNavigation();
makeNav(withPayload).tabs('grades', { subjectId: 7 });
check('полезная нагрузка вкладки доезжает как payload',
  withPayload.sent[0]?.payload?.params?.params?.payload?.subjectId === 7);

/** Со вкладки `Tabs` в стеке уже текущий: переход обязан остаться на месте, сменив вкладку. */
const onTabs = router.getInitialState(OPTIONS);
const fromTab = apply(onTabs, action);
check('со вкладки на вкладку — без нового экрана',
  fromTab?.routes.length === 1 && fromTab.routes[0].params?.screen === 'home');

check('nav.back уходит назад, пока есть куда', (() => {
  const back = fakeNavigation();
  makeNav(back).back();
  return back.sent[0]?.type === 'GO_BACK';
})());

check('nav сам по себе по-прежнему открывает экран поверх', (() => {
  const push = fakeNavigation();
  makeNav(push)('lesson', { lessonInstanceId: 3 });
  return push.sent[0]?.type === 'NAVIGATE' && push.sent[0].payload.name === 'lesson';
})());

check('у nav нет мёртвого reset', typeof nav.reset === 'undefined');

console.log(failed ? `\n${failed} проверок не прошло` : '\nВсе проверки прошли');
process.exit(failed ? 1 : 0);
