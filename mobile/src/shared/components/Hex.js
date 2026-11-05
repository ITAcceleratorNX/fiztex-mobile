import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon, Rect, Defs, Pattern, Path } from 'react-native-svg';
import { PHYSTECH } from '../theme/tokens';
import Icon from './Icon';
import { LOGOTYPE_PATHS } from './logotypePaths';

// Pointy-top regular hexagon (viewBox 100x100). Port of web `Hex`.
export function Hex({ size = 24, fill = '#0F172A', stroke, strokeWidth = 0, style, children }) {
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

// Rounded-square icon badge — an <Icon> (or arbitrary children) over a coloured,
// rounded background. Replaces the old hexagon-shaped badge to match the new
// navy/orange design language (kept the `HexBadge` name so call sites don't change).
export function HexBadge({
  size = 44,
  fill = PHYSTECH.green,
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
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fill,
          borderRadius: Math.round(size * 0.32),
          borderColor: stroke,
          borderWidth: stroke ? strokeWidth : 0,
        },
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={iconSize || Math.round(size * 0.46)} color={iconColor} strokeWidth={iconStrokeWidth} />
      ) : null}
      {children}
    </View>
  );
}

// Brand icon mark (swoosh/arrows forming the Ф), traced from the lockup asset.
// `stroke` по умолчанию повторяет заливку (исторический вид знака). Явный
// `stroke="none"` даёт вариант из макета — только заливка, без обводки.
export function PhysTechMark({ size = 40, color = '#fff', stroke, style }) {
  const line = stroke === undefined ? color : stroke;
  return (
    <Svg width={size} height={size * (96 / 89)} viewBox="0 0 89 96" style={style}>
      <Path
        d="M41.5892 95.1839H29.0892L31.7513 83.4339C24.6459 80.2003 19.0445 76.268 13.5892 70.6839C7.96976 64.9319 5.58917 55.1839 5.58917 55.1839L1.08917 54.6839L10.0892 45.6839L20.5892 54.6839L15.5892 55.1839C15.5892 55.1839 19.8128 62.3475 23.5892 65.6839C27.2111 68.884 29.7803 70.3081 34.4134 71.6839L43.5892 31.1839L55.0892 32.6839L41.5892 95.1839Z"
        fill={color}
      />
      <Path
        d="M31.7513 83.4339C32.7909 78.8453 33.3738 76.2726 34.4134 71.6839C37.9968 55.8677 43.5892 31.1839 43.5892 31.1839L55.0892 32.6839L41.5892 95.1839H29.0892C29.0892 95.1839 30.7117 88.0226 31.7513 83.4339ZM34.4134 71.6839C29.7803 70.3081 27.2111 68.884 23.5892 65.6839C19.8128 62.3475 15.5892 55.1839 15.5892 55.1839L20.5892 54.6839L10.0892 45.6839L1.08917 54.6839L5.58917 55.1839C5.58917 55.1839 7.96976 64.9319 13.5892 70.6839C19.0445 76.268 24.6459 80.2003 31.7513 83.4339"
        stroke={line}
      />
      <Path
        d="M10.5892 40.1839L5.58917 43.1839C5.58917 43.1839 6.63271 38.3359 10.0892 33.6839C13.2406 29.4425 17.0666 25.5091 22.0892 22.6839C23.4667 21.9091 29.8641 18.8356 34.0892 17.6839C39.0486 16.332 43.3351 16.1725 47.5892 16.1839L49.5892 8.18393H44.5892L56.5892 0.683929L64.0892 12.1839L59.0892 10.6839L58.5892 17.1839C75.0025 20.8368 88.733 34.1755 87.5892 51.1839C86.8072 62.8114 81.4952 69.8038 72.0892 76.6839C64.1636 82.4812 48.0892 84.1839 48.0892 84.1839L51.0892 72.1839C51.0892 72.1839 71.5892 68.6839 75.0892 54.6839C78.2051 42.2202 66.0785 31.1957 53.5892 28.1839C44.5952 26.015 35.5006 26.7776 27.5892 31.6839C25.1351 33.2058 22.1264 35.2716 20.0892 37.6839C17.4466 40.813 16.0892 44.1839 16.0892 44.1839L10.5892 40.1839Z"
        fill={color}
      />
      <Path
        d="M47.5892 16.1839C49.4452 16.1889 51.7873 16.5201 53.5892 16.6839C55.4509 16.8532 56.7892 16.7833 58.5892 17.1839M47.5892 16.1839L49.5892 8.18393H44.5892L56.5892 0.683929L64.0892 12.1839L59.0892 10.6839L58.5892 17.1839M47.5892 16.1839C43.3351 16.1724 39.0486 16.332 34.0892 17.6839C29.8641 18.8356 23.4667 21.9091 22.0892 22.6839C17.0666 25.5091 13.2406 29.4425 10.0892 33.6839C6.63271 38.3359 5.58917 43.1839 5.58917 43.1839L10.5892 40.1839L16.0892 44.1839C16.0892 44.1839 17.4466 40.813 20.0892 37.6839C22.1264 35.2716 25.1351 33.2058 27.5892 31.6839C35.5006 26.7776 44.5952 26.015 53.5892 28.1839C66.0785 31.1957 78.2051 42.2202 75.0892 54.6839C71.5892 68.6839 51.0892 72.1839 51.0892 72.1839L48.0892 84.1839C48.0892 84.1839 64.1636 82.4812 72.0892 76.6839C81.4952 69.8038 86.8072 62.8114 87.5892 51.1839C88.733 34.1755 75.0025 20.8368 58.5892 17.1839"
        stroke={line}
      />
    </Svg>
  );
}

// Full logotype — exact vector traced from the brand asset (viewBox 147×38); контуры — `logotypePaths`.
// Всё одного цвета, поэтому порядок отрисовки не важен.
const LOGOTYPE_ALL = [...LOGOTYPE_PATHS.phi, ...LOGOTYPE_PATHS.letters];

// `height` sets the rendered height; width scales to preserve the aspect ratio.
export function PhysTechLogotype({ height = 30, color = '#274185', style }) {
  const width = height * (147 / 38);
  return (
    <Svg width={width} height={height} viewBox="0 0 147 38" style={style}>
      {LOGOTYPE_ALL.map((d, i) => <Path key={i} fill={color} stroke={color} d={d} />)}
    </Svg>
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
