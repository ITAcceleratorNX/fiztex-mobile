/**
 * Слова и раскладка модуля техники. Чистый модуль без React: то же правило, что у
 * `gradesMap`/`attendanceMap` — логика, в которой легко ошибиться незаметно, живёт отдельно
 * от экранов и проверяется скриптом.
 */

/** §6: подсказка говорит не что значит тип, а что он запрещает. */
export const PROBLEM_OPTIONS = [
  { value: 'DAMAGED', label: 'Повреждена', hint: 'Пользоваться можно с оговорками — выдавать не мешает' },
  { value: 'NOT_WORKING', label: 'Не работает', hint: 'Можно выдать техслужбе в ремонт' },
  { value: 'LOST', label: 'Потеряна', hint: 'Выдать и передать нельзя, пока не найдётся' },
];

export const HISTORY_ACTIONS = [
  { value: null, label: 'Все события' },
  { value: 'UNIT_CREATED', label: 'Принято на учёт' },
  { value: 'UNIT_UPDATED', label: 'Изменение номеров' },
  { value: 'ITEM_RENAMED', label: 'Переименование позиции' },
  { value: 'ISSUED', label: 'Выдача' },
  { value: 'RETURNED', label: 'Возврат' },
  { value: 'TRANSFERRED', label: 'Передача' },
  { value: 'PROBLEM_SET', label: 'Отметка проблемы' },
  { value: 'PROBLEM_CHANGED', label: 'Изменение проблемы' },
  { value: 'PROBLEM_CLEARED', label: 'Снятие проблемы' },
  { value: 'WRITTEN_OFF', label: 'Списание' },
];

const ACTIONS = {
  UNIT_CREATED: ['Принято на учёт', 'success'],
  UNIT_UPDATED: ['Изменены номера', 'blue'],
  ITEM_RENAMED: ['Позиция переименована', 'blue'],
  ISSUED: ['Выдано', 'blue'],
  RETURNED: ['Принято обратно', 'success'],
  TRANSFERRED: ['Передано', 'gold'],
  PROBLEM_SET: ['Проблема', 'red'],
  PROBLEM_CHANGED: ['Проблема изменена', 'gold'],
  PROBLEM_CLEARED: ['Проблема снята', 'success'],
  WRITTEN_OFF: ['Списано', 'gray'],
};

/** Справочник действий открытый — незнакомое значение показываем как есть. */
export function actionMeta(action) {
  const [label, color] = ACTIONS[action] || [action || 'Событие', 'gray'];
  return { label, color };
}

const STATES = {
  IN_STOCK: ['В наличии', 'success'],
  ISSUED: ['Выдано', 'blue'],
  WRITTEN_OFF: ['Списано', 'gray'],
};

export function stateMeta(state) {
  const [label, color] = STATES[state] || [state || '—', 'gray'];
  return { label, color };
}

export function problemLabel(problem) {
  if (!problem) return null;
  return PROBLEM_OPTIONS.find((item) => item.value === problem.type)?.label || 'Есть проблема';
}

export function formatEquipmentDate(value, withTime = true) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: withTime ? undefined : 'numeric',
    hour: withTime ? '2-digit' : undefined,
    minute: withTime ? '2-digit' : undefined,
  }).format(date).replace(',', ' ·');
}

/** Кого касалось действие: у передачи — обе стороны, у возврата и списания — прежний держатель. */
export function eventEmployee(event) {
  const before = event?.holderBefore?.fullName;
  const after = event?.holderAfter?.fullName;
  if (event?.action === 'TRANSFERRED' && before && after) return `${before} → ${after}`;
  if (event?.action === 'RETURNED' || event?.action === 'WRITTEN_OFF') return before || null;
  return after || before || null;
}

/** Пакетная команда пишет событие на экземпляр; лента показывает их одним действием. */
export function collapseEvents(events) {
  const groups = new Map();
  events.forEach((event, index) => {
    const key = event.operationId || `event-${event.id ?? index}`;
    const group = groups.get(key);
    if (group) group.events.push(event);
    else groups.set(key, { key, first: event, events: [event] });
  });
  return [...groups.values()];
}

export function historyGroupTitle(group) {
  const names = [...new Set(group.events.map((event) => event.itemName).filter(Boolean))];
  const item = names.length === 0 ? 'Позиция' : names.length === 1 ? names[0] : `${names.length} позиции`;
  if (group.events.length > 1) return `${item} · ${group.events.length} экз.`;
  const event = group.first;
  const number = event.inventoryNumber || '—';
  if (event.action === 'UNIT_UPDATED' && event.inventoryNumberBefore) {
    return `${item} · ${event.inventoryNumberBefore} → ${number}`;
  }
  if (event.action === 'ITEM_RENAMED' && event.itemNameBefore) {
    return `${event.itemNameBefore} → ${event.itemName || ''}`;
  }
  return `${item} · ${number}`;
}

export function roleLabel(role) {
  return {
    SUPER_ADMIN: 'Супер-администратор',
    ADMIN: 'Администратор',
    TEACHER: 'Учитель',
    CLEANING: 'Клининг',
    TECHNICIAN: 'Техслужба',
    SECURITY: 'Охрана',
    PSYCHOLOGIST: 'Психолог',
  }[role] || role || 'Сотрудник';
}

/**
 * Разбор отказа: форма `details` зависит от размера запроса — один экземпляр даёт объект,
 * пачка массив. Экрану нужен список в обоих случаях.
 */
export function conflictRows(error) {
  const details = error?.details;
  if (!details) return [];
  const rows = Array.isArray(details) ? details : [details];
  return rows.filter((row) => row && typeof row === 'object' && 'unitId' in row);
}

export function conflictText(error, fallback = 'Не удалось выполнить действие.') {
  const rows = conflictRows(error);
  if (rows.length === 0) return error?.message || fallback;
  return rows.map((row) => `${row.inventoryNumber || ''}: ${row.message || ''}`.trim()).join('\n');
}

/** Позиция из отказа «название занято» — экран предлагает добавить экземпляры в неё. */
export function conflictItem(error) {
  if (error?.code !== 'EQUIPMENT_ITEM_NAME_TAKEN') return null;
  const details = error?.details;
  return details?.itemId ? { id: details.itemId, name: details.name || '' } : null;
}

/** Держатель из отказа «числится за сотрудником» — им подписывается подтверждение списания. */
export function conflictHolder(error) {
  if (error?.code !== 'EQUIPMENT_UNIT_STILL_ISSUED') return null;
  return error?.details?.holder?.fullName || null;
}

/**
 * Что можно сделать с экземпляром прямо сейчас.
 *
 * Правила не вычисляются: `issuable` и `transferable` приходят с сервера (у техники
 * выдачу запрещает только «Потеряна»). Здесь — только раскладка ответа в список кнопок,
 * чтобы экран не решал это по месту.
 */
export function unitActions(unit) {
  if (!unit || unit.state === 'WRITTEN_OFF') return [];
  const actions = [];
  if (unit.state === 'ISSUED') {
    actions.push({ key: 'return', label: 'Принять обратно', icon: 'inbox' });
    if (unit.transferable) actions.push({ key: 'transfer', label: 'Передать сотруднику', icon: 'users' });
  } else if (unit.issuable) {
    actions.push({ key: 'issue', label: 'Выдать сотруднику', icon: 'users' });
  }
  actions.push({ key: 'edit', label: 'Изменить номера', icon: 'pencil' });
  if (unit.problem) actions.push({ key: 'resolve-problem', label: 'Снять проблему', icon: 'check' });
  else actions.push({ key: 'set-problem', label: 'Отметить проблему', icon: 'alertTriangle' });
  actions.push({ key: 'write-off', label: 'Списать', icon: 'trash', danger: true });
  return actions;
}
