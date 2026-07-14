import React from 'react';
import { View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FIZTEX } from '../theme/tokens';
import { HexPattern } from './Hex';
import { Ink } from './Txt';

// Brand gradient colour stops (constant across themes), porting the
// `linear-gradient(...)` backgrounds from the web prototype.
export const GRAD = {
  green: [FIZTEX.green, FIZTEX.greenDeep],
  greenDeep: [FIZTEX.green, FIZTEX.greenDeep, '#7c3f0a'],
  blue: [FIZTEX.blue, FIZTEX.blueDeep],
  blueScene: [FIZTEX.blue, FIZTEX.blueDeep, '#0F172A'],
  red: [FIZTEX.red, FIZTEX.redDeep],
  gold: [FIZTEX.gold, FIZTEX.goldDeep],
};

// Diagonal (~135deg) by default; pass `vertical` for top-to-bottom (180deg).
export function Grad({ colors, style, children, vertical = false }) {
  const start = { x: 0, y: 0 };
  const end = vertical ? { x: 0, y: 1 } : { x: 1, y: 1 };
  return (
    <LinearGradient colors={colors} start={start} end={end} style={style}>
      {children}
    </LinearGradient>
  );
}

// Rounded gradient card with optional honeycomb pattern. `style` controls outer
// layout (margins, height, radius); `padding` is the inner content padding.
// `ink` sets the default descendant text colour (white over dark gradients).
export function GradCard({
  colors,
  vertical = false,
  withPattern = true,
  patternColor = 'rgba(255,255,255,0.10)',
  patternSize = 28,
  padding = 18,
  radius = 20,
  ink = '#fff',
  style,
  contentStyle,
  onPress,
  children,
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <Grad colors={colors} vertical={vertical} style={[{ padding }, contentStyle]}>
        {withPattern ? <HexPattern color={patternColor} size={patternSize} /> : null}
        <Ink color={ink}>{children}</Ink>
      </Grad>
    </Wrapper>
  );
}
