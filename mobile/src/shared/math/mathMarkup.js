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

const FORBIDDEN_PATTERN = new RegExp(`\\\\(${FORBIDDEN_COMMANDS.join('|')})(?![a-zA-Z])`);

export function hasForbiddenCommand(formula) {
  return FORBIDDEN_PATTERN.test(formula);
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
