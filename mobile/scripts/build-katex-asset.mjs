/**
 * Собирает автономную HTML-страницу с KaTeX для WebView мобилки.
 *
 * Зачем строка в бандле, а не файлы-ассеты: WebView должен работать без сети и без выдачи
 * относительных путей (шрифты в katex.min.css подключены относительно CSS, а в APK/IPA этих
 * путей нет). Всё, что нужно рендереру, — библиотека, стили и шрифты — уезжает в один HTML.
 *
 * Шрифты берутся не все: школьной математике нужны Main (обычный, жирный, курсив), Math
 * (курсив переменных), Size1–4 (большие скобки, корни, интегралы) и AMS (часть знаков
 * отношений). Caligraphic, Fraktur, SansSerif, Script и Typewriter не используются — это
 * ~200 КБ, которым нечего делать в приложении.
 *
 * Запуск: node scripts/build-katex-asset.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const katexDist = join(here, '..', 'node_modules', 'katex', 'dist');
const outFile = join(here, '..', 'src', 'shared', 'math', 'katexAsset.js');

const FONTS = [
  'KaTeX_Main-Regular',
  'KaTeX_Main-Bold',
  'KaTeX_Main-Italic',
  'KaTeX_Math-Italic',
  'KaTeX_Size1-Regular',
  'KaTeX_Size2-Regular',
  'KaTeX_Size3-Regular',
  'KaTeX_Size4-Regular',
  'KaTeX_AMS-Regular',
];

const css = readFileSync(join(katexDist, 'katex.min.css'), 'utf8');
const js = readFileSync(join(katexDist, 'katex.min.js'), 'utf8');
const { version } = JSON.parse(
  readFileSync(join(here, '..', 'node_modules', 'katex', 'package.json'), 'utf8'),
);

/** Один @font-face на семейство: data-URI вместо трёх форматов и относительных путей. */
function fontFaces() {
  return FONTS.map((name) => {
    const base64 = readFileSync(join(katexDist, 'fonts', `${name}.woff2`)).toString('base64');
    const [family, style] = name.split('-');
    return [
      '@font-face{font-family:"',
      family,
      '";src:url(data:font/woff2;base64,',
      base64,
      ') format("woff2");font-weight:',
      style === 'Bold' ? '700' : '400',
      ';font-style:',
      style === 'Italic' ? 'italic' : 'normal',
      ';font-display:block}',
    ].join('');
  }).join('\n');
}

/** Родные @font-face KaTeX ссылаются на fonts/*.woff2 — в WebView этих путей нет. */
const cssWithoutFontFaces = css.replace(/@font-face\s*\{[^}]*\}/g, '');

const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${fontFaces()}
${cssWithoutFontFaces}
html,body{margin:0;padding:0;background:transparent;-webkit-text-size-adjust:100%}
#root{padding:0;white-space:pre-wrap;word-wrap:break-word}
/* Формула шире экрана уменьшается по ширине (см. fitWide): прокрутка внутри WebView
   отобрала бы у списка вопросов вертикальный свайп, а обрезать формулу нельзя. */
.fx-math{display:inline-block;max-width:100%;vertical-align:middle}
.fx-math-block{display:block;max-width:100%;margin:8px 0;overflow:hidden}
.fx-math-block .katex-display{margin:0}
.fx-error{display:inline-block;padding:1px 4px;border-radius:4px;background:#fee2e2;color:#b91c1c;
  font-family:ui-monospace,Menlo,monospace;font-size:.9em;white-space:pre}
</style>
<script>${js}</script>
</head><body><div id="root"></div>
<script>${renderScript()}</script>
</body></html>`;

function renderScript() {
  // Функция живёт внутри страницы: RN присылает сюда текст вопроса и стили, обратно уходит
  // только высота — этого достаточно, чтобы блок в списке занял столько, сколько занял.
  return `
(function () {
  var root = document.getElementById('root');

  /**
   * Формула шире экрана уменьшается кеглем, пока не влезет. Прокрутка внутри WebView не
   * годится: она съедает вертикальный свайп у экрана вопроса. Масштаб задаётся именно
   * font-size, а не transform: размеры KaTeX заданы в em, поэтому формула честно
   * перекладывается и высота блока получается настоящей, а не пересчитанной руками.
   *
   * Меряется вложенный .katex по scrollWidth: рамка у блочной формулы всегда равна ширине
   * контейнера, и переполнение по ней не видно.
   */
  var MIN_FONT_SIZE = 9;

  function fitWide(holder, baseFontSize) {
    if (holder.className === 'fx-error') return;
    var content = holder.querySelector('.katex');
    if (!content) return;
    // 2 % запаса: формула, упёршаяся ровно в край, читается как обрезанная.
    var target = root.clientWidth * 0.98;
    if (!target) return;

    content.style.fontSize = '';
    for (var pass = 0; pass < 4; pass++) {
      // scrollWidth, а не ширина рамки: у блочной формулы KaTeX растягивает .katex на всю
      // ширину контейнера, и переполнение видно только по прокручиваемой ширине.
      var width = Math.max(content.scrollWidth, content.getBoundingClientRect().width);
      if (width <= target) return;
      var current = parseFloat(getComputedStyle(content).fontSize) || baseFontSize;
      var next = Math.max(MIN_FONT_SIZE, Math.floor(current * (target / width) * 100) / 100);
      if (next >= current) return;
      content.style.fontSize = next + 'px';
      if (next === MIN_FONT_SIZE) return;
    }
  }

  function fitAll(baseFontSize) {
    Array.prototype.forEach.call(root.querySelectorAll('.fx-math, .fx-math-block'), function (holder) {
      fitWide(holder, baseFontSize);
    });
  }

  function reportHeight() {
    var height = Math.ceil(root.getBoundingClientRect().height);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ height: height }));
    }
  }

  window.fxRender = function (payload) {
    try {
      document.body.style.color = payload.color;
      document.body.style.fontSize = payload.fontSize + 'px';
      document.body.style.lineHeight = payload.lineHeight;
      document.body.style.fontWeight = payload.fontWeight || '400';
      document.body.style.fontFamily = payload.fontFamily || 'system-ui, -apple-system, sans-serif';
      root.innerHTML = '';
      payload.segments.forEach(function (segment) {
        if (segment.kind === 'text') {
          root.appendChild(document.createTextNode(segment.value));
          return;
        }
        var holder = document.createElement('span');
        holder.className = segment.display ? 'fx-math-block' : 'fx-math';
        try {
          if (segment.forbidden) throw new Error('forbidden');
          katex.render(segment.value, holder, {
            displayMode: segment.display,
            throwOnError: true,
            strict: 'ignore',
            trust: false,
          });
        } catch (error) {
          // Сырая разметка вместо пустоты: подмена формулы не должна быть незаметной.
          holder.className = 'fx-error';
          holder.textContent = (segment.display ? '$$' : '$') + segment.value + (segment.display ? '$$' : '$');
        }
        root.appendChild(holder);
      });
      fitAll(payload.fontSize);
    } catch (error) {
      root.textContent = payload.fallback || '';
    }
    // Шрифты доезжают позже первой раскладки — высоту сообщаем ещё раз.
    reportHeight();
    var settle = function () {
      fitAll(payload.fontSize);
      reportHeight();
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
    requestAnimationFrame(settle);
  };

  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
  }
})();
`;
}

const banner = `/* eslint-disable */
/**
 * СГЕНЕРИРОВАНО scripts/build-katex-asset.mjs — руками не править.
 *
 * Автономная страница KaTeX ${version} для WebView: библиотека, стили и подмножество шрифтов
 * внутри одной строки. Пересобрать после обновления katex:
 *
 *   node scripts/build-katex-asset.mjs
 */
`;

writeFileSync(
  outFile,
  `${banner}export const KATEX_VERSION = ${JSON.stringify(version)};\n\nexport const KATEX_HTML = ${JSON.stringify(html)};\n`,
  'utf8',
);

const kb = (bytes) => `${Math.round(bytes / 1024)} КБ`;
process.stdout.write(
  `katexAsset.js собран: KaTeX ${version}, страница ${kb(html.length)} (шрифтов ${FONTS.length})\n`,
);
