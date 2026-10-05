/**
 * Как ученик и родитель видят исправление работы (Figma «Ученик - Исправление / …»,
 * «Родитель - полный экран»). Только слова и форма показа: статус и просрочка — с сервера.
 */

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** «2026-10-21» → «21 октября». */
export function correctionDateLabel(iso) {
  const match = typeof iso === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!match) return '';
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]}`;
}

/** Временная оценка строкой — как обычная: «8», «4+», «15/20». */
export function temporaryGradeLabel(grade) {
  if (!grade) return null;
  if (grade.scaleCode) return grade.scaleCode;
  if (grade.score == null) return null;
  const score = String(Number(grade.score));
  if (grade.maxScore == null || Number(grade.maxScore) === 10) return score;
  return `${score}/${String(Number(grade.maxScore))}`;
}

/**
 * Блок «Требуется исправление» в карточке урока. После истечения срока блок тот же, но
 * красный и с другим заголовком — комментарий, временная оценка и срок остаются (ТЗ §8).
 */
export function correctionCard(view) {
  if (!view) return null;
  const overdue = Boolean(view.overdue);
  return {
    tone: overdue ? 'danger' : 'warning',
    title: overdue ? 'Срок исправления истёк' : 'Требуется исправление',
    comment: view.comment ?? '',
    temporary: temporaryGradeLabel(view.temporaryGrade),
    deadline: view.deadline ? `Срок: до ${correctionDateLabel(view.deadline)}` : null,
  };
}

/**
 * Подпись плитки «Оценки по предметам» на главной (Figma 1964:1775): предмет первого по
 * сроку исправления — сервер отдаёт их ближайшим сроком первыми. Несколько предметов —
 * «и ещё N», чтобы плитка не обещала одно, когда их больше.
 */
export function homeCorrectionLine(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const subjects = [...new Set(list.map((item) => item.subjectName).filter(Boolean))];
  if (subjects.length === 0) return 'Требуется исправление';
  const more = subjects.length - 1;
  return `Требуется исправление · ${subjects[0]}${more > 0 ? ` и ещё ${more}` : ''}`;
}
