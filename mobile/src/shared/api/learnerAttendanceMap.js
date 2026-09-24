/**
 * Посещаемость ученика и родителя за месяц — логика календаря и плитки главной без
 * вёрстки (ATTENDANCE-LEARNER-001).
 *
 * Бэкенд (`GET /api/attendance/summary`) отдаёт **уроки** месяца, календарь рисует
 * **дни**. У учителя в дне один-два урока его класса, и точка ставится на каждый
 * (`attendanceJournalMap.studentDays`). У ученика их 5–7 — столько точек в клетку 46 px не
 * влезет, поэтому день получает один маркер. Правило —
 * `.cursor/tasks/attendance-learner/01-architecture.md` §2.
 *
 * Счётчики месяца клиент не считает: они приходят с бэка по правилам §8, и плитка на
 * главной только подбирает им слова.
 */
import { dayMarkOf, monthKey, monthName, totalsParts, yearMonths } from './attendanceJournalMap';

/** Порядок пар в смешанном дне: сначала то, ради чего календарь открывают. */
const COMBO_ORDER = ['absent', 'late', 'excused', 'unpublished'];

/** Слова для подписи доступности — существительные, чтобы не гадать с родом ученика. */
const KIND_LABEL = {
  present: 'присутствие',
  absent: 'пропуск',
  late: 'опоздание',
  excused: 'освобождение',
  unpublished: 'не опубликовано',
};

function pad(value) {
  return String(value).padStart(2, '0');
}

/** «2026-09-24 10:15:00» по местным часам — сравнивается строкой с датой и началом урока. */
function momentKey(now) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} `
    + `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * Что урок даёт дню: вид отметки или `null` — в маркер он не идёт.
 *
 * Не начавшийся урок пуст: серая точка «не опубликовано» утром на весь день читалась бы
 * как долг учителя. `published` без отметки — ученика нет в опубликованном листе (пришёл
 * в класс позже): смотреть нечего, это не «не опубликовано».
 */
function lessonKind(lesson, nowKey) {
  if (lesson.lessonStatus === 'CANCELLED') return null;
  if (`${lesson.lessonDate} ${lesson.startTime || ''}` > nowKey) return null;
  if (lesson.attendance) return dayMarkOf(lesson.attendance);
  return lesson.published ? null : 'unpublished';
}

function dayMarker(lessons, nowKey) {
  if (lessons.every((lesson) => lesson.lessonStatus === 'CANCELLED')) {
    return { kind: 'cancelled', counts: {} };
  }
  const counts = {};
  for (const lesson of lessons) {
    const kind = lessonKind(lesson, nowKey);
    if (kind) counts[kind] = (counts[kind] || 0) + 1;
  }
  const kinds = Object.keys(counts);
  if (!kinds.length) return null;
  if (kinds.length === 1) return { kind: 'dot', mark: kinds[0], counts };
  return {
    kind: 'combo',
    items: COMBO_ORDER.filter((mark) => counts[mark]).map((mark) => ({ mark, count: counts[mark] })),
    counts,
  };
}

/**
 * Маркер каждого дня месяца: `{ '2026-09-09': marker }`, дни без маркера отсутствуют.
 *
 * - `{ kind: 'cancelled' }` — все уроки дня отменены, в клетке «–» (Figma `day-16`);
 * - `{ kind: 'dot', mark }` — все учтённые уроки одного вида: одна точка без числа;
 * - `{ kind: 'combo', items: [{ mark, count }] }` — смешанный день: точка с числом для
 *   каждого вида, кроме «присутствовал» (Figma `combo` «●1», `red-count` «●5»).
 *
 * У маркера всегда есть `counts` — полная раскладка дня для подписи доступности.
 */
export function learnerDays(summary, now = new Date()) {
  const nowKey = momentKey(now);
  const byDate = {};
  for (const lesson of summary?.lessons || []) {
    if (!lesson.lessonDate) continue;
    (byDate[lesson.lessonDate] = byDate[lesson.lessonDate] || []).push(lesson);
  }
  const days = {};
  for (const [date, lessons] of Object.entries(byDate)) {
    const marker = dayMarker(lessons, nowKey);
    if (marker) days[date] = marker;
  }
  return days;
}

/** «9: пропуск — 1, присутствие — 5» — клетку дня читает скринридер. */
export function dayA11yLabel(day, marker) {
  if (!marker) return String(day);
  if (marker.kind === 'cancelled') return `${day}: уроки отменены`;
  const parts = COMBO_ORDER.concat('present')
    .filter((mark) => marker.counts[mark])
    .map((mark) => `${KIND_LABEL[mark]} — ${marker.counts[mark]}`);
  return `${day}: ${parts.join(', ')}`;
}

/**
 * Месяцы, между которыми листает календарь: учебный год до текущего месяца включительно.
 * Будущий месяц пуст по определению; года нет (`academicYear: null`) — листать нечего.
 */
export function learnerMonths(academicYear, today = monthKey()) {
  return yearMonths(academicYear).filter((month) => month <= today);
}

/**
 * Подпись плитки «Посещаемость» на главной (Figma 2170:5075): «Сентябрь: 2 пропуска,
 * 1 опоздание». `null` — сводки нет (загрузка или ошибка), плитка берёт нейтральную.
 */
export function summaryTileLine(summary) {
  const name = monthName(summary?.month);
  if (!summary || !name) return null;
  const parts = totalsParts(summary);
  if (parts.length) return `${name}: ${parts.join(', ')}`;
  return summary.attendedCount > 0 ? `${name}: без пропусков` : `${name}: отметок пока нет`;
}
