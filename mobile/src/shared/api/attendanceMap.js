/**
 * `AttendanceMarkingView` → то, что рисует интерфейс.
 *
 * Модель отметки на бэке трёхчастная — `status` + `mark` + `reason`
 * (`fiztex-back/docs/attendance-read-contract.md` §2), а чип в макете плоский.
 * Схлопывание живёт здесь одно на всё приложение: иначе «опоздал — это всё-таки
 * посещение» пришлось бы помнить в каждом экране.
 *
 * | status | mark | чип |
 * |---|---|---|
 * | `PRESENT` | — | `present` |
 * | `PRESENT` | `LATE` | `late` |
 * | `ABSENT` | — | `absent` |
 * | `ABSENT` | `EXCUSED` | `excused` |
 * | `NOT_MARKED` или ничего | | `null` — чипа нет |
 *
 * `excused` отдельным видом, а не красным «Пропустил», потому что бэк считает
 * освобождения отдельной колонкой и в пропуски их не кладёт (§8): свести их в один
 * чип значило бы разойтись с цифрами месячной сводки на соседнем экране.
 */
export function attendanceChip(marking) {
  const status = marking?.status;
  if (status === 'PRESENT') return marking.mark === 'LATE' ? 'late' : 'present';
  if (status === 'ABSENT') return marking.mark === 'EXCUSED' ? 'excused' : 'absent';
  return null;
}

const CHIP_LABELS = {
  present: 'Посетил',
  late: 'Опоздал',
  absent: 'Пропустил',
  excused: 'Освобождён',
};

const REASONS = {
  ILLNESS: 'болезнь',
  FAMILY: 'семейные обстоятельства',
  SCHOOL_EVENT: 'школьное мероприятие',
  COMPETITION: 'соревнования',
  TRANSPORT: 'транспорт',
  UNEXCUSED: 'без уважительной причины',
  OTHER: 'другое',
};

/**
 * Причина пропуска для листа учителя — с заглавной: в чипе она стоит отдельным
 * значением («Болезнь»), а не хвостом фразы «Пропустил · болезнь».
 *
 * «Не указана» — это `null`, а не пункт справочника (`attendance-read-contract.md` §2),
 * поэтому в списке она первая и не имеет значения-строки. Причина разрешена только у
 * отсутствия; освобождение — это `mark = EXCUSED`, а не причина.
 */
export const REASON_OPTIONS = [
  { value: null, label: 'Не указана', short: 'Не указана' },
  { value: 'ILLNESS', label: 'Болезнь', short: 'Болезнь' },
  { value: 'FAMILY', label: 'Семейные обстоятельства', short: 'Семейные' },
  { value: 'SCHOOL_EVENT', label: 'Школьное мероприятие', short: 'Мероприятие' },
  { value: 'COMPETITION', label: 'Соревнования', short: 'Соревнования' },
  { value: 'TRANSPORT', label: 'Транспорт', short: 'Транспорт' },
  { value: 'UNEXCUSED', label: 'Без уважительной причины', short: 'Без причины' },
  { value: 'OTHER', label: 'Другое', short: 'Другое' },
];

/**
 * Подпись причины в чипе строки — короткая.
 *
 * В строке ученика на причину остаётся треть ширины, и «Семейные обстоятельства»
 * туда не помещается ни при какой вёрстке: либо обрежется до «Семейные обстоя…»,
 * либо вытолкнет соседей. Короткая форма говорит то же самое и целиком, а полная
 * остаётся там, где место есть, — в списке выбора и в подписи отметки.
 */
export function reasonChipLabel(reason) {
  const option = REASON_OPTIONS.find((o) => o.value === (reason ?? null));
  return option?.short ?? 'Не указана';
}

/**
 * Статус ученика в листе учителя. Три значения, а не четыре: «опоздал» и «освобождён» —
 * это дополнительная отметка (`mark`) поверх присутствия и отсутствия, а не отдельные
 * статусы, и в макете они галочками под статусом.
 *
 * `tone` — семантика для `SelectPill`, а не цвет: перекрашивать чип экран не должен.
 */
export const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Присутствовал', tone: 'success' },
  { value: 'ABSENT', label: 'Отсутствовал', tone: 'danger' },
  { value: 'NOT_MARKED', label: 'Не отмечено', tone: 'muted' },
];

const STATUS_BY_VALUE = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o]));

/** Статус отметки → подпись и тон чипа. Пустая отметка читается как «не отмечено». */
export function statusChip(marking) {
  return STATUS_BY_VALUE[marking?.status || 'NOT_MARKED'] || STATUS_BY_VALUE.NOT_MARKED;
}

/**
 * Дополнительная отметка, доступная при данном статусе: `LATE` у присутствия,
 * `EXCUSED` у отсутствия (§2). Возвращает `null` там, где галочки нет вовсе, — так
 * строка не решает сама, что показать, и не разойдётся с CHECK-ами базы.
 */
export function markToggleFor(status) {
  if (status === 'PRESENT') return { value: 'LATE', label: 'Опоздал' };
  if (status === 'ABSENT') return { value: 'EXCUSED', label: 'Освобожден' };
  return null;
}

/**
 * Вторая строка карточки ученика в режиме просмотра: «Опоздал», «Освобожден · Болезнь»,
 * «Болезнь». Пусто — строки нет вовсе, а не пустое место.
 */
export function markingSummary(marking) {
  const parts = [];
  const toggle = markToggleFor(marking?.status);
  if (toggle && marking?.mark === toggle.value) parts.push(toggle.label);
  const reason = REASON_OPTIONS.find((o) => o.value && o.value === marking?.reason);
  if (reason) parts.push(reason.label);
  return parts.join(' · ');
}

/**
 * Смена статуса чистит то, что при новом статусе недопустимо (§2): у присутствия нет
 * причины, у «не отмечено» — ни отметки, ни причины. Правило живёт здесь, а не в
 * экране: иначе бэк отвечал бы 400 на комбинацию, которую собрал интерфейс.
 *
 * Комментарий переживает смену статуса: он про ученика, а не про статус.
 */
export function withStatus(marking, status) {
  const base = { ...(marking || {}), status };
  if (status === 'NOT_MARKED') return { ...base, mark: null, reason: null };
  if (status === 'PRESENT') {
    return { ...base, mark: marking?.mark === 'LATE' ? 'LATE' : null, reason: null };
  }
  return { ...base, mark: marking?.mark === 'EXCUSED' ? 'EXCUSED' : null };
}

/** Переключение галочки «опоздал» / «освобождён» — только та, что положена статусу. */
export function withMarkToggled(marking) {
  const toggle = markToggleFor(marking?.status);
  if (!toggle) return marking;
  return { ...marking, mark: marking?.mark === toggle.value ? null : toggle.value };
}

/** Отметка → тело `AttendanceEntryChange`. Пустой комментарий шлётся как `null`. */
export function toEntryChange(studentProfileId, marking) {
  const comment = (marking?.comment || '').trim();
  return {
    studentProfileId,
    status: marking?.status || 'NOT_MARKED',
    mark: marking?.mark || null,
    reason: marking?.reason || null,
    comment: comment || null,
  };
}

/** Две отметки различаются по значению — иначе строку незачем отправлять. */
export function sameMarking(a, b) {
  return (a?.status || 'NOT_MARKED') === (b?.status || 'NOT_MARKED')
    && (a?.mark || null) === (b?.mark || null)
    && (a?.reason || null) === (b?.reason || null)
    && ((a?.comment || '').trim() === (b?.comment || '').trim());
}

/**
 * Подпись отметки строкой — для плитки «Посещаемость» на карточке урока, где
 * места на чип нет, а причина пропуска как раз важна.
 *
 * Отменённый урок отвечает пустой отметкой (§26: витрина гасится), и «Не отмечено»
 * на нём читалось бы как «учитель ещё не заполнил» — то есть как ожидание того,
 * чего не будет. Поэтому отмена приходит отдельным флагом и называется прямо.
 *
 * @param {object|null} marking  `AttendanceMarkingView` или `null`
 * @param {{cancelled?: boolean}} [lesson]
 * @returns {string} «Пропустил · болезнь», «Опоздал», «Не отмечено», «Урок отменён»
 */
export function attendanceLabel(marking, { cancelled = false } = {}) {
  if (cancelled) return 'Урок отменён';
  const chip = attendanceChip(marking);
  if (!chip) return 'Не отмечено';
  const reason = REASONS[marking?.reason];
  return reason ? `${CHIP_LABELS[chip]} · ${reason}` : CHIP_LABELS[chip];
}

/**
 * Ответ `GET /api/attendance/my-marks` → `{ [lessonInstanceId]: chip }`.
 *
 * Карточка расписания знает свой `lessonInstanceId` и спрашивает по нему, поэтому
 * список сворачивается в индекс один раз на загрузку, а не перебирается на каждую
 * строку. Уроков без опубликованной отметки в ответе нет вовсе — отсутствие ключа
 * и есть «нет отметки».
 */
export function marksByLesson(marks) {
  const out = {};
  if (!Array.isArray(marks)) return out;
  for (const mark of marks) {
    const chip = attendanceChip(mark?.attendance);
    if (mark?.lessonId != null && chip) out[mark.lessonId] = chip;
  }
  return out;
}

/** «2 ученика», «5 учеников» — счётчик состава на плитке. */
function students(n) {
  const tail = n % 100 >= 11 && n % 100 <= 14 ? 5 : n % 10;
  if (tail === 1) return `${n} ученик`;
  if (tail >= 2 && tail <= 4) return `${n} ученика`;
  return `${n} учеников`;
}

/**
 * Состояние листа урока (`AttendanceSheetView.state`) человеческой строкой — для
 * плитки на карточке урока учителя и админа.
 *
 * `hasUnpublishedChanges` названо отдельно, а не свёрнуто в «Опубликована»:
 * ученик в этот момент видит прошлую версию, и умолчать об этом значило бы дать
 * учителю думать, что правка уже дошла.
 *
 * Отмена урока приходит вторым аргументом, а не читается из листа: у отменённого
 * урока, который никто не успел заполнить, листа просто нет, и состояние честно
 * приходит `NOT_FILLED`. Плитка при этом сказала бы «Не отмечена» — то есть звала
 * бы заполнить то, что заполнить нельзя (§26: отменённый урок не заполняется).
 * `ANNULLED` — это уже погашенный лист, то есть тот же случай с другой стороны.
 *
 * @param {object|null} sheet  ответ `GET /api/lessons/{id}/attendance`
 * @param {{cancelled?: boolean}} [lesson]
 */
export function sheetStateLabel(sheet, { cancelled = false } = {}) {
  if (cancelled || sheet?.state === 'ANNULLED') return 'Урок отменён';
  if (!sheet) return 'Не отмечена';
  const marked = sheet.markedCount ?? 0;
  const total = sheet.totalCount ?? 0;
  switch (sheet.state) {
    case 'PUBLISHED':
      return sheet.hasUnpublishedChanges
        ? 'Есть неопубликованные правки'
        : `Опубликована · ${students(total)}`;
    case 'DRAFT':
      return `Черновик · ${marked} из ${total}`;
    default:
      return total ? `Не отмечена · ${students(total)}` : 'Не отмечена';
  }
}

/**
 * Короткий бейдж состояния в шапке экрана посещаемости (Figma `badge` в `step-1-info`).
 *
 * Отличается от {@link sheetStateLabel} не только длиной: там строка объясняет плитку
 * на карточке урока, здесь — подпись над самим листом, который учитель и так видит.
 * Счётчики поэтому не дублируются, а «Недоступна» говорит прямо, что заполнять нечего.
 */
export function sheetBadge(sheet, { cancelled = false } = {}) {
  if (cancelled || sheet?.state === 'ANNULLED') return 'Недоступна';
  if (sheet?.state === 'PUBLISHED') {
    return sheet.hasUnpublishedChanges ? 'Есть правки' : 'Опубликовано';
  }
  if (sheet?.state === 'DRAFT') return 'Черновик';
  return 'Не заполнено';
}

const HISTORY_ACTIONS = {
  DRAFT_SAVED: 'Сохранён черновик',
  BULK_PRESENT: 'Отмечены все присутствующие',
  PUBLISHED: 'Опубликовано',
  REPUBLISHED: 'Опубликовано повторно',
  ANNULLED: 'Урок отменён',
  RESTORED: 'Урок восстановлен',
};

const HISTORY_ROLES = {
  SYSTEM: 'Система',
  ADMIN: 'Админ',
  MAIN_TEACHER: 'Учитель',
  SUBSTITUTE_TEACHER: 'Замена',
};

/**
 * Строка истории: «14 окт, 09:30 · Админ · Урок отменён».
 *
 * Роль, а не имя: строк на одно сохранение бывает столько, сколько изменённых учеников,
 * и колонка из повторяющегося ФИО читалась бы хуже, чем «кто именно это сделал» одним
 * словом. Имя автора остаётся в ответе — экран покажет его там, где оно нужно.
 *
 * @param {object} row  `AttendanceHistoryView`
 * @param {(iso: string) => string} formatStamp  форматтер момента из `lessonMap`
 */
export function historyLine(row, formatStamp) {
  const parts = [
    formatStamp(row?.createdAt),
    HISTORY_ROLES[row?.actorRole] || 'Система',
    HISTORY_ACTIONS[row?.action] || 'Изменение',
  ];
  // Правка по конкретному ученику — назвать его: без этого две соседние строки
  // «Сохранён черновик» выглядят как дубль, а не как две разные отметки.
  if (row?.studentName) parts.push(row.studentName);
  return parts.filter(Boolean).join(' · ');
}
