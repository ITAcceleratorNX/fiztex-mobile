/**
 * Map RoleScheduleLessonView → UI row used by LessonRow / home previews.
 * @param {object} lesson
 * @param {Date} [now]
 */
export function mapLessonToRow(lesson, now = new Date()) {
  const time = formatTime(lesson.startTime);
  const end = formatTime(lesson.endTime);
  const status = computeLessonStatus(lesson.startTime, lesson.endTime, lesson.date, now);
  return {
    // Слот расписания — повторяющийся шаблон, один на все даты.
    lessonId: lesson.lessonId,
    // Фактический урок на эту дату; именно он открывает карточку. `null`, пока
    // генерация не дошла до этой даты — тогда открывать нечего.
    lessonInstanceId: lesson.lessonInstanceId ?? null,
    time,
    end,
    subject: lesson.subjectName || 'Предмет',
    room: lesson.room || '—',
    roomLabel: formatRoom(lesson.room),
    teacher: lesson.teacherFullName || '',
    teacherShort: abbreviateTeacherName(lesson.teacherFullName),
    status,
    className: lesson.className,
    subgroupName: lesson.subgroupName,
    audienceType: lesson.audienceType,
    date: lesson.date,
    raw: lesson,
  };
}

/** "Ахметова Гульнара Сериковна" → "Ахметова Г.С." (Figma lesson-card meta line). */
export function abbreviateTeacherName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const initials = parts.slice(1).map((p) => `${p[0].toUpperCase()}.`).join('');
  return `${parts[0]} ${initials}`;
}

/** Room numbers get the "каб." prefix; named places ("Спортзал") are left alone. */
export function formatRoom(room) {
  const value = String(room || '').trim();
  if (!value || value === '—') return '';
  return /^\d+[A-Za-zА-Яа-я]?$/.test(value) ? `каб. ${value}` : value;
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
    // Учебные дни года — по ним строится полоска дней. Пустой массив и
    // отсутствие поля означают «бэк не сказал», и клиент падает на пятидневку.
    workingDays: Array.isArray(view?.workingDays) ? view.workingDays : null,
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

/** Local YYYY-MM-DD (never UTC — toISOString would shift the day near midnight). */
export function localDateKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Lesson status. The date is decisive: only lessons *on the current day* can be
 * "now" — otherwise a 09:00 lesson looked "done" on every future day too.
 */
function computeLessonStatus(startTime, endTime, date, now) {
  const today = localDateKey(now);
  if (date && date < today) return 'done';
  if (date && date > today) return 'upcoming';

  const start = parseTimeToMinutes(typeof startTime === 'string' ? startTime : null);
  const end = parseTimeToMinutes(typeof endTime === 'string' ? endTime : null);
  if (start == null || end == null) return 'upcoming';
  const current = now.getHours() * 60 + now.getMinutes();
  if (current >= end) return 'done';
  if (current >= start && current < end) return 'now';
  return 'upcoming';
}
