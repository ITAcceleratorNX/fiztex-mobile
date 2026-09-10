import { formatTimeRange } from './lessonMap';
import { localDateKey } from './scheduleMap';

const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

/**
 * Ответ `GET /api/lessons/current` → всё, что нужно кнопке «Текущий урок».
 *
 * <p>Чистая функция без сети и хуков — её проверяет
 * `node scripts/verify-current-lesson.cjs`: подпись кнопки это единственное место, где
 * приложение что-то решает само, и ошибиться в ней незаметно проще всего.
 *
 * <p>«Идёт сейчас» берётся из `temporalStatus` карточки, а не сравнением времени с
 * часами телефона: у ученика они могут отставать, а урок начинается по школьным.
 *
 * @param {object} raw ответ бэка
 * @param {Date} [now] «сегодня» глазами приложения — нужно только чтобы решить,
 *   показывать ли дату: урок другого дня обязан её показывать (ТЗ §4).
 */
export function mapCurrentLesson(raw, now = new Date()) {
  const status = raw?.status || 'no_upcoming_lessons';
  const lesson = raw?.lesson || null;

  if (status !== 'ok' || !lesson) {
    return {
      status,
      lessonId: null,
      ongoing: false,
      label: emptyLabel(status, raw?.message),
      lesson: null,
    };
  }

  const ongoing = lesson.temporalStatus === 'ONGOING';
  const subject = lesson.subjectName || 'Урок';
  const timeRange = formatTimeRange(lesson.startTime, lesson.endTime);
  // Дата показывается только у урока другого дня. У сегодняшнего она была бы шумом,
  // а у завтрашнего её отсутствие — обманом: «08:30» без даты читается как сегодня.
  const dateLabel = isSameDay(lesson.date, now) ? null : shortDate(lesson.date);
  const when = [dateLabel, timeRange].filter(Boolean).join(', ');

  return {
    status,
    lessonId: lesson.id ?? null,
    ongoing,
    subject,
    timeRange,
    dateLabel,
    label: `${ongoing ? 'Идёт' : 'Далее'}: ${subject}${when ? ` · ${when}` : ''}`,
    lesson,
  };
}

/**
 * Полезная нагрузка для экрана урока.
 *
 * <p>Экран урока один и тот же для входа из расписания и отсюда, и ждёт он
 * `lessonInstanceId` — id фактического урока. `GET /api/lessons/current` отдаёт карточку,
 * у которой это поле называется `id`: слотов расписания в ней нет вовсе.
 */
export function currentLessonPayload(data, { childId = null, childName = null } = {}) {
  if (!data?.lessonId) return null;
  return {
    lessonInstanceId: data.lessonId,
    childId,
    childName,
    dateLabel: data.dateLabel,
  };
}

function emptyLabel(status, message) {
  if (status === 'schedule_not_published') return 'Расписание ещё не опубликовано';
  // Сообщение бэка приоритетнее собственной формулировки: там оно одно на все клиенты.
  return message || 'Нет доступных ближайших уроков';
}

function isSameDay(dateStr, now) {
  return Boolean(dateStr) && dateStr === localDateKey(now);
}

/** "2026-09-11" → "11 сен". */
function shortDate(dateStr) {
  const parts = String(dateStr || '').split('-');
  if (parts.length !== 3) return '';
  const month = MONTHS_SHORT[Number(parts[1]) - 1];
  return month ? `${Number(parts[2])} ${month}` : '';
}
