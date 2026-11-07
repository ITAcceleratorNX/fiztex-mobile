/**
 * Вход для всех ролей (AUTH-FE-001, Figma `Admin_Admissions`, M1–M7) — правила без React.
 *
 * Экраны спрашивают отсюда три вещи: что спросить вторым шагом, годится ли ввод и какими
 * словами сказать об отказе. Проверка — `node scripts/verify-sign-in.cjs`; она же сверяет
 * алфавит кода с бэкендом, если тот лежит рядом.
 */

/**
 * Персональный код ученика — восемь символов Crockford Base32 без I L O U 0 1
 * (`CredentialService.STUDENT_CODE_ALPHABET`).
 *
 * Это зеркало сервера, а не догадка: `POST /api/auth/sign-in` решает «пароль или PIN» по той
 * же форме логина (контракт §9), а экран обязан знать ответ раньше — второй шаг спрашивает
 * либо пароль, либо PIN. Спросить сервер нельзя: эндпоинта «какие способы входа у этого
 * логина» нет и не будет — он отвечал бы любому, есть ли такой человек в школе.
 */
export const PERSONAL_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const PERSONAL_CODE_LENGTH = 8;
const PERSONAL_CODE = new RegExp(`^[${PERSONAL_CODE_ALPHABET}]{${PERSONAL_CODE_LENGTH}}$`);

/** Код активации или восстановления взрослого — восемь цифр (`generateActivationCode`). */
export const SCHOOL_CODE_LENGTH = 8;

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/**
 * Новый пароль — не короче восьми символов, как в макете (M7) и на вебе. Сервер при смене
 * принимает от шести (`ChangePasswordRequest`), при активации — от восьми
 * (`ActivateByCodeRequest`); клиент держит одно правило на оба пути. Потолок 72 — предел
 * BCrypt на сервере.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Что введено в поле M1 и что спрашивать вторым шагом.
 *
 * `kind`: `code` — персональный код ученика, дальше PIN; `phone` и `email` — дальше пароль;
 * `empty` — кнопка выключена; `invalid` — подсказка под полем (`reason` — какая).
 *
 * `login` — то, что уйдёт в `sign-in`. Код — без пробелов и дефисов, заглавными: регистр
 * сервер поднимет и сам, но «D6A4-4QAX» длиннее восьми и ушёл бы веткой телефона. Телефон —
 * в виде `+7XXXXXXXXXX`, как его хранит сервер.
 */
export function classifyLogin(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { kind: 'empty', login: '' };
  // Почта — по «@», ровно как решает сервер (`PhoneNormalizer.looksLikeEmail`).
  if (text.includes('@')) return { kind: 'email', login: text };

  const compact = text.replace(/[\s-]/g, '').toUpperCase();
  if (PERSONAL_CODE.test(compact)) return { kind: 'code', login: compact };

  const phone = normalizePhone(text);
  if (phone) return { kind: 'phone', login: phone };

  // Восемь знаков с буквами, но не код: школьник перепутал O с нулём или I с единицей.
  // Сказать это прямо полезнее, чем отправить ввод веткой телефона и получить «неверно».
  if (/^[0-9A-Z]{8}$/.test(compact) && /[A-Z]/.test(compact)) {
    return { kind: 'invalid', login: text, reason: 'codeChars' };
  }
  // Восемь цифр — код от школы для родителя или сотрудника. Это не логин: им задают
  // пароль на экране восстановления (M6), а здесь он ушёл бы на сервер телефоном.
  if (/^\d{8}$/.test(compact)) return { kind: 'invalid', login: text, reason: 'schoolCode' };
  return { kind: 'invalid', login: text, reason: 'shape' };
}

const LOGIN_HINTS = {
  shape: 'Введите телефон, почту или персональный код из 8 символов.',
  codeChars: 'В персональном коде нет букв O, I, L, U и цифр 0 и 1 — проверьте символы.',
  schoolCode: 'Код из 8 цифр от школы вводится на экране «Забыли пароль или PIN?».',
};

/** Подсказка под полем M1 или `null`, если с вводом можно идти дальше. */
export function loginHint(classified) {
  return classified.kind === 'invalid' ? LOGIN_HINTS[classified.reason] : null;
}

/**
 * Телефон в том виде, в каком его хранит сервер (`PhoneNormalizer.normalize`): «8 700…»,
 * «7 700…» и «700…» — это `+7700…`. Пробелы, скобки и дефисы снимаются. `null` — не телефон:
 * посторонние знаки или меньше десяти цифр.
 */
export function normalizePhone(raw) {
  const stripped = String(raw ?? '').trim().replace(/[\s()-]/g, '');
  if (!/^(\+|00)?\d+$/.test(stripped)) return null;
  const digits = stripped.replace(/^(\+|00)/, '');
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits === stripped) {
    if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
    if (digits.length === 10) return `+7${digits}`;
  }
  return `+${digits}`;
}

/** «+7 700 100 00 14» — так номер написан в макете M2; другие форматы показываются как есть. */
export function formatPhone(phone) {
  const parts = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(phone || '');
  return parts ? `+7 ${parts[1]} ${parts[2]} ${parts[3]} ${parts[4]}` : phone || '';
}

export function isPin(value) {
  return new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(value || '');
}

export function isSchoolCode(value) {
  return new RegExp(`^\\d{${SCHOOL_CODE_LENGTH}}$`).test(value || '');
}

/** Правила под полями нового пароля (M7): галочка или крестик по мере ввода. */
export function newPasswordRules(password, repeat) {
  const longEnough = password.length >= PASSWORD_MIN_LENGTH;
  const matches = repeat.length > 0 && password === repeat;
  return { longEnough, matches, ready: longEnough && matches };
}

/**
 * Новый PIN (M4). Несовпадение показывается, только когда второй PIN набран целиком: пока
 * человек вводит третью цифру, «не совпадает» — не новость, а помеха.
 */
export function newPinState(pin, repeat) {
  const valid = isPin(pin);
  const matches = repeat.length > 0 && pin === repeat;
  return { valid, matches, mismatch: repeat.length >= pin.length && repeat.length > 0 && !matches, ready: valid && matches };
}

/** Отказ сервера в ответ на введённое — в отличие от сети, сбоя и чужой роли. */
function isRejection(error) {
  return error?.status === 400 || error?.status === 401;
}

const UNREACHABLE = 'Не удалось связаться со школой. Проверьте интернет и попробуйте ещё раз.';

/**
 * Текст отказа входа (M5). На все отказы — одна фраза своей ветки: сервер отвечает одинаково
 * и на чужой логин, и на неверный секрет (§9), и клиент различать не берётся — иначе он сам
 * рассказывал бы, есть ли такой человек в школе.
 *
 * Сеть, таймаут и сбой сервера — своим текстом клиента API: выдать обрыв связи за неверный
 * пароль значит отправить человека вспоминать пароль, который верен. Отказ по роли
 * (`ROLE_REJECTED`) приходит своим сообщением и проходит как есть.
 */
const SIGN_IN_REJECTED = {
  phone: 'Неверный телефон или пароль. Проверьте данные или восстановите пароль.',
  email: 'Неверная почта или пароль. Проверьте данные или восстановите пароль.',
  code: 'Неверный код или PIN. Если входите впервые — сначала придумайте PIN.',
};

export function signInErrorMessage(error, kind) {
  if (isRejection(error)) return SIGN_IN_REJECTED[kind] || SIGN_IN_REJECTED.phone;
  return error?.message || UNREACHABLE;
}

/**
 * Отказ активации PIN (M4). Сервер не говорит, что именно не так, — кода нет или PIN по нему
 * уже задан, — и экран не угадывает, а называет оба случая и выход из второго.
 */
export function pinSetupErrorMessage(error) {
  if (isRejection(error)) {
    return 'Не получилось: код неверный или PIN по нему уже создан. Если вы уже входили — войдите своим PIN.';
  }
  return error?.message || UNREACHABLE;
}

/** Отказ активации взрослого по коду от школы: код неверный, использован или истёк (72 часа). */
export function schoolCodeErrorMessage(error) {
  if (isRejection(error)) {
    return 'Код не подошёл: он неверный, уже использован или истёк. Проверьте телефон и код или попросите в школе новый.';
  }
  return error?.message || UNREACHABLE;
}

/**
 * Отказ смены пароля (M7). Здесь у сервера человеческие и разные тексты — «Текущий пароль не
 * подошёл», «Новый пароль должен отличаться от текущего», — и скрывать нечего: человек уже
 * вошёл. Поэтому текст сервера показывается как есть.
 */
export function passwordChangeErrorMessage(error) {
  return error?.message || UNREACHABLE;
}

/**
 * Пути активации взрослого по коду от школы (M6), в порядке перебора.
 *
 * Единой точки активации у сервера нет — путь выбирает роль, а человек свою роль в системе
 * не выбирает и выбирать не должен. Перебор безопасен: аккаунт ищется по телефону, а роль
 * сверяется до проверки кода (`ActivationService.activate`), поэтому чужой путь отказывает,
 * не засчитывая попытки. Попытку засчитает только путь своей роли — ровно одну, как один
 * точный запрос. Телефон у аккаунта один, значит подойти может не больше одного пути.
 *
 * Порядок — по частоте: код восстановления чаще всего выдают родителю (D6).
 */
export const ACTIVATION_PATHS = ['activateParent', 'activateTeacher', 'activateStaff', 'activateAdmin'];

/**
 * Активирует аккаунт кодом от школы: первый путь, который принял код, и есть роль человека.
 * Сеть и сбой сервера перебор прерывают — остальные пути упали бы так же.
 */
export async function activateWithSchoolCode(api, contact, code, password) {
  let rejection = null;
  for (const path of ACTIVATION_PATHS) {
    try {
      return await api[path](contact, code, password);
    } catch (error) {
      if (!isRejection(error)) throw error;
      rejection = error;
    }
  }
  throw rejection;
}
