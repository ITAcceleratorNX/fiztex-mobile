/**
 * Слова и правила работ СОР/СОЧ (ТЗ Frontend «СОР/СОЧ в расписании и журнале», Mobile).
 *
 * Те же формулировки, что в вебе (`fiztex-web/src/lib/assessmentWorkModel.ts`): учитель назначает на
 * телефоне, а баллы вносит в журнале на компьютере, и называться одно и то же в двух местах по-разному
 * не должно. Ничего здесь не решается по существу — лимиты, статусы и права приходят с бэкенда
 * (`fiztex-back/docs/assessment-work-contract.md`); модуль только называет состояния и объясняет отказ.
 */

export const KIND_LABELS = { SOR: 'СОР', SOCH: 'СОЧ' };

export const REMINDER_OPTIONS = [
  { value: 1, label: 'За 1 день' },
  { value: 3, label: 'За 3 дня' },
  { value: 0, label: 'Не напоминать' },
];

/** «СОР 2» / «СОЧ». Номер СОР пересчитывается сервером, поэтому на него не ссылаются. */
export function workTitle(work) {
  if (!work) return '';
  if (work.kind === 'SOCH') return 'СОЧ';
  return work.number != null ? `СОР ${work.number}` : 'СОР';
}

export function reminderLabel(days) {
  if (days == null) return '—';
  const known = REMINDER_OPTIONS.find((option) => option.value === days);
  return known ? known.label : `За ${days} дн.`;
}

/**
 * Статус словами: «Запланирована», «Проведена», «Баллы выставлены», «Отменена». От даты урока он не
 * зависит — работа «проведена» только по явному действию учителя.
 */
export function workStateLabel(work) {
  if (work?.status === 'CANCELLED') return 'Отменена';
  if (work?.hasResults) return 'Баллы выставлены';
  if (work?.status === 'CONDUCTED') return 'Проведена';
  return 'Запланирована';
}

/** Ученику и родителю — мужской род в чипе «Проведён», как в макете S3–S4. */
export function learnerStateLabel(work) {
  if (work?.status === 'CANCELLED') return 'Отменён';
  return work?.status === 'CONDUCTED' ? 'Проведён' : 'Запланирован';
}

/** Максимум, перенос и отмена закрываются первым баллом (контракт §2). */
export function isLockedByResults(work) {
  return work?.hasResults === true;
}

/**
 * Перенос — только запланированной работы и только без баллов (контракт §2): проведённую работу на
 * другую дату не переносят. Сервер отвечает 409 `ASSESSMENT_NOT_PLANNED`.
 */
export function canReschedule(work) {
  return work?.status === 'PLANNED' && work?.hasResults !== true;
}

/** Отмена — из любого статуса, кроме отменённой, и только без баллов. */
export function canCancel(work) {
  return work?.status !== 'CANCELLED' && work?.hasResults !== true;
}

export const CONDUCTED_MOVE_HINT = 'Проведённую работу на другую дату не переносят — её можно только отменить';
export const LOCKED_HINT = 'Перенести или отменить работу после выставления баллов нельзя';
export const MAX_LOCKED_HINT = 'Максимум нельзя менять после выставления первого балла';
export const SCORES_ON_DESKTOP_HINT = 'Баллы вносятся в журнале на компьютере';

/** Что мешает назначить работу этого вида; `null` — можно. Окончательно решает сервер. */
export function kindUnavailableReason(kind, limits) {
  if (!limits) return null;
  if (kind === 'SOR') {
    if (limits.sorAllowed === false) return 'СОР не предусмотрен в политике оценивания этой четверти';
    if ((limits.sorUsed ?? 0) >= (limits.sorLimit ?? 0)) {
      return `Лимит СОР исчерпан: в четверти ${limits.sorLimit}, назначено ${limits.sorUsed}`;
    }
    return null;
  }
  if (limits.sochAllowed === false) return 'СОЧ не предусмотрен в политике оценивания этой четверти';
  if ((limits.sochUsed ?? 0) >= 1) return 'В этой четверти уже назначен СОЧ — он один на предмет';
  return null;
}

/** «Будет СОР 2: в четверти 3 СОР, назначено 1» — подсказка под выбором вида. */
export function nextWorkHint(kind, limits) {
  if (!limits || kind !== 'SOR' || kindUnavailableReason(kind, limits)) return null;
  const used = limits.sorUsed ?? 0;
  return `Будет СОР ${used + 1}: в четверти ${limits.sorLimit} СОР, назначено ${used}`;
}

/** Максимум — целое 1…1000, как проверяет сервер; `null` — подходит. */
export function maxScoreProblem(text) {
  const value = String(text ?? '').trim();
  if (value === '') return 'Введите максимальный балл';
  if (!/^\d+$/.test(value)) return 'Максимальный балл — целое число больше 0';
  const number = Number(value);
  if (number < 1) return 'Максимальный балл должен быть больше 0';
  if (number > 1000) return 'Максимальный балл — не больше 1000';
  return null;
}

/** Работа, по которой ещё что-то можно делать (не отменена). */
export function activeWorks(works) {
  return (works ?? []).filter((work) => work.status !== 'CANCELLED');
}

/**
 * Работа из карточки урока (`AssessmentWorkView`) в форму экрана. `myResult` приходит только
 * ученику и родителю и только у проведённой работы — раньше проведения балл не раскрывается.
 */
export function mapAssessmentWork(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    kind: raw.kind,
    number: raw.number ?? null,
    status: raw.status,
    maxScore: raw.maxScore ?? null,
    reminderDaysBefore: raw.reminderDaysBefore ?? 1,
    needsReschedule: raw.needsReschedule === true,
    hasResults: raw.hasResults === true,
    resultsCount: raw.resultsCount ?? null,
    version: raw.version ?? null,
    lessonId: raw.lessonId ?? null,
    myResult: raw.myResult
      ? { score: raw.myResult.score ?? null, maxScore: raw.myResult.maxScore ?? raw.maxScore ?? null }
      : null,
  };
}

export function mapAssessmentWorks(list) {
  return Array.isArray(list) ? list.map(mapAssessmentWork).filter(Boolean) : [];
}

/**
 * Работа из строки расписания (`RoleScheduleAssessmentWorkView`): без максимума и баллов — только
 * то, что нужно плашке «СОР 1» в клетке урока.
 */
export function mapScheduleWorks(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((work) => work && work.workId != null)
    .map((work) => ({
      workId: work.workId,
      kind: work.kind,
      number: work.number ?? null,
      status: work.status,
      title: work.title || workTitle(work),
      needsReschedule: work.needsReschedule === true,
    }));
}

/** «17 / 20»; ноль — результат, отсутствие — прочерк. */
export function resultLabel(result) {
  if (!result || result.score == null) return null;
  return result.maxScore != null ? `${result.score} / ${result.maxScore}` : String(result.score);
}

/**
 * Строки блока ученика и родителя (S2–S4): статус-чип и подпись. До проведения балла нет — «баллов
 * ещё нет»; после — собственный результат. Чужие результаты и предварительные итоги сюда не приходят.
 */
export function learnerWorkView(work) {
  const score = resultLabel(work?.myResult);
  const conducted = work?.status === 'CONDUCTED';
  return {
    title: workTitle(work),
    chip: learnerStateLabel(work),
    chipTone: conducted ? 'green' : work?.status === 'CANCELLED' ? 'red' : 'blue',
    score,
    scoreParts: work?.myResult && work.myResult.score != null
      ? { score: work.myResult.score, maxScore: work.myResult.maxScore }
      : null,
    caption: score
      ? null
      : conducted
        ? 'Баллов ещё нет'
        : work?.maxScore != null
          ? `Максимальный балл: ${work.maxScore}`
          : null,
  };
}
