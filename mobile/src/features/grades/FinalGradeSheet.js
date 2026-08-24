import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { FINAL_VALUES } from '@shared/api/gradesMap';

/**
 * Выбор итоговой за четверть (Figma `mobile-quarter-grade-picker`).
 *
 * Четыре значения и всё: знаки «+» и «−» для итоговой запрещены
 * (final-grades-contract §3), поэтому здесь не шкала, а числа.
 *
 * <b>«Снять оценку» здесь нет</b>, хотя в макете строка есть: у итоговой оценки нет
 * удаления — не «запрещено ролью», а маршрута не существует (§2, `DELETE` отвечает 405).
 * Кнопка, которая всегда возвращает ошибку, хуже отсутствующей; исправляется значение
 * выбором другого балла.
 */
export function FinalGradeSheet({ visible, studentName, value, busy, onPick, onClose }) {
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
            opacity: busy ? 0.7 : 1,
          }}
        >
          <View style={{ alignItems: 'center', paddingVertical: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.stripeIdle }} />
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, gap: 2 }}>
            <Txt style={{ fontSize: 18, fontWeight: '700', color: c.ink }} numberOfLines={1}>
              {studentName}
            </Txt>
            <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink3 }}>Итоговая оценка</Txt>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
            {FINAL_VALUES.map((option) => {
              const selected = option === value;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={busy}
                  onPress={() => onPick?.(option)}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 48,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? c.blue : c.surface,
                    borderWidth: selected ? 0 : 1,
                    borderColor: c.borderStrong,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Txt
                    style={{ fontSize: 18, fontWeight: '700', color: selected ? '#fff' : c.ink2 }}
                  >
                    {option}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
