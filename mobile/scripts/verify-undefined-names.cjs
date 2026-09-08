/**
 * Ищет идентификаторы, которые используются, но нигде не объявлены и не импортированы.
 *
 * Ровно тот класс ошибок, что Babel пропускает: он проверяет синтаксис, а не имена. Файл
 * с потерянным импортом компилируется молча и падает на экране — так `QuestionBody`
 * приехал в `shared` без `useTheme` и уронил экран теста.
 *
 * Запуск:
 *   node scripts/verify-undefined-names.cjs             — весь src/
 *   node scripts/verify-undefined-names.cjs файл.js …   — точечно
 */
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const GLOBALS = new Set([
  'console','setTimeout','clearTimeout','setInterval','clearInterval','require','module',
  'exports','process','global','globalThis','__DEV__','fetch','Promise','Object','Array',
  'String','Number','Boolean','Math','JSON','Date','Error','Map','Set','WeakMap','Symbol',
  'RegExp','parseInt','parseFloat','isNaN','encodeURIComponent','decodeURIComponent','URL',
  'URLSearchParams','FormData','AbortController','Blob','TextEncoder','undefined','NaN',
  'Infinity','arguments','FileReader','crypto','navigator','window','document','alert',
  'Intl','BigInt','Proxy','Reflect','queueMicrotask','structuredClone','performance',
  // Есть и в Hermes, и в браузере. `Buffer` сюда НЕ добавлять: в Hermes его нет, и
  // обращение к нему — настоящая находка, а не шум.
  'atob','btoa',
]);

function allSources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return allSources(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

const args = process.argv.slice(2);
const files = args.length ? args : allSources(path.resolve(__dirname, '..', 'src')).sort();
let bad = 0;

for (const rel of files) {
  const file = path.resolve(rel);
  let ast;
  try {
    ast = babel.parseSync(fs.readFileSync(file, 'utf8'), {
      filename: file, presets: ['babel-preset-expo'], babelrc: false, configFile: false,
      ast: true, code: false,
    });
  } catch (e) {
    console.log(`✗ ${rel}: не парсится — ${e.message.split('\n')[0]}`);
    bad++; continue;
  }

  const found = [];
  babel.traverse(ast, {
    ReferencedIdentifier(p) {
      const name = p.node.name;
      if (GLOBALS.has(name)) return;
      if (p.scope.hasBinding(name, true)) return;
      // JSX-имена с большой буквы и всё остальное — одинаково подозрительны
      found.push({ name, line: p.node.loc && p.node.loc.start.line });
    },
  });

  if (found.length) {
    bad++;
    const uniq = new Map();
    for (const f of found) if (!uniq.has(f.name)) uniq.set(f.name, f.line);
    console.log(`✗ ${rel}`);
    for (const [name, line] of uniq) console.log(`    ${name} — строка ${line}`);
  }
}

console.log(bad === 0 ? `\n✓ ${files.length} файлов, необъявленных имён нет`
                      : `\n✗ проблемы в ${bad} из ${files.length}`);
process.exit(bad === 0 ? 0 : 1);
