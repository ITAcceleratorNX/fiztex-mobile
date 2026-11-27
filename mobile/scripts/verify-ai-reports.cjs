#!/usr/bin/env node
/**
 * Сводка об учёбе у родителя (ТЗ «AI-отчётность — Frontend» §8). Тот же приём, что у
 * `verify-monthly-feedback.cjs`: `aiReportMap.js` компилируется babel-пресетом проекта, чистые
 * экспорты выполняются здесь. Закрепляется раскладка текста на блоки, подписи и метка «Новая».
 *
 * Запуск: node scripts/verify-ai-reports.cjs
 */
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
function load(relPath) {
  const file = path.join(ROOT, relPath);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
  });
  const mod = { exports: {} };
  const fakeRequire = (id) => (id.startsWith('@babel/runtime') ? require(id) : new Proxy({}, { get: () => () => null }));
  new Function('require', 'module', 'exports', code)(fakeRequire, mod, mod.exports);
  return mod.exports;
}

let passed = 0;
let failed = 0;
function check(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`  ✓ ${name}`); } else { failed += 1; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const map = load('src/shared/api/aiReportMap.js');
const TEXT = 'Достижения\nДана хорошо работает на уроках.\n\nНа что обратить внимание\nТема «Системы уравнений».\n\nРекомендации\nРешать 2–3 задачи дома.';

const blocks = map.parentBlocks(TEXT);
check('три блока по заголовкам сервера', blocks.map((b) => b.title).join('|') === 'Достижения|На что обратить внимание|Рекомендации');
check('у блока — значок и абзацы', blocks[0].icon === 'award' && blocks[2].paragraphs[0] === 'Решать 2–3 задачи дома.');
check('текст своими словами — один абзац без заголовка',
  JSON.stringify(map.parentBlocks('Просто текст учителя.')) === JSON.stringify([{ title: null, icon: null, paragraphs: ['Просто текст учителя.'] }]));
check('пустой текст — без блоков', map.parentBlocks(null).length === 0);

check('превью без заголовков', map.excerpt(TEXT, 500).startsWith('Дана хорошо работает на уроках. Тема'));
check('длинное превью обрезается по слову', map.excerpt(TEXT, 40).endsWith('…') && map.excerpt(TEXT, 40).length <= 41);

const subject = { reportId: 3, subject: { id: 1, name: 'Математика' }, authorName: 'Марина Демо', authorRole: 'SUBJECT_TEACHER',
  period: { kind: 'ACADEMIC_PERIOD', label: '2', from: '2026-11-03', to: '2026-12-27' }, publishedAt: '2026-11-25T06:20:00Z' };
const homeroom = { ...subject, reportId: 4, subject: null, authorRole: 'HOMEROOM', period: { kind: 'MONTH', label: 'Ноябрь 2026', from: '2026-11-01', to: '2026-11-27' } };
check('заголовок предметной сводки', map.reportHeading(subject) === 'Математика · 2 четверть', map.reportHeading(subject));
check('у классного руководителя — «Общая сводка»', map.reportHeading(homeroom) === 'Общая сводка · Ноябрь 2026');
check('фактическое окно сводки', map.periodRange(subject.period) === '03.11 – 27.12', map.periodRange(subject.period));
check('без «г.» после года', !/г\.$/.test(map.publishedLine({ ...subject, authorName: '' })), map.publishedLine({ ...subject, authorName: '' }));
check('подпись автора с ролью', map.publishedLine(homeroom).endsWith('Марина Демо, классный руководитель'), map.publishedLine(homeroom));

const sorted = map.sortReports([subject, { ...homeroom, publishedAt: '2026-11-26T06:20:00Z' }]);
check('новые сверху', sorted[0].reportId === 4);

const seen = new Set([map.seenKey(subject)]);
check('открытая — не новая', !map.isNew(subject, seen));
check('повторная публикация после снятия снова новая', map.isNew({ ...subject, publishedAt: '2026-11-27T08:00:00Z' }, seen));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
