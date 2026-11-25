/**
 * Профиль преподавателя для родителя: из ответа сервера — в то, что рисует экран.
 * Аудиторию публикации сервер родителю не отдаёт, поэтому здесь её нет и быть не может.
 */

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function formatReceivedOn(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!match) return null;
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

export function mapAchievement(item) {
  const meta = [item.categoryLabel, formatReceivedOn(item.receivedOn), item.organization].filter(Boolean);
  return {
    id: item.id,
    title: item.title || 'Документ',
    meta: meta.join(' · '),
    description: item.description || null,
    fileName: item.fileName || null,
  };
}

export function mapTeacherProfile(profile) {
  if (!profile) return null;
  return {
    id: profile.teacherProfileId,
    fullName: profile.fullName || '',
    subjects: Array.isArray(profile.subjects) ? profile.subjects.join(', ') : '',
    achievements: (profile.achievements || []).map(mapAchievement),
  };
}

/**
 * Отказ сервера — словами родителя. 404 у профиля значит «учитель больше не ведёт уроки в
 * классе ребёнка», у файла — «документ закрыли или удалили»: оба случая — норма, а не сбой.
 */
export function profileErrorText(error) {
  const status = error?.status;
  if (status === 404) return 'Профиль недоступен: преподаватель не ведёт уроки в классе ребёнка.';
  if (status === 403) return 'Нет доступа к профилю преподавателя.';
  return 'Не удалось загрузить профиль. Проверьте интернет и попробуйте ещё раз.';
}
