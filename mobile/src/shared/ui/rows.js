import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import Icon from '@shared/components/Icon';
import { Hex, HexBadge } from '@shared/components/Hex';
import { Card, Pill } from '@shared/components/ui';
import { SUBJECT_COLORS } from '@shared/data/mock';

// Resolve a Fiztex colour-name to a theme hex (falls back to muted ink).
export function brandColor(c, name) {
  return {
    green: c.green,
    greenDeep: c.greenDeep,
    blue: c.blue,
    blueDeep: c.blueDeep,
    red: c.red,
    redDeep: c.redDeep,
    gold: c.gold,
    goldDeep: c.goldDeep,
  }[name] || c.ink3;
}

export function softColor(c, name) {
  return { green: c.greenSoft, blue: c.blueSoft, red: c.redSoft, gold: c.goldSoft }[name] || c.bg2;
}

// ─── Schedule lesson row ──────────────────────────────────────────────────────
export function LessonRow({ lesson, onPress }) {
  const { c } = useTheme();
  const subInfo = SUBJECT_COLORS[lesson.subject] || { color: 'gray' };
  const stripe = brandColor(c, subInfo.color);

  const badge = {
    done: (
      <Pill color="green">
        <Icon name="check" size={12} />
        <Txt style={{ fontSize: 12, fontWeight: '600' }}> Был</Txt>
      </Pill>
    ),
    now: (
      <Pill color="red" style={{ backgroundColor: c.red, color: '#fff' }}>
        ● Сейчас
      </Pill>
    ),
    next: <Pill color="gold">Следующий</Pill>,
    upcoming: <Pill color="gray">{lesson.time}</Pill>,
  }[lesson.status];

  return (
    <Card onPress={onPress} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, backgroundColor: stripe }} />
      <View style={{ minWidth: 54 }}>
        <Txt style={{ fontSize: 15, fontWeight: '700', letterSpacing: -0.2 }}>{lesson.time}</Txt>
        <Txt style={{ fontSize: 11, color: c.ink3, marginTop: 1 }}>{lesson.end}</Txt>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: 15, fontWeight: '600' }}>{lesson.subject}</Txt>
        <Txt style={{ fontSize: 12, color: c.ink3, marginTop: 1 }}>
          {lesson.room} · {lesson.teacher}
        </Txt>
      </View>
      {badge}
    </Card>
  );
}

// ─── Diary subject row ────────────────────────────────────────────────────────
export function SubjectRow({ subject, onPress }) {
  const { c } = useTheme();
  const subInfo = SUBJECT_COLORS[subject.name] || { color: 'gray' };
  return (
    <Card onPress={onPress} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <HexBadge size={44} fill={brandColor(c, subInfo.color)}>
        <Txt style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>{subject.avg}</Txt>
      </HexBadge>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: 15, fontWeight: '600' }}>{subject.name}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {subject.last.map((g, i) => (
            <View
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: g === 5 ? c.greenSoft : g === 4 ? c.goldSoft : c.redSoft,
              }}
            >
              <Txt style={{ fontSize: 11, fontWeight: '700', color: g === 5 ? c.green : g === 4 ? c.goldDeep : c.red }}>{g}</Txt>
            </View>
          ))}
        </View>
      </View>
      {subject.hw > 0 ? <Pill color="red">{`${subject.hw} ДЗ`}</Pill> : null}
    </Card>
  );
}

// ─── Settings / info row ──────────────────────────────────────────────────────
export function ProfileRow({ icon, title, value, last }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.bg2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Icon name={icon} size={16} color={c.ink2} />
      </View>
      <Txt style={{ flex: 1, fontSize: 14, fontWeight: '500' }}>{title}</Txt>
      {value ? <Txt style={{ fontSize: 13, color: c.ink3, marginRight: 6 }}>{value}</Txt> : null}
      <Icon name="chevronRight" size={14} color={c.ink3} />
    </View>
  );
}

// ─── Quick action tile (parent / teacher home) ───────────────────────────────
export function QuickAction({ icon, color, label, onPress }) {
  const { c } = useTheme();
  return (
    <Card onPress={onPress} style={{ flex: 1, padding: 16, gap: 10 }}>
      <HexBadge size={40} fill={brandColor(c, color)} icon={icon} iconColor="#fff" iconSize={18} />
      <Txt style={{ fontSize: 14, fontWeight: '700' }}>{label}</Txt>
    </Card>
  );
}

// ─── Decorative QR mockup (not a real QR code) ────────────────────────────────
export function QRMockup({ size = 200 }) {
  const grid = 17;
  const cell = size / grid;
  const dark = '#14110D';
  const cells = [];
  const rng = (n) => ((n * 9301 + 49297) % 233280) / 233280;
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if ((x < 8 && y < 8) || (x > 8 && y < 8) || (x < 8 && y > 8)) continue;
      if (rng(x * 100 + y) > 0.5) {
        cells.push(<Rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell * 0.9} height={cell * 0.9} fill={dark} rx={cell * 0.2} />);
      }
    }
  }
  const corner = (cx, cy, key) => (
    <G key={key}>
      <Rect x={cx} y={cy} width={7 * cell} height={7 * cell} fill={dark} rx={cell * 0.6} />
      <Rect x={cx + cell} y={cy + cell} width={5 * cell} height={5 * cell} fill="#fff" rx={cell * 0.4} />
      <Rect x={cx + cell * 2} y={cy + cell * 2} width={3 * cell} height={3 * cell} fill={dark} rx={cell * 0.3} />
    </G>
  );
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {cells}
      {corner(0, 0, 'tl')}
      {corner(size - 7 * cell, 0, 'tr')}
      {corner(0, size - 7 * cell, 'bl')}
    </Svg>
  );
}
