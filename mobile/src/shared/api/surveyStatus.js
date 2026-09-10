/**
 * Слова состояний опроса (Опросы, мобильный респондент — ученик и родитель).
 *
 * Не реэкспортируется из `api/index.js` — тем же путём, что и `lessonHomeworkState.js`:
 * оба места, которым нужны эти подписи, импортируют файл напрямую.
 *
 * <p><b>Уровень опроса</b> (`DRAFT`/`ACTIVE`/`COMPLETED`) в ответах респондента почти не
 * встречается: `GET /api/surveys/my` отдаёт уже готовые к прохождению анкеты, и статус
 * самого опроса в контракте ученика и родителя не участвует. Слова здесь всё равно
 * заведены — дословно как в вебе (`fiztex-web` — админка называет статусы опроса теми же
 * тремя словами), на случай, если этот уровень когда-нибудь понадобится показать и на
 * мобилке: разойтись словами в двух приложениях об одном и том же статусе нельзя.
 */
const SURVEY_STATUS_LABELS = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  COMPLETED: 'Завершён',
};

export function surveyStatusLabel(status) {
  return SURVEY_STATUS_LABELS[status] || '';
}

/**
 * <b>Статус ответа</b> (`responseStatus`) — то, что реально видят ученик и родитель: не
 * состояние опроса, а состояние своего прохождения. Ему нет аналога в веб-админке (она
 * показывает опрос, а не ответ конкретного респондента), поэтому подписи придуманы здесь,
 * в тоне остальных статусных слов приложения (см. `homeworkStateLabel`). Если у этого
 * состояния когда-нибудь заведётся мобильный экран на вебе — сверить слова с ним.
 */
const RESPONSE_STATUS_LABELS = {
  NOT_STARTED: 'Не пройден',
  IN_PROGRESS: 'В процессе',
  COMPLETED: 'Пройден',
};

export function surveyResponseStatusLabel(status) {
  return RESPONSE_STATUS_LABELS[status] || '';
}

/** Цвет `Pill` под статус ответа — теми же тонами, что и остальные статусы приложения. */
export function surveyResponseStatusColor(status) {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'gold';
    case 'NOT_STARTED':
    default:
      return 'gray';
  }
}

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/**
 * «До 18 октября» / «С 18 октября» — строка под названием опроса в списке.
 *
 * Дедлайн важнее старта: пока опрос уже можно проходить, respondent'у интереснее срок,
 * до которого успеть, а не дата, с которой он открылся. `startAt` показываем только пока
 * он ещё не наступил — опрос, который уже идёт, не нуждается в напоминании о начале.
 */
export function surveyWindowLabel(survey) {
  const deadline = parseDate(survey?.deadlineAt);
  if (deadline) return `До ${deadline.getDate()} ${MONTHS_GENITIVE[deadline.getMonth()]}`;

  const start = parseDate(survey?.startAt);
  if (start && start.getTime() > Date.now()) {
    return `С ${start.getDate()} ${MONTHS_GENITIVE[start.getMonth()]}`;
  }

  return '';
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
