import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@shared/theme/ThemeContext';
import { FONT } from '@shared/theme/tokens';

const H = 190;
const PAD = { left: 28, right: 34, top: 16, bottom: 26 };

function dayIndex(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

function dayMonth(iso) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

/**
 * График динамики (Figma «Средний балл по дням», экран предмета). Только рисует точки,
 * пришедшие с сервера: линия среднего, метки оценок (кружок — оценка, квадрат — СОР,
 * ромб — СОЧ) и пунктир прошлого периода. Масштаб — от целого снизу до целого сверху.
 *
 * @param line     [{ date, value }] — линия среднего
 * @param markers  [{ key, date, value, kind }] — оценки на линии
 * @param reference { value, label } — «Прошлый период: 7,6»
 */
export function DynamicsChart({ from, to, line = [], markers = [], reference, formatValue, accessibilityLabel }) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const values = [...line.map((p) => p.value), ...markers.map((m) => m.value), ...(reference ? [reference.value] : [])];
  if (values.length === 0) return null;
  let min = Math.floor(Math.min(...values));
  let max = Math.ceil(Math.max(...values));
  // Запас у краёв: точка, равная целому делению, не ложится на ось.
  if (Math.min(...values) - min < 0.25) min -= 1;
  if (max - Math.max(...values) < 0.25) max += 1;
  const step = Math.max(1, Math.ceil((max - min) / 3));
  const ticks = [];
  for (let v = min; v <= max; v += step) ticks.push(v);
  const x0 = dayIndex(from);
  const span = Math.max(1, dayIndex(to) - x0);
  const x = (iso) => PAD.left + ((dayIndex(iso) - x0) / span) * (width - PAD.left - PAD.right);
  const y = (v) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom);
  const xTicks = [0, 0.5, 1].map((share) => new Date((x0 + Math.round(span * share)) * 86400000).toISOString().slice(0, 10));
  const last = line[line.length - 1];

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: H }}>
      {width > 0 ? (
        <Svg width={width} height={H}>
          {ticks.map((tick) => (
            <React.Fragment key={tick}>
              <Line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke={c.border} strokeWidth={1} />
              <SvgText x={PAD.left - 8} y={y(tick) + 4} fontSize={11} fill={c.ink3} textAnchor="end" fontFamily={FONT.regular}>{tick}</SvgText>
            </React.Fragment>
          ))}
          {xTicks.map((tick, index) => (
            <SvgText key={`${tick}-${index}`} x={x(tick)} y={H - 6} fontSize={11} fill={c.ink3} fontFamily={FONT.regular}
              textAnchor={index === 0 ? 'start' : index === 2 ? 'end' : 'middle'}>{dayMonth(tick)}</SvgText>
          ))}
          {reference ? (
            <>
              <Line x1={PAD.left} x2={width - PAD.right} y1={y(reference.value)} y2={y(reference.value)} stroke={c.ink3} strokeDasharray="4 4" />
              <SvgText x={PAD.left + 4} y={y(reference.value) - 6} fontSize={11} fill={c.ink2} fontFamily={FONT.regular}>{reference.label}</SvgText>
            </>
          ) : null}
          <Polyline points={line.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')} fill="none" stroke={c.blueInk} strokeWidth={2.5} strokeLinejoin="round" />
          {markers.length === 0 ? line.map((p) => <Circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={3.5} fill={c.blueInk} />) : null}
          {markers.map((m) => {
            const cx = x(m.date);
            const cy = y(m.value);
            if (m.kind === 'SOR') return <Rect key={m.key} x={cx - 5} y={cy - 5} width={10} height={10} fill={c.markPresent} />;
            if (m.kind === 'SOCH') return <Rect key={m.key} x={cx - 5} y={cy - 5} width={10} height={10} fill={c.blueInk} transform={`rotate(45 ${cx} ${cy})`} />;
            return <Circle key={m.key} cx={cx} cy={cy} r={4.5} fill={c.surface} stroke={c.blueInk} strokeWidth={2} />;
          })}
          {last ? (
            <SvgText x={x(last.date) - 4} y={y(last.value) - 10} fontSize={13} fill={c.ink} textAnchor="end" fontFamily={FONT.bold}>
              {formatValue ? formatValue(last.value) : String(last.value)}
            </SvgText>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

/** Мини-график для плитки «Динамика успеваемости» на главной (Figma 2201:52702). */
export function Sparkline({ values = [], width = 104, height = 28 }) {
  const { c } = useTheme();
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * (width - 4) + 2},${height - 2 - ((v - min) / range) * (height - 4)}`).join(' ');
  return (
    <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Polyline points={points} fill="none" stroke={c.blueInk} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}
