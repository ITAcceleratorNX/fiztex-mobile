import { gradeTypeLabel } from '@shared/api/gradesMap';

/**
 * Подпись плитки «Оценки»: последняя полученная оценка — «Математика — 5, Контрольная».
 *
 * Берётся из раздела «предметы за четверть»: только там у оценки есть название предмета.
 * `/api/grades/my` названий не отдаёт вовсе, а дневник — только `subjectId`, и ради одной
 * строки пришлось бы тянуть справочник предметов.
 *
 * «Последняя» — по `createdAt`, а не по дате урока: ученик ждёт увидеть то, что ему
 * поставили только что, даже если урок был на прошлой неделе.
 *
 * @param {Array} subjects MySubjectGradesView.subjects
 * @returns {string|null} null — оценок за период ещё нет
 */
export function latestGradeLine(subjects) {
  let best = null;
  for (const subject of subjects || []) {
    for (const grade of subject.grades || []) {
      const at = grade?.createdAt || grade?.publishedAt;
      if (!at || !grade?.scaleCode) continue;
      if (!best || at > best.at) {
        best = { at, code: grade.scaleCode, type: grade.gradeType, subject: subject.subjectName };
      }
    }
  }
  if (!best) return null;
  return `${best.subject} — ${best.code}, ${gradeTypeLabel(best.type)}`;
}
