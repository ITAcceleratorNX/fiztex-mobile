/**
 * Учебники урока у ученика и родителя (LIBRARY-BE-001, `docs/textbook-library-contract.md` §6).
 *
 * Модуль чистый и без импортов: его исполняет `scripts/verify-lesson-textbooks.cjs` на
 * настоящем исходнике. Правил доступа здесь нет — что показать, решил сервер, отдав
 * `selected` и `available`; модель только выбирает, что делает строка «Учебник».
 */

function toNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapTextbook(raw) {
  return {
    bindingId: toNumber(raw?.bindingId),
    textbookId: toNumber(raw?.textbookId),
    title: (raw?.title || '').trim() || 'Учебник',
    format: raw?.format === 'DOCX' ? 'DOCX' : 'PDF',
    pageCount: toNumber(raw?.pageCount),
    pageNavigation: Boolean(raw?.pageNavigation),
    pageFrom: toNumber(raw?.pageFrom),
    pageTo: toNumber(raw?.pageTo),
    // `false` — назначение завершили после выбора: учебник урока остаётся и открывается.
    active: raw?.active !== false,
  };
}

export function mapLessonTextbooks(raw) {
  const available = Array.isArray(raw?.available)
    ? raw.available.map(mapTextbook).filter((item) => item.textbookId != null)
    : [];
  const selected = raw?.selected ? mapTextbook(raw.selected) : null;
  return {
    canSelect: Boolean(raw?.canSelect),
    selected: selected && selected.textbookId != null ? selected : null,
    available,
  };
}

/** «стр. 24», «стр. 24–26» или пусто — «с первой страницы». */
export function pagesLabel(pageFrom, pageTo) {
  if (pageFrom == null) return '';
  if (pageTo == null || pageTo === pageFrom) return `стр. ${pageFrom}`;
  return `стр. ${pageFrom}–${pageTo}`;
}

function plural(n, [one, few, many]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/**
 * Что показывает и делает строка «Учебник» (Figma 2149:5000, 2149:5119).
 *
 * * учитель выбрал — сразу его, со страницами;
 * * не выбрал, а назначен один — выбирать не из чего, открываем его;
 * * не выбрал, назначено несколько — ученик выбирает сам (§5), сначала шит;
 * * ничего нет — строки нет вовсе, как у материалов: «учебника нет» ребёнку ничего не сообщает.
 *
 * @returns {{ value: string, open: object|null, choose: object[] } | null}
 */
export function textbookEntry(data) {
  if (!data) return null;
  const { selected, available } = data;
  if (selected) {
    const pages = selected.pageNavigation ? pagesLabel(selected.pageFrom, selected.pageTo) : '';
    return { value: [selected.title, pages].filter(Boolean).join(' · '), open: selected, choose: [] };
  }
  if (available.length === 1) return { value: available[0].title, open: available[0], choose: [] };
  if (available.length > 1) {
    const count = available.length;
    return {
      value: `${count} ${plural(count, ['учебник', 'учебника', 'учебников'])} · выберите`,
      open: null,
      choose: available,
    };
  }
  return null;
}

/** PDF листается по страницам; DOCX страниц не имеет до рендера (контракт §5). */
export function opensByPages(textbook) {
  return textbook?.format === 'PDF';
}

/**
 * Страницы, заданные учителем к уроку: `{ from, to }` или `null`. Одна страница — `to === from`.
 * Только у учебника со страницами (`pageNavigation`): у DOCX их нет, и номера из выбора ничего
 * не значат.
 */
export function lessonRange(textbook) {
  if (!textbook?.pageNavigation || textbook.pageFrom == null || textbook.pageFrom < 1) return null;
  const from = textbook.pageFrom;
  const to = textbook.pageTo != null && textbook.pageTo >= from ? textbook.pageTo : from;
  return { from, to };
}

/**
 * С какой страницы открыть: сразу с начала диапазона учителя. Учебник на 400 страниц,
 * заданный со 300-й, не должен начинаться с обложки — pdf.js открывает нужную страницу
 * напрямую и за предыдущими в сеть не ходит.
 */
export function startPage(textbook) {
  return lessonRange(textbook)?.from ?? 1;
}

/** «Задано к уроку: стр. 300–310». */
export function rangeHint(range) {
  return `Задано к уроку: ${pagesLabel(range.from, range.to)}`;
}

export function isInRange(page, range) {
  return Boolean(range) && page >= range.from && page <= range.to;
}

/** Номер из поля «Перейти на страницу». */
export function parseJumpPage(input, pageCount) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return { error: 'Введите номер страницы' };
  if (!/^\d+$/.test(trimmed)) return { error: 'Номер страницы — целое число' };
  const page = Number(trimmed);
  if (page < 1) return { error: 'Страницы начинаются с первой' };
  if (pageCount != null && page > pageCount) {
    return { error: `В учебнике ${pageCount} ${plural(pageCount, ['страница', 'страницы', 'страниц'])}` };
  }
  return { page };
}

export function stepPage(page, delta, pageCount) {
  const next = page + delta;
  if (next < 1) return 1;
  if (pageCount != null && next > pageCount) return pageCount;
  return next;
}

/** «Стр. 24 из 142»; пока число страниц неизвестно — «Стр. 24». */
export function pageLabel(page, pageCount) {
  return pageCount != null ? `Стр. ${page} из ${pageCount}` : `Стр. ${page}`;
}
