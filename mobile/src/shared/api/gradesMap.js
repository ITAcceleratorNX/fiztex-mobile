/**
 * Правила показа оценок — одно место на все экраны учителя.
 *
 * Здесь нет ни одного решения о правах: что можно делать, приходит с бэка
 * (`canManageGrades`, `writeState`, `canEdit`, `canManage`). Тут только перевод этих
 * ответов на человеческий и раскладка данных журнала по экранам.
 */

/** Порядок и подписи типов — ТЗ GRADES-FE-001 §5.1, набор — справочник бэка. */
export const GRADE_TYPE_LABELS = {
  FORMATIVE: 'Формативная оценка',
  SUMMATIVE_SECTION: 'СОР — суммативное за раздел',
  SUMMATIVE_TERM: 'СОЧ — суммативное за четверть',
  LESSON_WORK: 'Работа на уроке',
  ORAL_ANSWER: 'Устный ответ',
  BOARD_WORK: 'Работа у доски',
  INDEPENDENT_WORK: 'Самостоятельная работа',
  CONTROL_WORK: 'Контрольная работа',
  TEST: 'Тест',
  PRACTICAL_OR_LAB: 'Практическая / лабораторная работа',
  PROJECT_OR_PRESENTATION: 'Проект / презентация',
  HOMEWORK: 'Домашнее задание',
  OTHER: 'Другое',
};

export const GRADE_TYPES = Object.keys(GRADE_TYPE_LABELS);

/** Итоговая — только целые 2…5: знаки для неё запрещены (final-grades-contract §3). */
export const FINAL_VALUES = [2, 3, 4, 5];

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/**
 * Полоса над списком: почему лист только на чтение и что с этим делать.
 *
 * Причину считает сервер (`writeState`), экран её только называет. Разные причины —
 * разные действия учителя: «попросите разрешение», «дождитесь урока», «поздно».
 *
 * @returns {{text: string, tone: 'info'|'warn'}|null} `null` — писать можно, полосы нет
 */
export function writeStateBanner(sheet) {
  if (!sheet) return null;
  const state = sheet.writeState;

  // Замещающему, которому сейчас можно, полоса всё равно нужна: его доступ кончится
  // со звонком, и узнать об этом постфактум хуже, чем знать заранее (ТЗ §5.2).
  if (state === 'ALLOWED') {
    return sheet.capacity === 'SUBSTITUTE_TEACHER'
      ? {
        tone: 'warn',
        text: 'Временный доступ: вы можете выставлять оценки только до конца этого урока по расписанию',
      }
      : null;
  }

  switch (state) {
    case 'SUBSTITUTE_WINDOW_CLOSED':
      return { tone: 'info', text: 'Время выставления оценок истекло — доступен только просмотр' };
    case 'SUBSTITUTE_WINDOW_NOT_OPEN':
      return { tone: 'info', text: 'Урок ещё не начался — выставлять оценки можно во время урока' };
    case 'SUBSTITUTE_NOT_PERMITTED':
      return { tone: 'info', text: 'Замещающему не выдано разрешение работать с оценками этого урока' };
    case 'SUBSTITUTION_ENDED':
      return { tone: 'info', text: 'Замена на этот урок больше не действует — доступен только просмотр' };
    case 'LESSON_SUPERSEDED':
      return { tone: 'info', text: 'Урок заменён новой версией расписания — откройте актуальный урок' };
    case 'LESSON_CANCELLED':
      // Отменённый урок показывается пустым состоянием целиком — полоса была бы вторым
      // сообщением об одном и том же.
      return null;
    case 'NOT_TEACHING':
      return { tone: 'info', text: 'Оценки этого урока доступны только для просмотра' };
    default:
      return null;
  }
}

/** Бейдж в шапке листа: «Не заполнено» или сколько учеников уже оценено. */
export function sheetBadge(sheet) {
  const rows = sheet?.students || [];
  if (rows.length === 0) return 'Не заполнено';
  const graded = rows.filter((row) => (row.grades || []).length > 0).length;
  return graded === 0 ? 'Не заполнено' : `Оценено ${graded} из ${rows.length}`;
}

/**
 * Средний балл как в макете — с одним знаком.
 *
 * Значение приходит с двумя (контракт §5) и округляется **только при показе**:
 * пересчитывать среднее на клиенте нельзя, а показать 4.5 вместо 4.50 — можно.
 */
export function formatAverage(value) {
  if (value === undefined || value === null) return '—';
  return Number(value).toFixed(1);
}

/** «12 сентября» — год в ленте четверти не нужен, она вся внутри одного. */
export function longDate(iso) {
  if (!iso) return '';
  const [, month, day] = String(iso).split('-').map(Number);
  if (!month || !day) return String(iso);
  return `${day} ${MONTHS_GENITIVE[month - 1]}`;
}

/**
 * Лента оценок одного ученика из ответа журнала.
 *
 * Второго запроса не нужно: журнал уже принёс и колонки, и клетки — экран ученика
 * это тот же ответ, сложенный по датам. Колонки без оценок в ленту не попадают: она
 * отвечает на вопрос «что получил», а не «когда были уроки».
 *
 * @returns {{entries: Array<{key: string, date: string, columnKey: string, lessonId: number|null,
 *   grades: Array}>, lessonCount: number, gradeCount: number}}
 */
export function studentTimeline(journal, studentProfileId) {
  const columns = journal?.columns || [];
  const row = (journal?.rows || []).find((item) => item.studentProfileId === studentProfileId);
  const cells = new Map((row?.cells || []).map((cell) => [cell.columnKey, cell]));

  const entries = [];
  let gradeCount = 0;
  for (const column of columns) {
    const grades = cells.get(column.key)?.grades || [];
    if (grades.length === 0) continue;
    gradeCount += grades.length;
    entries.push({
      key: column.key,
      date: column.date,
      columnKey: column.key,
      lessonId: column.type === 'LESSON' ? column.sourceId : null,
      grades,
    });
  }
  // Свежее сверху: в макете лента идёт от последнего урока к первому.
  entries.reverse();
  return { entries, lessonCount: entries.length, gradeCount };
}

/** Строки итогов по ученику — журналу нужна колонка «итог», а он приходит отдельно. */
export function finalsByStudent(classFinals) {
  const map = new Map();
  for (const row of classFinals?.rows || []) {
    if (row.studentProfileId != null) map.set(row.studentProfileId, row);
  }
  return map;
}

/**
 * Состояние набора итогов: чего ждать от кнопки публикации.
 *
 * @returns {{filled: number, total: number, allFilled: boolean, published: boolean}}
 */
export function finalsProgress(classFinals) {
  const rows = classFinals?.rows || [];
  // Итог выставлен — это строка итога, а не число: ВНА/НА и зачёт числа не имеют, но тоже
  // решение учителя (ATTESTATION-001). Раньше такие строки считались пустыми.
  const filled = rows.filter((row) => row.finalGrade != null).length;
  return {
    filled,
    total: rows.length,
    allFilled: rows.length > 0 && filled === rows.length,
    published: rows.length > 0 && rows.every((row) => row.finalGrade?.status === 'PUBLISHED'),
    // Публиковать итоги можно только после окончания четверти: дату и признак считает сервер.
    publicationOpen: classFinals?.publicationOpen !== false,
    publishableFrom: classFinals?.publishableFrom ?? null,
  };
}

/** Подпись типа оценки; без типа — прочерк, а не пустая строка в макете. */
export function gradeTypeLabel(type) {
  return type ? GRADE_TYPE_LABELS[type] || 'Другое' : 'Оценка за урок';
}

/**
 * Оценки дневника, разложенные по урокам — чипы на карточках расписания.
 *
 * Ключ — `lessonId`, а не дата: за один день у ученика бывает два урока одного предмета,
 * и по дате они склеились бы в один чип. Записи без урока (оценка за самостоятельное ДЗ)
 * в раскладку не попадают: их некуда положить на расписании.
 *
 * Тот же приём, что у отметок посещаемости (`marksByLesson`).
 */
export function diaryGradesByLesson(entries) {
  const map = {};
  for (const entry of entries || []) {
    const lessonId = entry?.lessonId;
    const code = gradeValueLabel(entry?.grade);
    if (!lessonId || !code) continue;
    (map[lessonId] = map[lessonId] || []).push(code);
  }
  return map;
}

/**
 * Строка модуля «Оценки» на карточке урока ученика.
 *
 * Названия оценок, а не качественное слово: «отлично» для «4+» — уже интерпретация, а
 * ученик хочет видеть, что именно ему поставили.
 */
export function lessonGradesSummary(codes) {
  if (!codes || codes.length === 0) return 'Оценок нет';
  return codes.length === 1 ? `Оценка ${codes[0]}` : `Оценки: ${codes.join(', ')}`;
}

/**
 * Особые итоги — не числа (ATTESTATION-001, GRADES-003): короткая подпись в клетку, полная —
 * в текст, пояснение — под итогом. Слова совпадают с вебом (`lib/attestationModel.ts`).
 */
export const FINAL_RESULT_LABELS = {
  TEMP_UNATTESTED: {
    short: 'ВНА',
    full: 'Временно не аттестован',
    hint: 'Итог отложен: обязательные работы ещё не сданы',
  },
  NOT_ATTESTED: {
    short: 'НА',
    full: 'Не аттестован',
    hint: 'Решение школы: за четверть итога нет',
  },
  PASS: { short: 'Зачёт', full: 'Зачёт', hint: null },
  FAIL: { short: 'Незачёт', full: 'Незачёт', hint: null },
  // Не прочерк: «—» здесь значит «итога нет», а «не изучался» — решение учителя.
  NOT_STUDIED: { short: 'Не изучался', full: 'Не изучался', hint: 'Предмет в этой четверти не изучался' },
};

export function isAttestationStatus(kind) {
  return kind === 'TEMP_UNATTESTED' || kind === 'NOT_ATTESTED';
}

/** Итог `{resultKind, value}` или `null` — коротко: «7», «ВНА», «Зачёт». */
export function finalShortLabel(result) {
  if (!result) return null;
  const kind = result.resultKind || 'NUMERIC';
  if (kind === 'NUMERIC') return result.value != null ? String(result.value) : null;
  return FINAL_RESULT_LABELS[kind]?.short ?? null;
}

/** Полностью: «7», «Временно не аттестован». */
export function finalFullLabel(result) {
  if (!result) return null;
  const kind = result.resultKind || 'NUMERIC';
  if (kind === 'NUMERIC') return result.value != null ? String(result.value) : null;
  return FINAL_RESULT_LABELS[kind]?.full ?? null;
}

/** Пояснение под итогом — только у особых результатов. */
export function finalHint(result) {
  const kind = result?.resultKind;
  return kind && kind !== 'NUMERIC' ? FINAL_RESULT_LABELS[kind]?.hint ?? null : null;
}

/**
 * Опубликованный итог за период в строке раздела «Оценки» (`/api/grades/my/subjects`,
 * поле `finalResult`) — или `null`, если показывать нечего. Сервер держит в списке и
 * предмет без оценок, когда по нему опубликован ВНА: иначе до статуса было не добраться.
 */
export function subjectRowFinal(subject) {
  const result = subject?.finalResult ?? null;
  return finalShortLabel(result) != null ? result : null;
}

/** Число из старого поля → тот же вид, что новое `*Result`. */
function numeric(value) {
  return value == null ? null : { resultKind: 'NUMERIC', value };
}

/**
 * Итоги предмета из «моих итоговых» (final-grades-contract §7, §12.6).
 *
 * В этой выборке нет черновиков вовсе, поэтому фильтровать статусы не нужно: всё, что
 * пришло, ученику показывать можно. Новые поля `periodResults`, `yearResult`… несут и
 * особые результаты (ВНА, НА, зачёт); старые `periodValues`, `yearValue`… — только числа и
 * берутся, лишь когда сервер ещё не знает новых полей.
 *
 * @returns {{periodResults: Record<string, {resultKind: string, value: number|null}>,
 *   yearResult: object|null, examResult: object|null, finalResult: object|null}}
 */
export function myFinalsForSubject(myFinals, subjectId) {
  const subject = (myFinals?.subjects || []).find((item) => item.subjectId === subjectId);
  const periodResults = {};
  if (subject?.periodResults) {
    Object.assign(periodResults, subject.periodResults);
  } else {
    for (const [periodId, value] of Object.entries(subject?.periodValues || {})) {
      periodResults[periodId] = numeric(value);
    }
  }
  return {
    periodResults,
    yearResult: subject?.yearResult ?? numeric(subject?.yearValue),
    // GRADES-003: экзаменационная и итоговая — тоже только опубликованные.
    examResult: subject?.examResult ?? numeric(subject?.examValue),
    finalResult: subject?.finalResult ?? numeric(subject?.finalValue),
  };
}

/** Итог за период по идентификатору — ключи приходят строками, а период бывает числом. */
export function periodResultOf(subjectFinals, periodId) {
  const results = subjectFinals?.periodResults || {};
  return results[String(periodId)] ?? results[periodId] ?? null;
}

/**
 * Клетка итога в журнале учителя: что показать и можно ли открыть выбор числа.
 *
 * Выбор открывается по признаку сервера `canEditResult`, кроме строк со статусом ВНА/НА и
 * изменением, ждущим подтверждения: всё это требует причины и повторного подтверждения, а
 * мобилка их не ведёт — это делается в веб-журнале. Иначе выбор числа отправил бы правку
 * без причины, и сервер ответил бы отказом.
 *
 * @returns {{label: string|null, full: string|null, editable: boolean, note: string|null}}
 */
export function teacherFinalCell(row) {
  const grade = row?.finalGrade ?? null;
  const pending = grade?.pendingChange ?? null;
  const decided = pending?.resultKind
    ? { resultKind: pending.resultKind, value: pending.value ?? null }
    : grade ? { resultKind: grade.resultKind || 'NUMERIC', value: grade.value ?? null } : null;
  const statusRow = isAttestationStatus(grade?.resultKind) || isAttestationStatus(decided?.resultKind);
  const webOnly = statusRow || pending != null;
  return {
    label: finalShortLabel(decided),
    full: finalFullLabel(decided),
    editable: Boolean(row?.canEditResult) && !webOnly,
    note: pending
      ? 'Изменено после публикации — подтверждение в веб-журнале'
      : statusRow && (row?.canEditResult || row?.canChangeAttestation)
        ? 'ВНА и НА меняются в веб-журнале'
        : null,
  };
}

/**
 * Подпись под названием предмета: «Айгерим Б. · 7 «А» класс · 1 четверть».
 *
 * У ученика ребёнка в ней нет — он и так знает, чей это дневник; у родителя ребёнок идёт
 * первым: он смотрит несколько дневников подряд, и «чей это предмет» — первый вопрос
 * (Figma `parent-grades-detail`). Пустые части выпадают, разделитель не удваивается.
 */
export function subjectSubtitle({ childLabel, className, periodName } = {}) {
  return [childLabel, className ? `${className} класс` : null, periodName]
    .filter(Boolean)
    .join(' · ');
}

/** `details.studentProfileIds` из отказа публикации — читается защитно. */
export function incompleteStudentIds(details) {
  const raw = details && typeof details === 'object' ? details.studentProfileIds : null;
  return Array.isArray(raw) ? raw.filter((id) => typeof id === 'number') : [];
}

/**
 * Как показать оценку (GRADES-003): «4+» по старой шкале, «7» у 10-балльной, «15/20» у СОР
 * и СОЧ. У оценки заполнено ровно одно из двух представлений — то же правило, что в вебе
 * (`gradeValueLabel` в `fiztex-web/src/lib/gradesModel.ts`).
 */
export function gradeValueLabel(grade) {
  if (!grade) return null;
  if (grade.scaleCode) return grade.scaleCode;
  if (grade.score == null) return null;
  const trim = (v) => String(v).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1').replace('.', ',');
  if (grade.maxScore == null || Number(grade.maxScore) === 10) return trim(grade.score);
  return `${trim(grade.score)}/${trim(grade.maxScore)}`;
}

/**
 * Тело значения для запроса — ровно одна форма. Сервер отклоняет `scaleCode` рядом с баллом
 * (`GRADE_VALUE_FORM_MISMATCH`), поэтому лишнее поле здесь не пропускается.
 */
export function gradeValueBody(grade) {
  if (grade?.scaleCode) return { scaleCode: grade.scaleCode };
  return { score: grade.score, maxScore: grade.maxScore ?? null };
}

/** Короткие имена компонентов процента — те же, что в вебе (`gradingModel.ts`). */
export const COMPONENT_SHORT = { FORMATIVE: 'ФО', SOR: 'СОР', SOCH: 'СОЧ' };

/** «84,2%» — запятая, целые без «,00». Проценты приходят с сервера, здесь только формат. */
export function formatPercent(value) {
  if (value === null || value === undefined) return '—';
  const fixed = Number(value).toFixed(2);
  return `${(fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed).replace('.', ',')}%`;
}

/**
 * Допустимые итоги: по политике оценивания — значения её порогов (`allowedValues` в ответе
 * экрана итогов), без политики — 2…5. Своей шкалы у приложения нет.
 */
export function finalValuesOf(classFinals) {
  const allowed = classFinals?.allowedValues;
  return Array.isArray(allowed) && allowed.length > 0 ? allowed : FINAL_VALUES;
}

/**
 * Почему у предмета нет процента — словами: «нет работ» и «нет СОЧ при обязательных
 * компонентах» — разные новости.
 */
export function resultStatusHint(result) {
  if (!result) return null;
  const missing = (result.missingComponents || []).map((code) => COMPONENT_SHORT[code]).join(', ');
  if (result.status === 'NO_WORKS') return 'Нет учитываемых работ — процент не считается';
  if (result.status === 'INCOMPLETE') return `Нет работ: ${missing} — процент без них не считается`;
  return missing ? `Нет работ: ${missing} — веса пересчитаны` : null;
}
