/**
 * Подписи и правила показа сервисной заявки (ТЗ SERVICE-FE-002 §3, §4, §9, §11, §12).
 *
 * Вынесено из экранов: одну и ту же заявку рисуют список, история и карточка, и
 * разъехаться подписям нельзя — «Выполнена» обязана читаться одинаково везде.
 *
 * Здесь нет ни одного правила, которого нет на бэкенде: раздел определяется статусом,
 * окно возврата — теми же 48 часами от `completedAt`, а что человеку позволено, решает
 * сервер и отвечает отказом. Экран считает это лишь затем, чтобы не показывать кнопку,
 * которая всё равно не сработает.
 */

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** §3: одна заявка не может оказаться в двух разделах — наборы статусов не пересекаются. */
export const SECTION_STATUSES = {
  ACTIVE: ['NEW', 'IN_PROGRESS'],
  HISTORY: ['COMPLETED', 'CANCELLED'],
};

/**
 * Какую очередь обслуживает роль (SERVICE-FE-003 §3).
 *
 * Единственное место, где связь «роль → служба» записана на клиенте. Совпадение имён
 * `CLEANING`/`TECHNICIAN` у роли и у типа заявки делает соблазн сравнить их по месту
 * особенно сильным — и такое сравнение молча сломается на первой же роли, чьё имя не
 * совпадает с типом. То же правило на бэкенде живёт в `ServiceType.servedBy`.
 */
const ROLE_SERVICE = {
  CLEANING: 'CLEANING',
  TECHNICIAN: 'TECHNICIAN',
};

export function servedServiceType(role) {
  return ROLE_SERVICE[role] ?? null;
}

/** Исполнитель ли эта роль — от этого зависит, есть ли у неё вкладка «Общая очередь». */
export function isExecutorRole(role) {
  return servedServiceType(role) != null;
}

/**
 * Куда передаётся заявка (§6): служб ровно две, и «другая» определяется однозначно.
 * Выбирать её списком не из чего — вариант всегда один.
 */
export function otherServiceType(serviceType) {
  return serviceType === 'CLEANING' ? 'TECHNICIAN' : 'CLEANING';
}

/** §11: окно возврата выполненной заявки. То же значение, что у бэкенда (BE-006 §1). */
export const RETURN_WINDOW_MS = 48 * 60 * 60 * 1000;

/** §6: лимиты полей — те же, что проверяет `ServiceRequestValidator`. */
export const FIELD_LIMITS = {
  buildingText: 50,
  floorText: 30,
  locationText: 80,
  description: 1000,
};

/** §6, §7: до трёх фотографий, до 10 MB каждая (`ServiceRequestPhotoPolicy`). */
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export const SERVICE_TYPES = [
  { value: 'CLEANING', label: 'Клининг', icon: 'trash' },
  { value: 'TECHNICIAN', label: 'Техническая', icon: 'wrench' },
];

export function serviceTypeMeta(serviceType) {
  return SERVICE_TYPES.find((type) => type.value === serviceType) ?? null;
}

/**
 * Статус одним чипом. `tone` — семантика, а не цвет: экран не должен знать, каким
 * токеном покрашена «Выполнена».
 */
export function statusChip(status) {
  switch (status) {
    case 'NEW':
      return { label: 'Новая', tone: 'new' };
    case 'IN_PROGRESS':
      return { label: 'В работе', tone: 'progress' };
    case 'COMPLETED':
      return { label: 'Выполнена', tone: 'done' };
    case 'CANCELLED':
      return { label: 'Отменена', tone: 'cancelled' };
    default:
      return null;
  }
}

/**
 * «3 этаж» из того, что человек ввёл в поле «Этаж».
 *
 * Поле свободное, и в макете оно заполнено то числом («2» в форме), то фразой
 * («1 этаж» в карточке списка) — это одно и то же значение на двух экранах. Слово
 * добавляется только к голому числу: набранное «цоколь» или «2 этаж» остаётся как есть,
 * и «2 этаж этаж» не получается.
 *
 * Это оформление подписи, а не правило заявки: на сервер уходит ровно то, что ввели.
 */
export function floorLabel(floorText) {
  const value = String(floorText ?? '').trim();
  return /^\d+$/.test(value) ? `${value} этаж` : value;
}

/** «Корпус А · 3 этаж · Каб. 215» — местоположение одной строкой. */
export function locationLine(request) {
  return [request?.buildingText, floorLabel(request?.floorText), request?.locationText]
    .filter((part) => part && String(part).trim())
    .join(' · ');
}

/**
 * Дата, которой заявка датируется в списке: у активной — когда её завели, у закрытой —
 * когда она закрылась. В «Истории» иначе нельзя: заявка, созданная в понедельник и
 * выполненная в пятницу, встала бы среди понедельничных, и порядок раздела перестал бы
 * отвечать на вопрос «что произошло недавно».
 */
export function eventAt(request) {
  return request?.completedAt || request?.cancelledAt || request?.createdAt || null;
}

/** Свежие сверху. Порядок раздела задаётся здесь, потому что он склеен из двух выдач. */
export function byRecency(a, b) {
  return new Date(eventAt(b) ?? 0) - new Date(eventAt(a) ?? 0);
}

/** «8 окт 2025» — дата на карточке списка. */
export function shortDate(instant) {
  const date = toDate(instant);
  if (!date) return null;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** «8 окт 2025, 14:30» — строки карточки заявки, где важно и время. */
export function stamp(instant) {
  const date = toDate(instant);
  if (!date) return null;
  return `${shortDate(instant)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * §11: можно ли вернуть выполненную заявку в работу.
 *
 * Три условия backend'а целиком: своя заявка, статус `COMPLETED`, с момента выполнения
 * прошло не больше 48 часов. Автор проверяется по идентификатору аккаунта, а не по тому,
 * что заявка пришла из «Моих»: та же карточка открывается и по прямой ссылке.
 *
 * @param {object} request карточка заявки
 * @param {number|null|undefined} accountId кто смотрит; `null` — ещё неизвестно, и тогда
 *   кнопки нет: показать её и получить 403 хуже, чем показать её на секунду позже
 * @param {number} now момент отсчёта — параметром, чтобы правило можно было проверить
 */
export function canReturnCompleted(request, accountId, now = Date.now()) {
  if (!request || request.status !== 'COMPLETED') return false;
  if (accountId == null || request.authorId !== accountId) return false;
  const completedAt = toDate(request.completedAt);
  if (!completedAt) return false;
  return now - completedAt.getTime() < RETURN_WINDOW_MS;
}

/**
 * §4: можно ли взять заявку из очереди.
 *
 * Состояние проверяется здесь только чтобы не рисовать заведомо мёртвую кнопку. Право
 * на действие остаётся за бэкендом, и проигравший гонку получит 409 «уже взята» —
 * именно поэтому экран обязан обработать конфликт, а не считать проверку достаточной.
 */
export function canClaim(request, role) {
  return Boolean(
    request
      && request.status === 'NEW'
      && !request.assignedToId
      && request.serviceType === servedServiceType(role),
  );
}

/**
 * §6: рабочие действия исполнителя — вернуть в очередь, передать, выполнить.
 *
 * Одно правило на три действия: бэкенд задаёт им дословно одинаковые условия допуска
 * (`ServiceRequestCapability.EXECUTE`), и разводить их значило бы завести три копии
 * одного условия.
 */
export function canExecute(request, accountId) {
  return Boolean(
    request
      && request.status === 'IN_PROGRESS'
      && accountId != null
      && request.assignedToId === accountId,
  );
}

/**
 * §5: склейка «мои заявки» из двух выдач без дубля.
 *
 * Заявка, где сотрудник и автор, и исполнитель, приходит из обеих — и должна остаться
 * одной карточкой. Порядок задаётся вызывающим: здесь только устранение повтора.
 */
export function mergeById(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const item of list ?? []) {
      if (item?.id != null && !byId.has(item.id)) byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

/**
 * §5: кем сотрудник приходится этой заявке. Показывается на карточке, чтобы одна и та же
 * строка в «Моих заявках» читалась однозначно.
 */
export function viewerContext(request, accountId) {
  if (accountId == null || !request) return null;
  const author = request.authorId === accountId;
  const assignee = request.assignedToId === accountId;
  if (author && assignee) return 'Вы автор и исполнитель';
  if (assignee) return 'Вы исполнитель';
  if (author) return 'Вы автор';
  return null;
}

/** §10: удалить можно только свою и только новую заявку. */
export function canCancel(request, accountId) {
  return Boolean(request)
    && request.status === 'NEW'
    && accountId != null
    && request.authorId === accountId;
}

/**
 * Сколько осталось на возврат — подпись рядом с кнопкой. После истечения окна не
 * «0 часов», а `null`: кнопки в этот момент уже нет, и подписывать нечего.
 */
export function returnWindowLeft(request, now = Date.now()) {
  const completedAt = toDate(request?.completedAt);
  if (!completedAt) return null;
  const left = completedAt.getTime() + RETURN_WINDOW_MS - now;
  if (left <= 0) return null;
  const hours = Math.floor(left / (60 * 60 * 1000));
  if (hours >= 1) return `Осталось ${hours} ${plural(hours, 'час', 'часа', 'часов')}`;
  const minutes = Math.max(1, Math.round(left / (60 * 1000)));
  return `Осталось ${minutes} ${plural(minutes, 'минута', 'минуты', 'минут')}`;
}

/**
 * Событие ленты (§12). Лента — хронология, а не переписка: у события есть название и,
 * если бэкенд их вернул, причина и фотографии результата. Поля ввода у неё нет.
 */
export function historyEventLabel(action) {
  switch (action) {
    case 'CREATED':
      return 'Заявка создана';
    case 'CLAIMED':
      return 'Заявка взята в работу';
    case 'RETURNED_TO_QUEUE':
      return 'Заявка возвращена в очередь';
    case 'TRANSFERRED':
      return 'Заявка передана другой службе';
    case 'COMPLETED':
      return 'Заявка выполнена';
    case 'RETURNED_BY_AUTHOR':
      return 'Заявка возвращена автором в работу';
    case 'CANCELLED':
      return 'Заявка отменена';
    case 'ASSIGNEE_RELEASED':
      return 'Исполнитель снят с заявки';
    default:
      return 'Событие по заявке';
  }
}

/**
 * Имя исполнителя. Приходит вместе с карточкой (`assignedToName`) — и в списке тоже,
 * поэтому строка «Исполнитель: …» есть и в карточке строки, не только в детали.
 *
 * Лента остаётся запасным источником: она называет исполнителя по имени в том событии,
 * которым его назначили, и выручает на старых ответах без нового поля. Ищем с конца —
 * назначений за жизнь заявки может быть несколько (возврат в очередь, передача другой
 * службе, возврат автором), и верен последний.
 */
export function assigneeName(request, history = []) {
  if (!request?.assignedToId) return null;
  if (request.assignedToName) return request.assignedToName;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const event = history[i];
    if (event?.assigneeAfterId === request.assignedToId && event.assigneeAfterName) {
      return event.assigneeAfterName;
    }
  }
  return null;
}

/**
 * Отказ бэкенда человеческим текстом.
 *
 * Разбор по коду, а не по тексту сообщения: у одного действия поводов отказать несколько,
 * и ведут они к разному — «окно закрылось» просит завести новую заявку, а «уже не новая»
 * просит обновить карточку.
 */
export function actionErrorText(error) {
  switch (error?.code) {
    // 422 приходит и на возврат без причины. Общее сообщение бэкенда одно на все
    // проверки полей — «Заявку нельзя создать: исправьте указанные поля», — и под шитом
    // возврата оно говорит не о том. Берём объяснение самого поля: «Причина возврата:
    // поле обязательно» отвечает ровно на вопрос, который человек задал нажатием.
    case 'SERVICE_REQUEST_VALIDATION_FAILED': {
      const first = (error.details ?? []).find((violation) => violation?.message);
      return first?.message || 'Проверьте заполненные поля и попробуйте ещё раз.';
    }
    case 'SERVICE_REQUEST_RETURN_WINDOW_EXPIRED':
      return 'Прошло больше 48 часов с момента выполнения — создайте новую заявку.';
    case 'SERVICE_REQUEST_STATUS_CONFLICT':
      return 'Статус заявки изменился. Обновите карточку и попробуйте ещё раз.';
    case 'SERVICE_REQUEST_FORBIDDEN':
      return 'Это действие доступно только автору заявки.';
    case 'SERVICE_REQUEST_NOT_FOUND':
      return 'Заявка не найдена — возможно, она была удалена.';
    default:
      return error?.message || 'Не удалось выполнить действие. Попробуйте ещё раз.';
  }
}

/**
 * Отказ валидации по полям (422). Бэкенд возвращает `details` списком
 * `{field, message}` — форма подсвечивает по нему конкретные поля, а не всю себя.
 */
export function fieldErrors(error) {
  if (error?.code !== 'SERVICE_REQUEST_VALIDATION_FAILED') return {};
  const map = {};
  for (const violation of error.details ?? []) {
    if (violation?.field && !map[violation.field]) map[violation.field] = violation.message;
  }
  return map;
}

/**
 * Отказ при взятии заявки в работу (§4).
 *
 * Здесь, в отличие от прочих действий, показывается сообщение сервера, а не своё: на
 * конфликт он отвечает разбором свежей строки и различает «заявку уже взял другой
 * сотрудник» и «взять можно только новую заявку». Заменить это общим «статус изменился»
 * значило бы огрубить готовый ответ до бесполезного.
 *
 * Отдельный код бэкенд для этого не заводит — конфликт приходит тем же
 * `SERVICE_REQUEST_STATUS_CONFLICT`, поэтому различает случаи не код, а место вызова.
 */
export function claimErrorText(error) {
  // Оба отказа взятия бэкенд формулирует точнее, чем можно вывести из кода: конфликт он
  // собирает по свежей строке («заявку уже взял другой сотрудник» либо «взять можно
  // только новую»), а запрет называет службу, которой заявка адресована. Общий разбор
  // огрубил бы и то и другое — а FORBIDDEN он и вовсе объяснил бы правами автора,
  // хотя здесь речь о чужой службе.
  const verbatim = error?.code === 'SERVICE_REQUEST_STATUS_CONFLICT'
    || error?.code === 'SERVICE_REQUEST_FORBIDDEN';
  if (verbatim && error.message) return error.message;
  return actionErrorText(error);
}

function toDate(instant) {
  if (!instant) return null;
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function plural(n, one, few, many) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = n % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
