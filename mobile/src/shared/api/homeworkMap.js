/**
 * Подписи домашнего задания (ТЗ HOMEWORK-005.1 §4.2, 005.2 §4, 005.3 §5).
 *
 * Правила вынесены из экранов: одно и то же задание рисуют список учителя, список
 * ученика, список родителя и три карточки, и разъехаться подписям нельзя — статус
 * «Возвращено» обязан читаться одинаково у всех, кто на него смотрит.
 */

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/**
 * Статус задания одним чипом — лента учителя. Просрочка не статус, а признак поверх
 * «Опубликовано» (HOMEWORK-001 §9): задание остаётся активным и лежит на вкладке
 * «Актуальные», но учителю нужен один ответ, поэтому истёкший срок вытесняет подпись.
 */
export function homeworkStatusChip(homework) {
  switch (homework?.status) {
    case 'DRAFT':
      return { label: 'Черновик', color: 'gray' };
    case 'PUBLISHED':
      return homework.overdue
        ? { label: 'Дедлайн', color: 'gold' }
        : { label: 'Опубликовано', color: 'success' };
    case 'COMPLETED':
      return { label: 'Завершено', color: 'blue' };
    case 'CANCELLED':
      return { label: 'Отменено', color: 'gray' };
    default:
      return null;
  }
}

/**
 * Статус работы одним чипом — то, что видит ученик и родитель.
 *
 * Пятая подпись, «Не выполнено», не пятый статус работы: это `NOT_SUBMITTED` у закрытого
 * задания (Figma «Ученик ДЗ — Не выполнено»). Пока задание открыто, «не отправлено»
 * означает «ещё успеешь», после завершения — «уже нет», и одна подпись на оба случая
 * вводила бы в заблуждение ровно в тот момент, когда это важнее всего.
 *
 * `tone` — семантика, а не цвет: экран не должен знать, каким токеном покрашено «сдано».
 *
 * @param {{status?: string, submissionStatus?: string}} row строка ленты или карточка
 */
export function submissionStatusChip(row) {
  const closed = row?.status === 'COMPLETED' || row?.status === 'CANCELLED';
  switch (row?.submissionStatus) {
    case 'DONE':
      return { label: 'Выполнено', tone: 'done' };
    case 'SUBMITTED':
      return { label: 'На проверке', tone: 'review' };
    case 'RETURNED':
      // Возвращённая работа у закрытого задания исправлению уже не подлежит.
      return closed
        ? { label: 'Не выполнено', tone: 'failed' }
        : { label: 'Возвращено', tone: 'returned' };
    case 'NOT_SUBMITTED':
    default:
      return closed
        ? { label: 'Не выполнено', tone: 'failed' }
        : { label: 'Не отправлено', tone: 'pending' };
  }
}

/**
 * Задание больше не принимает ответы. Считается по статусу задания, а не по сроку:
 * после дедлайна отправка остаётся открытой, пока учитель не завершит задание вручную
 * (HOMEWORK-003 §6) — именно это отличает «просрочено» от «закрыто».
 */
export function isClosed(homework) {
  return homework?.status === 'COMPLETED' || homework?.status === 'CANCELLED';
}

/**
 * Почему задание закрыто — строка красной плашки. Отдельно от `blockedReason` бэка:
 * тот объясняет запрет на отправку, а это подпись состояния, и у отменённого задания
 * в ней есть дата (Figma «Родитель ДЗ (деталь) — Отменено»).
 */
export function closedNotice(homework) {
  if (homework?.status === 'CANCELLED') {
    const date = dayMonth(homework.cancelledAt);
    return date
      ? `Задание отменено учителем ${date} — ответы больше не принимаются`
      : 'Задание отменено учителем — ответы больше не принимаются';
  }
  if (homework?.status === 'COMPLETED') {
    return 'Задание завершено учителем — ответы больше не принимаются';
  }
  return null;
}

/** «до 18 окт» — правая часть верхней строки. «Без срока» полноправный вариант (§4.2). */
export function dueShort(homework) {
  if (homework?.dueType === 'NONE' || !homework?.dueAt) return 'Без срока';
  const date = new Date(homework.dueAt);
  if (Number.isNaN(date.getTime())) return 'Без срока';
  return `до ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** «Срок сдачи: 18 октября» — строка карточки. */
export function dueLong(homework) {
  if (homework?.dueType === 'NONE' || !homework?.dueAt) return 'Без срока';
  const date = new Date(homework.dueAt);
  if (Number.isNaN(date.getTime())) return 'Без срока';
  return `Срок сдачи: ${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
}

/**
 * Показывать ли тег «Дедлайн истёк».
 *
 * Не просто «срок прошёл»: тег — это напоминание, что от ученика ещё чего-то ждут.
 * На принятой работе он сообщал бы о просрочке задним числом, а на закрытом задании
 * дедлайн уже ничего не решает — там своя подпись «Не выполнено».
 */
export function isOverdueOpen(homework) {
  if (!homework?.overdue || isClosed(homework)) return false;
  return homework.submissionStatus === 'NOT_SUBMITTED' || homework.submissionStatus === 'RETURNED';
}

/** «15 окт, 09:12» — отметка времени отправки или решения учителя. */
export function stamp(instant) {
  if (!instant) return null;
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return null;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${time}`;
}

/** «Математика · 9 «Б»» — подзаголовок карточки. */
export function subjectLine(homework) {
  const parts = [];
  if (homework?.subjectName) parts.push(homework.subjectName);
  if (homework?.className) {
    parts.push(homework.subgroupName
      ? `${homework.className} · ${homework.subgroupName}`
      : homework.className);
  }
  return parts.join(' · ');
}

/** «Предмет · Класс · до 18 окт» — верхняя строка ленты учителя. */
export function homeworkMetaLine(homework) {
  const parts = [];
  if (homework?.subjectName) parts.push(homework.subjectName);
  if (homework?.className) {
    parts.push(homework.subgroupName
      ? `${homework.className} · ${homework.subgroupName}`
      : homework.className);
  }
  parts.push(dueShort(homework));
  return parts.join(' · ');
}

/**
 * «Сдали / всего получателей» (§4.2). У черновика получателей ещё нет — там прочерк,
 * а не «0/0»: ноль из нуля читается как «никто не сдал», хотя сдавать пока нечего.
 */
export function progressLabel(homework) {
  const total = homework?.progress?.total ?? 0;
  if (homework?.status === 'DRAFT' || total === 0) return '—';
  return `${homework?.progress?.submitted ?? 0}/${total}`;
}

/** Односложный пересказ ответа для свёрнутой строки предыдущей версии. */
export function excerpt(text, limit = 40) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  return clean.length > limit ? `${clean.slice(0, limit).trimEnd()}…` : clean;
}

function dayMonth(instant) {
  if (!instant) return null;
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}
