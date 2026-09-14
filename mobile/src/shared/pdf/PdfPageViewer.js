import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@shared/theme/ThemeContext';
import { PDF_VIEWER_HTML } from './pdfViewerAsset';

/**
 * Одна страница PDF в WebView на pdf.js (страница собирается `scripts/build-pdfjs-asset.mjs`).
 *
 * <p><b>Файл запрашивает сама страница</b>, а не приложение: pdf.js просит у сервера только
 * нужные куски (`Range` → `206`), поэтому первая страница 100-мегабайтного учебника не ждёт
 * загрузки всего файла. Заголовок авторизации уходит в `httpHeaders`.
 *
 * <p><b>`baseUrl` — адрес API.</b> Страница из строки получает происхождение сервера, и
 * запросы за файлом становятся запросами того же источника: без CORS и без отдельных
 * разрешений на бэке.
 *
 * <p><b>Открывается сразу на `page`.</b> pdf.js читает таблицу объектов в конце файла и
 * просит ровно те куски, из которых состоит нужная страница, — открытие трёхсотой страницы
 * не скачивает двести девяносто девять предыдущих.
 *
 * <p>Компонент ничего не решает о номерах: какую страницу показать, говорит `page`, а что
 * реально нарисовалось — `onPage`. Цвета листа и подложки приходят из темы.
 */
export function PdfPageViewer({ uri, headers, baseUrl, page, range, onReady, onPage, onError }) {
  const { c } = useTheme();
  const webView = useRef(null);
  const opened = useRef(false);
  const shown = useRef(null);
  // Последние пропсы для `open`: сообщение о готовности страницы приходит асинхронно, и
  // замыкание в обработчике видело бы значения первого рендера.
  const latest = useRef(null);
  latest.current = {
    url: uri,
    headers: headers || {},
    page,
    // Диапазон учителя: следующую страницу внутри него страница pdf.js грузит заранее.
    range: range || null,
    background: c.bg,
    sheet: c.surface,
    border: c.border,
  };

  const open = useCallback(() => {
    if (opened.current) return;
    opened.current = true;
    shown.current = latest.current.page;
    webView.current?.injectJavaScript(`window.pdfViewer.open(${JSON.stringify(latest.current)});true;`);
  }, []);

  useEffect(() => {
    if (!opened.current || shown.current === page) return;
    shown.current = page;
    webView.current?.injectJavaScript(`window.pdfViewer.show(${Number(page) || 1});true;`);
  }, [page]);

  const onMessage = useCallback(
    (event) => {
      let message;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (message.type === 'loaded') open();
      else if (message.type === 'ready') onReady?.(message.pageCount);
      else if (message.type === 'page') {
        shown.current = message.page;
        onPage?.(message.page);
      } else if (message.type === 'error') onError?.(message);
    },
    [open, onReady, onPage, onError],
  );

  return (
    <WebView
      ref={webView}
      source={{ html: PDF_VIEWER_HTML, baseUrl }}
      originWhitelist={['*']}
      onMessage={onMessage}
      // Страница сообщает о готовности сама; onLoadEnd — страховка на случай, если сообщение
      // пришло раньше, чем мост WebView успел подписаться.
      onLoadEnd={open}
      // Уходить со страницы некуда: загрузка самого html и blob воркера — всё, что ей нужно.
      onShouldStartLoadWithRequest={(request) =>
        !request.url ||
        request.url.startsWith('about:') ||
        request.url.startsWith('data:') ||
        request.url.startsWith('blob:') ||
        request.url.startsWith(baseUrl)
      }
      setSupportMultipleWindows={false}
      automaticallyAdjustContentInsets={false}
      style={[styles.web, { backgroundColor: c.bg }]}
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1 },
});
