/*
 * Динамика оценок — только показ того, что посчитал сервер: средний, изменение, статус и
 * точки графика приходят готовыми (FRONTEND §7). Здесь формат чисел и подписи.
 */

export const PERIODS = [
  { value: 'WEEK', label: 'Неделя' },
  { value: 'MONTH', label: 'Месяц' },
  { value: 'QUARTER', label: 'Четверть' },
  { value: 'YEAR', label: 'Год' },
];

function decimal(value, sign = false) {
  const text = Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  if (!sign) return text;
  if (Number(value) > 0) return `+${text}`;
  return text.replace('-', '−');
}

/** «7,8» или «84,2%»; `null` — показателя нет (нуля вместо пустоты не бывает). */
export function formatIndicator(indicator) {
  if (indicator?.state !== 'AVAILABLE' || indicator.value == null) return null;
  return indicator.mode === 'POLICY_PERCENT' ? `${decimal(indicator.value)}%` : decimal(indicator.value);
}

export function formatValue(value, mode) {
  if (value == null) return '';
  return mode === 'POLICY_PERCENT' ? `${decimal(value)}%` : decimal(value);
}

export function formatChange(delta) {
  if (delta == null) return '';
  return Number(delta) === 0 ? '0,0' : decimal(delta, true);
}

/** Значок изменения: «+0,6», «−0,5», «0,0 Стабильно», «Нет данных для сравнения». */
export function changeBadge(metric) {
  switch (metric?.trend) {
    case 'GROWTH': return { text: formatChange(metric.change), tone: 'growth' };
    case 'DECLINE': return { text: formatChange(metric.change), tone: 'decline' };
    case 'STABLE': return { text: `${formatChange(metric.change ?? 0)} Стабильно`, tone: 'stable' };
    default: return { text: 'Нет данных для сравнения', tone: 'neutral' };
  }
}

/** Оценок нет ни сейчас, ни в прошлом периоде — предмет не оценивается. */
export function notGraded(metric) {
  return metric?.current?.state === 'NO_DATA' && (!metric.previous || metric.previous.state === 'NO_DATA');
}

function dayMonth(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_FULL = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];

function shortRange(window) {
  if (!window?.from || !window?.to) return '';
  const [, fm, fd] = window.from.split('-').map(Number);
  const [, tm, td] = window.to.split('-').map(Number);
  return fm === tm ? `${fd}–${td} ${MONTHS[tm - 1]}` : `${fd} ${MONTHS[fm - 1]} – ${td} ${MONTHS[tm - 1]}`;
}

/** «13–19 окт», «октябрь 2026», «1 четверть (01.09 – 27.10)», «2026–2027 учебный год». */
export function windowLabel(window) {
  if (!window) return '';
  switch (window.type) {
    case 'QUARTER': return `${window.academicPeriodName || 'Период'} (${dayMonth(window.from)} – ${dayMonth(window.to)})`;
    case 'YEAR': return `${window.academicYearName || ''} учебный год`.trim();
    case 'MONTH': {
      const [y, m] = (window.from || '').split('-').map(Number);
      return m ? `${MONTHS_FULL[m - 1]} ${y}` : '';
    }
    default: return shortRange(window);
  }
}

/** Подпись сравнения по фактическому прошлому окну, а не по примеру из макета. */
export function compareLabel(previous) {
  if (!previous) return 'прошлого периода нет';
  switch (previous.type) {
    case 'QUARTER': return `к ${previous.academicPeriodName || 'прошлому периоду'} ${previous.academicYearName || ''}`.trim();
    case 'YEAR': return `к ${previous.academicYearName || 'прошлому'} учебному году`;
    case 'MONTH': return `к прошлому месяцу (${windowLabel(previous)})`;
    default: return `к прошлой неделе (${shortRange(previous)})`;
  }
}

/** «Средний балл по дням / по неделям / по месяцам». */
export function seriesTitle(step) {
  return step === 'WEEK' ? 'Средний балл по неделям' : step === 'MONTH' ? 'Средний балл по месяцам' : 'Средний балл по дням';
}

/** СОР и СОЧ различаются по типу работы, а под политикой — и по её компоненту. */
export function pointKind(point) {
  if (point?.gradeType === 'SUMMATIVE_TERM' || point?.component === 'SOCH') return 'SOCH';
  if (point?.gradeType === 'SUMMATIVE_SECTION' || point?.component === 'SOR') return 'SOR';
  return 'REGULAR';
}

/** Оценка как есть: «4+», «7», «23/25» — баллы СОР/СОЧ не переводятся в шкалу. */
export function pointValue(point) {
  if (point?.scaleCode) return { main: point.scaleCode };
  if (point?.score == null) return { main: '—' };
  const score = String(Number(point.score));
  if (point.maxScore == null || Number(point.maxScore) === 10) return { main: score };
  return { main: score, max: String(Number(point.maxScore)) };
}

export { dayMonth };
