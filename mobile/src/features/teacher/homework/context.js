/**
 * Что учитель вправе выбрать для задания вне урока (ТЗ HOMEWORK-001 §3.2).
 *
 * Источник — его собственное расписание: школьные справочники (`/api/admin/*`) учительскому
 * токену отвечают 401, и спрашивать их из приложения нельзя.
 *
 * Пара «класс + предмет» выбирается целиком, а не двумя списками: учитель ведёт предмет не
 * во всех своих классах, и свободная комбинация упёрлась бы в отказ сервера («не ведёт этот
 * предмет в этом классе») уже после того, как форма заполнена.
 */
export function teachingPairs(lessons = []) {
  const byKey = new Map();
  for (const lesson of lessons) {
    if (lesson?.classId == null || lesson?.subjectId == null) continue;
    const key = `${lesson.classId}:${lesson.subjectId}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      key,
      classId: lesson.classId,
      subjectId: lesson.subjectId,
      label: [lesson.subjectName, lesson.className].filter(Boolean).join(' · '),
    });
  }
  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}
