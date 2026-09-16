/**
 * Раскладка опросов психолога: слова, черновики вопросов и проверки (PSYCHOLOGIST-002).
 *
 * Чистый модуль без React — то же правило, что у `homeworkQuestionsMap` и
 * `equipmentModel`: логика, в которой легко ошибиться незаметно, живёт отдельно от экранов
 * и проверяется скриптом.
 */

export const SURVEY_STATUSES = {
  DRAFT: ['Черновик', 'gray'],
  ACTIVE: ['Идёт приём', 'success'],
  COMPLETED: ['Завершён', 'blue'],
};

export function statusMeta(status) {
  const [label, color] = SURVEY_STATUSES[status] || [status || '—', 'gray'];
  return { label, color };
}

export const SURVEY_MODES = [
  { value: 'NAMED', label: 'Именной', hint: 'Видно, кто как ответил' },
  { value: 'ANONYMOUS', label: 'Анонимный', hint: 'Только сводка по вариантам' },
];

export function modeLabel(mode) {
  return SURVEY_MODES.find((item) => item.value === mode)?.label || 'Именной';
}

export const QUESTION_TYPES = [
  { value: 'SINGLE_CHOICE', label: 'Один ответ' },
  { value: 'MULTIPLE_CHOICE', label: 'Несколько' },
  { value: 'OPEN_TEXT', label: 'Свободный' },
];

export function isChoice(type) {
  return type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE';
}

let sequence = 0;

/** Ключ черновика — свой, а не серверный id: у нового вопроса его ещё нет. */
export function emptyQuestion() {
  sequence += 1;
  return {
    key: `new-${sequence}`,
    text: '',
    type: 'SINGLE_CHOICE',
    options: [{ text: '' }, { text: '' }],
  };
}

export function toDraft(question) {
  sequence += 1;
  return {
    key: `q-${question.id ?? sequence}`,
    text: question.text ?? '',
    type: question.type ?? 'SINGLE_CHOICE',
    options: (question.options ?? []).map((option) => ({ text: option.text ?? '' })),
  };
}

/**
 * Смена типа. Открытый вопрос теряет варианты, а вернувшийся к выбору получает два пустых:
  * вопрос с одним вариантом — не выбор, а утверждение, и сервер его не примет.
 */
export function withType(question, type) {
  if (!isChoice(type)) return { ...question, type, options: [] };
  const options = question.options.length >= 2 ? question.options : [{ text: '' }, { text: '' }];
  return { ...question, type, options };
}

export function withOption(question, index, text) {
  return {
    ...question,
    options: question.options.map((option, position) => (position === index ? { text } : option)),
  };
}

export function addOption(question) {
  return { ...question, options: [...question.options, { text: '' }] };
}

export function dropOption(question, index) {
  return { ...question, options: question.options.filter((_, position) => position !== index) };
}

/**
 * Что мешает сохранить. Правила повторяют серверные (`SurveyQuestionValidator`), и это
 * осознанное повторение: сохранение идёт целым набором, и молча потерять двадцать минут
 * набора из-за пустого варианта — худшее, что может сделать экран. Последнее слово всё
 * равно за сервером.
 *
 * <p>Правильных ответов и баллов здесь нет вовсе: опрос не оценивается.
 */
export function validate(questions) {
  const problems = {};
  if (questions.length === 0) problems.form = 'Добавьте хотя бы один вопрос.';
  questions.forEach((question) => {
    const issues = [];
    if (!question.text.trim()) issues.push('Вопрос без текста.');
    if (isChoice(question.type)) {
      const filled = question.options.filter((option) => option.text.trim());
      if (filled.length < 2) issues.push('Нужно минимум два варианта.');
      // `Set.add` возвращает сам Set, а не признак новизны, — проверяем `has` отдельно.
      const seen = new Set();
      const repeated = filled.some((option) => {
        const key = option.text.trim().toLowerCase();
        if (seen.has(key)) return true;
        seen.add(key);
        return false;
      });
      if (repeated) issues.push('Варианты повторяются.');
    }
    if (issues.length) problems[question.key] = issues;
  });
  return problems;
}

export function hasProblems(problems) {
  return Object.keys(problems).length > 0;
}

/** В запрос уходит только то, что ввели: пустые варианты сервер бы отверг. */
export function toRequest(questions) {
  return questions.map((question) => ({
    text: question.text.trim(),
    type: question.type,
    options: isChoice(question.type)
      ? question.options
          .map((option) => ({ text: option.text.trim() }))
          .filter((option) => option.text)
      : [],
  }));
}

/**
 * Можно ли опубликовать опрос. Сервер проверит то же самое — здесь объясняем, чего не
 * хватает, чтобы кнопка не отказывала молча.
 */
export function publishBlockers(survey) {
  const blockers = [];
  if (!survey) return ['Опрос не загружен.'];
  if ((survey.questionCount ?? 0) === 0) blockers.push('Нет ни одного вопроса.');
  if ((survey.audienceClassIds ?? []).length === 0) blockers.push('Не выбран ни один класс.');
  return blockers;
}

/** Сколько ответили: «12 из 30» и доля — одинаково в списке, карточке и результатах. */
export function respondedText(survey) {
  const total = survey?.recipientsTotal ?? 0;
  const responded = survey?.respondedCount ?? 0;
  if (total === 0) return 'Получателей пока нет';
  return `Ответили ${responded} из ${total}`;
}

export function completionPercent(stats) {
  if (!stats || !stats.recipientsTotal) return 0;
  const value = stats.completionPercent;
  if (typeof value === 'number') return Math.round(value);
  return Math.round((100 * (stats.respondedCount ?? 0)) / stats.recipientsTotal);
}

export const RESPONDENT_STATUSES = {
  NOT_STARTED: ['Не начал', 'gray'],
  IN_PROGRESS: ['Начал', 'gold'],
  COMPLETED: ['Ответил', 'success'],
};

export function respondentMeta(status) {
  const [label, color] = RESPONDENT_STATUSES[status] || [status || '—', 'gray'];
  return { label, color };
}

/**
 * Ответ в именном просмотре. У выбора — выбранные варианты, у свободного — текст; пусто
 * означает «вопрос пропущен», и так и подписано: «—» читается как ошибка загрузки.
 */
export function answerText(answer) {
  if (!answer) return 'Нет ответа';
  if (isChoice(answer.type)) {
    const selected = (answer.selectedOptionTexts ?? []).filter(Boolean);
    return selected.length ? selected.join(', ') : 'Нет ответа';
  }
  return answer.openText?.trim() || 'Нет ответа';
}

/**
 * Именные ответы есть только у именного опроса и только у отправивших.
 *
 * Анонимный опрос имён не отдаёт по построению — экран не должен обещать список, которого
 * не будет.
 */
export function showsNames(survey) {
  return survey?.mode === 'NAMED';
}

export function formatSurveyDate(value, withTime = true) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: withTime ? undefined : 'numeric',
    hour: withTime ? '2-digit' : undefined,
    minute: withTime ? '2-digit' : undefined,
  }).format(date).replace(',', ' ·');
}
