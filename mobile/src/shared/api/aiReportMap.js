/**
 * Слова и раскладка сводки об учёбе у родителя (ТЗ «AI-отчётность — Frontend» §8, Figma М1–М9).
 *
 * Текст приходит одной строкой: сервер собирает краткую версию из трёх блоков с заголовками
 * «Достижения», «На что обратить внимание», «Рекомендации». Те же заголовки знает веб
 * (`fiztex-web/src/lib/aiReportModel.ts`). Текст без них — один абзац, а не ошибка: так выглядит
 * сводка, которую учитель написал своими словами.
 */

export const PARENT_BLOCKS = [
  { title: 'Достижения', icon: 'award' },
  { title: 'На что обратить внимание', icon: 'alertCircle' },
  { title: 'Рекомендации', icon: 'check' },
];

const TITLES = PARENT_BLOCKS.map((block) => block.title);

/** `[{ title, icon, paragraphs }]`; заголовок узнаётся только целой строкой. */
export function parentBlocks(text) {
  const blocks = [];
  let current = null;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const index = TITLES.indexOf(line);
    if (index >= 0) {
      current = { title: line, icon: PARENT_BLOCKS[index].icon, paragraphs: [] };
      blocks.push(current);
      continue;
    }
    if (!current) {
      current = { title: null, icon: null, paragraphs: [] };
      blocks.push(current);
    }
    current.paragraphs.push(line);
  }
  return blocks.filter((block) => block.paragraphs.length > 0);
}

/** Строка-превью для карточки на главной: первые предложения без заголовков. */
export function excerpt(text, max = 140) {
  const plain = parentBlocks(text).flatMap((block) => block.paragraphs).join(' ');
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > 60 ? cut.slice(0, space) : cut).replace(/[\s,.;:—-]+$/, '')}…`;
}

/** «Математика» или «Общая сводка» — у классного руководителя предмета нет. */
export function subjectTitle(item) {
  return item?.subject?.name || 'Общая сводка';
}

const SHORT = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });

function localDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** «2 четверть», «Ноябрь 2026» — как назвал сервер; номер без слова дополняется словом «четверть». */
export function periodName(period) {
  const label = String(period?.label || '').trim();
  if (/^\d+$/.test(label) && period?.kind === 'ACADEMIC_PERIOD') return `${label} четверть`;
  return label;
}

/** «03.11 – 27.12» — фактическое окно сводки. */
export function periodRange(period) {
  if (!period?.from || !period?.to) return '';
  return `${SHORT.format(localDate(period.from))} – ${SHORT.format(localDate(period.to))}`;
}

/** «Математика · 2 четверть». */
export function reportHeading(item) {
  return [subjectTitle(item), periodName(item?.period)].filter(Boolean).join(' · ');
}

const LONG = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const LONG_YEAR = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export function publishedShort(value) {
  return value ? `Опубликована ${LONG.format(new Date(value))}` : '';
}

/** «Опубликована 25 ноября 2026 · Марина Демо, классный руководитель». */
export function publishedLine(item) {
  if (!item) return '';
  const date = item.publishedAt ? LONG_YEAR.format(new Date(item.publishedAt)).replace(/\s*г\.$/u, '') : '';
  const role = item.authorRole === 'HOMEROOM' ? 'классный руководитель'
    : item.subject?.name ? `учитель предмета «${item.subject.name}»` : 'учитель';
  const author = item.authorName ? `${item.authorName}, ${role}` : '';
  return [date && `Опубликована ${date}`, author].filter(Boolean).join(' · ');
}

/** Новые сверху; при равной дате — больший id (опубликован позже). */
export function sortReports(items) {
  return [...(items || [])].sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))
    || (b.reportId || 0) - (a.reportId || 0));
}

/**
 * Метка «Новая» (М1, М5): опубликована и ещё не открывалась на этом устройстве. Сервер прочтение
 * не хранит (ТЗ §8 — «по поддерживаемому API»), поэтому ключ — пара «отчёт + дата публикации»:
 * повторная публикация после снятия снова новая.
 */
export const seenKey = (item) => `${item.reportId}:${item.publishedAt}`;
export const isNew = (item, seen) => Boolean(item) && !seen.has(seenKey(item));
