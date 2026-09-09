/**
 * Вопросы теста: черновик на экране и то, что уходит на сервер.
 *
 * <p>Правила повторяют `HomeworkQuestionService.validate` на бэкенде — не ради дублирования,
 * а ради момента: кнопка «Сохранить» обязана объяснить, чего не хватает, до нажатия. Отказ
 * после нажатия — то же знание, доставленное позже и грубее. Источник правды остаётся на
 * сервере, он проверяет заново.
 *
 * <p>Всё чистое и без React: экран собирается из этих функций, а проверяются они
 * `scripts/verify-homework-questions.cjs` без запуска приложения.
 */

export const QUESTION_TYPES = [
  { value: 'SINGLE_CHOICE', label: 'Один ответ' },
  { value: 'MULTIPLE_CHOICE', label: 'Несколько' },
  { value: 'OPEN_TEXT', label: 'Развёрнутый' },
];

export function isChoice(type) {
  return type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE';
}

let counter = 0;

/** Ключ для списка: у несохранённого вопроса идентификатора ещё нет, а React нужен ключ. */
export function localId() {
  counter += 1;
  return `q-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyQuestion() {
  return {
    key: localId(),
    type: 'SINGLE_CHOICE',
    text: '',
    maxScore: 1,
    referenceAnswer: '',
    gradingCriteria: '',
    allowPhoto: false,
    maxPhotos: 1,
    options: [
      { key: localId(), text: '', correct: true },
      { key: localId(), text: '', correct: false },
    ],
  };
}

/** Ответ сервера → черновик экрана. */
export function toDraft(question) {
  return {
    key: localId(),
    id: question.id,
    type: question.type ?? 'SINGLE_CHOICE',
    text: question.text ?? '',
    maxScore: Number(question.maxScore ?? 1),
    referenceAnswer: question.referenceAnswer ?? '',
    gradingCriteria: question.gradingCriteria ?? '',
    allowPhoto: question.allowPhoto ?? false,
    maxPhotos: Number(question.maxPhotos ?? 1),
    options: (question.options ?? []).map((option) => ({
      key: localId(),
      text: option.text ?? '',
      correct: option.correct ?? false,
    })),
  };
}

/** Тело `PUT /questions`: набор заменяется целиком, частичного сохранения нет. */
export function toRequest(questions) {
  return {
    questions: questions.map((question) => {
      // Закрытому вопросу фотография не полагается — ответ на него это отмеченный вариант.
      // Поле уходит всегда явным: пустое бэкенд читает как «не трогать», и снятая галочка
      // тогда не сохранилась бы.
      const allowPhoto = isChoice(question.type) ? false : Boolean(question.allowPhoto);
      return {
        type: question.type,
        text: (question.text ?? '').trim(),
        maxScore: question.maxScore,
        referenceAnswer: trimmed(question.referenceAnswer),
        gradingCriteria: trimmed(question.gradingCriteria),
        allowPhoto,
        maxPhotos: allowPhoto ? question.maxPhotos : 1,
        options: isChoice(question.type)
          ? question.options.map((option) => ({
              text: (option.text ?? '').trim(),
              correct: Boolean(option.correct),
            }))
          : [],
      };
    }),
  };
}

/**
 * @returns массив сообщений по индексу вопроса; пустой — можно сохранять
 */
export function validate(questions) {
  return questions.map((question) => {
    const messages = [];

    if (!(question.text ?? '').trim()) {
      messages.push('Текст вопроса пустой');
    }
    if (!(question.maxScore > 0)) {
      messages.push('Балл должен быть больше нуля');
    }

    if (isChoice(question.type)) {
      const filled = question.options.filter((option) => (option.text ?? '').trim());
      if (filled.length < 2) {
        messages.push('Нужно минимум два варианта');
      }
      const correct = question.options.filter((option) => option.correct).length;
      if (question.type === 'SINGLE_CHOICE' && correct !== 1) {
        messages.push('Отметьте ровно один правильный вариант');
      }
      if (question.type === 'MULTIPLE_CHOICE' && correct < 1) {
        messages.push('Отметьте хотя бы один правильный вариант');
      }
    } else if (question.allowPhoto && (question.maxPhotos < 1 || question.maxPhotos > 5)) {
      messages.push('Фотографий можно разрешить от одной до пяти');
    }

    return messages;
  });
}

export function hasProblems(problems) {
  return problems.some((messages) => messages.length > 0);
}

/**
 * Смена типа вопроса.
 *
 * <p>У закрытого должны быть варианты, у открытого их не бывает вовсе — иначе сервер
 * ответит отказом. Заводим два пустых, а не один: вопрос с единственным вариантом
 * бессмыслен и всё равно не пройдёт проверку. Фотография у закрытого снимается молча:
 * ответ на него — отмеченный вариант, и снимок к нему нечего добавить.
 */
export function withType(question, type) {
  if (!isChoice(type)) {
    return { ...question, type, options: [] };
  }
  const options =
    question.options.length >= 2
      ? question.options
      : [
          { key: localId(), text: '', correct: true },
          { key: localId(), text: '', correct: false },
        ];
  return { ...question, type, options, allowPhoto: false, maxPhotos: 1 };
}

/** Отметить правильный вариант: у «одного ответа» отметка одна, у «нескольких» — переключается. */
export function withCorrect(question, index) {
  const options = question.options.map((option, i) => {
    if (question.type === 'SINGLE_CHOICE') return { ...option, correct: i === index };
    if (i === index) return { ...option, correct: !option.correct };
    return option;
  });
  return { ...question, options };
}

export function withOption(question, index, text) {
  return {
    ...question,
    options: question.options.map((option, i) => (i === index ? { ...option, text } : option)),
  };
}

export function addOption(question) {
  return { ...question, options: [...question.options, { key: localId(), text: '', correct: false }] };
}

/**
 * Удалить вариант. Меньше двух не оставляем: вопрос с одним вариантом не сохранится, и
 * лучше не дать удалить, чем показать ошибку после.
 */
export function dropOption(question, index) {
  if (question.options.length <= 2) return question;
  return { ...question, options: question.options.filter((_, i) => i !== index) };
}

function trimmed(value) {
  const text = (value ?? '').trim();
  return text || undefined;
}
