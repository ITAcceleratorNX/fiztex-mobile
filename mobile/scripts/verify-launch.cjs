#!/usr/bin/env node
/**
 * Запуск приложения (AUTH-FE-001, заметки дизайнера к M1): правила `features/launch/launchModel.js`
 * и геометрия шапки M1 `features/auth/signInHero.js`, в которую приходит анимация.
 *
 * Тест-раннера в проекте нет, поэтому здесь тот же приём, что и в остальных `verify-*.cjs`:
 * настоящий исходник компилируется проектным babel-пресетом. Числа сверены с видео дизайнера
 * («сама анимация для первого запуска», «Как должно выглядеть при первом запуске», 60 к/с) и с
 * кадром M1 `2460:1002`.
 *
 * Usage:
 *   node scripts/verify-launch.cjs
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const cache = new Map();

function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} };
  cache.set(filename, mod);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, presets: ['babel-preset-expo'], configFile: false, babelrc: false,
  });
  const req = (id) => {
    if (id.startsWith('@babel/runtime')) return require(id);
    let resolved;
    if (id.startsWith('@features/')) resolved = path.join(root, 'src/features', id.slice(10));
    else if (id.startsWith('@shared/')) resolved = path.join(root, 'src/shared', id.slice(8));
    else if (id.startsWith('.')) resolved = path.resolve(path.dirname(filename), id);
    else throw new Error(`Unexpected import ${id}`);
    return load(resolved.endsWith('.js') ? resolved : `${resolved}.js`);
  };
  new Function('require', 'module', 'exports', code)(req, mod, mod.exports);
  return mod.exports;
}

const m = load('src/features/launch/launchModel.js');
const { signInHero } = load('src/features/auth/signInHero.js');
const { LOGOTYPE_PATHS } = load('src/shared/components/logotypePaths.js');
const { AUTH, LAUNCH } = load('src/shared/theme/tokens.js');

const near = (actual, expected, tolerance, message) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected} ± ${tolerance}`);

/** Та же кривая, что `Easing.bezier`: доля пути по доле времени. */
function cubicBezier(x1, y1, x2, y2) {
  const at = (t, a, b) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t * t + t ** 3;
  return (x) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i += 1) {
      const mid = (lo + hi) / 2;
      if (at(mid, x1, x2) < x) lo = mid;
      else hi = mid;
    }
    return at((lo + hi) / 2, y1, y2);
  };
}

test('кривые движения — ближайшие к замерам видео', () => {
  // Доля пути по доле времени, снятая с видео «Как должно выглядеть при первом запуске».
  const measured = {
    sheet: [[2 / 22, 0.17], [4 / 22, 0.46], [6 / 22, 0.67], [8 / 22, 0.806], [10 / 22, 0.888], [14 / 22, 0.965]],
    move: [[2 / 18, 0.06], [4 / 18, 0.13], [6 / 18, 0.27], [8 / 18, 0.5], [10 / 18, 0.73], [12 / 18, 0.87]],
  };
  for (const [name, points] of Object.entries(measured)) {
    const curve = cubicBezier(...m.INTRO_EASING[name].bezier);
    for (const [x, y] of points) near(curve(x), y, 0.05, `${name} на ${x.toFixed(2)}`);
  }
});

test('анимация — только первый запуск без сессии и без «Уменьшения движения»', () => {
  const base = { introSeen: false, hasSession: false, reduceMotion: false };
  assert.equal(m.launchMode(base), m.LAUNCH_MODE.INTRO);
  assert.equal(m.launchMode({ ...base, introSeen: true }), m.LAUNCH_MODE.STATIC, 'повторный запуск');
  assert.equal(m.launchMode({ ...base, hasSession: true }), m.LAUNCH_MODE.STATIC, 'уже зашёл в аккаунт');
  assert.equal(m.launchMode({ ...base, reduceMotion: true }), m.LAUNCH_MODE.STATIC, '«Уменьшение движения»');
});

test('раскадровка идёт по порядку и укладывается в две секунды', () => {
  const { INTRO } = m;
  assert.equal(INTRO.ring[1], INTRO.bar[0], 'стойка растёт, когда кольцо замкнулось');
  assert.equal(INTRO.bar[1], INTRO.glyph[0], 'штрихи сменяются знаком, когда стойка дорисована');
  assert.ok(m.letterWindow(0)[0] >= INTRO.glyph[0], 'буквы — когда Φ уже дорисована');
  const [, lastLetterShown] = m.letterWindow(LOGOTYPE_PATHS.letters.length - 1);
  assert.ok(lastLetterShown <= INTRO.move[0], 'знак уезжает в шапку, когда проявились все буквы');
  assert.ok(INTRO.reveal[0] >= INTRO.move[1], 'занавес гаснет, когда знак уже в шапке — иначе знак двоился бы');
  // Лист к началу угасания на месте — по его же кривой из `INTRO_EASING`.
  const share = (INTRO.reveal[0] - INTRO.sheet[0]) / (INTRO.sheet[1] - INTRO.sheet[0]);
  const done = cubicBezier(...m.INTRO_EASING.sheet.bezier)(share);
  assert.ok(done > 0.98, `лист прошёл ${done.toFixed(3)} пути к началу угасания`);
  assert.equal(m.INTRO_DURATION, INTRO.reveal[1]);
  assert.ok(m.INTRO_DURATION <= 2000, `первый запуск длится ${m.INTRO_DURATION} мс`);
  for (const [name, range] of Object.entries(INTRO)) {
    if (!Array.isArray(range)) continue;
    assert.ok(range[0] >= 0 && range[0] < range[1] && range[1] <= m.INTRO_DURATION, name);
  }
});

test('буквы проявляются по одной в порядке чтения', () => {
  const starts = LOGOTYPE_PATHS.letters.map((_, i) => m.letterWindow(i)[0]);
  starts.forEach((start, i) => i && assert.equal(start - starts[i - 1], m.INTRO.letter.step));
  // Первая точка каждого контура — его левый край: буквы должны идти слева направо (I, Z, T, Σ, X).
  const lefts = LOGOTYPE_PATHS.letters.map((d) => Number(/^M([\d.]+)/.exec(d)[1]));
  assert.deepEqual([...lefts].sort((a, b) => a - b), lefts);
  assert.equal(LOGOTYPE_PATHS.phi.length, 4);
});

test('стрелка обегает кольцо от хвоста до левого наконечника знака', () => {
  const { points, length } = m.ringSamples();
  assert.ok(length > 70 && length < 90, `длина средней линии ${length}`);
  near(points[0].x, 4.87, 0.15, 'начало у хвоста, x');
  near(points[0].y, 17.37, 0.15, 'начало у хвоста, y');
  const end = points[points.length - 1];
  near(end.x, 4.78, 0.3, 'конец у основания левого наконечника, x');
  near(end.y, 21.84, 0.3, 'конец у основания левого наконечника, y');
  // Остриё приехавшего наконечника — там, где остриё у знака (4.58, 18.15).
  const a = (end.angle * Math.PI) / 180;
  near(end.x + m.PHI.arrow.length * Math.cos(a), 4.58, 1, 'остриё, x');
  near(end.y + m.PHI.arrow.length * Math.sin(a), 18.15, 1, 'остриё, y');
  points.forEach((p, i) => {
    if (!i) return;
    assert.ok(p.at > points[i - 1].at, 'доля длины растёт');
    assert.ok(Math.abs(p.angle - points[i - 1].angle) < 30, `наконечник не крутится скачком на шаге ${i}`);
  });
  assert.equal(points[0].at, 0);
  assert.equal(end.at, 1);
});

test('стойка растёт снизу вверх и кончается у верхнего наконечника знака', () => {
  const { points } = m.barSamples();
  assert.ok(points[0].y > points[1].y, 'снизу вверх');
  // Допуск — на обводку в единицу: у знака она выносит остриё ещё на ~0,7 вперёд.
  const a = (points[1].angle * Math.PI) / 180;
  near(points[1].x + m.PHI.arrow.length * Math.cos(a), 22.63, 0.75, 'остриё, x');
  near(points[1].y + m.PHI.arrow.length * Math.sin(a), 0.68, 0.75, 'остриё, y');
});

test('пока букв нет, Φ стоит по центру — потом по центру всё слово', () => {
  const center = ([a, b]) => (a + b) / 2;
  near(center(m.PHI.phiSpan) + m.PHI_SHIFT, center(m.PHI.wordSpan), 1e-9, 'сдвиг');
  // В видео Φ сначала стоит на 106 pt правее своего места в слове при знаке 279 pt.
  near((m.PHI_SHIFT * LAUNCH.logoHeight) / m.LOGO_VIEWBOX.height, 106, 3, 'сдвиг в точках');
});

test('шапка M1 — как в кадре 2460:1002, и анимация приходит в неё', () => {
  // В макете под статус-баром 47 pt лист начинается на 210 pt, знак 48 pt стоит центром на 128.
  const hero = signInHero(47);
  near(hero.sheetTop, 210, 1, 'верх листа');
  near(hero.logoCenterY, 128, 1, 'центр знака');
  assert.equal(hero.logoHeight, AUTH.logoHeight);
  near(hero.logoHeight, 48, 0.5, 'высота знака');
  assert.equal(hero.logoCenterY, (47 + hero.sheetTop) / 2, 'знак — посередине видимой синей части');
  assert.equal(hero.height, 47 + AUTH.heroHeight);
  // Без статус-бара (демо, iPad) геометрия просто сдвигается вверх.
  assert.equal(signInHero(0).sheetTop + 47, hero.sheetTop);
});

test('старое приветствие не вернётся: первым экраном без сессии открывается M1', () => {
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  for (const file of ['src/app/navigation/RootNavigator.js', 'src/app/navigation/withNav.js']) {
    assert.ok(!/['"]Welcome['"]/.test(read(file)), `${file} ссылается на маршрут Welcome`);
  }
  assert.ok(!/AuthWelcome/.test(read('src/features/auth/index.js')), 'AuthWelcome снова экспортируется');
  assert.match(read('src/app/navigation/RootNavigator.js'), /:\s*'SignIn';\s*\n/, 'запасной стартовый маршрут — SignIn');
});
