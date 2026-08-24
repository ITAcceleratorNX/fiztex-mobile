import React from 'react';
import { View, Pressable, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Txt, Ink, wrapStrings } from './Txt';
import Icon from './Icon';
import { Hex, HexBadge, PhysTechMark, PhysTechLogotype } from './Hex';
import { shadowCard, shadowLg } from './Screen';

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
    // `green` в этой палитре — фирменный оранжевый (исторически), поэтому
    // «успех» нельзя выразить им: для настоящего зелёного есть своя пара.
    success: [c.success, c.successSoft],
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

// ─── Кнопки формы (Figma: `all-here-btn`, `draft-btn`, `publish-btn`) ─────────
// Отдельно от {@link PrimaryButton}: тот — крупный CTA во всю ширину (h54, r999),
// а это кнопки внутри формы — прямоугольные, h44 в подвале и компактные в строке.
// Два размера, а не свободные пропсы: третий вариант в макетах не встречается, и
// открытая геометрия быстрее разъезжается, чем закрывается пара значений.
const BTN_SIZES = {
  sm: { height: undefined, paddingVertical: 8, paddingHorizontal: 12, radius: 8, fontSize: 13, weight: '600', border: 1 },
  lg: { height: 44, paddingVertical: 0, paddingHorizontal: 16, radius: 12, fontSize: 14, weight: '700', border: 1.5 },
};

export function OutlineButton({ children, onPress, disabled = false, size = 'sm', style }) {
  const { c } = useTheme();
  const s = BTN_SIZES[size] || BTN_SIZES.sm;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          height: s.height,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: s.radius,
          borderWidth: s.border,
          borderColor: disabled ? c.border : c.blue,
          backgroundColor: c.surface,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Txt style={{ fontSize: s.fontSize, fontWeight: s.weight, color: disabled ? c.ink3 : c.blue }}>
        {children}
      </Txt>
    </Pressable>
  );
}

// Заливка. Выключенная кнопка не «включённая с прозрачностью», а свой серый:
// полупрозрачный оранжевый на светлом фоне остаётся оранжевым и продолжает звать нажать.
export function FilledButton({ children, onPress, disabled = false, color = 'green', size = 'lg', style }) {
  const { c } = useTheme();
  const s = BTN_SIZES[size] || BTN_SIZES.lg;
  const bg = { green: c.green, blue: c.blue, red: c.red }[color] || c.green;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          height: s.height,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: s.radius,
          backgroundColor: disabled ? c.bg2 : bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <Txt style={{ fontSize: s.fontSize, fontWeight: s.weight, color: disabled ? c.ink3 : '#fff' }}>
        {children}
      </Txt>
    </Pressable>
  );
}

// ─── Checkbox (Figma `checkbox-checked`) ──────────────────────────────────────
// Квадрат 16px: включённый — заливка фирменным navy с белой галочкой, выключенный —
// только контур. Подпись входит в зону нажатия: 16 пикселей — не цель для пальца.
export function Checkbox({ checked, label, onPress, disabled = false }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      onPress={disabled ? undefined : onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        minWidth: 0,
        gap: 6,
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: checked ? c.blue : 'transparent',
          borderWidth: checked ? 0 : 1,
          borderColor: c.inkMuted,
        }}
      >
        {checked ? <Icon name="check" size={10} color="#fff" strokeWidth={3} /> : null}
      </View>
      {label ? (
        <Txt
          style={{ flexShrink: 1, minWidth: 0, fontSize: 12, fontWeight: '500', color: c.ink2 }}
          numberOfLines={1}
        >
          {label}
        </Txt>
      ) : null}
    </Pressable>
  );
}

// ─── SelectPill ───────────────────────────────────────────────────────────────
// Значение из закрытого списка: подпись и шеврон вниз (Figma — статус ученика и
// `reason-switcher-pill`). Без `onPress` шеврон пропадает — пилюля становится
// подписью, а не «выключенной кнопкой»: ровно этим отличается просмотр от правки.
//
// `tone` — семантика значения, не цвет: экран не должен знать, каким токеном
// покрашено «присутствовал».
const PILL_TONES = {
  success: (c) => ({ bg: c.attPresentTint, ink: c.attPresentInk, border: c.attPresentInk }),
  danger: (c) => ({ bg: c.attAbsentTint, ink: c.attAbsentInk, border: c.attAbsentInk }),
  muted: (c) => ({ bg: c.bg2, ink: c.inkMuted, border: c.inkMuted }),
  neutral: (c) => ({ bg: c.surface, ink: c.ink2, border: c.border }),
};

export function SelectPill({ label, tone = 'neutral', onPress, disabled = false, style }) {
  const { c } = useTheme();
  const t = (PILL_TONES[tone] || PILL_TONES.neutral)(c);
  const body = (
    <>
      <Txt
        style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: '600', color: t.ink }}
        numberOfLines={1}
      >
        {label}
      </Txt>
      {onPress ? (
        <Icon name="chevronDown" size={12} color={t.ink} strokeWidth={2.4} />
      ) : null}
    </>
  );
  // `flexShrink` в RN по умолчанию 0: без него пилюля с длинной подписью занимает
  // ширину своего текста целиком и выталкивает соседей за край строки, вместо того
  // чтобы обрезать подпись. `minWidth: 0` нужен там же — иначе сжиматься ей мешает
  // собственное содержимое.
  const base = {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.bg,
  };

  if (!onPress) {
    return <View style={[base, style]}>{body}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [base, { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }, style]}
    >
      {body}
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

// ─── ConfirmDialog (Figma `modal-backdrop` / `modal-box`) ─────────────────────
// Вопрос, на который нельзя ответить молчанием: действие уже нельзя будет отменить,
// поэтому диалог по центру, а не шит снизу, и подложка не закрывается тапом мимо —
// закрыть его можно только ответив.
export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel = 'Отмена',
  confirmLabel = 'Продолжить',
  busy = false,
  onCancel,
  onConfirm,
}) {
  const { c } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(11,8,16,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 25,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 340,
            backgroundColor: c.surface,
            borderRadius: 20,
            padding: 28,
            gap: 20,
            ...shadowLg,
          }}
        >
          <View style={{ gap: 8 }}>
            <Txt style={{ fontSize: 18, fontWeight: '700', color: c.ink }}>{title}</Txt>
            {message ? (
              <Txt style={{ fontSize: 14, fontWeight: '400', lineHeight: 21, color: c.ink2 }}>
                {message}
              </Txt>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
            <Pressable
              accessibilityRole="button"
              onPress={busy ? undefined : onCancel}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Txt style={{ fontSize: 13, fontWeight: '600', color: c.ink2 }}>{cancelLabel}</Txt>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={busy ? undefined : onConfirm}
              style={({ pressed }) => ({
                minWidth: 117,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: c.green,
                opacity: busy ? 0.7 : pressed ? 0.9 : 1,
              })}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Txt style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{confirmLabel}</Txt>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── PickerSheet ──────────────────────────────────────────────────────────────
// Выбор одного значения из короткого закрытого списка — то, что на вебе было бы
// `<select>`. Шит снизу, а не диалог: выбор обратим, и промах мимо списка должен
// его просто закрывать.
//
// `options` — `[{ value, label, hint? }]`; `value` сравнивается строго, поэтому
// `null` («не указано») — полноправный пункт, а не отсутствие выбора.
export function PickerSheet({ visible, title, options = [], value, onSelect, onClose }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 8,
            paddingBottom: Math.max(24, insets.bottom + 12),
            gap: 8,
          }}
        >
          <View style={{ alignItems: 'center', paddingVertical: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.stripeIdle }} />
          </View>
          {title ? (
            <Txt style={{ fontSize: 17, fontWeight: '700', color: c.ink, paddingHorizontal: 16 }}>
              {title}
            </Txt>
          ) : null}
          <ScrollView bounces={false} style={{ maxHeight: 380 }}>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={String(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect?.(option.value)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    backgroundColor: pressed ? c.bg2 : 'transparent',
                  })}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Txt
                      style={{
                        fontSize: 15,
                        fontWeight: active ? '700' : '500',
                        color: active ? c.blue : c.ink,
                      }}
                    >
                      {option.label}
                    </Txt>
                    {option.hint ? (
                      <Txt style={{ fontSize: 12, fontWeight: '400', color: c.ink3 }}>
                        {option.hint}
                      </Txt>
                    ) : null}
                  </View>
                  {active ? <Icon name="check" size={18} color={c.blue} strokeWidth={2.6} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── SegmentedSwitch (Figma `segmented-toggle`) ──────────────────────────────
/**
 * Переключатель двух равноправных наборов данных на всю ширину.
 *
 * Отличается от {@link PickerSheet} тем, что весь выбор виден сразу: вариантов два, и
 * прятать их за шитом значило бы делать лишний шаг там, где его нет в макете.
 */
export function SegmentedSwitch({ value, options = [], onChange, style }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: 'row',
          backgroundColor: c.bg2,
          borderRadius: 12,
          padding: 3,
          gap: 3,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange?.(option.value)}
            style={({ pressed }) => ({
              flex: 1,
              height: 29,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? c.surface : 'transparent',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Txt
              style={{
                fontSize: 14,
                fontWeight: active ? '700' : '500',
                color: active ? c.ink : c.ink3,
              }}
            >
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
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
