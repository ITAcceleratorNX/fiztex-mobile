/**
 * Заявка на доступ и её статус (AUTH-FE-001, Figma `Admin_Admissions`, A1–A5, S1–S6) — правила
 * без React. Проверка — `node scripts/verify-access-request.cjs`.
 *
 * Своих копий серверных правил здесь минимум: что обязательно, решает сервер и отвечает
 * `details.missing`; этап и следующий шаг он присылает посчитанными (`stage`, `nextStep`).
 * Клиент проверяет только то, без чего форму бессмысленно отправлять, и строже сервера ровно в
 * двух местах — см. `validateForm`.
 */
import { formatPhone, newPasswordRules, normalizePhone } from '@features/auth/signInModel';

export const ROLES = { STUDENT: 'STUDENT', PARENT: 'PARENT' };

// ── Классы ─────────────────────────────────────────────────────────────────────

const compactClass = (text) => String(text || '').replace(/[\s«»"'-]/g, '').toUpperCase();

/**
 * «5 «А»» — так класс написан в макете. Только когда имя класса и есть «параллель + буква»:
 * у класса с особым именем («7 «А» (профильный)») подпись из параллели и буквы совпала бы с
 * соседним «7А», и в списке оказались бы два одинаковых пункта.
 */
export function classLabel({ grade, letter, name }) {
  if (grade && letter && (!name || compactClass(name) === compactClass(`${grade}${letter}`))) {
    return `${grade} «${letter}»`;
  }
  return name || grade || '';
}

/**
 * Имя класса из статуса (снимок в заявке, «5А») — в подпись макета. Разбирается по форме:
 * цифры параллели и буква; что не разобралось, показывается как есть.
 */
export function classNameLabel(name) {
  const parts = /^(\d{1,2})\s*[-«"]?\s*([A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі]{1,3})[»"]?$/.exec(String(name || '').trim());
  return parts ? `${parts[1]} «${parts[2].toUpperCase()}»` : name || '';
}

/** Справочник `GET /classes` — плоский список в порядке сервера («10» после «9»). */
export function classOptions(catalog) {
  if (!catalog?.yearConfigured) return [];
  return (catalog.grades || []).flatMap((grade) =>
    (grade.letters || []).map((item) => ({
      value: item.classId,
      classId: item.classId,
      grade: String(grade.grade),
      letter: item.letter || '',
      name: item.name || '',
      label: classLabel({ grade: String(grade.grade), letter: item.letter, name: item.name }),
    })));
}

/**
 * Совпадения для поля класса (A2): «5» — все пятые, «1» — первые, десятые и одиннадцатые,
 * «5а» и «5 «А»» — один класс. Ищется начало, а не подстрока: «А» не должна вытаскивать
 * все буквы «А» школы.
 */
export function filterClasses(options, query) {
  const q = compactClass(query);
  if (!q) return [];
  return options.filter((option) =>
    compactClass(option.grade + option.letter).startsWith(q) || compactClass(option.name).startsWith(q));
}

/** Класс по имени из статуса — чтобы исправленная заявка открылась с тем же классом. */
export function findClassByName(options, name) {
  const key = compactClass(name);
  if (!key) return null;
  return options.find((option) => compactClass(option.name) === key
    || compactClass(option.grade + option.letter) === key) || null;
}

// ── Форма ──────────────────────────────────────────────────────────────────────

export function emptyForm(role) {
  return {
    role,
    fullName: '',
    classId: null,
    phone: '',
    password: '',
    repeat: '',
    childFullName: '',
    childClassId: null,
  };
}

/**
 * Форма из статуса заявки — для черновика и исправленной заявки (S5). Пароль не приходит
 * никогда: сервер отдаёт только то, что заявитель прислал сам, и не секреты.
 */
export function formFromStatus(status, options) {
  const form = emptyForm(status.role);
  return {
    ...form,
    fullName: status.fullName || '',
    phone: status.phone ? formatPhone(status.phone) : '',
    classId: findClassByName(options, status.className)?.classId ?? null,
    childFullName: status.childFullName || '',
    childClassId: findClassByName(options, status.childClassName)?.classId ?? null,
  };
}

const words = (text) => String(text || '').trim().split(/\s+/).filter(Boolean);

/**
 * Что мешает отправить форму, по полям. Сервер требует у ученика ФИО из двух слов и класс,
 * у родителя — ещё телефон, пароль, ребёнка и его класс; поля, которых он не знает, клиент не
 * требует.
 *
 * Строже сервера в двух местах, и оба — ради того, кто будет входить:
 * - **пароль — от восьми символов**, как на экранах входа (сервер заявки принимает любой);
 * - **ученику с телефоном пароль обязателен**: блок «Пароль для входа по телефону» в макете
 *   появляется вместе с телефоном. Без пароля сервер оставил бы такого ученика на коде, а
 *   номер — сведением для проверки, и телефон, введённый «для входа», не дал бы войти.
 */
export function validateForm(form) {
  const errors = {};
  if (words(form.fullName).length < 2) errors.fullName = 'Нужны фамилия и имя — как в документах';

  const phoneText = String(form.phone || '').trim();
  const phone = phoneText ? normalizePhone(phoneText) : null;
  if (phoneText && !phone) errors.phone = 'Проверьте номер: 10–11 цифр';

  const parent = form.role === ROLES.PARENT;
  if (parent && !phoneText) errors.phone = 'Телефон станет вашим логином';
  if (!parent && !form.classId) errors.classId = 'Выберите класс';
  if (parent) {
    if (words(form.childFullName).length < 2) errors.childFullName = 'Нужны фамилия и имя ребёнка';
    if (!form.childClassId) errors.childClassId = 'Выберите класс ребёнка';
  }

  const needsPassword = parent || Boolean(phone);
  const rules = newPasswordRules(form.password || '', form.repeat || '');
  if (needsPassword && !rules.longEnough) errors.password = 'Не короче 8 символов';
  else if (needsPassword && !rules.matches) errors.repeat = 'Пароли не совпадают';

  return { errors, ready: Object.keys(errors).length === 0, needsPassword, rules };
}

/** Тело `AccessRequestFormRequest`. Поля чужой роли не уходят — сервер их всё равно гасит. */
export function formPayload(form, token) {
  const phone = normalizePhone(String(form.phone || '').trim());
  const body = {
    token: token || undefined,
    role: form.role,
    fullName: String(form.fullName || '').trim(),
    phone: phone || null,
    // Без телефона пароль сервер не принимает (`PASSWORD_WITHOUT_PHONE`): входить будут кодом.
    password: phone && form.password ? form.password : null,
  };
  if (form.role === ROLES.PARENT) {
    body.childFullName = String(form.childFullName || '').trim() || null;
    body.childClassId = form.childClassId ?? null;
  } else {
    body.classId = form.classId ?? null;
  }
  return body;
}

/**
 * Черновик — то же тело, но **без пароля**: человек его ещё не отправлял, и класть секрет на
 * сервер ради незаконченной формы незачем. Пустой пароль сервер в черновике не стирает.
 */
export function draftPayload(form, token) {
  return { ...formPayload(form, token), password: null };
}

/** Есть ли что сохранять: черновик без ФИО сервер не примет, а пустой и не нужен. */
export function hasDraftContent(form) {
  return words(form.fullName).length > 0;
}

/** Поля из отказа `ACCESS_REQUEST_INCOMPLETE` — подсвечиваются по ответу сервера, а не по копии правил. */
export function missingFields(error) {
  if (error?.code !== 'ACCESS_REQUEST_INCOMPLETE') return [];
  const missing = error?.details?.missing;
  return Array.isArray(missing) ? missing : [];
}

const UNREACHABLE = 'Не удалось связаться со школой. Проверьте интернет и попробуйте ещё раз.';

/** Текст отказа подачи. Коды сервера разбираются здесь, а не по тексту ответа. */
export function submitErrorMessage(error) {
  switch (error?.code) {
    case 'ACCESS_REQUEST_ALREADY_PENDING': {
      const since = formatDay(error?.details?.submittedAt);
      return `Заявка на этого человека уже на рассмотрении${since ? ` с ${since}` : ''}. Дождитесь решения школы.`;
    }
    case 'ACCESS_REQUEST_INCOMPLETE':
      return 'Заполните отмеченные поля.';
    case 'ACCESS_REQUEST_CLASS_NOT_FOUND':
      return 'Этого класса больше нет в списке — выберите класс заново.';
    case 'ACCESS_REQUEST_RATE_LIMITED':
      return 'Слишком много попыток подряд. Подождите минуту и отправьте снова.';
    case 'ACCESS_REQUEST_PASSWORD_WITHOUT_PHONE':
      return 'Пароль нужен только вместе с телефоном.';
    case 'ACCESS_REQUEST_NOT_FOUND':
      return 'Прежняя заявка больше не найдена — отправьте новую.';
    case 'ACCESS_REQUEST_NOT_PENDING':
    case 'ACCESS_REQUEST_RESUBMIT_NOT_ALLOWED':
      return 'По этой заявке школа уже приняла решение — откройте её статус.';
    default:
      return error?.message || UNREACHABLE;
  }
}

// ── Статус ─────────────────────────────────────────────────────────────────────

/** Сервер не знает токен — истёк срок после решения (30 дней) или заявки нет. Ответ один. */
export function isRequestGone(error) {
  return error?.status === 404 || error?.code === 'ACCESS_REQUEST_NOT_FOUND';
}

/** «Сейтказы Арман Е.» — как в сводке макета. */
export function shortName(fullName) {
  const [last, first, middle] = words(fullName);
  if (!first) return last || '';
  return middle ? `${last} ${first} ${middle[0]}.` : `${last} ${first}`;
}

/** Имя для обращения: ФИО пишут «Фамилия Имя Отчество». */
export function firstName(fullName) {
  const list = words(fullName);
  return list[1] || list[0] || '';
}

/** «2 ноября, 15:24». */
export function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
  return `${day}, ${time}`;
}

/** «3 ноября». */
export function formatDay(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
}

/** Шкала S2: отправлена → на рассмотрении → решение. */
export function reviewTimeline(status) {
  return [
    { title: 'Отправлена', caption: formatDateTime(status.submittedAt), state: 'done' },
    { title: 'На рассмотрении', caption: 'Сейчас', state: 'current' },
    { title: 'Решение школы', caption: null, state: 'todo' },
  ];
}

/** Сводка «что вы отправили» (S2, S4) — только то, что заявитель прислал сам. */
export function summaryRows(status) {
  const phone = status.phone ? formatPhone(status.phone) : 'Не указан';
  if (status.role === ROLES.PARENT) {
    return [
      { label: 'Родитель', value: shortName(status.fullName) },
      { label: 'Телефон', value: phone },
      { label: 'Ребёнок', value: shortName(status.childFullName) },
      { label: 'Класс ребёнка', value: classNameLabel(status.childClassName) || '—' },
    ];
  }
  return [
    { label: 'Ученик', value: shortName(status.fullName) },
    { label: 'Класс', value: classNameLabel(status.className) || '—' },
    { label: 'Телефон', value: phone },
  ];
}

/**
 * Шаги первого входа после одобрения (S3) — по `nextStep`, который сервер выводит из
 * состояния аккаунта: заявитель его не видит, и угадывать «телефон или код» клиенту нечем.
 */
function approvedSteps(status) {
  switch (status.nextStep) {
    case 'SIGN_IN_WITH_CODE':
      return [
        { title: 'Получите персональный код', text: 'Его выдаст классный руководитель или администратор школы.' },
        { title: 'Введите код на экране входа', text: 'И придумайте PIN из 4–6 цифр.' },
      ];
    case 'SIGN_IN_WITH_PHONE':
      return [
        {
          title: 'Войдите по телефону',
          text: status.phone
            ? `${formatPhone(status.phone)} и пароль, который вы придумали в заявке.`
            : 'Телефон и пароль, которые вы указали в заявке.',
        },
      ];
    case 'ACTIVATE_WITH_CODE':
      return [
        { title: 'Получите код активации', text: 'Его выдаст администратор школы.' },
        { title: 'Задайте пароль', text: 'На экране входа — «Забыли пароль или PIN?», там поле для кода.' },
      ];
    default:
      return [];
  }
}

/**
 * Что показать на экране статуса. `kind` выбирает раскладку: `draft`, `pending` (S2, у
 * родителя — в духе S6), `approved` (S3), `rejected` (S4).
 */
export function statusScreen(status) {
  const parent = status.role === ROLES.PARENT;
  const name = firstName(status.fullName);
  switch (status.stage) {
    case 'DRAFT':
      return {
        kind: 'draft',
        title: 'Заявка не отправлена',
        text: 'Данные сохранены, но администратор рассмотрит заявку только после отправки.',
      };
    case 'PENDING':
      return parent
        ? {
          kind: 'pending',
          parent: true,
          title: name ? `${name}, заявка ещё на\u00a0проверке` : 'Заявка ещё на\u00a0проверке',
          text: 'Дневник ребёнка откроется, как только школа подтвердит, что вы его родитель.',
        }
        : {
          kind: 'pending',
          parent: false,
          title: 'Школа проверяет данные',
          text: 'Когда администратор примет решение, статус здесь обновится.',
        };
    // `ACTIVE` — не «человек уже входил»: аккаунт с паролем из заявки создаётся сразу активным,
    // и этап становится `ACTIVE` в момент одобрения. Поэтому вид один, а что делать — по `nextStep`.
    case 'APPROVED_PENDING_ACTIVATION':
    case 'ACTIVE': {
      const tail = status.stage === 'ACTIVE' ? 'Можно входить.' : 'Осталось войти в первый раз.';
      return {
        kind: 'approved',
        title: 'Доступ открыт',
        text: parent
          ? `Ребёнок: ${shortName(status.childFullName)}, ${classNameLabel(status.childClassName)}. ${tail}`
          : `Вы ученик ${classNameLabel(status.className)}. ${tail}`,
        steps: approvedSteps(status),
      };
    }
    case 'REJECTED':
      return {
        kind: 'rejected',
        title: status.resubmitAllowed ? 'Заявку нужно исправить' : 'Заявка отклонена',
        text: status.rejectionReason || 'Школа не указала причину.',
        meta: ['Администратор школы', formatDay(status.decidedAt)].filter(Boolean).join(', '),
      };
    default:
      return { kind: 'unknown', title: 'Статус заявки', text: 'Обновите приложение, чтобы увидеть этот статус.' };
  }
}

/** «Статус можно проверить до 4 декабря» — после решения ссылка живёт 30 дней (§13). */
export function validUntilNote(status) {
  const until = formatDay(status.tokenValidUntil);
  return until ? `Заявка видна здесь до ${until}.` : null;
}
