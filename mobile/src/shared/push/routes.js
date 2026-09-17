/**
 * Куда вести по нажатию на push-уведомление — чистая логика, без React и навигатора.
 *
 * Бэк кладёт в данные пуша (`PushData`, A§11.2) `{ v, nid, kind, accountId, route, params, childProfileId }`.
 * Экран выбирается по **маршруту и роли**, а не по виду уведомления: маршрут — это ссылка сценария
 * (`Link.to("lesson", {lessonId})`), и новый вид уведомления с уже знакомым маршрутом не требует новой
 * версии приложения. Вид (`kind`) остаётся для разбора и статистики.
 *
 * Словарь маршрутов — контракт со сценариями бэка:
 *
 * | route           | params       | ученик                    | родитель (нужен ребёнок)         | учитель                     |
 * |-----------------|--------------|---------------------------|----------------------------------|-----------------------------|
 * | `home`          | —            | вкладка «Главная»         | вкладка «Главная»                | вкладка «Сегодня»           |
 * | `schedule`      | —            | вкладка «Расписание»      | вкладка «Расписание»             | вкладка «Расписание»        |
 * | `homework`      | —            | вкладка «Задания»         | вкладка «Задания»                | вкладка «Задания»           |
 * | `grades`        | —            | вкладка «Оценки»          | вкладка «Оценки»                 | вкладка «Журнал»            |
 * | `subject`       | `subjectId`  | вкладка «Оценки»          | вкладка «Оценки»                 | —                           |
 * | `lesson`        | `lessonId`   | карточка урока            | карточка урока                   | карточка урока              |
 * | `attendance`    | `lessonId`   | карточка урока            | карточка урока                   | лист посещаемости           |
 * | `homework-card` | `homeworkId` | карточка задания          | карточка задания                 | карточка задания            |
 * | `homework-test` | `homeworkId` | карточка задания          | карточка задания                 | —                           |
 * | `survey-take`   | `surveyId`   | прохождение опроса        | прохождение опроса               | —                           |
 * | `feedback`      | —            | —                         | вкладка «Главная» (блок отзывов) | —                           |
 *
 * Почему не прямо в экран предмета и не в сам тест: экрану предмета нужен контекст раздела «Оценки»
 * (четверть, профиль, список четвертей), а тест открывается с карточки задания, которая знает его
 * настройки (античит). Экраны отзывов и посещаемости родителя пока макетные — туда вести нельзя.
 *
 * Правила (закреплены `scripts/verify-push-routes.cjs`):
 * - незнакомые версия данных или маршрут, неполные параметры — «Главная» роли: приложение открылось, и это
 *   лучше, чем тупик или падение;
 * - пуш другому аккаунту (на телефоне вошёл другой человек) — никуда не вести;
 * - родителю — сначала выбрать ребёнка, о котором уведомление;
 * - переходить только когда сессия восстановлена, навигатор готов и открыт раздел роли (холодный старт).
 */

export const PUSH_DATA_VERSION = 1;

const tab = (name) => ({ tab: name });
const screen = (name, payload) => ({ screen: name, payload });

const positiveId = (value) => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isInteger(number) && number > 0 ? number : null;
};

const lessonCard = (params, childId) => {
  const lessonInstanceId = positiveId(params.lessonId);
  if (!lessonInstanceId) return null;
  return screen('lesson', childId ? { lessonInstanceId, childId } : { lessonInstanceId });
};

const homeworkCard = (params, childId) => {
  const homeworkId = positiveId(params.homeworkId);
  if (!homeworkId) return null;
  return screen('homework-card', childId ? { homeworkId, childId } : { homeworkId });
};

const surveyTake = (params) => {
  const surveyId = positiveId(params.surveyId);
  return surveyId ? screen('survey-take', { surveyId }) : null;
};

/** Родителю без ребёнка в данных вести в карточку нельзя: экран не знает, чьи данные показывать. */
const withChild = (build) => (params, childId) => (childId ? build(params, childId) : null);
const ignoringChild = (build) => (params) => build(params, null);

const ROUTES = {
  home: { STUDENT: () => tab('home'), PARENT: () => tab('home'), TEACHER: () => tab('home') },
  schedule: { STUDENT: () => tab('schedule'), PARENT: () => tab('schedule'), TEACHER: () => tab('schedule') },
  homework: { STUDENT: () => tab('homework'), PARENT: () => tab('homework'), TEACHER: () => tab('homework') },
  grades: { STUDENT: () => tab('diary'), PARENT: () => tab('grades'), TEACHER: () => tab('journal') },
  subject: { STUDENT: () => tab('diary'), PARENT: () => tab('grades') },
  lesson: {
    STUDENT: ignoringChild(lessonCard),
    PARENT: withChild(lessonCard),
    TEACHER: ignoringChild(lessonCard),
  },
  attendance: {
    STUDENT: ignoringChild(lessonCard),
    PARENT: withChild(lessonCard),
    TEACHER: (params) => {
      const lessonInstanceId = positiveId(params.lessonId);
      return lessonInstanceId ? screen('attendance', { lessonInstanceId }) : null;
    },
  },
  'homework-card': {
    STUDENT: ignoringChild(homeworkCard),
    PARENT: withChild(homeworkCard),
    TEACHER: ignoringChild(homeworkCard),
  },
  'homework-test': { STUDENT: ignoringChild(homeworkCard), PARENT: withChild(homeworkCard) },
  'survey-take': { STUDENT: surveyTake, PARENT: surveyTake },
  feedback: { PARENT: () => tab('home') },
};

/** Вкладка, куда вести, когда точнее нельзя. У служебных ролей вкладки «Главная» нет — просто открыть раздел. */
const HOME_TAB = { STUDENT: 'home', PARENT: 'home', TEACHER: 'home' };

/** Маршруты, которые приложение знает, — для сверки со сценариями бэка. */
export const KNOWN_PUSH_ROUTES = Object.freeze(Object.keys(ROUTES));

/**
 * Данные нажатого уведомления — только если нажали само уведомление, а не кнопку действия и не «смахнули».
 */
export function responseData(response, defaultActionIdentifier) {
  if (!response || response.actionIdentifier !== defaultActionIdentifier) return null;
  const data = response.notification?.request?.content?.data;
  return data && typeof data === 'object' ? data : null;
}

/** Данные пуша в разобранном виде; `null` — это не уведомление модуля уведомлений. */
export function parsePushData(data) {
  if (!data || typeof data !== 'object' || typeof data.kind !== 'string') return null;
  return {
    version: data.v,
    notificationId: typeof data.nid === 'string' ? data.nid : null,
    kind: data.kind,
    accountId: positiveId(data.accountId),
    route: typeof data.route === 'string' ? data.route : null,
    params: data.params && typeof data.params === 'object' ? data.params : {},
    childId: positiveId(data.childProfileId),
  };
}

/**
 * @param {object} data данные пуша
 * @param {{ role: string|null, accountId: number|null, rootRoute: string|null }} session
 *   `rootRoute` — раздел приложения этой роли (`ParentApp`)
 * @returns {{ type: 'ignore', reason: string }
 *   | { type: 'open', rootRoute: string, tab?: string, screen?: string, payload?: object, childId: number|null, reason?: string }}
 */
export function resolvePushTarget(data, { role, accountId, rootRoute }) {
  const push = parsePushData(data);
  if (!push) return { type: 'ignore', reason: 'not-a-push' };
  if (!rootRoute) return { type: 'ignore', reason: 'no-app-for-role' };
  if (push.accountId && accountId && push.accountId !== accountId) {
    return { type: 'ignore', reason: 'foreign-account' };
  }

  const home = (reason) => ({
    type: 'open',
    rootRoute,
    ...(HOME_TAB[role] ? { tab: HOME_TAB[role] } : {}),
    childId: null,
    reason,
  });

  // Не удалось сверить аккаунт — открыть приложение, но не чужие данные.
  if (!push.accountId || !accountId) return home('account-unknown');
  if (push.version !== PUSH_DATA_VERSION) return home('unknown-version');
  const build = push.route ? ROUTES[push.route]?.[role] : null;
  if (!build) return home('unknown-route');
  const childId = role === 'PARENT' ? push.childId : null;
  const target = build(push.params, childId);
  if (!target) return home('incomplete-params');
  return { type: 'open', rootRoute, ...target, childId };
}

/** Аргументы `navigationRef.navigate` для цели: вкладка или экран стека внутри раздела роли. */
export function navigationArgs(target) {
  if (target.tab) return [target.rootRoute, { screen: 'Tabs', params: { screen: target.tab } }];
  if (target.screen) return [target.rootRoute, { screen: target.screen, params: { payload: target.payload } }];
  return [target.rootRoute];
}

/**
 * Можно ли переходить сейчас. На холодном старте нажатие приходит раньше всего: сессия ещё читается из
 * хранилища, может ждать Face ID, навигатор не смонтирован — переход в такой момент потерялся бы или
 * увёл бы в раздел, которого ещё нет.
 */
export function readyToNavigate({ isAuthenticated, navigatorReady, currentRootRoute, rootRoute }) {
  return Boolean(isAuthenticated && navigatorReady && rootRoute && currentRootRoute === rootRoute);
}
