/**
 * Что показать ученику после сканирования (ТЗ ATTENDANCE-QR-FE-002 §4).
 *
 * Модуль намеренно **ни от чего не зависит** и принимает простые значения: так его
 * поведение проверяется без камеры, устройства и сети — а больше проверить сканер негде.
 *
 * Три правила, которые здесь важнее оформления:
 *
 * 1. **«Уже отмечен» — не ошибка.** Ученик сделал всё правильно, просто дважды. Красный
 *    экран за правильное действие — обман.
 * 2. **У каждого отказа есть следующий шаг.** Где помочь может только учитель, так и
 *    написано; где поможет повторное сканирование — оно и предложено.
 * 3. **Сетевая ошибка не требует пересканировать.** Токен уже на руках, и повтор шлёт
 *    его же: заставлять ловить камерой код повторно из-за моргнувшего Wi-Fi незачем.
 */

/** Что делает кнопка результата. */
export const SCAN_ACTION = {
  /** Закрыть шит и вернуться к камере. */
  DISMISS: 'dismiss',
  /** Сканировать заново — код сменился или оказался чужим. */
  RESCAN: 'rescan',
  /** Отправить тот же токен ещё раз — не дошёл запрос, а не код. */
  RESEND: 'resend',
};

const TONE = { SUCCESS: 'success', NEUTRAL: 'neutral', WARNING: 'warning', ERROR: 'error' };

/** Успешные исходы. Первый — отметка, два других — «всё уже в порядке». */
const OUTCOMES = {
  MARKED_PRESENT: {
    tone: TONE.SUCCESS,
    title: 'Вы отмечены',
    subtitle: 'Отметка «Присутствовал» отправлена учителю',
    action: { kind: SCAN_ACTION.DISMISS, label: 'Готово' },
  },
  ALREADY_MARKED: {
    tone: TONE.NEUTRAL,
    title: 'Вы уже отмечены',
    subtitle: 'Отмечаться второй раз не нужно',
    action: { kind: SCAN_ACTION.DISMISS, label: 'Готово' },
  },
  TEACHER_MARK_KEPT: {
    tone: TONE.NEUTRAL,
    title: 'Учитель уже поставил отметку',
    subtitle: 'Если она неверна, скажите об этом учителю',
    action: { kind: SCAN_ACTION.DISMISS, label: 'Готово' },
  },
};

/** Отказы бэкенда (attendance-qr-contract §5). */
const ERRORS = {
  ATTENDANCE_QR_SUPERSEDED: {
    tone: TONE.WARNING,
    title: 'Код обновился',
    subtitle: 'Учитель показал новый — отсканируйте его',
    action: { kind: SCAN_ACTION.RESCAN, label: 'Сканировать снова' },
  },
  ATTENDANCE_QR_CLOSED: {
    tone: TONE.WARNING,
    title: 'Учитель закрыл отметку',
    subtitle: 'Отметиться теперь можно только через учителя',
    action: { kind: SCAN_ACTION.DISMISS, label: 'Понятно' },
  },
  ATTENDANCE_QR_EXPIRED: {
    tone: TONE.WARNING,
    title: 'Урок закончился',
    subtitle: 'Код больше не действует',
    action: { kind: SCAN_ACTION.DISMISS, label: 'Понятно' },
  },
  ATTENDANCE_QR_NOT_PARTICIPANT: {
    tone: TONE.ERROR,
    title: 'Вы не в составе этого урока',
    subtitle: 'Проверьте, тот ли это класс или подгруппа',
    action: { kind: SCAN_ACTION.DISMISS, label: 'Понятно' },
  },
  ATTENDANCE_QR_STUDENT_ONLY: {
    tone: TONE.ERROR,
    title: 'Отметиться может только ученик',
    subtitle: 'Войдите под своим аккаунтом',
    action: { kind: SCAN_ACTION.DISMISS, label: 'Понятно' },
  },
  ATTENDANCE_QR_INVALID: {
    tone: TONE.ERROR,
    title: 'Это не код посещаемости',
    subtitle: 'Отсканируйте код с экрана учителя',
    action: { kind: SCAN_ACTION.RESCAN, label: 'Сканировать снова' },
  },
};

/**
 * Успешный ответ бэкенда → состояние экрана.
 *
 * @param {{outcome?: string, subjectName?: string, startTime?: string, endTime?: string}} result
 */
export function scanSuccessState(result) {
  const base = OUTCOMES[result?.outcome] || OUTCOMES.ALREADY_MARKED;
  const lesson = lessonLine(result);
  // Урок дописывается только к настоящей отметке: в остальных случаях говорить нужно о
  // том, что делать дальше, а не о том, на каком уроке ничего не изменилось.
  return base.tone === TONE.SUCCESS && lesson ? { ...base, subtitle: lesson } : base;
}

/**
 * Отказ → состояние экрана.
 *
 * @param {{status?: number, code?: string, message?: string}} error
 */
export function scanErrorState(error) {
  const known = ERRORS[error?.code];
  if (known) return known;

  // Сети нет: клиент отдаёт такую ошибку без статуса. Код действует по-прежнему, значит
  // и пересканировать нечего — предлагаем отправить тот же токен.
  if (!error?.status) {
    return {
      tone: TONE.ERROR,
      title: 'Нет связи',
      subtitle: 'Код ещё действует — попробуйте отправить ещё раз',
      action: { kind: SCAN_ACTION.RESEND, label: 'Повторить' },
    };
  }

  return {
    tone: TONE.ERROR,
    title: 'Не удалось отметиться',
    subtitle: error.message || 'Попробуйте отсканировать код ещё раз',
    action: { kind: SCAN_ACTION.RESCAN, label: 'Сканировать снова' },
  };
}

/** «Математика · 08:00–08:45» — ученик пришёл с камеры и об уроке ничего не знал. */
function lessonLine(result) {
  const time = [result?.startTime, result?.endTime].filter(Boolean).map(hhmm);
  const parts = [result?.subjectName, time.length === 2 ? `${time[0]}–${time[1]}` : null];
  return parts.filter(Boolean).join(' · ') || null;
}

function hhmm(value) {
  return String(value).slice(0, 5);
}
