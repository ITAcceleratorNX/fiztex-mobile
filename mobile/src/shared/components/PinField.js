import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AUTH, REQUEST } from '../theme/tokens';
import { FieldLabel } from './ui';

/**
 * PIN клетками (Figma `Admin_Admissions`, M3): цифра — точка в своей клетке, следующая
 * клетка обведена.
 *
 * Клеток столько, сколько введено цифр, но не меньше `minLength` и не больше `maxLength`.
 * PIN бывает от четырёх до шести цифр, и шесть клеток с первого взгляда требовали бы
 * шести цифр от того, у кого их четыре; пятая клетка появляется вместе с пятой цифрой.
 *
 * Ввод — одно настоящее поле поверх клеток, прозрачное: клавиатура, вставка, удаление и
 * экранный диктор работают как у обычного поля, а клетки только рисуют его значение.
 * `secureTextEntry` не ставится: iOS стирает такое поле целиком при повторном вводе, а
 * точки в клетках и так не показывают цифр. `maxLength` у поля тоже нет: длину режет
 * `onChangeText` после того, как снял нецифры, — иначе вставка «48 26» потеряла бы цифру.
 *
 * `size="lg"` — клетки 54×62 на радиусе 16 с шагом 10 и подпись 14/600, как в M3 по макету.
 */
export function PinField({
  label,
  value,
  onChangeText,
  minLength = 4,
  maxLength = 6,
  invalid = false,
  autoFocus = false,
  onSubmitEditing,
  accessibilityLabel = label || 'PIN',
  size = 'md',
}) {
  const { c } = useTheme();
  const g = size === 'lg'
    ? { width: REQUEST.pinCellWidth, height: REQUEST.pinCellHeight, radius: REQUEST.pinCellRadius, gap: REQUEST.pinGap, dot: REQUEST.pinDot, labelGap: 10 }
    : { width: AUTH.pinCellWidth, height: AUTH.pinCellHeight, radius: AUTH.pinCellRadius, gap: AUTH.pinGap, dot: AUTH.pinDot, labelGap: 6 };
  const [focused, setFocused] = useState(false);
  const cells = Math.min(maxLength, Math.max(minLength, value.length));
  const active = focused && value.length < cells ? value.length : -1;

  return (
    <View style={{ gap: g.labelGap }}>
      {label ? <FieldLabel size={size}>{label}</FieldLabel> : null}
      <View style={{ flexDirection: 'row', gap: g.gap }}>
        {Array.from({ length: cells }, (_, index) => {
          const current = index === active;
          return (
            <View
              key={index}
              style={{
                width: g.width,
                height: g.height,
                borderRadius: g.radius,
                borderWidth: current ? 1.5 : 1,
                borderColor: invalid ? c.red : current ? c.blue : c.border,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {index < value.length ? (
                <View
                  style={{ width: g.dot, height: g.dot, borderRadius: 999, backgroundColor: c.ink }}
                />
              ) : null}
            </View>
          );
        })}
        <TextInput
          value={value}
          onChangeText={(next) => onChangeText(next.replace(/\D/g, '').slice(0, maxLength))}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect={false}
          caretHidden
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={accessibilityLabel}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0, color: 'transparent' }}
        />
      </View>
    </View>
  );
}
