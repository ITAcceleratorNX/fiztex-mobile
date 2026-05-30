import React, { createContext, useContext } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { FONT } from '../theme/tokens';

// Maps a numeric/string fontWeight to the matching Onest family, since custom
// fonts in RN don't synthesize weights from `fontWeight` alone.
function familyForWeight(weight) {
  const w = typeof weight === 'string' ? parseInt(weight, 10) : weight;
  if (!w) return FONT.regular;
  if (w >= 800) return FONT.extrabold;
  if (w >= 700) return FONT.bold;
  if (w >= 600) return FONT.semibold;
  if (w >= 500) return FONT.medium;
  return FONT.regular;
}

// Lets a coloured container set the default text colour for descendants,
// mimicking CSS `color` inheritance (e.g. white text over a gradient hero).
export const InkCtx = createContext(null);

export function Ink({ color, children }) {
  return <InkCtx.Provider value={color}>{children}</InkCtx.Provider>;
}

export function Txt({ style, children, ...rest }) {
  const { c } = useTheme();
  const inherited = useContext(InkCtx);
  const flat = StyleSheet.flatten(style) || {};
  const family = flat.fontFamily || familyForWeight(flat.fontWeight);
  return (
    <Text {...rest} style={[{ color: inherited || c.ink, fontFamily: family }, style]}>
      {children}
    </Text>
  );
}

// Wraps bare string/number children in <Txt> so they can be mixed with elements
// (RN forbids raw strings outside <Text>). Used by Pill / buttons.
export function wrapStrings(children, style) {
  return React.Children.map(children, (ch) =>
    typeof ch === 'string' || typeof ch === 'number' ? <Txt style={style}>{ch}</Txt> : ch
  );
}
