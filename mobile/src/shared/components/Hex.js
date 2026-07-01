import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon, Rect, Defs, Pattern } from 'react-native-svg';
import { FIZTEX } from '../theme/tokens';
import Icon from './Icon';

// Pointy-top regular hexagon (viewBox 100x100). Port of web `Hex`.
export function Hex({ size = 24, fill = '#14110D', stroke, strokeWidth = 0, style, children }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <Polygon
        points="50,2 95,27 95,73 50,98 5,73 5,27"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {children}
    </Svg>
  );
}

// Hexagon with a centred icon, text, or arbitrary children on top — replaces the
// web pattern of an absolutely-positioned <Icon> over a <Hex>.
export function HexBadge({
  size = 44,
  fill = FIZTEX.green,
  stroke,
  strokeWidth = 0,
  icon,
  iconColor = '#fff',
  iconSize,
  iconStrokeWidth,
  style,
  children,
}) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Hex size={size} fill={fill} stroke={stroke} strokeWidth={strokeWidth} style={StyleSheet.absoluteFill} />
      {icon ? (
        <Icon name={icon} size={iconSize || Math.round(size * 0.46)} color={iconColor} strokeWidth={iconStrokeWidth} />
      ) : null}
      {children}
    </View>
  );
}

// Fiztex identity glyph — abstracted 4-hex cluster from the logo.
export function FiztexGlyph({ size = 40, style }) {
  const s = size;
  const dot = s * 0.46;
  const hex = (left, top, color, key) => (
    <View key={key} style={{ position: 'absolute', left, top, width: dot, height: dot }}>
      <Hex size={dot} fill={color} />
    </View>
  );
  return (
    <View style={[{ width: s, height: s }, style]}>
      {hex(s * 0.0, s * 0.1, FIZTEX.green, 'g')}
      {hex(s * 0.4, s * 0.0, FIZTEX.red, 'r')}
      {hex(s * 0.27, s * 0.42, FIZTEX.blue, 'b')}
      {hex(s * 0.54, s * 0.42, '#fff', 'w')}
    </View>
  );
}

let patternSeq = 0;

// Honeycomb outline pattern for hero / gradient sections.
export function HexPattern({ color = 'rgba(255,255,255,0.08)', size = 36 }) {
  const id = React.useMemo(() => `hexpat_${patternSeq++}`, []);
  const w = size * 1.732;
  const h = size * 1.5;
  const points = `${size * 0.866},0 ${size * 1.732},${size * 0.5} ${size * 1.732},${size * 1.5} ${size * 0.866},${size * 2} 0,${size * 1.5} 0,${size * 0.5}`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id={id} x="0" y="0" width={w} height={h} patternUnits="userSpaceOnUse">
          <Polygon points={points} fill="none" stroke={color} strokeWidth="1" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
