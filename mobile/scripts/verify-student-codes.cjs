#!/usr/bin/env node
/**
 * Коды у классного руководителя и родителя (AUTH-FE-001, блок «Mobile · Коды»): правила модели
 * `features/access/studentCodeModel.js`.
 *
 * Тест-раннера в проекте нет, поэтому здесь тот же приём, что и в остальных `verify-*.cjs`:
 * настоящий исходник компилируется проектным babel-пресетом. Если рядом лежит бэкенд, с ним
 * сверяются коды отказов, ключи `details` у 409, длина кода и размер страницы состава класса:
 * разойдись они — экран показал бы сырой текст сервера, вопрос о перевыпуске без слова о PIN
 * или молча обрезанный класс.
 *
 * Usage:
 *   node scripts/verify-student-codes.cjs
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

const m = load('src/features/access/studentCodeModel.js');

test('подписи количества склоняются', () => {
  const cases = { 1: 'ученик', 2: 'ученика', 4: 'ученика', 5: 'учеников', 11: 'учеников', 12: 'учеников',
    14: 'учеников', 21: 'ученик', 22: 'ученика', 25: 'учеников', 111: 'учеников', 0: 'учеников' };
  for (const [count, word] of Object.entries(cases)) assert.equal(m.studentsLabel(Number(count)), `${count} ${word}`);
  assert.equal(m.homeroomCaption(21), '21 ученик · коды для входа');
  assert.equal(m.homeroomCaption(null), 'Коды для входа учеников', 'без числа, а не «null учеников»');
  assert.equal(m.rosterSubtitle(22), 'Классное руководство · 22 ученика');
  assert.equal(m.rosterSubtitle(null), 'Классное руководство');
});

test('заголовки класса и ученика', () => {
  assert.equal(m.classTitle('7А'), '7А класс');
  assert.equal(m.classTitle('Класс 9-Формулы'), 'Класс 9-Формулы', 'слово «класс» не удваивается');
  assert.equal(m.classTitle(''), 'Класс');
  assert.equal(m.positionLabel('7А', 20, 21), '7А · ученик 21 из 21');
  assert.equal(m.positionLabel('7А', undefined, undefined), '7А', 'без позиции — только класс');
  assert.equal(m.childCaption('7А'), '7А · код для входа');
  assert.equal(m.childCaption(null), 'Класс не назначен · код для входа');
});

const roster = [
  { studentProfileId: 1, displayName: 'Сейтказы Арман Ерланович', lastName: 'Сейтказы', firstName: 'Арман', middleName: 'Ерланович' },
  { studentProfileId: 2, displayName: 'Ёлкина Алёна', lastName: 'Ёлкина', firstName: 'Алёна', middleName: null },
  { studentProfileId: 3, displayName: 'Без Частей' },
];
const grants = [{ studentProfileId: 1, pinSet: false, codeIssuedAt: '2026-11-03T08:00:00Z', canIssueCode: true }];

test('состав класса и разрешения — одна таблица, без разрешения строка остаётся', () => {
  const rows = m.mergeRoster(roster, grants);
  assert.deepEqual(rows.map((r) => r.studentProfileId), [1, 2, 3], 'порядок сервера');
  assert.equal(rows[0].listName, 'Сейтказы Арман');
  assert.equal(rows[0].fullName, 'Сейтказы Арман Ерланович');
  assert.equal(rows[0].access, grants[0]);
  assert.equal(rows[1].access, null, 'ученик без разрешения виден, но без доступа');
  assert.equal(rows[2].listName, 'Без Частей', 'без фамилии и имени — displayName');
  assert.deepEqual(m.mergeRoster(null, null), []);
});

test('поиск: без регистра, «ё» = «е», по нескольким словам и по отчеству', () => {
  const rows = m.mergeRoster(roster, grants);
  const ids = (q) => m.filterStudents(rows, q).map((r) => r.studentProfileId);
  assert.deepEqual(ids(''), [1, 2, 3]);
  assert.deepEqual(ids('  '), [1, 2, 3]);
  assert.deepEqual(ids('СЕЙТ'), [1]);
  assert.deepEqual(ids('сейтказы   арм'), [1]);
  assert.deepEqual(ids('ерланович'), [1]);
  assert.deepEqual(ids('елкина ален'), [2]);
  assert.deepEqual(ids('щщщ'), []);
});

test('статусы: в списке «входил» спокойный, «не входил» оранжевый; без разрешения — к кому идти', () => {
  assert.deepEqual(m.rowStatus(null), { tone: 'muted', text: 'Код выдаёт администратор' });
  assert.deepEqual(m.rowStatus({ pinSet: true }), { tone: 'muted', text: 'Входил в приложение' });
  assert.deepEqual(m.rowStatus({ pinSet: false }), { tone: 'orange', text: 'Ещё не входил' });
  assert.equal(m.heroStatus(null), null, 'без разрешения статус неизвестен');
  assert.deepEqual(m.heroStatus({ pinSet: true }), { tone: 'success', text: 'Уже входил в приложение' });
  assert.deepEqual(m.heroStatus({ pinSet: false }), { tone: 'orange', text: 'Ещё не входил в приложение' });
});

test('подписи карточки: когда выдан, срок разрешения, пояснение по адресату', () => {
  assert.match(m.issuedCaption({ codeIssuedAt: '2026-11-03T08:00:00Z' }), /^Код выдан 3 ноября$/);
  assert.equal(m.issuedCaption({ codeIssuedAt: null }), 'Код ещё не выдавали');
  assert.match(m.grantCaption({ grantExpiresAt: '2026-12-05T06:00:00Z' }), /^Ваше разрешение действует до 5 декабря$/);
  assert.equal(m.grantCaption({ grantExpiresAt: null }), null, 'бессрочное — без строки');
  assert.match(m.codeHint('teacher', { pinSet: false }), /^Передайте код ученику лично/);
  assert.match(m.codeHint('parent', { pinSet: false }), /^Код нужен ребёнку для входа/);
  assert.match(m.codeHint('teacher', { pinSet: true }), /^Ученик уже придумал PIN/);
  assert.match(m.codeHint('parent', { pinSet: true }), /^Ребёнок уже придумал PIN/);
  assert.equal(m.CODE_MASK.length, 8);
});

test('перевыпуск: про PIN — только когда он есть', () => {
  assert.equal(m.reissueMessage('teacher', false), 'Прежний код перестанет работать сразу.');
  assert.match(m.reissueMessage('teacher', true), /PIN ученика не сбрасывается — он войдёт новым кодом и прежним PIN\.$/);
  assert.match(m.reissueMessage('parent', true), /PIN ребёнка не сбрасывается/);
});

test('отказы выпуска: 409 перевыпуска — вопрос, остальное — своими словами или текстом клиента', () => {
  assert.equal(m.needsReissueConfirm({ status: 409, code: 'STUDENT_CODE_REISSUE_CONFIRM' }), true);
  assert.equal(m.needsReissueConfirm({ status: 409, code: 'STUDENT_CODE_NOT_ISSUABLE' }), false);
  assert.equal(m.needsReissueConfirm(null), false);
  assert.equal(m.issueErrorText({ code: 'STUDENT_CODE_NOT_ISSUABLE' }, 'teacher'), m.NOT_ISSUABLE_TEXT);
  assert.match(m.issueErrorText({ code: 'STUDENT_CODE_NOT_PERMITTED' }, 'teacher'), /Разрешение на выдачу кода больше не действует/);
  assert.match(m.issueErrorText({ code: 'STUDENT_CODE_NOT_PERMITTED' }, 'parent'), /связь с ребёнком/);
  assert.equal(m.issueErrorText({ status: 0, message: 'Нет связи с сервером.' }, 'parent'), 'Нет связи с сервером.');
  assert.equal(m.issueErrorText({}, 'parent'), 'Не удалось выдать код. Попробуйте ещё раз.');
});

const codesPath = path.join(backend, 'src/main/java/com/fiztex/access/code/service/StudentCodeErrorCodes.java');
test('коды отказов, которые разбирает экран, есть у сервера', { skip: !fs.existsSync(codesPath) && 'бэкенд не рядом' }, () => {
  const source = fs.readFileSync(codesPath, 'utf8');
  const model = fs.readFileSync(path.join(root, 'src/features/access/studentCodeModel.js'), 'utf8');
  const used = [...new Set(model.match(/STUDENT_CODE_[A-Z_]+/g))];
  assert.equal(used.length, 3);
  for (const code of used) assert.ok(source.includes(`"${code}"`), `кода ${code} у сервера нет`);
});

const issuePath = path.join(backend, 'src/main/java/com/fiztex/access/code/service/StudentCodeIssueService.java');
test('409 перевыпуска несёт pinSet — по нему карточка пишет вопрос', { skip: !fs.existsSync(issuePath) && 'бэкенд не рядом' }, () => {
  const source = fs.readFileSync(issuePath, 'utf8');
  assert.ok(source.includes('details.put("pinSet"'), 'в details 409 больше нет pinSet');
  const card = fs.readFileSync(path.join(root, 'src/features/access/StudentCodeCard.js'), 'utf8');
  assert.ok(card.includes('e.details?.pinSet'), 'карточка не читает pinSet из 409');
});

const credentialPath = path.join(backend, 'src/main/java/com/fiztex/account/service/CredentialService.java');
test('маска той же длины, что код', { skip: !fs.existsSync(credentialPath) && 'бэкенд не рядом' }, () => {
  const source = fs.readFileSync(credentialPath, 'utf8');
  const length = Number(/STUDENT_CODE_LENGTH = (\d+);/.exec(source)?.[1]);
  assert.equal(m.CODE_MASK.length, length);
});

const rosterPath = path.join(backend, 'src/main/java/com/fiztex/myclass/service/MyClassRosterService.java');
test('страница состава не больше серверного предела', { skip: !fs.existsSync(rosterPath) && 'бэкенд не рядом' }, () => {
  const server = Number(/MAX_PAGE_SIZE = (\d+);/.exec(fs.readFileSync(rosterPath, 'utf8'))?.[1]);
  const client = Number(/ROSTER_PAGE_SIZE = (\d+);/.exec(fs.readFileSync(path.join(root, 'src/shared/api/myClassApi.js'), 'utf8'))?.[1]);
  assert.ok(client > 0 && client <= server, `клиент просит ${client}, сервер отдаёт не больше ${server}`);
});
