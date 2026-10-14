#!/usr/bin/env node
/** Approved homework totals, grade loading and the actual learner screen.
 * Run: node scripts/verify-homework-result.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const { hooks, Host, authToken } = require('./verify-homework-submission.cjs');
const root = path.resolve(__dirname, '..');
const jsx = (type, props) => ({ type, props: props || {} });
function load(relative, stubs = {}) {
  const filename = path.join(root, relative);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id === 'react') return hooks;
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (id.startsWith('@babel/runtime')) return require(id);
    throw new Error(`Unexpected import: ${id}`);
  }, mod, mod.exports);
  return mod.exports;
}
function render(element) {
  if (element == null || typeof element !== 'object') return element;
  if (Array.isArray(element)) return element.map(render);
  if (typeof element.type === 'function') return render(element.type(element.props));
  return { ...element, props: { ...element.props, children: render(element.props.children) } };
}
function text(element) {
  if (element == null || element === false) return '';
  if (Array.isArray(element)) return element.map(text).join(' ').replace(/\s+/g, ' ').trim();
  if (typeof element !== 'object') return String(element);
  return text(element.props.children);
}
function find(element, type) {
  if (!element || typeof element !== 'object') return undefined;
  if (Array.isArray(element)) return element.map((item) => find(item, type)).find(Boolean);
  return element.type === type ? element : find(element.props.children, type);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
const theme = { useTheme: () => ({ c: { ink: 'ink', blue: 'blue' } }) };
const tokens = load('src/shared/theme/tokens.js');
const gradesMap = load('src/shared/api/gradesMap.js');
const { HomeworkResultCard } = load('src/shared/components/HomeworkResultCard.js', {
  './ui': { Card: 'Card', OutlineButton: 'OutlineButton' }, './Txt': { Txt: 'Txt' },
  '../theme/ThemeContext': theme, '../theme/tokens': tokens, '../api/gradesMap': gradesMap,
});
const api = { myHomeworkGrades: async () => [] };
const { useMyHomeworkGrade } = load('src/shared/hooks/useGrades.js', {
  '@features/auth/AuthContext': { useAuth: () => ({ token: authToken() }) },
  '@shared/api/gradesApi': { gradesApi: api }, '@shared/api/gradesMap': gradesMap,
});
const defaults = { status: 'DONE', isTest: true, result: { score: 6, maxScore: 8 },
  grade: { scaleCode: '4+', numericValue: 4.5 } };
const card = (props = {}) => render(HomeworkResultCard({ ...defaults, ...props }));
let passed = 0;
async function test(name, run) {
  await run(); passed++; console.log(`✓ ${name}`);
}

(async () => {
  await test('approved card displays points out of maximum and the actual school grade', () => {
    const content = text(card());
    assert.match(content, /Результат: 6 из 8 баллов/);
    assert.match(content, /Оценка: 4\+/);
    assert.doesNotMatch(content, /4\.5/);
  });
  await test('no result or grade before teacher approval, even if supplied in props', () => {
    for (const status of ['NOT_SUBMITTED', 'SUBMITTED', 'RETURNED']) assert.equal(card({ status }), null);
  });
  await test('zero and fractional points are displayed, not mistaken for missing results', () => {
    assert.match(text(card({ result: { score: 0, maxScore: 3 } })), /0 из 3 баллов/);
    assert.match(text(card({ result: { score: 2.5, maxScore: 3 } })), /2,5 из 3 баллов/);
    assert.match(text(card({ grade: { score: 0, maxScore: 10 } })), /Оценка: 0/);
    assert.match(text(card({ grade: { score: 12, maxScore: 20 } })), /Оценка: 12\/20/);
  });
  await test('missing totals and grades are honest empty states', () => {
    const content = text(card({ result: null, grade: null }));
    assert.match(content, /Баллы пока не выставлены/);
    assert.match(content, /Оценка пока не выставлена/);
    assert.doesNotMatch(content, /0 из/);
    assert.doesNotMatch(text(card({ isTest: false })), /баллов|Баллы/);
  });
  await test('grade loading and errors preserve totals and provide an actual retry', () => {
    const loading = text(card({ grade: null, gradeLoading: true }));
    assert.match(loading, /Загружаем оценку/);
    assert.doesNotMatch(loading, /пока не выставлена/);
    let retries = 0;
    const error = card({ grade: null, gradeError: 'Offline', onRetry: () => retries++ });
    assert.match(text(error), /Результат: 6 из 8 баллов/);
    assert.match(text(error), /Не удалось обновить оценку/);
    find(error, 'OutlineButton').props.onPress();
    assert.equal(retries, 1);
  });
  await test('the summary never renders question keys or per-question feedback', () => {
    const content = text(card({ result: { score: 6, maxScore: 8,
      answers: [{ correct: true, text: 'SECRET ANSWER' }], aiSuggestedScore: 100 } }));
    assert.doesNotMatch(content, /SECRET|correct|100/);
  });

  await test('grade query waits for approval and loads once it is enabled', async () => {
    let enabled = false, calls = 0;
    api.myHomeworkGrades = async () => { calls++; return [{ scaleCode: '4+' }]; };
    const host = new Host(() => useMyHomeworkGrade(27, { enabled }));
    try {
      await settle(); assert.equal(host.render().grade, null); assert.equal(calls, 0);
      enabled = true; assert.equal(host.render().loading, true);
      await settle(); assert.equal(host.render().grade.scaleCode, '4+'); assert.equal(calls, 1);
    } finally { host.dispose(); }
  });
  await test('a response from another homework cannot replace the current grade', async () => {
    let homeworkId = 27;
    const old = deferred();
    api.myHomeworkGrades = (_, id) => id === 27 ? old.promise : Promise.resolve([{ scaleCode: '5' }]);
    const host = new Host(() => useMyHomeworkGrade(homeworkId));
    try {
      homeworkId = 28; assert.equal(host.render().grade, null);
      await settle(); assert.equal(host.render().grade.scaleCode, '5');
      old.resolve([{ scaleCode: '2' }]); await settle();
      assert.equal(host.render().grade.scaleCode, '5');
    } finally { host.dispose(); }
  });
  await test('refresh picks up a confirmed grade; an empty response clears a removed grade', async () => {
    api.myHomeworkGrades = async () => [];
    const host = new Host(() => useMyHomeworkGrade(27));
    try {
      await settle(); assert.equal(host.render().grade, null);
      api.myHomeworkGrades = async () => [{ score: 8, maxScore: 10 }];
      await host.value.reload(true); assert.equal(host.render().grade.score, 8);
      api.myHomeworkGrades = async () => [];
      await host.value.reload(true); assert.equal(host.render().grade, null);
    } finally { host.dispose(); }
  });
  await test('failed grade refresh is visible, and access denial clears a cached grade', async () => {
    api.myHomeworkGrades = async () => [{ scaleCode: '4+' }];
    const host = new Host(() => useMyHomeworkGrade(27));
    try {
      await settle(); host.render();
      api.myHomeworkGrades = async () => { throw new Error('Offline'); };
      await host.value.reload(true); assert.equal(host.render().grade.scaleCode, '4+');
      assert.ok(host.value.error);
      api.myHomeworkGrades = async () => { throw { status: 403 }; };
      await host.value.reload(true); assert.equal(host.render().grade, null);
    } finally { host.dispose(); }
  });

  await test('the learner screen renders confirmed totals and refreshes both sources on return', () => {
    let focus, cardReloads = 0, gradeReloads = 0;
    const data = { id: 27, answerFormat: 'TEST', title: 'Test', materials: [], submission: {
      status: 'DONE', canSubmit: false, testResult: { score: 6, maxScore: 8 }, history: [],
    } };
    const { StudentHomeworkDetailScreen } = load('src/features/homework/StudentHomeworkDetailScreen.js', {
      '@react-navigation/native': { useFocusEffect: (callback) => { focus = callback; } },
      'react-native': { View: 'View', ScrollView: 'ScrollView', RefreshControl: 'RefreshControl',
        Pressable: 'Pressable', KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'web' } },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
      '@shared/theme/ThemeContext': theme, '@shared/theme/tokens': tokens,
      '@shared/components/Screen': { Screen: 'Screen' }, '@shared/components/Txt': { Txt: 'Txt' },
      '@shared/components/Icon': { default: 'Icon', __esModule: true },
      '@shared/components/ui': { ConfirmDialog: 'ConfirmDialog' },
      '@shared/math/MathText': { MathText: 'MathText' },
      '@shared/components/HomeworkResultCard': { HomeworkResultCard },
      '@features/auth/AuthContext': { useAuth: () => ({ token: authToken() }) },
      '@shared/api/homeworkApi': { authHeaders: () => ({}) },
      '@shared/api/homeworkMap': load('src/shared/api/homeworkMap.js'),
      '@shared/hooks/useHomework': { useMyHomework: () => ({ data, reload: () => cardReloads++ }),
        useHomeworkSubmit: () => ({}) },
      '@shared/hooks/useGrades': { useMyHomeworkGrade: () => ({ grade: { scaleCode: '4+' },
        reload: () => gradeReloads++ }) },
      './components': Object.fromEntries(['Divider', 'StatusChip', 'SectionLabel', 'StatusHint']
        .map((name) => [name, name])),
      './HomeworkStates': {}, './useHomeworkAnticheat': { useHomeworkAnticheat: () => ({}) },
      './attachments': {},
    });
    const host = new Host(() => StudentHomeworkDetailScreen({ nav: { back: () => {} }, payload: { homeworkId: 27 } }));
    try {
      const content = text(render(host.value));
      assert.match(content, /Результат: 6 из 8 баллов/); assert.match(content, /Оценка: 4\+/);
      focus(); assert.equal(cardReloads, 0); focus();
      assert.equal(cardReloads, 1); assert.equal(gradeReloads, 1);
      data.submission.status = 'SUBMITTED';
      const waiting = text(render(host.render()));
      assert.doesNotMatch(waiting, /6 из 8|Оценка: 4/);
      assert.match(waiting, /Ожидает проверки/);
    } finally { host.dispose(); }
  });
  console.log(`\n${passed} passed, 0 failed`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
