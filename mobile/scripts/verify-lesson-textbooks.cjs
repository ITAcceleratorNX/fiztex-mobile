#!/usr/bin/env node
/**
 * Проверка раскладки учебников урока у ученика и родителя (TEXTBOOKS-FE, мобилка).
 *
 * Тот же приём, что у `verify-lesson-materials.cjs`: запускалки тестов для RN в проекте нет,
 * поэтому настоящий `textbookMap.js` компилируется пресетом проекта и исполняется здесь.
 *
 * Закреплено главное, что видно ребёнку: какая строка «Учебник» появится (или не появится),
 * что откроется по нажатию и с какой страницы.
 *
 * Запуск:
 *   node scripts/verify-lesson-textbooks.cjs [ответ GET /api/lessons/{id}/textbooks]
 */

const assert = require('assert');
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
  const fakeRequire = (id) => {
    if (id.startsWith('@babel/runtime')) return require(id);
    throw new Error(`textbookMap должен оставаться чистым модулем, а импортирует ${id}`);
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(fakeRequire, mod, mod.exports);
  return mod.exports;
}

const m = load('src/shared/api/textbookMap.js');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function textbook(overrides = {}) {
  return {
    bindingId: 7,
    textbookId: 3,
    title: "Spotlight 5. Student's Book",
    format: 'PDF',
    pageCount: 142,
    pageNavigation: true,
    pageFrom: null,
    pageTo: null,
    active: true,
    ...overrides,
  };
}

console.log('Строка «Учебник»');

check('выбор учителя открывается сразу, со страницами в подписи', () => {
  const data = m.mapLessonTextbooks({ selected: textbook({ pageFrom: 24, pageTo: 26 }), available: [textbook()] });
  const entry = m.textbookEntry(data);
  assert.strictEqual(entry.value, "Spotlight 5. Student's Book · стр. 24–26");
  assert.strictEqual(entry.open.bindingId, 7);
  assert.deepStrictEqual(entry.choose, []);
});

check('один назначенный без выбора — выбирать не из чего, открываем его', () => {
  const entry = m.textbookEntry(m.mapLessonTextbooks({ selected: null, available: [textbook()] }));
  assert.strictEqual(entry.value, "Spotlight 5. Student's Book");
  assert.strictEqual(entry.open.textbookId, 3);
});

check('несколько без выбора — сначала шит, подпись со склонением', () => {
  const two = m.textbookEntry(
    m.mapLessonTextbooks({ available: [textbook(), textbook({ bindingId: 8, textbookId: 4, title: 'Workbook' })] }),
  );
  assert.strictEqual(two.value, '2 учебника · выберите');
  assert.strictEqual(two.open, null);
  assert.strictEqual(two.choose.length, 2);

  const five = m.textbookEntry(
    m.mapLessonTextbooks({ available: [1, 2, 3, 4, 5].map((id) => textbook({ bindingId: id, textbookId: id })) }),
  );
  assert.strictEqual(five.value, '5 учебников · выберите');
});

check('ничего не назначено — строки нет', () => {
  assert.strictEqual(m.textbookEntry(m.mapLessonTextbooks({ selected: null, available: [] })), null);
  assert.strictEqual(m.textbookEntry(null), null);
  assert.strictEqual(m.textbookEntry(m.mapLessonTextbooks(undefined)), null);
});

check('выбор с завершённым назначением остаётся учебником урока', () => {
  const entry = m.textbookEntry(m.mapLessonTextbooks({ selected: textbook({ active: false }), available: [] }));
  assert.strictEqual(entry.open.active, false);
});

check('у DOCX страниц нет — ни в подписи, ни в листании', () => {
  const docx = textbook({ format: 'DOCX', pageNavigation: false, pageCount: null, pageFrom: 24 });
  const entry = m.textbookEntry(m.mapLessonTextbooks({ selected: docx }));
  assert.strictEqual(entry.value, "Spotlight 5. Student's Book");
  assert.strictEqual(m.opensByPages(entry.open), false);
  assert.strictEqual(m.startPage(entry.open), 1);
});

console.log('Просмотр');

check('открывается на начале диапазона учителя, без диапазона — с первой', () => {
  assert.strictEqual(m.startPage(textbook({ pageFrom: 24 })), 24);
  assert.strictEqual(m.startPage(textbook()), 1);
  assert.strictEqual(m.startPage(textbook({ pageFrom: 24, pageNavigation: false })), 1);
});

check('диапазон учителя: одна страница или «с — по», у DOCX его нет', () => {
  assert.deepStrictEqual(m.lessonRange(textbook({ pageFrom: 300, pageTo: 310 })), { from: 300, to: 310 });
  assert.deepStrictEqual(m.lessonRange(textbook({ pageFrom: 300 })), { from: 300, to: 300 });
  assert.strictEqual(m.lessonRange(textbook()), null);
  assert.strictEqual(m.lessonRange(textbook({ pageFrom: 300, pageNavigation: false })), null);
  assert.strictEqual(m.rangeHint({ from: 300, to: 310 }), 'Задано к уроку: стр. 300–310');
  assert.strictEqual(m.rangeHint({ from: 300, to: 300 }), 'Задано к уроку: стр. 300');
});

check('учебник на 400 страниц с заданными 300–310 открывается сразу на 300-й', () => {
  const big = textbook({ pageCount: 400, pageFrom: 300, pageTo: 310 });
  assert.strictEqual(m.startPage(big), 300);
  assert.strictEqual(m.isInRange(305, m.lessonRange(big)), true);
  assert.strictEqual(m.isInRange(311, m.lessonRange(big)), false);
});

check('переход на страницу: число в пределах учебника', () => {
  assert.deepStrictEqual(m.parseJumpPage(' 300 ', 400), { page: 300 });
  assert.deepStrictEqual(m.parseJumpPage('', 400), { error: 'Введите номер страницы' });
  assert.deepStrictEqual(m.parseJumpPage('3а', 400), { error: 'Номер страницы — целое число' });
  assert.deepStrictEqual(m.parseJumpPage('0', 400), { error: 'Страницы начинаются с первой' });
  assert.deepStrictEqual(m.parseJumpPage('401', 400), { error: 'В учебнике 400 страниц' });
  assert.deepStrictEqual(m.parseJumpPage('401', null), { page: 401 });
});

check('стрелки не выходят за границы учебника', () => {
  assert.strictEqual(m.stepPage(1, -1, 142), 1);
  assert.strictEqual(m.stepPage(142, 1, 142), 142);
  assert.strictEqual(m.stepPage(24, 1, 142), 25);
  assert.strictEqual(m.stepPage(24, 1, null), 25);
});

check('счётчик в шапке', () => {
  assert.strictEqual(m.pageLabel(24, 142), 'Стр. 24 из 142');
  assert.strictEqual(m.pageLabel(3, null), 'Стр. 3');
});

check('мусор в ответе не роняет раскладку', () => {
  const data = m.mapLessonTextbooks({ selected: { title: '  ' }, available: [{ textbookId: 1 }, null] });
  assert.strictEqual(data.selected, null);
  assert.strictEqual(data.available.length, 1);
  assert.strictEqual(data.available[0].title, 'Учебник');
});

const sample = process.argv[2];
if (sample) {
  console.log(`Живой ответ: ${sample}`);
  const data = m.mapLessonTextbooks(JSON.parse(fs.readFileSync(sample, 'utf8')));
  const entry = m.textbookEntry(data);
  console.log(`  строка: ${entry ? `«${entry.value}»` : 'нет'}`);
  if (entry?.open) {
    console.log(`  нажатие: просмотр «${entry.open.title}» со стр. ${m.startPage(entry.open)}`);
  } else if (entry) {
    console.log(`  нажатие: шит из ${entry.choose.length}`);
  }
}

console.log(`\n${passed} проверок пройдено`);
