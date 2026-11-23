/**
 * Причина отсутствия у родителя (Figma `phyztex` Р2–Р9): слова и раскладка экрана, без React.
 * Состояние дня, «можно ли ответить» и «ждут ли причину» считает сервер (`status`, `canRespond`,
 * `needsReason`) — здесь они только называются. Проверка — `node scripts/verify-absence-reasons.cjs`.
 */

/** Справочник причин — тот же, что у отметки урока; «Не указана» в форме не выбирается. */
export const ABSENCE_REASONS = [
  { value: 'ILLNESS', label: 'Болезнь' },
  { value: 'FAMILY', label: 'Семейные обстоятельства' },
  { value: 'SCHOOL_EVENT', label: 'Школьное мероприятие' },
  { value: 'COMPETITION', label: 'Соревнования' },
  { value: 'TRANSPORT', label: 'Транспорт' },
  { value: 'UNEXCUSED', label: 'Без уважительной причины' },
  { value: 'OTHER', label: 'Другое' },
];

export const COMMENT_LIMIT = 500;

export function absenceReasonLabel(reason) {
  return ABSENCE_REASONS.find((item) => item.value === reason)?.label ?? 'Другое';
}

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

/** Дата школы без перевода через UTC: «2026-11-17» — это день, а не полночь по Гринвичу. */
function parseDate(date) {
  const [year, month, day] = String(date || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
}

const pad = (value) => String(value).padStart(2, '0');

/** «Вторник, 17 ноября» — заголовок шторки дня. */
export function dayTitle(date) {
  const d = parseDate(date);
  return d ? `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}` : '';
}

/** «17 ноября» — в блоке «Нужна причина» и подписи формы. */
export function dayMonth(date) {
  const d = parseDate(date);
  return d ? `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}` : '';
}

/** «18.11, 12:40» — момент ответа или решения. */
export function momentLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function lessonsCount(count) {
  const n = count ?? 0;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11 ? 'урок'
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) ? 'урока' : 'уроков';
  return `${n} ${word}`;
}

/** «Пропущено 3 урока» над списком уроков дня. */
export function missedTitle(count) {
  return `Пропущено ${lessonsCount(count)}`;
}

/** Границы месяца «2026-11» для запроса дней. */
export function monthRange(month) {
  const [year, mon] = String(month || '').split('-').map(Number);
  if (!year || !mon) return null;
  const last = new Date(year, mon, 0).getDate();
  return { from: `${year}-${pad(mon)}-01`, to: `${year}-${pad(mon)}-${pad(last)}` };
}

/** «Сапарова А.К.» из «Сапарова Айгуль Каримовна». */
export function teacherShortName(fullName) {
  const [last, ...rest] = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!last) return null;
  const initials = rest.map((part) => `${part[0].toUpperCase()}.`).join('');
  return initials ? `${last} ${initials}` : last;
}

/** Дни, которые ждут причину от родителя, — подсветка календаря. */
export function needsReasonDates(days) {
  return new Set((days?.items ?? []).filter((item) => item.needsReason).map((item) => item.date));
}

/** Дни отсутствия по дате — нажатие по клетке открывает шторку только у них. */
export function absenceByDate(days) {
  const map = {};
  for (const item of days?.items ?? []) map[item.date] = item;
  return map;
}

/**
 * Блок под календарём (Р2): самый свежий день, где ждут причину. Запрос классного руководителя
 * важнее самостоятельной инициативы — о нём и пишем, если он есть.
 */
export function pendingReasonCard(days) {
  const items = (days?.items ?? []).filter((item) => item.needsReason);
  if (items.length === 0) return null;
  const top = items.find((item) => item.requested) ?? items[0];
  const more = items.length - 1;
  return {
    date: top.date,
    title: 'Нужна причина отсутствия',
    text: `${dayMonth(top.date)} · ${lessonsCount(top.absentLessonCount)}. `
      + (top.requested
        ? 'Классный руководитель просит указать причину'
        : 'Причину можно указать самостоятельно')
      + (more > 0 ? ` · ещё ${more} ${more === 1 ? 'день' : more < 5 ? 'дня' : 'дней'}` : ''),
  };
}

/** Последний свой ответ — его показывает шторка (Р7, Р8). */
export function lastOwnResponse(day) {
  const responses = day?.myResponses ?? [];
  return responses[responses.length - 1] ?? null;
}

/**
 * Что показать в шторке дня (Р3, Р4, Р7, Р8, Р9) — раскладка по серверному состоянию.
 *
 * @returns {{ kind: 'confirmed'|'pending'|'clarify'|'requested'|'open'|'closed', response: object|null }}
 */
export function daySheetState(day) {
  if (!day) return { kind: 'closed', response: null };
  const mine = lastOwnResponse(day);
  if (day.status === 'CONFIRMED' && day.reason) return { kind: 'confirmed', response: mine };
  if (mine?.status === 'PENDING') return { kind: 'pending', response: mine };
  if (mine?.status === 'REJECTED') return { kind: 'clarify', response: mine };
  if (day.status === 'AWAITING_CONFIRMATION') return { kind: 'pending', response: null };
  if (day.openRequest) return { kind: 'requested', response: null };
  return { kind: 'open', response: null };
}

/** Подпись кнопки ответа: после отклонения — новый ответ, а не первый. */
export function respondLabel(state) {
  return state.kind === 'clarify' ? 'Отправить новую причину' : 'Указать причину';
}

/** Текст отказа отправки — словами; при сбое сети форма сохраняется (Р6). */
export function respondErrorText(error) {
  if (!error) return null;
  if (error.status === 0) {
    return 'Проверьте соединение — выбранная причина и комментарий сохранились, можно повторить.';
  }
  switch (error.code) {
    case 'ABSENCE_REASON_RESPONSE_PENDING':
      return 'Ваш ответ уже у классного руководителя — дождитесь его решения.';
    case 'ABSENCE_REASON_NO_ABSENCE':
      return 'Пропусков в этот день больше нет — учитель исправил отметки.';
    case 'ABSENCE_REASON_TEXT_TOO_LONG':
      return `Комментарий длиннее ${COMMENT_LIMIT} символов — сократите его.`;
    case 'ABSENCE_CHILD_NOT_ACCESSIBLE':
      return 'Ребёнок больше не привязан к вашему аккаунту.';
    default:
      return error.message || 'Не удалось отправить. Попробуйте ещё раз.';
  }
}
