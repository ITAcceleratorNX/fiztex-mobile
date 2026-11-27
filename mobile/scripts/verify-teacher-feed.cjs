#!/usr/bin/env node
/**
 * Лента «От учителей» у родителя: сводки, отзывы за месяц и комментарии одной лентой.
 * Тот же приём, что у `verify-ai-reports.cjs`: модуль компилируется babel-пресетом проекта, чистые
 * экспорты выполняются здесь. Закрепляются порядок, фильтр и метка «новое».
 *
 * Запуск: node scripts/verify-teacher-feed.cjs
 */
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const cache = {};
function load(relPath) {
  const file = path.join(ROOT, relPath);
  if (cache[file]) return cache[file];
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
  });
  const mod = { exports: {} };
  cache[file] = mod.exports;
  const fakeRequire = (id) => {
    if (id.startsWith('@babel/runtime')) return require(id);
    if (id.startsWith('./')) return load(path.join(path.dirname(relPath), `${id}.js`));
    return new Proxy({}, { get: () => () => null });
  };
  new Function('require', 'module', 'exports', code)(fakeRequire, mod, mod.exports);
  cache[file] = mod.exports;
  return mod.exports;
}

let passed = 0;
let failed = 0;
function check(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`  ✓ ${name}`); } else { failed += 1; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const feed = load('src/shared/api/teacherFeedMap.js');

const report = { reportId: 1, subject: { id: 1, name: 'Математика' }, authorName: 'Смирнова София', authorRole: 'SUBJECT_TEACHER',
  period: { kind: 'ACADEMIC_PERIOD', label: '2', from: '2026-11-03', to: '2026-11-27' }, publishedAt: '2026-11-27T10:33:07Z',
  text: 'Достижения\nСтабильная успеваемость.\n\nНа что обратить внимание\nНевнимательность.' };
const months = [
  { month: '2026-10', publishedCount: 12, subjectCount: 12, analysis: { status: 'DONE' } },
  { month: '2026-09', publishedCount: 3, subjectCount: 12, analysis: { status: 'NONE' } },
  { month: '2026-08', publishedCount: 0, subjectCount: 12 },
  { month: '2026-12', publishedCount: 5, subjectCount: 12 },
];
const comments = [
  { id: 7, subjectName: 'Физика', teacherName: 'Ахметова А. Б.', text: 'Хорошо\n  отвечал у доски.', lessonDate: '2026-11-20',
    updatedAt: '2026-11-20T09:00:00Z', unread: true },
  { id: 6, subjectName: 'Химия', teacherName: 'Ли В.', text: 'Не сдал лабораторную.', lessonDate: '2026-10-02',
    updatedAt: '2026-10-02T09:00:00Z', unread: false },
];
const seen = new Set([feed.monthSeenKey(months[0])]);
const items = feed.feedItems({ reports: [report], months, comments, seen, currentMonth: '2026-11' });

check('новые сверху, все три вида вперемешку',
  items.map((i) => i.key).join(' ') === 'report:1 comment:7 month:2026-10 comment:6 month:2026-09',
  items.map((i) => i.key).join(' '));
check('месяц без опубликованного и месяц из будущего не попадают', !items.some((i) => i.key === 'month:2026-08' || i.key === 'month:2026-12'));
check('месяц встаёт на свой последний день', feed.monthAt('2026-09') === '2026-09-30T12:00:00Z', feed.monthAt('2026-09'));
check('заголовок месяца словами', items.find((i) => i.key === 'month:2026-10').title === 'Отзывы за октябрь 2026');
check('неполный месяц — «N из M»', items.find((i) => i.key === 'month:2026-09').text === 'Отзывы по 3 из 12 предметов',
  items.find((i) => i.key === 'month:2026-09').text);
check('полный месяц — без «из»', items.find((i) => i.key === 'month:2026-10').text === 'Отзывы по 12 предметам');
check('открытый месяц — не новый, неоткрытый — новый',
  !items.find((i) => i.key === 'month:2026-10').isNew && items.find((i) => i.key === 'month:2026-09').isNew);
check('дописанные позже предметы снова делают месяц новым',
  feed.feedItems({ months: [{ ...months[0], publishedCount: 13 }], seen, currentMonth: '2026-11' })[0].isNew);
check('комментарий: новое — по непрочитанности сервера', items.find((i) => i.key === 'comment:7').isNew && !items.find((i) => i.key === 'comment:6').isNew);
check('текст комментария в одну строку', items.find((i) => i.key === 'comment:7').text === 'Хорошо отвечал у доски.');
check('подпись комментария — урок и учитель', items.find((i) => i.key === 'comment:7').meta === 'Урок 20 ноября · Ахметова А. Б.',
  items.find((i) => i.key === 'comment:7').meta);
check('сводка ведёт в свою карточку', JSON.stringify(items[0].target) === JSON.stringify({ screen: 'ai-report', params: { reportId: 1 } }));
check('месяц ведёт в экран месяца', items.find((i) => i.kind === 'month').target.screen === 'monthly-feedback');
check('комментарий открывается в своём разделе', JSON.stringify(items.find((i) => i.key === 'comment:7').target)
  === JSON.stringify({ screen: 'teacher-comments', params: { commentId: 7 } }));
check('фильтр «Сводки»', feed.filterFeed(items, 'report').every((i) => i.kind === 'report') && feed.filterFeed(items, 'report').length === 1);
check('фильтр «Все» — всё', feed.filterFeed(items, 'all').length === items.length);
check('число новых', feed.newCount(items) === 3, String(feed.newCount(items)));
check('подписи «новое»', feed.newLabel(0) === '' && feed.newLabel(1) === 'Новое' && feed.newLabel(3) === '3 новых'
  && feed.newLabel(21) === '21 новое' && feed.newLabel(12) === '12 новых');
check('пустые источники — пустая лента', feed.feedItems({ currentMonth: '2026-11' }).length === 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
