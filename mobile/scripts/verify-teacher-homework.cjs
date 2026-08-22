#!/usr/bin/env node
/**
 * Проверки учительской стороны модуля ДЗ.
 *
 * Тест-раннера в проекте нет, поэтому здесь тот же приём, что и в
 * `verify-schedule-logic.cjs`: настоящие исходники компилируются проектным babel-пресетом
 * (он даёт CommonJS) и выполняются с заглушками вместо нативных зависимостей. Проверяется
 * именно тот код, который уезжает в сборку, а не его пересказ в фикстуре.
 *
 * Usage:
 *   node scripts/verify-teacher-homework.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function load(relPath, extraStubs = {}) {
  const file = path.join(ROOT, relPath);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    presets: ['babel-preset-expo'],
    babelrc: false,
    configFile: false,
  });
  const noop = new Proxy({}, { get: () => () => null });
  const fakeRequire = (id) => {
    for (const [key, value] of Object.entries(extraStubs)) {
      if (id.includes(key)) return value;
    }
    if (id === 'react') {
      return { createElement: () => null, useState: () => [null, () => {}], useCallback: (f) => f, useEffect: () => {}, default: {} };
    }
    if (id.startsWith('@babel/runtime')) return require(id);
    return noop;
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(fakeRequire, mod, mod.exports);
  return mod.exports;
}

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

const hooks = load('src/shared/hooks/useTeacherHomework.js');
const roster = load('src/features/teacher/homework/roster.js');
// Подпись срока опирается на общий `homeworkMap` — подставляем настоящий, а не заглушку:
// иначе проверялась бы обёртка вокруг `() => null`, а не то, что увидит учитель.
const homeworkMap = load('src/shared/api/homeworkMap.js');
const due = load('src/features/teacher/homework/dueLabel.js', { homeworkMap });
const context = load('src/features/teacher/homework/context.js');

// ── действия по статусу (HOMEWORK-001 §7, §12) ───────────────────────────────
section('Что можно сделать с заданием');

const draft = hooks.homeworkActions({ status: 'DRAFT' });
check('черновик публикуют и удаляют', draft.publish && draft.remove && draft.edit);
check('у черновика нечего проверять', !draft.review && !draft.complete);

const published = hooks.homeworkActions({ status: 'PUBLISHED' });
check('опубликованное завершают, отменяют и проверяют', published.complete && published.cancel && published.review);
check('опубликованное не удаляют физически', !published.remove);

const completed = hooks.homeworkActions({ status: 'COMPLETED' });
check('завершённое открывают повторно, но не правят', completed.reopen && !completed.edit);
check('завершённое всё ещё проверяют', completed.review);

const cancelled = hooks.homeworkActions({ status: 'CANCELLED' });
check('отменённое только читают', !cancelled.edit && !cancelled.review && !cancelled.remove);

check('неизвестный статус ничего не разрешает', Object.values(hooks.homeworkActions(undefined)).every((v) => v === false));

// ── список работ (HOMEWORK-004 §4) ───────────────────────────────────────────
section('Работы учеников');

const students = [
  { studentProfileId: 1, status: 'SUBMITTED' },
  { studentProfileId: 2, status: 'NOT_SUBMITTED' },
  { studentProfileId: 3, status: 'DONE' },
  { studentProfileId: 4, status: 'RETURNED', active: false },
];

check('фильтр «все» ничего не отбрасывает', roster.filterRoster(students, 'ALL').length === 4);
check('фильтр отбирает по статусу работы', roster.filterRoster(students, 'DONE')
  .every((s) => s.status === 'DONE'));
check('выбывший получатель из списка не исчезает', roster.filterRoster(students, 'RETURNED').length === 1);

const counts = { total: 4, submitted: 1, returned: 1, done: 1, notSubmitted: 1 };
check('счётчики берутся у сервера, а не считаются по строкам',
  roster.rosterCount(counts, 'ALL') === 4 && roster.rosterCount(counts, 'DONE') === 1);
check('без ростера счётчик — ноль, а не падение', roster.rosterCount(undefined, 'ALL') === 0);

// ── подпись срока (HOMEWORK-001 §9) ──────────────────────────────────────────
section('Срок сдачи');

check('«до следующего урока» до публикации не притворяется бессрочным',
  due.dueRowLabel({ dueType: 'NEXT_LESSON' }) === 'До следующего урока');
check('после публикации у него появляется дата',
  due.dueRowLabel({ dueType: 'NEXT_LESSON', dueAt: '2026-10-20T10:00:00Z' }).startsWith('до '));
check('«без срока» — полноправный вариант', due.dueRowLabel({ dueType: 'NONE' }) === 'Без срока');

// ── задание вне урока (HOMEWORK-001 §3.2) ────────────────────────────────────
section('Выбор класса и предмета без урока');

const week = [
  { classId: 7, subjectId: 3, className: '7А', subjectName: 'Математика' },
  { classId: 7, subjectId: 3, className: '7А', subjectName: 'Математика' },
  { classId: 9, subjectId: 3, className: '9Б', subjectName: 'Математика' },
  { classId: 7, subjectId: 5, className: '7А', subjectName: 'Физика' },
  { classId: null, subjectId: 3, className: null, subjectName: 'Математика' },
];
const pairs = context.teachingPairs(week);

check('повторы одного и того же урока не размножают выбор', pairs.length === 3);
check('пара — это класс вместе с предметом, а не два независимых списка',
  pairs.every((p) => p.classId != null && p.subjectId != null),
  pairs.map((p) => p.label).join(' | '));
check('урок без класса в выбор не попадает',
  !pairs.some((p) => p.classId == null));
check('порядок алфавитный — список ищут глазами',
  pairs.map((p) => p.label).join('|') === [...pairs].map((p) => p.label).sort((a, b) => a.localeCompare(b, 'ru')).join('|'));
check('пустое расписание даёт пустой выбор, а не падение', context.teachingPairs().length === 0);

console.log(`\n${failed === 0 ? 'OK' : 'ПРОВАЛЫ'}: ${passed} проверок пройдено, ${failed} провалено`);
process.exit(failed === 0 ? 0 : 1);
