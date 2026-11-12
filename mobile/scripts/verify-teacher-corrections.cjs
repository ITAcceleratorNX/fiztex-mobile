#!/usr/bin/env node
/**
 * «Отметить исправление» у учителя на телефоне (веб — `CorrectionFormModal`): правила формы и
 * подписи строки. Исполняются настоящие исходники `gradeCorrectionMap.js`.
 *
 * Usage: node scripts/verify-teacher-corrections.cjs
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/shared/api/gradeCorrectionMap.js');
const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
  filename: file, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', code)((id) => (id.startsWith('@babel/runtime') ? require(id) : {}), mod, mod.exports);
const m = mod.exports;

test('открытое исправление строки — только REQUIRED и OVERDUE своего ученика', () => {
  const list = [
    { id: 1, studentProfileId: 5, status: 'COMPLETED' },
    { id: 2, studentProfileId: 6, status: 'REQUIRED' },
    { id: 3, studentProfileId: 5, status: 'OVERDUE' },
  ];
  assert.equal(m.openCorrection(list, 5).id, 3);
  assert.equal(m.openCorrection(list, 6).id, 2);
  assert.equal(m.openCorrection(list, 7), null);
  assert.equal(m.openCorrection([{ studentProfileId: 5, status: 'CANCELLED' }], 5), null);
});

test('подпись под фамилией: срок или «Срок исправления истёк»', () => {
  assert.equal(m.correctionBadgeLabel({ status: 'REQUIRED', deadline: '2026-10-21' }), 'Исправить до 21 октября');
  assert.equal(m.correctionBadgeLabel({ status: 'OVERDUE', deadline: '2026-10-21' }), 'Срок исправления истёк');
  assert.equal(m.correctionBadgeLabel({ status: 'REQUIRED', overdue: true }), 'Срок исправления истёк');
  assert.equal(m.correctionBadgeLabel(null), null);
});

test('форма: комментарий и срок обязательны', () => {
  assert.equal(m.correctionProblem({ comment: '  ', deadline: '2026-11-20' }), 'Опишите, что нужно исправить');
  assert.equal(m.correctionProblem({ comment: 'Переписать', deadline: '' }), 'Выберите срок исправления');
  assert.equal(m.correctionProblem({ comment: 'Переписать', deadline: '2026-11-20' }), null);
});

test('временная оценка: баллы 1–10 или шкала сервера, тело запроса по форме значения', () => {
  assert.deepEqual(m.temporaryOptions({ pointsMode: true }), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  assert.deepEqual(m.temporaryOptions({ pointsMode: false, scale: [{ code: '4' }, { code: '4+' }, {}] }), ['4', '4+']);
  assert.deepEqual(m.temporaryValue('8', { pointsMode: true, defaultWorkType: 'FORMATIVE' }), { score: 8, gradeType: 'FORMATIVE' });
  assert.deepEqual(m.temporaryValue('4+', { pointsMode: false }), { scaleCode: '4+' });
  assert.equal(m.initialTemporary({ temporaryGrade: { score: 7 } }, { pointsMode: true }), '7');
  assert.equal(m.initialTemporary({ temporaryGrade: { scaleCode: '5' } }, { pointsMode: false }), '5');
  assert.equal(m.initialTemporary({}, { pointsMode: false }), null);
});

test('свой срок — ближайшие дни с сегодняшнего, не в прошлом', () => {
  const days = m.deadlineDays(new Date(2026, 10, 13, 9), 4);
  assert.deepEqual(days.map((d) => d.iso), ['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16']);
  assert.equal(days[0].label, 'Пт 13');
  assert.equal(days[1].long, '14 ноября');
});
