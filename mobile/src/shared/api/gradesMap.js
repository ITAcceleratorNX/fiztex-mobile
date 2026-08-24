/**
 * Правила показа оценок — одно место на все экраны учителя.
 *
 * Здесь нет ни одного решения о правах: что можно делать, приходит с бэка
 * (`canManageGrades`, `writeState`, `canEdit`, `canManage`). Тут только перевод этих
 * ответов на человеческий и раскладка данных журнала по экранам.
 */

/** Порядок и подписи типов — ТЗ GRADES-FE-001 §5.1, набор — справочник бэка. */
export const GRADE_TYPE_LABELS = {
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
  const filled = rows.filter((row) => row.finalGrade?.value != null).length;
  return {
    filled,
    total: rows.length,
    allFilled: rows.length > 0 && filled === rows.length,
    published: rows.length > 0 && rows.every((row) => row.finalGrade?.status === 'PUBLISHED'),
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
    const code = entry?.grade?.scaleCode;
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
 * Итог за период и годовая из «моих итоговых» (final-grades-contract §7).
 *
 * В этой выборке нет черновиков вовсе, поэтому фильтровать статусы не нужно: всё, что
 * пришло, ученику показывать можно.
 *
 * @returns {{periodValues: Record<string, number>, yearValue: number|null}}
 */
export function myFinalsForSubject(myFinals, subjectId) {
  const subject = (myFinals?.subjects || []).find((item) => item.subjectId === subjectId);
  return {
    periodValues: subject?.periodValues || {},
    yearValue: subject?.yearValue ?? null,
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
