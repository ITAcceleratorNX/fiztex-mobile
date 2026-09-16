/**
 * Чистые правила блока «Обратная связь за месяц» у родителя (MONTHLY-FEEDBACK-FE-001).
 *
 * <p>Здесь только то, что приложение решает само: какой месяц открыть, куда ведут стрелки,
 * что показать на месте анализа. Покрытие «N из M предметов», устаревание анализа и право его
 * запросить (`canRequest`) приходят с сервера — повторять их здесь значило бы завести второе
 * место, где живёт правило.
 *
 * Проверяется `node scripts/verify-monthly-feedback.cjs`.
 */

const MONTHS_NOMINATIVE = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/** Коды отказов запуска анализа (контракт P4). */
export const FEEDBACK_AI_ERRORS = {
  disabled: 'MONTHLY_FEEDBACK_AI_DISABLED',
  noFeedback: 'MONTHLY_FEEDBACK_AI_NO_FEEDBACK',
  quota: 'MONTHLY_FEEDBACK_AI_QUOTA_EXCEEDED',
};

/** Опрос идущего анализа: шаг по умолчанию и потолок (контракт P3). */
export const ANALYSIS_POLL_MS = 2000;
export const ANALYSIS_POLL_LIMIT_MS = 3 * 60 * 1000;

/** `2026-09` по часам телефона. */
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Предыдущий календарный месяц: `2026-01` → `2025-12`. */
export function previousMonth(month) {
  const [year, m] = month.split('-').map(Number);
  return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, '0')}`;
}

/** `2026-09` → «Сентябрь 2026». */
export function monthLabel(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || '');
  const name = match ? MONTHS_NOMINATIVE[Number(match[2]) - 1] : null;
  return match && name ? `${name} ${match[1]}` : month || '';
}

/**
 * Месяцы, по которым ходят стрелки: текущий (даже пустой — «пока не опубликована» тоже ответ)
 * и все месяцы с опубликованным, от нового к старому. Пустые прошлые месяцы стрелки
 * пропускают: листать лето ради пустого экрана незачем.
 */
export function feedbackMonths(rows, current) {
  const all = new Set([current]);
  for (const row of rows || []) {
    if (row?.month && row.month <= current) all.add(row.month);
  }
  return [...all].sort((a, b) => b.localeCompare(a));
}

/**
 * Какой месяц открыть. Учителя публикуют в конце месяца и в первые дни следующего, поэтому
 * в начале октября родителю нужен сентябрь, а не «октябрь пока не опубликован». Но
 * прошлогодний май по умолчанию в сентябре — уже не новость: тогда открывается текущий.
 */
export function defaultFeedbackMonth(rows, current) {
  const newest = (rows || []).map((row) => row?.month).filter(Boolean).sort().pop();
  if (newest && (newest === current || newest === previousMonth(current))) return newest;
  return current;
}

/**
 * Соседний месяц по стрелке. `older` — стрелка «‹», к прошлому.
 *
 * @returns {string|null} `null`, если листать некуда
 */
export function stepMonth(months, month, older) {
  const index = months.indexOf(month);
  if (index < 0) return months[0] ?? null;
  return months[index + (older ? 1 : -1)] ?? null;
}

/** Вкладки предметов в порядке ответа (сервер сортирует по названию). */
export function subjectTabs(view) {
  return (view?.subjects || []).map((subject) => ({
    value: subject.subjectId,
    label: subject.subjectName,
  }));
}

/** Выбранный предмет: прежний, если он есть в новом месяце, иначе первый. */
export function pickSubject(tabs, subjectId) {
  if (tabs.some((tab) => tab.value === subjectId)) return subjectId;
  return tabs[0]?.value ?? null;
}

/**
 * Что показать на месте анализа.
 *
 * `none` — кнопка, если `canRequest`; `running` — «Анализируем отзывы…»; `done` — результат;
 * `failed` — текст ошибки и повтор.
 */
export function analysisPhase(analysis) {
  switch (analysis?.status) {
    case 'PENDING':
    case 'RUNNING':
      return 'running';
    case 'DONE':
      return 'done';
    case 'FAILED':
      return 'failed';
    default:
      return 'none';
  }
}

/** Краткое состояние из P2 требует полного P3, когда анализ уже был или идёт. */
export function needsFullAnalysis(brief) {
  return analysisPhase(brief) !== 'none';
}

/**
 * Ответ на отказ запуска. `hidden` — анализ в школе выключен, и блок пропадает; остальные — текст
 * на месте кнопки. Тексты — из контракта P4.
 */
export function analysisRequestError(error) {
  switch (error?.code) {
    case FEEDBACK_AI_ERRORS.disabled:
      return { hidden: true, message: null };
    case FEEDBACK_AI_ERRORS.noFeedback:
      return { hidden: false, message: 'Отзывов за этот месяц ещё нет' };
    case FEEDBACK_AI_ERRORS.quota:
      return { hidden: false, message: 'Лимит на сегодня исчерпан' };
    default:
      return { hidden: false, message: error?.message || 'Не удалось запустить анализ' };
  }
}

/** Разделы результата без пустых: `concerns` законно бывает пустым (контракт P3). */
export function analysisSections(result) {
  return [
    { key: 'strengths', title: 'Сильные стороны', items: result?.strengths || [] },
    { key: 'concerns', title: 'Зоны внимания', items: result?.concerns || [] },
    { key: 'recommendations', title: 'Рекомендации', items: result?.recommendations || [] },
  ].filter((section) => section.items.length > 0);
}
