/**
 * Журнал посещаемости учителя за месяц — вся логика экранов без вёрстки
 * (ATTENDANCE-TEACHER-001): список с пиллами и календарь ученика.
 *
 * Это осознанный дубль веба (`fiztex-web/src/lib/attendanceJournalModel.ts`): общего
 * пакета между модулями нет, и правила «что за точка у урока» обязаны совпадать в обоих
 * местах — учитель смотрит один и тот же журнал с телефона и с компьютера.
 *
 * Бэкенд отдаёт **уроки**, экраны рисуют **дни**: переход «уроки → дни» живёт здесь.
 */

// ─── Отметка → точка ────────────────────────────────────────────────────────

/**
 * Что стоит в дне за один урок. `null` — урок к ученику не относится.
 * Схлопывание то же, что у чипа расписания (`attendanceMap.attendanceChip`): опоздание —
 * это посещение, освобождение — не пропуск (`attendance-read-contract.md` §8).
 */
export function dayMarkOf(marking) {
  if (marking?.status === 'PRESENT') return marking.mark === 'LATE' ? 'late' : 'present';
  if (marking?.status === 'ABSENT') return marking.mark === 'EXCUSED' ? 'excused' : 'absent';
  return null;
}

/** Цвет точки — имя токена темы (`ThemeContext`, группа `journalMarks`). */
export const MARK_TOKEN = {
  present: 'markPresent',
  absent: 'markAbsent',
  late: 'markLate',
  excused: 'markExcused',
  unpublished: 'markUnpublished',
};

/** Легенда календаря ученика (Figma 2170:4748, `legend`): две строки, как в макете. */
export const CALENDAR_LEGEND = [
  [
    { mark: 'present', label: 'Присутств.' },
    { mark: 'absent', label: 'Пропуск' },
    { mark: 'late', label: 'Опоздание' },
    { mark: 'excused', label: 'Освобожд.' },
  ],
  [
    { mark: 'unpublished', label: 'Не опубл.' },
    { mark: 'cancelled', label: 'Отменён' },
  ],
];

/** Легенда списка (Figma 2170:4404, `legend-row`): только то, что считают пиллы. */
export const LIST_LEGEND = [
  { mark: 'absent', label: 'Пропуски' },
  { mark: 'late', label: 'Опоздания' },
  { mark: 'excused', label: 'Освобождения' },
];

// ─── Месяцы учебного года ───────────────────────────────────────────────────

const MONTHS_NOMINATIVE = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/** «2026-09» для даты по местным часам. */
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** «2026-09» → «Сентябрь»; `null`, если это не месяц. */
export function monthName(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || '');
  return (match && MONTHS_NOMINATIVE[Number(match[2]) - 1]) || null;
}

/** «2026-09» → «Сентябрь 2026». */
export function monthLabel(month) {
  const name = monthName(month);
  return name ? `${name} ${month.slice(0, 4)}` : month || '';
}

/**
 * Месяцы учебного года по порядку. Границы отдаёт бэкенд
 * (`teacher-journal/options`): календарь школы клиенту неизвестен.
 */
export function yearMonths(year) {
  if (!year?.startDate || !year?.endDate) return [];
  const months = [];
  const [startYear, startMonth] = year.startDate.split('-').map(Number);
  const end = year.endDate.slice(0, 7);
  for (let y = startYear, m = startMonth; months.length < 24; m += 1) {
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const key = `${y}-${String(m).padStart(2, '0')}`;
    months.push(key);
    if (key >= end) break;
  }
  return months;
}

/** Текущий месяц, если он в учебном году; иначе ближайший прошедший; иначе первый. */
export function defaultMonth(months, today = monthKey()) {
  if (!months?.length) return null;
  if (months.includes(today)) return today;
  const past = months.filter((month) => month < today);
  return past.length ? past[past.length - 1] : months[0];
}

/** Соседний месяц в пределах учебного года — стрелки календаря. `null` — дальше некуда. */
export function shiftMonth(months, month, delta) {
  const index = months.indexOf(month);
  if (index < 0) return null;
  return months[index + delta] ?? null;
}

// ─── Класс и подгруппа ──────────────────────────────────────────────────────

/** Ключ пары для шита выбора: «12» — весь класс, «12:34» — подгруппа. */
export function scopeKey(scope) {
  return scope?.subgroupId != null ? `${scope.classId}:${scope.subgroupId}` : String(scope?.classId);
}

/** «5А · Подгруппа 1» — как в макете мобилки (веб пишет через тире). */
export function scopeLabel(scope) {
  if (!scope) return '';
  return scope.subgroupName ? `${scope.className} · ${scope.subgroupName}` : scope.className || '';
}

// ─── Имена ──────────────────────────────────────────────────────────────────

/** «Александров Дмитрий Сергеевич» → «Александров Д.С.». */
export function shortName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} ${parts.slice(1).map((part) => `${part[0].toUpperCase()}.`).join('')}`;
}

function nameWithFirstName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(' ');
  return `${parts[0]} ${parts[1]} ${parts.slice(2).map((part) => `${part[0].toUpperCase()}.`).join('')}`;
}

/**
 * Короткие имена всего списка сразу: у совпавших инициалов имя пишется целиком. В
 * демо-школе это близнецы «Амангельдиева Айгерим» и «Амангельдиева Айгуль» — обе
 * «Амангельдиева А.М.», и две одинаковые строки подряд не различить.
 */
export function shortNames(fullNames) {
  const short = fullNames.map(shortName);
  const counts = new Map();
  short.forEach((name) => counts.set(name, (counts.get(name) || 0) + 1));
  return short.map((name, index) => (counts.get(name) > 1 ? nameWithFirstName(fullNames[index]) : name));
}

// ─── Итоги ученика ──────────────────────────────────────────────────────────

function plural(n, [one, few, many]) {
  const tail = n % 100 >= 11 && n % 100 <= 14 ? 5 : n % 10;
  if (tail === 1) return one;
  if (tail >= 2 && tail <= 4) return few;
  return many;
}

/**
 * Пиллы строки списка (Figma `pills`): пропуски, опоздания, освобождения — только
 * ненулевые. Цифры считает бэкенд (§8), здесь только выбор, что показать.
 */
export function studentPills(student) {
  return [
    { mark: 'absent', count: student?.missedCount || 0 },
    { mark: 'late', count: student?.lateCount || 0 },
    { mark: 'excused', count: student?.excusedCount || 0 },
  ].filter((pill) => pill.count > 0);
}

/**
 * Ненулевые итоги словами: `['2 пропуска', '1 опоздание']`. Поля те же у строки журнала
 * учителя и у месяца ученика (`/summary`) — счётчики §8 одни на все экраны.
 */
export function totalsParts(totals) {
  const parts = [];
  const missed = totals?.missedCount || 0;
  const late = totals?.lateCount || 0;
  const excused = totals?.excusedCount || 0;
  if (missed) parts.push(`${missed} ${plural(missed, ['пропуск', 'пропуска', 'пропусков'])}`);
  if (late) parts.push(`${late} ${plural(late, ['опоздание', 'опоздания', 'опозданий'])}`);
  if (excused) parts.push(`${excused} ${plural(excused, ['освобождение', 'освобождения', 'освобождений'])}`);
  return parts;
}

/** Строка итогов календаря: «2 пропуска · 1 опоздание · 1 освобождение» или «Без пропусков». */
export function statsLine(student) {
  const parts = totalsParts(student);
  return parts.length ? parts.join(' · ') : 'Без пропусков';
}

// ─── Дни ученика ────────────────────────────────────────────────────────────

/**
 * Отметка ученика на одном уроке либо `null`, если урок к нему не относится.
 *
 * Будущий урок пуст: серая точка «не опубликовано» на нём читалась бы как долг учителя.
 * Состав урока знают строки листа — если лист есть. У незаполненного урока строк нет, и
 * чей он, видно по адресату: урок класса — всех, урок подгруппы — только в журнале этой
 * подгруппы.
 */
function markFor(lesson, studentId, subgroupFiltered, today) {
  if (lesson.status === 'CANCELLED') {
    return lesson.subgroupId == null || subgroupFiltered ? 'cancelled' : null;
  }
  if ((lesson.lessonDate || '') > today) return null;
  const entries = lesson.entries || [];
  const entry = entries.find((row) => row.studentProfileId === studentId);
  if (entry) return dayMarkOf(entry.attendance) || 'unpublished';
  if (entries.length > 0) return null;
  return lesson.subgroupId == null || subgroupFiltered ? 'unpublished' : null;
}

/**
 * Отметки ученика по дням месяца: `{ '2026-09-03': ['present', 'late'] }`. Уроки внутри
 * дня — по времени, две точки читаются слева направо, как шли уроки.
 */
export function studentDays(journal, studentId, { subgroupFiltered = false, today } = {}) {
  const days = {};
  const lessons = [...(journal?.lessons || [])].sort((a, b) =>
    `${a.lessonDate} ${a.startTime}`.localeCompare(`${b.lessonDate} ${b.startTime}`));
  for (const lesson of lessons) {
    if (!lesson.lessonDate) continue;
    const mark = markFor(lesson, studentId, subgroupFiltered, today);
    if (!mark) continue;
    (days[lesson.lessonDate] = days[lesson.lessonDate] || []).push(mark);
  }
  return days;
}

/**
 * Сетка месяца по неделям с понедельника (Figma `calendar`): семь клеток в строке,
 * пустые места до 1-го и после последнего — `null`.
 */
export function calendarWeeks(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || '');
  if (!match) return [];
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const count = new Date(year, monthIndex + 1, 0).getDate();
  const lead = (new Date(year, monthIndex, 1).getDay() + 6) % 7;

  const cells = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) {
    const weekday = (lead + day - 1) % 7;
    cells.push({
      date: `${match[1]}-${match[2]}-${String(day).padStart(2, '0')}`,
      day,
      weekend: weekday >= 5,
    });
  }
  while (cells.length % 7) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
