import { PUSH_DATA_VERSION } from '@shared/push/routes';

/**
 * Лента центра уведомлений: как её показать — чистая логика, без React.
 *
 * Тексты строк собирает бэк (версия шаблона и параметры, ТЗ §2), здесь — только раскладка по дням, подписи
 * времени, иконка и переход. Переход строится тем же словарём маршрутов, что и у пуша (`push/routes.js`):
 * строка ленты несёт те же `route`, `params` и `childProfileId`, и второй таблицы переходов заводить нельзя —
 * пуш и лента вели бы об одном событии в разные места.
 */

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const pad = (n) => String(n).padStart(2, '0');

function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shiftDays(date, days) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function clock(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parse(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Заголовок дня: «Сегодня», «Вчера» или «12 октября» (с годом, если не текущий). */
export function dayLabel(value, now = new Date()) {
  const date = parse(value);
  if (!date) return '';
  const key = dayKey(date);
  if (key === dayKey(now)) return 'Сегодня';
  if (key === dayKey(shiftDays(now, -1))) return 'Вчера';
  const year = date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`;
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}${year}`;
}

/** Подпись времени строки, как в макете: «08:20», «Вчера, 16:45», «12 окт, 10:00». */
export function timeLabel(value, now = new Date()) {
  const date = parse(value);
  if (!date) return '';
  const key = dayKey(date);
  if (key === dayKey(now)) return clock(date);
  if (key === dayKey(shiftDays(now, -1))) return `Вчера, ${clock(date)}`;
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}, ${clock(date)}`;
}

/**
 * Строки по дням, в порядке ленты (новые сверху). Порядок не пересчитывается: его задаёт сервер, а повторная
 * сортировка на клиенте спорила бы с курсором следующей страницы.
 * @returns {{ key: string, title: string, items: object[] }[]}
 */
export function groupByDay(items, now = new Date()) {
  const sections = [];
  for (const item of items ?? []) {
    const date = parse(item.createdAt);
    const key = date ? dayKey(date) : 'unknown';
    const last = sections[sections.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      sections.push({ key, title: date ? dayLabel(date, now) : '', items: [item] });
    }
  }
  return sections;
}

/**
 * Иконка по виду уведомления. Вид — только для картинки: куда вести, решает маршрут.
 * Незнакомый вид (бэк добавил новый) — колокольчик, а не пустое место.
 */
const ICONS = {
  HOMEWORK_PUBLISHED: { icon: 'fileText', tone: 'blue' },
  TEST_AVAILABLE: { icon: 'clipboardCheck', tone: 'blue' },
  HOMEWORK_DUE_SOON: { icon: 'clock', tone: 'orange' },
  TEST_DUE_SOON: { icon: 'clock', tone: 'orange' },
  HOMEWORK_DUE_CHANGED: { icon: 'calendar', tone: 'blue' },
  TEST_RESULT_READY: { icon: 'award', tone: 'green' },
  GRADE_POSTED: { icon: 'award', tone: 'green' },
  ATTENDANCE_ABSENCE: { icon: 'alertTriangle', tone: 'red' },
  MONTHLY_FEEDBACK: { icon: 'chat', tone: 'blue' },
};

export function iconFor(kind) {
  return ICONS[kind] ?? { icon: 'bell', tone: 'blue' };
}

/**
 * Строка ленты в форме данных пуша — для `resolvePushTarget`. Аккаунт — свой: лента приходит только своему
 * аккаунту, а сверка «пуш другому человеку» здесь не нужна.
 */
export function pushDataFor(item, accountId) {
  return {
    v: PUSH_DATA_VERSION,
    nid: item.id,
    kind: item.kind,
    accountId,
    route: item.route,
    params: item.params ?? {},
    childProfileId: item.childProfileId ?? null,
  };
}

/** Метка строки: у родителя — имя ребёнка (ТЗ Parent §2: к кому событие, видно сразу). */
export function contextTag(item) {
  return item.childName ? item.childName : null;
}

/** Число на бейдже колокольчика: больше 99 — «99+», ноль — бейджа нет. */
export function badgeLabel(count) {
  if (!count || count < 1) return null;
  return count > 99 ? '99+' : String(count);
}

/** Строки с отметкой «прочитано» — после ответа сервера или оптимистично. */
export function markItemsRead(items, ids) {
  const set = ids instanceof Set ? ids : new Set(ids);
  return (items ?? []).map((item) => (set.has(item.id) && !item.read ? { ...item, read: true } : item));
}

/** «Прочитать все»: всё, что не новее `upTo`, — то же правило, что у сервера. */
export function markAllReadUpTo(items, upTo) {
  const limit = parse(upTo);
  return (items ?? []).map((item) => {
    const created = parse(item.createdAt);
    return !item.read && (!limit || (created && created <= limit)) ? { ...item, read: true } : item;
  });
}
