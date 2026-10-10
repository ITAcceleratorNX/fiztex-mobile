#!/usr/bin/env node
/** Regression checks for mounted homework screens after submitting a test.
 * Run: node scripts/verify-homework-submission.cjs
 * Like the other verify scripts, runs the real Babel-compiled source with API mocks.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

let currentHost;
const equalDeps = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const hooks = {
  useState(initial) {
    const host = currentHost;
    const i = host.index++;
    if (!host.slots[i]) host.slots[i] = { value: typeof initial === 'function' ? initial() : initial };
    return [host.slots[i].value, (next) => {
      host.slots[i].value = typeof next === 'function' ? next(host.slots[i].value) : next;
    }];
  },
  useRef(initial) {
    const host = currentHost;
    const i = host.index++;
    return (host.slots[i] ??= { current: initial });
  },
  useCallback(callback, deps) {
    const host = currentHost;
    const i = host.index++;
    if (!equalDeps(host.slots[i]?.deps, deps)) host.slots[i] = { callback, deps };
    return host.slots[i].callback;
  },
  useMemo(compute, deps) {
    const host = currentHost;
    const i = host.index++;
    if (!equalDeps(host.slots[i]?.deps, deps)) host.slots[i] = { value: compute(), deps };
    return host.slots[i].value;
  },
  useEffect(effect, deps) {
    const host = currentHost;
    const i = host.index++;
    if (equalDeps(host.slots[i]?.deps, deps)) return;
    host.effects.push(() => {
      host.slots[i]?.cleanup?.();
      host.slots[i] = { deps, cleanup: effect() };
    });
  },
};
const api = {};
const filename = path.resolve(__dirname, '../src/shared/hooks/useHomework.js');
const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  filename, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
});
const compiled = { exports: {} };
new Function('require', 'module', 'exports', code)((id) => {
  if (id === 'react') return hooks;
  if (id === '@features/auth/AuthContext') return { useAuth: () => ({ token: currentHost.token }) };
  if (id === '@shared/api/homeworkApi') return { homeworkApi: api };
  if (id.startsWith('@babel/runtime')) return require(id);
  throw new Error(`Unexpected import: ${id}`);
}, compiled, compiled.exports);
const { useHomeworkTest, useMyHomework, useHomeworkList, useLessonAssignments } = compiled.exports;

class Host {
  constructor(render, token = 'student-a') {
    this.renderHook = render;
    this.token = token;
    this.slots = [];
    this.effects = [];
    this.render();
  }
  render() {
    this.index = 0;
    currentHost = this;
    this.value = this.renderHook();
    currentHost = null;
    this.effects.splice(0).forEach((effect) => effect());
    return this.value;
  }
  dispose() { this.slots.forEach((slot) => slot?.cleanup?.()); }
}
module.exports = { hooks, Host, authToken: () => currentHost?.token };
function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
const result = { attemptId: 301, attemptNumber: 1, submittedAt: '2026-10-10T10:00:00Z', answers: [] };
const card = (id = 27) => ({ id, title: 'Test', answerFormat: 'TEST', submission: {
  status: 'NOT_SUBMITTED', canSubmit: true, attemptCount: 0, currentAttempt: null, history: [],
} });
const row = (id = 27) => ({ id, status: 'PUBLISHED', submissionStatus: 'NOT_SUBMITTED' });
let hosts = [];
function mount(render, token) {
  const host = new Host(render, token);
  hosts.push(host);
  return host;
}
function defaults() {
  api.myOne = async (_, id) => card(id);
  api.myQuestions = async () => [{ id: 1, type: 'OPEN_TEXT' }];
  api.my = async (_, params) => ({ content: params.scope === 'HISTORY' ? [] : [row()] });
  api.submitAnswers = async () => result;
}
let passed = 0, failed = 0;
async function test(name, run) {
  defaults();
  try { await run(); passed++; console.log(`✓ ${name}`); }
  catch (error) { failed++; console.error(`✗ ${name}: ${error.message}`); }
  finally { hosts.forEach((host) => host.dispose()); hosts = []; }
}

if (require.main === module) (async () => {
  await test('card, list and lesson update before background GET requests finish', async () => {
    const detail = mount(() => useMyHomework(27));
    const list = mount(() => useHomeworkList());
    const lesson = mount(() => useLessonAssignments(5));
    const testScreen = mount(() => useHomeworkTest(27));
    await settle(); hosts.forEach((host) => host.render());
    const pending = deferred();
    api.myOne = api.my = () => pending.promise;
    const send = deferred();
    api.submitAnswers = () => send.promise;
    const sending = testScreen.value.submit([{ questionId: 1, openText: 'Answer' }]);
    assert.equal(detail.render().data.submission.canSubmit, true, 'pending submission is not complete');
    send.resolve(result);
    assert.equal(await sending, true);
    const submission = detail.render().data.submission;
    assert.equal(submission.canSubmit, false, 'repeat test action must disappear immediately');
    assert.equal(submission.status, 'SUBMITTED', 'submitted is not a teacher-approved DONE status');
    assert.equal(submission.currentAttempt.id, result.attemptId);
    assert.equal(submission.lastSubmittedAt, result.submittedAt);
    assert.equal(list.render().rows[0].submissionStatus, 'SUBMITTED');
    assert.equal(lesson.render().rows[0].submissionStatus, 'SUBMITTED');
  });

  await test('failed submission preserves eligibility and retries with the same idempotency key', async () => {
    const detail = mount(() => useMyHomework(27));
    const testScreen = mount(() => useHomeworkTest(27));
    await settle(); hosts.forEach((host) => host.render());
    const keys = [];
    api.submitAnswers = async (_, __, payload) => {
      keys.push(payload.clientToken);
      if (keys.length === 1) throw new Error('Network unavailable');
      return result;
    };
    assert.equal(await testScreen.value.submit([]), false);
    assert.equal(testScreen.render().sendError, 'Network unavailable');
    assert.equal(detail.render().data.submission.canSubmit, true);
    assert.equal(await testScreen.value.submit([]), true);
    assert.equal(keys[0], keys[1]);
  });

  await test('background refresh failure keeps the confirmed submitted state visible', async () => {
    const detail = mount(() => useMyHomework(27));
    const list = mount(() => useHomeworkList());
    const lesson = mount(() => useLessonAssignments(5));
    const testScreen = mount(() => useHomeworkTest(27));
    await settle(); hosts.forEach((host) => host.render());
    api.myOne = api.my = async () => { throw new Error('Offline'); };
    assert.equal(await testScreen.value.submit([]), true);
    await settle();
    assert.equal(detail.render().data.submission.canSubmit, false);
    assert.equal(detail.value.error, null);
    assert.equal(list.render().rows[0].submissionStatus, 'SUBMITTED');
    assert.equal(lesson.render().rows[0].submissionStatus, 'SUBMITTED');
  });

  await test('an older GET response cannot restore the repeat-test action or old list status', async () => {
    const detail = mount(() => useMyHomework(27));
    const list = mount(() => useHomeworkList());
    const lesson = mount(() => useLessonAssignments(5));
    const testScreen = mount(() => useHomeworkTest(27));
    await settle(); hosts.forEach((host) => host.render());
    const oldCard = deferred(), oldList = deferred();
    api.myOne = () => oldCard.promise;
    api.my = () => oldList.promise;
    const earlierRequests = [detail.value.reload(true), list.value.reload(true), lesson.value.reload(true)];
    api.myOne = async () => ({ ...card(), submission: { status: 'SUBMITTED', canSubmit: false } });
    api.my = async () => ({ content: [{ ...row(), submissionStatus: 'SUBMITTED' }] });
    assert.equal(await testScreen.value.submit([]), true);
    await settle();
    oldCard.resolve(card()); oldList.resolve({ content: [row()] });
    await Promise.all(earlierRequests);
    assert.equal(detail.render().data.submission.canSubmit, false);
    assert.equal(list.render().rows[0].submissionStatus, 'SUBMITTED');
    assert.equal(lesson.render().rows[0].submissionStatus, 'SUBMITTED');
  });

  await test('another homework and another session are not marked submitted', async () => {
    const another = mount(() => useMyHomework(28));
    const anotherSession = mount(() => useMyHomework(27), 'student-b');
    const testScreen = mount(() => useHomeworkTest(27));
    await settle(); hosts.forEach((host) => host.render());
    assert.equal(await testScreen.value.submit([]), true);
    assert.equal(another.render().data.submission.canSubmit, true);
    assert.equal(anotherSession.render().data.submission.canSubmit, true);
  });

  await test('teacher return from fresh server data permits a new attempt', async () => {
    const detail = mount(() => useMyHomework(27));
    const testScreen = mount(() => useHomeworkTest(27));
    await settle(); hosts.forEach((host) => host.render());
    assert.equal(await testScreen.value.submit([]), true);
    await settle();
    api.myOne = async () => ({ ...card(), submission: { status: 'RETURNED', canSubmit: true, attemptCount: 1 } });
    await detail.value.reload(true);
    assert.equal(detail.render().data.submission.status, 'RETURNED');
    assert.equal(detail.value.data.submission.canSubmit, true);
  });

  await test('resubmission replaces the current attempt but retains previous history', async () => {
    const previous = { id: 299, attemptNumber: 1, reviews: [{ decision: 'RETURNED' }] };
    api.myOne = async () => ({ ...card(), submission: { status: 'RETURNED', canSubmit: true,
      attemptCount: 1, currentAttempt: previous, history: [previous] } });
    const detail = mount(() => useMyHomework(27));
    const testScreen = mount(() => useHomeworkTest(27));
    await settle(); hosts.forEach((host) => host.render());
    const pending = deferred(); api.myOne = () => pending.promise;
    api.submitAnswers = async () => ({ ...result, attemptNumber: 2 });
    assert.equal(await testScreen.value.submit([]), true);
    const submission = detail.render().data.submission;
    assert.equal(submission.canSubmit, false);
    assert.equal(submission.resubmitted, true);
    assert.equal(submission.attemptCount, 2);
    assert.equal(submission.currentAttempt.id, 301);
    assert.deepEqual(submission.currentAttempt.reviews, []);
    assert.deepEqual(submission.history.map((attempt) => attempt.id), [299, 301]);
    assert.deepEqual(previous.reviews, [{ decision: 'RETURNED' }]);
  });

  await test('repeated confirmation while sending does not create another request', async () => {
    const testScreen = mount(() => useHomeworkTest(27));
    await settle(); testScreen.render();
    const pending = deferred(); let calls = 0;
    api.submitAnswers = () => { calls++; return pending.promise; };
    const first = testScreen.value.submit([]);
    const second = testScreen.value.submit([]);
    pending.resolve(result);
    assert.equal(await first, true);
    assert.equal(await second, false);
    assert.equal(calls, 1);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})().catch((error) => { console.error(error); process.exitCode = 1; });
