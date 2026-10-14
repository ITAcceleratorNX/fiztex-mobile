const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const compiled = new Map();

function runtime() {
  const cache = new Map();
  const slots = [];
  let cursor = 0;
  const stored = new Map();
  const writes = [];
  const calls = [];
  const react = {
    createContext: () => ({ Provider: 'Provider' }), useContext: () => null,
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useEffect: () => {}, useCallback: (fn) => fn, useMemo: (fn) => fn(),
  };
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} };
    cache.set(filename, mod);
    if (!compiled.has(filename)) compiled.set(filename, babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, presets: ['babel-preset-expo'], configFile: false, babelrc: false }).code);
    const req = (id) => {
      if (id.startsWith('@babel/runtime')) return require(id);
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (id === 'react-native') return { Platform: { OS: 'ios' } };
      if (id === 'expo-constants') return { expoConfig: {} };
      if (id === 'expo/virtual/env') return { env: {} };
      if (id === '@shared/storage/secureStore') return { getItemAsync: async (key) => stored.get(key), setItemAsync: async (key, value) => { writes.push(['set', key]); stored.set(key, value); }, deleteItemAsync: async (key) => { writes.push(['delete', key]); stored.delete(key); } };
      if (id === '@shared/push/registration') return { unregisterThisDevice: async (token) => calls.push(['unregister', token]) };
      if (id === './biometrics') return { getBiometricsEnabled: async () => false, setBiometricsEnabled: async () => writes.push(['biometrics']), getBiometricAvailability: async () => ({ available: false, types: [] }), biometricLabel: () => 'Face ID' };
      let resolved;
      if (id.startsWith('@shared/')) resolved = path.join(root, 'src/shared', id.slice(8));
      else if (id.startsWith('@features/')) resolved = path.join(root, 'src/features', id.slice(10));
      else if (id.startsWith('.')) resolved = path.resolve(path.dirname(filename), id);
      else throw new Error(`Unexpected import ${id}`);
      return load(resolved.endsWith('.js') ? resolved : `${resolved}.js`);
    };
    const fetch = async (...args) => { calls.push(['fetch', ...args]); return { status: 200, ok: true, text: async () => '{"live":true}' }; };
    new Function('require', 'module', 'exports', '__DEV__', 'fetch', compiled.get(filename))(req, mod, mod.exports, false, fetch);
    return mod.exports;
  }
  const session = load('src/shared/demo/session.js');
  const client = load('src/shared/api/client.js');
  const renderAuth = () => { cursor = 0; return load('src/features/auth/AuthContext.js').AuthProvider({ children: null }).props.value; };
  return { load, session, client, calls, stored, writes, renderAuth };
}

test('demo core pages and unknown routes never reach fetch; ordinary API works after exit', async () => {
  const r = runtime(); const { token } = r.session.beginDemo('STUDENT', { reset: true });
  for (const url of ['/api/me/profile', '/api/schedule/me/today', '/api/schedule/me/week', '/api/lessons/current', '/api/homework/my', '/api/grades/my/subjects', '/api/gradebook/my/diary', '/api/attendance/summary', '/api/notifications', '/api/surveys/my']) await r.client.request(url, { token });
  await assert.rejects(r.client.request('/api/not-implemented', { token }), { code: 'DEMO_UNSUPPORTED' });
  await assert.rejects(r.client.request('/api/auth/login', { method: 'POST', body: {}, token: 'real' }));
  assert.equal(r.calls.length, 0);
  r.session.endDemo();
  await assert.rejects(r.client.request('/api/me/profile', { token }));
  assert.equal(r.calls.length, 0, 'an expired demo capability cannot fall through to production');
  assert.deepEqual(await r.client.request('/api/me/profile', { token: 'real' }), { live: true });
  assert.equal(r.calls.length, 1);
});

test('student submits, teacher returns, student resubmits, teacher accepts and parent sees only review', async () => {
  const r = runtime(); const hw = r.load('src/shared/api/homeworkApi.js').homeworkApi;
  let { token } = r.session.beginDemo('STUDENT', { reset: true });
  let sub = await hw.submit(token, 301, { body: '30 и 120', clientToken: 'submission-a' });
  assert.equal(sub.status, 'SUBMITTED');
  assert.equal(sub.currentAttempt.body, '30 и 120');
  const oldToken = token;
  ({ token } = r.session.beginDemo('TEACHER'));
  await assert.rejects(hw.my(oldToken));
  const roster = await hw.roster(token, 301);
  assert.equal(roster.submitted, 2);
  await assert.rejects(hw.review(token, 301, 101, { decision: 'RETURNED', expectedAttemptId: sub.currentAttempt.id, comment: '' }));
  sub = await hw.review(token, 301, 101, { decision: 'RETURNED', expectedAttemptId: sub.currentAttempt.id, comment: 'Добавьте ход решения' });
  ({ token } = r.session.beginDemo('STUDENT'));
  assert.equal((await hw.myOne(token, 301)).submission.canSubmit, true);
  sub = await hw.submit(token, 301, { body: '150 × 0,2 = 30; 30 / 0,25 = 120' });
  assert.equal(sub.attemptCount, 2);
  assert.equal(sub.history.length, 1);
  ({ token } = r.session.beginDemo('TEACHER'));
  await assert.rejects(hw.review(token, 301, 101, { decision: 'DONE', expectedAttemptId: 0 }));
  await hw.review(token, 301, 101, { decision: 'DONE', expectedAttemptId: sub.currentAttempt.id, comment: 'Теперь верно!' });
  ({ token } = r.session.beginDemo('PARENT'));
  const child = await hw.childOne(token, 301, 101);
  assert.equal(child.work.status, 'DONE');
  assert.equal(child.work.lastReview.comment, 'Теперь верно!');
  assert.equal(child.submission, undefined);
  assert.equal(child.work.body, undefined);
  assert.equal(r.calls.length, 0);
});

test('attendance draft is private, publication is complete and parents see published versions', async () => {
  const r = runtime(); const api = r.load('src/shared/api/attendanceApi.js').attendanceApi;
  let { token } = r.session.beginDemo('TEACHER', { reset: true });
  let sheet = await api.sheet(token, 201);
  await assert.rejects(api.publish(token, 201, { expectedVersion: sheet.version }), { code: 'ATTENDANCE_INCOMPLETE' });
  sheet = await api.markAllPresent(token, 201, { expectedVersion: sheet.version });
  sheet = await api.saveDraft(token, 201, { expectedVersion: sheet.version, entries: [{ studentProfileId: 101, status: 'ABSENT', reason: 'ILLNESS' }] });
  const teacherToken = token;
  ({ token } = r.session.beginDemo('PARENT'));
  assert.equal((await api.myLessonMark(token, 201, 101)).attendance, null);
  ({ token } = r.session.beginDemo('TEACHER'));
  await assert.rejects(api.publish(teacherToken, 201, { expectedVersion: sheet.version }));
  sheet = await api.publish(token, 201, { expectedVersion: sheet.version });
  ({ token } = r.session.beginDemo('PARENT'));
  assert.equal((await api.myLessonMark(token, 201, 101)).attendance.reason, 'ILLNESS');
  assert.equal((await api.myLessonMark(token, 203, 102)).attendance, null);
  assert.equal(r.calls.length, 0);
});

test('grades propagate to diary and journal; edits and deletion update the same records', async () => {
  const r = runtime(); const { gradesApi, gradebookApi } = r.load('src/shared/api/gradesApi.js');
  let { token } = r.session.beginDemo('TEACHER', { reset: true });
  const grade = await gradesApi.create(token, { studentProfileId: 101, lessonId: 201, value: { scaleCode: '4' }, gradeType: 'LESSON_WORK' });
  const journal = await gradebookApi.journal(token, { classId: 11, subjectId: 21, academicPeriodId: 2 });
  assert.ok(journal.rows[0].cells.some((cell) => cell.grades.some((item) => item.id === grade.id)));
  ({ token } = r.session.beginDemo('STUDENT'));
  assert.ok((await gradebookApi.myDiary(token)).entries.some((item) => item.grade.id === grade.id));
  await assert.rejects(gradesApi.create(token, { studentProfileId: 101, lessonId: 201, value: { scaleCode: '5' } }), { status: 403 });
  ({ token } = r.session.beginDemo('TEACHER'));
  await gradesApi.update(token, grade.id, { value: { scaleCode: '5' } });
  assert.equal((await gradesApi.lessonSheet(token, 201)).students[0].grades[0].scaleCode, '5');
  await gradesApi.remove(token, grade.id);
  assert.equal((await gradesApi.lessonSheet(token, 201)).students[0].grades.length, 0);
  assert.equal(r.calls.length, 0);
});

test('parent children have distinct schedule, homework and grades; reset creates fresh scenario', async () => {
  const r = runtime(); let { token } = r.session.beginDemo('PARENT', { reset: true });
  const hw = r.load('src/shared/api/homeworkApi.js').homeworkApi;
  const first = await hw.children(token, 101); const second = await hw.children(token, 102);
  assert.ok(first.content.every((item) => item.className === '7А'));
  assert.ok(second.content.every((item) => item.className === '5Б'));
  first.content[0].title = 'changed externally';
  assert.notEqual((await hw.children(token, 101)).content[0].title, 'changed externally');
  ({ token } = r.session.beginDemo('STUDENT'));
  await hw.submit(token, 301, { body: 'answer' });
  const stale = token;
  ({ token } = r.session.beginDemo('STUDENT', { reset: true }));
  assert.equal((await hw.myOne(token, 301)).submission.status, 'NOT_SUBMITTED');
  await assert.rejects(hw.myOne(stale, 301));
  assert.equal(r.calls.length, 0);
});

test('native multipart media resolves locally and demo tokens never appear in media headers', async () => {
  const r = runtime(); const { token } = r.session.beginDemo('STUDENT', { reset: true });
  const result = await r.client.requestMultipart('/api/homework/301/my-submission', { _parts: [['photos', { uri: 'file:///demo-answer.jpg', name: 'answer.jpg', type: 'image/jpeg' }]] }, { token });
  const { homeworkFiles, authHeaders } = r.load('src/shared/api/homeworkApi.js');
  const photo = result.currentAttempt.photos[0];
  assert.equal(homeworkFiles.myAttachment(301, photo.id), 'file:///demo-answer.jpg');
  assert.equal(authHeaders(token), undefined);
  assert.ok(homeworkFiles.material(301, 999).startsWith('data:'));
  assert.ok(r.load('src/shared/api/lessonApi.js').lessonFiles.textbook(201, 1).startsWith('data:'));
  assert.equal(r.calls.length, 0);
});

test('demo enter, role switch and exit preserve real session, SecureStore and biometric settings', async () => {
  const r = runtime(); let auth = r.renderAuth();
  await auth.signInWithResponse({ token: 'real-token', role: 'PARENT', fullName: 'Настоящий родитель' });
  auth = r.renderAuth(); assert.equal(auth.token, 'real-token');
  const storage = [...r.stored.entries()]; const writes = r.writes.length;
  auth.startDemo('STUDENT', { reset: true });
  auth = r.renderAuth(); assert.equal(auth.isDemo, true); assert.equal(auth.role, 'STUDENT');
  auth.startDemo('TEACHER');
  auth = r.renderAuth(); assert.equal(auth.role, 'TEACHER');
  await auth.enableBiometrics(); await auth.disableBiometrics(); await auth.signOut();
  auth = r.renderAuth(); assert.equal(auth.isDemo, false); assert.equal(auth.token, 'real-token');
  assert.deepEqual([...r.stored.entries()], storage); assert.equal(r.writes.length, writes);
  assert.equal(r.calls.length, 0);
});
