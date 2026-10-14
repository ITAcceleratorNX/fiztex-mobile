#!/usr/bin/env node
/**
 * Проверка показа динамики оценок (FRONTEND Student Grade Dynamics §3, §6).
 *
 * Средний, изменение, статус и точки графика считает бэк; приложение решает только, как
 * их показать. Это и закрепляется: значок изменения, «оценки не выставляются» против
 * «нет оценок за период», подпись сравнения по фактическому прошлому окну и исходная
 * форма баллов СОР/СОЧ. Исходник компилируется тем же babel-пресетом, что и приложение.
 *
 * Запуск: node scripts/verify-grade-dynamics.cjs
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
  new Function('require', 'module', 'exports', code)((id) => require(id), mod, mod.exports);
  return mod.exports;
}

let passed = 0;
let failed = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed += 1; else failed += 1;
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — получено ${JSON.stringify(actual)}, ожидалось ${JSON.stringify(expected)}`}`);
}

const map = load('src/shared/api/gradeDynamicsMap.js');
const avg = (value) => ({ state: 'AVAILABLE', mode: 'SCALE_AVERAGE', value });

console.log('\n=== Значения и изменение ===');
check('средний шкалы', map.formatIndicator(avg(7.8)), '7,8');
check('процент политики', map.formatIndicator({ state: 'AVAILABLE', mode: 'POLICY_PERCENT', value: 84.2 }), '84,2%');
check('нет оценок — не ноль', map.formatIndicator({ state: 'NO_DATA', value: null }), null);
check('рост', map.changeBadge({ trend: 'GROWTH', change: 0.6 }), { text: '+0,6', tone: 'growth' });
check('снижение', map.changeBadge({ trend: 'DECLINE', change: -0.5 }), { text: '−0,5', tone: 'decline' });
check('стабильно', map.changeBadge({ trend: 'STABLE', change: 0 }), { text: '0,0 Стабильно', tone: 'stable' });
check('нет сравнения', map.changeBadge({ trend: 'INSUFFICIENT_DATA' }), { text: 'Нет данных для сравнения', tone: 'neutral' });

console.log('\n=== Предмет без оценивания ===');
check('не оценивается', map.notGraded({ current: { state: 'NO_DATA' }, previous: { state: 'NO_DATA' } }), true);
check('пропуск в периоде — оценивается', map.notGraded({ current: { state: 'NO_DATA' }, previous: avg(7) }), false);

console.log('\n=== Подписи окна и сравнения ===');
check('четверть', map.windowLabel({ type: 'QUARTER', academicPeriodName: '1 четверть', from: '2026-09-01', to: '2026-10-27' }), '1 четверть (01.09 – 27.10)');
check('неделя', map.windowLabel({ type: 'WEEK', from: '2026-10-13', to: '2026-10-19' }), '13–19 окт');
check('сравнение с четвертью прошлого года', map.compareLabel({ type: 'QUARTER', academicPeriodName: '4 четверти', academicYearName: '2025–2026' }), 'к 4 четверти 2025–2026');
check('сравнение с прошлой неделей', map.compareLabel({ type: 'WEEK', from: '2026-10-06', to: '2026-10-12' }), 'к прошлой неделе (6–12 окт)');
check('шаг графика четверти', map.seriesTitle('WEEK'), 'Средний балл по неделям');

console.log('\n=== СОР и СОЧ как есть ===');
check('СОР в баллах', map.pointValue({ score: 23, maxScore: 25, gradeType: 'SUMMATIVE_SECTION' }), { main: '23', max: '25' });
check('десятибалльная', map.pointValue({ score: 8, maxScore: 10 }), { main: '8' });
check('код шкалы', map.pointValue({ scaleCode: '4+' }), { main: '4+' });
check('вид СОЧ', map.pointKind({ gradeType: 'SUMMATIVE_TERM' }), 'SOCH');
check('вид СОР по компоненту', map.pointKind({ component: 'SOR' }), 'SOR');

console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} пройдено, ${failed} упало`);
process.exit(failed === 0 ? 0 : 1);
