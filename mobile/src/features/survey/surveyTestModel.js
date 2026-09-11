/**
 * Чистая логика прохождения опроса — вынесена из экрана по той же причине, что и
 * `homeworkTestModel.js`: это правила, на которых держится счётчик «осталось ответить»
 * и то, что вообще уезжает на сервер, а не сам рендер.
 *
 * <p>Опрос не оценивается — здесь нет ни `maxScore`, ни фотографий, ни округа списанных
 * вариантов правильности, которые есть у теста домашнего задания.
 */

/**
 * Ответ считается данным, если выбран хотя бы вариант или написан непустой текст.
 * Пробелы за ответ не считаются — иначе случайно нажатый пробел закрашивал бы вопрос в
 * навигаторе как отвеченный.
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
 * Локальное состояние ответов из `SurveyTakingView.savedAnswers` — восстановление
 * прогресса при открытии (в том числе повторном, после того как приложение убили: у
 * опроса нет местного черновика, сервер уже хранит всё, что было сохранено автосейвом).
 */
export function answersFromSaved(savedAnswers) {
  const answers = {};
  for (const saved of savedAnswers ?? []) {
    answers[saved.questionId] = {
      selectedOptionIds: saved.selectedOptionIds ?? [],
      openTextAnswer: saved.openText ?? '',
    };
  }
  return answers;
}

/**
 * Тело автосейва одного вопроса (`PUT /answers`). Локальное состояние ответа
 * (`{selectedOptionIds, openTextAnswer, photos}`) — формат `QuestionBody`, а не API:
 * здесь он превращается в `SaveAnswerRequest`, где у открытого вопроса поле зовётся
 * `openText`, а не `openTextAnswer`.
 */
export function toSaveAnswerRequest(question, value) {
  return question.type === 'OPEN_TEXT'
    ? { questionId: question.id, openText: value?.openTextAnswer ?? '' }
    : { questionId: question.id, selectedOptionIds: value?.selectedOptionIds ?? [] };
}
