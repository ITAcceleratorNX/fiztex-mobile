/**
 * Чистая логика прохождения теста и античита (HOMEWORK-BE-006 §6, ANTICHEAT-001).
 *
 * Вынесено из экрана по той же причине, что и остальные `*Map`-модули: это правила, на
 * которых держатся и счётчик «осталось ответить», и то, что вообще уедет на сервер, —
 * ошибиться в них легко, а увидеть ошибку на экране трудно. Проверка —
 * `node scripts/verify-homework-test.cjs`.
 */

/**
 * Ответ считается данным, если выбран хотя бы вариант или написан непустой текст.
 *
 * <p>Пробелы за ответ не считаются: иначе случайно нажатый пробел закрашивал бы вопрос в
 * навигаторе, и ученик отправил бы работу, считая её законченной.
 */
export function isAnswered(value) {
  if (!value) return false;
  if ((value.selectedOptionIds ?? []).length > 0) return true;
  return Boolean((value.openTextAnswer ?? '').trim());
}

export function answeredCount(questions, answers) {
  return (questions ?? []).filter((question) => isAnswered(answers?.[question.id])).length;
}

/**
 * Тело отправки.
 *
 * <p><b>Отправляются все вопросы, включая пропущенные.</b> Сервер требует ответ на каждый
 * (пропуск — признак того, что клиент показал не тот тест), поэтому пустой ответ уезжает
 * пустым, а не выбрасывается: выбросив его, клиент получил бы 400 вместо внятного
 * «осталось ответить», которое ученик видит до нажатия.
 */
export function toSubmitPayload(questions, answers) {
  return (questions ?? []).map((question) => {
    const value = answers?.[question.id] ?? {};
    return question.type === 'OPEN_TEXT'
      ? { questionId: question.id, openText: value.openTextAnswer ?? '' }
      : { questionId: question.id, selectedOptionIds: value.selectedOptionIds ?? [] };
  });
}

/**
 * Какие события античита вправе слать этот экран (ТЗ §3 против §4).
 *
 * <p>У обычного задания это <b>только</b> попытка скриншота: уход в другое приложение там
 * нарушением не считается — ученик и должен открыть учебник. Правило повторяет серверное,
 * но не заменяет его: сервер всё равно отбросит лишнее. Здесь оно затем, чтобы не тратить
 * сеть ребёнка на запросы, которые заведомо выбросят.
 */
export function antiCheatEventsFor(mode) {
  return mode === 'test'
    ? ['SCREENSHOT_ATTEMPT', 'APP_BACKGROUND', 'RE_ENTRY', 'PAGE_CLOSE']
    : ['SCREENSHOT_ATTEMPT'];
}

export function allowsAntiCheatEvent(mode, type) {
  return antiCheatEventsFor(mode).includes(type);
}
