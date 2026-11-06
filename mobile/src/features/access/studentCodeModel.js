import { formatDay } from './accessRequestModel';

/**
 * Правила экранов персонального кода — блок «Mobile · Коды: классный руководитель и родитель»
 * (Figma `Admin_Admissions`, 2460:4109–4612). Без React: проверяются
 * `scripts/verify-student-codes.cjs`.
 *
 * Показать выданный код нельзя никому — сервер хранит хэш (AUTH-BE-001 §10), — поэтому всё,
 * что экран знает о коде, — три поля ответа: `codeIssuedAt` (выпускали ли), `pinSet` (придумал
 * ли ученик PIN, то есть входил ли) и `canIssueCode` (жив ли аккаунт).
 */

export const REISSUE_CONFIRM = 'STUDENT_CODE_REISSUE_CONFIRM';
const NOT_PERMITTED = 'STUDENT_CODE_NOT_PERMITTED';
const NOT_ISSUABLE = 'STUDENT_CODE_NOT_ISSUABLE';

/** Восемь точек — длина настоящего кода, но не он сам. */
// «●», а не «•»: на кегле кода (28) точка «•» в Onest еле видна, а макет рисует крупные круги.
export const CODE_MASK = '●●●●●●●●';

export const NOT_ISSUABLE_TEXT = 'Аккаунт ученика выключен — код сейчас не выдать.';

function plural(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** «21 ученик», «22 ученика», «25 учеников». */
export function studentsLabel(count) {
  return `${count} ${plural(count, 'ученик', 'ученика', 'учеников')}`;
}

/** «7А» → «7А класс»; название, где слово «класс» уже есть, не удваивается. */
export function classTitle(name) {
  const value = String(name || '').trim();
  if (!value) return 'Класс';
  return /класс/i.test(value) ? value : `${value} класс`;
}

/** Подпись строки «Классное руководство» в профиле: без числа, если состав не загрузился. */
export function homeroomCaption(count) {
  return count == null ? 'Коды для входа учеников' : `${studentsLabel(count)} · коды для входа`;
}

/** Подпись под заголовком «Мой класс». */
export function rosterSubtitle(total) {
  return total == null ? 'Классное руководство' : `Классное руководство · ${studentsLabel(total)}`;
}

/** Подпись под именем ученика в шапке: «7А · ученик 21 из 21». */
export function positionLabel(className, index, total) {
  const place = Number.isInteger(index) && total ? `ученик ${index + 1} из ${total}` : null;
  return [className, place].filter(Boolean).join(' · ');
}

/** Подпись ребёнка в «Мои дети»: строка ведёт к коду, это и написано; класс — как и был. */
export function childCaption(className) {
  return `${className || 'Класс не назначен'} · код для входа`;
}

/**
 * Состав класса вместе с разрешениями учителя. Строка без разрешения — `access: null`: учитель
 * видит весь класс, но выдать код может только тем, кого ему открыл администратор.
 */
export function mergeRoster(students, grants) {
  const byStudent = new Map((grants || []).map((row) => [row.studentProfileId, row]));
  return (students || []).map((student) => {
    const listName = [student.lastName, student.firstName].filter(Boolean).join(' ');
    return {
      studentProfileId: student.studentProfileId,
      listName: listName || student.displayName || '',
      fullName: [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ')
        || student.displayName || '',
      access: byStudent.get(student.studentProfileId) || null,
    };
  });
}

function normalize(value) {
  return String(value || '').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

/** Поиск по ФИО без регистра, «ё» = «е»: «сейт», «арман», «сейтказы арм». */
export function filterStudents(rows, query) {
  const needle = normalize(query);
  if (!needle) return rows;
  return rows.filter((row) => normalize(row.fullName).includes(needle) || normalize(row.listName).includes(needle));
}

/**
 * Статус в строке списка (2460:4192): «Входил» спокойным серым, «Ещё не входил» оранжевым —
 * внимания требует только он. Без разрешения статус неизвестен: учитель видит лишь своих по
 * разрешению, и строка говорит, к кому идти за кодом.
 */
export function rowStatus(access) {
  if (!access) return { tone: 'muted', text: 'Код выдаёт администратор' };
  if (access.pinSet) return { tone: 'muted', text: 'Входил в приложение' };
  return { tone: 'orange', text: 'Ещё не входил' };
}

/** Статус под именем на карточке (2460:4292, 4460): зелёная или оранжевая точка. */
export function heroStatus(access) {
  if (!access) return null;
  return access.pinSet
    ? { tone: 'success', text: 'Уже входил в приложение' }
    : { tone: 'orange', text: 'Ещё не входил в приложение' };
}

/** Подпись под маской: когда выпускали — или что не выпускали ни разу. */
export function issuedCaption(access) {
  const day = formatDay(access?.codeIssuedAt);
  return day ? `Код выдан ${day}` : 'Код ещё не выдавали';
}

/** Срок разрешения учителю; бессрочное — без строки. */
export function grantCaption(access) {
  const day = formatDay(access?.grantExpiresAt);
  return day ? `Ваше разрешение действует до ${day}` : null;
}

/**
 * Пояснение под кнопками. До первого входа — зачем код (тексты макета для учителя и родителя),
 * после — что делать с забытым PIN: новый код его не сбрасывает.
 */
export function codeHint(audience, access) {
  const parent = audience === 'parent';
  if (access?.pinSet) {
    return `${parent ? 'Ребёнок' : 'Ученик'} уже придумал PIN. Если он забыл PIN, его сбрасывает администратор школы.`;
  }
  return parent
    ? 'Код нужен ребёнку для входа. По нему он входит в приложение и придумывает PIN.'
    : 'Передайте код ученику лично. По нему ученик входит в приложение и придумывает PIN.';
}

/** Вопрос перед перевыпуском. Про PIN — только когда он есть: иначе обещание ни о чём. */
export function reissueMessage(audience, pinSet) {
  const lead = 'Прежний код перестанет работать сразу.';
  if (!pinSet) return lead;
  const whose = audience === 'parent' ? 'ребёнка' : 'ученика';
  return `${lead} PIN ${whose} не сбрасывается — он войдёт новым кодом и прежним PIN.`;
}

/** 409 перевыпуска — вопрос к человеку, а не ошибка: код успели выдать в другом месте. */
export function needsReissueConfirm(error) {
  return error?.code === REISSUE_CONFIRM;
}

/** Отказ выпуска своими словами; сеть, таймаут и прочее — текстом клиента API. */
export function issueErrorText(error, audience) {
  if (error?.code === NOT_ISSUABLE) return NOT_ISSUABLE_TEXT;
  if (error?.code === NOT_PERMITTED) {
    return audience === 'parent'
      ? 'Выдать код нельзя: школа больше не подтверждает связь с ребёнком. Обратитесь к администратору.'
      : 'Разрешение на выдачу кода больше не действует. Обратитесь к администратору школы.';
  }
  return error?.message || 'Не удалось выдать код. Попробуйте ещё раз.';
}
