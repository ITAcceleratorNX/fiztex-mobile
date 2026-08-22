#!/usr/bin/env node
/**
 * Проверки восстановления сессии при старте приложения.
 *
 * Тест-раннера в проекте нет, поэтому здесь тот же приём, что и в остальных `verify-*.cjs`:
 * настоящий исходник компилируется проектным babel-пресетом и выполняется с заглушками
 * вместо React и нативных модулей.
 *
 * Usage:
 *   node scripts/verify-auth-session.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function load(relPath) {
  const file = path.join(ROOT, relPath);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    presets: ['babel-preset-expo'],
    babelrc: false,
    configFile: false,
  });
  const noop = new Proxy({}, { get: () => () => null });
  const fakeRequire = (id) => {
    if (id === 'react') {
      return {
        createContext: () => ({ Provider: null }),
        useContext: () => null,
        useState: () => [null, () => {}],
        useCallback: (f) => f,
        useEffect: () => {},
        useMemo: (f) => f(),
        createElement: () => null,
        default: {},
      };
    }
    if (id.startsWith('@babel/runtime')) return require(id);
    return noop;
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(fakeRequire, mod, mod.exports);
  return mod.exports;
}

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const { isTokenExpired } = load('src/features/auth/AuthContext.js');

/** JWT без подписи: проверяется только чтение `exp`, подпись здесь никого не интересует. */
function tokenWithExp(secondsFromNow) {
  const payload = Buffer.from(JSON.stringify({ sub: '1', exp: Math.floor(Date.now() / 1000) + secondsFromNow }))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.signature`;
}

console.log('\n=== Восстановление сессии ===');

check('вчерашний токен на старте отбрасывается', isTokenExpired(tokenWithExp(-60)) === true,
  'иначе приложение открывается внутри и тут же ловит 401');
check('действующий токен остаётся', isTokenExpired(tokenWithExp(3600)) === false);
check('токен без exp считаем годным — решает бэкенд',
  isTokenExpired('header.' + Buffer.from(JSON.stringify({ sub: '1' })).toString('base64') + '.sig') === false);
check('мусор вместо токена не роняет старт', isTokenExpired('не-токен') === false);
check('пустое значение не роняет старт', isTokenExpired(null) === false && isTokenExpired('') === false);

console.log(`\n${failed === 0 ? 'OK' : 'ПРОВАЛЫ'}: ${passed} проверок пройдено, ${failed} провалено`);
process.exit(failed === 0 ? 0 : 1);
