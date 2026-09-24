const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');

function load(file, imports) {
  const filename = path.join(root, file);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => {
    if (id.startsWith('@babel/runtime')) return require(id);
    if (id in imports) return imports[id];
    throw new Error('Unexpected import: ' + id);
  }, mod, mod.exports);
  return mod.exports;
}

// Exercise the actual API wrapper: parent context must travel with the lesson.
const calls = [];
const { lessonApi } = load('src/shared/api/lessonApi.js', {
  './client': { request: (...args) => { calls.push(args); } },
  './config': { API_BASE_URL: 'http://localhost:8080' },
});
lessonApi.summary('token', 12, 9);
assert.deepEqual(calls[0], ['/api/lessons/12/summary?childId=9', { token: 'token' }]);

// A small hook host makes async response ordering testable without native UI dependencies.
const slots = [];
let cursor = 0;
let effects = [];
let token = 'teacher';
const equal = (a, b) => a && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
const react = {
  useState(initial) {
    const index = cursor++;
    if (!slots[index]) slots[index] = { value: initial };
    return [slots[index].value, (next) => {
      slots[index].value = typeof next === 'function' ? next(slots[index].value) : next;
    }];
  },
  useRef(initial) {
    const index = cursor++;
    if (!slots[index]) slots[index] = { current: initial };
    return slots[index];
  },
  useMemo(factory, deps) {
    const index = cursor++;
    if (!equal(slots[index]?.deps, deps)) slots[index] = { deps, value: factory() };
    return slots[index].value;
  },
  useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
};
function focusEffect(callback) {
  const index = cursor++;
  if (slots[index]?.callback === callback) return;
  slots[index]?.cleanup?.();
  slots[index] = { callback };
  effects.push(() => { slots[index].cleanup = callback(); });
}
const requests = [];
const { useLessonSummary } = load('src/shared/hooks/useLessonSummary.js', {
  react,
  '@react-navigation/native': { useFocusEffect: focusEffect },
  '@features/auth/AuthContext': { useAuth: () => ({ token }) },
  '@shared/api/lessonApi': { lessonApi: { summary: (...args) => new Promise((resolve, reject) => {
    requests.push({ args, resolve, reject });
  }) } },
});
function render(id = 12, child = 9) {
  cursor = 0; effects = [];
  const view = useLessonSummary(id, child);
  effects.forEach((effect) => effect());
  return view;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

(async () => {
  assert.equal(render().data, null);
  assert.deepEqual(requests[0].args, ['teacher', 12, 9]);
  requests[0].resolve({ content: { title: 'Child A' } });
  await tick();
  let view = render();
  assert.equal(view.data.content.title, 'Child A');
  void view.reload(true);
  // Changing child must immediately hide the old document, even before the request completes.
  assert.equal(render(12, 10).data, null);
  requests[2].resolve({ content: { title: 'Child B' } });
  await tick();
  requests[1].resolve({ content: { title: 'Stale child A response' } });
  await tick();
  view = render(12, 10);
  assert.equal(view.data.content.title, 'Child B');
  void view.reload(true);
  const older = requests.at(-1);
  void view.reload(true);
  requests.at(-1).resolve({ content: { title: 'Newest publication' } });
  await tick();
  older.resolve({ content: { title: 'Old publication' } });
  await tick();
  assert.equal(render(12, 10).data.content.title, 'Newest publication');
  token = null;
  assert.equal(render(12, 10).data, null);
  console.log('✓ Parent context, child switching, stale responses, refresh ordering and logout');
})().catch((error) => { console.error(error); process.exitCode = 1; });
