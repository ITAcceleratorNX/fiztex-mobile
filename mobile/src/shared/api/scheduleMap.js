/**
 * Map RoleScheduleLessonView → UI row used by LessonRow / home previews.
 * @param {object} lesson
 * @param {Date} [now]
 */
export function mapLessonToRow(lesson, now = new Date()) {
  const time = formatTime(lesson.startTime);
  const end = formatTime(lesson.endTime);
  const status = computeLessonStatus(lesson.startTime, lesson.endTime, now);
  return {
    lessonId: lesson.lessonId,
    time,
    end,
    subject: lesson.subjectName || 'Предмет',
    room: lesson.room || '—',
    teacher: lesson.teacherFullName || '',
    status,
    className: lesson.className,
    subgroupName: lesson.subgroupName,
    audienceType: lesson.audienceType,
    date: lesson.date,
    raw: lesson,
  };
}

export function mapScheduleView(view, now = new Date()) {
  const lessons = Array.isArray(view?.lessons) ? view.lessons.map((l) => mapLessonToRow(l, now)) : [];
  return {
    status: view?.status || 'ok',
    message: view?.message || null,
    date: view?.date || null,
    weekStart: view?.weekStart || null,
    weekEnd: view?.weekEnd || null,
    classId: view?.classId || null,
    className: view?.className || null,
    events: view?.events || [],
    lessons,
  };
}

export function scheduleStatusMessage(status, message) {
  if (message) return message;
  switch (status) {
    case 'schedule_not_published':
      return 'Расписание ещё не опубликовано';
    case 'no_lessons':
      return 'На этот день уроков нет';
    case 'non_working_day':
      return 'Неучебный день';
    case 'calendar_no_lessons':
      return 'По календарю сегодня без уроков';
    case 'no_active_period':
      return 'Нет активного учебного периода';
    case 'no_active_class':
      return 'Класс не назначен';
    case 'no_assigned_lessons':
      return 'Нет назначенных уроков';
    default:
      return 'Расписание недоступно';
  }
}

function formatTime(value) {
  if (!value) return '—';
  if (typeof value === 'string') {
    // "HH:mm:ss" or "HH:mm"
    return value.length >= 5 ? value.slice(0, 5) : value;
  }
  return '—';
}

function parseTimeToMinutes(value) {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split(':');
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function computeLessonStatus(startTime, endTime, now) {
  const start = parseTimeToMinutes(typeof startTime === 'string' ? startTime : null);
  const end = parseTimeToMinutes(typeof endTime === 'string' ? endTime : null);
  if (start == null || end == null) return 'upcoming';
  const current = now.getHours() * 60 + now.getMinutes();
  if (current >= end) return 'done';
  if (current >= start && current < end) return 'now';
  return 'upcoming';
}
