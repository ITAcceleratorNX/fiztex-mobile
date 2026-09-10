#!/usr/bin/env node
/**
 * Проверка кнопки «Текущий урок» (ТЗ Быстрый доступ §4, §5).
 *
 * Тот же приём, что у `verify-lesson-materials.cjs`: запускалки тестов для RN в проекте
 * нет, поэтому настоящий исходник компилируется тем же babel-пресетом и его чистые
 * экспорты выполняются здесь — проверяется отгруженный код, а не копия в фикстуре.
 *
 * Закрепляется ровно то, что приложение решает само (всё остальное решает бэк):
 * какая надпись на кнопке и когда у неё видна дата. Дата — не косметика: без неё
 * «08:30» у завтрашнего урока читается как сегодняшнее занятие.
 *
 * Запуск:
 *   node scripts/verify-current-lesson.cjs [ответ GET /api/lessons/current]
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Соседние модули (`lessonMap`, `scheduleMap`) подгружаются настоящие, а не заглушками:
 * формат времени и «какой сегодня день» живут именно там, и подменённые они проверяли бы
 * не тот код, который поедет на устройство.
 */
function load(relPath, seen = new Map()) {
  const file = path.join(ROOT, relPath);
  if (seen.has(file)) return seen.get(file);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    presets: ['babel-preset-expo'],
    babelrc: false,
    configFile: false,
  });
  const mod = { exports: {} };
  seen.set(file, mod.exports);
  const fakeRequire = (id) => {
    if (id.startsWith('@babel/runtime')) return require(id);
    if (id.startsWith('.')) {
      const target = path.relative(ROOT, path.resolve(path.dirname(file), `${id}.js`));
      return load(target, seen);
    }
    return new Proxy({}, { get: () => () => null });
  };
  new Function('require', 'module', 'exports', code)(fakeRequire, mod, mod.exports);
  seen.set(file, mod.exports);
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

const map = load('src/shared/api/currentLessonMap.js');
const TODAY = new Date('2026-09-10T09:00:00');

function response(lesson, status = 'ok', message = 'OK') {
  return { status, message, lesson };
}

const ongoing = {
  id: 42,
  date: '2026-09-10',
  startTime: '10:00:00',
  endTime: '10:45:00',
  subjectName: 'Английский язык',
  temporalStatus: 'ONGOING',
};

section('Идущий урок');
{
  const data = map.mapCurrentLesson(response(ongoing), TODAY);
  check('надпись как в макете', data.label === 'Идёт: Английский язык · 10:00 – 10:45', data.label);
  check('признак «идёт» взят из temporalStatus, а не из часов телефона', data.ongoing === true);
  check('даты у сегодняшнего урока нет', data.dateLabel === null);
  check('id урока — фактический, для карточки', data.lessonId === 42);
}

section('Урок сегодня, но позже');
{
  const data = map.mapCurrentLesson(
    response({ ...ongoing, temporalStatus: 'UPCOMING', startTime: '11:00:00', endTime: '11:45:00' }),
    TODAY);
  check('надпись «Далее»', data.label === 'Далее: Английский язык · 11:00 – 11:45', data.label);
  check('идущим не притворяется', data.ongoing === false);
}

section('Урок другого дня — дата обязательна (ТЗ §4)');
{
  const data = map.mapCurrentLesson(
    response({ ...ongoing, temporalStatus: 'UPCOMING', date: '2026-09-14', startTime: '08:30:00', endTime: '09:15:00' }),
    TODAY);
  check('дата показана', data.dateLabel === '14 сен', data.dateLabel);
  check('и дата, и время в надписи',
    data.label === 'Далее: Английский язык · 14 сен, 08:30 – 09:15', data.label);
}

section('Пустые состояния');
{
  const notPublished = map.mapCurrentLesson(response(null, 'schedule_not_published', 'Расписание ещё не опубликовано'));
  check('«расписания ещё нет» названо своими словами',
    notPublished.label === 'Расписание ещё не опубликовано', notPublished.label);
  check('открывать нечего', notPublished.lessonId === null);

  const none = map.mapCurrentLesson(response(null, 'no_upcoming_lessons', 'Нет доступных ближайших уроков'));
  check('«уроков нет» отличается от «расписания нет»',
    none.label === 'Нет доступных ближайших уроков', none.label);

  // Ответ без урока при статусе ok — испорченные данные, а не «урок есть».
  const broken = map.mapCurrentLesson(response(null, 'ok', 'OK'));
  check('ok без урока не превращается в кнопку', broken.lessonId === null);
}

section('Полезная нагрузка экрана урока');
{
  const data = map.mapCurrentLesson(response(ongoing), TODAY);
  const payload = map.currentLessonPayload(data, { childId: 7, childName: 'Айгерим Б. · 7А' });
  check('экран урока ждёт lessonInstanceId, а не lessonId слота',
    payload.lessonInstanceId === 42 && payload.lessonId === undefined);
  check('контекст ребёнка едет с переходом', payload.childId === 7);
  check('без урока нагрузки нет', map.currentLessonPayload({ lessonId: null }) === null);
}

// ── Живой ответ бэка ─────────────────────────────────────────────────────────
const livePath = process.argv[2];
if (livePath) {
  section('Живой ответ');
  const raw = JSON.parse(fs.readFileSync(livePath, 'utf8'));
  const data = map.mapCurrentLesson(raw);
  check('статус разобран', ['ok', 'schedule_not_published', 'no_upcoming_lessons'].includes(data.status),
    data.status);
  check('надпись непустая', Boolean(data.label), data.label);
  if (data.status === 'ok') check('есть куда вести', Boolean(data.lessonId), String(data.lessonId));
  console.log(`    · ${data.label}`);
}

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
