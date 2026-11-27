import { excerpt, isNew as reportIsNew, publishedShort, reportHeading } from './aiReportMap';

/**
 * «От учителей» у родителя: сводки об учёбе, отзывы за месяц и комментарии к урокам — одной лентой.
 *
 * <p>Для родителя это одно и то же — что учителя говорят о ребёнке, — и три соседних блока на главной
 * читались как три разных раздела. Источники остаются своими (у каждого свой экран, своё «прочитано»
 * и свои правила), лента только складывает их по дате и называет. Ничего не считается заново:
 * покрытие месяца, непрочитанность комментария и публикацию сводки отдаёт сервер.
 *
 * Проверяется `node scripts/verify-teacher-feed.cjs`.
 */

export const FEED_KINDS = {
  // Тон — имя цвета темы: у него есть пара `<tone>Soft` для круга значка (как у плиток главной).
  report: { label: 'Сводка об учёбе', icon: 'fileText', tone: 'blue' },
  month: { label: 'Отзывы за месяц', icon: 'calendar', tone: 'markPresent' },
  comment: { label: 'Комментарий к уроку', icon: 'message', tone: 'green' },
};

export const FEED_FILTERS = [
  { value: 'all', label: 'Все' },
  { value: 'report', label: 'Сводки' },
  { value: 'month', label: 'За месяц' },
  { value: 'comment', label: 'Комментарии' },
];

const MONTHS_GENITIVE_LOWER = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];
const SHORT = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

/** «2026-10» → «октябрь 2026». */
export function monthWords(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || '');
  return match ? `${MONTHS_GENITIVE_LOWER[Number(match[2]) - 1]} ${match[1]}` : month || '';
}

/**
 * Место месяца в ленте. У списка месяцев даты публикации нет, а отзывы пишут в конце месяца —
 * поэтому месяц встаёт на свой последний день: октябрь выше сентябрьских комментариев и ниже
 * ноябрьских.
 */
export function monthAt(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || '');
  if (!match) return '';
  const last = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0));
  return `${last.toISOString().slice(0, 10)}T12:00:00Z`;
}

/**
 * «Новое» месяца: ключ — месяц и число опубликованных предметов, поэтому дописанные позже
 * предметы снова делают месяц новым.
 */
export const monthSeenKey = (row) => `month:${row.month}:${row.publishedCount ?? 0}`;

function subjectsWord(count) {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'предметов';
  if (mod10 === 1) return 'предмет';
  if (mod10 >= 2 && mod10 <= 4) return 'предмета';
  return 'предметов';
}

export function monthCoverage(row) {
  const published = row?.publishedCount ?? 0;
  const expected = row?.subjectCount ?? 0;
  if (expected > published) return `Отзывы по ${published} из ${expected} ${subjectsWord(expected)}`;
  const dative = published % 10 === 1 && published % 100 !== 11 ? 'предмету' : 'предметам';
  return `Отзывы по ${published} ${dative}`;
}

const lessonDay = (date) => (date ? SHORT.format(new Date(`${date}T12:00:00`)) : '');

/**
 * Лента: новые сверху. Месяцы — только с опубликованным и не из будущего; сводки и комментарии —
 * как пришли от сервера.
 *
 * @param {{reports?: object[], months?: object[], comments?: object[], seen: Set<string>, currentMonth: string}} input
 */
export function feedItems({ reports = [], months = [], comments = [], seen = new Set(), currentMonth }) {
  const items = [];
  for (const report of reports) {
    items.push({
      key: `report:${report.reportId}`,
      kind: 'report',
      at: report.publishedAt || '',
      title: reportHeading(report),
      text: excerpt(report.text, 140),
      meta: [publishedShort(report.publishedAt), report.authorName].filter(Boolean).join(' · '),
      isNew: reportIsNew(report, seen),
      target: { screen: 'ai-report', params: { reportId: report.reportId } },
    });
  }
  for (const row of months) {
    if (!row?.month || !(row.publishedCount > 0) || (currentMonth && row.month > currentMonth)) continue;
    items.push({
      key: `month:${row.month}`,
      kind: 'month',
      at: monthAt(row.month),
      title: `Отзывы за ${monthWords(row.month)}`,
      text: monthCoverage(row),
      meta: row.analysis?.status === 'DONE' ? 'Есть краткий AI-анализ' : '',
      isNew: !seen.has(monthSeenKey(row)),
      seenKey: monthSeenKey(row),
      target: { screen: 'monthly-feedback', params: { month: row.month } },
    });
  }
  for (const comment of comments) {
    items.push({
      key: `comment:${comment.id}`,
      kind: 'comment',
      at: comment.updatedAt || '',
      title: comment.subjectName || 'Комментарий',
      text: String(comment.text || '').replace(/\s+/g, ' ').trim(),
      meta: [lessonDay(comment.lessonDate) && `Урок ${lessonDay(comment.lessonDate)}`, comment.teacherName]
        .filter(Boolean).join(' · '),
      isNew: Boolean(comment.unread),
      target: { screen: 'teacher-comments', params: { commentId: comment.id } },
    });
  }
  return items.sort((a, b) => String(b.at).localeCompare(String(a.at)) || a.key.localeCompare(b.key));
}

export const filterFeed = (items, filter) => (filter && filter !== 'all' ? items.filter((item) => item.kind === filter) : items);

export const newCount = (items) => items.filter((item) => item.isNew).length;

/** Подпись карточки на главной: «2 новых» / «Новое» / пусто. */
export function newLabel(count) {
  if (count <= 0) return '';
  if (count === 1) return 'Новое';
  const mod100 = count % 100;
  const mod10 = count % 10;
  const word = mod100 >= 11 && mod100 <= 14 ? 'новых' : mod10 === 1 ? 'новое' : 'новых';
  return `${count} ${word}`;
}
