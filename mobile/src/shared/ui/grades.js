import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';

/**
 * Клетка оценки (Figma `mobile-grades-list`, 32×32).
 *
 * Пустая клетка — такой же элемент, как заполненная: в макете это «+» того же размера,
 * и список из-за этого читается ровной сеткой, а не рваным перечнем. Поэтому значение
 * здесь необязательно, а не вынесено в отдельный компонент.
 *
 * Нечего показывать и нечего нажать — рисуется пустая рамка: так выглядит чужой лист
 * (истёкший доступ, админ), где мест под оценки быть не должно, но ряд обязан
 * сохранить геометрию.
 */
export function GradeChip({ value, onPress, disabled = false, active = false, size = 32 }) {
  const { c } = useTheme();
  const filled = Boolean(value);
  const interactive = Boolean(onPress) && !disabled;

  const body = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? c.blue : 'transparent',
        borderWidth: filled ? 0 : 1,
        borderColor: active ? c.blue : c.borderStrong,
      }}
    >
      {filled ? (
        <Txt style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{value}</Txt>
      ) : interactive ? (
        <Txt style={{ fontSize: 16, fontWeight: '600', color: c.ink3 }}>+</Txt>
      ) : null}
    </View>
  );

  if (!interactive) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={filled ? `Оценка ${value}` : 'Поставить оценку'}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  );
}

/**
 * Итоговая оценка за четверть: та же клетка, но без знаков шкалы и с прочерком вместо
 * пустоты — «итога пока нет» это состояние, а не приглашение (final-grades-contract §3).
 */
export function FinalChip({ value, onPress, disabled = false, tone = 'final' }) {
  const { c } = useTheme();
  const has = value !== null && value !== undefined;
  const interactive = Boolean(onPress) && !disabled;

  const body = (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: has && tone === 'final' ? c.blue : c.bg2,
      }}
    >
      <Txt
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: has ? (tone === 'final' ? '#fff' : c.ink2) : c.ink3,
        }}
      >
        {has ? String(value) : '—'}
      </Txt>
    </View>
  );

  if (!interactive) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={has ? `Итоговая оценка ${value}` : 'Выставить итоговую оценку'}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  );
}
