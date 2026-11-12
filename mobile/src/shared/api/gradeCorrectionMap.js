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

// ─── Учитель: лист оценок урока ────────────────────────────────────────────────

/**
 * Исправление строки ученика: открытое (`REQUIRED`/`OVERDUE`) — одно на ученика и урок. Статус и
 * просрочка приходят с сервера, экран их не вычисляет.
 */
export function openCorrection(corrections, studentProfileId) {
  return (corrections ?? []).find(
    (item) => item.studentProfileId === studentProfileId && (item.status === 'REQUIRED' || item.status === 'OVERDUE'),
  ) ?? null;
}

/** Подпись под фамилией: «Исправить до 21 октября» или «Срок исправления истёк». */
export function correctionBadgeLabel(correction) {
  if (!correction) return null;
  if (correction.overdue || correction.status === 'OVERDUE') return 'Срок исправления истёк';
  return correction.deadline ? `Исправить до ${correctionDateLabel(correction.deadline)}` : 'Требуется исправление';
}

/** Значения временной оценки: 1–10 в периоде по политике, иначе шкала с сервера. */
export function temporaryOptions({ pointsMode, scale }) {
  if (pointsMode) return Array.from({ length: 10 }, (_, index) => String(index + 1));
  return (scale ?? []).map((item) => item.code).filter(Boolean);
}

/** Выбранное значение в тело запроса: баллы — `{ score, gradeType }`, шкала — `{ scaleCode }`. */
export function temporaryValue(value, { pointsMode, defaultWorkType }) {
  return pointsMode ? { score: Number(value), gradeType: defaultWorkType } : { scaleCode: value };
}

/** Текущая временная оценка исправления — в виде строки выбора. */
export function initialTemporary(correction, { pointsMode }) {
  const grade = correction?.temporaryGrade;
  if (!grade) return null;
  if (!pointsMode) return grade.scaleCode ?? null;
  return grade.score != null ? String(Number(grade.score)) : null;
}

const pad = (n) => String(n).padStart(2, '0');

/** Локальная дата в ISO — не UTC: иначе ночью день уезжал бы назад. */
export function isoDay(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** Ближайшие дни для выбора своего срока: с сегодняшнего, раньше сервер не примет. */
export function deadlineDays(now = new Date(), count = 21) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index, 12);
    return { iso: isoDay(date), label: `${WEEKDAYS[date.getDay()]} ${date.getDate()}`, long: correctionDateLabel(isoDay(date)) };
  });
}

/**
 * Что мешает сохранить исправление, словами; `null` — можно. Комментарий обязателен, срок тоже;
 * допустимость срока окончательно проверяет сервер.
 */
export function correctionProblem({ comment, deadline }) {
  if (!String(comment ?? '').trim()) return 'Опишите, что нужно исправить';
  if (!deadline) return 'Выберите срок исправления';
  return null;
}
