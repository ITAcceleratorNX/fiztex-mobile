#!/usr/bin/env node
/**
 * Логика СОР/СОЧ на телефоне (ТЗ Frontend «СОР/СОЧ в расписании и журнале», Mobile).
 *
 * Компилируются настоящие исходники проектным babel-пресетом и выполняются без UI: проверяются слова и
 * правила (`assessmentMap`), разбор строки расписания и карточки урока, и то, что ученик и родитель
 * получают только собственный результат проведённой работы.
 *
 * Usage: node scripts/verify-assessment.cjs
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function load(relPath, stubs = {}) {
  const file = path.join(ROOT, relPath);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
  });
  const mod = { exports: {} };
  const requireStub = (id) => {
    for (const [key, value] of Object.entries(stubs)) if (id.includes(key)) return value;
    if (id.startsWith('@babel/runtime')) return require(id);
    return new Proxy({}, { get: () => () => null });
  };
  new Function('require', 'module', 'exports', code)(requireStub, mod, mod.exports);
  return mod.exports;
}

const map = load('src/shared/api/assessmentMap.js');
const schedule = load('src/shared/api/scheduleMap.js', { './assessmentMap': map });
const lesson = load('src/shared/api/lessonMap.js', {
  './assessmentMap': map,
  './scheduleMap': schedule,
  './files': { sizeLabel: () => '' },
});

test('названия работ, статус и напоминание', () => {
  assert.equal(map.workTitle({ kind: 'SOR', number: 2 }), 'СОР 2');
  assert.equal(map.workTitle({ kind: 'SOCH' }), 'СОЧ');
  assert.equal(map.reminderLabel(3), 'За 3 дня');
  assert.equal(map.reminderLabel(0), 'Не напоминать');
  assert.equal(map.workStateLabel({ status: 'PLANNED' }), 'Запланирована');
  assert.equal(map.workStateLabel({ status: 'CONDUCTED' }), 'Проведена');
  assert.equal(map.workStateLabel({ status: 'CONDUCTED', hasResults: true }), 'Баллы выставлены');
  assert.equal(map.workStateLabel({ status: 'CANCELLED' }), 'Отменена');
});

test('после первого балла перенос и отмена закрыты', () => {
  assert.equal(map.isLockedByResults({ hasResults: true }), true);
  assert.equal(map.isLockedByResults({ hasResults: false }), false);
  assert.equal(map.isLockedByResults(null), false);
});

test('недоступный вид называет причину', () => {
  const full = { sorAllowed: true, sorLimit: 3, sorUsed: 3, sochAllowed: true, sochUsed: 1 };
  assert.match(map.kindUnavailableReason('SOR', full), /Лимит СОР исчерпан: в четверти 3, назначено 3/);
  assert.match(map.kindUnavailableReason('SOCH', full), /уже назначен СОЧ/);
  assert.equal(map.kindUnavailableReason('SOR', { ...full, sorUsed: 1 }), null);
  assert.equal(map.kindUnavailableReason('SOR', null), null);
  assert.equal(map.nextWorkHint('SOR', { sorAllowed: true, sorLimit: 3, sorUsed: 1 }), 'Будет СОР 2: в четверти 3 СОР, назначено 1');
});

test('максимум — целое от 1 до 1000', () => {
  assert.equal(map.maxScoreProblem('20'), null);
  assert.match(map.maxScoreProblem(''), /Введите/);
  assert.match(map.maxScoreProblem('0'), /больше 0/);
  assert.match(map.maxScoreProblem('-5'), /целое/);
  assert.match(map.maxScoreProblem('2.5'), /целое/);
  assert.match(map.maxScoreProblem('1001'), /1000/);
});

test('строка расписания несёт работы урока, без работ — пустой список', () => {
  const row = schedule.mapLessonToRow({
    lessonId: 1, lessonInstanceId: 9, startTime: '08:55:00', endTime: '09:40:00', date: '2026-11-12',
    subjectName: 'Математика',
    assessmentWorks: [{ workId: 71, kind: 'SOR', number: 1, status: 'PLANNED', title: 'СОР 1', needsReschedule: false }],
  });
  assert.deepEqual(row.assessmentWorks, [
    { workId: 71, kind: 'SOR', number: 1, status: 'PLANNED', title: 'СОР 1', needsReschedule: false },
  ]);
  assert.deepEqual(schedule.mapLessonToRow({ lessonId: 2, startTime: '08:00', endTime: '08:45' }).assessmentWorks, []);
});

test('карточка урока: работы, охват и собственный результат ученика', () => {
  const card = lesson.mapLessonCard({
    id: 449, date: '2026-11-12', startTime: '08:55:00', endTime: '09:40:00', status: 'ACTIVE',
    classId: 4, subjectId: 3, academicPeriodId: 12, subgroupId: null,
    capabilities: ['VIEW_CARD'],
    assessmentWorks: [
      { id: 71, kind: 'SOR', number: 1, status: 'CONDUCTED', maxScore: 20, hasResults: null, myResult: { score: 17, maxScore: 20 } },
      { id: 72, kind: 'SOCH', status: 'CANCELLED', maxScore: 40 },
    ],
  });
  assert.deepEqual(card.scope, { classId: 4, subjectId: 3, academicPeriodId: 12, subgroupId: null });
  assert.equal(card.assessmentWorks.length, 2);
  const view = map.learnerWorkView(card.assessmentWorks[0]);
  assert.equal(view.title, 'СОР 1');
  assert.equal(view.chip, 'Проведён');
  assert.equal(view.score, '17 / 20');
  assert.equal(map.activeWorks(card.assessmentWorks).length, 1);
});

test('до проведения у ученика нет балла, только максимум; ноль — результат', () => {
  const planned = map.learnerWorkView(map.mapAssessmentWork({ id: 1, kind: 'SOR', number: 1, status: 'PLANNED', maxScore: 20 }));
  assert.equal(planned.score, null);
  assert.equal(planned.chip, 'Запланирован');
  assert.equal(planned.caption, 'Максимальный балл: 20');
  const noScoreYet = map.learnerWorkView(map.mapAssessmentWork({ id: 1, kind: 'SOR', status: 'CONDUCTED', maxScore: 20 }));
  assert.equal(noScoreYet.caption, 'Баллов ещё нет');
  const zero = map.learnerWorkView(map.mapAssessmentWork({ id: 1, kind: 'SOR', status: 'CONDUCTED', maxScore: 20, myResult: { score: 0, maxScore: 20 } }));
  assert.equal(zero.score, '0 / 20');
});

test('работа с needsReschedule сохраняет признак для плашки и блока', () => {
  const work = map.mapAssessmentWork({ id: 1, kind: 'SOCH', status: 'PLANNED', needsReschedule: true });
  assert.equal(work.needsReschedule, true);
});

// ─── ввод баллов на телефоне ────────────────────────────────────────────────
const scores = load('src/shared/api/assessmentScores.js');
const sheet = (kind = 'SOR') => ({
  workId: 71, kind, maxScore: 20,
  students: new Map([[1, { score: 15, version: 2 }], [2, { score: null, version: null }]]),
});

test('баллы: 0 и максимум допустимы, выше максимума, дробное и отрицательное — нет', () => {
  assert.equal(scores.scoreDraftProblem('0', 20), null);
  assert.equal(scores.scoreDraftProblem('20', 20), null);
  assert.equal(scores.scoreDraftProblem('23', 20), 'Не больше 20');
  assert.equal(scores.scoreDraftProblem('-1', 20), 'Не меньше 0');
  assert.equal(scores.scoreDraftProblem('1.5', 20), 'Только целое число');
  assert.equal(scores.scoreDraftProblem('  ', 20), null);
});

test('баллы: пустое поле — не менять, совпавший балл не правка, ноль — результат', () => {
  assert.deepEqual(scores.collectChanges(new Map([[2, '']]), sheet()).changes, []);
  assert.deepEqual(scores.collectChanges(new Map([[1, '15']]), sheet()).changes, []);
  const { changes, invalid } = scores.collectChanges(new Map([[1, '17'], [2, '0']]), sheet());
  assert.deepEqual(invalid, []);
  assert.deepEqual(changes.map((c) => [c.studentProfileId, c.score, c.before, c.version]), [[1, 17, 15, 2], [2, 0, null, null]]);
});

test('баллы: ошибочный ввод блокирует сохранение, причина нужна только для исправления СОЧ', () => {
  const bad = scores.collectChanges(new Map([[1, '23']]), sheet());
  assert.deepEqual(bad.invalid, [1]);
  assert.equal(scores.barMessage(bad.changes, bad.invalid.length), 'Исправьте ошибку, чтобы сохранить');
  const fix = scores.collectChanges(new Map([[1, '17']]), sheet('SOCH')).changes;
  const first = scores.collectChanges(new Map([[2, '10']]), sheet('SOCH')).changes;
  const sor = scores.collectChanges(new Map([[1, '17']]), sheet('SOR')).changes;
  assert.equal(scores.needsReason(fix), true);
  assert.equal(scores.needsReason(first), false);
  assert.equal(scores.needsReason(sor), false);
});

test('баллы: подпись панели и правило причины', () => {
  const base = { workId: 1, kind: 'SOR', studentProfileId: 1, score: 1, before: null, version: null };
  assert.equal(scores.barMessage([], 0), null);
  assert.equal(scores.barMessage([base, base, base], 0), 'Изменено 3 балла · ещё не сохранены');
  assert.equal(scores.barMessage([{ ...base, before: 15 }], 0), 'Изменён 1 балл · исправление попадёт в историю');
  assert.equal(scores.hasMeaningfulReason('  '), false);
  assert.equal(scores.hasMeaningfulReason('..'), false);
  assert.equal(scores.hasMeaningfulReason('Пересчитал'), true);
});

test('лист результатов с сервера: права и состав', () => {
  const view = scores.mapSheet({
    canManage: true, canCorrect: true,
    work: { id: 71, kind: 'SOCH', maxScore: 40 },
    students: [{ studentProfileId: 1, studentName: 'Айдар', score: 0, version: 1, inAudience: true }, { studentProfileId: 2, studentName: 'Мария', score: null }],
  });
  assert.equal(view.title, 'СОЧ');
  assert.equal(view.maxScore, 40);
  assert.equal(view.canCorrect, true);
  assert.equal(view.students[0].score, 0);
  assert.equal(view.students[1].score, null);
});

test('перенос — только запланированной без баллов; отмена — и проведённой без баллов', () => {
  assert.equal(map.canReschedule({ status: 'PLANNED', hasResults: false }), true);
  assert.equal(map.canReschedule({ status: 'CONDUCTED', hasResults: false }), false);
  assert.equal(map.canReschedule({ status: 'PLANNED', hasResults: true }), false);
  assert.equal(map.canCancel({ status: 'CONDUCTED', hasResults: false }), true);
  assert.equal(map.canCancel({ status: 'CONDUCTED', hasResults: true }), false);
  assert.equal(map.canCancel({ status: 'CANCELLED' }), false);
});
