/**
 * Запуск приложения — по заметкам дизайнера к входу (`Admin_Admissions`, рядом с M1):
 *
 * - первый запуск — анимация из видео «сама анимация для первого запуска» и «Как должно
 *   выглядеть при первом запуске»: стрелка обегает кольцо Φ, из низа вырастает её стойка,
 *   по одной проявляются остальные буквы, потом снизу выезжает лист входа, а знак уезжает в
 *   шапку M1;
 * - вошедший человек и повторные запуски — «без анимации, чтобы быстро открывался»: кадр
 *   «Повторный запуск» (2468:22), знак по центру синего экрана.
 *
 * Здесь только числа и правила — без React, чтобы их проверял `scripts/verify-launch.cjs`.
 */

export const LAUNCH_MODE = { INTRO: 'intro', STATIC: 'static' };

/**
 * Анимация — только при самом первом запуске и только тому, кого ждёт вход: с открытой сессией
 * человек «уже зашёл в свой аккаунт», а при «Уменьшении движения» анимацию не показывают вовсе.
 */
export function launchMode({ introSeen, hasSession, reduceMotion }) {
  if (introSeen || hasSession || reduceMotion) return LAUNCH_MODE.STATIC;
  return LAUNCH_MODE.INTRO;
}

// Видео дизайнера снято в 60 кадров в секунду; тайминги ниже — номера его кадров.
const at = (frame) => Math.round((frame * 1000) / 60);

/**
 * Раскадровка первого запуска в миллисекундах. Отрезки сняты с видео покадрово: где начинается
 * и кончается движение и как быстро оно идёт (кривые — ближайшие к замерам).
 */
export const INTRO = {
  ring: [at(2), at(25)], // стрелка обегает кольцо Φ, к концу замедляясь
  bar: [at(25), at(45)], // стойка Φ растёт снизу вверх со стрелкой на конце
  glyph: [at(45), at(49)], // штрихи сменяются точным начертанием знака
  shift: [at(46), at(66)], // Φ сдвигается влево, освобождая место буквам
  letter: { start: at(47), step: at(3), fade: at(6) }, // I, Z, T, Σ, X — по одной
  move: [at(78), at(96)], // знак уменьшается и уезжает в шапку M1
  sheet: [at(78), at(100)], // лист входа выезжает снизу
  reveal: [at(96), at(105)], // занавес гаснет — под ним настоящий M1
};

export const INTRO_DURATION = INTRO.reveal[1];

/** Кривые, ближайшие к замерам видео (`Easing.bezier` / степень `Easing.poly`). */
export const INTRO_EASING = {
  ring: { out: 2 },
  bar: { out: 2 },
  shift: { bezier: [0.55, 0, 0.4, 1] },
  move: { bezier: [0.4, 0, 0.45, 1] },
  // Лист трогается мягче, чем `out(poly(4))`: с ней он на середине пути догонял знак.
  sheet: { bezier: [0.3, 0.5, 0.1, 1] },
};

/** Повторный запуск: кадр держится, пока приложение не готово, но не меньше `hold`, и гаснет. */
export const STATIC = { hold: 300, fade: 200 };

/** Окно проявления k-й буквы после Φ (I, Z, T, Σ, X) — каждая на 50 мс позже предыдущей. */
export function letterWindow(index) {
  const start = INTRO.letter.start + index * INTRO.letter.step;
  return [start, start + INTRO.letter.fade];
}

// ─── Геометрия знака ──────────────────────────────────────────────────────────────────
// Всё — в единицах `viewBox` логотипа `PhysTechLogotype` (147 × 38).

export const LOGO_VIEWBOX = { width: 147, height: 38 };

/**
 * Средняя линия кольца Φ — эллипс, подогнанный по внешнему и внутреннему контурам знака
 * (расхождение с контуром — меньше 0,2 единицы). Стрелка идёт по часовой от хвоста (193°,
 * чуть выше левого края) почти полный круг — до основания левого наконечника (170° + 360°).
 *
 * Толщина штрихов и наконечников — с обводкой в единицу, которой логотип рисует каждый контур
 * поверх заливки: без неё штрих был бы тоньше знака, и смена штриха на знак была бы заметна.
 */
export const PHI = {
  ring: { cx: 18.45, cy: 19.85, rx: 13.86, ry: 11.04, from: 192.9, to: 529.7, width: 5.4 },
  bar: { from: [14.38, 37.36], to: [21.76, 4.37], width: 5.35 },
  arrow: { half: 4.3, length: 4.3 },
  // Видимая ширина знака и всего логотипа: в начале Φ стоит по центру экрана одна, а к концу
  // по центру — всё слово.
  phiSpan: [1.09, 34.76],
  wordSpan: [1.09, 145.09],
};

const center = ([from, to]) => (from + to) / 2;

/** На сколько единиц сдвинута Φ вправо, пока стоит по центру одна (до появления букв). */
export const PHI_SHIFT = center(PHI.wordSpan) - center(PHI.phiSpan);

const rad = (deg) => (deg * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

/**
 * Точки средней линии кольца с долей длины от начала (`at`) и направлением движения (`angle`,
 * в градусах): по ним рисуется штрих и ведётся наконечник — оба по длине дуги, иначе стрелка
 * обгоняла бы штрих на вытянутых участках эллипса.
 */
export function ringSamples(count = 96) {
  const { cx, cy, rx, ry, from, to } = PHI.ring;
  const points = [];
  let previous = null;
  for (let i = 0; i <= count; i += 1) {
    const t = rad(from + ((to - from) * i) / count);
    // Производная по углу: куда идёт стрелка при движении по часовой (ось y — вниз).
    let angle = toDeg(Math.atan2(ry * Math.cos(t), -rx * Math.sin(t)));
    // Угол без скачка через ±180°: иначе на этом шаге наконечник крутанулся бы на полный круг.
    if (previous !== null) angle += 360 * Math.round((previous - angle) / 360);
    previous = angle;
    points.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t), angle });
  }
  return withLength(points);
}

/** Две точки стойки (снизу вверх) с той же разметкой, что у кольца. */
export function barSamples() {
  const [x0, y0] = PHI.bar.from;
  const [x1, y1] = PHI.bar.to;
  const angle = toDeg(Math.atan2(y1 - y0, x1 - x0));
  return withLength([{ x: x0, y: y0, angle }, { x: x1, y: y1, angle }]);
}

function withLength(points) {
  let total = 0;
  const lengths = points.map((p, i) => {
    if (i > 0) total += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
    return total;
  });
  return {
    length: total,
    points: points.map((p, i) => ({ ...p, at: total ? lengths[i] / total : 0 })),
  };
}

/** `d` ломаной через точки — по ней рисуется штрих. */
export function polyline(points) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join('');
}

/**
 * Наконечник в своих координатах: основание поперёк движения в точке (0, 0), остриё — вперёд
 * по оси x. Поворот и сдвиг к концу штриха задаёт тот, кто рисует.
 */
export function arrowHead() {
  const { half, length } = PHI.arrow;
  return `M0 ${-half}L${length} 0L0 ${half}Z`;
}
