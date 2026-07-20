import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Txt, Ink, wrapStrings } from './Txt';
import Icon from './Icon';
import { Hex, HexBadge, PhysTechMark, PhysTechLogotype } from './Hex';

// ─── PhysTech wordmark (exact logotype) ────────────────────────────────────
// The primary brand logo used in headers. `size` is the rendered height;
// `color` defaults to the brand navy.
export function PhysTechWordmark({ size = 26, color, style }) {
  const { c } = useTheme();
  return <PhysTechLogotype height={size} color={color || c.blue} style={style} />;
}

// Repeating faded logo watermark for gradient card headers (per the design ref).
// Renders a wrapped grid of marks, clipped by the parent's `overflow: hidden`.
export function LogoWatermark({ color = 'rgba(255,255,255,0.06)', mark = 30, count = 30 }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -mark,
        left: -mark,
        right: -mark,
        bottom: -mark,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ margin: mark * 0.28 }}>
          <PhysTechMark size={mark} color={color} />
        </View>
      ))}
    </View>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────
export function Card({ children, style, padded = true, onPress }) {
  const { c } = useTheme();
  const base = {
    backgroundColor: c.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    padding: padded ? 16 : 0,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, style, pressed && { opacity: 0.9 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

// ─── Pill ─────────────────────────────────────────────────────────────────
export function Pill({ children, color = 'gray', style }) {
  const { c } = useTheme();
  const map = {
    green: [c.green, c.greenSoft],
    blue: [c.blue, c.blueSoft],
    red: [c.red, c.redSoft],
    gold: [c.goldDeep, c.goldSoft],
    gray: [c.ink2, c.bg2],
  };
  const [fg, bg] = map[color] || map.gray;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: 4,
          paddingHorizontal: 9,
          borderRadius: 999,
          backgroundColor: bg,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Ink color={style?.color || fg}>
        {wrapStrings(children, {
          fontSize: style?.fontSize ?? 12,
          fontWeight: style?.fontWeight ?? '600',
          letterSpacing: style?.letterSpacing,
          textTransform: style?.textTransform,
        })}
      </Ink>
    </View>
  );
}

// ─── Avatar (hexagonal, initials) ─────────────────────────────────────────────
export function Avatar({ name = '', size = 40, color = 'green' }) {
  const { c } = useTheme();
  const fill = { green: c.green, blue: c.blue, red: c.red, gold: c.gold }[color] || c.green;
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <HexBadge size={size} fill={fill}>
      <Txt style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.36 }}>{initials}</Txt>
    </HexBadge>
  );
}

// ─── PrimaryButton ────────────────────────────────────────────────────────────
export function PrimaryButton({ children, onPress, color = 'green', style, full = true, disabled }) {
  const { c } = useTheme();
  const map = {
    green: [c.green, '#fff'],
    blue: [c.blue, '#fff'],
    red: [c.red, '#fff'],
    gold: [c.goldDeep, '#fff'],
    ghost: [c.surface2, c.ink],
  };
  const [bg, fg] = map[color] || map.green;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          width: full ? '100%' : undefined,
          height: 54,
          borderRadius: 999,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 24,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <Ink color={fg}>{wrapStrings(children, { fontSize: 16, fontWeight: '600', color: fg })}</Ink>
    </Pressable>
  );
}

// ─── Round icon button (bell / actions in headers) ────────────────────────────
export function CircleButton({ icon, size = 44, onPress, color, badge, children }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon ? <Icon name={icon} size={20} color={color || c.ink} /> : children}
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 9,
            right: 11,
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: c.red,
          }}
        />
      ) : null}
    </Pressable>
  );
}

// ─── AppHeader (home greeting) ────────────────────────────────────────────────
export function AppHeader({ greeting, name, right }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Avatar name={name} size={44} color="blue" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={{ fontSize: 12.5, color: c.ink3, fontWeight: '500' }}>{greeting}</Txt>
        <Txt numberOfLines={1} style={{ fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }}>
          {name}
        </Txt>
      </View>
      {right}
    </View>
  );
}

// ─── ScreenHeader (back chevron + title, or large title) ──────────────────────
export function ScreenHeader({ title, back, right, large = false, sub }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44 }}>
        {back !== undefined ? (
          <Pressable
            onPress={back}
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevronLeft" size={20} color={c.ink} />
          </Pressable>
        ) : null}
        {!large && (
          <Txt style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' }}>{title}</Txt>
        )}
        {!large && (right || <View style={{ width: 38 }} />)}
      </View>
      {large && (
        <View style={{ marginTop: 8 }}>
          <Txt style={{ fontSize: 30, fontWeight: '700', letterSpacing: -0.6, lineHeight: 36 }}>{title}</Txt>
          {sub ? <Txt style={{ color: c.ink2, fontSize: 14, marginTop: 4 }}>{sub}</Txt> : null}
        </View>
      )}
    </View>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────
export function SectionTitle({ title, right }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 }}>
      <Txt style={{ fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }}>{title}</Txt>
      {right}
    </View>
  );
}

export { Hex, HexBadge, PhysTechMark };
