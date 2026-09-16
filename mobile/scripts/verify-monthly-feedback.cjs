#!/usr/bin/env node
/**
 * Проверка блока «Обратная связь за месяц» у родителя (MONTHLY-FEEDBACK-FE-001).
 *
 * Тот же приём, что у `verify-current-lesson.cjs`: запускалки тестов для RN в проекте нет,
 * поэтому настоящий `monthlyFeedbackMap.js` компилируется babel-пресетом проекта и его чистые
 * экспорты выполняются здесь.
 *
 * Закрепляется то, что приложение решает само: какой месяц открыть, куда ведут стрелки,
 * какая вкладка выбрана, что стоит на месте анализа. Остальное — покрытие, устаревание,
 * `canRequest` — решает бэкенд, и здесь проверяется только, что ответ несёт нужные поля.
 *
 * Запуск:
 *   node scripts/verify-monthly-feedback.cjs [P1 months.json] [P2 month.json] [P3 ai-analysis.json]
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function load(relPath) {
  const file = path.join(ROOT, relPath);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    presets: ['babel-preset-expo'],
    babelrc: false,
    configFile: false,
  });
  const mod = { exports: {} };
  const fakeRequire = (id) => (id.startsWith('@babel/runtime') ? require(id) : new Proxy({}, { get: () => () => null }));
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

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const map = load('src/shared/api/monthlyFeedbackMap.js');

section('Месяцы');
check('ключ месяца по часам телефона', map.monthKey(new Date(2026, 8, 16)) === '2026-09');
check('предыдущий месяц через границу года', map.previousMonth('2026-01') === '2025-12');
check('подпись месяца', map.monthLabel('2026-09') === 'Сентябрь 2026' && map.monthLabel('2026-05') === 'Май 2026');
check(
  'стрелки ходят по текущему и опубликованным, от нового к старому, без будущих',
  same(map.feedbackMonths([{ month: '2026-08' }, { month: '2026-05' }, { month: '2026-10' }], '2026-09'), [
    '2026-09',
    '2026-08',
    '2026-05',
  ]),
);
check('без опубликованного — один текущий', same(map.feedbackMonths(null, '2026-09'), ['2026-09']));

section('Месяц по умолчанию');
check(
  'в начале октября открывается опубликованный сентябрь',
  map.defaultFeedbackMonth([{ month: '2026-09' }], '2026-10') === '2026-09',
);
check(
  'текущий месяц с опубликованным — он и открывается',
  map.defaultFeedbackMonth([{ month: '2026-10' }, { month: '2026-09' }], '2026-10') === '2026-10',
);
check(
  'прошлогодний май в сентябре — не новость: открывается текущий',
  map.defaultFeedbackMonth([{ month: '2026-05' }], '2026-09') === '2026-09',
);
check('ничего не опубликовано — текущий', map.defaultFeedbackMonth([], '2026-09') === '2026-09');

section('Стрелки');
const months = ['2026-09', '2026-08', '2026-05'];
check('«‹» ведёт к прошлому', map.stepMonth(months, '2026-09', true) === '2026-08');
check('«›» ведёт к новому', map.stepMonth(months, '2026-08', false) === '2026-09');
check('с самого нового вперёд — некуда', map.stepMonth(months, '2026-09', false) === null);
check('с самого старого назад — некуда', map.stepMonth(months, '2026-05', true) === null);

section('Вкладки предметов');
const view = {
  subjects: [
    { subjectId: 5, subjectName: 'Английский язык', entries: [] },
    { subjectId: 3, subjectName: 'Физика', entries: [] },
  ],
};
const tabs = map.subjectTabs(view);
check('вкладки в порядке ответа', same(tabs, [{ value: 5, label: 'Английский язык' }, { value: 3, label: 'Физика' }]));
check('выбранный предмет сохраняется, если он есть в новом месяце', map.pickSubject(tabs, 3) === 3);
check('иначе — первый', map.pickSubject(tabs, 99) === 5);
check('без предметов — ничего', map.pickSubject([], 3) === null);

section('Анализ');
check('NONE → кнопка', map.analysisPhase({ status: 'NONE' }) === 'none');
check('PENDING и RUNNING → «Анализируем отзывы…»', ['PENDING', 'RUNNING'].every((s) => map.analysisPhase({ status: s }) === 'running'));
check('DONE → результат, FAILED → ошибка', map.analysisPhase({ status: 'DONE' }) === 'done' && map.analysisPhase({ status: 'FAILED' }) === 'failed');
check('полный анализ спрашивается, только когда он был или идёт', !map.needsFullAnalysis({ status: 'NONE' }) && map.needsFullAnalysis({ status: 'DONE' }));
check('выключенный AI прячет блок', map.analysisRequestError({ code: 'MONTHLY_FEEDBACK_AI_DISABLED' }).hidden === true);
check('квота — текст контракта', map.analysisRequestError({ code: 'MONTHLY_FEEDBACK_AI_QUOTA_EXCEEDED' }).message === 'Лимит на сегодня исчерпан');
check('нечего анализировать — текст контракта', map.analysisRequestError({ code: 'MONTHLY_FEEDBACK_AI_NO_FEEDBACK' }).message === 'Отзывов за этот месяц ещё нет');
check('прочее — сообщение сервера', map.analysisRequestError({ message: 'Сервер не ответил' }).message === 'Сервер не ответил');
check(
  'пустые «Зоны внимания» не рисуются',
  same(
    map.analysisSections({ strengths: ['а'], concerns: [], recommendations: ['б'] }).map((s) => s.key),
    ['strengths', 'recommendations'],
  ),
);

const [monthsFile, monthFile, analysisFile] = process.argv.slice(2);
if (monthsFile || monthFile || analysisFile) {
  section('Живые ответы бэкенда');
  if (monthsFile) {
    const rows = JSON.parse(fs.readFileSync(monthsFile, 'utf8'));
    check('P1 — массив строк с месяцем', Array.isArray(rows) && rows.every((row) => /^\d{4}-\d{2}$/.test(row.month)), `${rows.length} мес.`);
    const current = map.monthKey();
    console.log(`    месяцы стрелок: ${map.feedbackMonths(rows, current).join(', ')}; по умолчанию: ${map.defaultFeedbackMonth(rows, current)}`);
  }
  if (monthFile) {
    const month = JSON.parse(fs.readFileSync(monthFile, 'utf8'));
    check('P2 несёт month и childId — по ним хук отбрасывает опоздавший ответ', typeof month.month === 'string' && typeof month.childId === 'number');
    const liveTabs = map.subjectTabs(month);
    check(
      'P2: у каждой вкладки id и название, у отзыва — entryId и текст',
      liveTabs.every((tab) => tab.value != null && tab.label) &&
        (month.subjects || []).every((s) => s.entries.every((e) => e.entryId != null && typeof e.text === 'string')),
      liveTabs.map((tab) => tab.label).join(', ') || 'не опубликовано',
    );
    check('P2: краткое состояние анализа', month.analysis && typeof month.analysis.canRequest === 'boolean', month.analysis?.status);
  }
  if (analysisFile) {
    const analysis = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
    check('P3: статус раскладывается', ['none', 'running', 'done', 'failed'].includes(map.analysisPhase(analysis)), analysis.status);
    check('P3: оговорка приходит всегда', typeof analysis.disclaimer === 'string' && analysis.disclaimer.length > 0);
  }
}

console.log(`\n${passed} прошло, ${failed} упало`);
process.exit(failed ? 1 : 0);
