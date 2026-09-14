/**
 * Собирает автономную HTML-страницу с pdf.js для просмотра учебника в WebView.
 *
 * Зачем pdf.js, а не нативный WebView, как у материалов урока: макет просмотра — это
 * страница, «Стр. 24 из 142» и стрелки (Figma 2149:5033). WKWebView листает PDF только
 * прокруткой всего файла и номера страницы наружу не отдаёт, а Android PDF в WebView не
 * рисует вовсе. pdf.js рисует ровно одну страницу на canvas на обеих платформах.
 *
 * Зачем строка в бандле: как у KaTeX (`build-katex-asset.mjs`) — страница работает без
 * CDN и без относительных путей, которых в APK/IPA нет. Сеть ей нужна только за самим
 * учебником, и тот она просит кусками через `Range`: сервер отдаёт `206` (контракт §5),
 * поэтому 100-мегабайтный скан не качается целиком ради одной страницы.
 *
 * Сборка legacy: она транспилирована под старые движки, а WebView на Android — это
 * системный Chromium, версию которого приложение не выбирает.
 *
 * Запуск: node scripts/build-pdfjs-asset.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pdfjsRoot = join(here, '..', 'node_modules', 'pdfjs-dist');
const build = join(pdfjsRoot, 'legacy', 'build');
const outFile = join(here, '..', 'src', 'shared', 'pdf', 'pdfViewerAsset.js');

const { version } = JSON.parse(readFileSync(join(pdfjsRoot, 'package.json'), 'utf8'));
const library = inlineSafe(readFileSync(join(build, 'pdf.min.js'), 'utf8'));
const worker = inlineSafe(readFileSync(join(build, 'pdf.worker.min.js'), 'utf8'));

/**
 * HTML-парсер закрывает `<script>` на первом же `</script`, даже внутри строки JS, а `<!--`
 * переводит его в режим, где закрытие теряется. Внутри JS `<\/script` и `<\!--` значат то же
 * самое, поэтому экранирование безопасно для любого места кода — строки, регулярки, комментария.
 */
function inlineSafe(code) {
  return code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes">
<style>
html,body{margin:0;padding:0;min-height:100%;-webkit-text-size-adjust:100%}
body{display:flex;justify-content:center;align-items:flex-start}
#sheet{margin:16px;border:1px solid transparent;border-radius:4px;overflow:hidden;line-height:0;
  box-shadow:0 10px 12px rgba(0,0,0,.07)}
canvas{display:block}
</style>
<script>${library}</script>
<script type="text/plain" id="pdf-worker">${worker}</script>
</head><body><div id="sheet"><canvas id="page"></canvas></div>
<script>${viewerScript()}</script>
</body></html>`;

function viewerScript() {
  // Всё управление — снаружи: RN присылает `open` и `show`, обратно уходят `ready` с числом
  // страниц, `page` после отрисовки и `error`. Номер страницы экран берёт из `page`, а не
  // из своей кнопки: если две стрелки нажали быстро, на экране окажется последняя.
  return `
(function () {
  var lib = window.pdfjsLib;
  var sheet = document.getElementById('sheet');
  var canvas = document.getElementById('page');
  var doc = null;
  var current = 1;
  var busy = false;
  var queued = null;
  var range = null;

  function send(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }

  function failure(error) {
    return { type: 'error', message: String((error && error.message) || error), status: (error && error.status) || null };
  }

  // Воркер берётся из этого же документа: страница не ходит в сеть ни за чем, кроме учебника.
  try {
    var source = document.getElementById('pdf-worker').textContent;
    lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  } catch (error) {
    send({ type: 'warning', message: 'worker: ' + String(error) });
  }

  function render(number) {
    if (!doc) return;
    var target = Math.min(Math.max(1, number), doc.numPages);
    if (busy) { queued = target; return; }
    busy = true;
    current = target;
    doc.getPage(target)
      .then(function (page) {
        var width = Math.max(1, document.documentElement.clientWidth - 34);
        var base = page.getViewport({ scale: 1 });
        var viewport = page.getViewport({ scale: width / base.width });
        // Больше трёх — это память без видимой разницы: canvas страницы на 4x весит сотни мегабайт.
        var ratio = Math.min(window.devicePixelRatio || 1, 3);
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';
        return page.render({
          canvasContext: canvas.getContext('2d'),
          viewport: viewport,
          transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0],
        }).promise;
      })
      .then(function () {
        window.scrollTo(0, 0);
        send({ type: 'page', page: current });
        if (range && current >= range.from && current < range.to) prefetch(current + 1);
      })
      .catch(function (error) { send(failure(error)); })
      .then(function () {
        busy = false;
        if (queued !== null) {
          var next = queued;
          queued = null;
          if (next !== current) render(next);
        }
      });
  }

  /**
   * Следующая страница урока грузится заранее: к уроку задано «300–310», и ученик листает
   * именно их — «→» внутри диапазона не ждёт сети. За пределами диапазона страницы
   * по-прежнему приходят только по запросу: заранее качать чужие страницы — тратить
   * мобильный трафик на то, что не откроют. Сбой здесь молчит: это подсказка, не показ.
   */
  function prefetch(number) {
    if (!doc || number > doc.numPages) return;
    doc.getPage(number)
      .then(function (page) { return page.getOperatorList(); })
      .catch(function () {});
  }

  window.pdfViewer = {
    open: function (options) {
      document.body.style.background = options.background || '';
      sheet.style.background = options.sheet || '';
      sheet.style.borderColor = options.border || 'transparent';
      range = options.range || null;
      lib.getDocument({
        url: options.url,
        httpHeaders: options.headers || {},
        rangeChunkSize: 256 * 1024,
        disableAutoFetch: true,
        disableStream: true,
      }).promise.then(function (loaded) {
        doc = loaded;
        send({ type: 'ready', pageCount: loaded.numPages });
        render(options.page || 1);
      }, function (error) {
        send(failure(error));
      });
    },
    show: function (number) { render(number); },
  };

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { render(current); }, 150);
  });

  send({ type: 'loaded' });
})();
`;
}

/** JSON-строка — валидный литерал JS, кроме U+2028/U+2029: их экранируем явно. */
function toJsString(value) {
  return JSON.stringify(value).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

writeFileSync(
  outFile,
  [
    `// Сгенерировано scripts/build-pdfjs-asset.mjs из pdfjs-dist ${version}. Руками не править.`,
    `export const PDFJS_VERSION = ${JSON.stringify(version)};`,
    `export const PDF_VIEWER_HTML = ${toJsString(html)};`,
    '',
  ].join('\n'),
);

console.log(
  `pdfViewerAsset.js: ${(Buffer.byteLength(html, 'utf8') / 1024 / 1024).toFixed(2)} МБ, pdf.js ${version}`,
);
