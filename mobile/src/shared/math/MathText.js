import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Txt } from '@shared/components/Txt';
import { KATEX_HTML } from './katexAsset';
import { hasForbiddenCommand, splitMath, unescapeText } from './mathMarkup';

/**
 * Текст вопроса или варианта ответа — с формулами.
 *
 * <p>Формулы рисует KaTeX внутри `WebView` (страница целиком лежит в бандле, см.
 * `katexAsset.js`). Второй движок под RN означал бы вторую типографику: у учителя в вебе
 * формула выглядела бы иначе, чем у ученика в приложении, а ТЗ требует ровно обратного.
 *
 * <p>`WebView` создаётся <b>только</b> если в тексте действительно есть `$…$`. Вопрос и
 * варианты без формул — это обычный `Txt`, как было: цена поддержки формул для теста без
 * формул нулевая.
 *
 * <p>Оговорка: внутри `WebView` обычный текст набран системным шрифтом, а не Onest —
 * шрифта приложения там нет. Формулы у KaTeX собственные, поэтому расхождение видно только
 * на словах вокруг формулы.
 */
export function MathText({ text, style, numberOfLines }) {
  const value = typeof text === 'string' ? text : '';
  const segments = useMemo(() => splitMath(value), [value]);
  const hasFormula = segments.some((segment) => segment.kind === 'math');

  if (!value) return null;
  if (!hasFormula) {
    return (
      <Txt style={style} numberOfLines={numberOfLines}>
        {unescapeText(value)}
      </Txt>
    );
  }

  return <FormulaBlock segments={segments} plain={value} style={style} />;
}

function FormulaBlock({ segments, plain, style }) {
  const flat = StyleSheet.flatten(style) || {};
  const fontSize = flat.fontSize || 16;
  const lineHeight = flat.lineHeight ? flat.lineHeight / fontSize : 1.35;
  const color = flat.color || '#1E293B';
  const fontWeight = String(flat.fontWeight || '400');

  // Высота до первого ответа страницы: столько занял бы тот же текст обычным Txt. Без этого
  // блок мигал бы нулевой высотой на каждом переходе между вопросами.
  const [height, setHeight] = useState(Math.ceil(fontSize * lineHeight * estimateLines(plain)));
  const webViewRef = useRef(null);

  const payload = useMemo(
    () => ({
      segments: segments.map((segment) =>
        segment.kind === 'math'
          ? { ...segment, forbidden: hasForbiddenCommand(segment.value) }
          : { ...segment, value: unescapeText(segment.value) },
      ),
      fallback: plain,
      color,
      fontSize,
      lineHeight,
      fontWeight,
    }),
    [segments, plain, color, fontSize, lineHeight, fontWeight],
  );

  const render = useCallback(() => {
    const script = `window.fxRender && window.fxRender(${JSON.stringify(payload)}); true;`;
    webViewRef.current?.injectJavaScript(script);
  }, [payload]);

  // Экран попытки переиспользует этот же компонент для следующего вопроса — без повторной
  // инъекции в WebView остался бы текст предыдущего. До загрузки страницы вызов уходит
  // впустую (внутри стоит проверка на window.fxRender), дальше сработает onLoadEnd.
  useEffect(() => {
    render();
  }, [render]);

  const onMessage = useCallback(
    (event) => {
      let message;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (message.ready) {
        render();
        return;
      }
      if (typeof message.height === 'number' && message.height > 0) {
        setHeight(Math.ceil(message.height));
      }
    },
    [render],
  );

  return (
    <View style={{ height }}>
      <WebView
        ref={webViewRef}
        source={{ html: KATEX_HTML }}
        originWhitelist={['about:*']}
        onMessage={onMessage}
        onLoadEnd={render}
        // Страница локальная и без ссылок (trust: false у KaTeX), но уход с неё запрещаем
        // явно. `about:` и `data:` — это сама загрузка html-источника, её пропускаем; всё
        // остальное (http, file) означало бы переход из экрана теста наружу.
        onShouldStartLoadWithRequest={(request) =>
          !request.url || request.url.startsWith('about:') || request.url.startsWith('data:')
        }
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        overScrollMode="never"
        androidLayerType="software"
        style={styles.web}
      />
    </View>
  );
}

/** Грубая оценка числа строк для начальной высоты: 40 символов на строку. */
function estimateLines(text) {
  const lines = text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 40)), 0);
  return Math.min(Math.max(lines, 1), 8);
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent', opacity: 0.99 },
});
