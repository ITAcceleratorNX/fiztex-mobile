#!/usr/bin/env node
/**
 * Проверка логики модуля техники (ТЗ «Техника и инвентарь»).
 *
 * Тот же приём, что у соседних verify-скриптов: настоящий исходник компилируется
 * babel-пресетом проекта и выполняется здесь. Экранов тут нет — всё, в чём можно
 * ошибиться незаметно, живёт в чистом `equipmentModel.js`.
 *
 * Что закреплено:
 *  — состав действий берётся из ответа сервера (`issuable` / `transferable`), а не
 *    собирается заново: у техники выдачу запрещает только «Потеряна»;
 *  — списанный экземпляр действий не предлагает вовсе;
 *  — пакетная команда сворачивается в одно действие ленты;
 *  — отказ разбирается одинаково, пришёл он объектом (один экземпляр) или массивом (пачка);
 *  — незнакомое действие бэкенда не ломает ленту.
 *
 * Запуск:
 *   node scripts/verify-equipment-logic.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(ROOT, 'src/features/equipment/equipmentModel.js');

const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
  filename: file,
  presets: ['babel-preset-expo'],
  babelrc: false,
  configFile: false,
});

// Хелперы babel-runtime нужны настоящими — компилятор раскладывает в них деструктуризацию;
// всё остальное модулю не требуется, он чистый.
const fakeRequire = (id) => (id.startsWith('@babel/runtime') ? require(id) : {});
const module_ = { exports: {} };
new Function('require', 'module', 'exports', code)(fakeRequire, module_, module_.exports);

const {
  actionMeta,
  collapseEvents,
  conflictHolder,
  conflictItem,
  conflictText,
  eventEmployee,
  historyGroupTitle,
  problemLabel,
  stateMeta,
  unitActions,
} = module_.exports;

let failed = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failed += 1;
  }
}

// ── Действия над экземпляром ───────────────────────────────────────────────────

const inStock = { id: 1, state: 'IN_STOCK', issuable: true, transferable: false };
const keys = (unit) => unitActions(unit).map((action) => action.key);

check('в наличии — выдают', keys(inStock).includes('issue'));
check('в наличии — принимать нечего', !keys(inStock).includes('return'));

const lost = { id: 2, state: 'IN_STOCK', issuable: false, transferable: false, problem: { type: 'LOST' } };
check('потерянное не выдают', !keys(lost).includes('issue'));
check('потерянному предлагают снять проблему', keys(lost).includes('resolve-problem'));

const broken = { id: 3, state: 'IN_STOCK', issuable: true, problem: { type: 'NOT_WORKING' } };
check('неисправное выдают — ремонта в MVP нет', keys(broken).includes('issue'));

const issued = { id: 4, state: 'ISSUED', issuable: false, transferable: true, holder: { fullName: 'Иванов' } };
check('выданное принимают обратно', keys(issued).includes('return'));
check('выданное передают', keys(issued).includes('transfer'));

const issuedLost = { id: 5, state: 'ISSUED', issuable: false, transferable: false, problem: { type: 'LOST' } };
check('потерянное у сотрудника не передают', !keys(issuedLost).includes('transfer'));
check('потерянное у сотрудника всё же принимают', keys(issuedLost).includes('return'));

check('списанное действий не предлагает', unitActions({ id: 6, state: 'WRITTEN_OFF' }).length === 0);
check('списание предлагается всегда, пока вещь в учёте', keys(inStock).includes('write-off'));

// ── Слова ─────────────────────────────────────────────────────────────────────

check('состояние переведено', stateMeta('WRITTEN_OFF').label === 'Списано');
check('незнакомое состояние не ломает экран', stateMeta('REPAIR').label === 'REPAIR');
check('проблема переведена', problemLabel({ type: 'LOST' }) === 'Потеряна');
check('незнакомая проблема остаётся проблемой', problemLabel({ type: 'FLOODED' }) === 'Есть проблема');
check('незнакомое действие показывается как есть', actionMeta('INVENTORY_CHECKED').label === 'INVENTORY_CHECKED');

// ── Лента ─────────────────────────────────────────────────────────────────────

const batch = collapseEvents([
  { id: 1, operationId: 'op-1', action: 'ISSUED', itemName: 'Ноутбук', inventoryNumber: 'INV-1' },
  { id: 2, operationId: 'op-1', action: 'ISSUED', itemName: 'Ноутбук', inventoryNumber: 'INV-2' },
  { id: 3, operationId: 'op-2', action: 'RETURNED', itemName: 'Ноутбук', inventoryNumber: 'INV-1' },
]);
check('пакет свёрнут в одно действие', batch.length === 2);
check('в свёрнутом видно, сколько экземпляров', historyGroupTitle(batch[0]) === 'Ноутбук · 2 экз.');

const renamed = collapseEvents([
  { id: 4, action: 'ITEM_RENAMED', itemName: 'Ноутбук Lenovo', itemNameBefore: 'Ноутбук' },
]);
check('переименование показано как «было → стало»', historyGroupTitle(renamed[0]) === 'Ноутбук → Ноутбук Lenovo');

const renumbered = collapseEvents([
  { id: 5, action: 'UNIT_UPDATED', itemName: 'Ноутбук', inventoryNumber: 'INV-2', inventoryNumberBefore: 'INV-1' },
]);
check('правка номера показана стрелкой', historyGroupTitle(renumbered[0]) === 'Ноутбук · INV-1 → INV-2');

check('у передачи видны обе стороны', eventEmployee({
  action: 'TRANSFERRED',
  holderBefore: { fullName: 'Иванов' },
  holderAfter: { fullName: 'Петров' },
}) === 'Иванов → Петров');
check('у списания виден последний держатель', eventEmployee({
  action: 'WRITTEN_OFF',
  holderBefore: { fullName: 'Иванов' },
}) === 'Иванов');

// ── Отказы ────────────────────────────────────────────────────────────────────

const single = {
  code: 'EQUIPMENT_UNIT_ALREADY_ISSUED',
  message: 'занято',
  details: { unitId: 1, inventoryNumber: 'INV-1', message: 'Экземпляр уже у сотрудника: Иванов' },
};
const batchConflict = {
  code: 'EQUIPMENT_BATCH_CONFLICT',
  message: 'пакет отклонён',
  details: [
    { unitId: 1, inventoryNumber: 'INV-1', message: 'Экземпляр уже у сотрудника: Иванов' },
    { unitId: 2, inventoryNumber: 'INV-2', message: 'Экземпляр отмечен потерянным' },
  ],
};
check('одиночный отказ разобран', conflictText(single).includes('INV-1'));
check('пакетный отказ разобран построчно', conflictText(batchConflict).split('\n').length === 2);
check('сетевая ошибка остаётся текстом', conflictText({ message: 'нет связи' }) === 'нет связи');

check('позиция из отказа найдена', conflictItem({
  code: 'EQUIPMENT_ITEM_NAME_TAKEN',
  details: { itemId: 7, name: 'Проектор Epson' },
})?.id === 7);
check('чужой отказ позицию не даёт', conflictItem(single) === null);

check('держатель из отказа списания найден', conflictHolder({
  code: 'EQUIPMENT_UNIT_STILL_ISSUED',
  details: { unitId: 1, holder: { fullName: 'Иванов' } },
}) === 'Иванов');

if (failed > 0) {
  console.error(`\n${failed} проверок не прошло`);
  process.exit(1);
}
console.log('\nВсё сходится');
