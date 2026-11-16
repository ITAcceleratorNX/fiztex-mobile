import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { finalFullLabel, finalShortLabel } from '@shared/api/gradesMap';

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
        minWidth: size,
        paddingHorizontal: 4,
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
 *
 * `label` — подпись вместо числа: «ВНА», «НА», «Зачёт» (ATTESTATION-001). Клетка тогда
 * растёт по ширине, а `fullLabel` уходит в подпись для экранного диктора.
 */
export function FinalChip({ value, label, fullLabel, onPress, disabled = false, tone = 'final' }) {
  const { c } = useTheme();
  const text = label ?? (value !== null && value !== undefined ? String(value) : null);
  const has = text != null;
  const interactive = Boolean(onPress) && !disabled;

  const body = (
    <View
      accessible={!interactive}
      accessibilityLabel={has ? `Итог: ${fullLabel ?? text}` : 'Итога нет'}
      style={{
        minWidth: 32,
        paddingHorizontal: 4,
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
        {has ? text : '—'}
      </Txt>
    </View>
  );

  if (!interactive) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={has ? `Итоговая оценка ${fullLabel ?? text}` : 'Выставить итоговую оценку'}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  );
}

/**
 * Опубликованный итог у ученика и родителя (ATTESTATION-001, ТЗ-2 §7): число — как раньше,
 * «Временно не аттестован» и «Не аттестован» — плашкой своего цвета вместо числа, зачёт и
 * «не изучался» — словом. Прочерк — только когда итога нет: это другое состояние, и
 * путать его со статусом нельзя.
 *
 * @param result `{resultKind, value}` либо `null`
 * @param compact клетка списка (рядом с другими четвертями) вместо крупного значения
 */
export function FinalResultValue({ result, compact = false }) {
  const { c } = useTheme();
  const label = finalShortLabel(result);
  const kind = result?.resultKind || 'NUMERIC';
  if (label == null) {
    return compact
      ? <GradeChip value={null} size={28} />
      : <Txt style={{ fontSize: 22, fontWeight: '700', color: c.ink3 }}>—</Txt>;
  }
  if (kind === 'NUMERIC') {
    return compact
      ? <GradeChip value={label} size={28} />
      : <Txt style={{ fontSize: 22, fontWeight: '700', color: c.ink }}>{label}</Txt>;
  }
  const tone = kind === 'NOT_ATTESTED'
    ? { bg: c.redSoft, fg: c.red }
    : kind === 'TEMP_UNATTESTED'
      ? { bg: c.greenSoft, fg: c.amberInk }
      : { bg: c.bg2, fg: c.ink2 };
  return (
    <View
      accessible
      accessibilityLabel={finalFullLabel(result)}
      style={{
        backgroundColor: tone.bg,
        borderRadius: 999,
        paddingHorizontal: compact ? 10 : 12,
        paddingVertical: compact ? 4 : 6,
      }}
    >
      <Txt style={{ fontSize: compact ? 13 : 15, fontWeight: '700', color: tone.fg }}>{label}</Txt>
    </View>
  );
}
