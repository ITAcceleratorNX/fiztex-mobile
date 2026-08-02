import { abbreviateTeacherName, formatRoom } from './scheduleMap';

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];
const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** "2025-10-14" → "14 октября, Вт" (заголовок карточки). */
export function formatCardDate(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return '';
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}, ${WEEKDAYS_SHORT[d.getDay()]}`;
}

/** ISO-момент → "14 окт, 09:12" (подпись под комментарием). */
export function formatStamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "10:00:00" + "10:45:00" → "10:00 – 10:45". */
export function formatTimeRange(start, end) {
  const cut = (v) => (typeof v === 'string' && v.length >= 5 ? v.slice(0, 5) : null);
  const a = cut(start);
  const b = cut(end);
  if (a && b) return `${a} – ${b}`;
  return a || b || '';
}

/**
 * Статусный бейдж карточки.
 *
 * Отмена важнее времени: у отменённого урока «Прошёл» вводило бы в заблуждение.
 * «Следующий» — свойство не урока, а дня, поэтому приходит подсказкой из расписания
 * (там уже вычислено, какой урок следующий), а не выводится из самой карточки.
 */
export function resolveBadge(lesson, highlight) {
  if (!lesson) return null;
  if (lesson.status === 'CANCELLED') return { label: 'Урок отменён', color: 'red' };
  switch (lesson.temporalStatus) {
    case 'ONGOING':
      return { label: 'Сейчас', color: 'green' };
    case 'FINISHED':
      return { label: 'Прошёл', color: 'gray' };
    case 'UPCOMING':
      return highlight === 'next'
        ? { label: 'Следующий', color: 'blue' }
        : { label: 'Предстоящий', color: 'gray' };
    default:
      return null;
  }
}

const CHANGED_LABELS = {
  TIME: 'Изменено',
  ROOM: 'Изменено',
  SUBJECT: 'Изменено',
  TEACHER: 'Изменено',
};

/**
 * LessonView → модель экрана карточки.
 *
 * Возможности (`capabilities`) не пересчитываются на клиенте: их посчитал бэк по роли,
 * замене и статусу урока — дублировать эту логику здесь значило бы завести второй
 * источник правды, который рано или поздно разойдётся с первым.
 */
export function mapLessonCard(lesson, { highlight = null } = {}) {
  if (!lesson) return null;

  const caps = Array.isArray(lesson.capabilities) ? lesson.capabilities : [];
  const changed = new Set(Array.isArray(lesson.changedFields) ? lesson.changedFields : []);
  // ACTIVE — единственный статус периода, при котором период открыт; DISABLED и
  // ARCHIVED означают «только просмотр».
  const periodClosed = Boolean(
    lesson.academicPeriodStatus && lesson.academicPeriodStatus !== 'ACTIVE',
  );

  const substitute = lesson.substituteTeacher || null;
  const comment = lesson.comment || null;

  return {
    id: lesson.id,
    date: lesson.date,
    dateLabel: formatCardDate(lesson.date),
    timeRange: formatTimeRange(lesson.startTime, lesson.endTime),
    subject: lesson.subjectName || 'Урок',
    className: lesson.className || null,
    subgroupName: lesson.subgroupName || null,
    room: formatRoom(lesson.room),
    teacherName: abbreviateTeacherName(lesson.teacher?.fullName) || null,
    substituteName: substitute ? abbreviateTeacherName(substitute.fullName) : null,

    status: lesson.status,
    temporalStatus: lesson.temporalStatus,
    badge: resolveBadge(lesson, highlight),
    cancellationComment: lesson.cancellationComment || null,

    periodClosed,
    periodName: lesson.academicPeriodName || null,

    changed: {
      time: changed.has('TIME'),
      room: changed.has('ROOM'),
      subject: changed.has('SUBJECT'),
      teacher: changed.has('TEACHER'),
      label: CHANGED_LABELS.ROOM,
    },

    topic: lesson.topic || null,
    comment: comment
      ? {
          body: comment.body,
          author: abbreviateTeacherName(comment.createdByName) || comment.createdByName || '',
          stamp: formatStamp(comment.updatedAt || comment.createdAt),
        }
      : null,

    viewerRole: lesson.viewerRole,
    can: {
      viewStudents: caps.includes('VIEW_STUDENTS'),
      viewHistory: caps.includes('VIEW_TEACHER_HISTORY') || caps.includes('VIEW_ADMIN_HISTORY'),
      manageStructure: caps.includes('MANAGE_STRUCTURE'),
      fillAttendance: caps.includes('FILL_ATTENDANCE'),
      // Закрытый период — «только просмотр» по макету. Бэк это пока не проверяет,
      // так что ограничение здесь клиентское.
      editTeaching: caps.includes('EDIT_TEACHING_PART') && !periodClosed,
    },
  };
}

function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  // Полдень, а не полночь: иначе смещение таймзоны увело бы дату на день назад.
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
