import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Txt, Ink, wrapStrings } from './Txt';
import Icon from './Icon';
import { Hex, HexBadge, PhysTechMark, PhysTechLogotype } from './Hex';
import { shadowCard } from './Screen';

// ─── PhysTech wordmark (exact logotype) ────────────────────────────────────
// The primary brand logo used in headers. `size` is the rendered height;
// `color` defaults to the brand navy.
export function PhysTechWordmark({ size = 26, color, style }) {
  const { c } = useTheme();
  return <PhysTechLogotype height={size} color={color || c.blue} style={style} />;
}

// Repeating faded logo watermark for card headers (per the design ref).
// Renders a wrapped grid of marks, clipped by the parent's `overflow: hidden`.
//
// Число знаков по умолчанию считается по фактическому размеру слоя, а не берётся
// фиксированным: при фиксированном count сетка заполняла блок только частично, и
// у высокой карточки низ оставался пустым. `count` остаётся как ручной override
// для мест, где сетка намеренно короткая.
//
// `opacity` — на слое целиком, а не в цвете: знаки рисуются заливкой и обводкой
// одного цвета, и полупрозрачный цвет дал бы двойное наложение по контуру.
export function LogoWatermark({
  color = 'rgba(255,255,255,0.06)',
  mark = 30,
  count,
  opacity = 1,
  gap = 0.28,
  stroke,
}) {
  const [box, setBox] = React.useState({ width: 0, height: 0 });

  const step = mark * gap * 2;
  const cellW = mark + step;
  const cellH = mark * (96 / 89) + step;
  const cols = Math.ceil(box.width / cellW);
  const rows = Math.ceil(box.height / cellH);
  const total = count ?? cols * rows;

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setBox((prev) => (prev.width === width && prev.height === height
          ? prev
          : { width, height }));
      }}
      style={{
        position: 'absolute',
        top: -mark,
        left: -mark,
        right: -mark,
        bottom: -mark,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        opacity,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ margin: mark * gap }}>
          <PhysTechMark size={mark} color={color} stroke={stroke} />
        </View>
      ))}
    </View>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────
// `elevated` — вариант из макетов ученика: карточка отделяется от фона тенью, а не
// рамкой, и радиус крупнее. Обводка и тень вместе дают «двойную» границу, поэтому
// это именно варианты, а не флаги, которые можно включить одновременно.
export function Card({ children, style, padded = true, onPress, elevated = false }) {
  const { c } = useTheme();
  const base = {
    backgroundColor: c.surface,
    borderRadius: elevated ? 24 : 20,
    borderWidth: elevated ? 0 : 1,
    borderColor: c.border,
    padding: padded ? 16 : 0,
    ...(elevated ? shadowCard : null),
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

// ─── Banner ───────────────────────────────────────────────────────────────────
// A full-width notice above the content: icon + one line of text.
//
// `tone` picks how loud it is, not which colour — the colour is always the brand
// CTA orange, because both current uses are "something about this lesson is not
// the default":
//   soft  → tinted background, coloured ink (substitution — informative)
//   solid → filled background, white ink (closed period — restrictive)
export function Banner({ icon, children, tone = 'soft', style }) {
  const { c } = useTheme();
  const solid = tone === 'solid';
  const fg = solid ? '#fff' : c.green;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 16,
          backgroundColor: solid ? c.green : c.greenSoft,
          borderWidth: solid ? 0 : 1,
          borderColor: c.green,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={fg} strokeWidth={2} /> : null}
      <Ink color={fg}>
        {wrapStrings(children, { fontSize: 13, fontWeight: '600', color: fg })}
      </Ink>
    </View>
  );
}

// ─── StateView ────────────────────────────────────────────────────────────────
// The shared "nothing to show" block: 72px tinted circle + 32px icon, title,
// optional subtitle, optional action button. Figma uses this same shape for
// empty, no-access and error states across screens.
//
// `tone` ('neutral' | 'warn' | 'error') tints the circle; the action button is
// always the brand navy, as in the mockups.
export function StateView({
  icon = 'info',
  tone = 'neutral',
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}) {
  const { c } = useTheme();
  const tones = {
    neutral: { bg: c.bg2, ink: c.inkMuted },
    warn: { bg: c.greenSoft, ink: c.green },
    error: { bg: c.redSoft, ink: c.red },
    brand: { bg: c.blueSoft, ink: c.blue },
  };
  const t = tones[tone] || tones.neutral;

  return (
    <View style={[{ alignItems: 'center', paddingHorizontal: 32, gap: 20 }, style]}>
      <View style={{ alignItems: 'center', gap: 16 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.bg,
          }}
        >
          <Icon name={icon} size={32} color={t.ink} strokeWidth={2} />
        </View>
        <View style={{ gap: 6 }}>
          <Txt style={{ fontSize: 16, fontWeight: '700', color: c.ink, textAlign: 'center' }}>
            {title}
          </Txt>
          {subtitle ? (
            <Txt style={{ fontSize: 13, fontWeight: '400', color: c.inkMuted, textAlign: 'center' }}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => ({
            width: '100%',
            height: 48,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.blue,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Txt style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{actionLabel}</Txt>
        </Pressable>
      ) : null}
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
