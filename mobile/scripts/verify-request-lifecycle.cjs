const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const compiled = new Map();
const tick = () => new Promise((resolve) => setImmediate(resolve));
const equal = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));

// Executes the shipped hooks and API wrappers. State changes trigger rerenders,
// unlike the old pure-function checks, so a request/render loop fails this suite.
function host() {
  const slots = [];
  const timers = new Map();
  const listeners = new Set();
  const requests = [];
  let cursor = 0, pendingEffects = [], dirty = false, renderFn, view;
  let now = 0, timerId = 0, mounted = true;
  const auth = { token: 'student', role: 'STUDENT', isAuthenticated: true };
  const navigation = { focused: true, calls: [], navigate: (...args) => navigation.calls.push(args) };
  const appState = {
    currentState: 'active',
    addEventListener(event, listener) {
      assert.equal(event, 'change');
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  const pushListeners = new Set();
  const stored = new Map();
  const device = { isDevice: true };
  const platform = { OS: 'ios' };
  const notifications = {
    native: { type: 'ios', data: 'native-A' },
    granted: true,
    nativeCalls: 0,
    expoCalls: [],
    expoResult: async () => ({ type: 'expo', data: 'expo-A' }),
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
    addPushTokenListener(listener) { pushListeners.add(listener); return { remove: () => pushListeners.delete(listener) }; },
    async getPermissionsAsync() { return { granted: notifications.granted, canAskAgain: false }; },
    async getDevicePushTokenAsync() {
      notifications.nativeCalls += 1;
      assert.ok(notifications.nativeCalls < 10, 'native token getter/listener recursively registered the device');
      notifications.emit(notifications.native);
      return notifications.native;
    },
    async getExpoPushTokenAsync(options) {
      notifications.expoCalls.push(options);
      // Same as Expo's source: a missing devicePushToken queries native, firing the listener.
      if (!options.devicePushToken) await notifications.getDevicePushTokenAsync();
      return notifications.expoResult(options);
    },
    emit(next) { notifications.native = next; [...pushListeners].forEach((listener) => listener(next)); },
  };
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, (next) => {
        assert.ok(mounted, 'late response updated an unmounted hook');
        const value = typeof next === 'function' ? next(slots[i].value) : next;
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; }
      }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { current: initial };
      return slots[i];
    },
    useMemo(factory, deps) {
      const i = cursor++;
      if (!equal(slots[i]?.deps, deps)) slots[i] = { deps, value: factory() };
      return slots[i].value;
    },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(effect, deps) {
      const i = cursor++;
      if (equal(slots[i]?.deps, deps)) return;
      const cleanup = slots[i]?.cleanup;
      slots[i] = { deps };
      pendingEffects.push(() => { cleanup?.(); slots[i].cleanup = effect(); });
    },
  };
  react.useLayoutEffect = react.useEffect;
  const cache = new Map();
  let responder = (url) => {
    if (url === '/api/surveys/my' || url.startsWith('/api/grade-corrections/my')) return [];
    return { status: 'ok', lessons: [], entries: [], subjects: [], fullName: 'Ученик' };
  };
  const request = (url, options) => {
    requests.push({ url, options });
    return Promise.resolve().then(() => responder(url, options));
  };
  function load(relative) {
    const filename = path.join(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    if (!compiled.has(filename)) compiled.set(filename, babel.transformSync(fs.readFileSync(filename, 'utf8'), {
      filename, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
    }).code);
    const mod = { exports: {} };
    const requireModule = (id) => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (id === 'react-native') return { AppState: appState, Platform: platform };
      if (id === 'expo-notifications') return notifications;
      if (id === 'expo-device') return device;
      if (id === 'expo-application') return { nativeApplicationVersion: 'test' };
      if (id === 'expo-constants') return { expoConfig: { extra: { eas: { projectId: 'test-project' } } } };
      if (id === 'expo/virtual/env') return { env: {} };
      if (id === '@shared/storage/secureStore') return {
        getItemAsync: async (key) => stored.get(key) ?? null,
        setItemAsync: async (key, value) => { stored.set(key, value); },
        deleteItemAsync: async (key) => { stored.delete(key); },
      };
      if (id === './channels') return { ensureAndroidChannels: async () => {} };
      if (id === './installationId') return { getInstallationId: async () => 'test-installation' };
      if (id === '@react-navigation/native') return { useNavigation: () => navigation, useIsFocused: () => navigation.focused };
      if (id === '@features/auth/AuthContext') return { useAuth: () => auth };
      if (id === '@shared/state/SelectedChild') return { useSelectedChild: () => ({ childId: null }) };
      if (id === '@shared/components/CurrentLessonBanner') return { CurrentLessonBanner: () => null };
      if (id === '@features/home/homeDate') return load('src/features/home/homeDate.js');
      if (id === './client') return { request };
      if (id === './config') return { API_BASE_URL: 'http://localhost:8080' };
      if (id.startsWith('@babel/runtime')) return require(id);
      if (id.startsWith('@shared/')) return load('src/shared/' + id.slice('@shared/'.length) + '.js');
      if (id.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), id + '.js')));
      throw new Error('Unexpected import: ' + id);
    };
    new Function('require', 'module', 'exports', '__DEV__', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', compiled.get(filename))(
      requireModule, mod, mod.exports, false,
      (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
      (id) => timers.delete(id),
      (fn, delay) => { const id = ++timerId; timers.set(id, { fn, at: now + delay, interval: delay }); return id; },
      (id) => timers.delete(id),
    );
    cache.set(filename, mod.exports);
    return mod.exports;
  }
  function render(fn = renderFn) {
    renderFn = fn; cursor = 0; pendingEffects = []; dirty = false;
    view = fn();
    pendingEffects.forEach((effect) => effect());
    return view;
  }
  async function flush() {
    for (let i = 0; i < 30; i += 1) {
      await tick();
      if (!dirty) return view;
      render();
    }
    assert.fail('request/render loop did not settle after 30 renders');
  }
  return {
    load, render, flush, auth, navigation, requests, timers, listeners,
    notifications, pushListeners, stored, platform, device,
    respond(fn) { responder = fn; },
    async advance(ms) {
      const until = now + ms;
      while (true) {
        const due = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, timer] = due;
        now = timer.at;
        if (timer.interval) timer.at += timer.interval;
        else timers.delete(id);
        timer.fn();
        await flush();
      }
      now = until;
      return flush();
    },
    async change(next) {
      appState.currentState = next;
      [...listeners].forEach((listener) => listener(next));
      return flush();
    },
    unmount() { slots.forEach((slot) => slot.cleanup?.()); mounted = false; },
  };
}

test('current lesson: one initial request, bounded polling, no render loop or background requests', async () => {
  const h = host();
  const { useCurrentLesson } = h.load('src/shared/hooks/useCurrentLesson.js');
  h.render(() => useCurrentLesson());
  await h.flush();
  assert.equal(h.requests.length, 1);
  for (let i = 0; i < 20; i += 1) h.render();
  await h.flush();
  assert.equal(h.requests.length, 1);
  await h.advance(180_000);
  assert.equal(h.requests.length, 4);
  await h.change('background');
  await h.advance(600_000);
  assert.equal(h.requests.length, 4, 'polling must stop in background');
  await h.change('active');
  assert.equal(h.requests.length, 5, 'resume refreshes once');
  await h.change('active');
  assert.equal(h.requests.length, 5, 'duplicate active events must not refetch');
  h.auth.token = null;
  assert.equal(h.render().data, null);
  await h.flush();
  await h.advance(600_000);
  assert.equal(h.requests.length, 5);
  assert.equal(h.listeners.size, 0);
});

test('slow requests: timer, taps and resume share one request; failures keep the refresh interval', async () => {
  const h = host();
  let finish;
  h.respond(() => new Promise((resolve) => { finish = resolve; }));
  const { useCurrentLesson } = h.load('src/shared/hooks/useCurrentLesson.js');
  const view = h.render(() => useCurrentLesson());
  await h.flush();
  const tap = view.reload({ silent: true });
  assert.equal(view.reload({ silent: true }), tap);
  await h.advance(180_000);
  await h.change('background'); await h.change('active');
  assert.equal(h.requests.length, 1, 'a slow request must not grow a queue');
  finish({ status: 'ok', lesson: { id: 10, subjectName: 'Алгебра' } });
  await tap; await h.flush();
  h.respond(() => { throw new Error('offline'); });
  await h.advance(60_000);
  const failed = await h.flush();
  assert.equal(failed.data.lessonId, 10);
  assert.equal(failed.error, 'offline');
  await h.advance(59_999);
  assert.equal(h.requests.length, 2);
  await h.advance(1);
  assert.equal(h.requests.length, 3);
  h.unmount();
  assert.equal(h.timers.size, 0);
});

test('account/child change, disable and unmount cannot accept an old response or restart polling', async () => {
  const h = host();
  const pending = [];
  h.respond(() => new Promise((resolve) => pending.push(resolve)));
  const { useCurrentLesson } = h.load('src/shared/hooks/useCurrentLesson.js');
  let childId = 1, enabled = true;
  h.render(() => useCurrentLesson({ childId, enabled }));
  await h.flush();
  childId = 2;
  assert.equal(h.render().data, null);
  await h.flush();
  pending[1]({ status: 'ok', lesson: { id: 22 } }); await h.flush();
  pending[0]({ status: 'ok', lesson: { id: 11 } }); await h.flush();
  assert.equal(h.render().data.lessonId, 22);
  const oldReload = h.render().reload;
  h.auth.token = 'other-student';
  assert.equal(h.render().data, null);
  await h.flush();
  await oldReload();
  assert.equal(h.requests.length, 3, 'an old callback must not query with the old token');
  enabled = false;
  assert.equal(h.render().loading, false);
  pending[2]({ status: 'ok', lesson: { id: 33 } }); await h.flush();
  assert.equal(h.render().data, null);
  await h.advance(600_000);
  assert.equal(h.requests.length, 3);
  enabled = true; h.render(); await h.flush();
  h.unmount();
  pending[3]({ status: 'ok', lesson: { id: 44 } }); await tick();
  assert.equal(h.timers.size, 0);
  assert.equal(h.listeners.size, 0);
});

test('foreground poller waits for active state on startup and handles inactive/resume/cleanup', async () => {
  const h = host();
  await h.change('background');
  const { useForegroundPolling } = h.load('src/shared/hooks/useForegroundPolling.js');
  let calls = 0;
  const poll = async () => { calls += 1; };
  h.render(() => useForegroundPolling(poll, { intervalMs: 1_500 }));
  await h.advance(100_000); assert.equal(calls, 0);
  await h.change('active'); assert.equal(calls, 1);
  await h.change('inactive'); await h.advance(100_000); assert.equal(calls, 1);
  await h.change('active'); assert.equal(calls, 2);
  await h.advance(1_500); assert.equal(calls, 3);
  h.unmount(); await h.advance(100_000); assert.equal(calls, 3);
});

test('hidden lesson bar stops polling and cannot navigate using a late response after logout', async () => {
  const h = host();
  const { CurrentLessonBar } = h.load('src/features/lesson/CurrentLessonBar.js');
  h.respond(() => ({ status: 'ok', lesson: { id: 10, subjectName: 'Алгебра' } }));
  h.render(() => CurrentLessonBar({})); await h.flush();
  assert.equal(h.requests.length, 1);
  h.navigation.focused = false;
  assert.equal(h.render(), null);
  await h.advance(600_000); assert.equal(h.requests.length, 1);
  h.navigation.focused = true; h.render(); await h.flush();
  assert.equal(h.requests.length, 2);
  let finish;
  h.respond(() => new Promise((resolve) => { finish = resolve; }));
  const opening = h.render().props.onOpen(); await h.flush();
  h.auth.isAuthenticated = false; h.auth.token = null; h.render();
  finish({ status: 'ok', lesson: { id: 10 } });
  await opening; await h.flush();
  assert.equal(h.navigation.calls.length, 0);
});

test('lesson bar cannot use an old target after switching accounts of the same role or unmounting', async () => {
  const h = host();
  const { CurrentLessonBar } = h.load('src/features/lesson/CurrentLessonBar.js');
  h.respond(() => ({ status: 'ok', lesson: { id: 10 } }));
  h.render(() => CurrentLessonBar({})); await h.flush();
  const pending = [];
  h.respond(() => new Promise((resolve) => pending.push(resolve)));
  const opening = h.render().props.onOpen(); await h.flush();
  h.auth.token = 'another-student'; h.render(); await h.flush();
  pending[0]({ status: 'ok', lesson: { id: 10 } });
  await opening; assert.equal(h.navigation.calls.length, 0);
  pending[1]({ status: 'ok', lesson: { id: 20 } }); await h.flush();
  const closing = h.render().props.onOpen(); await h.flush();
  h.unmount(); pending[2]({ status: 'ok', lesson: { id: 20 } });
  await closing; assert.equal(h.navigation.calls.length, 0);
});

test('student home data hooks settle after one request each; manual refresh still works', async () => {
  const h = host();
  const { useMySchedule } = h.load('src/shared/hooks/useSchedule.js');
  const { useMyProfile } = h.load('src/shared/hooks/useProfile.js');
  const { useMySubjectGrades, useMyDiaryGrades } = h.load('src/shared/hooks/useGrades.js');
  const { useMySurveys } = h.load('src/shared/hooks/useSurveys.js');
  const { useAttendanceSummary } = h.load('src/shared/hooks/useAttendance.js');
  const { useMyGradeCorrections } = h.load('src/shared/hooks/useGradeCorrections.js');
  h.render(() => ({
    schedule: useMySchedule(), profile: useMyProfile(), subjects: useMySubjectGrades(),
    diary: useMyDiaryGrades({ dateFrom: '2026-10-10', dateTo: '2026-10-10' }),
    surveys: useMySurveys(), attendance: useAttendanceSummary(), corrections: useMyGradeCorrections(),
  }));
  let view = await h.flush();
  assert.equal(h.requests.length, 7);
  assert.equal(new Set(h.requests.map((request) => request.url)).size, 7);
  for (let i = 0; i < 20; i += 1) h.render();
  await h.advance(600_000);
  assert.equal(h.requests.length, 7);
  await Promise.all(Object.values(view).map((source) => source.reload()));
  view = await h.flush();
  assert.equal(h.requests.length, 14);
  assert.equal(view.schedule.loading, false);
});

test('schedule hooks: same-week renders stay local; changing week requests once; teacher skips learner data', async () => {
  const h = host();
  const { useMySchedule } = h.load('src/shared/hooks/useSchedule.js');
  const { useMyDiaryGrades } = h.load('src/shared/hooks/useGrades.js');
  const { useMyAttendanceMarks } = h.load('src/shared/hooks/useAttendance.js');
  let date = '2026-10-05';
  h.render(() => ({
    schedule: useMySchedule({ week: true, date }),
    grades: useMyDiaryGrades({ dateFrom: date, dateTo: date, enabled: false }),
    marks: useMyAttendanceMarks({ dateFrom: date, dateTo: date, enabled: false }),
  }));
  await h.flush();
  for (let i = 0; i < 20; i += 1) h.render();
  await h.flush(); assert.equal(h.requests.length, 1);
  date = '2026-10-12'; h.render(); await h.flush();
  assert.equal(h.requests.length, 2);
  assert.ok(h.requests.every(({ url }) => url.startsWith('/api/schedule/me/week?date=')));
});

test('native push registration: token getter fires listener, but startup registers once and repeated tokens stay local', async () => {
  const h = host();
  const { usePushRegistration } = h.load('src/shared/push/usePushRegistration.js');
  h.render(() => usePushRegistration());
  await h.flush();
  assert.equal(h.notifications.nativeCalls, 1);
  assert.equal(h.requests.length, 1, 'initial native event must not recursively register the device');
  assert.equal(h.requests[0].options.method, 'PUT');
  assert.equal(h.notifications.expoCalls[0].devicePushToken.data, 'native-A');
  for (let i = 0; i < 100; i += 1) h.notifications.emit({ type: 'ios', data: 'native-A' });
  for (let i = 0; i < 20; i += 1) h.render();
  await h.flush(); await h.advance(600_000);
  assert.equal(h.requests.length, 1);
  h.notifications.emit({ type: 'ios', data: 'native-B' });
  await h.flush();
  assert.equal(h.requests.length, 2, 'a genuinely rotated token still registers');
  assert.equal(h.notifications.nativeCalls, 1, 'listener must use the received token');
  h.unmount();
  assert.equal(h.pushListeners.size, 0);
  assert.equal(h.listeners.size, 0);
});

test('native push registration serializes changes, keeps the latest rotation and guards late logout responses', async () => {
  const h = host();
  let finish;
  h.notifications.expoResult = () => new Promise((resolve) => { finish = resolve; });
  const { usePushRegistration } = h.load('src/shared/push/usePushRegistration.js');
  h.render(() => usePushRegistration()); await h.flush();
  h.notifications.emit({ type: 'ios', data: 'native-B' });
  h.notifications.emit({ type: 'ios', data: 'native-C' });
  await h.flush();
  assert.equal(h.notifications.expoCalls.length, 1, 'registrations must not overlap');
  finish({ type: 'expo', data: 'expo-A' }); await h.flush();
  assert.equal(h.requests.length, 1);
  assert.equal(h.notifications.expoCalls.length, 2);
  assert.equal(h.notifications.expoCalls[1].devicePushToken.data, 'native-C');
  h.auth.token = null; h.auth.isAuthenticated = false; h.render();
  finish({ type: 'expo', data: 'expo-C' }); await h.flush();
  assert.equal(h.requests.length, 1, 'logout must invalidate a token fetched for the old session');
  h.notifications.emit({ type: 'ios', data: 'native-D' }); await h.flush();
  assert.equal(h.requests.length, 1);
});

test('native push registration retains the latest event even when it matches the last registered token', async () => {
  const h = host();
  const { usePushRegistration } = h.load('src/shared/push/usePushRegistration.js');
  h.render(() => usePushRegistration()); await h.flush();
  let finish;
  h.notifications.expoResult = ({ devicePushToken }) => devicePushToken.data === 'native-B'
    ? new Promise((resolve) => { finish = resolve; })
    : Promise.resolve({ type: 'expo', data: 'expo-A' });
  h.notifications.emit({ type: 'ios', data: 'native-B' }); await h.flush();
  h.notifications.emit({ type: 'ios', data: 'native-C' });
  h.notifications.emit({ type: 'ios', data: 'native-A' });
  await h.flush();
  finish({ type: 'expo', data: 'expo-B' }); await h.flush();
  assert.deepEqual(h.notifications.expoCalls.map(({ devicePushToken }) => devicePushToken.data),
    ['native-A', 'native-B', 'native-A'], 'the last native event must replace an older pending rotation');
  assert.equal(h.requests.length, 3);
  h.unmount();
});

test('native push registration tracks permission changes without refetching on every foreground event', async () => {
  const h = host();
  const { usePushRegistration } = h.load('src/shared/push/usePushRegistration.js');
  h.render(() => usePushRegistration()); await h.flush();
  await h.change('background'); await h.change('active'); await h.change('active');
  assert.equal(h.requests.length, 1);
  h.notifications.granted = false;
  await h.change('background'); await h.change('active');
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].options.method, 'DELETE', 'revoked permission still detaches the phone');
  await h.change('active'); await h.change('background'); await h.change('active');
  assert.equal(h.requests.length, 2);
  h.notifications.granted = true;
  await h.change('background'); await h.change('active');
  assert.equal(h.requests.length, 3);
  assert.equal(h.requests[2].options.method, 'PUT', 'regranted permission still reattaches the phone');
});

test('push registration on web and iOS simulator never acquires a native token or calls the API', async () => {
  for (const platform of ['web', 'ios']) {
    const h = host(); h.platform.OS = platform; h.device.isDevice = false;
    const { usePushRegistration } = h.load('src/shared/push/usePushRegistration.js');
    h.render(() => usePushRegistration()); await h.flush();
    assert.equal(h.notifications.nativeCalls, 0);
    assert.equal(h.requests.length, 0);
    h.unmount();
  }
});

test('Android uses the event token too; push failures do not start a timer or a recursive retry loop', async () => {
  for (const fail of [false, true]) {
    const h = host(); h.platform.OS = 'android'; h.notifications.native.type = 'android';
    if (fail) h.respond(() => { throw new Error('offline'); });
    const { usePushRegistration } = h.load('src/shared/push/usePushRegistration.js');
    h.render(() => usePushRegistration()); await h.flush();
    assert.equal(h.notifications.nativeCalls, 1);
    assert.ok(h.requests.length >= 1 && h.requests.length <= 2);
    assert.equal(h.requests[0].options.body.platform, 'ANDROID');
    const settled = h.requests.length;
    await h.advance(600_000);
    assert.equal(h.requests.length, settled);
    assert.equal(h.timers.size, 0);
    h.unmount();
  }
});
