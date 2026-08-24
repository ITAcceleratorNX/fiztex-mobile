import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@shared/theme/ThemeContext';
import { Txt } from '@shared/components/Txt';
import { GRADE_TYPES, GRADE_TYPE_LABELS } from '@shared/api/gradesMap';

/**
 * Выбор оценки (Figma `mobile-grades-bottom-sheet`, `mobile-grades-type-expanded`).
 *
 * <b>Значения приходят с сервера.</b> Сетка строится из справочника шкалы, а не из
 * зашитого списка: вторая шкала на клиенте разошлась бы с той, что принимает бэк.
 *
 * <b>Тип необязателен</b> (ТЗ §5.1), поэтому список спрятан за строкой «Добавить тип» и
 * раскрывается по требованию: у обычной оценки за работу на уроке тип не спрашивают.
 *
 * <b>Одно нажатие — одно действие.</b> Кнопки «Сохранить» в макете нет: выбранный балл
 * уходит на сервер сразу, и шит закрывается сам. У новой оценки тип, выбранный заранее,
 * ждёт балла — сохранять ещё нечего.
 */
export function LessonGradeSheet({
  visible,
  studentName,
  slotLabel,
  scale,
  grade,
  busy,
  error,
  onPickValue,
  onPickType,
  onRemove,
  onClose,
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const existing = Boolean(grade?.id);
  const [draftType, setDraftType] = useState(grade?.gradeType ?? null);
  const [typesOpen, setTypesOpen] = useState(Boolean(grade?.gradeType));

  // Шит переоткрывают на другой клетке — состояние выбора обязано начинаться заново,
  // иначе тип от прошлой оценки уедет в новую.
  useEffect(() => {
    if (!visible) return;
    setDraftType(grade?.gradeType ?? null);
    setTypesOpen(Boolean(grade?.gradeType));
  }, [visible, grade?.id, grade?.gradeType]);

  const currentType = existing ? (grade?.gradeType ?? null) : draftType;

  function chooseType(type) {
    const next = type === currentType ? null : type;
    if (existing) onPickType?.(next);
    else setDraftType(next);
  }

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

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 16,
            }}
          >
            <Txt style={{ flex: 1, fontSize: 17, fontWeight: '700', color: c.ink }} numberOfLines={1}>
              {studentName}
            </Txt>
            {slotLabel ? (
              <Txt style={{ fontSize: 14, fontWeight: '500', color: c.ink3 }}>{slotLabel}</Txt>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
            {scale.map((item) => {
              const code = item.code;
              const selected = code === grade?.scaleCode;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={busy}
                  onPress={() => onPickValue?.(code, currentType)}
                  style={({ pressed }) => ({
                    width: 60,
                    height: 44,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? c.blue : c.surface,
                    borderWidth: selected ? 0 : 1,
                    borderColor: c.borderStrong,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Txt
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: selected ? '#fff' : c.ink2,
                    }}
                  >
                    {code}
                  </Txt>
                </Pressable>
              );
            })}
          </View>

          <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16, marginTop: 16 }} />

          {typesOpen ? (
            <ScrollView style={{ maxHeight: 260 }} bounces={false}>
              {GRADE_TYPES.map((type) => {
                const selected = type === currentType;
                return (
                  <Pressable
                    key={type}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={busy}
                    onPress={() => chooseType(type)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 16,
                      paddingVertical: 13,
                      backgroundColor: pressed ? c.bg2 : 'transparent',
                    })}
                  >
                    <Txt
                      style={{
                        fontSize: 15,
                        fontWeight: selected ? '700' : '500',
                        color: selected ? c.blue : c.ink,
                      }}
                    >
                      {GRADE_TYPE_LABELS[type]}
                    </Txt>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setTypesOpen(true)}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 14,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Txt style={{ fontSize: 15, fontWeight: '500', color: c.blue }}>
                {currentType
                  ? `Тип: ${GRADE_TYPE_LABELS[currentType]}`
                  : '+ Добавить тип (необязательно)'}
              </Txt>
            </Pressable>
          )}

          {existing ? (
            <>
              <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16 }} />
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={onRemove}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Txt style={{ fontSize: 15, fontWeight: '600', color: c.red }}>Снять оценку</Txt>
              </Pressable>
            </>
          ) : null}

          {error ? (
            <Txt
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: c.red,
                paddingHorizontal: 16,
                paddingTop: 4,
              }}
            >
              {error}
            </Txt>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
