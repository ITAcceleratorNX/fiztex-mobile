const WEEKDAYS = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота',
];
const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/**
 * Подзаголовок шапки: «Вторник, 19 августа».
 *
 * Дату берём из ответа расписания, а не с часов телефона: «сегодня» у школы своё
 * (`fiztex.school.timezone`), и на границе суток телефон в другом поясе показал бы
 * день, которого нет в расписании. Пока расписание не пришло — местная дата, чтобы
 * шапка не пустовала.
 *
 * @param {string|null} isoDate YYYY-MM-DD из RoleScheduleView
 */
export function formatHomeDate(isoDate) {
  // Полдень, а не полночь: разбор «YYYY-MM-DD» как UTC сдвинул бы день назад в
  // отрицательных поясах, а нам нужен именно тот день, который назвал сервер.
  const date = isoDate ? new Date(`${isoDate}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** Сколько уроков помещается на главной, прежде чем карточка превращается в простыню. */
export const HOME_LESSON_LIMIT = 5;

/**
 * Окно уроков для главной: день целиком сюда не влезает.
 *
 * У школы с одиннадцатью уроками (08:00–19:00) полный список превращает карточку в
 * простыню, а главная должна отвечать на вопрос «что сейчас и что дальше», а не
 * заменять раздел «Расписание». Поэтому окно начинается с первого незакончившегося
 * урока, а не с утреннего: в пять вечера восьмичасовой урок наверху бесполезен.
 *
 * Когда день уже кончился, показываем его хвост — иначе карточка опустела бы к вечеру.
 *
 * @returns {{ visible: Array, hidden: number, fromStart: boolean }}
 */
export function homeLessonWindow(lessons, limit = HOME_LESSON_LIMIT) {
  const all = Array.isArray(lessons) ? lessons : [];
  if (all.length <= limit) return { visible: all, hidden: 0, fromStart: true };

  const firstLive = all.findIndex((l) => l.status !== 'done');
  const start = firstLive === -1
    ? all.length - limit
    : Math.min(firstLive, all.length - limit);
  return {
    visible: all.slice(start, start + limit),
    hidden: all.length - limit,
    fromStart: start === 0,
  };
}

/** Локальная дата в формате API — для диапазона дневника «за сегодня». */
export function todayKey() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Имя для приветствия ученика: только личное имя.
 *
 * `firstName` приходит из профиля; `fullName` разбирается как «Фамилия Имя Отчество» —
 * тот же порядок, в котором его парсит бэкенд (`FullNameParser`).
 */
export function greetingName(profile, fallbackFullName) {
  if (profile?.firstName) return profile.firstName;
  const parts = String(profile?.fullName || fallbackFullName || '').trim().split(/\s+/);
  return parts[1] || parts[0] || '';
}

/** Учителя в школе зовут по имени и отчеству, а не по фамилии. */
export function teacherName(profile, fallbackFullName) {
  const byParts = [profile?.firstName, profile?.middleName].filter(Boolean).join(' ');
  if (byParts) return byParts;
  const parts = String(profile?.fullName || fallbackFullName || '').trim().split(/\s+/);
  return parts.slice(1).join(' ') || parts[0] || '';
}

/** Родителя — по имени и фамилии: «Амина Омарова». */
export function parentName(profile, fallbackFullName) {
  const byParts = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  if (byParts) return byParts;
  return profile?.fullName || fallbackFullName || '';
}

/** «Айгерим Бекова» → «АБ» для кружка-аватара в переключателе детей. */
export function initialsOf(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  // ФИО приходит как «Фамилия Имя», а в макете инициалы читаются «Имя Фамилия».
  return `${parts[1][0]}${parts[0][0]}`.toUpperCase();
}

/** «Бекова Айгерим Ерлановна» + «7А» → «Айгерим Б. · 7А». */
export function childPillLabel(child) {
  const parts = String(child?.fullName || '').trim().split(/\s+/).filter(Boolean);
  const name = parts.length > 1 ? `${parts[1]} ${parts[0][0]}.` : parts[0] || '';
  return child?.className ? `${name} · ${child.className}` : name;
}
