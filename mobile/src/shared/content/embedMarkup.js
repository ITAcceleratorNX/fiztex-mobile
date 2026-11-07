/**
 * Вставки в тексте учебного материала (CONTENT-EMBED-001,
 * `fiztex-back/docs/content-embeds-contract.md`).
 *
 * Вставка — строка текста целиком: `[[image:<uuid>]]` или `[[file:<uuid>]]`. Последовательность
 * «текст — рисунок — файл — текст» живёт в той же строке, что и раньше, как формулы `$…$`.
 *
 * Главное свойство: `serializeEmbedBlocks(embedBlocks(s)) === s` для любой строки — открыть
 * старый текст и сохранить без правок обязано вернуть ровно то же. Та же модель — в бэке
 * (`EmbedMarkup`) и в вебе (`lib/contentEmbeds.ts`); общий набор примеров —
 * `scripts/fixtures/content-embed-fixtures.json` (проверка — `scripts/verify-content-embeds.cjs`).
 */

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const LINE = new RegExp(`^[ \\t]*\\[\\[(image|file):(${UUID})\\]\\][ \\t]*\\r?$`);
const EXTENSION = /\.([^.]+)$/;

export function embedToken(kind, id) {
  return `[[${kind}:${id}]]`;
}

function parseLine(line) {
  if (!line.includes('[[')) return null;
  const match = LINE.exec(line);
  return match ? { type: 'embed', kind: match[1], id: match[2], line } : null;
}

export function embedBlocks(text) {
  const blocks = [];
  let pending = [];
  for (const line of (text ?? '').split('\n')) {
    const embed = parseLine(line);
    if (!embed) {
      pending.push(line);
      continue;
    }
    if (pending.length) {
      blocks.push({ type: 'text', text: pending.join('\n') });
      pending = [];
    }
    blocks.push(embed);
  }
  if (pending.length) blocks.push({ type: 'text', text: pending.join('\n') });
  return blocks;
}

export function serializeEmbedBlocks(blocks) {
  return blocks.map((block) => (block.type === 'text' ? block.text : block.line)).join('\n');
}

/** id в порядке появления, без повторов. */
export function embedIds(text) {
  const ids = [];
  for (const block of embedBlocks(text)) {
    if (block.type === 'embed' && !ids.includes(block.id)) ids.push(block.id);
  }
  return ids;
}

export function hasEmbeds(text) {
  return Boolean(text) && embedBlocks(text).some((block) => block.type === 'embed');
}

/** Текст без строк-вставок — для превью и сниппетов списков: сырой маркер там не нужен никому. */
export function stripEmbeds(text) {
  if (!text || !hasEmbeds(text)) return text ?? '';
  return text.split('\n').filter((line) => !parseLine(line)).join('\n');
}

// ---------------------------------------------------------------- операции редактора

function canonical(kind, id) {
  return { type: 'embed', kind, id, line: embedToken(kind, id) };
}

function compact(blocks) {
  return blocks.filter((block) => block.type !== 'text' || block.text !== '');
}

/** Вставить маркер в место курсора `{block, offset}` / `{slot}`; без курсора — в конец. */
export function insertEmbed(value, cursor, kind, id) {
  return insertEmbedAt(value, cursor, kind, id).value;
}

/**
 * То же, что `insertEmbed`, плюс номер блока, которым стала вставка: следующий рисунок,
 * вставленный подряд, должен встать после первого (`{slot: index + 1}`), а не в начало.
 */
export function insertEmbedAt(value, cursor, kind, id) {
  const blocks = embedBlocks(value);
  const embed = canonical(kind, id);
  if (value === '' || value == null) return { value: embed.line, index: 0 };
  if (!cursor) return { value: serializeEmbedBlocks([...blocks, embed]), index: blocks.length };
  if (cursor.slot != null) {
    const at = Math.max(0, Math.min(cursor.slot, blocks.length));
    return { value: serializeEmbedBlocks([...blocks.slice(0, at), embed, ...blocks.slice(at)]), index: at };
  }
  const target = blocks[cursor.block];
  if (!target || target.type !== 'text') {
    return { value: serializeEmbedBlocks([...blocks, embed]), index: blocks.length };
  }
  const offset = Math.max(0, Math.min(cursor.offset, target.text.length));
  let before = target.text.slice(0, offset);
  let after = target.text.slice(offset);
  if (before.endsWith('\n')) before = before.slice(0, -1);
  if (after.startsWith('\n')) after = after.slice(1);
  const replaced = [];
  if (before !== '') replaced.push({ type: 'text', text: before });
  replaced.push(embed);
  if (after !== '') replaced.push({ type: 'text', text: after });
  return {
    value: serializeEmbedBlocks([...blocks.slice(0, cursor.block), ...replaced, ...blocks.slice(cursor.block + 1)]),
    index: cursor.block + (before !== '' ? 1 : 0),
  };
}

/**
 * Строки редактора: текстовые блоки, вставки и пустые места для текста там, где его сейчас
 * нет (перед первой вставкой, между двумя вставками, после последней). Номер строки — ключ
 * поля ввода: место, в котором начали печатать, становится текстовым блоком в той же строке,
 * и клавиатура не теряет фокус на первой букве. Опустевший блок по той же причине остаётся
 * местом для текста в той же строке.
 */
export function editorRows(value) {
  const blocks = embedBlocks(value);
  if (blocks.length === 0) return [{ type: 'slot', slot: 0 }];
  const rows = [];
  blocks.forEach((block, index) => {
    if (block.type === 'embed') {
      if (index === 0 || blocks[index - 1].type === 'embed') rows.push({ type: 'slot', slot: index });
      rows.push({ type: 'embed', block: index, kind: block.kind, id: block.id });
    } else {
      rows.push({ type: 'text', block: index, text: block.text });
    }
  });
  if (blocks[blocks.length - 1].type === 'embed') rows.push({ type: 'slot', slot: blocks.length });
  return rows;
}

export function replaceEmbed(value, blockIndex, kind, id) {
  const blocks = embedBlocks(value);
  if (blocks[blockIndex]?.type !== 'embed') return value;
  blocks[blockIndex] = canonical(kind, id);
  return serializeEmbedBlocks(blocks);
}

export function removeEmbed(value, blockIndex) {
  const blocks = embedBlocks(value);
  if (blocks[blockIndex]?.type !== 'embed') return value;
  const before = blocks[blockIndex - 1];
  const after = blocks[blockIndex + 1];
  if (before?.type === 'text' && after?.type === 'text') {
    const merged = { type: 'text', text: `${before.text}\n${after.text}` };
    return serializeEmbedBlocks([...blocks.slice(0, blockIndex - 1), merged, ...blocks.slice(blockIndex + 2)]);
  }
  return serializeEmbedBlocks([...blocks.slice(0, blockIndex), ...blocks.slice(blockIndex + 1)]);
}

export function canMoveEmbed(value, blockIndex, direction) {
  const neighbour = embedBlocks(value)[blockIndex + direction];
  if (!neighbour) return false;
  return neighbour.type === 'embed' || neighbour.text.split('\n').some((line) => line.trim() !== '');
}

/** Сдвинуть вставку на один абзац (непустая строка текста) или мимо соседней вставки. */
export function moveEmbed(value, blockIndex, direction) {
  if (!canMoveEmbed(value, blockIndex, direction)) return value;
  const blocks = embedBlocks(value);
  const embed = blocks[blockIndex];
  const neighbourIndex = blockIndex + direction;
  const neighbour = blocks[neighbourIndex];

  if (neighbour.type === 'embed') {
    blocks[blockIndex] = neighbour;
    blocks[neighbourIndex] = embed;
    return serializeEmbedBlocks(blocks);
  }

  const lines = neighbour.text.split('\n');
  if (direction === -1) {
    let last = lines.length - 1;
    while (last > 0 && lines[last].trim() === '') last -= 1;
    const moved = lines.slice(last).join('\n');
    const remaining = lines.slice(0, last).join('\n');
    const next = blocks[blockIndex + 1];
    const after = next?.type === 'text'
      ? [{ type: 'text', text: `${moved}\n${next.text}` }]
      : [{ type: 'text', text: moved }, ...(next ? [next] : [])];
    return serializeEmbedBlocks(compact([
      ...blocks.slice(0, neighbourIndex),
      { type: 'text', text: remaining },
      embed,
      ...after,
      ...blocks.slice(blockIndex + 2),
    ]));
  }

  let first = 0;
  while (first < lines.length - 1 && lines[first].trim() === '') first += 1;
  const moved = lines.slice(0, first + 1).join('\n');
  const remaining = lines.slice(first + 1).join('\n');
  const previous = blocks[blockIndex - 1];
  const before = previous?.type === 'text'
    ? [{ type: 'text', text: `${previous.text}\n${moved}` }]
    : [...(previous ? [previous] : []), { type: 'text', text: moved }];
  return serializeEmbedBlocks(compact([
    ...blocks.slice(0, Math.max(0, blockIndex - 1)),
    ...before,
    embed,
    { type: 'text', text: remaining },
    ...blocks.slice(neighbourIndex + 1),
  ]));
}

export function updateTextBlock(value, blockIndex, text) {
  const blocks = embedBlocks(value);
  if (blocks[blockIndex]?.type !== 'text') return value;
  if (text === '' && blocks.length > 1) {
    return serializeEmbedBlocks([...blocks.slice(0, blockIndex), ...blocks.slice(blockIndex + 1)]);
  }
  blocks[blockIndex] = { type: 'text', text };
  return serializeEmbedBlocks(blocks);
}

export function fillSlot(value, slot, text) {
  if (text === '') return value;
  const blocks = embedBlocks(value);
  const at = Math.max(0, Math.min(slot, blocks.length));
  return serializeEmbedBlocks([...blocks.slice(0, at), { type: 'text', text }, ...blocks.slice(at)]);
}

/** Причина отказа до отправки — по политике сервера; `null` — можно грузить. */
export function embedFileProblem(file, kind, policy) {
  const rules = kind === 'image' ? policy?.image : policy?.file;
  if (!rules) return null;
  const name = file?.name || file?.fileName || '';
  const extension = EXTENSION.exec(name)?.[1]?.toLowerCase() ?? '';
  if (!(rules.extensions ?? []).includes(extension)) {
    return kind === 'image'
      ? 'Рисунок можно вставить в формате JPG, PNG или WebP.'
      : 'Поддерживаются PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, JPG, PNG и WebP.';
  }
  const size = file?.size ?? file?.fileSize;
  if (rules.maxBytes != null && size != null && size > rules.maxBytes) {
    return `Файл больше ${Math.round(rules.maxBytes / (1024 * 1024))} МБ — выберите файл поменьше.`;
  }
  return null;
}

export function mergeEmbeds(...lists) {
  const byId = new Map();
  for (const list of lists) for (const embed of list ?? []) if (embed?.id) byId.set(embed.id, embed);
  return [...byId.values()];
}

/**
 * Как открыть файл-вставку на этой платформе. Решает тип файла, а не роль:
 *
 * - картинка — просмотр внутри приложения (`image`);
 * - PDF — внутри приложения через pdf.js (`pdf`), в браузере (Expo Web) — новой вкладкой;
 * - Word, Excel, PowerPoint — системным приложением по ссылке на скачивание (`external`):
 *   сервер отдаёт их только вложением, и встроенный WebView получил бы загрузку вместо страницы.
 *
 * `external` уводит из приложения — в тесте с античитом об этом предупреждают заранее.
 * `baseUrl` для pdf.js — происхождение подписанной ссылки: файл запрашивается с того же
 * источника, без CORS.
 */
export function embedOpening(embed, platform) {
  const type = String(embed?.contentType ?? '').toLowerCase();
  const extension = String(embed?.extension ?? '').toLowerCase();
  if (type.startsWith('image/')) return { mode: 'image', url: embed.url };
  const pdf = type === 'application/pdf' || extension === 'pdf';
  if (pdf && platform !== 'web') return { mode: 'pdf', url: embed.url, baseUrl: urlOrigin(embed.url) };
  return { mode: 'external', url: pdf ? embed.url : embed.downloadUrl || embed.url };
}

/** Слово на кнопке карточки — как в вебе: что нельзя показать, то скачивают. */
export function embedOpenLabel(embed, platform) {
  const opening = embedOpening(embed, platform);
  return opening.mode === 'external' && opening.url === embed?.downloadUrl ? 'Скачать' : 'Открыть';
}

/** Подписанная ссылка уже не действует: экран должен перечитать материал. */
export function embedExpired(embed, now = Date.now()) {
  const at = embed?.expiresAt ? Date.parse(embed.expiresAt) : NaN;
  return Number.isFinite(at) && at <= now;
}

function urlOrigin(url) {
  const match = /^(https?:\/\/[^/?#]+)/i.exec(url ?? '');
  return match ? `${match[1]}/` : undefined;
}
