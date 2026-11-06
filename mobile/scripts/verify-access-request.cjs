#!/usr/bin/env node
/**
 * Заявка на доступ и её статус (AUTH-FE-001, A1–A5, S1–S6): правила модели
 * `features/access/accessRequestModel.js`.
 *
 * Тест-раннера в проекте нет, поэтому здесь тот же приём, что и в остальных `verify-*.cjs`:
 * настоящий исходник компилируется проектным babel-пресетом. Если рядом лежит бэкенд, этапы,
 * следующие шаги и коды отказов сверяются с ним: экран, не знающий нового этапа, показал бы
 * «обновите приложение», а неизвестный код — сырой текст сервера.
 *
 * Usage:
 *   node scripts/verify-access-request.cjs
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const backend = path.resolve(root, '../../fiztex-back');
const cache = new Map();

function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} };
  cache.set(filename, mod);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, presets: ['babel-preset-expo'], configFile: false, babelrc: false,
  });
  const req = (id) => {
    if (id.startsWith('@babel/runtime')) return require(id);
    let resolved;
    if (id.startsWith('@features/')) resolved = path.join(root, 'src/features', id.slice(10));
    else if (id.startsWith('@shared/')) resolved = path.join(root, 'src/shared', id.slice(8));
    else if (id.startsWith('.')) resolved = path.resolve(path.dirname(filename), id);
    else throw new Error(`Unexpected import ${id}`);
    return load(resolved.endsWith('.js') ? resolved : `${resolved}.js`);
  };
  new Function('require', 'module', 'exports', code)(req, mod, mod.exports);
  return mod.exports;
}

const m = load('src/features/access/accessRequestModel.js');

const catalog = {
  yearConfigured: true,
  grades: [
    { grade: '1', letters: [{ classId: 1, letter: 'А', name: '1А' }] },
    { grade: '5', letters: [{ classId: 5, letter: 'А', name: '5А' }, { classId: 6, letter: 'Б', name: '5Б' }] },
    { grade: '7', letters: [{ classId: 70, letter: 'А', name: '7 «А» (профильный)' }, { classId: 71, letter: 'А', name: '7А' }] },
    { grade: '10', letters: [{ classId: 10, letter: 'А', name: '10А' }] },
  ],
};
const options = m.classOptions(catalog);

test('справочник классов — плоский список в порядке сервера, подписи как в макете', () => {
  assert.deepEqual(options.map((o) => o.label), ['1 «А»', '5 «А»', '5 «Б»', '7 «А» (профильный)', '7 «А»', '10 «А»']);
  assert.deepEqual(m.classOptions({ yearConfigured: false, grades: catalog.grades }), [], 'год не настроен — классов нет');
  // Особое имя не схлопывается в «7 «А»»: иначе два пункта списка читались бы одинаково.
  assert.equal(m.classLabel({ grade: '7', letter: 'А', name: '7 «А» (профильный)' }), '7 «А» (профильный)');
  assert.equal(m.classNameLabel('5А'), '5 «А»');
  assert.equal(m.classNameLabel('11 б'), '11 «Б»');
  assert.equal(m.classNameLabel('7 «А» (профильный)'), '7 «А» (профильный)');
});

test('поиск класса — по началу: цифра параллели, параллель с буквой', () => {
  const labels = (query) => m.filterClasses(options, query).map((o) => o.label);
  assert.deepEqual(labels('5'), ['5 «А»', '5 «Б»']);
  assert.deepEqual(labels('1'), ['1 «А»', '10 «А»'], '«1» — это и первые, и десятые');
  assert.deepEqual(labels('5б'), ['5 «Б»']);
  assert.deepEqual(labels('5 «Б»'), ['5 «Б»']);
  assert.deepEqual(labels('А'), [], 'буква без цифры не вытаскивает полшколы');
  assert.equal(m.findClassByName(options, '5Б').classId, 6);
  assert.equal(m.findClassByName(options, '7 «А» (профильный)').classId, 70);
  assert.equal(m.findClassByName(options, '9В'), null);
});

test('форма ученика: ФИО из двух слов и класс; телефон тянет за собой пароль', () => {
  const form = { ...m.emptyForm('STUDENT'), fullName: 'Сейтказы', classId: null };
  let check = m.validateForm(form);
  assert.deepEqual(Object.keys(check.errors).sort(), ['classId', 'fullName']);
  assert.equal(check.needsPassword, false);

  check = m.validateForm({ ...form, fullName: 'Сейтказы Арман', classId: 5 });
  assert.equal(check.ready, true, 'без телефона — код и PIN, пароль не нужен');

  check = m.validateForm({ ...form, fullName: 'Сейтказы Арман', classId: 5, phone: '+7 707 412 55 90' });
  assert.equal(check.needsPassword, true);
  assert.ok(check.errors.password, 'телефон для входа без пароля входа не даст');

  check = m.validateForm({ ...form, fullName: 'Сейтказы Арман', classId: 5, phone: '+7 707', password: 'secret-pass', repeat: 'secret-pass' });
  assert.ok(check.errors.phone);
});

test('форма родителя: телефон, пароль, ребёнок и его класс', () => {
  const form = m.emptyForm('PARENT');
  const check = m.validateForm(form);
  assert.deepEqual(Object.keys(check.errors).sort(), ['childClassId', 'childFullName', 'fullName', 'password', 'phone']);
  const ready = m.validateForm({
    ...form, fullName: 'Кабылова Амина', phone: '87001000014', password: 'secret-pass', repeat: 'secret-pass',
    childFullName: 'Кабылов Тимур', childClassId: 5,
  });
  assert.equal(ready.ready, true);
  const mismatch = m.validateForm({ ...form, fullName: 'Кабылова Амина', phone: '87001000014', password: 'secret-pass', repeat: 'secret-pas', childFullName: 'Кабылов Тимур', childClassId: 5 });
  assert.ok(mismatch.errors.repeat);
});

test('тело запроса: чужие поля не уходят, пароль — только с телефоном, в черновик — никогда', () => {
  const student = { ...m.emptyForm('STUDENT'), fullName: ' Сейтказы Арман ', classId: 5, password: 'secret-pass', repeat: 'secret-pass' };
  assert.deepEqual(m.formPayload(student), {
    token: undefined, role: 'STUDENT', fullName: 'Сейтказы Арман', phone: null, password: null, classId: 5,
  });
  const parent = {
    ...m.emptyForm('PARENT'), fullName: 'Кабылова Амина', phone: '+7 700 100 00 14', password: 'secret-pass',
    repeat: 'secret-pass', childFullName: 'Кабылов Тимур', childClassId: 6,
  };
  const body = m.formPayload(parent, 'tok');
  assert.equal(body.token, 'tok');
  assert.equal(body.phone, '+77001000014');
  assert.equal(body.password, 'secret-pass');
  assert.equal(body.childClassId, 6);
  assert.equal('classId' in body, false);
  assert.equal(m.draftPayload(parent, 'tok').password, null, 'секрет незаконченной формы на сервер не уходит');
  assert.equal(m.hasDraftContent(m.emptyForm('STUDENT')), false);
  assert.equal(m.hasDraftContent({ ...m.emptyForm('STUDENT'), fullName: 'Сейтказы' }), true);
});

test('исправленная заявка открывается с тем, что прислали, и без пароля', () => {
  const form = m.formFromStatus({
    role: 'PARENT', fullName: 'Кабылова Амина', phone: '+77001000014', childFullName: 'Кабылов Тимур', childClassName: '5Б',
  }, options);
  assert.equal(form.phone, '+7 700 100 00 14');
  assert.equal(form.childClassId, 6);
  assert.equal(form.password, '');
});

test('отказы подачи — по коду сервера, сеть — своими словами', () => {
  assert.match(m.submitErrorMessage({ code: 'ACCESS_REQUEST_ALREADY_PENDING', details: { submittedAt: '2026-11-04T10:00:00Z' } }), /уже на рассмотрении с 4 ноября/);
  assert.match(m.submitErrorMessage({ code: 'ACCESS_REQUEST_RATE_LIMITED' }), /Подождите минуту/);
  assert.match(m.submitErrorMessage({ code: 'ACCESS_REQUEST_CLASS_NOT_FOUND' }), /выберите класс заново/);
  assert.equal(m.submitErrorMessage({ status: 0, message: 'Нет связи с сервером.' }), 'Нет связи с сервером.');
  assert.deepEqual(m.missingFields({ code: 'ACCESS_REQUEST_INCOMPLETE', details: { missing: ['phone', 'childClassId'] } }), ['phone', 'childClassId']);
  assert.deepEqual(m.missingFields({ code: 'ACCESS_REQUEST_RATE_LIMITED' }), []);
  assert.equal(m.isRequestGone({ status: 404, code: 'ACCESS_REQUEST_NOT_FOUND' }), true);
});

test('экран статуса — по этапу и следующему шагу сервера', () => {
  const base = { role: 'STUDENT', fullName: 'Сейтказы Арман Ерланович', className: '5А', phone: null };
  assert.equal(m.statusScreen({ ...base, stage: 'DRAFT' }).kind, 'draft');
  assert.equal(m.statusScreen({ ...base, stage: 'PENDING' }).title, 'Школа проверяет данные');
  const parentPending = m.statusScreen({ ...base, role: 'PARENT', fullName: 'Кабылова Амина Сериковна', stage: 'PENDING' });
  // «на проверке» не разрывается: предлог не остаётся в конце строки (S6).
  assert.equal(parentPending.title, 'Амина, заявка ещё на\u00a0проверке');

  const byCode = m.statusScreen({ ...base, stage: 'APPROVED_PENDING_ACTIVATION', nextStep: 'SIGN_IN_WITH_CODE' });
  assert.equal(byCode.text, 'Вы ученик 5 «А». Осталось войти в первый раз.');
  assert.equal(byCode.steps.length, 2);
  // Аккаунт с паролем из заявки активен с момента одобрения: `ACTIVE` не значит «уже входил».
  const byPhone = m.statusScreen({ ...base, role: 'PARENT', phone: '+77001000014', childFullName: 'Кабылов Тимур Асетович', childClassName: '5А', stage: 'ACTIVE', nextStep: 'SIGN_IN_WITH_PHONE' });
  assert.equal(byPhone.kind, 'approved');
  assert.match(byPhone.steps[0].text, /\+7 700 100 00 14/);

  const rejected = m.statusScreen({ ...base, stage: 'REJECTED', rejectionReason: 'Проверьте класс', resubmitAllowed: true, decidedAt: '2026-11-03T09:00:00Z' });
  assert.equal(rejected.title, 'Заявку нужно исправить');
  assert.equal(rejected.meta, 'Администратор школы, 3 ноября');

  assert.deepEqual(m.summaryRows(base).map((r) => r.value), ['Сейтказы Арман Е.', '5 «А»', 'Не указан']);
  assert.deepEqual(m.reviewTimeline({ submittedAt: '2026-11-02T10:24:00Z' }).map((s) => s.state), ['done', 'current', 'todo']);
});

const openapiPath = path.join(backend, 'docs/openapi.json');
test('этапы и следующие шаги — все, что знает сервер', { skip: !fs.existsSync(openapiPath) && 'бэкенд не рядом' }, () => {
  const schema = JSON.parse(fs.readFileSync(openapiPath, 'utf8')).components.schemas.AccessRequestStatusView.properties;
  const base = { role: 'STUDENT', fullName: 'Сейтказы Арман', className: '5А' };
  for (const stage of schema.stage.enum) {
    assert.notEqual(m.statusScreen({ ...base, stage }).kind, 'unknown', `этап ${stage} без экрана`);
  }
  for (const nextStep of ['SIGN_IN_WITH_PHONE', 'SIGN_IN_WITH_CODE', 'ACTIVATE_WITH_CODE']) {
    assert.ok(schema.nextStep.enum.includes(nextStep), `шага ${nextStep} у сервера больше нет`);
    assert.ok(m.statusScreen({ ...base, stage: 'APPROVED_PENDING_ACTIVATION', nextStep }).steps.length > 0);
  }
});

const codesPath = path.join(backend, 'src/main/java/com/fiztex/access/request/service/AccessRequestErrorCodes.java');
test('коды отказов, которые разбирает экран, есть у сервера', { skip: !fs.existsSync(codesPath) && 'бэкенд не рядом' }, () => {
  const source = fs.readFileSync(codesPath, 'utf8');
  const model = fs.readFileSync(path.join(root, 'src/features/access/accessRequestModel.js'), 'utf8');
  const used = [...new Set(model.match(/ACCESS_REQUEST_[A-Z_]+/g))];
  assert.ok(used.length >= 7);
  for (const code of used) assert.ok(source.includes(`"${code}"`), `кода ${code} у сервера нет`);
});
