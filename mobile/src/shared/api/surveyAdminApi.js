import { request } from './client';

function query(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const value = search.toString();
  return value ? `?${value}` : '';
}

/**
 * Опросы психолога — тот же раздел администрации, что и школьные опросы
 * (PSYCHOLOGIST-002): психологический тест это опрос с `origin=PSYCHOLOGICAL`, и `origin`
 * сервер ставит сам по роли автора.
 *
 * <p>Поэтому клиент не передаёт никакого признака «психологический»: видимость взаимная и
 * решается на сервере (`SurveyAccess`) — психолог не видит школьных опросов, администрация
 * не видит его. Пути те же `/api/admin/surveys/**`, их этой роли открывает
 * `SecurityConfig`.
 *
 * <p>AI-анализа здесь нет намеренно: ответы учеников психолога во внешнюю модель не
 * уходят, и сервер отвечает на этот путь отказом.
 */
export const surveyAdminApi = {
  list(token, params) {
    return request(`/api/admin/surveys${query(params)}`, { token });
  },
  get(token, surveyId) {
    return request(`/api/admin/surveys/${surveyId}`, { token });
  },
  create(token, body) {
    return request('/api/admin/surveys', { method: 'POST', token, body });
  },
  update(token, surveyId, body) {
    return request(`/api/admin/surveys/${surveyId}`, { method: 'PUT', token, body });
  },
  questions(token, surveyId) {
    return request(`/api/admin/surveys/${surveyId}/questions`, { token });
  },
  saveQuestions(token, surveyId, questions) {
    return request(`/api/admin/surveys/${surveyId}/questions`, {
      method: 'PUT',
      token,
      body: { questions },
    });
  },
  audienceClasses(token) {
    return request('/api/admin/surveys/audience-classes', { token });
  },
  setAudience(token, surveyId, classIds) {
    // Аудитория психологического опроса — только ученики: родителей сервер отклоняет
    // (SURVEY_PARENTS_NOT_ALLOWED), и переключателя для них в приложении нет.
    return request(`/api/admin/surveys/${surveyId}/audience`, {
      method: 'PUT',
      token,
      body: { classIds, targetsStudents: true, targetsParents: false },
    });
  },
  publish(token, surveyId) {
    return request(`/api/admin/surveys/${surveyId}/publish`, { method: 'POST', token });
  },
  end(token, surveyId) {
    return request(`/api/admin/surveys/${surveyId}/end`, { method: 'POST', token });
  },
  stats(token, surveyId) {
    return request(`/api/admin/surveys/${surveyId}/stats`, { token });
  },
  respondents(token, surveyId) {
    return request(`/api/admin/surveys/${surveyId}/respondents`, { token });
  },
  respondentAnswers(token, surveyId, recipientId) {
    return request(`/api/admin/surveys/${surveyId}/respondents/${recipientId}`, { token });
  },
};
