/**
 * Модель недельной сетки: неделя расписания → строки, колонки и ячейки.
 *
 * Чистые функции без React — это единственное место, где решается, какой урок в
 * какой клетке оказался. Вёрстка (`ScheduleWeekGrid`) только рисует то, что здесь
 * посчитано, а `scripts/verify-schedule-logic.cjs` гоняет эти же функции напрямую.
 *
 * Figma «Расписание – Сетка» (node 2085:9402): колонки — учебные дни недели,
 * строки — номера уроков с временем начала, ячейка — предмет.
 */

import { localDateKey } from '@shared/api/scheduleMap';

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/**
 * В макете семь строк даже там, где уроков меньше, — таблица не должна менять
 * высоту от недели к неделе. Если уроков больше, сетка растёт: терять урок нельзя.
 */
export const MIN_GRID_ROWS = 7;

/** Дата через `offset` дней от понедельника недели (YYYY-MM-DD → YYYY-MM-DD). */
function dateAtOffset(weekStart, offset) {
  const d = new Date(`${weekStart}T12:00:00`);
  d.setDate(d.getDate() + offset);
  return localDateKey(d);
}

/** Событие календаря, закрывающее день целиком (каникулы, выходной, актированный день). */
function blockingEvent(events, dateStr) {
  if (!Array.isArray(events)) return null;
  return (
    events.find((e) => {
      if (e.effect !== 'NO_LESSONS') return false;
      const from = e.dateFrom || null;
      const to = e.dateTo || from;
      if (!from) return false;
      return from <= dateStr && dateStr <= to;
    }) || null
  );
}

/**
 * Колонки недели — по учебным дням школы, а не по фиксированной пятидневке:
 * у шестидневки обязана быть суббота, иначе её уроки просто исчезнут из сетки.
 *
 * @param {string} weekStart понедельник недели (YYYY-MM-DD)
 * @param {number[]} offsets смещения учебных дней от понедельника (см. workingDayOffsets)
 */
export function buildWeekColumns(weekStart, offsets, { events = [], todayStr = null } = {}) {
  return offsets.map((offset) => {
    const date = dateAtOffset(weekStart, offset);
    const holiday = blockingEvent(events, date);
    return {
      date,
      label: DAY_LABELS[offset] || '',
      dayNum: Number(date.slice(8, 10)),
      isToday: date === todayStr,
      holiday: holiday ? holiday.title || holiday.reason || 'Выходной' : null,
    };
  });
}

/**
 * Строки сетки — номера уроков, а не позиции в списке: у 2-го урока во вторник и
 * в пятницу одна строка, даже если в понедельник первого урока нет вовсе.
 *
 * <p>Время строки берётся у первого урока с этим номером. Оно может отличаться по
 * дням (разные звонки у классов учителя) — тогда показываем самое раннее, как
 * ориентир, а точное время урока остаётся в карточке.
 *
 * <p>У урока, заведённого вручную, номера может не быть: такой урок получает
 * собственную строку по времени начала — потерять его нельзя.
 */
export function buildWeekRows(lessons = []) {
  const byKey = new Map();
  for (const lesson of lessons) {
    const number = lesson?.raw?.lessonNumber ?? null;
    const time = lesson?.time && lesson.time !== '—' ? lesson.time : null;
    const key = number != null ? `n${number}` : `t${time || '?'}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { key, number, time });
    } else if (time && (!existing.time || time < existing.time)) {
      existing.time = time;
    }
  }

  const rows = [...byKey.values()].sort(compareRows);

  // Добор до семи строк макета — только номерами, которых ещё нет.
  const used = new Set(rows.map((r) => r.number).filter((n) => n != null));
  for (let n = 1; rows.length < MIN_GRID_ROWS; n += 1) {
    if (!used.has(n)) {
      rows.push({ key: `n${n}`, number: n, time: null });
      used.add(n);
    }
  }
  return rows.sort(compareRows);
}

/** Сначала по времени, потом по номеру: время задаёт реальный порядок дня. */
function compareRows(a, b) {
  if (a.time && b.time && a.time !== b.time) return a.time < b.time ? -1 : 1;
  if (a.time && !b.time) return -1;
  if (!a.time && b.time) return 1;
  if (a.number == null) return 1;
  if (b.number == null) return -1;
  return a.number - b.number;
}

function cellKey(rowKey, date) {
  return `${rowKey}|${date}`;
}

/**
 * Сетка недели целиком.
 *
 * @param {object} view    ответ `/api/schedule/*\/week` после `mapScheduleView`
 * @param {string} weekStart понедельник недели (YYYY-MM-DD)
 * @param {number[]} offsets учебные дни как смещения от понедельника
 * @param {string} todayStr  сегодняшняя дата — по ней подсвечивается колонка
 * @returns {{columns: object[], rows: object[], lessonsAt: function, isEmpty: boolean}}
 */
export function buildWeekGrid({ view, weekStart, offsets, todayStr = null }) {
  const columns = buildWeekColumns(weekStart, offsets, {
    events: view?.events,
    todayStr,
  });
  const dates = new Set(columns.map((col) => col.date));
  // Урок вне учебных дней недели рисовать некуда — в сетке для него нет колонки.
  const lessons = (view?.lessons || []).filter((l) => dates.has(l.date));
  const rows = buildWeekRows(lessons);

  const cells = new Map();
  for (const lesson of lessons) {
    const number = lesson?.raw?.lessonNumber ?? null;
    const time = lesson?.time && lesson.time !== '—' ? lesson.time : null;
    const rowKey = number != null ? `n${number}` : `t${time || '?'}`;
    const key = cellKey(rowKey, lesson.date);
    const bucket = cells.get(key);
    if (bucket) bucket.push(lesson);
    else cells.set(key, [lesson]);
  }

  return {
    columns,
    rows,
    lessonsAt: (rowKey, date) => cells.get(cellKey(rowKey, date)) || [],
    isEmpty: lessons.length === 0,
  };
}

/**
 * Подпись урока в ячейке. Учитель ведёт один предмет у разных классов, поэтому
 * без класса его сетка нечитаема; ученику и родителю класс известен и так.
 * Figma: «Алгебра» у ученика, «Алгебра · 11А» у учителя.
 */
export function cellLabel(lesson, role) {
  const subject = lesson?.subject || 'Урок';
  if (role !== 'teacher') return subject;
  const target = lesson?.subgroupName || lesson?.className;
  return target ? `${subject} · ${target}` : subject;
}

/**
 * Полная подпись для скринридера: в ячейку не помещается ни кабинет, ни учитель,
 * но незрячему пользователю они нужны так же, как всем остальным.
 */
export function cellAccessibilityLabel(lesson, role) {
  const parts = [cellLabel(lesson, role)];
  if (lesson?.time && lesson.time !== '—') parts.push(lesson.time);
  if (role !== 'teacher' && lesson?.teacherShort) parts.push(lesson.teacherShort);
  if (lesson?.roomLabel) parts.push(lesson.roomLabel);
  if (lesson?.cancelled) parts.push('урок отменён');
  if (lesson?.substituteTeacherShort) parts.push(`замена: ${lesson.substituteTeacherShort}`);
  return parts.filter(Boolean).join(', ');
}

/** Понедельник соседней недели: шаг сетки влево/вправо. */
export function shiftWeek(weekStart, weeks) {
  const d = new Date(`${weekStart}T12:00:00`);
  d.setDate(d.getDate() + weeks * 7);
  return localDateKey(d);
}
