/**
 * Разметка формул в тексте вопроса — мобильная половина контракта
 * `fiztex-back/docs/formula-contract.md`.
 *
 * Формула размечена долларами: `$…$` — в строке, `$$…$$` — блоком, `\$` — литеральный доллар.
 * Тот же разбор есть на бэке (`MathMarkup.scan`) и в вебе (`lib/mathMarkup.ts`): общий модуль
 * на три рантайма в монорепо без кодогенерации не сделать, поэтому единственный источник
 * правды — документ контракта, а не один из трёх файлов.
 */

/** Команды, которые не отдаются рендереру ни при каких условиях (макросы и внешние ресурсы). */
const FORBIDDEN_COMMANDS = [
  'def', 'gdef', 'edef', 'xdef', 'let', 'futurelet', 'newcommand', 'renewcommand',
  'providecommand', 'csname', 'endcsname', 'expandafter', 'noexpand', 'input', 'include',
  'includegraphics', 'href', 'url', 'htmlClass', 'htmlId', 'htmlStyle', 'htmlData',
  'catcode', 'write', 'openout', 'read', 'special', 'usepackage', 'documentclass',
];

export const MAX_FORMULA_LENGTH = 4096;

export function hasForbiddenCommand(formula) {
  for (let i = 0; i < formula.length; i += 1) {
    if (formula[i] !== '\\') continue;
    const from = ++i;
    while (i < formula.length && /[a-zA-Z]/.test(formula[i])) i += 1;
    if (i > from) {
      if (FORBIDDEN_COMMANDS.includes(formula.slice(from, i))) return true;
      i -= 1;
    }
  }
  return false;
}

export function chemicalEndAt(text, start) {
  if (!(text.startsWith('\\ce', start) || text.startsWith('\\pu', start))) return -1;
  let open = start + 3;
  if (/[a-zA-Z]/.test(text[open] ?? '')) return -1;
  while (open < text.length && /\s/.test(text[open])) open += 1;
  if (text[open] !== '{') return -1;
  let depth = 1;
  for (let i = open + 1; i < text.length; i += 1) {
    if (text[i] === '\\') { i += 1; continue; }
    if (text[i] === '{') depth += 1;
    if (text[i] === '}' && --depth === 0) return i + 1;
  }
  return -1;
}

export function hasNestedChemicalMath(latex) {
  for (let i = 0; i < latex.length; i += 1) {
    if (latex[i] !== '\\') continue;
    const end = chemicalEndAt(latex, i);
    if (end < 0) { i += 1; continue; }
    for (let j = i; j < end; j += 1) {
      if (latex[j] === '\\') { j += 1; continue; }
      if (latex[j] === '$') return true;
    }
    i = end - 1;
  }
  return false;
}

/** Делит текст на куски: `{ kind: 'text' | 'math', value, display }`. */
export function splitMath(text) {
  const segments = [];
  let plain = '';
  let i = 0;

  const flush = () => {
    if (plain) {
      segments.push({ kind: 'text', value: plain });
      plain = '';
    }
  };

  while (i < text.length) {
    const char = text[i];
    if (char === '\\' && i + 1 < text.length) {
      plain += char + text[i + 1];
      i += 2;
      continue;
    }
    if (char !== '$') {
      plain += char;
      i += 1;
      continue;
    }

    const display = text[i + 1] === '$';
    const openLength = display ? 2 : 1;
    const closing = findClosing(text, i + openLength);
    if (closing < 0) {
      // Незакрытую формулу не «додумываем»: остаток остаётся текстом и виден целиком.
      plain += text.slice(i);
      flush();
      return segments;
    }

    flush();
    segments.push({ kind: 'math', value: text.slice(i + openLength, closing), display });
    i = closing + (display && text[closing + 1] === '$' ? 2 : 1);
  }

  flush();
  return segments;
}

function findClosing(text, from) {
  for (let j = from; j < text.length; j += 1) {
    if (text[j] === '\\') {
      const end = chemicalEndAt(text, j);
      if (end > j) { j = end - 1; continue; }
      j += 1;
      continue;
    }
    if (text[j] === '$') return j;
  }
  return -1;
}

export function hasMath(text) {
  if (!text || text.indexOf('$') < 0) return false;
  return splitMath(text).some((segment) => segment.kind === 'math');
}

/** Литеральный доллар: показывается знаком доллара, разделителем не является. */
export function unescapeText(value) {
  return value.replace(/\\\$/g, '$');
}
