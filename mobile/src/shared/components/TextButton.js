import React from 'react';
import { Pressable } from 'react-native';
import { Txt } from './Txt';
import { useTheme } from '../theme/ThemeContext';
import { DEMO } from '../theme/tokens';

/**
 * Compact secondary action with a full accessible touch target.
 *
 * Цвет — `blueInk`, а не `blue`: в светлой теме они совпадают, а фирменный navy на тёмном
 * фоне почти не читается, и ссылки входа («Забыли пароль?», «Изменить») пропадали.
 */
export function TextButton({ children, onPress, label, hint, disabled = false, style }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityHint={hint} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [{ minHeight: DEMO.touchSize, minWidth: DEMO.touchSize,
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: DEMO.compactGap,
        opacity: pressed || disabled ? 0.6 : 1 }, style]}>
      <Txt style={{ color: c.blueInk, fontSize: DEMO.bodySize, fontWeight: '600' }}>{children}</Txt>
    </Pressable>
  );
}
