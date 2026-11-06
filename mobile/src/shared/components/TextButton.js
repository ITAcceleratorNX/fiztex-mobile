import React from 'react';
import { Pressable } from 'react-native';
import { Txt } from './Txt';
import { useTheme } from '../theme/ThemeContext';
import { DEMO, REQUEST } from '../theme/tokens';

/**
 * Compact secondary action with a full accessible touch target.
 *
 * Цвет — `blueInk`, а не `blue`: в светлой теме они совпадают, а фирменный navy на тёмном
 * фоне почти не читается, и ссылки входа («Забыли пароль?», «Изменить») пропадали.
 */
// `size="lg"` — ссылка под главной кнопкой формы, 15/600 («Забыли пароль?», M2). `tone="quiet"` —
// второстепенная ссылка серым 13/500 («Проверить статус заявки» внизу M1): видна, но не спорит с
// «Отправить заявку» над ней.
export function TextButton({ children, onPress, label, hint, disabled = false, style, size = 'md', tone = 'link' }) {
  const { c } = useTheme();
  const quiet = tone === 'quiet';
  const text = quiet
    ? { color: c.ink3, fontSize: REQUEST.quietLinkSize, lineHeight: REQUEST.quietLinkLine, fontWeight: '500' }
    : size === 'lg'
      ? { color: c.blueInk, fontSize: REQUEST.linkSize, lineHeight: REQUEST.linkLine, fontWeight: '600' }
      : { color: c.blueInk, fontSize: DEMO.bodySize, fontWeight: '600' };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint={hint} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ minHeight: DEMO.touchSize, minWidth: DEMO.touchSize,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: DEMO.compactGap,
        opacity: pressed || disabled ? 0.6 : 1 }, style]}>
      <Txt style={text}>{children}</Txt>
    </Pressable>
  );
}
