export const PROBLEM_OPTIONS = [
  { value: 'LOST', label: 'Ключ утерян', hint: 'Ключа нет ни на посту, ни у сотрудника' },
  { value: 'DAMAGED', label: 'Ключ повреждён', hint: 'Ключ есть, но им нельзя пользоваться' },
  { value: 'UNAVAILABLE', label: 'Временно недоступен', hint: 'Другая причина, мешающая выдаче' },
];

export const HISTORY_ACTIONS = [
  { value: null, label: 'Все события' },
  { value: 'UNIT_CREATED', label: 'Создание' },
  { value: 'UNIT_RENAMED', label: 'Переименование' },
  { value: 'ISSUED', label: 'Выдача' },
  { value: 'RETURNED', label: 'Возврат' },
  { value: 'TRANSFERRED', label: 'Передача' },
  { value: 'PROBLEM_SET', label: 'Отметка проблемы' },
  { value: 'PROBLEM_CHANGED', label: 'Изменение проблемы' },
  { value: 'PROBLEM_CLEARED', label: 'Снятие проблемы' },
  { value: 'UNIT_DELETED', label: 'Удаление' },
];

const ACTIONS = {
  UNIT_CREATED: ['Создан', 'success'],
  UNIT_RENAMED: ['Переименован', 'blue'],
  ISSUED: ['Выдан', 'blue'],
  RETURNED: ['Возвращён', 'success'],
  TRANSFERRED: ['Передан', 'gold'],
  PROBLEM_SET: ['Проблема', 'red'],
  PROBLEM_CHANGED: ['Проблема изменена', 'gold'],
  PROBLEM_CLEARED: ['Проблема снята', 'success'],
  UNIT_DELETED: ['Удалён', 'gray'],
};

export function actionMeta(action) {
  const [label, color] = ACTIONS[action] || [action || 'Событие', 'gray'];
  return { label, color };
}

export function problemLabel(problem) {
  if (!problem) return null;
  return PROBLEM_OPTIONS.find((item) => item.value === problem.type)?.label || 'Есть проблема';
}

export function formatKeyDate(value, withTime = true) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: 'short', year: withTime ? undefined : 'numeric',
    hour: withTime ? '2-digit' : undefined, minute: withTime ? '2-digit' : undefined,
  }).format(date).replace(',', ' ·');
}

export function eventEmployee(event) {
  const before = event?.holderBefore?.fullName;
  const after = event?.holderAfter?.fullName;
  if (event?.action === 'TRANSFERRED' && before && after) return `${before} → ${after}`;
  if (event?.action === 'RETURNED') return before || null;
  return after || before || null;
}

export function collapseKeyEvents(events) {
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
  const names = [...new Set(group.events.map((event) => event.groupName).filter(Boolean))];
  const object = names.length === 0 ? 'Удалённый объект' : names.length === 1 ? names[0] : `${names.length} объекта`;
  const key = group.events.length === 1
    ? group.first.unitLabel || group.first.unitLabelBefore || 'Ключ'
    : `${group.events.length} ключей`;
  return `${object} · ${key}`;
}

export function roleLabel(role) {
  return {
    SUPER_ADMIN: 'Супер-администратор', ADMIN: 'Администратор', TEACHER: 'Учитель',
    CLEANING: 'Клининг', TECHNICIAN: 'Техслужба', SECURITY: 'Охрана', PSYCHOLOGIST: 'Психолог',
  }[role] || role || 'Сотрудник';
}
